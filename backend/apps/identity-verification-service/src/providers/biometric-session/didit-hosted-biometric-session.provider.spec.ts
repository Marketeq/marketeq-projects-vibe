import { DiditHostedBiometricSessionProvider } from './didit-hosted-biometric-session.provider';
import {
  AmbiguousVendorOutcomeError,
  HostedSessionNotFoundError,
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

  describe('createKycSession', () => {
    const input = { workflowId: 'wf_kyc', vendorData: 'ref-1', callbackUrl: 'http://localhost:3000/talent-dashboard' };
    const created = { session_id: 'sess_1', url: 'https://verify.didit.me/session/abc', status: 'Not Started' };

    it('POSTs workflow_id, vendor_data and callback to /v3/session/ with x-api-key — and no portrait or sandbox_scenario', async () => {
      fetchMock.mockResolvedValue(jsonResponse(created, 201));
      await provider.createKycSession(input);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://verification.didit.me/v3/session/');
      expect(init.method).toBe('POST');
      expect(init.headers['x-api-key']).toBe('test-key');
      expect(JSON.parse(init.body)).toEqual({
        workflow_id: 'wf_kyc',
        vendor_data: 'ref-1',
        callback: 'http://localhost:3000/talent-dashboard',
      });
    });

    it('maps a 201 response (also what Didit returns when it reuses an unfinished session)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ...created, status: 'In Progress' }, 201));
      await expect(provider.createKycSession(input)).resolves.toEqual({
        sessionId: 'sess_1',
        url: 'https://verify.didit.me/session/abc',
        status: 'In Progress',
      });
    });

    it.each([
      [400, InvalidSessionCreationRequestError],
      [403, VendorAuthOrCreditError],
      [429, VendorRateLimitedError],
      [500, VendorTransportError],
      [200, VendorTransportError],
    ])('maps HTTP %i to the matching typed error', async (status, errorClass) => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'x' }, status));
      await expect(provider.createKycSession(input)).rejects.toBeInstanceOf(errorClass);
    });

    it('treats a 201 without session_id or url as malformed', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'Not Started' }, 201));
      await expect(provider.createKycSession(input)).rejects.toBeInstanceOf(MalformedVendorResponseError);
    });

    it('treats a network failure as an ambiguous outcome', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));
      await expect(provider.createKycSession(input)).rejects.toBeInstanceOf(AmbiguousVendorOutcomeError);
    });
  });

  describe('getSessionDecision', () => {
    const fullBody = {
      session_id: 'sess_1',
      status: 'Approved',
      vendor_data: 'ref-1',
      workflow_id: 'wf_kyc',
      environment: 'sandbox',
      id_verifications: [{ full_name: 'PII-NAME', date_of_birth: '1990-01-01', portrait_image: 'https://media/x' }],
      liveness_checks: [{ reference_image: 'https://media/y' }],
      session_url: 'https://verify.didit.me/session/secret-token',
    };

    it('GETs the exact session id with x-api-key and a short timeout signal', async () => {
      fetchMock.mockResolvedValue(jsonResponse(fullBody, 200));
      await provider.getSessionDecision('sess_1');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://verification.didit.me/v3/session/sess_1/decision/');
      expect(init.method).toBeUndefined(); // GET
      expect(init.headers['x-api-key']).toBe('test-key');
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('URL-encodes the id so a stored value can never alter the path', async () => {
      fetchMock.mockResolvedValue(jsonResponse(fullBody, 200));
      await provider.getSessionDecision('a/../b?x=1');
      expect(fetchMock.mock.calls[0][0]).toBe('https://verification.didit.me/v3/session/a%2F..%2Fb%3Fx%3D1/decision/');
    });

    it('returns ONLY the six fields it needs and discards everything else (personal data, images, URLs)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(fullBody, 200));
      const result = await provider.getSessionDecision('sess_1');
      expect(Object.keys(result).sort()).toEqual(['applicationId', 'environment', 'sessionId', 'status', 'vendorData', 'workflowId']);
      expect(result).toEqual({
        sessionId: 'sess_1', status: 'Approved', vendorData: 'ref-1', workflowId: 'wf_kyc', environment: 'sandbox', applicationId: null,
      });
      const serialized = JSON.stringify(result);
      for (const leaked of ['PII-NAME', '1990-01-01', 'portrait', 'media', 'secret-token']) expect(serialized).not.toContain(leaked);
    });

    it('reports absent optional fields as null and a present application_id as a string', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ session_id: 's', status: 'In Progress', application_id: 'app-1' }, 200));
      await expect(provider.getSessionDecision('s')).resolves.toEqual({
        sessionId: 's', status: 'In Progress', vendorData: null, workflowId: null, environment: null, applicationId: 'app-1',
      });
    });

    it('ignores non-string vendor_data / workflow_id / environment values (never coerces them)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ session_id: 's', status: 'Approved', vendor_data: 5, workflow_id: {}, environment: ['sandbox'] }, 200));
      const r = await provider.getSessionDecision('s');
      expect(r.vendorData).toBeNull();
      expect(r.workflowId).toBeNull();
      expect(r.environment).toBeNull();
    });

    it('404 -> HostedSessionNotFoundError', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'x' }, 404));
      await expect(provider.getSessionDecision('s')).rejects.toBeInstanceOf(HostedSessionNotFoundError);
    });

    it.each([401, 403])('%i -> VendorAuthOrCreditError', async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'x' }, status));
      await expect(provider.getSessionDecision('s')).rejects.toBeInstanceOf(VendorAuthOrCreditError);
    });

    it('429 -> VendorRateLimitedError carrying Retry-After', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 429, { 'retry-after': '12' }));
      await expect(provider.getSessionDecision('s')).rejects.toMatchObject({ retryAfterSeconds: 12 });
    });

    it.each([500, 502, 503, 504, 201, 204, 301])('unexpected status %i -> VendorTransportError', async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({}, status));
      await expect(provider.getSessionDecision('s')).rejects.toBeInstanceOf(VendorTransportError);
    });

    it('a network failure or timeout -> VendorTransportError (a read has no "did it happen?" ambiguity)', async () => {
      fetchMock.mockRejectedValue(new Error('The operation was aborted due to timeout'));
      await expect(provider.getSessionDecision('s')).rejects.toBeInstanceOf(VendorTransportError);
    });

    it.each([
      ['a non-JSON body', () => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => { throw new Error('bad'); } })],
      ['a JSON array', () => jsonResponse([], 200)],
      ['JSON null', () => jsonResponse(null, 200)],
      ['a missing session_id', () => jsonResponse({ status: 'Approved' }, 200)],
      ['a missing status', () => jsonResponse({ session_id: 's' }, 200)],
      ['a non-string session_id', () => jsonResponse({ session_id: 7, status: 'Approved' }, 200)],
      ['a non-string status', () => jsonResponse({ session_id: 's', status: { a: 1 } }, 200)],
    ])('%s -> MalformedVendorResponseError', async (_name, make) => {
      fetchMock.mockResolvedValue(make());
      await expect(provider.getSessionDecision('s')).rejects.toBeInstanceOf(MalformedVendorResponseError);
    });

    it('errors never contain the response body, the api key or the session id', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'BODY-SECRET', full_name: 'PII-NAME' }, 500));
      try {
        await provider.getSessionDecision('sess-SECRET-ID');
        fail('expected throw');
      } catch (e) {
        const text = JSON.stringify(e) + String((e as Error).message) + String((e as Error).stack);
        for (const leaked of ['BODY-SECRET', 'PII-NAME', 'test-key']) expect(text).not.toContain(leaked);
      }
    });
  });
});
