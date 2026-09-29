import { DocumentType } from '../../entities/enums/identity-verification.enums';
import { DocumentCoverageUnavailableException } from '../../common/errors/domain-exceptions';
import {
  buildCoverageIndex,
  CatalogDocumentCoverageProvider,
  DocumentCoverageCatalogIntegrityError,
} from './catalog-document-coverage.provider';
import {
  computeCoverageContentSha256,
  DIDIT_DOCUMENT_COVERAGE_CATALOG,
  DiditCoverageCountry,
  DocumentCoverageCatalog,
} from './didit-document-coverage.catalog';

const catalogWith = (countries: DiditCoverageCountry[]): DocumentCoverageCatalog => ({
  ...DIDIT_DOCUMENT_COVERAGE_CATALOG,
  countries,
  contentSha256: computeCoverageContentSha256(countries),
});

describe('CatalogDocumentCoverageProvider', () => {
  const provider = new CatalogDocumentCoverageProvider();

  describe('getAcceptedDocumentTypes', () => {
    it.each(['US', 'IN', 'GB'])(
      '%s accepts all four canonical types (Didit also lists Health Insurance, which is never exposed)',
      async (country) => {
        const result = await provider.getAcceptedDocumentTypes(country);

        expect([...result].sort()).toEqual(Object.values(DocumentType).sort());
        expect(result).toHaveLength(4);
      },
    );

    it('resolves alpha-2 to the alpha-3 row Didit publishes (AW -> ABW: ID card, licence, residence permit; no passport)', async () => {
      await expect(provider.getAcceptedDocumentTypes('AW')).resolves.toEqual([
        DocumentType.ID_CARD,
        DocumentType.DRIVERS_LICENCE,
        DocumentType.RESIDENCE_PERMIT,
      ]);
    });

    it('returns only what Didit lists for the country (AF -> no residence permit)', async () => {
      await expect(provider.getAcceptedDocumentTypes('AF')).resolves.toEqual([
        DocumentType.ID_CARD,
        DocumentType.PASSPORT,
        DocumentType.DRIVERS_LICENCE,
      ]);
    });

    it('never returns anything outside the four canonical DocumentType values', async () => {
      const allowed = new Set<string>(Object.values(DocumentType));
      for (const country of ['US', 'IN', 'GB', 'DE', 'AW', 'XK']) {
        for (const type of await provider.getAcceptedDocumentTypes(country)) {
          expect(allowed.has(type)).toBe(true);
        }
      }
    });

    it('maps Didit\'s non-ISO RKS row to alpha-2 XK (Kosovo)', async () => {
      await expect(provider.getAcceptedDocumentTypes('XK')).resolves.toEqual([
        DocumentType.ID_CARD,
        DocumentType.PASSPORT,
        DocumentType.DRIVERS_LICENCE,
        DocumentType.RESIDENCE_PERMIT,
      ]);
    });

    it('returns a real empty list for a valid country Didit does not list', async () => {
      // Guards the data assumption rather than asserting on a guess: pick an
      // ISO alpha-2 that has no catalog row and confirm it is a known empty.
      const listed = buildCoverageIndex(DIDIT_DOCUMENT_COVERAGE_CATALOG);
      const unlisted = ['BV', 'HM', 'AQ', 'UM', 'TF', 'GS'].find((code) => !listed.has(code));
      expect(unlisted).toBeDefined();
      await expect(provider.getAcceptedDocumentTypes(unlisted as string)).resolves.toEqual([]);
    });

    it('returns an empty list for an unknown code rather than throwing or fabricating', async () => {
      await expect(provider.getAcceptedDocumentTypes('ZZ')).resolves.toEqual([]);
    });

    it('returns a fresh array each call so callers cannot mutate the catalog', async () => {
      const first = await provider.getAcceptedDocumentTypes('US');
      first.length = 0;
      await expect(provider.getAcceptedDocumentTypes('US')).resolves.toHaveLength(4);
    });
  });

  describe('getCatalogMetadata', () => {
    it('reports the active catalog version and retrieval date', async () => {
      await expect(provider.getCatalogMetadata()).resolves.toEqual({
        catalogVersion: DIDIT_DOCUMENT_COVERAGE_CATALOG.catalogVersion,
        retrievedAt: DIDIT_DOCUMENT_COVERAGE_CATALOG.retrievedAt,
      });
    });
  });

  describe('integrity failure', () => {
    const tampered: DocumentCoverageCatalog = {
      ...DIDIT_DOCUMENT_COVERAGE_CATALOG,
      contentSha256: '0'.repeat(64),
    };

    it('fails closed with DocumentCoverageUnavailableException when the catalog hash does not match', async () => {
      const broken = new CatalogDocumentCoverageProvider(tampered);

      await expect(broken.getAcceptedDocumentTypes('US')).rejects.toBeInstanceOf(
        DocumentCoverageUnavailableException,
      );
      await expect(broken.getAcceptedDocumentTypes('US')).rejects.toMatchObject({
        code: 'DOCUMENT_COVERAGE_UNAVAILABLE',
      });
      await expect(broken.getCatalogMetadata()).rejects.toBeInstanceOf(DocumentCoverageUnavailableException);
    });
  });
});

describe('buildCoverageIndex', () => {
  it('rejects duplicate country codes', () => {
    const countries: DiditCoverageCountry[] = [
      { code: 'USA', documents: ['Passport'] },
      { code: 'USA', documents: ['ID Card'] },
    ];
    expect(() => buildCoverageIndex(catalogWith(countries))).toThrow(DocumentCoverageCatalogIntegrityError);
  });

  it('rejects an unknown document label', () => {
    const countries = [{ code: 'USA', documents: ['Birth Certificate'] }] as unknown as DiditCoverageCountry[];
    expect(() => buildCoverageIndex(catalogWith(countries))).toThrow(/unknown document label/);
  });

  it('rejects a duplicated label within one country', () => {
    const countries: DiditCoverageCountry[] = [{ code: 'USA', documents: ['Passport', 'Passport'] }];
    expect(() => buildCoverageIndex(catalogWith(countries))).toThrow(/duplicate label/);
  });

  it('keeps Health Insurance in the source but yields no canonical type for it', () => {
    const index = buildCoverageIndex(
      catalogWith([{ code: 'USA', documents: ['Health Insurance', 'Passport'] }]),
    );
    expect(index.get('US')).toEqual([DocumentType.PASSPORT]);
  });

  it('skips catalog rows that have no ISO alpha-2 equivalent without failing', () => {
    const index = buildCoverageIndex(
      catalogWith([
        { code: 'ABK', documents: ['Passport'] },
        { code: 'USA', documents: ['Passport'] },
      ]),
    );
    expect([...index.keys()]).toEqual(['US']);
  });
});
