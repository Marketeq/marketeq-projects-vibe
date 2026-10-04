import { GiftCardAdjustment } from './gift-card.adjustment';
import { PromoAdjustment } from './promo.adjustment';
import { DraftCodeEntry } from '../checkout-draft-code.service';

const card = (
  code: string,
  amount: number,
  status: DraftCodeEntry['status'] = 'valid',
): DraftCodeEntry => ({ code, type: 'gift_card', status, amount });

const promo = (
  code: string,
  amount: number,
  status: DraftCodeEntry['status'] = 'valid',
): DraftCodeEntry => ({ code, type: 'promo', status, amount });

describe('PromoAdjustment', () => {
  const adjustment = new PromoAdjustment();

  it('takes the discount off and reports one line', () => {
    const result = adjustment.apply({ codes: [promo('SAVE', 50)] }, 100000);
    expect(result.runningCents).toBe(95000);
    expect(result.totals).toEqual({ discountTotal: 5000 });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({
      key: 'promo',
      label: 'Promo code applied',
      amountCents: -5000,
      count: 1,
    });
  });

  it('caps the discount at what is left', () => {
    const result = adjustment.apply({ codes: [promo('SAVE', 50)] }, 1234);
    expect(result.runningCents).toBe(0);
    expect(result.totals.discountTotal).toBe(1234);
  });

  it('ignores a promo that is not valid and returns no line', () => {
    const result = adjustment.apply(
      { codes: [promo('OLD', 50, 'expired')] },
      10000,
    );
    expect(result).toEqual({
      runningCents: 10000,
      lines: [],
      totals: { discountTotal: 0 },
    });
  });

  it('does nothing when the total is already 0', () => {
    const result = adjustment.apply({ codes: [promo('SAVE', 50)] }, 0);
    expect(result.lines).toEqual([]);
    expect(result.runningCents).toBe(0);
  });
});

describe('GiftCardAdjustment', () => {
  const adjustment = new GiftCardAdjustment();

  it('uses one card and labels it singular', () => {
    const result = adjustment.apply({ codes: [card('A', 25)] }, 10000);
    expect(result.runningCents).toBe(7500);
    expect(result.lines[0]).toMatchObject({
      key: 'giftCards',
      label: 'Gift card applied',
      amountCents: -2500,
      count: 1,
    });
    expect(result.totals).toEqual({ giftCardAppliedTotal: 2500 });
  });

  it('counts two and three cards in the label and lists each amount', () => {
    const two = adjustment.apply(
      { codes: [card('A', 20), card('B', 9.5)] },
      100000,
    );
    expect(two.lines[0].label).toBe('2 Gift cards applied');
    expect(two.lines[0].count).toBe(2);
    expect(two.lines[0].details).toEqual([
      { code: 'A', amountCents: -2000 },
      { code: 'B', amountCents: -950 },
    ]);
    expect(two.runningCents).toBe(100000 - 2950);

    const three = adjustment.apply(
      { codes: [card('A', 1), card('B', 2), card('C', 3)] },
      100000,
    );
    expect(three.lines[0].label).toBe('3 Gift cards applied');
    expect(three.totals.giftCardAppliedTotal).toBe(600);
  });

  it('stops once the total is covered and leaves later cards out', () => {
    const result = adjustment.apply(
      { codes: [card('BIG', 1000), card('NEXT', 50)] },
      30000,
    );
    expect(result.runningCents).toBe(0);
    expect(result.lines[0].count).toBe(1);
    expect(result.lines[0].details).toEqual([
      { code: 'BIG', amountCents: -30000 },
    ]);
  });

  it('skips cards that are not valid or are empty', () => {
    const result = adjustment.apply(
      {
        codes: [
          card('GONE', 10, 'expired'),
          card('SPENT', 0, 'used_up'),
          card('NOPE', 0, 'not_found'),
          card('OK', 5),
        ],
      },
      10000,
    );
    expect(result.lines[0].details).toEqual([{ code: 'OK', amountCents: -500 }]);
  });

  it('does not touch promo entries and returns no line without cards', () => {
    const result = adjustment.apply({ codes: [promo('SAVE', 50)] }, 10000);
    expect(result).toEqual({
      runningCents: 10000,
      lines: [],
      totals: { giftCardAppliedTotal: 0 },
    });
  });

  it('is exact with cents (no floating point drift)', () => {
    const result = adjustment.apply(
      { codes: [card('A', 0.1), card('B', 0.2)] },
      100,
    );
    expect(result.totals.giftCardAppliedTotal).toBe(30);
    expect(result.runningCents).toBe(70);
  });
});
