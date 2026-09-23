import { createHmac } from 'crypto';

// Doc 03 §6b / TRVG2 §1.6: document_number_normalized must be a one-way
// hash, never plaintext. Algorithm confirmed by Security/Engineering
// (five-question technical resolution, Q2): HMAC-SHA-256, keyed with a
// pepper, computed over the normalized (trim + uppercase) document number
// only — issuing_country/document_type do not join the hash input.
//
// The pepper is sourced from DOCUMENT_NUMBER_HASH_PEPPER, a gitignored env
// var standing in for "KMS-held" (this repo has no real KMS integration
// today) — the same stand-in pattern already used for
// messaging-service's E2EE_SERVER_SECRET. Replace with real KMS-backed key
// retrieval once that infrastructure exists; callers of this function do
// not need to change when that happens.
export function normalizeDocumentNumber(documentNumber: string): string {
  return documentNumber.trim().toUpperCase();
}

export function hashDocumentNumber(normalizedDocumentNumber: string): string {
  const pepper = process.env.DOCUMENT_NUMBER_HASH_PEPPER;
  if (!pepper) {
    throw new Error('DOCUMENT_NUMBER_HASH_PEPPER is required to hash a document number.');
  }
  return createHmac('sha256', pepper).update(normalizedDocumentNumber).digest('hex');
}
