import { Injectable } from '@nestjs/common';

@Injectable()
export class ReviewsClient {
  async triggerReview(contractId: string, clientId: string, talentId: string) {
    // Emit event to Review Service: contract.ended
    // Review Service opens 90-day window
    return { contractId, reviewWindow: '90 days' };
  }
}
