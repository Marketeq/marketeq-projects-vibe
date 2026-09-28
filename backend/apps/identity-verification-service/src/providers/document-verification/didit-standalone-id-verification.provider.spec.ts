import { DiditStandaloneIdVerificationProvider } from './didit-standalone-id-verification.provider';
import {
  AmbiguousVendorOutcomeError,
  MalformedVendorResponseError,
  UnreadableDocumentImageError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from './standalone-id-verification.errors';
import { StandaloneIdVerificationCheckInput } from './standalone-id-verification-provider.interface';

// Offline only: global fetch is mocked directly (same pattern as
// proxycheck-vpn-proxy-detection.provider.spec.ts and the existing
// DiditDocumentVerificationProvider). No sandbox calls, no real network, no
// paid API calls, no real documents, no database. Response bodies below are
// shaped to match Didit's live OpenAPI spec exactly (field names, nesting,
// nullability, and the 400/403/429 error envelopes), not invented.
describe('DiditStandaloneIdVerificationProvider', () => {
  let provider: DiditStandaloneIdVerificationProvider;
  let fetchMock: jest.Mock;

  const frontImage = { bytes: Buffer.from('front-bytes'), contentType: 'image/jpeg' };
  const backImage = { bytes: Buffer.from('back-bytes'), contentType: 'image/png' };

  const baseInput: StandaloneIdVerificationCheckInput = {
    frontImage,
    saveApiRequest: true,
  };

  const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  });

  const approvedBody = {
    request_id: '11d219ed-d59c-4b1d-8d65-9b933f12d5b8',
    vendor_data: 'doc-123',
    metadata: { flow: 'onboarding' },
    created_at: '2026-09-24T10:00:00Z',
    id_verification: {
      status: 'Approved',
      document_type: 'Identity Card',
      document_subtype: 'ID_CARD_GENERIC',
      document_number: 'CBX164224',
      personal_number: '20446581H',
      portrait_image: 'https://media.example/portrait.jpg',
      front_image: 'https://media.example/front.jpg',
      back_image: null,
      front_image_quality_score: {
        focus_score: 78.0,
        brightness_score: 83.2,
        brightness_issue: 'ok',
        is_document_fully_visible: true,
        resolution_score: 40.7,
        overall_score: 70.2,
      },
      back_image_quality_score: null,
      date_of_birth: '1980-01-13',
      age: 46,
      expiration_date: '2032-03-31',
      date_of_issue: '2022-03-31',
      issuing_state: 'ESP',
      issuing_state_name: 'Spain',
      full_name: 'Julio Francisco Fores Sena',
      nationality: 'ESP',
      mrz: {
        document_number: 'CBX164224',
        document_type: 'ID',
        country: 'ESP',
        nationality: 'ESP',
        birth_date: '800113',
        expiry_date: '320331',
        sex: 'M',
        mrz_type: 'TD1',
        mrz_string: 'IDESPCBX164224...',
        warnings: [],
        errors: [],
      },
      warnings: [],
    },
  };

  beforeEach(() => {
    process.env.DIDIT_API_KEY = 'test-key';
    process.env.DIDIT_API_BASE_URL = 'https://verification.didit.me';
    provider = new DiditStandaloneIdVerificationProvider();
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.DIDIT_API_KEY;
    delete process.env.DIDIT_API_BASE_URL;
  });

  describe('request construction', () => {
    it('POSTs to the standalone endpoint with x-api-key, not Authorization', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkDocument(baseInput);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://verification.didit.me/v3/id-verification/');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'x-api-key': 'test-key' });
      expect(init.headers.Authorization).toBeUndefined();
    });

    it('sends front_image as a file part and save_api_request as an explicit string field', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkDocument({ ...baseInput, saveApiRequest: false });

      const form = fetchMock.mock.calls[0][1].body as FormData;
      expect(form.get('save_api_request')).toBe('false');
      const front = form.get('front_image') as unknown as Blob;
      expect(front).toBeInstanceOf(Blob);
      expect(front.type).toBe('image/jpeg');
      expect(form.get('back_image')).toBeNull();
    });

    it('includes back_image only when supplied', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkDocument({ ...baseInput, backImage });

      const form = fetchMock.mock.calls[0][1].body as FormData;
      const back = form.get('back_image') as unknown as Blob;
      expect(back).toBeInstanceOf(Blob);
      expect(back.type).toBe('image/png');
    });

    it('forwards optional vendor_data, metadata, and action fields when provided', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      await provider.checkDocument({
        ...baseInput,
        vendorData: 'doc-123',
        metadata: { flow: 'onboarding' },
        performDocumentLiveness: false,
        invalidMrzAction: 'NO_ACTION',
      });

      const form = fetchMock.mock.calls[0][1].body as FormData;
      expect(form.get('vendor_data')).toBe('doc-123');
      expect(form.get('metadata')).toBe(JSON.stringify({ flow: 'onboarding' }));
      expect(form.get('perform_document_liveness')).toBe('false');
      expect(form.get('invalid_mrz_action')).toBe('NO_ACTION');
    });
  });

  describe('local pre-flight validation (no network call)', () => {
    it('rejects an oversized front image without calling fetch', async () => {
      const oversized = { bytes: Buffer.alloc(10 * 1024 * 1024 + 1), contentType: 'image/jpeg' };
      await expect(
        provider.checkDocument({ ...baseInput, frontImage: oversized }),
      ).rejects.toBeInstanceOf(UnreadableDocumentImageError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects an unsupported content type without calling fetch', async () => {
      const unsupported = { bytes: Buffer.from('x'), contentType: 'application/octet-stream' };
      await expect(
        provider.checkDocument({ ...baseInput, frontImage: unsupported }),
      ).rejects.toBeInstanceOf(UnreadableDocumentImageError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects an empty front image without calling fetch', async () => {
      const empty = { bytes: Buffer.alloc(0), contentType: 'image/jpeg' };
      await expect(
        provider.checkDocument({ ...baseInput, frontImage: empty }),
      ).rejects.toBeInstanceOf(UnreadableDocumentImageError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('successful responses', () => {
    it('maps a clean Approved response, including quality scores and mrz', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      const result = await provider.checkDocument(baseInput);

      expect(result.requestId).toBe('11d219ed-d59c-4b1d-8d65-9b933f12d5b8');
      expect(result.status).toBe('Approved');
      expect(result.documentNumber).toBe('CBX164224');
      expect(result.frontImageQualityScore?.overallScore).toBe(70.2);
      expect(result.backImageQualityScore).toBeNull();
      expect(result.mrz?.mrzType).toBe('TD1');
      expect(result.warnings).toEqual([]);
      expect(result.vendorData).toBe('doc-123');
    });

    it('maps a Declined response with structured warnings, not flat strings', async () => {
      const declinedBody = {
        ...approvedBody,
        id_verification: {
          ...approvedBody.id_verification,
          status: 'Declined',
          warnings: [
            {
              risk: 'DOCUMENT_EXPIRED',
              feature: 'ID_VERIFICATION',
              log_type: 'error',
              short_description: 'Document expired',
              long_description: 'The document expiration date has passed.',
              additional_data: null,
            },
          ],
        },
      };
      fetchMock.mockResolvedValue(jsonResponse(declinedBody));
      const result = await provider.checkDocument(baseInput);

      expect(result.status).toBe('Declined');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual({
        risk: 'DOCUMENT_EXPIRED',
        feature: 'ID_VERIFICATION',
        logType: 'error',
        shortDescription: 'Document expired',
        longDescription: 'The document expiration date has passed.',
        additionalData: null,
      });
    });

    it('leaves back-side fields null when back_image was never sent', async () => {
      fetchMock.mockResolvedValue(jsonResponse(approvedBody));
      const result = await provider.checkDocument(baseInput);
      expect(result.backImage).toBeNull();
      expect(result.backImageQualityScore).toBeNull();
    });
  });

  describe('vendor-signaled failures (distinguished from transport/malformed)', () => {
    it('maps 400 COULD_NOT_RECOGNIZE_DOCUMENT to UnreadableDocumentImageError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'COULD_NOT_RECOGNIZE_DOCUMENT' }, 400));
      expect.assertions(2);
      try {
        await provider.checkDocument(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(UnreadableDocumentImageError);
        expect((err as UnreadableDocumentImageError).reason).toBe('could_not_recognize_document');
      }
    });

    it('maps another 400 body to a generic UnreadableDocumentImageError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ front_image: ['No file was submitted.'] }, 400));
      expect.assertions(2);
      try {
        await provider.checkDocument(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(UnreadableDocumentImageError);
        expect((err as UnreadableDocumentImageError).reason).toBe('validation_failed');
      }
    });

    it('maps 403 with a detail body to invalid_api_key', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ detail: 'You do not have permission to perform this action.' }, 403),
      );
      expect.assertions(2);
      try {
        await provider.checkDocument(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorAuthOrCreditError);
        expect((err as VendorAuthOrCreditError).reason).toBe('invalid_api_key');
      }
    });

    it('maps 403 with an error body to insufficient_credits', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ error: "You don't have enough credits to perform this request." }, 403),
      );
      expect.assertions(2);
      try {
        await provider.checkDocument(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorAuthOrCreditError);
        expect((err as VendorAuthOrCreditError).reason).toBe('insufficient_credits');
      }
    });

    it('maps 429 to VendorRateLimitedError and reads Retry-After', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ detail: 'Write request rate limit exceeded.' }, 429, { 'retry-after': '30' }),
      );
      expect.assertions(2);
      try {
        await provider.checkDocument(baseInput);
      } catch (err) {
        expect(err).toBeInstanceOf(VendorRateLimitedError);
        expect((err as VendorRateLimitedError).retryAfterSeconds).toBe(30);
      }
    });
  });

  describe('transport and malformed-response failures', () => {
    it('maps a fetch rejection (no response received) to AmbiguousVendorOutcomeError, not VendorTransportError — outcome unknown, not a confirmed failure', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(provider.checkDocument(baseInput)).rejects.toBeInstanceOf(AmbiguousVendorOutcomeError);
    });

    it('maps an aborted/timed-out fetch the same way — a hung connection is also outcome-unknown, not a confirmed failure', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);
      await expect(provider.checkDocument(baseInput)).rejects.toBeInstanceOf(AmbiguousVendorOutcomeError);
    });

    it('sends an abort signal on the request so a hung connection cannot stay pending indefinitely', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          request_id: 'req-1',
          id_verification: { status: 'Approved' },
        }),
      });
      await provider.checkDocument(baseInput);
      const options = fetchMock.mock.calls[0][1];
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('maps an unrecognized non-2xx status to VendorTransportError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'Internal error' }, 500));
      await expect(provider.checkDocument(baseInput)).rejects.toBeInstanceOf(VendorTransportError);
    });

    it('maps a 200 response missing id_verification to MalformedVendorResponseError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ request_id: 'abc' }));
      await expect(provider.checkDocument(baseInput)).rejects.toBeInstanceOf(
        MalformedVendorResponseError,
      );
    });

    it('maps an unrecognized status value to MalformedVendorResponseError', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          request_id: 'abc',
          id_verification: { ...approvedBody.id_verification, status: 'Pending' },
        }),
      );
      await expect(provider.checkDocument(baseInput)).rejects.toBeInstanceOf(
        MalformedVendorResponseError,
      );
    });

    it('maps a non-JSON body to MalformedVendorResponseError', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });
      await expect(provider.checkDocument(baseInput)).rejects.toBeInstanceOf(
        MalformedVendorResponseError,
      );
    });
  });
});
