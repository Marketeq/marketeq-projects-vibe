import { DiditStandalonePassiveLivenessProvider } from './didit-standalone-passive-liveness.provider';
import {
  MalformedVendorResponseError,
  UnusableLivenessImageError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from './standalone-passive-liveness.errors';
import { PassiveLivenessCheckInput } from './standalone-passive-liveness-provider.interface';

// Offline only: global fetch is mocked directly. No sandbox calls, no
// real network, no paid API calls, no real face images, no database.
// Response bodies match Didit's live OpenAPI spec for
// /v3/passive-liveness/ exactly.
describe('DiditStandalonePassiveLivenessProvider', () => {
  let provider: DiditStandalonePassiveLivenessProvider;
  let fetchMock: jest.Mock;

  const userImage = { bytes: Buffer.from('selfie-bytes'), contentType: 'image/jpeg' };

  const baseInput: PassiveLivenessCheckInput = {
    userImage,
    saveApiRequest: true,
  };

  const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  });

  const approvedBody = {
    request_id: 'b1c2d3e4-0000-0000-0000-000000000000',
    vendor_data: 'doc-123',
    metadata: null,
    created_at: '2026-09-24T10:00:00Z',
    liveness: {
      status: 'Approved',
      method: 'PASSIVE',
      score: 95.0,
      face_quality: 84.21,
      face_luminance: 50.33,
      user_image: { entities: [{ bbox: [1, 2, 3, 4], confidence: 0.9, age: 30, gender: 'male' }], best_angle: 0 },
      warnings: [],
    },
  };

  beforeEach(() => {
    process.env.DIDIT_API_KEY = 'test-key';
    process.env.DIDIT_API_BASE_URL = 'https://verification.didit.me';
    provider = new DiditStandalonePassiveLivenessProvider();
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.DIDIT_API_KEY;
    delete process.env.DIDIT_API_BASE_URL;
  });

  describe('request construction', () => {
    it('POSTs to the standalone passive-liveness endpoint with x-api-key', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkLiveness(baseInput);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://verification.didit.me/v3/passive-liveness/');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'x-api-key': 'test-key' });
    });

    it('sends user_image and save_api_request explicitly', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkLiveness({ ...baseInput, saveApiRequest: false });

      const form = fetchMock.mock.calls[0][1].body as FormData;
      expect(form.get('user_image')).toBeInstanceOf(Blob);
      expect(form.get('save_api_request')).toBe('false');
    });

    it('forwards optional threshold, rotate, vendor_data, and metadata', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkLiveness({
        ...baseInput,
        faceLivenessScoreDeclineThreshold: 50,
        rotateImage: true,
        vendorData: 'doc-123',
        metadata: { flow: 'onboarding' },
      });

      const form = fetchMock.mock.calls[0][1].body as FormData;
      expect(form.get('face_liveness_score_decline_threshold')).toBe('50');
      expect(form.get('rotate_image')).toBe('true');
      expect(form.get('vendor_data')).toBe('doc-123');
      expect(form.get('metadata')).toBe(JSON.stringify({ flow: 'onboarding' }));
    });
  });

  describe('local pre-flight validation (no network call)', () => {
    it('rejects an oversized image without calling fetch', async () => {
      const oversized = { bytes: Buffer.alloc(5 * 1024 * 1024 + 1), contentType: 'image/jpeg' };
      await expect(
        provider.checkLiveness({ ...baseInput, userImage: oversized }),
      ).rejects.toBeInstanceOf(UnusableLivenessImageError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects an unsupported content type without calling fetch', async () => {
      const unsupported = { bytes: Buffer.from('x'), contentType: 'application/pdf' };
      await expect(
        provider.checkLiveness({ ...baseInput, userImage: unsupported }),
      ).rejects.toBeInstanceOf(UnusableLivenessImageError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('successful responses', () => {
    it('maps a clean Approved response', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      const result = await provider.checkLiveness(baseInput);

      expect(result.requestId).toBe('b1c2d3e4-0000-0000-0000-000000000000');
      expect(result.status).toBe('Approved');
      expect(result.method).toBe('PASSIVE');
      expect(result.score).toBe(95.0);
      expect(result.faceQuality).toBe(84.21);
      expect(result.faceLuminance).toBe(50.33);
      expect(result.warnings).toEqual([]);
    });

    it('maps a Declined response with a LIVENESS_FACE_ATTACK warning', async () => {
      const declinedBody = {
        ...approvedBody,
        liveness: {
          ...approvedBody.liveness,
          status: 'Declined',
          score: 5.0,
          warnings: [
            {
              risk: 'LIVENESS_FACE_ATTACK',
              feature: 'LIVENESS',
              log_type: 'error',
              short_description: 'Presentation attack detected',
              long_description: 'The model detected a presentation attack.',
              additional_data: null,
            },
          ],
        },
      };
      fetchMock.mockResolvedValue(jsonResponse(declinedBody));
      const result = await provider.checkLiveness(baseInput);

      expect(result.status).toBe('Declined');
      expect(result.warnings[0].risk).toBe('LIVENESS_FACE_ATTACK');
      expect(result.warnings[0].feature).toBe('LIVENESS');
    });

    it('maps an information-severity DUPLICATED_FACE warning without implying a decline reason beyond status', async () => {
      const body = {
        ...approvedBody,
        liveness: {
          ...approvedBody.liveness,
          warnings: [
            {
              risk: 'DUPLICATED_FACE',
              feature: 'LIVENESS',
              log_type: 'information',
              short_description: 'Duplicate face',
              long_description: 'This face already appeared in another approved session.',
              additional_data: { duplicated_session_id: 'sess-1' },
            },
          ],
        },
      };
      fetchMock.mockResolvedValue(jsonResponse(body));
      const result = await provider.checkLiveness(baseInput);

      expect(result.warnings[0].logType).toBe('information');
      expect(result.warnings[0].additionalData).toEqual({ duplicated_session_id: 'sess-1' });
    });
  });

  describe('vendor-signaled and transport failures', () => {
    it('maps a 400 with an error body to could_not_process_image', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'Failed to decode image.' }, 400));
      expect.assertions(2);
      try {
        await provider.checkLiveness(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(UnusableLivenessImageError);
        expect((err as UnusableLivenessImageError).reason).toBe('could_not_process_image');
      }
    });

    it('maps a 400 field-error body to validation_failed', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ user_image: ['No file was submitted.'] }, 400));
      expect.assertions(2);
      try {
        await provider.checkLiveness(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(UnusableLivenessImageError);
        expect((err as UnusableLivenessImageError).reason).toBe('validation_failed');
      }
    });

    it('maps 403 to VendorAuthOrCreditError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'You do not have permission.' }, 403));
      await expect(provider.checkLiveness(baseInput)).rejects.toBeInstanceOf(VendorAuthOrCreditError);
    });

    it('maps 429 to VendorRateLimitedError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'Rate limited.' }, 429, { 'retry-after': '10' }));
      expect.assertions(2);
      try {
        await provider.checkLiveness(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorRateLimitedError);
        expect((err as VendorRateLimitedError).retryAfterSeconds).toBe(10);
      }
    });

    it('maps a fetch rejection to VendorTransportError', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(provider.checkLiveness(baseInput)).rejects.toBeInstanceOf(VendorTransportError);
    });

    it('maps a malformed 200 body to MalformedVendorResponseError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ request_id: 'abc' }));
      await expect(provider.checkLiveness(baseInput)).rejects.toBeInstanceOf(
        MalformedVendorResponseError,
      );
    });
  });
});
