import { Injectable } from '@nestjs/common';
import { VendorUnavailableException } from '../../common/errors/domain-exceptions';
import {
  DocumentVerificationProvider,
  StartVerificationSessionInput,
  StartVerificationSessionResult,
} from './document-verification-provider.interface';

@Injectable()
export class DiditDocumentVerificationProvider implements DocumentVerificationProvider {
  private readonly baseUrl = process.env.DIDIT_API_BASE_URL;
  private readonly apiKey = process.env.DIDIT_API_KEY;

  async startVerificationSession(
    input: StartVerificationSessionInput,
  ): Promise<StartVerificationSessionResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          document_id: input.documentId,
          document_type: input.documentType,
          issuing_country: input.issuingCountry,
          document_image_reference: input.documentImageReference,
        }),
      });
    } catch {
      throw new VendorUnavailableException();
    }

    if (!response.ok) {
      throw new VendorUnavailableException({ vendorStatus: response.status });
    }

    const body = (await response.json()) as { session_id: string; session_url: string };
    if (!body.session_id || !body.session_url) {
      throw new VendorUnavailableException({ reason: 'malformed_vendor_response' });
    }
    return { vendorSessionId: body.session_id, vendorSessionUrl: body.session_url };
  }
}
