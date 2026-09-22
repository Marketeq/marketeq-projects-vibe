import {
  IsEnum,
  IsString,
  Length,
  Matches,
  IsOptional,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { IsNotPastDate } from '../../common/validators/is-not-past-date.validator';
import { DocumentType, CaptureMethod } from '../../entities/enums/identity-verification.enums';

export class SubmitDocumentRequestDto {
  @IsEnum(DocumentType, {
    message: 'documentType must be one of: passport, id_card, drivers_licence, residence_permit',
  })
  documentType!: DocumentType;

  // Display-only, never used for gate/business logic (TRVG2 §1.4).
  // documentType above remains the canonical, vendor-aligned value.
  @IsOptional()
  @IsString()
  @Length(1, 100)
  documentTypeLabel?: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'issuingCountry must be a 2-letter uppercase ISO country code' })
  issuingCountry!: string;

  @IsString()
  @Length(1, 64)
  documentNumber!: string;

  // Required for every document type except drivers_licence, where Figma marks
  // it optional. When supplied for a drivers_licence too, it must still pass
  // the same format and not-past-date checks as every other document type.
  @ValidateIf((o) => o.documentType !== DocumentType.DRIVERS_LICENCE || o.expirationDate !== undefined)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expirationDate must be in YYYY-MM-DD format' })
  @IsNotPastDate()
  expirationDate?: string;

  @ValidateIf((o) => o.documentType === DocumentType.DRIVERS_LICENCE)
  @IsString()
  @IsNotEmpty({ message: 'issuingState is required when documentType is drivers_licence' })
  @ValidateIf((o) => o.documentType !== DocumentType.DRIVERS_LICENCE)
  @IsOptional()
  issuingState?: string;

  @IsEnum(CaptureMethod, { message: 'captureMethod must be one of: scan, manual_entry' })
  captureMethod!: CaptureMethod;

  @IsString()
  @IsNotEmpty()
  documentImageReference!: string;
}
