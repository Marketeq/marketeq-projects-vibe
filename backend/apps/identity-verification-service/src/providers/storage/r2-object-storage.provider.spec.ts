import { S3Client } from '@aws-sdk/client-s3';
import { R2ObjectStorageProvider } from './r2-object-storage.provider';
import {
  ObjectNotFoundError,
  ObjectReadInterruptedError,
  ObjectStorageUnavailableError,
  ObjectTooLargeError,
} from './object-storage.errors';

// Offline only: S3Client.prototype.send is mocked directly. No real R2
// call, no real network, no real credentials — process.env.R2_* below are
// dummy values used only to construct the client, never sent anywhere.
describe('R2ObjectStorageProvider', () => {
  let provider: R2ObjectStorageProvider;
  let sendMock: jest.SpyInstance;

  // A minimal fake of the async-iterable stream body the AWS SDK returns
  // for GetObjectCommand. `failAfter` simulates a stream that errors
  // partway through instead of completing.
  function fakeBody(chunks: Buffer[], opts: { failAfter?: number } = {}) {
    let destroyCalls = 0;
    const body = {
      destroy: () => {
        destroyCalls++;
      },
      get destroyCallCount() {
        return destroyCalls;
      },
      [Symbol.asyncIterator]: async function* () {
        for (let i = 0; i < chunks.length; i++) {
          if (opts.failAfter !== undefined && i === opts.failAfter) {
            throw new Error('simulated stream error');
          }
          yield chunks[i];
        }
      },
    };
    return body;
  }

  beforeEach(() => {
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key-id';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET = 'test-bucket';
    provider = new R2ObjectStorageProvider();
    sendMock = jest.spyOn(S3Client.prototype, 'send');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET;
  });

  describe('missing R2_BUCKET — fails fast rather than calling R2 with an undefined bucket', () => {
    beforeEach(() => {
      delete process.env.R2_BUCKET;
    });

    it('rejects createUploadUrl before ever building a presigned URL', async () => {
      await expect(provider.createUploadUrl({ profileId: 'p1', fileExtension: 'jpg' })).rejects.toThrow(
        'R2_BUCKET is required',
      );
    });

    it('rejects getObject without ever calling the S3 client', async () => {
      await expect(provider.getObject({ objectKey: 'k1', maxBytes: 10 })).rejects.toThrow(
        'R2_BUCKET is required',
      );
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('getObject — successful reads', () => {
    it('returns the full bytes and content type for a small object', async () => {
      const body = fakeBody([Buffer.from('hello '), Buffer.from('world')]);
      sendMock.mockResolvedValue({ Body: body, ContentType: 'image/jpeg', ContentLength: 11 });

      const result = await provider.getObject({ objectKey: 'k1', maxBytes: 1024 });

      expect(result.bytes.toString()).toBe('hello world');
      expect(result.contentType).toBe('image/jpeg');
    });

    it('defaults content type when the object has none recorded', async () => {
      const body = fakeBody([Buffer.from('x')]);
      sendMock.mockResolvedValue({ Body: body });

      const result = await provider.getObject({ objectKey: 'k1', maxBytes: 1024 });
      expect(result.contentType).toBe('application/octet-stream');
    });
  });

  describe('getObject — bounded read enforcement', () => {
    it('rejects via Content-Length before reading any bytes', async () => {
      const body = fakeBody([Buffer.from('should never be read')]);
      const iteratorSpy = jest.spyOn(body, Symbol.asyncIterator as any);
      sendMock.mockResolvedValue({ Body: body, ContentLength: 999999 });

      await expect(provider.getObject({ objectKey: 'k1', maxBytes: 10 })).rejects.toBeInstanceOf(
        ObjectTooLargeError,
      );
      expect(iteratorSpy).not.toHaveBeenCalled();
    });

    it('rejects mid-stream when Content-Length is missing/understated, and destroys the stream', async () => {
      const chunks = [Buffer.alloc(5), Buffer.alloc(5), Buffer.alloc(5)];
      const body = fakeBody(chunks);
      sendMock.mockResolvedValue({ Body: body }); // no ContentLength at all

      await expect(provider.getObject({ objectKey: 'k1', maxBytes: 8 })).rejects.toBeInstanceOf(
        ObjectTooLargeError,
      );
      expect(body.destroyCallCount).toBe(1);
    });

    it('never retains an oversized chunk in the returned bytes on a later successful call boundary', async () => {
      // Exactly at the limit succeeds — confirms the check is strictly
      // "greater than", not off-by-one.
      const body = fakeBody([Buffer.alloc(10)]);
      sendMock.mockResolvedValue({ Body: body });

      const result = await provider.getObject({ objectKey: 'k1', maxBytes: 10 });
      expect(result.bytes.length).toBe(10);
    });
  });

  describe('getObject — missing objects, interrupted reads, storage failures', () => {
    it('maps a NoSuchKey rejection to ObjectNotFoundError', async () => {
      sendMock.mockRejectedValue({ name: 'NoSuchKey' });
      await expect(provider.getObject({ objectKey: 'missing', maxBytes: 10 })).rejects.toBeInstanceOf(
        ObjectNotFoundError,
      );
    });

    it('maps a 404-status rejection without a NoSuchKey name to ObjectNotFoundError', async () => {
      sendMock.mockRejectedValue({ $metadata: { httpStatusCode: 404 } });
      await expect(provider.getObject({ objectKey: 'missing', maxBytes: 10 })).rejects.toBeInstanceOf(
        ObjectNotFoundError,
      );
    });

    it('maps any other rejection from send() to ObjectStorageUnavailableError', async () => {
      sendMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(provider.getObject({ objectKey: 'k1', maxBytes: 10 })).rejects.toBeInstanceOf(
        ObjectStorageUnavailableError,
      );
    });

    it('maps a missing response body to ObjectStorageUnavailableError', async () => {
      sendMock.mockResolvedValue({});
      await expect(provider.getObject({ objectKey: 'k1', maxBytes: 10 })).rejects.toBeInstanceOf(
        ObjectStorageUnavailableError,
      );
    });

    it('maps a stream that errors partway through to ObjectReadInterruptedError', async () => {
      const body = fakeBody([Buffer.from('a'), Buffer.from('b')], { failAfter: 1 });
      sendMock.mockResolvedValue({ Body: body });

      await expect(provider.getObject({ objectKey: 'k1', maxBytes: 1024 })).rejects.toBeInstanceOf(
        ObjectReadInterruptedError,
      );
    });
  });

  describe('createUploadUrl — unaffected by this change', () => {
    it('still returns an upload URL, object key, and expiry', async () => {
      sendMock.mockResolvedValue({});
      // getSignedUrl doesn't call client.send directly in a way this mock
      // intercepts meaningfully; this just confirms the method still runs
      // end to end without throwing after the getObject addition.
      const result = await provider.createUploadUrl({ profileId: 'p1', fileExtension: 'jpg' });
      expect(result.objectKey).toMatch(/^identity-documents\/p1\//);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });
});
