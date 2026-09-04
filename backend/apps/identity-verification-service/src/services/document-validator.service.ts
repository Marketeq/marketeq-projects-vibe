import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DocumentType } from '../entities/enums/identity-verification.enums';

interface FieldRequirement {
  field: string;
  required: boolean;
  pattern?: RegExp;
}

interface CountryDocumentRules {
  [key: string]: FieldRequirement[];
}

@Injectable()
export class DocumentValidatorService {
  private readonly logger = new Logger(DocumentValidatorService.name);

  private readonly documentTypeRequirements: CountryDocumentRules = {
    US: [
      { field: 'documentNumber', required: true, pattern: /^[A-Z0-9]{5,9}$/ },
      { field: 'expirationDate', required: true },
      { field: 'issuingState', required: true },
    ],
    GB: [
      { field: 'documentNumber', required: true, pattern: /^[A-Z]{2}\d{6}[A-Z]{3}\d[A-Z0-9]{2}$/ },
      { field: 'expirationDate', required: true },
    ],
    CA: [
      { field: 'documentNumber', required: true },
      { field: 'expirationDate', required: true },
    ],
    DEFAULT: [
      { field: 'documentNumber', required: true },
      { field: 'expirationDate', required: true },
    ],
  };

  validateDocumentData(
    documentType: DocumentType,
    issuingCountry: string,
    documentNumber: string,
    expirationDate: string,
    issuingState?: string,
  ): void {
    if (!documentNumber || documentNumber.trim().length === 0) {
      throw new BadRequestException('Document number is required');
    }

    if (!expirationDate) {
      throw new BadRequestException('Expiration date is required');
    }

    const expDate = new Date(expirationDate);
    if (expDate < new Date()) {
      throw new BadRequestException('Document has expired');
    }

    if (documentType === DocumentType.DRIVERS_LICENCE && !issuingState) {
      throw new BadRequestException('Issuing state is required for driver licenses');
    }

    const rules = this.documentTypeRequirements[issuingCountry] || this.documentTypeRequirements.DEFAULT;

    for (const rule of rules) {
      if (rule.field === 'documentNumber' && rule.pattern) {
        if (!rule.pattern.test(documentNumber)) {
          this.logger.warn(
            `Document number format mismatch for ${issuingCountry}: ${documentNumber}`,
          );
        }
      }
    }

    this.logger.log(
      `Document validated: ${documentType} from ${issuingCountry} (${documentNumber})`,
    );
  }

  getRequiredFields(documentType: DocumentType, issuingCountry: string): string[] {
    const rules = this.documentTypeRequirements[issuingCountry] || this.documentTypeRequirements.DEFAULT;
    return rules.filter((r) => r.required).map((r) => r.field);
  }

  isDocumentExpired(expirationDate: string): boolean {
    return new Date(expirationDate) < new Date();
  }

  normalizeDocumentNumber(documentNumber: string): string {
    return documentNumber.trim().toUpperCase();
  }
}
