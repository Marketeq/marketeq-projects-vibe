import { createHmac } from 'crypto';
import {
  parseDiditWebhookEvent,
  verifyDiditWebhookRawSignature,
  verifyDiditWebhookTimestamp,
} from './didit-webhook-verification';
import {
  ExpiredOrInvalidDiditWebhookTimestampError,
  InvalidDiditWebhookSignatureError,
  MalformedDiditWebhookEventError,
} from './didit-webhook-verification.errors';

// Offline only: no network, no real Didit delivery, no database. HMAC
// signatures are computed locally with a test secret, matching exactly
// how a real delivery is verified (same algorithm, different secret).
describe('verifyDiditWebhookRawSignature', () => {
  const secret = 'test-webhook-secret';
  const body = Buffer.from(JSON.stringify({ event_id: 'evt_1', status: 'Approved' }));
  const validSignature = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a correctly computed signature', () => {
    expect(() => verifyDiditWebhookRawSignature(body, validSignature, secret)).not.toThrow();
  });

  it('rejects a missing signature header', () => {
    expect(() => verifyDiditWebhookRawSignature(body, undefined, secret)).toThrow(
      InvalidDiditWebhookSignatureError,
    );
  });

  it('rejects a mismatched signature', () => {
    const wrongSignature = createHmac('sha256', 'wrong-secret').update(body).digest('hex');
    expect(() => verifyDiditWebhookRawSignature(body, wrongSignature, secret)).toThrow(
      InvalidDiditWebhookSignatureError,
    );
  });

  it('rejects a signature computed over a different body (tamper detection)', () => {
    const tamperedBody = Buffer.from(JSON.stringify({ event_id: 'evt_1', status: 'Declined' }));
    expect(() => verifyDiditWebhookRawSignature(tamperedBody, validSignature, secret)).toThrow(
      InvalidDiditWebhookSignatureError,
    );
  });
});

describe('verifyDiditWebhookTimestamp', () => {
  const now = 1_800_000_000;

  it('accepts a timestamp within the 300s tolerance', () => {
    expect(() => verifyDiditWebhookTimestamp(String(now - 100), now)).not.toThrow();
  });

  it('accepts a timestamp exactly at the boundary', () => {
    expect(() => verifyDiditWebhookTimestamp(String(now - 300), now)).not.toThrow();
  });

  it('rejects a timestamp just outside the tolerance (replay)', () => {
    expect(() => verifyDiditWebhookTimestamp(String(now - 301), now)).toThrow(
      ExpiredOrInvalidDiditWebhookTimestampError,
    );
  });

  it('rejects a missing timestamp header', () => {
    expect(() => verifyDiditWebhookTimestamp(undefined, now)).toThrow(
      ExpiredOrInvalidDiditWebhookTimestampError,
    );
  });

  it('rejects a non-numeric timestamp header', () => {
    expect(() => verifyDiditWebhookTimestamp('not-a-number', now)).toThrow(
      ExpiredOrInvalidDiditWebhookTimestampError,
    );
  });

  it('rejects a future timestamp outside tolerance too (not just stale ones)', () => {
    expect(() => verifyDiditWebhookTimestamp(String(now + 301), now)).toThrow(
      ExpiredOrInvalidDiditWebhookTimestampError,
    );
  });
});

describe('parseDiditWebhookEvent', () => {
  const validBody = (overrides: Record<string, unknown> = {}) =>
    Buffer.from(
      JSON.stringify({
        event_id: 'evt_1',
        session_id: 'sess_1',
        webhook_type: 'status.updated',
        timestamp: 1_800_000_000,
        created_at: '2026-09-25T00:00:00Z',
        application_id: 'app_1',
        environment: 'sandbox',
        status: 'Approved',
        workflow_id: 'wf_1',
        vendor_data: 'user-123',
        metadata: null,
        decision: null,
        ...overrides,
      }),
    );

  it('parses a well-formed real-shaped event', () => {
    const event = parseDiditWebhookEvent(validBody());
    expect(event.event_id).toBe('evt_1');
    expect(event.session_id).toBe('sess_1');
    expect(event.status).toBe('Approved');
    expect(event.environment).toBe('sandbox');
  });

  it('preserves exact case-sensitive status values (e.g. "Kyc Expired")', () => {
    const event = parseDiditWebhookEvent(validBody({ status: 'Kyc Expired' }));
    expect(event.status).toBe('Kyc Expired');
  });

  it('rejects invalid JSON', () => {
    expect(() => parseDiditWebhookEvent(Buffer.from('not json'))).toThrow(
      MalformedDiditWebhookEventError,
    );
  });

  it('rejects a non-object JSON body', () => {
    expect(() => parseDiditWebhookEvent(Buffer.from('"just a string"'))).toThrow(
      MalformedDiditWebhookEventError,
    );
  });

  it('rejects a body missing a required field', () => {
    const body = Buffer.from(JSON.stringify({ session_id: 'sess_1', status: 'Approved' }));
    expect(() => parseDiditWebhookEvent(body)).toThrow(MalformedDiditWebhookEventError);
  });

  it('rejects a body where status is not a string', () => {
    expect(() => parseDiditWebhookEvent(validBody({ status: 123 }))).toThrow(
      MalformedDiditWebhookEventError,
    );
  });

  it('defaults workflow_id/vendor_data/metadata/decision to null when absent or wrong type, never fabricating a value', () => {
    const event = parseDiditWebhookEvent(
      validBody({ workflow_id: 42, vendor_data: undefined, metadata: 'not-an-object', decision: [] }),
    );
    expect(event.workflow_id).toBeNull();
    expect(event.vendor_data).toBeNull();
    expect(event.metadata).toBeNull();
    expect(event.decision).toBeNull();
  });
});
