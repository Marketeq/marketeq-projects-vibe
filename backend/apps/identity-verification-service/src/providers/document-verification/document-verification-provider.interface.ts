import { DocumentType } from '../../entities/enums/identity-verification.enums';

export interface StartVerificationSessionInput {
  documentId: string;
  documentType: DocumentType;
  issuingCountry: string;
  documentImageReference: string;
}

export interface StartVerificationSessionResult {
  vendorSessionId: string;
  vendorSessionUrl: string;
}

export interface DocumentVerificationProvider {
  startVerificationSession(
    input: StartVerificationSessionInput,
  ): Promise<StartVerificationSessionResult>;
}

export const DOCUMENT_VERIFICATION_PROVIDER = Symbol('DOCUMENT_VERIFICATION_PROVIDER');
