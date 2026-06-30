// apps/offer-service/src/realtime/ably.service.ts
// OS-23: Ably real-time integration — publish() + createToken() + isReady()
// Uses Ably.Rest (HTTP-only, no persistent WebSocket). Server-side only.
// Ably publish is BEST-EFFORT — failures never fail the API response.
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Ably from 'ably';
import { OfferConfig } from '../config/offer.config';
import { ABLY_CHANNEL_PREFIX } from '../messaging/constants/rabbitmq.constants';
import { Offer } from '../offers/entities/offer.entity';
import { CounterOffer } from '../counter-offers/entities/counter-offer.entity';

/**
 * Payload pushed to the frontend on every offer.updated event.
 * Always contains the full current offer state.
 */
export interface AblyOfferUpdatedPayload {
  offer: Record<string, unknown>;
  counterOffer: Record<string, unknown> | null;
  rateWarning: boolean;
  updatedAt: string; // ISO 8601 UTC
}

/**
 * Ably token response returned to the frontend.
 */
export interface AblyTokenDetails {
  token: string;
  expires: number;  // Unix timestamp (ms)
  issued: number;   // Unix timestamp (ms)
  capability: string; // JSON string of channel permissions
}

@Injectable()
export class AblyService {
  private readonly logger = new Logger(AblyService.name);
  private readonly client: Ably.Rest | null;
  private readonly tokenTtlSeconds: number;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const cfg = config.get<OfferConfig>('offer')!;
    const apiKey = cfg.ably.apiKey;
    this.enabled = !!(apiKey && apiKey.length > 0);
    this.tokenTtlSeconds = cfg.ably.tokenTtlSeconds ?? 3600;

    if (this.enabled) {
      // Note: Do NOT set environment unless using an Ably enterprise/custom deployment.
      // The default (no environment) connects to rest.ably.io which is correct for
      // standard Ably accounts. Setting environment: 'production' causes Ably to use
      // production.rest.ably.io which may not resolve in all network environments.
      const ablyOpts: Ably.ClientOptions = { key: apiKey };
      const env = cfg.ably.environment;
      if (env && env !== 'production') {
        ablyOpts.environment = env;
      }
      this.client = new Ably.Rest(ablyOpts);
      this.logger.log('Ably REST client initialized');
    } else {
      this.client = null;
      this.logger.warn('ABLY_API_KEY not set — real-time events disabled (dev mode)');
    }
  }

  // ============================================================
  // publish() — Push offer.updated to the offer channel
  // ============================================================
  /**
   * Publish an offer.updated event to the offer channel.
   *
   * Called OUTSIDE the database transaction (fire-and-forget).
   * Ably publish failure does NOT affect the API response.
   *
   * @param offerId        The offer ID — determines the channel name
   * @param offer          The current Offer entity after the state change
   * @param counterOffer   The current active CounterOffer (if any)
   * @param rateWarning    Whether the current CO rate triggers the warning
   */
  async publish(
    offerId: string,
    offer: Offer,
    counterOffer: CounterOffer | null,
    rateWarning = false,
  ): Promise<void> {
    const channelName = `${ABLY_CHANNEL_PREFIX}${offerId}`;

    const payload: AblyOfferUpdatedPayload = {
      offer: this.serializeOffer(offer),
      counterOffer: counterOffer ? this.serializeCounterOffer(counterOffer) : null,
      rateWarning,
      updatedAt: new Date().toISOString(),
    };

    if (!this.enabled || !this.client) {
      this.logger.debug(`[STUB] Ably publish → ${channelName}:offer.updated`);
      return;
    }

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish('offer.updated', payload);
      this.logger.debug(`Ably published offer.updated to ${channelName}`);
    } catch (err) {
      // Log but do NOT throw. Ably failure never fails the API request.
      this.logger.error(
        `Ably publish failed for channel ${channelName}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ============================================================
  // createToken() — Generate a scoped frontend token
  // ============================================================
  /**
   * Generate a short-lived Ably token for a specific offer channel.
   *
   * The token grants:
   *   - Subscribe permission on offer:{offerId} only
   *   - No publish permission (read-only)
   *   - No access to any other channel
   *
   * @param offerId  The offer ID. Scopes the token to offer:{offerId}.
   * @param userId   The requesting user ID. Embedded in the token clientId.
   * @returns        The token string and its metadata.
   */
  async createToken(
    offerId: string,
    userId: string,
  ): Promise<AblyTokenDetails> {
    if (!this.enabled || !this.client) {
      // Dev mode: return a fake token so the endpoint shape is testable
      const now = Date.now();
      const channelName = `${ABLY_CHANNEL_PREFIX}${offerId}`;
      return {
        token: `dev-token-${offerId}-${userId}`,
        expires: now + this.tokenTtlSeconds * 1000,
        issued: now,
        capability: JSON.stringify({ [channelName]: ['subscribe'] }),
      };
    }

    const channelName = `${ABLY_CHANNEL_PREFIX}${offerId}`;

    try {
      // Ably v2 SDK: requestToken returns a Promise (no callback)
      const tokenDetails = await this.client.auth.requestToken({
        clientId: userId,
        capability: JSON.stringify({
          [channelName]: ['subscribe'],
        }),
        ttl: this.tokenTtlSeconds * 1000,
      });

      return {
        token: tokenDetails.token,
        expires: tokenDetails.expires ?? Date.now() + this.tokenTtlSeconds * 1000,
        issued: tokenDetails.issued ?? Date.now(),
        capability: JSON.stringify({ [channelName]: ['subscribe'] }),
      };
    } catch (err) {
      this.logger.error(
        `Ably token generation failed for offer ${offerId}:`,
        err instanceof Error ? err.message : String(err),
      );
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'ABLY_UNAVAILABLE',
        message: 'Real-time token generation is temporarily unavailable. Please try again.',
      });
    }
  }

  // ============================================================
  // isReady() — Used by /ready health check
  // ============================================================
  /**
   * Verify the Ably client can reach the Ably service.
   * Called by HealthController for the /ready endpoint.
   */
  async isReady(): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }
    try {
      await this.client.time();
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // isEnabled() — Check if Ably is configured
  // ============================================================
  isEnabled(): boolean {
    return this.enabled;
  }

  // ============================================================
  // Private serializers
  // ============================================================

  private serializeOffer(offer: Offer): Record<string, unknown> {
    return {
      id: offer.id,
      clientId: offer.clientId,
      talentId: offer.talentId,
      jobListingId: offer.jobListingId,
      contractType: offer.contractType,
      contractTitle: offer.contractTitle,
      status: offer.status,
      rate: offer.rate,
      currencyCode: offer.currencyCode,
      durationMonths: offer.durationMonths,
      workSchedule: offer.workSchedule,
      startDate: offer.startDate,
      message: offer.message,
      expiresAt: offer.expiresAt instanceof Date ? offer.expiresAt.toISOString() : offer.expiresAt,
      acceptedAt: offer.acceptedAt instanceof Date ? offer.acceptedAt.toISOString() : offer.acceptedAt ?? null,
      declinedAt: offer.declinedAt instanceof Date ? offer.declinedAt.toISOString() : offer.declinedAt ?? null,
      withdrawnAt: offer.withdrawnAt instanceof Date ? offer.withdrawnAt.toISOString() : offer.withdrawnAt ?? null,
      expiredAt: offer.expiredAt instanceof Date ? offer.expiredAt.toISOString() : offer.expiredAt ?? null,
      createdAt: offer.createdAt instanceof Date ? offer.createdAt.toISOString() : offer.createdAt,
      updatedAt: offer.updatedAt instanceof Date ? offer.updatedAt.toISOString() : offer.updatedAt,
    };
  }

  private serializeCounterOffer(co: CounterOffer): Record<string, unknown> {
    return {
      id: co.id,
      offerId: co.offerId,
      submittedBy: co.submittedBy,
      submittedById: co.submittedById,
      status: co.status,
      rate: co.rate,
      currencyCode: co.currencyCode,
      durationMonths: co.durationMonths,
      workSchedule: co.workSchedule,
      startDate: co.startDate,
      message: co.message,
      expiresAt: co.expiresAt instanceof Date ? co.expiresAt.toISOString() : co.expiresAt,
      acceptedAt: co.acceptedAt instanceof Date ? co.acceptedAt.toISOString() : co.acceptedAt ?? null,
      declinedAt: co.declinedAt instanceof Date ? co.declinedAt.toISOString() : co.declinedAt ?? null,
      withdrawnAt: co.withdrawnAt instanceof Date ? co.withdrawnAt.toISOString() : co.withdrawnAt ?? null,
      expiredAt: co.expiredAt instanceof Date ? co.expiredAt.toISOString() : co.expiredAt ?? null,
      supersededAt: co.supersededAt instanceof Date ? co.supersededAt.toISOString() : co.supersededAt ?? null,
      createdAt: co.createdAt instanceof Date ? co.createdAt.toISOString() : co.createdAt,
      updatedAt: co.updatedAt instanceof Date ? co.updatedAt.toISOString() : co.updatedAt,
    };
  }
}