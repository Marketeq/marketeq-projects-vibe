import { DocumentType } from '../../entities/enums/identity-verification.enums';
import { DocumentCoverageMetadata } from '../../providers/document-coverage/document-coverage-provider.interface';

export class AcceptedDocumentsResponseDto {
  issuingCountry!: string;
  acceptedDocumentTypes!: DocumentType[];
  // Additive version metadata: which coverage catalog produced this answer
  // and when its vendor source was captured. Existing clients that only read
  // acceptedDocumentTypes are unaffected.
  catalogVersion!: string;
  catalogRetrievedAt!: string;

  static from(
    issuingCountry: string,
    acceptedDocumentTypes: DocumentType[],
    metadata: DocumentCoverageMetadata,
  ): AcceptedDocumentsResponseDto {
    const dto = new AcceptedDocumentsResponseDto();
    dto.issuingCountry = issuingCountry;
    dto.acceptedDocumentTypes = acceptedDocumentTypes;
    dto.catalogVersion = metadata.catalogVersion;
    dto.catalogRetrievedAt = metadata.retrievedAt;
    return dto;
  }
}
