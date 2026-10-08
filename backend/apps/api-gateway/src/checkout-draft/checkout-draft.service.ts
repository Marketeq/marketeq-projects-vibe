import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// Composes listings-service (scope source of truth) and checkout-service
// (draft owner) into one bootstrap response for the checkout page. This is
// gateway-level composition, not a microservice-to-microservice call — see
// homepage.service.ts for the established precedent of this pattern.
@Injectable()
export class CheckoutDraftGatewayService {
  private readonly logger = new Logger(CheckoutDraftGatewayService.name);
  private readonly listingsUrl: string;
  private readonly checkoutUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.listingsUrl =
      config.get<string>('LISTINGS_SERVICE_URL') || 'http://localhost:3004';
    this.checkoutUrl =
      config.get<string>('CHECKOUT_SERVICE_URL') || 'http://localhost:3009';
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
      ),
    );

    return {
      listing: {
        id: project.id,
        title: project.title,
      },
      draft: draft.data,
    };
  }

  private async fetchProject(listingId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.listingsUrl}/v1/projects/${listingId}`),
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        throw new NotFoundException('Listing not found');
      }
      this.logger.warn(`Failed to fetch project ${listingId}: ${axiosErr.message}`);
      throw err;
    }
  }
}
