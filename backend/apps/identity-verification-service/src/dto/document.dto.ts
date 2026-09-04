import { IsEnum, IsNotEmpty, IsString, Length, IsOptional, IsDateString } from 'class-validator';
import { DocumentType, CaptureMethod } from '../entities/enums/identity-verification.enums';

export class SubmitDocumentDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  issuingCountry: string;

  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @IsDateString()
  expirationDate: string;

  @IsOptional()
  @IsString()
  issuingState?: string;

  @IsEnum(CaptureMethod)
  captureMethod: CaptureMethod;

  @IsString()
  @IsNotEmpty()
  documentImageReference: string;
}

export class DocumentResponseDto {
  id: string;
  profileId: string;
  documentType: DocumentType;
  issuingCountry: string;
  documentNumber: string;
  expirationDate: string;
  issuingState: string | null;
  captureMethod: CaptureMethod;
  verificationDepth: string | null;
  isDuplicateMatch: boolean;
  createdAt: Date;
}

export class DocumentHistoryResponseDto {
  documents: DocumentResponseDto[];
  totalCount: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
}
