import { hashDocumentNumber, normalizeDocumentNumber } from './document-fingerprint';

describe('document-fingerprint', () => {
  const ORIGINAL_ENV = process.env.DOCUMENT_NUMBER_HASH_PEPPER;

  afterEach(() => {
    process.env.DOCUMENT_NUMBER_HASH_PEPPER = ORIGINAL_ENV;
  });

  describe('normalizeDocumentNumber', () => {
    it('trims and upper-cases', () => {
      expect(normalizeDocumentNumber('  x1234567  ')).toBe('X1234567');
    });
  });

  describe('hashDocumentNumber', () => {
    it('throws when the pepper is not configured', () => {
      delete process.env.DOCUMENT_NUMBER_HASH_PEPPER;
      expect(() => hashDocumentNumber('X1234567')).toThrow(
        'DOCUMENT_NUMBER_HASH_PEPPER is required to hash a document number.',
      );
    });

    it('produces a deterministic 64-char hex digest, never the plaintext input', () => {
      process.env.DOCUMENT_NUMBER_HASH_PEPPER = 'test-pepper';
      const hash = hashDocumentNumber('X1234567');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).not.toContain('X1234567');
    });

    it('produces the same digest for the same input and pepper', () => {
      process.env.DOCUMENT_NUMBER_HASH_PEPPER = 'test-pepper';
      expect(hashDocumentNumber('X1234567')).toBe(hashDocumentNumber('X1234567'));
    });

    it('produces a different digest for a different pepper', () => {
      process.env.DOCUMENT_NUMBER_HASH_PEPPER = 'pepper-a';
      const first = hashDocumentNumber('X1234567');
      process.env.DOCUMENT_NUMBER_HASH_PEPPER = 'pepper-b';
      const second = hashDocumentNumber('X1234567');
      expect(first).not.toBe(second);
    });
  });
});
