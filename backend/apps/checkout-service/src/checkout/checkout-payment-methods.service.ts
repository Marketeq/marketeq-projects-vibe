import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CheckoutDraftSessionService } from './checkout-draft-session.service';
import { resolvePaymentMethods } from './payment-method-rules';

const toCents = (dollars: number) => Math.round(dollars * 100);

@Injectable()
export class CheckoutPaymentMethodsService {
  constructor(
    private readonly sessionService: CheckoutDraftSessionService,
  ) {}

  async getPaymentMethods(
    clientId: string,
    sessionId: string,
    balanceApplied?: string,
  ) {
    const balanceCents = this.parseBalanceCents(balanceApplied);
    const session = await this.sessionService.getSession(clientId, sessionId);

    if (session.status === 'success') {
      throw new ConflictException({
        code: 'SESSION_ALREADY_PAID',
        message: 'This checkout has already been paid',
      });
    }
    if (session.status !== 'pending') {
      throw new ConflictException({
        code: 'SESSION_NOT_ACTIVE',
        message: 'This checkout session is no longer active',
      });
    }

    const giftCardCents = session.appliedGiftCards.reduce(
      (sum, card) => sum + toCents(card.amountUsed),
      0,
    );
    const promoCents = toCents(session.promo?.amount ?? 0);
    const amountDueCents = Math.max(
      0,
      toCents(session.projectCost) - promoCents - giftCardCents - balanceCents,
    );

    return {
      sessionId: session.sessionId,
      amountDue: amountDueCents / 100,
      ...resolvePaymentMethods(amountDueCents),
    };
  }

  private parseBalanceCents(balanceApplied?: string): number {
    if (balanceApplied === undefined || balanceApplied === '') return 0;
    const dollars = Number(balanceApplied);
    if (!Number.isFinite(dollars) || dollars < 0) {
      throw new BadRequestException(
        'balanceApplied must be a number that is 0 or more',
      );
    }
    return toCents(dollars);
  }
}
