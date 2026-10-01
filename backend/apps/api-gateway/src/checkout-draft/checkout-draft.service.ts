import { HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  private headers(clientId: string) {
    return {
      'x-client-id': clientId,
      ...(this.internalServiceToken
        ? { 'x-internal-token': this.internalServiceToken }
        : {}),
    };
  }

  async createDraft(listingId: string, clientId: string) {
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.checkoutUrl}/v1/checkout/listings/${listingId}/draft`,
          null,
          { headers: this.headers(clientId) },
        ),
      );
      return response.data;
    } catch (err) {
      this.rethrowDraftError(err, `create checkout draft for ${listingId}`);
    }
  }

  async getDraft(listingId: string, clientId: string) {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `${this.checkoutUrl}/v1/checkout/listings/${listingId}/draft`,
          { headers: this.headers(clientId) },
        ),
      );
      return response.data;
    } catch (err) {
      this.rethrowDraftError(err, `get checkout draft for ${listingId}`);
    }
  }

  async getDraftScope(draftId: string, clientId: string) {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `${this.checkoutUrl}/v1/checkout/drafts/${draftId}/scope`,
          { headers: this.headers(clientId) },
        ),
      );
      return response.data;
    } catch (err) {
      this.rethrowDraftError(err, `get checkout draft scope for ${draftId}`);
    }
  }

  async getDraftTeam(draftId: string, clientId: string) {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `${this.checkoutUrl}/v1/checkout/drafts/${draftId}/team`,
          { headers: this.headers(clientId) },
        ),
      );
      return response.data;
    } catch (err) {
      this.rethrowDraftError(err, `get checkout draft team for ${draftId}`);
    }
  }

  private rethrowDraftError(err: unknown, action: string): never {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (status === 400 || status === 404 || status === 409) {
      throw new HttpException(axiosErr.response!.data as object, status);
    }
    this.logger.warn(`Failed to ${action}: ${axiosErr.message}`);
    throw err;
  }

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
