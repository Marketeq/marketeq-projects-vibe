import { IsUUID } from 'class-validator';

/**
 * An already-active traveler confirming Travel Mode (Update > Temporarily traveling).
 * `confirmationId` is chosen by the client once per click and reused if the request is
 * retried: it is the occurrence of the persistent "Travel Mode is on" alert, so a retry is
 * stored once and a new click is a new alert.
 */
export class TravelModeConfirmationRequestDto {
  @IsUUID('4', { message: 'confirmationId must be a UUID' })
  confirmationId!: string;
}
