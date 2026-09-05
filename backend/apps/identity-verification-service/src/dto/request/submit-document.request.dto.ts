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

  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'issuingCountry must be a 2-letter uppercase ISO country code' })
  issuingCountry!: string;

  @IsString()
  @Length(1, 64)
  documentNumber!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expirationDate must be in YYYY-MM-DD format' })
  @IsNotPastDate()
  expirationDate!: string;

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
