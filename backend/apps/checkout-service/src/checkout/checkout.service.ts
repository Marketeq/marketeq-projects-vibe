import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Optional } from '@nestjs/common';
import { CheckoutSession } from './entities/checkout-session.entity';
import { Wallet } from './entities/wallet.entity';
import { GiftCard } from './entities/gift-card.entity';
import { InstallmentPayment } from './entities/installment-payment.entity';
import { SavedBankAccount } from './entities/saved-bank-account.entity';
import { WireTransfer } from './entities/wire-transfer.entity';
import { StripeMetadata } from './entities/stripe-metadata.entity';
import { PaymentFailure } from './entities/payment-failure.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { StripeService } from '../stripe/stripe.service';
import { createHash, randomBytes } from 'crypto';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toStableUuid = (value: string) => {
  if (UUID_PATTERN.test(value)) return value;

  const hash = createHash('sha256').update(value).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
};

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @InjectRepository(CheckoutSession) private readonly sessionRepo: Repository<CheckoutSession>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(GiftCard) private readonly giftCardRepo: Repository<GiftCard>,
    @InjectRepository(InstallmentPayment) private readonly installmentRepo: Repository<InstallmentPayment>,
    @InjectRepository(SavedBankAccount) private readonly bankAccountRepo: Repository<SavedBankAccount>,
    @InjectRepository(WireTransfer) private readonly wireTransferRepo: Repository<WireTransfer>,
    @InjectRepository(StripeMetadata) private readonly stripeMetadataRepo: Repository<StripeMetadata>,
    @InjectRepository(PaymentFailure) private readonly paymentFailureRepo: Repository<PaymentFailure>,
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepo: Repository<WalletTransaction>,
    private readonly stripeService: StripeService,
    private readonly dataSource: DataSource,
    @Optional() @Inject('RABBITMQ_CLIENT') private readonly rabbitClient: ClientProxy | null,
  ) {}

  // ─── Existing Methods ───────────────────────────────────────────────

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
    const walletAmountUsed = dto.walletBalanceUsed || 0;

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

  async confirm(sessionId: string, clientId?: string) {
    const stripeSession = await this.stripeService.retrieveSession(sessionId);
    const session = await this.sessionRepo.findOne({ where: { stripeSessionId: sessionId } });

    if (clientId && session && session.clientId !== clientId) {
      throw new BadRequestException('Checkout session does not belong to this user');
    }

    if (session && stripeSession.payment_status === 'paid') {
      await this.sessionRepo.update(session.id, { status: 'success', paymentVerified: true });
    }

    return { status: stripeSession.payment_status };
  }

  async cancel(sessionId: string) {
    await this.sessionRepo.update({ stripeSessionId: sessionId }, { status: 'cancelled' });
  }

  async getStatus(sessionId: string, clientId?: string) {
    const session = await this.sessionRepo.findOne({ where: { stripeSessionId: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (clientId && session.clientId !== clientId) {
      throw new BadRequestException('Checkout session does not belong to this user');
    }
    return session;
  }

  async createCardPaymentIntent(dto: {
    clientId: string;
    customerId?: string;
    email?: string;
    name?: string;
    amount: number;
    currency?: string;
    paymentMethod?: 'card' | 'ach';
    projectId?: string;
    contractId?: string;
    savePaymentMethod?: boolean;
    metadata?: Record<string, string>;
  }) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const customerId =
      dto.customerId ||
      (
        await this.stripeService.createCustomer({
          userId: dto.clientId,
          email: dto.email,
          name: dto.name,
        })
      ).id;

    const paymentMethod = dto.paymentMethod || 'card';
    const intent = await this.stripeService.createPaymentIntent({
      amount: dto.amount,
      currency: dto.currency || 'usd',
      customerId,
      paymentMethodTypes:
        paymentMethod === 'ach' ? ['us_bank_account'] : ['card'],
      paymentMethodOptions:
        paymentMethod === 'ach'
          ? {
              us_bank_account: {
                financial_connections: {
                  permissions: ['payment_method', 'balances', 'ownership'],
                  prefetch: ['balances'],
                },
                verification_method: 'automatic',
              },
            }
          : undefined,
      setupFutureUsage:
        dto.savePaymentMethod || paymentMethod === 'ach'
          ? 'off_session'
          : undefined,
      metadata: {
        clientId: dto.clientId,
        projectId: dto.projectId || '',
        contractId: dto.contractId || '',
        paymentType: paymentMethod,
        ...(dto.metadata || {}),
      },
    });

    const sessionPayload: Partial<CheckoutSession> = {
      clientId: dto.clientId,
      projectId: dto.projectId,
      contractId: dto.contractId,
      stripePaymentIntentId: intent.id,
      paymentMethod,
      totalAmount: dto.amount,
      status: 'pending',
      stripeMetadata: {
        customerId,
        savePaymentMethod: Boolean(dto.savePaymentMethod),
      },
    };
    const session = this.sessionRepo.create(sessionPayload);

    await this.sessionRepo.save(session);

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      customerId,
      billingName: dto.name,
      billingEmail: dto.email,
      checkoutSessionId: session.id,
    };
  }

  async confirmPaymentIntent(dto: { clientId: string; paymentIntentId: string }) {
    const intent = await this.stripeService.retrievePaymentIntent(dto.paymentIntentId);

    if (intent.metadata?.clientId && intent.metadata.clientId !== dto.clientId) {
      throw new BadRequestException('Payment intent does not belong to this user');
    }

    const session = await this.sessionRepo.findOne({
      where: { stripePaymentIntentId: dto.paymentIntentId },
    });

    if (session && session.clientId !== dto.clientId) {
      throw new BadRequestException('Checkout session does not belong to this user');
    }

    const status =
      intent.status === 'succeeded'
        ? 'success'
        : intent.status === 'canceled'
          ? 'cancelled'
          : intent.status === 'requires_payment_method'
            ? 'failed'
            : 'pending';

    if (session) {
      await this.sessionRepo.update(session.id, {
        status,
        paymentVerified: intent.status === 'succeeded',
        stripeMetadata: {
          ...(session.stripeMetadata || {}),
          stripeStatus: intent.status,
          paymentMethodId:
            typeof intent.payment_method === 'string'
              ? intent.payment_method
              : intent.payment_method?.id,
        },
      });
    }

    if (intent.metadata?.paymentType === 'ach') {
      this.emitEvent('checkout.bank_account.submitted', {
        paymentIntentId: intent.id,
        clientId: dto.clientId,
        projectId: intent.metadata?.projectId,
        contractId: intent.metadata?.contractId,
        status: intent.status,
      });
    }

    const paymentMethodObj =
      typeof intent.payment_method === 'string' ? null : intent.payment_method;
    const card = paymentMethodObj?.card;
    const usBankAccount = paymentMethodObj?.us_bank_account;

    return {
      status: intent.status,
      verified: intent.status === 'succeeded',
      paymentIntentId: intent.id,
      checkoutSessionId: session?.id,
      paymentMethod: paymentMethodObj
        ? {
            id: paymentMethodObj.id,
            type: paymentMethodObj.type,
            brand: card?.brand,
            last4: card?.last4 || usBankAccount?.last4,
            expMonth: card?.exp_month,
            expYear: card?.exp_year,
            bankName: usBankAccount?.bank_name,
            accountType: usBankAccount?.account_type,
            financialConnectionsAccount:
              usBankAccount?.financial_connections_account,
          }
        : null,
    };
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

  // ─── 1. Create Subscription (Installment Plan) ─────────────────────

  async createSubscription(dto: {
    clientId: string;
    customerId: string;
    projectId: string;
    contractId?: string;
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    installmentAmount: number;
    totalPayments: number;
  }) {
    this.logger.log(`Creating subscription for client ${dto.clientId}, project ${dto.projectId}`);

    const interval: 'week' | 'month' = dto.frequency === 'weekly' || dto.frequency === 'biweekly'
      ? 'week'
      : 'month';

    const subscription = await this.stripeService.createSubscription({
      customerId: dto.customerId,
      priceAmount: dto.installmentAmount,
      interval,
      metadata: {
        clientId: dto.clientId,
        projectId: dto.projectId,
        contractId: dto.contractId || '',
      },
    });

    const nextPaymentDate = new Date();
    if (interval === 'week') {
      nextPaymentDate.setDate(nextPaymentDate.getDate() + (dto.frequency === 'biweekly' ? 14 : 7));
    } else {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (dto.frequency === 'quarterly' ? 3 : dto.frequency === 'yearly' ? 12 : 1));
    }

    const installment = this.installmentRepo.create({
      clientId: dto.clientId,
      projectId: dto.projectId,
      contractId: dto.contractId || null,
      frequency: dto.frequency,
      stripeSubscriptionId: subscription.id,
      totalPayments: dto.totalPayments,
      completedPayments: 0,
      nextPaymentDue: nextPaymentDate,
      status: 'active',
    });

    await this.installmentRepo.save(installment);

    return {
      subscriptionId: subscription.id,
      nextPaymentDate,
      installmentId: installment.id,
    };
  }

  // ─── 2. Process Split Payment ──────────────────────────────────────

  async processSplitPayment(dto: {
    clientId: string;
    projectId: string;
    contractId?: string;
    totalAmount: number;
    components: Array<{
      type: 'wallet' | 'gift_card' | 'card';
      amount: number;
      giftCardCode?: string;
      paymentMethodId?: string;
      customerId?: string;
    }>;
  }) {
    this.logger.log(`Processing split payment for client ${dto.clientId}, total: ${dto.totalAmount}`);

    const componentTotal = dto.components.reduce((sum, c) => sum + c.amount, 0);
    if (Math.abs(componentTotal - dto.totalAmount) > 0.01) {
      throw new BadRequestException(
        `Split payment components total ${componentTotal} does not match expected total ${dto.totalAmount}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const results: Array<{ type: string; amount: number; status: string; reference?: string }> = [];

    try {
      for (const component of dto.components) {
        switch (component.type) {
          case 'wallet': {
            const wallet = await queryRunner.manager.findOne(Wallet, {
              where: { userId: dto.clientId },
            });
            if (!wallet || wallet.balance < component.amount) {
              throw new BadRequestException('Insufficient wallet balance for split payment');
            }
            await queryRunner.manager.update(Wallet, wallet.id, {
              balance: wallet.balance - component.amount,
            });
            const txn = queryRunner.manager.create(WalletTransaction, {
              userId: dto.clientId,
              type: 'payment',
              amount: component.amount,
              status: 'completed',
              reason: `Split payment for project ${dto.projectId}`,
            });
            await queryRunner.manager.save(txn);
            results.push({ type: 'wallet', amount: component.amount, status: 'completed' });
            break;
          }

          case 'gift_card': {
            if (!component.giftCardCode) {
              throw new BadRequestException('Gift card code is required for gift_card component');
            }
            const giftCard = await queryRunner.manager.findOne(GiftCard, {
              where: { code: component.giftCardCode, isActive: true },
            });
            if (!giftCard || giftCard.remainingAmount < component.amount) {
              throw new BadRequestException('Insufficient gift card balance');
            }
            await queryRunner.manager.update(GiftCard, giftCard.id, {
              remainingAmount: giftCard.remainingAmount - component.amount,
              isActive: giftCard.remainingAmount - component.amount > 0,
            });
            results.push({ type: 'gift_card', amount: component.amount, status: 'completed' });
            break;
          }

          case 'card': {
            const intent = await this.stripeService.createPaymentIntent({
              amount: component.amount,
              customerId: component.customerId,
              paymentMethodId: component.paymentMethodId,
              paymentMethodTypes: ['card'],
              confirm: true,
              metadata: {
                clientId: dto.clientId,
                projectId: dto.projectId,
                splitPayment: 'true',
              },
            });
            results.push({
              type: 'card',
              amount: component.amount,
              status: intent.status,
              reference: intent.id,
            });
            break;
          }

          default:
            throw new BadRequestException(`Unknown payment component type: ${component.type}`);
        }
      }

      await queryRunner.commitTransaction();

      const session = this.sessionRepo.create({
        clientId: dto.clientId,
        projectId: dto.projectId,
        contractId: dto.contractId,
        paymentMethod: 'card',
        totalAmount: dto.totalAmount,
        splitPaymentEnabled: true,
        status: 'success',
        paymentVerified: true,
      });
      await this.sessionRepo.save(session);

      this.emitEvent('checkout.split_payment.completed', {
        clientId: dto.clientId,
        projectId: dto.projectId,
        totalAmount: dto.totalAmount,
        components: results,
      });

      return { success: true, components: results };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Split payment failed for client ${dto.clientId}: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── 3. Create Bank Link Session (ACH) ─────────────────────────────

  async createBankLinkSession(dto: { customerId: string }) {
    this.logger.log(`Creating bank link session for customer ${dto.customerId}`);

    const session = await this.stripeService.createFinancialConnectionsSession({
      customerId: dto.customerId,
      permissions: ['payment_method', 'balances'],
    });

    return { clientSecret: session.client_secret };
  }

  // ─── 4. Attach Bank Account ─────────────────────────────────────────

  async attachBankAccount(dto: {
    userId: string;
    financialAccountId: string;
    bankName: string;
    last4: string;
  }) {
    this.logger.log(`Attaching bank account for user ${dto.userId}`);

    const paymentMethod = await this.stripeService.createPaymentMethodFromFinancialAccount(
      dto.financialAccountId,
    );

    const bankAccount = this.bankAccountRepo.create({
      userId: dto.userId,
      stripePaymentMethodId: paymentMethod.id,
      bankName: dto.bankName,
      last4: dto.last4,
      fingerprint: (paymentMethod.us_bank_account as any)?.fingerprint || null,
      verified: true,
      verifiedAt: new Date(),
    });

    await this.bankAccountRepo.save(bankAccount);

    return { paymentMethodId: paymentMethod.id, bankAccountId: bankAccount.id };
  }

  // ─── 5. Pay With ACH ───────────────────────────────────────────────

  async payWithACH(dto: {
    clientId: string;
    customerId: string;
    paymentMethodId: string;
    projectId: string;
    contractId?: string;
    amount: number;
  }) {
    this.logger.log(`Processing ACH payment for client ${dto.clientId}, amount: ${dto.amount}`);

    const intent = await this.stripeService.createPaymentIntent({
      amount: dto.amount,
      customerId: dto.customerId,
      paymentMethodId: dto.paymentMethodId,
      paymentMethodTypes: ['us_bank_account'],
      confirm: true,
      metadata: {
        clientId: dto.clientId,
        projectId: dto.projectId,
        contractId: dto.contractId || '',
        paymentType: 'ach',
      },
    });

    const session = this.sessionRepo.create({
      clientId: dto.clientId,
      projectId: dto.projectId,
      contractId: dto.contractId,
      stripePaymentIntentId: intent.id,
      paymentMethod: 'ach',
      totalAmount: dto.amount,
      status: 'pending',
    });

    await this.sessionRepo.save(session);

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status,
    };
  }

  // ─── 6. List Bank Accounts ─────────────────────────────────────────

  async listBankAccounts(userId: string) {
    const accounts = await this.bankAccountRepo.find({ where: { userId } });
    return accounts.map((a) => ({
      id: a.id,
      paymentMethodId: a.stripePaymentMethodId,
      bankName: a.bankName,
      last4: a.last4,
      verified: a.verified,
      createdAt: a.createdAt,
    }));
  }

  // ─── 7. Unlink Bank Account ─────────────────────────────────────────

  async unlinkBankAccount(paymentMethodId: string) {
    this.logger.log(`Unlinking bank account ${paymentMethodId}`);

    await this.stripeService.detachPaymentMethod(paymentMethodId);

    const account = await this.bankAccountRepo.findOne({
      where: { stripePaymentMethodId: paymentMethodId },
    });
    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    await this.bankAccountRepo.remove(account);

    return { success: true };
  }

  // ─── 8. Initiate Wire Transfer ──────────────────────────────────────

  async initiateWireTransfer(dto: {
    clientId: string;
    projectId: string;
    contractId?: string;
    amount: number;
  }) {
    this.logger.log(`Initiating wire transfer for client ${dto.clientId}, amount: ${dto.amount}`);

    const projectId = toStableUuid(dto.projectId);
    const contractId = dto.contractId ? toStableUuid(dto.contractId) : null;
    let createdWireTransfer = false;
    let wireTransfer = await this.wireTransferRepo.findOne({
      where: {
        clientId: dto.clientId,
        projectId,
        contractId: contractId || IsNull(),
        status: 'pending',
      },
      order: { createdAt: 'DESC' },
    });

    if (wireTransfer) {
      const expiresAt = new Date(wireTransfer.createdAt);
      expiresAt.setDate(expiresAt.getDate() + 14);
      if (expiresAt.getTime() <= Date.now()) {
        await this.wireTransferRepo.update(wireTransfer.id, {
          status: 'rejected',
        });
        this.emitEvent('checkout.wire_transfer.expired', {
          wireTransferId: wireTransfer.id,
          clientId: wireTransfer.clientId,
          projectId: wireTransfer.projectId,
          referenceCode: wireTransfer.referenceCode,
        });
        throw new BadRequestException(
          'Your wire transfer was not received within the required timeframe. Your order has been cancelled. Please contact support to restart checkout.',
        );
      }

      wireTransfer.amount = dto.amount;
      await this.wireTransferRepo.save(wireTransfer);
    } else {
      const referenceCode = `MKT-WIRE-${randomBytes(6).toString('hex').toUpperCase()}`;

      wireTransfer = this.wireTransferRepo.create({
        clientId: dto.clientId,
        projectId,
        contractId,
        referenceCode,
        amount: dto.amount,
        status: 'pending',
      });

      await this.wireTransferRepo.save(wireTransfer);
      createdWireTransfer = true;
    }

    if (createdWireTransfer) {
      const session = this.sessionRepo.create({
        clientId: dto.clientId,
        projectId,
        contractId,
        paymentMethod: 'wire',
        totalAmount: dto.amount,
        status: 'pending',
      });
      await this.sessionRepo.save(session);
    }

    this.emitEvent('checkout.wire_transfer.initiated', {
      wireTransferId: wireTransfer.id,
      clientId: dto.clientId,
      projectId,
      contractId,
      amount: dto.amount,
      referenceCode: wireTransfer.referenceCode,
      isReuse: !createdWireTransfer,
    });

    return {
      wireTransferId: wireTransfer.id,
      referenceCode: wireTransfer.referenceCode,
      amount: dto.amount,
      wireInstructions: {
        accountName: process.env.WIRE_ACCOUNT_NAME || 'Marketeq Digital Inc.',
        bankName: process.env.WIRE_BANK_NAME || 'Marketeq Inc. Bank',
        bankAddress: process.env.WIRE_BANK_ADDRESS || '',
        routingNumber: process.env.WIRE_ROUTING_NUMBER || 'XXXXXXXXX',
        accountNumber: process.env.WIRE_ACCOUNT_NUMBER || 'XXXXXXXXX',
        swiftCode: process.env.WIRE_SWIFT_CODE || 'XXXXXXXXX',
        reference: wireTransfer.referenceCode,
        beneficiary: process.env.WIRE_ACCOUNT_NAME || 'Marketeq Digital Inc.',
      },
    };
  }

  async confirmWireTransferInitiation(dto: {
    wireTransferId: string;
    clientId: string;
  }) {
    const wireTransfer = await this.wireTransferRepo.findOne({
      where: { id: dto.wireTransferId },
    });
    if (!wireTransfer) {
      throw new NotFoundException('Wire transfer not found');
    }
    if (wireTransfer.clientId !== dto.clientId) {
      throw new BadRequestException('Wire transfer does not belong to this user');
    }
    if (wireTransfer.status !== 'pending') {
      throw new BadRequestException(`Wire transfer is already ${wireTransfer.status}`);
    }

    this.emitEvent('checkout.wire_transfer.client_confirmed', {
      wireTransferId: wireTransfer.id,
      clientId: dto.clientId,
      projectId: wireTransfer.projectId,
      amount: wireTransfer.amount,
      referenceCode: wireTransfer.referenceCode,
    });

    return {
      success: true,
      message: 'Wire transfer initiation confirmed. Our team will verify receipt of your payment.',
    };
  }

  // ─── 9. Confirm Wire Transfer (AR) ─────────────────────────────────

  async confirmWireTransfer(dto: {
    wireTransferId: string;
    confirmedBy: string;
  }) {
    this.logger.log(`Confirming wire transfer ${dto.wireTransferId} by ${dto.confirmedBy}`);

    const wireTransfer = await this.wireTransferRepo.findOne({
      where: { id: dto.wireTransferId },
    });
    if (!wireTransfer) {
      throw new NotFoundException('Wire transfer not found');
    }
    if (wireTransfer.status !== 'pending') {
      throw new BadRequestException(`Wire transfer is already ${wireTransfer.status}`);
    }

    await this.wireTransferRepo.update(wireTransfer.id, {
      status: 'verified',
      wireConfirmedBy: dto.confirmedBy,
      wireConfirmedAt: new Date(),
    });

    // Mark associated checkout session as success
    const session = await this.sessionRepo.findOne({
      where: {
        clientId: wireTransfer.clientId,
        projectId: wireTransfer.projectId,
        paymentMethod: 'wire',
        status: 'pending' as any,
      },
    });
    if (session) {
      await this.sessionRepo.update(session.id, { status: 'success', paymentVerified: true });
    }

    this.emitEvent('checkout.wire_transfer.verified', {
      wireTransferId: wireTransfer.id,
      clientId: wireTransfer.clientId,
      projectId: wireTransfer.projectId,
      amount: wireTransfer.amount,
      referenceCode: wireTransfer.referenceCode,
    });

    return { success: true, status: 'verified' };
  }

  // ─── 10. Top Up Wallet ──────────────────────────────────────────────

  async topUpWallet(dto: {
    userId: string;
    customerId: string;
    amount: number;
  }) {
    this.logger.log(`Wallet top-up for user ${dto.userId}, amount: ${dto.amount}`);

    const intent = await this.stripeService.createPaymentIntent({
      amount: dto.amount,
      customerId: dto.customerId,
      paymentMethodTypes: ['card'],
      metadata: {
        userId: dto.userId,
        type: 'wallet_topup',
      },
    });

    const txn = this.walletTransactionRepo.create({
      userId: dto.userId,
      type: 'topup',
      amount: dto.amount,
      status: 'pending',
      reason: 'Wallet top-up via card',
    });
    await this.walletTransactionRepo.save(txn);

    return { clientSecret: intent.client_secret, transactionId: txn.id };
  }

  // ─── 11. Get Credit/Wallet Balance ──────────────────────────────────

  async getCreditBalance(userId: string) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      return { balance: 0 };
    }
    return { balance: Number(wallet.balance) };
  }

  // ─── 12. Check Payment Cooldown ─────────────────────────────────────

  async checkCooldown(userId: string) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 72);

    const failures = await this.paymentFailureRepo
      .createQueryBuilder('pf')
      .where('pf.userId = :userId', { userId })
      .andWhere('pf.lastFailureAt >= :cutoff', { cutoff })
      .getMany();

    const totalFailures = failures.reduce((sum, f) => sum + f.failureCount, 0);

    if (totalFailures >= 3) {
      const latestFailure = failures.reduce(
        (latest, f) => (f.lastFailureAt > latest ? f.lastFailureAt : latest),
        new Date(0),
      );
      const cooldownEnds = new Date(latestFailure.getTime() + 72 * 60 * 60 * 1000);
      return {
        onCooldown: true,
        failureCount: totalFailures,
        cooldownEndsAt: cooldownEnds,
        remainingMs: Math.max(0, cooldownEnds.getTime() - Date.now()),
      };
    }

    return { onCooldown: false, failureCount: totalFailures };
  }

  // ─── 13. Record Payment Failure ─────────────────────────────────────

  async recordFailure(userId: string, paymentMethodId: string) {
    this.logger.warn(`Recording payment failure for user ${userId}, method ${paymentMethodId}`);

    const existing = await this.paymentFailureRepo.findOne({
      where: { userId, paymentMethodId },
    });

    if (existing) {
      await this.paymentFailureRepo.update(existing.id, {
        failureCount: existing.failureCount + 1,
        lastFailureAt: new Date(),
      });
      return { failureCount: existing.failureCount + 1 };
    }

    const failure = this.paymentFailureRepo.create({
      userId,
      paymentMethodId,
      failureCount: 1,
      lastFailureAt: new Date(),
    });
    await this.paymentFailureRepo.save(failure);

    return { failureCount: 1 };
  }

  // ─── 14. Store Stripe Metadata ──────────────────────────────────────

  async storeMetadata(dto: {
    stripeSessionId: string;
    paymentIntentId?: string;
    customerId?: string;
    clientId: string;
    projectId: string;
    contractId?: string;
    amount: number;
    currency?: string;
    paymentMethod: string;
    billingType: string;
    subscriptionId?: string;
    paidAt?: Date;
    expiresAt?: Date;
    paymentStatus?: string;
    verificationStatus?: string;
    wireTransferConfirmed?: boolean;
  }) {
    this.logger.log(`Storing metadata for session ${dto.stripeSessionId}`);

    const existing = await this.stripeMetadataRepo.findOne({
      where: { stripeSessionId: dto.stripeSessionId },
    });

    if (existing) {
      await this.stripeMetadataRepo.update(dto.stripeSessionId, {
        paymentIntentId: dto.paymentIntentId ?? existing.paymentIntentId,
        customerId: dto.customerId ?? existing.customerId,
        amount: dto.amount,
        currency: dto.currency || existing.currency,
        paymentMethod: dto.paymentMethod,
        billingType: dto.billingType,
        subscriptionId: dto.subscriptionId ?? existing.subscriptionId,
        paidAt: dto.paidAt ?? existing.paidAt,
        expiresAt: dto.expiresAt ?? existing.expiresAt,
        paymentStatus: dto.paymentStatus ?? existing.paymentStatus,
        verificationStatus: dto.verificationStatus ?? existing.verificationStatus,
        wireTransferConfirmed: dto.wireTransferConfirmed ?? existing.wireTransferConfirmed,
      });
      return { updated: true };
    }

    const metadata = this.stripeMetadataRepo.create({
      stripeSessionId: dto.stripeSessionId,
      paymentIntentId: dto.paymentIntentId || null,
      customerId: dto.customerId || null,
      clientId: dto.clientId,
      projectId: dto.projectId,
      contractId: dto.contractId || null,
      amount: dto.amount,
      currency: dto.currency || 'USD',
      paymentMethod: dto.paymentMethod,
      billingType: dto.billingType,
      subscriptionId: dto.subscriptionId || null,
      paidAt: dto.paidAt || null,
      expiresAt: dto.expiresAt || null,
      paymentStatus: dto.paymentStatus || 'pending',
      verificationStatus: dto.verificationStatus || 'unverified',
      wireTransferConfirmed: dto.wireTransferConfirmed || false,
    });

    await this.stripeMetadataRepo.save(metadata);
    return { created: true };
  }

  // ─── 15. Enhanced Webhook Handler ───────────────────────────────────

  async handleWebhookEvent(event: { type: string; data: { object: any } }) {
    this.logger.log(`Handling webhook event: ${event.type}`);
    const obj = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed': {
        await this.handlePaymentSuccess(obj.id);
        this.emitEvent('checkout.payment.completed', {
          sessionId: obj.id,
          clientId: obj.metadata?.clientId,
          projectId: obj.metadata?.projectId,
          amount: obj.amount_total ? obj.amount_total / 100 : 0,
        });
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        await this.handlePaymentSuccess(obj.id);
        this.emitEvent('checkout.async_payment.succeeded', {
          sessionId: obj.id,
          clientId: obj.metadata?.clientId,
          projectId: obj.metadata?.projectId,
        });
        break;
      }

      case 'checkout.session.async_payment_failed': {
        await this.handlePaymentFailed(obj.id);
        if (obj.metadata?.clientId) {
          await this.recordFailure(obj.metadata.clientId, obj.payment_intent || 'unknown');
        }
        this.emitEvent('checkout.async_payment.failed', {
          sessionId: obj.id,
          clientId: obj.metadata?.clientId,
        });
        break;
      }

      case 'payment_intent.succeeded': {
        // Handle wallet top-up completion
        if (obj.metadata?.type === 'wallet_topup' && obj.metadata?.userId) {
          const wallet = await this.walletRepo.findOne({
            where: { userId: obj.metadata.userId },
          });
          const topUpAmount = obj.amount / 100;
          if (wallet) {
            await this.walletRepo.update(wallet.id, {
              balance: Number(wallet.balance) + topUpAmount,
            });
          } else {
            const newWallet = this.walletRepo.create({
              userId: obj.metadata.userId,
              balance: topUpAmount,
            });
            await this.walletRepo.save(newWallet);
          }
          // Mark wallet transaction as completed
          await this.walletTransactionRepo.update(
            { userId: obj.metadata.userId, type: 'topup', status: 'pending' },
            { status: 'completed' },
          );
        }
        this.emitEvent('checkout.payment_intent.succeeded', {
          paymentIntentId: obj.id,
          amount: obj.amount / 100,
          metadata: obj.metadata,
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const clientId = obj.metadata?.clientId;
        if (clientId) {
          await this.recordFailure(clientId, obj.payment_method || 'unknown');
        }
        // Update session if linked
        const failedSession = await this.sessionRepo.findOne({
          where: { stripePaymentIntentId: obj.id },
        });
        if (failedSession) {
          await this.sessionRepo.update(failedSession.id, { status: 'failed', paymentVerified: false });
        }
        this.emitEvent('checkout.payment_intent.failed', {
          paymentIntentId: obj.id,
          clientId,
          error: obj.last_payment_error?.message,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        // Handle installment payment success
        const subscriptionId = obj.subscription;
        if (subscriptionId) {
          const installment = await this.installmentRepo.findOne({
            where: { stripeSubscriptionId: subscriptionId },
          });
          if (installment) {
            const completed = installment.completedPayments + 1;
            if (completed >= installment.totalPayments) {
              await this.installmentRepo.update(installment.id, {
                completedPayments: completed,
                status: 'canceled' as const,
              });
              await this.stripeService.cancelSubscription(subscriptionId);
            } else {
              await this.installmentRepo.update(installment.id, {
                completedPayments: completed,
              });
            }
          }
        }
        this.emitEvent('checkout.invoice.payment_succeeded', {
          invoiceId: obj.id,
          subscriptionId,
          amountPaid: obj.amount_paid / 100,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const subId = obj.subscription;
        if (subId) {
          const installment = await this.installmentRepo.findOne({
            where: { stripeSubscriptionId: subId },
          });
          if (installment) {
            await this.recordFailure(installment.clientId, subId);
          }
        }
        this.emitEvent('checkout.invoice.payment_failed', {
          invoiceId: obj.id,
          subscriptionId: subId,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const installment = await this.installmentRepo.findOne({
          where: { stripeSubscriptionId: obj.id },
        });
        if (installment) {
          await this.installmentRepo.update(installment.id, { status: 'canceled' });
        }
        this.emitEvent('checkout.subscription.deleted', {
          subscriptionId: obj.id,
        });
        break;
      }

      case 'customer.bank_account.verified': {
        const bankAccount = await this.bankAccountRepo.findOne({
          where: { stripePaymentMethodId: obj.id },
        });
        if (bankAccount) {
          await this.bankAccountRepo.update(bankAccount.id, {
            verified: true,
            verifiedAt: new Date(),
          });
        }
        this.emitEvent('checkout.bank_account.verified', {
          paymentMethodId: obj.id,
        });
        break;
      }

      default:
        this.logger.warn(`Unhandled webhook event type: ${event.type}`);
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  private emitEvent(pattern: string, data: Record<string, unknown>) {
    if (this.rabbitClient) {
      this.rabbitClient.emit(pattern, data);
      this.logger.log(`Emitted RabbitMQ event: ${pattern}`);
    } else {
      this.logger.warn(`RabbitMQ client not available, skipping event: ${pattern}`);
    }
  }
}
