import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe/stripe.service';
import { SavedCard } from './entities/saved-card.entity';
import { StripeCustomer } from './entities/stripe-customer.entity';
import { SaveCardDto } from './dto/save-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

export interface SavedCardDetailView extends SavedCardView {
  cardholderName: string | null;
}

export interface SavedCardView {
  id: string;
  brand: string;
  funding: string;
  last4: string;
  expMonth: number;
  expYear: number;
  billingAddressId: string | null;
  isDefault: boolean;
}

const toView = (row: SavedCard): SavedCardView => ({
  id: row.id,
  brand: row.brand,
  funding: row.funding,
  last4: row.last4,
  expMonth: row.expMonth,
  expYear: row.expYear,
  billingAddressId: row.billingAddressId,
  isDefault: row.isDefault,
});

@Injectable()
export class SavedCardsService {
  private readonly logger = new Logger(SavedCardsService.name);

  constructor(
    @InjectRepository(StripeCustomer)
    private readonly customers: Repository<StripeCustomer>,
    @InjectRepository(SavedCard)
    private readonly cards: Repository<SavedCard>,
    private readonly stripeService: StripeService,
  ) {}

  async getOrCreateCustomer(
    userId: string,
    profile?: { email?: string; name?: string },
  ): Promise<StripeCustomer> {
    const existing = await this.customers.findOne({ where: { userId } });
    if (existing) return existing;

    const created = await this.stripeService.createCustomer(
      { userId, email: profile?.email, name: profile?.name },
      `stripe-customer-${userId}-${Math.floor(Date.now() / 60000)}`,
    );
    await this.customers
      .createQueryBuilder()
      .insert()
      .values({ userId, stripeCustomerId: created.id })
      .orIgnore()
      .execute();

    const stored = await this.customers.findOneOrFail({ where: { userId } });
    if (stored.stripeCustomerId !== created.id) {
      await this.stripeService.deleteCustomer(created.id).catch((error) => {
        this.logger.warn(
          `Could not remove duplicate Stripe customer ${created.id}: ${error?.message}`,
        );
      });
    }
    return stored;
  }

  findCustomer(userId: string): Promise<StripeCustomer | null> {
    return this.customers.findOne({ where: { userId } });
  }

  async createSetupIntent(userId: string): Promise<{ clientSecret: string }> {
    const customer = await this.findCustomer(userId);
    if (!customer) {
      throw new ConflictException({
        code: 'CUSTOMER_MISSING',
        message: 'Continue from Project Details before saving a card',
      });
    }
    const setupIntent = await this.stripeService.createCardSetupIntent(
      customer.stripeCustomerId,
      userId,
    );
    if (!setupIntent.client_secret) {
      throw new BadRequestException('Card setup could not be started');
    }
    return { clientSecret: setupIntent.client_secret };
  }

  async listCards(userId: string): Promise<SavedCardView[]> {
    const rows = await this.cards.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map(toView);
  }

  async saveCard(userId: string, dto: SaveCardDto): Promise<SavedCardView> {
    const customer = await this.customers.findOne({ where: { userId } });
    if (!customer) {
      throw new BadRequestException('Start a card setup before saving a card');
    }

    const duplicateById = await this.cards.findOne({
      where: { userId, stripePaymentMethodId: dto.paymentMethodId },
    });
    if (duplicateById) {
      return toView(
        await this.withDefault(
          userId,
          await this.relink(duplicateById, dto.billingAddressId),
          dto.setAsDefault,
        ),
      );
    }

    let paymentMethod;
    try {
      paymentMethod = await this.stripeService.retrievePaymentMethod(
        dto.paymentMethodId,
      );
    } catch {
      throw new NotFoundException('Card was not found');
    }

    if (paymentMethod.type !== 'card' || !paymentMethod.card) {
      throw new BadRequestException('Only cards can be saved here');
    }
    const owner =
      typeof paymentMethod.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod.customer?.id;
    if (owner !== customer.stripeCustomerId) {
      throw new ForbiddenException('This card does not belong to this client');
    }

    const { card } = paymentMethod;
    const fingerprint = card.fingerprint ?? null;
    if (fingerprint) {
      const duplicateByCard = await this.cards.findOne({
        where: { userId, fingerprint },
      });
      if (duplicateByCard) {
        await this.stripeService
          .detachPaymentMethod(dto.paymentMethodId)
          .catch((error) => {
            this.logger.warn(
              `Could not detach duplicate card ${dto.paymentMethodId}: ${error?.message}`,
            );
          });
        throw new ConflictException({
          code: 'CARD_ALREADY_SAVED',
          message: 'This credit card has already been added',
        });
      }
    }

    const saved = await this.cards.save(
      this.cards.create({
        userId,
        stripePaymentMethodId: paymentMethod.id,
        fingerprint,
        brand: card.brand,
        funding: card.funding,
        last4: card.last4,
        expMonth: card.exp_month,
        expYear: card.exp_year,
        billingAddressId: dto.billingAddressId ?? null,
      }),
    );
    return toView(await this.withDefault(userId, saved, dto.setAsDefault));
  }

  async getCard(userId: string, cardId: string): Promise<SavedCardDetailView> {
    const card = await this.findOwnedCard(userId, cardId);
    let cardholderName: string | null = null;
    try {
      const paymentMethod = await this.stripeService.retrievePaymentMethod(
        card.stripePaymentMethodId,
      );
      cardholderName = paymentMethod.billing_details?.name ?? null;
    } catch (error) {
      this.logger.warn(
        `Could not read card ${card.stripePaymentMethodId} from Stripe: ${error?.message}`,
      );
      throw new BadGatewayException({
        code: 'STRIPE_UNAVAILABLE',
        message: 'The card could not be loaded. Please try again.',
      });
    }
    return { ...toView(card), cardholderName };
  }

  async updateCard(
    userId: string,
    cardId: string,
    dto: UpdateCardDto,
  ): Promise<SavedCardView> {
    const card = await this.findOwnedCard(userId, cardId);

    const expMonth = dto.expMonth ?? card.expMonth;
    const expYear = dto.expYear ?? card.expYear;
    const now = new Date();
    if (
      expYear < now.getUTCFullYear() ||
      (expYear === now.getUTCFullYear() && expMonth < now.getUTCMonth() + 1)
    ) {
      throw new BadRequestException({
        code: 'CARD_EXPIRED',
        message: 'The expiration date is in the past',
      });
    }

    const expiryChanged =
      expMonth !== card.expMonth || expYear !== card.expYear;
    if (expiryChanged && card.fingerprint) {
      const sameCard = await this.cards.findOne({
        where: {
          userId,
          fingerprint: card.fingerprint,
          expMonth,
          expYear,
        },
      });
      if (sameCard && sameCard.id !== card.id) {
        throw new ConflictException({
          code: 'CARD_ALREADY_SAVED',
          message: 'This credit card has already been added',
        });
      }
    }

    const billingDetails: Record<string, unknown> = {};
    if (dto.cardholderName) billingDetails.name = dto.cardholderName;
    if (dto.billingDetails) {
      if (dto.billingDetails.phone) {
        billingDetails.phone = dto.billingDetails.phone;
      }
      const { address } = dto.billingDetails;
      billingDetails.address = {
        line1: address.line1,
        line2: address.line2 ?? '',
        city: address.city,
        state: address.state ?? '',
        postal_code: address.postalCode,
        country: address.country.toUpperCase(),
      };
    }

    try {
      await this.stripeService.updatePaymentMethod(card.stripePaymentMethodId, {
        ...(expiryChanged
          ? { card: { exp_month: expMonth, exp_year: expYear } }
          : {}),
        ...(Object.keys(billingDetails).length > 0
          ? { billing_details: billingDetails }
          : {}),
      });
    } catch (error) {
      const message: string = error?.message ?? '';
      this.logger.warn(
        `Could not update card ${card.stripePaymentMethodId}: ${message}`,
      );
      if (error?.type === 'StripeInvalidRequestError') {
        throw new BadRequestException({
          code: 'CARD_UPDATE_REJECTED',
          message: 'Stripe rejected the card details',
        });
      }
      throw new BadGatewayException({
        code: 'STRIPE_UNAVAILABLE',
        message: 'The card could not be updated. Please try again.',
      });
    }

    card.expMonth = expMonth;
    card.expYear = expYear;
    if (dto.billingAddressId) card.billingAddressId = dto.billingAddressId;
    const saved = await this.cards.save(card);
    return toView(await this.withDefault(userId, saved, dto.setAsDefault));
  }

  private async findOwnedCard(
    userId: string,
    cardId: string,
  ): Promise<SavedCard> {
    const card = await this.cards.findOne({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card was not found');
    if (card.userId !== userId) {
      throw new ForbiddenException('This card does not belong to this client');
    }
    return card;
  }

  async deleteCard(
    userId: string,
    cardId: string,
  ): Promise<{ id: string; defaultCardId: string | null }> {
    const card = await this.cards.findOne({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card was not found');
    if (card.userId !== userId) {
      throw new ForbiddenException('This card does not belong to this client');
    }

    try {
      await this.stripeService.detachPaymentMethod(card.stripePaymentMethodId);
    } catch (error) {
      const message: string = error?.message ?? '';
      const alreadyDetached =
        error?.code === 'resource_missing' ||
        message.includes('not attached to a customer');
      if (!alreadyDetached) {
        this.logger.warn(
          `Could not detach card ${card.stripePaymentMethodId}: ${message}`,
        );
        throw new BadGatewayException({
          code: 'STRIPE_UNAVAILABLE',
          message: 'The card could not be removed. Please try again.',
        });
      }
    }

    const defaultCardId = await this.removeCardRow(userId, cardId);
    return { id: cardId, defaultCardId };
  }

  async handleCardEvent(event: {
    type: string;
    data: { object: Stripe.PaymentMethod };
  }): Promise<void> {
    const paymentMethod = event.data.object;
    if (paymentMethod?.object !== 'payment_method') return;

    const row = await this.cards.findOne({
      where: { stripePaymentMethodId: paymentMethod.id },
    });
    if (!row) return;

    if (event.type === 'payment_method.detached') {
      await this.removeCardRow(row.userId, row.id);
      return;
    }

    if (
      (event.type === 'payment_method.updated' ||
        event.type === 'payment_method.automatically_updated') &&
      paymentMethod.card
    ) {
      const { card } = paymentMethod;
      row.brand = card.brand;
      row.funding = card.funding;
      row.last4 = card.last4;
      row.expMonth = card.exp_month;
      row.expYear = card.exp_year;
      row.fingerprint = card.fingerprint ?? row.fingerprint;
      await this.cards.save(row);
    }
  }

  private async removeCardRow(
    userId: string,
    cardId: string,
  ): Promise<string | null> {
    return this.cards.manager.transaction(async (manager) => {
      await manager
        .getRepository(StripeCustomer)
        .createQueryBuilder('customer')
        .setLock('pessimistic_write')
        .where('customer.userId = :userId', { userId })
        .getOne();

      const current = await manager.findOne(SavedCard, {
        where: { id: cardId, userId },
      });
      if (!current) return null;
      await manager.delete(SavedCard, { id: cardId, userId });

      const existingDefault = await manager.findOne(SavedCard, {
        where: { userId, isDefault: true },
      });
      if (existingDefault) return existingDefault.id;

      const next = await manager.findOne(SavedCard, {
        where: { userId },
        order: { createdAt: 'ASC', id: 'ASC' },
      });
      if (!next) return null;
      await manager.update(SavedCard, { id: next.id }, { isDefault: true });
      return next.id;
    });
  }

  private async withDefault(
    userId: string,
    row: SavedCard,
    setAsDefault: boolean | undefined,
  ): Promise<SavedCard> {
    return this.cards.manager.transaction(async (manager) => {
      await manager
        .getRepository(StripeCustomer)
        .createQueryBuilder('customer')
        .setLock('pessimistic_write')
        .where('customer.userId = :userId', { userId })
        .getOne();

      const current = await manager.findOne(SavedCard, {
        where: { userId, isDefault: true },
      });
      if (current?.id === row.id) return current;
      if (current && !setAsDefault) return row;

      await manager.update(
        SavedCard,
        { userId, isDefault: true },
        { isDefault: false },
      );
      await manager.update(SavedCard, { id: row.id }, { isDefault: true });
      return manager.findOneOrFail(SavedCard, { where: { id: row.id } });
    });
  }

  private async relink(
    row: SavedCard,
    billingAddressId: string | undefined,
  ): Promise<SavedCard> {
    if (!billingAddressId || row.billingAddressId === billingAddressId) {
      return row;
    }
    row.billingAddressId = billingAddressId;
    return this.cards.save(row);
  }
}
