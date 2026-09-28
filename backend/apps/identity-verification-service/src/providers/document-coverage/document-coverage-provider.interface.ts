import { DocumentType } from '../../entities/enums/identity-verification.enums';

/**
 * DocumentCoverageProvider boundary. This exists to answer one question:
 * for a given issuing country, which of our canonical DocumentType values
 * does the verification vendor (Didit) actually accept?
 *
 * Verified 2026-09-24: Didit publishes no supported, versioned API for this.
 * Its public OpenAPI spec (docs.didit.me/openapi-25.json, 149 paths) has no
 * endpoint for country/document coverage, and its real standalone
 * verification endpoint (POST /v3/id-verification/) does not even accept
 * country or document type as input — it classifies the document from the
 * image automatically. The only place this data lives today is an
 * unauthenticated, unversioned endpoint
 * (verification.didit.me/v1/organization/documents-allowed-by-country) that
 * is absent from Didit's OpenAPI spec and undocumented anywhere on
 * docs.didit.me — the same internal endpoint Didit's own Business Console
 * reads from, not a published third-party contract.
 *
 * This service depends on this interface, not a concrete vendor call, so a
 * real implementation can be wired in later (once Didit confirms a
 * supported contract, per the open vendor question already tracked in the
 * Identity Verification Decision Record §7.1) without any caller of
 * getAcceptedDocumentTypes changing.
 */
export interface DocumentCoverageProvider {
  /**
   * Resolves to the subset of our DocumentType values accepted for
   * issuingCountry. An empty array is a legitimate, real answer ("the
   * vendor accepts nothing we support for this country") — never conflate
   * it with "coverage couldn't be determined," which must throw instead
   * (see DocumentCoverageUnavailableException) so callers never treat an
   * unknown answer as a known empty one.
   */
  getAcceptedDocumentTypes(issuingCountry: string): Promise<DocumentType[]>;
}

export const DOCUMENT_COVERAGE_PROVIDER = Symbol('DOCUMENT_COVERAGE_PROVIDER');
