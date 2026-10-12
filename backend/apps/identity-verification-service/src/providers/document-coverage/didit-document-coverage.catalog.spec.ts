import { DocumentType } from '../../entities/enums/identity-verification.enums';
import {
  computeCoverageContentSha256,
  DIDIT_COVERAGE_COUNTRIES,
  DIDIT_DOCUMENT_COVERAGE_CATALOG,
  DIDIT_DOCUMENT_TYPE_MAPPINGS,
} from './didit-document-coverage.catalog';
import {
  DIDIT_CODES_WITHOUT_ISO_ALPHA2,
  ISO_3166_1_COUNTRIES,
  isoAlpha2FromDiditAlpha3,
} from './iso-3166-1';

describe('Didit document coverage catalog', () => {
  const byCode = new Map(DIDIT_COVERAGE_COUNTRIES.map((c) => [c.code, c]));

  it('records source URL, retrieval date, version and both content hashes', () => {
    expect(DIDIT_DOCUMENT_COVERAGE_CATALOG).toMatchObject({
      catalogVersion: '2026-09-29.1',
      sourceUrl:
        'https://docs.didit.me/core-technology/id-verification/supported-documents-id-verification',
      retrievedAt: '2026-09-29',
    });
    expect(DIDIT_DOCUMENT_COVERAGE_CATALOG.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(DIDIT_DOCUMENT_COVERAGE_CATALOG.contentSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('contentSha256 matches the committed country data', () => {
    expect(computeCoverageContentSha256(DIDIT_COVERAGE_COUNTRIES)).toBe(
      DIDIT_DOCUMENT_COVERAGE_CATALOG.contentSha256,
    );
  });

  it('holds the 237 countries and 858 mappings extracted from Didit\'s page', () => {
    expect(DIDIT_COVERAGE_COUNTRIES).toHaveLength(237);
    expect(new Set(byCode.keys()).size).toBe(237);
    expect(DIDIT_COVERAGE_COUNTRIES.reduce((sum, c) => sum + c.documents.length, 0)).toBe(858);
  });

  it('retains Health Insurance in the source (68 rows) but maps it to no canonical type', () => {
    const rows = DIDIT_COVERAGE_COUNTRIES.filter((c) => c.documents.includes('Health Insurance'));
    expect(rows).toHaveLength(68);
    expect(DIDIT_DOCUMENT_TYPE_MAPPINGS['Health Insurance'].canonicalType).toBeNull();
  });

  it('maps exactly the four canonical types and introduces no Birth Certificate', () => {
    const mapped = Object.values(DIDIT_DOCUMENT_TYPE_MAPPINGS)
      .map((m) => m.canonicalType)
      .filter((t): t is DocumentType => t !== null)
      .sort();
    expect(mapped).toEqual(Object.values(DocumentType).sort());
    expect(Object.keys(DIDIT_DOCUMENT_TYPE_MAPPINGS).join(' ')).not.toMatch(/birth/i);
  });

  it('invents no Didit document codes or required side counts', () => {
    for (const mapping of Object.values(DIDIT_DOCUMENT_TYPE_MAPPINGS)) {
      expect(mapping.diditDocumentCode).toBeNull();
      expect(mapping.requiredSides).toBeNull();
    }
  });

  it('matches Didit\'s published rows for the United States, India, the United Kingdom, Aruba and Afghanistan', () => {
    const all = ['ID Card', 'Passport', 'Driver License', 'Residence Permit', 'Health Insurance'];
    expect(byCode.get('USA')?.documents).toEqual(all);
    expect(byCode.get('IND')?.documents).toEqual(all);
    expect(byCode.get('GBR')?.documents).toEqual(all);
    expect(byCode.get('ABW')?.documents).toEqual(['ID Card', 'Driver License', 'Residence Permit']);
    expect(byCode.get('AFG')?.documents).toEqual(['ID Card', 'Passport', 'Driver License']);
  });

  describe('ISO alpha-2 <-> alpha-3 mapping', () => {
    it('has unique, well-formed codes', () => {
      expect(new Set(ISO_3166_1_COUNTRIES.map((c) => c.alpha2)).size).toBe(ISO_3166_1_COUNTRIES.length);
      expect(new Set(ISO_3166_1_COUNTRIES.map((c) => c.alpha3)).size).toBe(ISO_3166_1_COUNTRIES.length);
      for (const c of ISO_3166_1_COUNTRIES) {
        expect(c.alpha2).toMatch(/^[A-Z]{2}$/);
        expect(c.alpha3).toMatch(/^[A-Z]{3}$/);
      }
    });

    it.each([
      ['USA', 'US'],
      ['IND', 'IN'],
      ['GBR', 'GB'],
      ['DEU', 'DE'],
      ['CHE', 'CH'],
      ['ARE', 'AE'],
      ['RKS', 'XK'],
    ])('%s -> %s', (alpha3, alpha2) => {
      expect(isoAlpha2FromDiditAlpha3(alpha3)).toBe(alpha2);
    });

    it('resolves every Didit row except the known non-ISO codes, with no alpha-2 collisions', () => {
      const unresolved = DIDIT_COVERAGE_COUNTRIES.filter((c) => !isoAlpha2FromDiditAlpha3(c.code)).map(
        (c) => c.code,
      );
      expect(unresolved.sort()).toEqual([...DIDIT_CODES_WITHOUT_ISO_ALPHA2].sort());

      const alpha2s = DIDIT_COVERAGE_COUNTRIES.map((c) => isoAlpha2FromDiditAlpha3(c.code)).filter(Boolean);
      expect(new Set(alpha2s).size).toBe(alpha2s.length);
    });
  });
});
