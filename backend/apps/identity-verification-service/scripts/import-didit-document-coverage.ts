/**
 * Offline importer for the Didit document-coverage catalog.
 *
 * Reads a manually downloaded copy of Didit's "Supported ID Documents" docs
 * page (the markdown rendition — the HTML page renders its table client-side)
 * and regenerates src/providers/document-coverage/didit-document-coverage.data.ts.
 * It never touches the network, and nothing in the running service imports it:
 * the service only ever reads the committed, generated data file.
 *
 * Usage (from backend/):
 *   npx ts-node apps/identity-verification-service/scripts/import-didit-document-coverage.ts \
 *     --input /path/to/supported-documents-id-verification.md \
 *     --retrieved-at 2026-10-15 \
 *     [--version 2026-10-15.1] \
 *     [--expect-countries 238 --expect-mappings 860] \
 *     [--write]
 *
 * Without --write it is a dry run: it validates, prints a readable diff against
 * the current catalog, and changes nothing. Exit codes: 0 ok / up to date,
 * 1 validation failure, 2 usage error.
 *
 * Safety rules, all enforced below:
 *  - fails on duplicate countries, unknown or reordered document columns,
 *    malformed rows, ISO codes that map to no alpha-2 (and are not already on
 *    the deliberate DIDIT_CODES_WITHOUT_ISO_ALPHA2 list), and alpha-2 collisions;
 *  - fails if the country or mapping count differs from the current catalog
 *    unless the exact new counts are passed via --expect-countries and
 *    --expect-mappings (a deliberate acknowledgement of the change);
 *  - keeps Health Insurance in the source rows (the canonical-type mapping in
 *    didit-document-coverage.catalog.ts excludes it from public output);
 *  - never invents Didit document codes or required sides: the page publishes
 *    neither, so they stay null in the mapping table, not here.
 */
import { createHash } from 'crypto';
import { readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  computeCoverageContentSha256,
  DIDIT_DOCUMENT_TYPE_MAPPINGS,
  DiditCoverageCountry,
  DiditDocumentLabel,
  DocumentCoverageCatalog,
} from '../src/providers/document-coverage/didit-document-coverage.catalog';
import { DIDIT_DOCUMENT_COVERAGE_CATALOG } from '../src/providers/document-coverage/didit-document-coverage.data';
import {
  DIDIT_CODES_WITHOUT_ISO_ALPHA2,
  isoAlpha2FromDiditAlpha3,
} from '../src/providers/document-coverage/iso-3166-1';

export const EXPECTED_COLUMNS: readonly DiditDocumentLabel[] = [
  'ID Card',
  'Passport',
  'Driver License',
  'Residence Permit',
  'Health Insurance',
];

const DATA_FILE = join(__dirname, '../src/providers/document-coverage/didit-document-coverage.data.ts');
const ROW_MARKER = '<div className="didit-dl-row">';
const HEAD_PATTERN = /className="didit-dl-row didit-dl-head">([\s\S]*?)<div className="didit-dl-row">/;

export interface ParsedCoverage {
  columns: string[];
  countries: DiditCoverageCountry[];
  malformedRows: string[];
  supportedMarkerCount: number;
}

export function parseDiditCoverageMarkdown(markdown: string): ParsedCoverage {
  const head = HEAD_PATTERN.exec(markdown);
  const columns = head ? [...head[1].matchAll(/<span title="([^"]+)">/g)].map((m) => m[1]) : [];

  const countries: DiditCoverageCountry[] = [];
  const malformedRows: string[] = [];
  let supportedMarkerCount = 0;

  for (const raw of markdown.split(ROW_MARKER).slice(1)) {
    const code = /<span className="didit-dl-code-badge">([^<]*)<\/span>/.exec(raw)?.[1] ?? '';
    const flags = [...raw.matchAll(/aria-label="(Supported|Not supported)"/g)].map((m) => m[1] === 'Supported');
    if (flags.length !== columns.length) {
      malformedRows.push(code || '(no code)');
      continue;
    }
    supportedMarkerCount += flags.filter(Boolean).length;
    countries.push({
      code,
      documents: columns.filter((_, i) => flags[i]) as DiditDocumentLabel[],
    });
  }
  return { columns, countries, malformedRows, supportedMarkerCount };
}

export interface ValidationOptions {
  expectCountries: number;
  expectMappings: number;
}

export function mappingCount(countries: readonly DiditCoverageCountry[]): number {
  return countries.reduce((sum, country) => sum + country.documents.length, 0);
}

export function validateParsedCoverage(parsed: ParsedCoverage, options: ValidationOptions): string[] {
  const errors: string[] = [];

  if (parsed.countries.length === 0 && parsed.malformedRows.length === 0) {
    errors.push(
      'no coverage rows found — expected the markdown rendition of the Didit page (…/supported-documents-id-verification.md)',
    );
    return errors;
  }
  if (parsed.columns.join('|') !== EXPECTED_COLUMNS.join('|')) {
    const unknown = parsed.columns.filter((c) => !(c in DIDIT_DOCUMENT_TYPE_MAPPINGS));
    errors.push(
      unknown.length
        ? `unknown document label(s): ${unknown.join(', ')}`
        : `document columns changed: expected [${EXPECTED_COLUMNS.join(', ')}], found [${parsed.columns.join(', ')}]`,
    );
  }
  if (parsed.malformedRows.length) {
    errors.push(`malformed rows (wrong cell count): ${parsed.malformedRows.join(', ')}`);
  }

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const alpha2Owners = new Map<string, string>();
  for (const { code } of parsed.countries) {
    if (!/^[A-Z]{3}$/.test(code)) {
      errors.push(`invalid country code "${code}" (expected three uppercase letters)`);
      continue;
    }
    if (seen.has(code)) duplicates.add(code);
    seen.add(code);

    const alpha2 = isoAlpha2FromDiditAlpha3(code);
    if (alpha2) {
      const owner = alpha2Owners.get(alpha2);
      if (owner && owner !== code) errors.push(`alpha-2 ${alpha2} would map from both ${owner} and ${code}`);
      alpha2Owners.set(alpha2, code);
    } else if (!DIDIT_CODES_WITHOUT_ISO_ALPHA2.includes(code)) {
      errors.push(
        `${code} has no ISO 3166-1 alpha-2 mapping and is not on DIDIT_CODES_WITHOUT_ISO_ALPHA2 — add it deliberately or fix the ISO table`,
      );
    }
  }
  if (duplicates.size) errors.push(`duplicate countries: ${[...duplicates].join(', ')}`);

  const mappings = mappingCount(parsed.countries);
  if (parsed.supportedMarkerCount !== mappings) {
    errors.push(`internal check failed: ${parsed.supportedMarkerCount} supported markers vs ${mappings} mappings`);
  }
  if (parsed.countries.length !== options.expectCountries) {
    errors.push(
      `country count is ${parsed.countries.length}, expected ${options.expectCountries} — pass --expect-countries ${parsed.countries.length} to acknowledge the change`,
    );
  }
  if (mappings !== options.expectMappings) {
    errors.push(
      `mapping count is ${mappings}, expected ${options.expectMappings} — pass --expect-mappings ${mappings} to acknowledge the change`,
    );
  }
  return errors;
}

export function nextCatalogVersion(currentVersion: string, retrievedAt: string): string {
  const [date, suffix] = currentVersion.split('.');
  return date === retrievedAt ? `${retrievedAt}.${Number(suffix) + 1}` : `${retrievedAt}.1`;
}

export function diffCatalogs(current: DocumentCoverageCatalog, next: DocumentCoverageCatalog): string {
  const lines: string[] = [];
  const before = new Map(current.countries.map((c) => [c.code, c.documents]));
  const after = new Map(next.countries.map((c) => [c.code, c.documents]));
  const delta = (a: number, b: number) => `${a} -> ${b} (${b - a >= 0 ? '+' : ''}${b - a})`;

  lines.push(`Catalog version: ${current.catalogVersion} -> ${next.catalogVersion}`);
  lines.push(`Retrieved at:    ${current.retrievedAt} -> ${next.retrievedAt}`);
  lines.push(`Countries:       ${delta(current.countries.length, next.countries.length)}`);
  lines.push(`Mappings:        ${delta(mappingCount(current.countries), mappingCount(next.countries))}`);
  lines.push(`sourceSha256:    ${current.sourceSha256} -> ${next.sourceSha256}`);
  lines.push(`contentSha256:   ${current.contentSha256} -> ${next.contentSha256}`);
  lines.push('');

  const changes: string[] = [];
  for (const code of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const was = before.get(code);
    const now = after.get(code);
    if (!was && now) changes.push(`+ ${code}: ${now.join(', ') || '(no documents)'}`);
    else if (was && !now) changes.push(`- ${code}: ${was.join(', ') || '(no documents)'}`);
    else if (was && now) {
      const added = now.filter((d) => !was.includes(d));
      const removed = was.filter((d) => !now.includes(d));
      if (added.length || removed.length) {
        changes.push(`~ ${code}: ${[...added.map((d) => `+${d}`), ...removed.map((d) => `-${d}`)].join(' ')}`);
      }
    }
  }
  lines.push(changes.length ? `Country changes (${changes.length}):` : 'Country changes: none');
  lines.push(...changes.map((c) => `  ${c}`));
  return lines.join('\n');
}

export function renderDataFile(catalog: DocumentCoverageCatalog): string {
  const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const rows = catalog.countries
    .map((c) => `  { code: ${quote(c.code)}, documents: [${c.documents.map(quote).join(', ')}] },`)
    .join('\n');
  return `// GENERATED by scripts/import-didit-document-coverage.ts — do not hand-edit.
// Regenerate from a manually downloaded copy of Didit's "Supported ID
// Documents" page; see the script header for usage. Types and the
// label -> canonical DocumentType mapping live in
// didit-document-coverage.catalog.ts.
import type { DiditCoverageCountry, DocumentCoverageCatalog } from './didit-document-coverage.catalog';

export const DIDIT_COVERAGE_COUNTRIES: readonly DiditCoverageCountry[] = [
${rows}
];

export const DIDIT_DOCUMENT_COVERAGE_CATALOG: DocumentCoverageCatalog = {
  catalogVersion: ${quote(catalog.catalogVersion)},
  sourceUrl: ${quote(catalog.sourceUrl)},
  sourceRenditionUrl:
    ${quote(catalog.sourceRenditionUrl)},
  retrievedAt: ${quote(catalog.retrievedAt)},
  sourceSha256: ${quote(catalog.sourceSha256)},
  contentSha256: ${quote(catalog.contentSha256)},
  countries: DIDIT_COVERAGE_COUNTRIES,
};
`;
}

export interface ImportArgs {
  input: string;
  retrievedAt: string;
  version?: string;
  expectCountries?: number;
  expectMappings?: number;
  write: boolean;
}

export interface ImportResult {
  exitCode: 0 | 1;
  report: string;
  rendered?: string;
  changed: boolean;
}

// Pure orchestration (no filesystem writes) so it can be tested directly.
export function planImport(
  source: string | Buffer,
  args: Pick<ImportArgs, 'retrievedAt' | 'version' | 'expectCountries' | 'expectMappings'>,
  current: DocumentCoverageCatalog = DIDIT_DOCUMENT_COVERAGE_CATALOG,
): ImportResult {
  const markdown = source.toString('utf8');
  const parsed = parseDiditCoverageMarkdown(markdown);
  const errors = validateParsedCoverage(parsed, {
    expectCountries: args.expectCountries ?? current.countries.length,
    expectMappings: args.expectMappings ?? mappingCount(current.countries),
  });
  if (errors.length) {
    return {
      exitCode: 1,
      changed: false,
      report: `IMPORT REFUSED — ${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    };
  }

  const countries = [...parsed.countries].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  const base: DocumentCoverageCatalog = {
    ...current,
    retrievedAt: args.retrievedAt,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    contentSha256: computeCoverageContentSha256(countries),
    countries,
  };

  if (base.sourceSha256 === current.sourceSha256 && base.contentSha256 === current.contentSha256) {
    return { exitCode: 0, changed: false, report: `Catalog is up to date (version ${current.catalogVersion}); nothing to change.` };
  }

  const next = { ...base, catalogVersion: args.version ?? nextCatalogVersion(current.catalogVersion, args.retrievedAt) };
  const dataUnchanged = next.contentSha256 === current.contentSha256;
  return {
    exitCode: 0,
    changed: true,
    rendered: renderDataFile(next),
    report:
      diffCatalogs(current, next) +
      (dataUnchanged ? '\n\nNote: country data is identical; only the source page bytes / metadata changed.' : ''),
  };
}

function parseArgs(argv: string[]): ImportArgs | string {
  const values = new Map<string, string>();
  let write = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') write = true;
    else if (arg.startsWith('--') && i + 1 < argv.length) values.set(arg, argv[++i]);
    else return `unexpected argument: ${arg}`;
  }
  const input = values.get('--input');
  const retrievedAt = values.get('--retrieved-at');
  if (!input) return '--input <markdown file> is required';
  if (!retrievedAt || !/^\d{4}-\d{2}-\d{2}$/.test(retrievedAt)) return '--retrieved-at YYYY-MM-DD is required';
  const version = values.get('--version');
  if (version && !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(version)) return '--version must look like YYYY-MM-DD.N';
  const num = (flag: string) => (values.has(flag) ? Number(values.get(flag)) : undefined);
  const expectCountries = num('--expect-countries');
  const expectMappings = num('--expect-mappings');
  if ([expectCountries, expectMappings].some((n) => n !== undefined && !Number.isInteger(n))) {
    return '--expect-countries / --expect-mappings must be integers';
  }
  return { input, retrievedAt, version, expectCountries, expectMappings, write };
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args === 'string') {
    console.error(`${args}\nSee the header of scripts/import-didit-document-coverage.ts for usage.`);
    return 2;
  }
  const result = planImport(readFileSync(args.input), args);
  console.log(result.report);
  if (result.exitCode !== 0 || !result.changed) return result.exitCode;
  if (!args.write) {
    console.log('\nDRY RUN — pass --write to update didit-document-coverage.data.ts.');
    return 0;
  }
  const tmp = `${DATA_FILE}.tmp`;
  writeFileSync(tmp, result.rendered as string);
  renameSync(tmp, DATA_FILE);
  console.log(`\nWrote ${DATA_FILE}. Review the diff, run the identity-verification tests, then commit.`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}
