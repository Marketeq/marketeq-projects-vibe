import { DocumentType } from '../../entities/enums/identity-verification.enums';

/**
 * DocumentCoverageProvider boundary. This exists to answer one question:
 * for a given issuing country, which of our canonical DocumentType values
 * does the verification vendor (Didit) actually accept?
 *
 * Verified 2026-09-24: Didit publishes no supported, versioned API for this
 * (its OpenAPI spec has no coverage endpoint, and POST /v3/id-verification/
 * classifies the document from the image rather than taking a country/type).
 * Its only supported publication is the public "Supported ID Documents"
 * page. The bound implementation (CatalogDocumentCoverageProvider) therefore
 * serves a reviewed, versioned snapshot of that page committed to this
 * service — it never calls Didit, scrapes, or uses Didit's undocumented
 * internal endpoints at runtime.
 *
 * Callers depend on this interface, not on the snapshot, so a database- or
 * vendor-backed source could replace it without any caller changing.
 */
export interface DocumentCoverageMetadata {
  catalogVersion: string;
  // Date the vendor page was captured (YYYY-MM-DD).
  retrievedAt: string;
}

export interface DocumentCoverageProvider {
  /**
   * Resolves to the subset of our DocumentType values accepted for
   * issuingCountry (ISO 3166-1 alpha-2). An empty array is a legitimate,
   * real answer ("the vendor accepts nothing we support for this country,
   * or does not list it") — never conflate it with "coverage couldn't be
   * determined," which must throw instead (see
   * DocumentCoverageUnavailableException) so callers never treat an unknown
   * answer as a known empty one.
   */
  getAcceptedDocumentTypes(issuingCountry: string): Promise<DocumentType[]>;

  /** Version metadata of the catalog that answers getAcceptedDocumentTypes. */
  getCatalogMetadata(): Promise<DocumentCoverageMetadata>;
}

export const DOCUMENT_COVERAGE_PROVIDER = Symbol('DOCUMENT_COVERAGE_PROVIDER');
