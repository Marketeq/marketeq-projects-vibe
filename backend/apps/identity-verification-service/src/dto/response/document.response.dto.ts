import {
  DocumentType,
  CaptureMethod,
  VerificationDepth,
} from '../../entities/enums/identity-verification.enums';
import { IdentityDocument } from '../../entities/identity-document.entity';

export class DocumentResponseDto {
  id!: string;
  documentType!: DocumentType;
  documentTypeLabel!: string | null;
  issuingCountry!: string;
  // Nullable — legitimately absent for captureMethod=scan until/unless
  // Didit's document-check extracts one (see SubmitDocumentRequestDto's
  // header comment).
  expirationDate!: string | null;
  issuingState!: string | null;
  captureMethod!: CaptureMethod;
  verificationDepth!: VerificationDepth | null;
  isDuplicateMatch!: boolean;
  createdAt!: Date;

  static fromEntity(document: IdentityDocument): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = document.id;
    dto.documentType = document.documentType;
    dto.documentTypeLabel = document.documentTypeLabel;
    dto.issuingCountry = document.issuingCountry;
    dto.expirationDate = document.expirationDate;
    dto.issuingState = document.issuingState;
    dto.captureMethod = document.captureMethod;
    dto.verificationDepth = document.verificationDepth;
    dto.isDuplicateMatch = document.isDuplicateMatch;
    dto.createdAt = document.createdAt;
    return dto;
  }
}
