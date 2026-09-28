import { DocumentType } from '../../entities/enums/identity-verification.enums';

export class AcceptedDocumentsResponseDto {
  issuingCountry!: string;
  acceptedDocumentTypes!: DocumentType[];

  static from(issuingCountry: string, acceptedDocumentTypes: DocumentType[]): AcceptedDocumentsResponseDto {
    const dto = new AcceptedDocumentsResponseDto();
    dto.issuingCountry = issuingCountry;
    dto.acceptedDocumentTypes = acceptedDocumentTypes;
    return dto;
  }
}
