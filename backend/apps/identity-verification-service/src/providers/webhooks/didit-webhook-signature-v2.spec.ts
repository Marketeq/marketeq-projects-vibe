import { computeDiditSignatureV2, verifyDiditWebhookSignatureV2 } from './didit-webhook-signature-v2';
import { InvalidDiditWebhookSignatureError } from './didit-webhook-verification.errors';

const secret = 'test-shared-secret';
const body = {
  webhook_type: 'status.updated',
  session_id: 's-1',
  status: 'Approved',
  timestamp: 1_800_000_000,
  decision: { score: 0.75, nested: { b: 2, a: 1 }, list: [{ z: 1, y: 2 }], name: 'José' },
};
const raw = (o: unknown) => Buffer.from(JSON.stringify(o), 'utf8');
const codeOf = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    return e instanceof InvalidDiditWebhookSignatureError ? (e as any).reason ?? e.message : 'unexpected';
  }
  return 'ok';
};

describe('verifyDiditWebhookSignatureV2', () => {
  it('accepts a correctly signed body', () => {
    expect(codeOf(() => verifyDiditWebhookSignatureV2(raw(body), computeDiditSignatureV2(body, secret), secret))).toBe('ok');
  });

  it('is independent of key order and whitespace in the delivered bytes (canonicalization)', () => {
    const reordered = Buffer.from(
      `{ "status":"Approved", "decision": {"name":"José","list":[{"y":2,"z":1}],"nested":{"a":1,"b":2},"score":0.75},\n "timestamp":1800000000,"session_id":"s-1","webhook_type":"status.updated"}`,
      'utf8',
    );
    expect(codeOf(() => verifyDiditWebhookSignatureV2(reordered, computeDiditSignatureV2(body, secret), secret))).toBe('ok');
  });

  it('matches a signature computed independently per Didit\'s documented algorithm (sorted keys, compact, Unicode preserved)', () => {
    const { createHmac } = require('crypto');
    const canonical =
      '{"decision":{"list":[{"y":2,"z":1}],"name":"José","nested":{"a":1,"b":2},"score":0.75},"session_id":"s-1","status":"Approved","timestamp":1800000000,"webhook_type":"status.updated"}';
    const expected = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
    expect(computeDiditSignatureV2(body, secret)).toBe(expected);
  });

  it('rejects a missing header', () => {
    expect(codeOf(() => verifyDiditWebhookSignatureV2(raw(body), undefined, secret))).toBe('missing_header');
  });

  it('rejects a malformed / wrong-length / wrong-value signature', () => {
    expect(codeOf(() => verifyDiditWebhookSignatureV2(raw(body), 'zz', secret))).toBe('mismatch');
    expect(codeOf(() => verifyDiditWebhookSignatureV2(raw(body), computeDiditSignatureV2(body, 'other-secret'), secret))).toBe('mismatch');
  });

  it('rejects a tampered body under an otherwise valid signature', () => {
    const sig = computeDiditSignatureV2(body, secret);
    expect(codeOf(() => verifyDiditWebhookSignatureV2(raw({ ...body, status: 'Declined' }), sig, secret))).toBe('mismatch');
  });

  it('rejects a body that is not JSON', () => {
    expect(codeOf(() => verifyDiditWebhookSignatureV2(Buffer.from('nope'), 'abc', secret))).toBe('body_not_json');
  });

  it('does not accept the legacy raw-bytes X-Signature value as a V2 signature (no fallback)', () => {
    const { createHmac } = require('crypto');
    const legacy = createHmac('sha256', secret).update(Buffer.from(' ' + JSON.stringify(body), 'utf8')).digest('hex');
    expect(codeOf(() => verifyDiditWebhookSignatureV2(Buffer.from(' ' + JSON.stringify(body), 'utf8'), legacy, secret))).toBe('mismatch');
  });
});
