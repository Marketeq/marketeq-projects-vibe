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

  // Required when the user types it directly (captureMethod: manual_entry —
  // Doc 03 §8a/§6b's duplicate-detection fingerprint needs a real value at
  // submission time). Optional for captureMethod: scan: Didit's own
  // standalone document-check extracts documentNumber via OCR/MRZ from the
  // submitted images (DiditStandaloneIdVerificationProvider.checkDocument's
  // response), and TwoStageVerificationService.checkDocumentWithVendor backs
  // it into this row once that result comes back — never fabricated here.
  // If OCR/MRZ genuinely can't read it, it stays null; duplicate-detection
  // for that document is skipped rather than blocked on an invented value
  // (see that method's own header for the exact backfill-and-detect logic).
  @ValidateIf((o) => o.captureMethod !== CaptureMethod.SCAN || o.documentNumber !== undefined)
  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  documentNumber?: string;

  // Required for every document type except drivers_licence (Figma marks it
  // optional there), AND except captureMethod: scan — same reasoning as
  // documentNumber above: Didit extracts expiration_date from the images
  // when it's present on the document at all, and some ID cards genuinely
  // have no expiry, so this is never fabricated for the scan path either.
  // Whenever a value IS supplied (any path), it must still pass the same
  // format and not-past-date checks.
  @ValidateIf(
    (o) =>
      (o.documentType !== DocumentType.DRIVERS_LICENCE && o.captureMethod !== CaptureMethod.SCAN) ||
      o.expirationDate !== undefined,
  )
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

  // Optional — many document types have no back side. When supplied, the
  // standalone document check submits it alongside the front image.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  backImageReference?: string;
}
