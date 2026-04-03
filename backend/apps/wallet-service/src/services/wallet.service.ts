import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GiftCard } from '../entities/giftcard.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { UserWallet } from '../entities/user-wallet.entity';
import { ApplyGiftCardDto } from '../dto/apply-giftcard.dto';
import { WalletTopUpDto } from '../dto/wallet-topup.dto';
import { stripe } from '../utils/stripe-client';
import Stripe from 'stripe'; 

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(GiftCard)
    private readonly giftCardRepo: Repository<GiftCard>,

    @InjectRepository(WalletTransaction)
    private readonly walletTxnRepo: Repository<WalletTransaction>,

    @InjectRepository(UserWallet)
    private readonly walletRepo: Repository<UserWallet>
  ) {}

  async applyGiftCard(dto: ApplyGiftCardDto) {
    const baseAmount = 1000; // Replace with real contract or listing amount check

    const card = await this.giftCardRepo.findOne({
      where: { code: dto.code, redeemed: false },
    });

    if (!card) throw new NotFoundException('Invalid or already redeemed');

    if (card.amount < baseAmount) {
      throw new NotFoundException('Gift card amount is less than required');
    }

    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new NotFoundException('Gift card has expired');
    }

    // Redeem gift card
    card.redeemed = true;
    card.redeemedBy = dto.userId;
    card.redeemedAt = new Date();
    await this.giftCardRepo.save(card);

    // Log wallet transaction
    await this.walletTxnRepo.save({
      userId: dto.userId,
      amount: card.amount,
      type: 'giftcard',
      status: 'completed',
    });

    // Increase user wallet balance
    await this.increaseWallet(dto.userId, card.amount);

    return { success: true, amount: card.amount };
  }

  async createWalletTopUpIntent(dto: WalletTopUpDto) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(dto.amount * 100),
      currency: 'usd',
      metadata: {
        type: 'wallet_topup',
        userId: dto.userId,
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  }

  async confirmWalletTopUp(stripeEvent: any) {
    if (
      stripeEvent.metadata?.type !== 'wallet_topup' ||
      !stripeEvent.metadata.userId
    ) {
      throw new Error('Invalid or missing wallet metadata');
    }

    const userId = stripeEvent.metadata.userId;
    const amount = stripeEvent.amount / 100;

    await this.walletTxnRepo.save({
      userId,
      amount,
      type: 'topup',
      status: 'completed',
    });

    await this.increaseWallet(userId, amount);
  }

  async deductFromWallet(userId: string, amountToDeduct: number, baseAmount = 1000) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    const available = Number(wallet?.balance ?? 0);

    if (amountToDeduct > available) {
      return { applied: false, available, remainingAmount: null };
    }

    // Record payment transaction
    await this.walletTxnRepo.save({
      userId,
      amount: amountToDeduct,
      type: 'payment',
      status: 'completed',
    });

    await this.decreaseWallet(userId, amountToDeduct);

    return {
      applied: true,
      available,
      remainingAmount: Math.max(0, baseAmount - amountToDeduct),
    };
  }

  async useWalletBalance(body: { userId: string; walletBalanceUsed: number }) {
    const { userId, walletBalanceUsed } = body;
    return this.deductFromWallet(userId, walletBalanceUsed);
  }

  private async increaseWallet(userId: string, amount: number) {
    let wallet = await this.walletRepo.findOne({ where: { userId } });

    if (!wallet) {
      wallet = this.walletRepo.create({ userId, balance: 0 });
    }

    wallet.balance = Number(wallet.balance) + Number(amount);
    await this.walletRepo.save(wallet);
  }

  private async decreaseWallet(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });

    if (!wallet || Number(wallet.balance) < amount) {
      return false;
    }

    wallet.balance = Number(wallet.balance) - Number(amount);
    await this.walletRepo.save(wallet);

    return true;
  }

  async getBalance(userId: string): Promise<number> {
  const wallet = await this.walletRepo.findOne({ where: { userId } });
  return Number(wallet?.balance ?? 0);
}

async handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;

      if (intent.metadata?.type === 'wallet_topup') {
        await this.confirmWalletTopUp(intent);
      }

      break;
    }

    // Add more types here in the future
    // case 'charge.refunded':
    // case 'payment_intent.canceled':

    default:
      this.logger.warn(`Received unsupported Stripe event: ${event.type}`);
      break;
  }
}
}
