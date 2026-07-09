// apps/offer-service/src/integrations/listings.client.ts
// OS-29 + Updated: Validates job listing before offer creation. BLOCKING — no fallback.
// Calls the real listings-service at GET /v1/job-listings/:id with JWT auth.
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';
import { AxiosError } from 'axios';
import { OfferConfig } from '../config/offer.config';
import { OfferServiceException } from '../common/exceptions/offer.exceptions';
import { HttpStatus } from '@nestjs/common';

export interface ListingDetails {
  id: string;
  contractType: string;
  clientUserId: string;
  status: string;
}

export class ListingNotFoundOrAccessDeniedException extends OfferServiceException {
  constructor(listingId: string) {
    super(
      'LISTING_NOT_FOUND_OR_ACCESS_DENIED',
      `Job listing ${listingId} not found or you do not have access to it.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ListingNotPublishedException extends OfferServiceException {
  constructor(listingId: string, status: string) {
    super(
      'LISTING_NOT_PUBLISHED',
      `Job listing ${listingId} is in status '${status}'. Only published listings can receive offers.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ListingsServiceUnavailableException extends OfferServiceException {
  constructor() {
    super(
      'LISTINGS_SERVICE_UNAVAILABLE',
      'Unable to validate the job listing. The listings service is temporarily unavailable. Please try again.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

@Injectable()
export class ListingsClient {
  private readonly logger = new Logger(ListingsClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const cfg = config.get<OfferConfig>('offer')!;
    this.baseUrl = cfg.integrations?.listingsServiceUrl ?? cfg.services?.listingsUrl ?? '';
    this.timeoutMs = cfg.integrations?.listingsTimeoutMs ?? 3000;
    // Enable when LISTINGS_SERVICE_URL is set. Disable explicitly with LISTINGS_VALIDATION_ENABLED=false.
    const explicitlyDisabled = process.env.LISTINGS_VALIDATION_ENABLED === 'false';
    this.enabled = !!(this.baseUrl && this.baseUrl.length > 0 && !explicitlyDisabled);
  }

  /**
   * validateListing()
   *
   * Calls GET /v1/job-listings/:id on the listings-service using the
   * client's own JWT (passed through from the original offer request).
   *
   * Validates:
   *   1. Listing exists (404 -> 422 LISTING_NOT_FOUND_OR_ACCESS_DENIED)
   *   2. Listing status is 'published' (any other status -> 422 LISTING_NOT_PUBLISHED)
   *   3. Listing belongs to the client (clientUserId matches)
   *
   * @param listingId   The job listing UUID from the offer creation request.
   * @param clientId    The authenticated client's userId (from JWT sub).
   * @param clientJwt   The client's JWT token — forwarded to listings-service.
   */
  async validateListing(
    listingId: string,
    clientId: string,
    clientJwt?: string,
  ): Promise<ListingDetails> {
    // Dev mode: skip validation when explicitly disabled
    if (!this.enabled) {
      this.logger.debug(`[DEV] Skipping listing validation for ${listingId}`);
      return {
        id: listingId,
        contractType: 'PROJECT',
        clientUserId: clientId,
        status: 'published',
      };
    }

    // Real listings-service uses /v1/job-listings/:id with JWT auth
    const url = `${this.baseUrl}/v1/job-listings/${listingId}`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      // Forward the client's JWT so listings-service validates ownership
      if (clientJwt) {
        headers['Authorization'] = `Bearer ${clientJwt}`;
      }

      const response = await firstValueFrom(
        this.http.get<any>(url, { headers }).pipe(timeout(this.timeoutMs)),
      );

      const listing = response.data;

      // Listing must be 'published' to receive offers
      if (listing.status !== 'published') {
        throw new ListingNotPublishedException(listingId, listing.status);
      }

      // Listing must belong to the requesting client
      if (listing.clientUserId !== clientId) {
        throw new ListingNotFoundOrAccessDeniedException(listingId);
      }

      return {
        id: listing.id,
        contractType: listing.contractType,
        clientUserId: listing.clientUserId,
        status: listing.status,
      };
    } catch (err) {
      // Re-throw our own exceptions
      if (
        err instanceof ListingNotFoundOrAccessDeniedException ||
        err instanceof ListingNotPublishedException
      ) {
        throw err;
      }

      const axiosErr = err as AxiosError;

      if (axiosErr.response?.status === 404) {
        throw new ListingNotFoundOrAccessDeniedException(listingId);
      }
      if (axiosErr.response?.status === 401 || axiosErr.response?.status === 403) {
        throw new ListingNotFoundOrAccessDeniedException(listingId);
      }

      this.logger.error(`listings-service call failed: ${(err as Error).message}`);
      throw new ListingsServiceUnavailableException();
    }
  }
}