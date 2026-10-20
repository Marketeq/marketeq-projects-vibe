import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { CheckoutDraft } from './entities/checkout-draft.entity';
import { GiftCard } from './entities/gift-card.entity';
import { PromoCode, PromoDiscountType } from './entities/promo-code.entity';
import { PromoRedemption } from './entities/promo-redemption.entity';
import { GiftCardAttempt } from './entities/gift-card-attempt.entity';
import { loadOwnedDraft, releaseSession } from './checkout-draft.util';
import { ApplyDraftCodeDto, DraftCodeType } from './dto/draft-code.dto';

export type DraftCodeStatus =
  | 'valid'
  | 'expired'
  | 'used_up'
  | 'not_found'
  | 'unverified';

export type DraftGiftCardEntry = {
  code: string;
  status: DraftCodeStatus;
  amount: number;
};

export type DraftPromoEntry = {
  code: string;
  status: DraftCodeStatus;
  discountType: PromoDiscountType;
  discountValue: number;
};

export type DraftCodes = {
  giftCards: DraftGiftCardEntry[];
  promo: DraftPromoEntry | null;
};

const MAX_GIFT_CARDS = 5;
const MAX_FAILED_GIFT_CARD_ATTEMPTS = 5;
const GIFT_CARD_LOCK_MS = 60 * 60 * 1000;

export const GIFT_CARD_LOCKED_MESSAGE =
  'Too many invalid gift card attempts. Please try again in 1 hour.';

const stripDashes = (value: string) => value.toUpperCase().replace(/-/g, '');

const sameCode = (type: DraftCodeType, a: string, b: string) =>
  type === 'gift_card' ? stripDashes(a) === stripDashes(b) : a === b;

export const PROMO_INVALID_MESSAGE =
  'You have entered an invalid promo code. Please try again.';
export const PROMO_ALREADY_APPLIED_MESSAGE =
  'Remove the applied promo code before adding another.';
export const PROMO_UNAVAILABLE_MESSAGE =
  'We were unable to validate your promo code at this time. Please try again.';

const GIFT_CARD_REJECTION_CODES: Record<string, string> = {
  not_found: 'GIFT_CARD_NOT_FOUND',
  expired: 'GIFT_CARD_EXPIRED',
  used_up: 'GIFT_CARD_USED_UP',
};

const REJECTION_MESSAGES: Record<DraftCodeType, Record<string, string>> = {
  gift_card: {
    not_found: 'This gift card code is not valid',
    expired: 'This gift card has expired',
    used_up: 'This gift card has no balance left',
  },
  promo: {
    not_found: 'This promo code is not valid',
    expired: 'This promo code has expired',
    used_up: 'This promo code can no longer be used',
  },
};

@Injectable()
export class CheckoutDraftCodeService {
  private readonly logger = new Logger(CheckoutDraftCodeService.name);

  constructor(
    @InjectRepository(GiftCard)
    private readonly giftCardRepo: Repository<GiftCard>,
    private readonly dataSource: DataSource,
  ) {}

  async listCodes(
    draft: Pick<CheckoutDraft, 'clientId' | 'giftCardCodes' | 'promoCode'>,
    manager?: EntityManager,
  ): Promise<DraftCodes> {
    const [giftCards, promo] = await Promise.all([
      this.verifyCodes(
        'gift_card',
        draft.giftCardCodes ?? [],
        draft.clientId,
        manager,
      ),
      this.loadPromoEntry(draft, manager),
    ]);
    return { giftCards, promo };
  }

  async applyCode(
    clientId: string,
    draftId: string,
    dto: ApplyDraftCodeDto,
    options: { keepSession?: boolean } = {},
  ) {
    const { type, code } = dto;
    return this.dataSource.transaction(async (manager) => {
      const draft = await loadOwnedDraft(manager, clientId, draftId, {
        lock: true,
      });
      if (type === 'promo') {
        await this.applyPromo(manager, draft, code, options);
        return;
      }
      const current = this.codesOf(draft, type);

      if (!current.some((item) => sameCode(type, item, code))) {
        if (type === 'gift_card') await this.assertGiftCardsUnlocked(clientId);
        if (!options.keepSession) await releaseSession(manager, draft);
        const [entry] = await this.verifyCodes(
          type,
          [code],
          clientId,
          manager,
        );
        if (entry.status === 'unverified') {
          throw new BadGatewayException({
            code: 'GIFT_CARD_UNAVAILABLE',
            message: 'Could not verify the code right now',
          });
        }
        if (type === 'gift_card' && entry.status === 'not_found') {
          const lockedUntil = await this.recordFailedGiftCardAttempt(clientId);
          if (lockedUntil) throw this.giftCardLockedError(lockedUntil);
        }
        if (entry.status !== 'valid') {
          throw new BadRequestException({
            code: GIFT_CARD_REJECTION_CODES[entry.status],
            message: REJECTION_MESSAGES[type][entry.status],
          });
        }
        if (type === 'gift_card' && current.length >= MAX_GIFT_CARDS) {
          throw new BadRequestException({
            code: 'GIFT_CARD_LIMIT',
            message: `You can apply up to ${MAX_GIFT_CARDS} gift cards`,
          });
        }
        const next = [...current, code];
        await manager.update(
          CheckoutDraft,
          draft.id,
          this.columnFor(type, next),
        );
        Object.assign(draft, this.columnFor(type, next));
      }
    });
  }

  async getGiftCardLock(clientId: string): Promise<{ lockedUntil: Date | null }> {
    const row = await this.dataSource.manager.findOne(GiftCardAttempt, {
      where: { clientId },
    });
    const lockedUntil =
      row?.lockedUntil && row.lockedUntil.getTime() > Date.now()
        ? row.lockedUntil
        : null;
    return { lockedUntil };
  }

  private async assertGiftCardsUnlocked(clientId: string) {
    const { lockedUntil } = await this.getGiftCardLock(clientId);
    if (lockedUntil) throw this.giftCardLockedError(lockedUntil);
  }

  private giftCardLockedError(lockedUntil: Date) {
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'GIFT_CARD_LOCKED',
        message: GIFT_CARD_LOCKED_MESSAGE,
        lockedUntil: lockedUntil.toISOString(),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async recordFailedGiftCardAttempt(
    clientId: string,
  ): Promise<Date | null> {
    try {
      return await this.dataSource.manager.transaction(async (manager) => {
        await manager
          .createQueryBuilder()
          .insert()
          .into(GiftCardAttempt)
          .values({ clientId, failedCount: 0 })
          .orIgnore()
          .execute();
        const row = await manager.findOneOrFail(GiftCardAttempt, {
          where: { clientId },
          lock: { mode: 'pessimistic_write' },
        });
        const now = Date.now();
        const expired = row.lockedUntil && row.lockedUntil.getTime() <= now;
        const failedCount = (expired ? 0 : row.failedCount) + 1;
        const lockedUntil =
          failedCount >= MAX_FAILED_GIFT_CARD_ATTEMPTS
            ? new Date(now + GIFT_CARD_LOCK_MS)
            : null;
        await manager.update(GiftCardAttempt, clientId, {
          failedCount,
          lockedUntil,
          updatedAt: new Date(now),
        });
        return lockedUntil;
      });
    } catch (err) {
      this.logger.warn(
        `Could not record gift card attempt: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  async removeCode(
    clientId: string,
    draftId: string,
    rawCode: string,
    options: { keepSession?: boolean } = {},
  ) {
    const code = rawCode.trim().toUpperCase();
    return this.dataSource.transaction(async (manager) => {
      const draft = await loadOwnedDraft(manager, clientId, draftId, {
        lock: true,
      });
      const promoRow = draft.promoCode
        ? await manager.findOne(PromoCode, { where: { id: draft.promoCode } })
        : null;
      if (promoRow && promoRow.code.trim().toUpperCase() === code) {
        if (!options.keepSession) await releaseSession(manager, draft);
        await manager.update(CheckoutDraft, draft.id, { promoCode: null });
        Object.assign(draft, { promoCode: null });
      }

      const current = this.codesOf(draft, 'gift_card');

      if (current.some((item) => sameCode('gift_card', item, code))) {
        if (!options.keepSession) await releaseSession(manager, draft);
        const next = current.filter(
          (item) => !sameCode('gift_card', item, code),
        );
        await manager.update(
          CheckoutDraft,
          draft.id,
          this.columnFor('gift_card', next),
        );
        Object.assign(draft, this.columnFor('gift_card', next));
      }
    });
  }

  private async applyPromo(
    manager: EntityManager,
    draft: CheckoutDraft,
    code: string,
    options: { keepSession?: boolean } = {},
  ) {
    let row: PromoCode | null;
    try {
      row = await manager
        .getRepository(PromoCode)
        .createQueryBuilder('promo')
        .where('upper(trim(promo.code)) = :code', { code })
        .getOne();
    } catch (err) {
      this.logger.warn(
        `Promo lookup failed: ${err instanceof Error ? err.message : err}`,
      );
      throw new ServiceUnavailableException({
        code: 'CODE_UNAVAILABLE',
        message: PROMO_UNAVAILABLE_MESSAGE,
      });
    }

    if (draft.promoCode) {
      if (row && row.id === draft.promoCode) return;
      throw new ConflictException({
        code: 'PROMO_ALREADY_APPLIED',
        message: PROMO_ALREADY_APPLIED_MESSAGE,
      });
    }

    const status = row
      ? await this.promoStatus(row, draft.clientId, manager)
      : 'not_found';
    if (!row || status !== 'valid') {
      throw new UnprocessableEntityException({
        code: 'PROMO_INVALID',
        message: PROMO_INVALID_MESSAGE,
      });
    }

    if (!options.keepSession) await releaseSession(manager, draft);
    await manager.update(CheckoutDraft, draft.id, { promoCode: row.id });
  }

  private async loadPromoEntry(
    draft: Pick<CheckoutDraft, 'clientId' | 'promoCode'>,
    manager?: EntityManager,
  ): Promise<DraftPromoEntry | null> {
    if (!draft.promoCode) return null;
    const row = await (manager ?? this.dataSource.manager).findOne(PromoCode, {
      where: { id: draft.promoCode },
    });
    if (!row) return null;
    return {
      code: row.code,
      status: await this.promoStatus(row, draft.clientId, manager),
      discountType: row.discountType,
      discountValue: row.discountValue,
    };
  }

  private async promoStatus(
    row: PromoCode,
    clientId: string,
    manager?: EntityManager,
  ): Promise<DraftCodeStatus> {
    if (!row.active || row.appliesTo === 'service') return 'not_found';
    const now = Date.now();
    if (
      (row.startsAt && new Date(row.startsAt).getTime() > now) ||
      (row.expiresAt && new Date(row.expiresAt).getTime() < now)
    ) {
      return 'expired';
    }
    const source = manager ?? this.dataSource.manager;
    if (row.maxRedemptions !== null) {
      const used = await source.count(PromoRedemption, {
        where: { promoCodeId: row.id, voidedAt: IsNull() },
      });
      if (used >= row.maxRedemptions) return 'used_up';
    }
    if (row.maxPerClient !== null) {
      const usedByClient = await source.count(PromoRedemption, {
        where: { promoCodeId: row.id, clientId, voidedAt: IsNull() },
      });
      if (usedByClient >= row.maxPerClient) return 'used_up';
    }
    return 'valid';
  }

  private codesOf(draft: CheckoutDraft, type: DraftCodeType) {
    return type === 'gift_card' ? draft.giftCardCodes : [];
  }

  private columnFor(type: DraftCodeType, codes: string[]) {
    return type === 'gift_card' ? { giftCardCodes: codes } : {};
  }

  private async verifyCodes(
    type: DraftCodeType,
    codes: string[],
    clientId: string,
    manager?: EntityManager,
  ): Promise<DraftGiftCardEntry[]> {
    if (codes.length === 0) return [];
    return type === 'gift_card'
      ? this.verifyGiftCards(codes, clientId, manager)
      : [];
  }

  private async verifyGiftCards(
    allCodes: string[],
    clientId: string,
    manager?: EntityManager,
  ): Promise<DraftGiftCardEntry[]> {
    const seen = new Set<string>();
    const codes = allCodes.filter((code) => {
      const key = stripDashes(code);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const giftCardRepo = manager
      ? manager.getRepository(GiftCard)
      : this.giftCardRepo;
    let rows: GiftCard[];
    try {
      rows = await giftCardRepo
        .createQueryBuilder('card')
        .where("REPLACE(UPPER(card.code), '-', '') IN (:...keys)", {
          keys: codes.map(stripDashes),
        })
        .getMany();
    } catch (err) {
      this.logger.warn(
        `Gift card lookup failed: ${err instanceof Error ? err.message : err}`,
      );
      return codes.map((code) => ({
        code,
        status: 'unverified' as const,
        amount: 0,
      }));
    }

    const byCode = new Map(rows.map((row) => [stripDashes(row.code), row]));
    const now = Date.now();
    return codes.map((code) => {
      const found = byCode.get(stripDashes(code));
      const row =
        found &&
        (!found.redeemedByUserId || found.redeemedByUserId === clientId)
          ? found
          : undefined;
      const remaining = row ? Number(row.remainingAmount) : 0;
      let status: DraftCodeStatus = 'valid';
      if (!row) status = 'not_found';
      else if (row.expiresAt && new Date(row.expiresAt).getTime() < now) {
        status = 'expired';
      } else if (!row.isActive || remaining <= 0) status = 'used_up';
      return {
        code,
        status,
        amount: status === 'valid' ? remaining : 0,
      };
    });
  }
}
