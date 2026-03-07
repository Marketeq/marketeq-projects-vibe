import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckoutSession } from './entities/checkout-session.entity';
import { Wallet } from './entities/wallet.entity';
import { GiftCard } from './entities/gift-card.entity';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(CheckoutSession) private readonly sessionRepo: Repository<CheckoutSession>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(GiftCard) private readonly giftCardRepo: Repository<GiftCard>,
    private readonly stripeService: StripeService,
  ) {}

  async createSession(dto: {
    clientId: string;
    projectId?: string;
    contractId?: string;
    paymentMethod: string;
    installmentPlanOption?: string;
    splitPaymentEnabled?: boolean;
    initialPaymentAmount?: number;
    giftCardCode?: string;
    walletBalanceUsed?: number;
    totalAmount: number;
  }) {
    let amount = dto.totalAmount;
    let giftCardAmountUsed = 0;
    let walletAmountUsed = dto.walletBalanceUsed || 0;

    // Apply gift card
    if (dto.giftCardCode) {
      const giftCard = await this.giftCardRepo.findOne({
        where: { code: dto.giftCardCode, isActive: true },
      });
      if (!giftCard) throw new BadRequestException('Invalid or expired gift card');
      giftCardAmountUsed = Math.min(giftCard.remainingAmount, amount);
      amount -= giftCardAmountUsed;
    }

    // Apply wallet
    if (walletAmountUsed > 0) {
      const wallet = await this.walletRepo.findOne({ where: { userId: dto.clientId } });
      if (!wallet || wallet.balance < walletAmountUsed) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      amount -= walletAmountUsed;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const stripeSession = await this.stripeService.createCheckoutSession({
      clientId: dto.clientId,
      amount: Math.max(amount, 0),
      paymentMethod: dto.paymentMethod,
      projectId: dto.projectId,
      contractId: dto.contractId,
      successUrl: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/checkout/cancel`,
    });

    const session = this.sessionRepo.create({
      clientId: dto.clientId,
      projectId: dto.projectId,
      contractId: dto.contractId,
      stripeSessionId: stripeSession.id,
      paymentMethod: dto.paymentMethod as any,
      totalAmount: dto.totalAmount,
      walletAmountUsed,
      giftCardAmountUsed,
      giftCardCode: dto.giftCardCode,
      splitPaymentEnabled: dto.splitPaymentEnabled,
      initialPaymentAmount: dto.initialPaymentAmount,
      installmentPlan: (dto.installmentPlanOption as any) || 'full',
    });

    await this.sessionRepo.save(session);

    return { checkoutUrl: stripeSession.url };
  }

  async applyGiftCard(code: string) {
    const giftCard = await this.giftCardRepo.findOne({ where: { code, isActive: true } });
    if (!giftCard) return { valid: false, amount: 0 };
    return { valid: true, amount: giftCard.remainingAmount };
  }

  async useWallet(userId: string, amount: number) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet || wallet.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
    const remaining = wallet.balance - amount;
    await this.walletRepo.update(wallet.id, { balance: remaining });
    return { applied: true, remainingAmount: remaining };
  }

  async confirm(sessionId: string) {
    const stripeSession = await this.stripeService.retrieveSession(sessionId);
    const session = await this.sessionRepo.findOne({ where: { stripeSessionId: sessionId } });

    if (session && stripeSession.payment_status === 'paid') {
      await this.sessionRepo.update(session.id, { status: 'success', paymentVerified: true });
    }

    return { status: stripeSession.payment_status };
  }

  async cancel(sessionId: string) {
    await this.sessionRepo.update({ stripeSessionId: sessionId }, { status: 'cancelled' });
  }

  async getStatus(sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { stripeSessionId: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async handlePaymentSuccess(stripeSessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { stripeSessionId } });
    if (session) {
      await this.sessionRepo.update(session.id, { status: 'success', paymentVerified: true });
    }
  }

  async handlePaymentFailed(stripeSessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { stripeSessionId } });
    if (session) {
      await this.sessionRepo.update(session.id, { status: 'failed', paymentVerified: false });
    }
  }
}
