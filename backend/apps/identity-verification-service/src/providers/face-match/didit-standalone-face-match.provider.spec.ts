import { DiditStandaloneFaceMatchProvider } from './didit-standalone-face-match.provider';
import {
  MalformedVendorResponseError,
  UnusableFaceImageError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from './standalone-face-match.errors';
import { FaceMatchCheckInput } from './standalone-face-match-provider.interface';

// Offline only: global fetch is mocked directly. No sandbox calls, no
// real network, no paid API calls, no real face images, no database.
// Response bodies match Didit's live OpenAPI spec for /v3/face-match/
// exactly (field names, nesting, nullability, error envelopes).
describe('DiditStandaloneFaceMatchProvider', () => {
  let provider: DiditStandaloneFaceMatchProvider;
  let fetchMock: jest.Mock;

  const userImage = { bytes: Buffer.from('selfie-bytes'), contentType: 'image/jpeg' };
  const refImage = { bytes: Buffer.from('portrait-bytes'), contentType: 'image/jpeg' };

  const baseInput: FaceMatchCheckInput = {
    userImage,
    refImage,
    saveApiRequest: true,
  };

  const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  });

  const approvedBody = {
    request_id: 'a1b2c3d4-0000-0000-0000-000000000000',
    vendor_data: 'doc-123',
    metadata: null,
    created_at: '2026-09-24T10:00:00Z',
    face_match: {
      status: 'Approved',
      score: 99.41,
      user_image: { entities: [{ bbox: [1, 2, 3, 4], confidence: 0.9, age: 30, gender: 'male' }], best_angle: 0 },
      ref_image: { entities: [{ bbox: [5, 6, 7, 8], confidence: 0.95, age: 31, gender: 'male' }], best_angle: 0 },
      warnings: [],
    },
  };

  beforeEach(() => {
    process.env.DIDIT_API_KEY = 'test-key';
    process.env.DIDIT_API_BASE_URL = 'https://verification.didit.me';
    provider = new DiditStandaloneFaceMatchProvider();
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.DIDIT_API_KEY;
    delete process.env.DIDIT_API_BASE_URL;
  });

  describe('request construction', () => {
    it('POSTs to the standalone face-match endpoint with x-api-key', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkFaceMatch(baseInput);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://verification.didit.me/v3/face-match/');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'x-api-key': 'test-key' });
    });

    it('sends both required images and save_api_request explicitly', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkFaceMatch({ ...baseInput, saveApiRequest: false });

      const form = fetchMock.mock.calls[0][1].body as FormData;
      expect(form.get('user_image')).toBeInstanceOf(Blob);
      expect(form.get('ref_image')).toBeInstanceOf(Blob);
      expect(form.get('save_api_request')).toBe('false');
    });

    it('forwards optional threshold, rotate, vendor_data, and metadata', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkFaceMatch({
        ...baseInput,
        faceMatchScoreDeclineThreshold: 60,
        rotateImage: true,
        vendorData: 'doc-123',
        metadata: { flow: 'onboarding' },
      });

      const form = fetchMock.mock.calls[0][1].body as FormData;
      expect(form.get('face_match_score_decline_threshold')).toBe('60');
      expect(form.get('rotate_image')).toBe('true');
      expect(form.get('vendor_data')).toBe('doc-123');
      expect(form.get('metadata')).toBe(JSON.stringify({ flow: 'onboarding' }));
    });
  });

  describe('local pre-flight validation (no network call)', () => {
    it('rejects an oversized user_image without calling fetch', async () => {
      const oversized = { bytes: Buffer.alloc(5 * 1024 * 1024 + 1), contentType: 'image/jpeg' };
      await expect(
        provider.checkFaceMatch({ ...baseInput, userImage: oversized }),
      ).rejects.toBeInstanceOf(UnusableFaceImageError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects an unsupported content type on ref_image without calling fetch', async () => {
      const unsupported = { bytes: Buffer.from('x'), contentType: 'application/pdf' };
      await expect(
        provider.checkFaceMatch({ ...baseInput, refImage: unsupported }),
      ).rejects.toBeInstanceOf(UnusableFaceImageError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('successful responses', () => {
    it('maps a clean Approved response', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      const result = await provider.checkFaceMatch(baseInput);

      expect(result.requestId).toBe('a1b2c3d4-0000-0000-0000-000000000000');
      expect(result.status).toBe('Approved');
      expect(result.score).toBe(99.41);
      expect(result.userImageDetection?.entities).toHaveLength(1);
      expect(result.warnings).toEqual([]);
    });

    it('maps a Declined response with a null score and NO_REFERENCE_IMAGE warning', async () => {
      const declinedBody = {
        ...approvedBody,
        face_match: {
          status: 'Declined',
          score: null,
          user_image: { entities: [], best_angle: null },
          ref_image: { entities: [], best_angle: null },
          warnings: [
            {
              risk: 'NO_REFERENCE_IMAGE',
              feature: 'FACEMATCH',
              log_type: 'error',
              short_description: 'No reference image',
              long_description: 'No face pair could be scored.',
              additional_data: null,
            },
          ],
        },
      };
      fetchMock.mockResolvedValue(jsonResponse(declinedBody));
      const result = await provider.checkFaceMatch(baseInput);

      expect(result.status).toBe('Declined');
      expect(result.score).toBeNull();
      expect(result.warnings[0].risk).toBe('NO_REFERENCE_IMAGE');
      expect(result.warnings[0].feature).toBe('FACEMATCH');
    });
  });

  describe('vendor-signaled and transport failures', () => {
    it('maps 400 to UnusableFaceImageError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ user_image: ['No file was submitted.'] }, 400));
      await expect(provider.checkFaceMatch(baseInput)).rejects.toBeInstanceOf(UnusableFaceImageError);
    });

    it('maps 403 detail body to invalid_api_key', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'You do not have permission.' }, 403));
      expect.assertions(2);
      try {
        await provider.checkFaceMatch(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorAuthOrCreditError);
        expect((err as VendorAuthOrCreditError).reason).toBe('invalid_api_key');
      }
    });

    it('maps 403 error body to insufficient_credits', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'Not enough credits.' }, 403));
      expect.assertions(2);
      try {
        await provider.checkFaceMatch(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorAuthOrCreditError);
        expect((err as VendorAuthOrCreditError).reason).toBe('insufficient_credits');
      }
    });

    it('maps 429 to VendorRateLimitedError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'Rate limited.' }, 429, { 'retry-after': '15' }));
      expect.assertions(2);
      try {
        await provider.checkFaceMatch(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorRateLimitedError);
        expect((err as VendorRateLimitedError).retryAfterSeconds).toBe(15);
      }
    });

    it('maps a fetch rejection to VendorTransportError', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(provider.checkFaceMatch(baseInput)).rejects.toBeInstanceOf(VendorTransportError);
    });

    it('maps a malformed 200 body to MalformedVendorResponseError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ request_id: 'abc' }));
      await expect(provider.checkFaceMatch(baseInput)).rejects.toBeInstanceOf(
        MalformedVendorResponseError,
      );
    });
  });
});
