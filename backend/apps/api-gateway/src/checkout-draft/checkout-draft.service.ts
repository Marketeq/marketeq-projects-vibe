import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// Checkout-service owns the summary; gateway just authenticates and forwards,
// reshaping the response into the shape the frontend already expects.
@Injectable()
export class CheckoutDraftGatewayService {
  private readonly logger = new Logger(CheckoutDraftGatewayService.name);
  private readonly checkoutUrl: string;
  private readonly internalServiceToken: string | undefined;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.checkoutUrl =
      config.get<string>('CHECKOUT_SERVICE_URL') || 'http://localhost:3009';
    this.internalServiceToken = config.get<string>('INTERNAL_SERVICE_TOKEN');
  }

  async getListingSummary(listingId: string, clientId: string) {
    const project = await this.fetchProject(listingId);

    const draft = await firstValueFrom(
      this.http.post(
        `${this.checkoutUrl}/v1/checkout/drafts/find-or-create-internal`,
        {
          clientId,
          listingId,
          phases: project.scope ?? [],
          projectCost: project.budget ?? null,
        },
        {
  async getListingSummary(listingId: string, _clientId: string) {
    let summary;
    try {
      summary = await firstValueFrom(
        this.http.get(`${this.checkoutUrl}/v1/checkout/listings/${listingId}/summary`, {
          headers: this.internalServiceToken
            ? { 'x-internal-token': this.internalServiceToken }
            : {},
        }),
      );
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        throw new NotFoundException('Listing not found');
      }
      this.logger.warn(`Failed to fetch checkout summary for ${listingId}: ${axiosErr.message}`);
      throw err;
    }
    const { listing, phases, projectCost } = summary.data;

    return {
      listing,
      draft: {
        id: null,
        listingId: listing.id,
        phases,
        projectCost,
        createdAt: null,
        updatedAt: null,
      },
    };
  }
}
