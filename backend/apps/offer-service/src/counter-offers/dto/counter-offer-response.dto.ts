// apps/offer-service/src/counter-offers/dto/counter-offer-response.dto.ts
// OS-27: Response shape for POST (create CO) and PATCH (edit CO).
// rateWarning is advisory — never blocks submission.
import { CounterOffer } from '../entities/counter-offer.entity';

export class CounterOfferWithWarningResponse {
  /** The saved counter offer record. */
  counterOffer: CounterOffer;

  /**
   * Advisory rate warning flag.
   *
   * true:  CO rate deviates significantly from the offer rate.
   *        Talent CO: rate is >25% above the offer rate.
   *        Client CO: rate is >20% below the offer rate.
   *
   * false: Rate is within the expected range.
   *
   * This flag is ADVISORY. The counter offer was saved regardless.
   */
  rateWarning: boolean;
}