import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CheckoutDraft } from './entities/checkout-draft.entity';
import { GiftCard } from './entities/gift-card.entity';
import { loadOwnedDraft } from './checkout-draft.util';
import { ApplyDraftCodeDto, DraftCodeType } from './dto/draft-code.dto';

export type DraftCodeStatus =
  | 'valid'
  | 'expired'
  | 'used_up'
  | 'not_found'
  | 'unverified';

export type DraftCodeEntry = {
  code: string;
  type: DraftCodeType;
  status: DraftCodeStatus;
  amount: number;
};

const MAX_GIFT_CARDS = 5;

const stripDashes = (value: string) => value.toUpperCase().replace(/-/g, '');

const sameCode = (type: DraftCodeType, a: string, b: string) =>
  type === 'gift_card' ? stripDashes(a) === stripDashes(b) : a === b;

const PROMO_FLAT_DISCOUNT = 50;

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
    draft: Pick<CheckoutDraft, 'giftCardCodes' | 'promoCodes'>,
    manager?: EntityManager,
  ) {
    const [giftCards, promos] = await Promise.all([
      this.verifyCodes('gift_card', draft.giftCardCodes ?? [], manager),
      this.verifyCodes('promo', draft.promoCodes ?? [], manager),
    ]);
    return [...giftCards, ...promos];
  }

  async applyCode(clientId: string, draftId: string, dto: ApplyDraftCodeDto) {
    const { type, code } = dto;
    return this.dataSource.transaction(async (manager) => {
      const draft = await loadOwnedDraft(manager, clientId, draftId, {
        lock: true,
      });
      const current = this.codesOf(draft, type);

      if (!current.some((item) => sameCode(type, item, code))) {
        const [entry] = await this.verifyCodes(type, [code], manager);
        if (entry.status === 'unverified') {
          throw new BadGatewayException('Could not verify the code right now');
        }
        if (entry.status !== 'valid') {
          throw new BadRequestException(
            REJECTION_MESSAGES[type][entry.status],
          );
        }
        if (type === 'gift_card' && current.length >= MAX_GIFT_CARDS) {
          throw new BadRequestException(
            `You can apply up to ${MAX_GIFT_CARDS} gift cards`,
          );
        }
        const next = type === 'promo' ? [code] : [...current, code];
        await manager.update(
          CheckoutDraft,
          draft.id,
          this.columnFor(type, next),
        );
        Object.assign(draft, this.columnFor(type, next));
      }

      return { code, type, codes: await this.listCodes(draft, manager) };
    });
  }

  async removeCode(
    clientId: string,
    draftId: string,
    type: DraftCodeType,
    rawCode: string,
  ) {
    const code = rawCode.trim().toUpperCase();
    return this.dataSource.transaction(async (manager) => {
      const draft = await loadOwnedDraft(manager, clientId, draftId, {
        lock: true,
      });
      const current = this.codesOf(draft, type);

      if (current.some((item) => sameCode(type, item, code))) {
        const next = current.filter((item) => !sameCode(type, item, code));
        await manager.update(
          CheckoutDraft,
          draft.id,
          this.columnFor(type, next),
        );
        Object.assign(draft, this.columnFor(type, next));
      }

      return { codes: await this.listCodes(draft, manager) };
    });
  }

  private codesOf(draft: CheckoutDraft, type: DraftCodeType) {
    return type === 'gift_card' ? draft.giftCardCodes : draft.promoCodes;
  }

  private columnFor(type: DraftCodeType, codes: string[]) {
    return type === 'gift_card'
      ? { giftCardCodes: codes }
      : { promoCodes: codes };
  }

  private async verifyCodes(
    type: DraftCodeType,
    codes: string[],
    manager?: EntityManager,
  ): Promise<DraftCodeEntry[]> {
    if (codes.length === 0) return [];
    return type === 'gift_card'
      ? this.verifyGiftCards(codes, manager)
      : codes.map((code) => ({
          code,
          type,
          status: 'valid' as const,
          amount: PROMO_FLAT_DISCOUNT,
        }));
  }

  private async verifyGiftCards(
    allCodes: string[],
    manager?: EntityManager,
  ): Promise<DraftCodeEntry[]> {
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
        type: 'gift_card' as const,
        status: 'unverified' as const,
        amount: 0,
      }));
    }

    const byCode = new Map(rows.map((row) => [stripDashes(row.code), row]));
    const now = Date.now();
    return codes.map((code) => {
      const row = byCode.get(stripDashes(code));
      const remaining = row ? Number(row.remainingAmount) : 0;
      let status: DraftCodeStatus = 'valid';
      if (!row) status = 'not_found';
      else if (row.expiresAt && new Date(row.expiresAt).getTime() < now) {
        status = 'expired';
      } else if (!row.isActive || remaining <= 0) status = 'used_up';
      return {
        code,
        type: 'gift_card' as const,
        status,
        amount: status === 'valid' ? remaining : 0,
      };
    });
  }
}
