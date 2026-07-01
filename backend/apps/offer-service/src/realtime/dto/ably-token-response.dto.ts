// apps/offer-service/src/realtime/dto/ably-token-response.dto.ts
// OS-23: Response shape for GET /v1/offers/:id/ably-token
 
/**
 * Response returned by the Ably token endpoint.
 *
 * The frontend uses the `token` field to initialize the Ably Realtime client:
 *   new Ably.Realtime({ token: response.token })
 *
 * The `capability` field shows which channel(s) the token grants access to.
 * Format: { "offer:{offerId}": ["subscribe"] }
 */
export class AblyTokenResponseDto {
  /** Short-lived Ably token string for the frontend SDK */
  token: string;
 
  /** Unix timestamp (ms) when the token expires */
  expires: number;
 
  /** Unix timestamp (ms) when the token was issued */
  issued: number;
 
  /** JSON string describing channel permissions — e.g. {"offer:uuid":["subscribe"]} */
  capability: string;
}