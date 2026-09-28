import { Injectable } from '@nestjs/common';
import { DocumentType } from '../../entities/enums/identity-verification.enums';
import { DocumentCoverageUnavailableException } from '../../common/errors/domain-exceptions';
import { DocumentCoverageProvider } from './document-coverage-provider.interface';

/**
 * Bound as the DOCUMENT_COVERAGE_PROVIDER until a real, vendor-confirmed
 * data source is chosen (see the interface's doc comment for what was
 * checked and why nothing was wired in yet). This always reports coverage
 * as unavailable — honestly, via the same "can't determine yet" contract
 * every other unresolved upstream boundary in this service already uses
 * (compare LocationLookupUnavailableException,
 * ConnectionCheckUnavailableException) — rather than fabricating a
 * country/document list. Callers (the accepted-documents endpoint and
 * submitDocument's coverage check) surface this as a real error/retry
 * state, never as a silently-empty or silently-permissive list.
 */
@Injectable()
export class NotYetAvailableDocumentCoverageProvider implements DocumentCoverageProvider {
  async getAcceptedDocumentTypes(_issuingCountry: string): Promise<DocumentType[]> {
    throw new DocumentCoverageUnavailableException({ reason: 'coverage_source_not_configured' });
  }
}
