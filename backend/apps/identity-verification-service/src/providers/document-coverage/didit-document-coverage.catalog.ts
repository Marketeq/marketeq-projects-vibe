import { createHash } from 'crypto';
import { DocumentType } from '../../entities/enums/identity-verification.enums';

// Types, label mapping and integrity helpers for the versioned, backend-owned
// snapshot of Didit's published per-country document coverage. The snapshot
// itself is didit-document-coverage.data.ts, generated offline by
// scripts/import-didit-document-coverage.ts from a manually downloaded copy
// of Didit's public "Supported ID Documents" page — never scraped at runtime.
// The catalog integrity check (buildCoverageIndex) and its spec fail if the
// data and contentSha256 disagree.
//
// What the page publishes, and nothing more: a country's ISO 3166-1 alpha-3
// code (Didit's own variant for a handful of territories) and, per document
// type, whether it is supported. It publishes NO Didit document codes and NO
// required-side counts, so those stay null below — never guessed.

// Column labels exactly as Didit prints them.
export type DiditDocumentLabel =
  | 'ID Card'
  | 'Passport'
  | 'Driver License'
  | 'Residence Permit'
  | 'Health Insurance';

export interface DiditDocumentTypeMapping {
  // Our domain DocumentType, or null when the domain has no equivalent. A
  // null-mapped label is retained in the source catalog but is never
  // returned to callers or accepted by submitDocument.
  canonicalType: DocumentType | null;
  diditDocumentCode: string | null;
  requiredSides: number | null;
}

export const DIDIT_DOCUMENT_TYPE_MAPPINGS: Readonly<Record<DiditDocumentLabel, DiditDocumentTypeMapping>> = {
  'ID Card': { canonicalType: DocumentType.ID_CARD, diditDocumentCode: null, requiredSides: null },
  Passport: { canonicalType: DocumentType.PASSPORT, diditDocumentCode: null, requiredSides: null },
  'Driver License': { canonicalType: DocumentType.DRIVERS_LICENCE, diditDocumentCode: null, requiredSides: null },
  'Residence Permit': { canonicalType: DocumentType.RESIDENCE_PERMIT, diditDocumentCode: null, requiredSides: null },
  // Not one of the four canonical types in the domain enum or the approved
  // backend documents (README §6, Answer 7). Retained, never exposed.
  'Health Insurance': { canonicalType: null, diditDocumentCode: null, requiredSides: null },
};

export interface DiditCoverageCountry {
  // Didit's published code. ISO 3166-1 alpha-3 for almost every row; see
  // iso-3166-1.ts for the RKS alias and the rows with no ISO equivalent.
  code: string;
  documents: readonly DiditDocumentLabel[];
}

export interface DocumentCoverageCatalog {
  catalogVersion: string;
  sourceUrl: string;
  // The machine-readable rendition of sourceUrl that was actually parsed
  // (the HTML page renders its table client-side).
  sourceRenditionUrl: string;
  retrievedAt: string;
  // SHA-256 of the raw bytes of sourceRenditionUrl as retrieved.
  sourceSha256: string;
  // SHA-256 of JSON.stringify(countries); verified on load.
  contentSha256: string;
  countries: readonly DiditCoverageCountry[];
}

export const DOCUMENT_COVERAGE_CATALOG = Symbol('DOCUMENT_COVERAGE_CATALOG');

export function computeCoverageContentSha256(countries: readonly DiditCoverageCountry[]): string {
  return createHash('sha256').update(JSON.stringify(countries)).digest('hex');
}

// The generated snapshot (country rows + provenance metadata). Re-exported so
// consumers keep importing everything catalog-related from this module.
export { DIDIT_COVERAGE_COUNTRIES, DIDIT_DOCUMENT_COVERAGE_CATALOG } from './didit-document-coverage.data';
