import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe/stripe.service';
import { SavedCard } from './entities/saved-card.entity';
import { StripeCustomer } from './entities/stripe-customer.entity';
import { SaveCardDto } from './dto/save-card.dto';

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
        where: {
          userId,
          fingerprint,
          expMonth: card.exp_month,
          expYear: card.exp_year,
        },
      });
      if (duplicateByCard) {
        await this.stripeService
          .detachPaymentMethod(dto.paymentMethodId)
          .catch((error) => {
            this.logger.warn(
              `Could not detach duplicate card ${dto.paymentMethodId}: ${error?.message}`,
            );
          });
        return toView(
          await this.withDefault(
            userId,
            await this.relink(duplicateByCard, dto.billingAddressId),
            dto.setAsDefault,
          ),
        );
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
