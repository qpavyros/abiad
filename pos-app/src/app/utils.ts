import { CartDiscountType } from './types';

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const calculateCartTotal = (
  items: Array<{ product: { priceUSD: number }; quantity: number; discount: number }>,
  taxRate: number,
  discountAmount: number,
  options?: {
    cartDiscountType?: CartDiscountType;
    cartDiscountValue?: number;
    bogoEnabled?: boolean;
  }
): {
  subtotal: number;
  bogoDiscount: number;
  cartDiscount: number;
  taxableBase: number;
  tax: number;
  total: number;
} => {
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.product.priceUSD * item.quantity;
    const itemDiscount = (itemPrice * item.discount) / 100;
    return sum + (itemPrice - itemDiscount);
  }, 0);

  const bogoDiscount = (options?.bogoEnabled ? items : []).reduce((sum, item) => {
    const freeUnits = Math.floor(item.quantity / 3);
    if (freeUnits <= 0) return sum;
    const effectiveUnitPrice = item.product.priceUSD * (1 - item.discount / 100);
    return sum + freeUnits * effectiveUnitPrice;
  }, 0);

  const subtotalAfterBogo = Math.max(0, subtotal - bogoDiscount);
  const manualDiscount = Math.max(0, discountAmount);

  const cartDiscountType = options?.cartDiscountType || 'none';
  const cartDiscountValue = Math.max(0, Number(options?.cartDiscountValue || 0));
  let cartDiscount = 0;
  if (cartDiscountType === 'percent') {
    cartDiscount = subtotalAfterBogo * (Math.min(100, cartDiscountValue) / 100);
  } else if (cartDiscountType === 'amount') {
    cartDiscount = cartDiscountValue;
  }

  const totalDiscount = Math.max(0, manualDiscount + cartDiscount);
  const taxableBase = Math.max(0, subtotalAfterBogo - totalDiscount);
  const tax = taxableBase * (taxRate / 100);
  const total = taxableBase + tax;

  return {
    subtotal: Math.max(0, subtotal),
    bogoDiscount: Math.max(0, bogoDiscount),
    cartDiscount: Math.max(0, Math.min(cartDiscount, subtotalAfterBogo)),
    taxableBase,
    tax: Math.max(0, tax),
    total: Math.max(0, total),
  };
};

export const generateTransactionId = (): string => {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};
