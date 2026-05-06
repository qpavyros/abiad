export type Language = 'en' | 'ar';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'split' | 'debt';
export type CartDiscountType = 'none' | 'percent' | 'amount';

export type TransactionStatus = 'completed' | 'voided';

export type DatabaseMode = 'online' | 'offline';
export type UserRole = 'cashier' | 'admin' | 'owner';
export type ExpenseCategory = 'supplier' | 'bills' | 'salaries' | 'petty_cash' | 'other';
export type AuditEventType = 'EXPENSE_EDITED' | 'EXPENSE_DELETED';

export interface Expense {
  id: string;
  amount: number;
  currency: 'USD' | 'LBP';
  category: ExpenseCategory;
  description: string;
  date: string;
  shiftSequence: string;
  recordedBy: string;
}

export interface AuditRecord {
  id: string;
  eventType: AuditEventType;
  timestamp: string;
  requestedAt: string;
  approvedAt: string;
  shiftSequence: string;
  expenseId: string;
  requesterRole: UserRole;
  requesterLabel: string;
  approverRole: UserRole;
  approverLabel: string;
  overrideUsed: boolean;
  before: Expense | null;
  after: Expense | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balanceUSD: number;
  balanceLBP: number;
  createdAt: string;
}

export interface DebtRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  amountUSD: number;
  amountLBP: number;
  partialPayment: number;
  totalInvoice: number;
  receiptNumber: string;
  timestamp: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  priceUSD: number;
  category: string;
  barcode?: string;
  stock: number;
  minStockLevel?: number;
  cost?: number;
  stockStatus: StockStatus;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export interface Cart {
  items: CartItem[];
  discountCode?: string;
  discountAmount: number;
}

export interface Settings {
  storeName: string;
  storeNameAr: string;
  taxRate: number;
  localCurrency: string;
  loyaltyRate: number;
  exchangeRate: number;
  exchangeRateSource: 'manual' | 'auto';
  databaseMode?: DatabaseMode;
  adminPin?: string;
  ownerPin?: string;
  cashierPin?: string;
  requirePin?: boolean;
  receiptLogoBase64?: string;
  vatNumber?: string;
  receiptFooter?: string;
}

export interface Transaction {
  id: string;
  date: Date;
  items: CartItem[];
  subtotal: number;
  tax: number;
  totalUSD: number;
  totalLocal: number;
  paymentMethod: PaymentMethod;
  exchangeRate: number;
  status: TransactionStatus;
  amountPaidUSD?: number;
  amountPaidLocal?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  partialPayment?: number;
  partialPaymentLocal?: number;
  debtAmount?: number;
  shiftId?: string;
  bogoEnabled?: boolean;
  bogoDiscount?: number;
  cartDiscountType?: CartDiscountType;
  cartDiscountValue?: number;
  cartDiscountApplied?: number;
}

export interface DailySales {
  date: string;
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  count: number;
  total: number;
}
