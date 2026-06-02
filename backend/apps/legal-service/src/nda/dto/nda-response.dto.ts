import { DocumentType } from '../enums/document-type.enum';

export class NdaResponseDto {
  id: string;
  documentType: DocumentType;
  /** 'generated' | 'signed' | 'voided' */
  status: string;
  jobListingId: string;
  clientDisplayName: string;
  listingTitle: string | null;
  /** Presigned R2 URL — generated fresh on every fetch, never stored client-side */
  pdfUrl: string | null;
  generatedAt: Date;
  voidedAt: Date | null;
}
