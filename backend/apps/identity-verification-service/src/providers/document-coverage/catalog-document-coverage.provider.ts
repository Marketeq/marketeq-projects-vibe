import { Inject, Injectable, Optional } from '@nestjs/common';
import { DocumentType } from '../../entities/enums/identity-verification.enums';
import { DocumentCoverageUnavailableException } from '../../common/errors/domain-exceptions';
import {
  DocumentCoverageMetadata,
  DocumentCoverageProvider,
  SupportedDocumentCountry,
} from './document-coverage-provider.interface';
import {
  computeCoverageContentSha256,
  DIDIT_DOCUMENT_COVERAGE_CATALOG,
  DIDIT_DOCUMENT_TYPE_MAPPINGS,
  DOCUMENT_COVERAGE_CATALOG,
  DocumentCoverageCatalog,
} from './didit-document-coverage.catalog';
import { isoAlpha2FromDiditAlpha3, isoCountryFromDiditAlpha3 } from './iso-3166-1';

export class DocumentCoverageCatalogIntegrityError extends Error {}

// Builds the alpha-2 -> canonical types index and verifies the catalog is
// internally consistent. Throws DocumentCoverageCatalogIntegrityError rather
// than returning a partially valid index.
export function buildCoverageIndex(catalog: DocumentCoverageCatalog): Map<string, DocumentType[]> {
  if (computeCoverageContentSha256(catalog.countries) !== catalog.contentSha256) {
    throw new DocumentCoverageCatalogIntegrityError('contentSha256 does not match catalog countries');
  }

  const seenCodes = new Set<string>();
  const index = new Map<string, DocumentType[]>();
  for (const country of catalog.countries) {
    if (seenCodes.has(country.code)) {
      throw new DocumentCoverageCatalogIntegrityError(`duplicate country code ${country.code}`);
    }
    seenCodes.add(country.code);

    const canonicalTypes: DocumentType[] = [];
    const seenLabels = new Set<string>();
    for (const label of country.documents) {
      const mapping = DIDIT_DOCUMENT_TYPE_MAPPINGS[label];
      if (!mapping) {
        throw new DocumentCoverageCatalogIntegrityError(`unknown document label ${label} for ${country.code}`);
      }
      if (seenLabels.has(label)) {
        throw new DocumentCoverageCatalogIntegrityError(`duplicate label ${label} for ${country.code}`);
      }
      seenLabels.add(label);
      if (mapping.canonicalType && !canonicalTypes.includes(mapping.canonicalType)) {
        canonicalTypes.push(mapping.canonicalType);
      }
    }

    // Rows with no ISO alpha-2 equivalent are kept in the catalog but cannot
    // be reached through the alpha-2 API.
    const alpha2 = isoAlpha2FromDiditAlpha3(country.code);
    if (!alpha2) continue;
    if (index.has(alpha2)) {
      throw new DocumentCoverageCatalogIntegrityError(`alpha-2 ${alpha2} maps from more than one catalog row`);
    }
    index.set(alpha2, canonicalTypes);
  }
  return index;
}

// Countries the alpha-2 API can serve with at least one canonical document
// type, sorted by name (alpha-2 as tiebreaker). Rows with no ISO alpha-2
// mapping are excluded. Assumes the catalog already passed buildCoverageIndex.
export function buildSupportedCountries(
  catalog: DocumentCoverageCatalog,
  index: Map<string, DocumentType[]>,
): SupportedDocumentCountry[] {
  const countries: SupportedDocumentCountry[] = [];
  for (const row of catalog.countries) {
    const iso = isoCountryFromDiditAlpha3(row.code);
    if (!iso || !(index.get(iso.alpha2)?.length)) continue;
    countries.push({ alpha2: iso.alpha2, alpha3: iso.alpha3, name: iso.name });
  }
  return countries.sort((a, b) => a.name.localeCompare(b.name) || a.alpha2.localeCompare(b.alpha2));
}

/**
 * Bound as DOCUMENT_COVERAGE_PROVIDER. Answers from the committed, versioned
 * Didit coverage catalog — no network calls. A country absent from the
 * catalog is a known "not supported" answer (empty list), because the
 * catalog is a complete snapshot of the vendor's published coverage. If the
 * catalog itself fails its integrity check, every lookup fails closed with
 * DocumentCoverageUnavailableException instead of answering from bad data.
 */
@Injectable()
export class CatalogDocumentCoverageProvider implements DocumentCoverageProvider {
  private readonly catalog: DocumentCoverageCatalog;
  private readonly index: Map<string, DocumentType[]> | null;
  private readonly supportedCountries: SupportedDocumentCountry[];

  constructor(@Optional() @Inject(DOCUMENT_COVERAGE_CATALOG) catalog?: DocumentCoverageCatalog) {
    this.catalog = catalog ?? DIDIT_DOCUMENT_COVERAGE_CATALOG;
    let index: Map<string, DocumentType[]> | null;
    try {
      index = buildCoverageIndex(this.catalog);
    } catch {
      index = null;
    }
    this.index = index;
    this.supportedCountries = index ? buildSupportedCountries(this.catalog, index) : [];
  }

  async getAcceptedDocumentTypes(issuingCountry: string): Promise<DocumentType[]> {
    return [...(this.requireIndex().get(issuingCountry.trim().toUpperCase()) ?? [])];
  }

  async getSupportedCountries(): Promise<SupportedDocumentCountry[]> {
    this.requireIndex();
    return this.supportedCountries.map((country) => ({ ...country }));
  }

  async getCatalogMetadata(): Promise<DocumentCoverageMetadata> {
    this.requireIndex();
    return { catalogVersion: this.catalog.catalogVersion, retrievedAt: this.catalog.retrievedAt };
  }

  private requireIndex(): Map<string, DocumentType[]> {
    if (!this.index) {
      throw new DocumentCoverageUnavailableException({ reason: 'catalog_integrity_check_failed' });
    }
    return this.index;
  }
}
