import { DiditHostedBiometricSessionProvider } from './didit-hosted-biometric-session.provider';
import {
  AmbiguousVendorOutcomeError,
  InvalidSessionCreationRequestError,
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from './hosted-biometric-session.errors';

// Offline only: global fetch mocked directly. No real network, no real
// session created, no paid call, no real portrait.
describe('DiditHostedBiometricSessionProvider', () => {
  let provider: DiditHostedBiometricSessionProvider;
  let fetchMock: jest.Mock;

  const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  });

  beforeEach(() => {
    process.env.DIDIT_API_KEY = 'test-key';
    process.env.DIDIT_API_BASE_URL = 'https://verification.didit.me';
    provider = new DiditHostedBiometricSessionProvider();
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.DIDIT_API_KEY;
    delete process.env.DIDIT_API_BASE_URL;
  });

  describe('createSession', () => {
    const input = { workflowId: 'wf_1', portraitImageBase64: 'ZmFrZQ==', vendorData: 'doc_1' };

    it('POSTs to /v3/session/ with x-api-key and never includes sandbox_scenario', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ session_id: 'sess_1', url: 'https://verify.didit.me/session/abc', status: 'Not Started' }, 201),
      );
      await provider.createSession(input);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://verification.didit.me/v3/session/');
      expect(init.headers['x-api-key']).toBe('test-key');
      const body = JSON.parse(init.body);
      expect(body).toEqual({ workflow_id: 'wf_1', portrait_image: 'ZmFrZQ==', vendor_data: 'doc_1' });
      expect(body.sandbox_scenario).toBeUndefined();
    });

    it('maps a successful 201 response', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ session_id: 'sess_1', url: 'https://verify.didit.me/session/abc', status: 'Not Started' }, 201),
      );
      const result = await provider.createSession(input);
      expect(result).toEqual({ sessionId: 'sess_1', url: 'https://verify.didit.me/session/abc', status: 'Not Started' });
    });

    it('maps 400 to InvalidSessionCreationRequestError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ workflow_id: ['Invalid.'] }, 400));
      await expect(provider.createSession(input)).rejects.toBeInstanceOf(
        InvalidSessionCreationRequestError,
      );
    });

    it('maps 403 with detail to invalid_api_key', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'nope' }, 403));
      expect.assertions(2);
      try {
        await provider.createSession(input);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorAuthOrCreditError);
        expect((err as VendorAuthOrCreditError).reason).toBe('invalid_api_key');
      }
    });

    it('maps 429 to VendorRateLimitedError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'slow down' }, 429, { 'retry-after': '5' }));
      expect.assertions(2);
      try {
        await provider.createSession(input);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorRateLimitedError);
        expect((err as VendorRateLimitedError).retryAfterSeconds).toBe(5);
      }
    });

    it('maps a fetch rejection (no response received) to AmbiguousVendorOutcomeError, not VendorTransportError', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(provider.createSession(input)).rejects.toBeInstanceOf(AmbiguousVendorOutcomeError);
    });

    it('maps a malformed 201 body to MalformedVendorResponseError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ session_id: 'sess_1' }, 201));
      await expect(provider.createSession(input)).rejects.toBeInstanceOf(MalformedVendorResponseError);
    });
  });

  describe('fetchPortraitFromDocumentCheckSession', () => {
    it('returns the portrait from the latest id_verifications entry', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ id_verifications: [{ portrait_image: 'old' }, { portrait_image: 'newest' }] }),
      );
      const result = await provider.fetchPortraitFromDocumentCheckSession('req_1');
      expect(result).toBe('newest');
    });

    it('returns null when id_verifications is an empty array', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id_verifications: [] }));
      expect(await provider.fetchPortraitFromDocumentCheckSession('req_1')).toBeNull();
    });

    it('returns null when id_verifications is absent', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));
      expect(await provider.fetchPortraitFromDocumentCheckSession('req_1')).toBeNull();
    });

    it('returns null when the latest entry has no portrait_image', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id_verifications: [{ status: 'Approved' }] }));
      expect(await provider.fetchPortraitFromDocumentCheckSession('req_1')).toBeNull();
    });

    it('maps a fetch rejection (no response received) to AmbiguousVendorOutcomeError', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));
      await expect(provider.fetchPortraitFromDocumentCheckSession('req_1')).rejects.toBeInstanceOf(
        AmbiguousVendorOutcomeError,
      );
    });

    it('throws MalformedVendorResponseError when id_verifications is not an array', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id_verifications: { oops: true } }));
      await expect(provider.fetchPortraitFromDocumentCheckSession('req_1')).rejects.toBeInstanceOf(
        MalformedVendorResponseError,
      );
    });

    it('throws MalformedVendorResponseError on 404 rather than returning null', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'not found' }, 404));
      await expect(provider.fetchPortraitFromDocumentCheckSession('req_1')).rejects.toBeInstanceOf(
        MalformedVendorResponseError,
      );
    });

    it('maps 403 to VendorAuthOrCreditError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'no credits' }, 403));
      expect.assertions(2);
      try {
        await provider.fetchPortraitFromDocumentCheckSession('req_1');
      } catch (err) {
        expect(err).toBeInstanceOf(VendorAuthOrCreditError);
        expect((err as VendorAuthOrCreditError).reason).toBe('insufficient_credits');
      }
    });
  });
});
