import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingClient {
  async finalizeContract(contractId: string) {
    // Call Billing Service API to finalize invoices & credits
    // Example: POST /billing/contracts/:id/finalize
    return { contractId, finalInvoice: 'INV-123', credit: 50.0 };
  }
}
