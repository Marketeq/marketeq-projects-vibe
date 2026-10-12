import { readFileSync } from 'fs';
import { join } from 'path';
import {
  diffCatalogs,
  EXPECTED_COLUMNS,
  nextCatalogVersion,
  parseDiditCoverageMarkdown,
  planImport,
  renderDataFile,
} from './import-didit-document-coverage';
import {
  computeCoverageContentSha256,
  DiditCoverageCountry,
  DiditDocumentLabel,
  DocumentCoverageCatalog,
} from '../src/providers/document-coverage/didit-document-coverage.catalog';
import { DIDIT_DOCUMENT_COVERAGE_CATALOG } from '../src/providers/document-coverage/didit-document-coverage.data';
import { buildCoverageIndex } from '../src/providers/document-coverage/catalog-document-coverage.provider';
import { DocumentType } from '../src/entities/enums/identity-verification.enums';

// Builds markdown in the same shape as Didit's page (the parts the importer
// reads), from plain data — so these tests never need a real download.
const markdownFor = (
  rows: Array<[string, DiditDocumentLabel[]]>,
  columns: string[] = [...EXPECTED_COLUMNS],
  extraRowHtml = '',
): string => {
  const head =
    `<div className="didit-dl-row didit-dl-head"><div className="didit-dl-country-head"><span>Country</span></div>` +
    columns.map((c) => `<div className="didit-dl-doc-head"><span title="${c}">${c}</span></div>`).join('');
  const body = rows
    .map(
      ([code, docs]) =>
        `<div className="didit-dl-row"><div className="didit-dl-country"><span className="didit-dl-name">${code}</span></div>` +
        `<div className="didit-dl-code-cell"><span className="didit-dl-code-badge">${code}</span></div>` +
        columns
          .map((c) =>
            docs.includes(c as DiditDocumentLabel)
              ? '<div className="didit-dl-doc-cell"><span className="didit-dl-cb is-on" aria-label="Supported" role="img"></span></div>'
              : '<div className="didit-dl-doc-cell"><span className="didit-dl-dash" aria-label="Not supported">—</span></div>',
          )
          .join('') +
        '</div>',
    )
    .join('');
  return `export const X = () => <div>${head}</div>${body}${extraRowHtml}`;
};

const BASE_ROWS: Array<[string, DiditDocumentLabel[]]> = [
  ['USA', ['ID Card', 'Passport', 'Driver License', 'Residence Permit', 'Health Insurance']],
  ['IND', ['ID Card', 'Passport', 'Driver License']],
  ['GBR', ['Passport', 'Driver License', 'Health Insurance']],
  ['ABK', ['Passport']], // Didit-only code, on the deliberate no-ISO list
];

const catalogFromMarkdown = (markdown: string): DocumentCoverageCatalog => {
  const countries = parseDiditCoverageMarkdown(markdown).countries as DiditCoverageCountry[];
  const sorted = [...countries].sort((a, b) => a.code.localeCompare(b.code));
  const { createHash } = require('crypto');
  return {
    ...DIDIT_DOCUMENT_COVERAGE_CATALOG,
    catalogVersion: '2026-09-29.1',
    retrievedAt: '2026-09-29',
    sourceSha256: createHash('sha256').update(markdown).digest('hex'),
    contentSha256: computeCoverageContentSha256(sorted),
    countries: sorted,
  };
};

describe('import-didit-document-coverage', () => {
  const baseMarkdown = markdownFor(BASE_ROWS);
  const current = catalogFromMarkdown(baseMarkdown);
  const args = { retrievedAt: '2026-10-15' };

  describe('parseDiditCoverageMarkdown', () => {
    it('reads the five published columns and each row\'s supported flags', () => {
      const parsed = parseDiditCoverageMarkdown(baseMarkdown);

      expect(parsed.columns).toEqual([...EXPECTED_COLUMNS]);
      expect(parsed.malformedRows).toEqual([]);
      expect(parsed.countries.find((c) => c.code === 'IND')?.documents).toEqual([
        'ID Card',
        'Passport',
        'Driver License',
      ]);
      expect(parsed.supportedMarkerCount).toBe(5 + 3 + 3 + 1);
    });

    it('flags a row whose cell count does not match the header', () => {
      const parsed = parseDiditCoverageMarkdown(
        baseMarkdown +
          '<div className="didit-dl-row"><span className="didit-dl-code-badge">FRA</span><span aria-label="Supported"></span></div>',
      );
      expect(parsed.malformedRows).toEqual(['FRA']);
    });
  });

  describe('planImport', () => {
    it('reports up to date and writes nothing when the source is byte-identical', () => {
      const result = planImport(baseMarkdown, { retrievedAt: '2026-09-29' }, current);

      expect(result).toMatchObject({ exitCode: 0, changed: false });
      expect(result.rendered).toBeUndefined();
      expect(result.report).toMatch(/up to date/);
    });

    it('produces a readable diff and a new version when a country changes', () => {
      const changed = markdownFor(
        BASE_ROWS.map(([c, d]) => (c === 'IND' ? [c, [...d, 'Residence Permit']] : [c, d])) as typeof BASE_ROWS,
      );
      const result = planImport(changed, { ...args, expectMappings: 13 }, current);

      expect(result.exitCode).toBe(0);
      expect(result.changed).toBe(true);
      expect(result.report).toContain('Catalog version: 2026-09-29.1 -> 2026-10-15.1');
      expect(result.report).toContain('Mappings:        12 -> 13 (+1)');
      expect(result.report).toContain('~ IND: +Residence Permit');
      expect(result.report).toContain('contentSha256:');
    });

    it('is deterministic: same input yields byte-identical output and hashes', () => {
      const changed = markdownFor([...BASE_ROWS].reverse());
      const changedRows = markdownFor(BASE_ROWS.map(([c, d]) => (c === 'GBR' ? [c, ['Passport']] : [c, d])) as typeof BASE_ROWS);
      const a = planImport(changedRows, { ...args, expectMappings: 10 }, current);
      const b = planImport(changedRows, { ...args, expectMappings: 10 }, current);

      expect(a.rendered).toBe(b.rendered);
      expect(a.report).toBe(b.report);
      // Row order in the source does not change the generated (sorted) output.
      expect(planImport(changed, args, current).changed).toBe(true);
      expect(planImport(changed, args, current).rendered).toContain("{ code: 'ABK'");
    });

    it('sorts countries by code and hashes the normalized data', () => {
      const changed = markdownFor([...BASE_ROWS].reverse().concat([['FRA', ['Passport']]]));
      const result = planImport(changed, { ...args, expectCountries: 5, expectMappings: 13 }, current);
      const codes = [...(result.rendered as string).matchAll(/code: '([A-Z]{3})'/g)].map((m) => m[1]);

      expect(codes).toEqual(['ABK', 'FRA', 'GBR', 'IND', 'USA']);
      const contentSha = /contentSha256: '([0-9a-f]{64})'/.exec(result.rendered as string)?.[1];
      expect(contentSha).toMatch(/^[0-9a-f]{64}$/);
      expect(contentSha).not.toBe(current.contentSha256);
    });

    it('bumps the version suffix on the same day and resets it on a new day', () => {
      expect(nextCatalogVersion('2026-09-29.1', '2026-09-29')).toBe('2026-09-29.2');
      expect(nextCatalogVersion('2026-09-29.7', '2026-10-15')).toBe('2026-10-15.1');
    });

    it('honours an explicit --version', () => {
      const changedRows = markdownFor(BASE_ROWS.map(([c, d]) => (c === 'GBR' ? [c, ['Passport']] : [c, d])) as typeof BASE_ROWS);
      const result = planImport(changedRows, { ...args, version: '2026-10-15.9', expectMappings: 10 }, current);
      expect(result.rendered).toContain("catalogVersion: '2026-10-15.9'");
    });

    describe('refuses to import', () => {
      const refused = (markdown: string, extra: Partial<typeof args & { expectCountries: number; expectMappings: number }> = {}) =>
        planImport(markdown, { ...args, ...extra }, current);

      it('duplicate countries', () => {
        const result = refused(markdownFor([...BASE_ROWS, ['USA', ['Passport']]]), { expectCountries: 5, expectMappings: 13 });
        expect(result.exitCode).toBe(1);
        expect(result.report).toMatch(/duplicate countries: USA/);
      });

      it('an unknown document label', () => {
        const result = refused(markdownFor(BASE_ROWS, [...EXPECTED_COLUMNS.slice(0, 4), 'Birth Certificate']));
        expect(result.exitCode).toBe(1);
        expect(result.report).toMatch(/unknown document label\(s\): Birth Certificate/);
      });

      it('reordered or missing document columns', () => {
        const result = refused(markdownFor(BASE_ROWS, ['Passport', 'ID Card', 'Driver License', 'Residence Permit', 'Health Insurance']));
        expect(result.exitCode).toBe(1);
        expect(result.report).toMatch(/document columns changed/);
      });

      it('a code with no ISO mapping that is not on the deliberate list', () => {
        const result = refused(markdownFor([...BASE_ROWS, ['QQQ', ['Passport']]]), { expectCountries: 5, expectMappings: 13 });
        expect(result.exitCode).toBe(1);
        expect(result.report).toMatch(/QQQ has no ISO 3166-1 alpha-2 mapping/);
      });

      it('a malformed country code', () => {
        const result = refused(markdownFor([...BASE_ROWS, ['us', ['Passport']]]), { expectCountries: 5, expectMappings: 13 });
        expect(result.report).toMatch(/invalid country code "us"/);
      });

      it('an alpha-2 collision (Didit RKS alongside ISO XKX)', () => {
        const result = refused(markdownFor([...BASE_ROWS, ['RKS', ['Passport']], ['XKX', ['Passport']]]), {
          expectCountries: 6,
          expectMappings: 14,
        });
        expect(result.report).toMatch(/alpha-2 XK would map from both/);
      });

      it('an unexpected country or mapping count change, until acknowledged exactly', () => {
        const more = markdownFor([...BASE_ROWS, ['FRA', ['Passport']]]);

        const unacknowledged = refused(more);
        expect(unacknowledged.exitCode).toBe(1);
        expect(unacknowledged.report).toMatch(/country count is 5, expected 4/);
        expect(unacknowledged.report).toMatch(/mapping count is 13, expected 12/);

        expect(refused(more, { expectCountries: 5, expectMappings: 12 }).exitCode).toBe(1);
        expect(refused(more, { expectCountries: 5, expectMappings: 13 }).exitCode).toBe(0);
      });

      it('input that is not the markdown rendition (no rows)', () => {
        const result = refused('<html><body>client-rendered page</body></html>');
        expect(result.exitCode).toBe(1);
        expect(result.report).toMatch(/no coverage rows found/);
      });

      it('a malformed row', () => {
        const result = refused(
          baseMarkdown + '<div className="didit-dl-row"><span className="didit-dl-code-badge">FRA</span></div>',
        );
        expect(result.exitCode).toBe(1);
        expect(result.report).toMatch(/malformed rows.*FRA/);
      });
    });

    it('keeps Health Insurance in the source data but excludes it from public canonical types', () => {
      const changed = markdownFor(BASE_ROWS.map(([c, d]) => (c === 'IND' ? [c, [...d, 'Health Insurance']] : [c, d])) as typeof BASE_ROWS);
      const result = planImport(changed, { ...args, expectMappings: 13 }, current);

      expect(result.rendered).toContain("code: 'IND', documents: ['ID Card', 'Passport', 'Driver License', 'Health Insurance']");

      const nextCatalog = catalogFromMarkdown(changed);
      const index = buildCoverageIndex(nextCatalog);
      expect(index.get('IN')).toEqual([DocumentType.ID_CARD, DocumentType.PASSPORT, DocumentType.DRIVERS_LICENCE]);
      for (const types of index.values()) {
        expect(types.every((t) => (Object.values(DocumentType) as string[]).includes(t))).toBe(true);
      }
    });

    it('never emits Didit document codes or required side counts', () => {
      const result = planImport(markdownFor(BASE_ROWS.slice(0, 3)), { ...args, expectCountries: 3, expectMappings: 11 }, current);
      expect(result.rendered).not.toMatch(/diditDocumentCode|requiredSides/);
    });
  });

  describe('diffCatalogs', () => {
    it('lists added, removed and changed countries', () => {
      const next = catalogFromMarkdown(
        markdownFor([
          ['USA', ['Passport']],
          ['IND', ['ID Card', 'Passport', 'Driver License']],
          ['FRA', ['Passport']],
          ['ABK', ['Passport']],
        ]),
      );
      const diff = diffCatalogs(current, { ...next, catalogVersion: '2026-10-15.1' });

      expect(diff).toContain('+ FRA: Passport');
      expect(diff).toContain('- GBR: Passport, Driver License, Health Insurance');
      expect(diff).toContain('~ USA: -ID Card -Driver License -Residence Permit -Health Insurance');
      expect(diff).not.toContain('IND:');
    });
  });

  describe('renderDataFile', () => {
    it('reproduces the committed data module byte-for-byte from the committed catalog', () => {
      const onDisk = readFileSync(
        join(__dirname, '../src/providers/document-coverage/didit-document-coverage.data.ts'),
        'utf8',
      );
      expect(renderDataFile(DIDIT_DOCUMENT_COVERAGE_CATALOG)).toBe(onDisk);
    });
  });
});
