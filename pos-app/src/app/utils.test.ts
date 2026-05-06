import { describe, expect, it } from 'vitest';
import { calculateCartTotal, formatCurrency } from './utils';

describe('utils', () => {
  it('calculates cart totals with item discounts and tax', () => {
    const result = calculateCartTotal(
      [
        { product: { priceUSD: 10 }, quantity: 2, discount: 10 },
        { product: { priceUSD: 5 }, quantity: 1, discount: 0 },
      ],
      10,
      0
    );

    expect(result.subtotal).toBeCloseTo(23);
    expect(result.tax).toBeCloseTo(2.3);
    expect(result.total).toBeCloseTo(25.3);
  });

  it('clamps totals to zero when discount exceeds subtotal', () => {
    const result = calculateCartTotal(
      [{ product: { priceUSD: 5 }, quantity: 1, discount: 0 }],
      10,
      100
    );

    expect(result.subtotal).toBe(5);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });

  it('formats usd and local currencies correctly', () => {
    expect(formatCurrency(12.5, 'USD')).toBe('$12.50');
    expect(formatCurrency(150000, 'LBP')).toBe('150,000 LBP');
  });

  it('applies bogo and cart percent discount correctly', () => {
    const result = calculateCartTotal(
      [{ product: { priceUSD: 10 }, quantity: 3, discount: 0 }],
      10,
      0,
      {
        bogoEnabled: true,
        cartDiscountType: 'percent',
        cartDiscountValue: 10,
      }
    );

    expect(result.subtotal).toBe(30);
    expect(result.bogoDiscount).toBe(10);
    expect(result.cartDiscount).toBe(2);
    expect(result.taxableBase).toBe(18);
    expect(result.tax).toBeCloseTo(1.8);
    expect(result.total).toBeCloseTo(19.8);
  });
});
