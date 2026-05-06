import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Download, Upload, Database, HardDrive, ShoppingBag, Sun, Moon, Globe, Settings as SettingsIcon, HelpCircle, BarChart3, History, DollarSign, Lock, Wallet } from 'lucide-react';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { ProductCard } from './components/ProductCard';
import { CartItem } from './components/CartItem';
import { StatusIndicator } from './components/StatusIndicator';
import { ExchangeRateBadge } from './components/ExchangeRateBadge';
import { OfflineRibbon } from './components/OfflineRibbon';
import { mockProducts } from './data';
import {
  Product,
  AuditEventType,
  AuditRecord,
  CartDiscountType,
  CartItem as CartItemType,
  Expense,
  ExpenseCategory,
  Language,
  Settings,
  Transaction,
  UserRole,
} from './types';
import { useTranslation } from './i18n';
import { formatCurrency, calculateCartTotal } from './utils';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { SettingsModal } from './components/SettingsModal';
import { SalesHistoryModal } from './components/SalesHistoryModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { DebtReportModal } from './components/DebtReportModal';
import { ExpensesModal } from './components/ExpensesModal';
import { AuditLogModal } from './components/AuditLogModal';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  theme: 'dcpos-theme',
  language: 'dcpos-language',
  products: 'dcpos-products',
  settings: 'dcpos-settings',
  transactions: 'dcpos-transactions',
  heldCarts: 'dcpos-held-carts',
  activeShift: 'dcpos-active-shift',
  shiftReports: 'dcpos-shift-reports',
  shiftSequence: 'dcpos-shift-sequence',
  expenses: 'dcpos-offline-expenses',
  auditLogs: 'dcpos-offline-audit-logs',
  pwaBannerDismissed: 'dcpos-pwa-banner-dismissed',
};
const ROLE_SESSION_KEY = 'dcpos-session-role';
const BACKUP_FILE_VERSION = 6;
const MAX_AUDIT_LOGS = 5000;

const DEFAULT_SETTINGS: Settings = {
  storeName: 'My Store',
  storeNameAr: 'متجري',
  taxRate: 10,
  localCurrency: 'LBP',
  loyaltyRate: 5,
  exchangeRate: 89500,
  exchangeRateSource: 'manual',
  databaseMode: 'offline',
  adminPin: '1234',
  ownerPin: '9999',
  cashierPin: '0000',
  requirePin: true,
  receiptLogoBase64: '',
  vatNumber: '',
  receiptFooter: '',
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type HeldCart = {
  id: string;
  label: string;
  items: CartItemType[];
  discountAmount: number;
  cartDiscountType: CartDiscountType;
  cartDiscountValue: number;
  bogoEnabled: boolean;
  createdAt: string;
};

type ShiftSession = {
  id: string;
  sequenceNumber: number;
  sequenceCode: string;
  openedAt: string;
  openedBy: UserRole;
  openedByLabel: string;
  openingCashUSD: number;
  openingCashLocal: number;
  note: string;
};

type ShiftReport = {
  id: string;
  shiftId: string;
  sequenceNumber: number;
  sequenceCode: string;
  openedAt: string;
  closedAt: string;
  openedBy: UserRole;
  openedByLabel: string;
  closedBy: UserRole;
  closedByLabel: string;
  openingCashUSD: number;
  openingCashLocal: number;
  expectedCashUSD: number;
  expectedCashLocal: number;
  actualCashUSD: number;
  actualCashLocal: number;
  varianceUSD: number;
  varianceLocal: number;
  salesUSD: number;
  cashSalesUSD: number;
  cashSalesLocal: number;
  cardSalesUSD: number;
  mobileSalesUSD: number;
  splitCashUSD: number;
  splitCashLocal: number;
  debtCashUSD: number;
  debtCashLocal: number;
  debtRecordedUSD: number;
  totalExpensesUSD: number;
  totalExpensesLocal: number;
  transactionCount: number;
  auditSignature: string;
  note: string;
};

type InventoryForecast = {
  productId: string;
  name: string;
  nameAr: string;
  stock: number;
  avgDailySales: number;
  daysUntilStockout: number | null;
};

type ManagerOverrideAction =
  | { type: 'set-cart-discount-type'; value: CartDiscountType }
  | { type: 'toggle-bogo'; value: boolean }
  | {
      type: 'edit-expense';
      expenseId: string;
      requestedByRole: UserRole;
      requestedByLabel: string;
      requestedAt: string;
    }
  | {
      type: 'delete-expense';
      expenseId: string;
      requestedByRole: UserRole;
      requestedByLabel: string;
      requestedAt: string;
    }
  | null;

type ExpenseAuditContext = {
  requestedByRole: UserRole;
  requestedByLabel: string;
  requestedAt: string;
  approvedByRole: UserRole;
  approvedByLabel: string;
  approvedAt: string;
  overrideUsed: boolean;
};

function getRoleAuditLabel(role: UserRole): string {
  if (role === 'owner') return 'OWNER';
  if (role === 'admin') return 'ADMIN';
  return 'CASHIER';
}

function formatShiftSequence(sequenceNumber: number): string {
  return `SHIFT-${Math.max(1, Math.floor(sequenceNumber)).toString().padStart(3, '0')}`;
}

function extractShiftSequenceNumber(raw: {
  sequenceNumber?: unknown;
  sequenceCode?: unknown;
}): number {
  const parsedNumber = Number(raw.sequenceNumber);
  if (Number.isFinite(parsedNumber) && parsedNumber > 0) {
    return Math.floor(parsedNumber);
  }
  const code = String(raw.sequenceCode || '');
  const match = code.match(/(\d+)/);
  if (!match) return 0;
  const codeNumber = Number(match[1]);
  return Number.isFinite(codeNumber) && codeNumber > 0 ? Math.floor(codeNumber) : 0;
}

function formatShiftTimestamp(value: string, lang: Language): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(lang === 'ar' ? 'ar-LB' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

async function computeSimpleHash(input: string): Promise<string> {
  try {
    if (globalThis.crypto?.subtle) {
      const bytes = new TextEncoder().encode(input);
      const digest = await globalThis.crypto.subtle.digest('SHA-1', bytes);
      const hex = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      if (hex) return hex;
    }
  } catch {
    // Fall through to non-cryptographic fallback hash.
  }

  // Fallback in environments where WebCrypto is unavailable.
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, '0');
}

function buildShiftAuditPayload(report: {
  sequenceCode: string;
  shiftId: string;
  openedAt: string;
  closedAt: string;
  salesUSD: number;
  expectedCashUSD: number;
  expectedCashLocal: number;
  actualCashUSD: number;
  actualCashLocal: number;
  varianceUSD: number;
  varianceLocal: number;
  totalExpensesUSD: number;
  totalExpensesLocal: number;
  transactionCount: number;
}): string {
  return [
    report.sequenceCode,
    report.shiftId,
    report.openedAt,
    report.closedAt,
    report.salesUSD.toFixed(2),
    report.expectedCashUSD.toFixed(2),
    report.expectedCashLocal.toFixed(0),
    report.actualCashUSD.toFixed(2),
    report.actualCashLocal.toFixed(0),
    report.varianceUSD.toFixed(2),
    report.varianceLocal.toFixed(0),
    report.totalExpensesUSD.toFixed(2),
    report.totalExpensesLocal.toFixed(0),
    String(report.transactionCount),
  ].join('|');
}

function normalizeShiftSession(raw: Partial<ShiftSession>): ShiftSession | null {
  if (!raw?.id || !raw?.openedAt) return null;
  const openedBy =
    raw.openedBy === 'admin' || raw.openedBy === 'owner' || raw.openedBy === 'cashier'
      ? raw.openedBy
      : 'cashier';
  const sequenceNumber = extractShiftSequenceNumber(raw);
  const safeSequenceNumber = sequenceNumber > 0 ? sequenceNumber : 1;
  return {
    id: String(raw.id),
    sequenceNumber: safeSequenceNumber,
    sequenceCode: String(raw.sequenceCode || formatShiftSequence(safeSequenceNumber)),
    openedAt: String(raw.openedAt),
    openedBy,
    openedByLabel: String(raw.openedByLabel || getRoleAuditLabel(openedBy)),
    openingCashUSD: Number(raw.openingCashUSD) || 0,
    openingCashLocal: Number(raw.openingCashLocal) || 0,
    note: String(raw.note || ''),
  };
}

function normalizeShiftReport(raw: Partial<ShiftReport>): ShiftReport | null {
  if (!raw?.id || !raw?.shiftId || !raw?.openedAt || !raw?.closedAt) return null;
  const openedBy =
    raw.openedBy === 'admin' || raw.openedBy === 'owner' || raw.openedBy === 'cashier'
      ? raw.openedBy
      : 'cashier';
  const closedBy =
    raw.closedBy === 'admin' || raw.closedBy === 'owner' || raw.closedBy === 'cashier'
      ? raw.closedBy
      : openedBy;
  const sequenceNumber = extractShiftSequenceNumber(raw);
  const safeSequenceNumber = sequenceNumber > 0 ? sequenceNumber : 1;
  return {
    id: String(raw.id),
    shiftId: String(raw.shiftId),
    sequenceNumber: safeSequenceNumber,
    sequenceCode: String(raw.sequenceCode || formatShiftSequence(safeSequenceNumber)),
    openedAt: String(raw.openedAt),
    closedAt: String(raw.closedAt),
    openedBy,
    openedByLabel: String(raw.openedByLabel || getRoleAuditLabel(openedBy)),
    closedBy,
    closedByLabel: String(raw.closedByLabel || getRoleAuditLabel(closedBy)),
    openingCashUSD: Number(raw.openingCashUSD) || 0,
    openingCashLocal: Number(raw.openingCashLocal) || 0,
    expectedCashUSD: Number(raw.expectedCashUSD) || 0,
    expectedCashLocal: Number(raw.expectedCashLocal) || 0,
    actualCashUSD: Number(raw.actualCashUSD) || 0,
    actualCashLocal: Number(raw.actualCashLocal) || 0,
    varianceUSD: Number(raw.varianceUSD) || 0,
    varianceLocal: Number(raw.varianceLocal) || 0,
    salesUSD: Number(raw.salesUSD) || 0,
    cashSalesUSD: Number(raw.cashSalesUSD) || 0,
    cashSalesLocal: Number(raw.cashSalesLocal) || 0,
    cardSalesUSD: Number(raw.cardSalesUSD) || 0,
    mobileSalesUSD: Number(raw.mobileSalesUSD) || 0,
    splitCashUSD: Number(raw.splitCashUSD) || 0,
    splitCashLocal: Number(raw.splitCashLocal) || 0,
    debtCashUSD: Number(raw.debtCashUSD) || 0,
    debtCashLocal: Number(raw.debtCashLocal) || 0,
    debtRecordedUSD: Number(raw.debtRecordedUSD) || 0,
    totalExpensesUSD: Number(raw.totalExpensesUSD) || 0,
    totalExpensesLocal: Number(raw.totalExpensesLocal) || 0,
    transactionCount: Number(raw.transactionCount) || 0,
    auditSignature: String(raw.auditSignature || 'N/A'),
    note: String(raw.note || ''),
  };
}

function normalizeExpense(raw: Partial<Expense>): Expense | null {
  if (!raw?.id || !raw?.shiftSequence || !raw?.date) return null;
  const category: ExpenseCategory =
    raw.category === 'supplier' ||
    raw.category === 'bills' ||
    raw.category === 'salaries' ||
    raw.category === 'petty_cash' ||
    raw.category === 'other'
      ? raw.category
      : 'other';
  const currency = raw.currency === 'USD' ? 'USD' : 'LBP';
  return {
    id: String(raw.id),
    amount: Math.max(0, Number(raw.amount) || 0),
    currency,
    category,
    description: String(raw.description || ''),
    date: String(raw.date),
    shiftSequence: String(raw.shiftSequence),
    recordedBy: String(raw.recordedBy || 'CASHIER'),
  };
}

function normalizeAuditRecord(raw: Partial<AuditRecord>): AuditRecord | null {
  if (!raw?.id || !raw?.timestamp || !raw?.expenseId) return null;
  const eventType: AuditEventType | null =
    raw.eventType === 'EXPENSE_EDITED' || raw.eventType === 'EXPENSE_DELETED'
      ? raw.eventType
      : null;
  if (!eventType) return null;

  const requesterRole: UserRole =
    raw.requesterRole === 'admin' || raw.requesterRole === 'owner' || raw.requesterRole === 'cashier'
      ? raw.requesterRole
      : 'cashier';
  const approverRole: UserRole =
    raw.approverRole === 'admin' || raw.approverRole === 'owner' || raw.approverRole === 'cashier'
      ? raw.approverRole
      : requesterRole;
  const before =
    raw.before && typeof raw.before === 'object' ? normalizeExpense(raw.before as Partial<Expense>) : null;
  const after =
    raw.after && typeof raw.after === 'object' ? normalizeExpense(raw.after as Partial<Expense>) : null;
  const fallbackTime = String(raw.timestamp);

  return {
    id: String(raw.id),
    eventType,
    timestamp: fallbackTime,
    requestedAt: String(raw.requestedAt || fallbackTime),
    approvedAt: String(raw.approvedAt || raw.timestamp || fallbackTime),
    shiftSequence: String(raw.shiftSequence || before?.shiftSequence || after?.shiftSequence || ''),
    expenseId: String(raw.expenseId),
    requesterRole,
    requesterLabel: String(raw.requesterLabel || getRoleAuditLabel(requesterRole)),
    approverRole,
    approverLabel: String(raw.approverLabel || getRoleAuditLabel(approverRole)),
    overrideUsed: Boolean(raw.overrideUsed),
    before,
    after,
  };
}

function getStockStatus(stock: number, minStockLevel: number = 10): Product['stockStatus'] {
  if (stock <= 0) return 'out-of-stock';
  if (stock <= Math.max(1, minStockLevel)) return 'low-stock';
  return 'in-stock';
}

function normalizeProduct(raw: Partial<Product>, index: number): Product | null {
  const name = String(raw.name || '').trim();
  const priceUSD = Number(raw.priceUSD);
  const stock = Number(raw.stock);
  if (!name || !Number.isFinite(priceUSD)) return null;

  const normalizedStock = Number.isFinite(stock) ? Math.max(0, stock) : 0;
  const minStockLevelRaw = Number(raw.minStockLevel);
  const normalizedMinStockLevel = Number.isFinite(minStockLevelRaw)
    ? Math.max(0, Math.floor(minStockLevelRaw))
    : 10;
  const normalizedCost = raw.cost === undefined ? undefined : Number(raw.cost);
  return {
    id: String(raw.id || `import-${Date.now()}-${index}`),
    name,
    nameAr: String(raw.nameAr || name).trim(),
    priceUSD,
    category: String(raw.category || 'Other'),
    barcode: raw.barcode ? String(raw.barcode) : undefined,
    stock: normalizedStock,
    minStockLevel: normalizedMinStockLevel,
    cost: normalizedCost,
    stockStatus: getStockStatus(normalizedStock, normalizedMinStockLevel),
  };
}

const parseCSV = (content: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') {
        i += 1;
      }
      row.push(cell);
      const hasData = row.some((value) => value.trim() !== '');
      if (hasData) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) {
    rows.push(row);
  }

  return rows;
};

const toCSVCell = (value: unknown): string => {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const toCSV = (rows: Array<Array<unknown>>): string =>
  rows.map((row) => row.map((value) => toCSVCell(value)).join(',')).join('\n');

export default function App() {
  // Theme and Language
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (globalThis.window === undefined) return 'light';
    return localStorage.getItem(STORAGE_KEYS.theme) === 'dark' ? 'dark' : 'light';
  });
  const [lang, setLang] = useState<Language>(() => {
    if (globalThis.window === undefined) return 'en';
    return localStorage.getItem(STORAGE_KEYS.language) === 'ar' ? 'ar' : 'en';
  });
  const { t } = useTranslation(lang);
  const [activeRole, setActiveRole] = useState<UserRole | null>(() => {
    if (globalThis.window === undefined) return null;
    const stored = sessionStorage.getItem(ROLE_SESSION_KEY);
    return stored === 'admin' || stored === 'owner' || stored === 'cashier' ? stored : null;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const pinInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeBufferRef = useRef('');
  const barcodeLastKeyTimeRef = useRef(0);

  // Online/Offline status
  const [isOnline, setIsOnline] = useState(
    globalThis.navigator === undefined ? true : globalThis.navigator.onLine
  );

  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    if (globalThis.window === undefined) return mockProducts;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.products);
      if (!raw) return mockProducts;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return mockProducts;
      const normalized = parsed
        .map((p, idx) => normalizeProduct(p, idx))
        .filter((p): p is Product => Boolean(p));
      return normalized.length > 0 ? normalized : mockProducts;
    } catch {
      return mockProducts;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cartDiscountType, setCartDiscountType] = useState<CartDiscountType>('none');
  const [cartDiscountValue, setCartDiscountValue] = useState(0);
  const [bogoEnabled, setBogoEnabled] = useState(false);
  const [cashierDiscountOverrideGranted, setCashierDiscountOverrideGranted] = useState(false);
  const [showManagerOverridePrompt, setShowManagerOverridePrompt] = useState(false);
  const [managerOverridePinInput, setManagerOverridePinInput] = useState('');
  const [managerOverrideError, setManagerOverrideError] = useState('');
  const [managerOverrideAction, setManagerOverrideAction] = useState<ManagerOverrideAction>(null);

  // Settings
  const [settings, setSettings] = useState<Settings>(() => {
    if (globalThis.window === undefined) return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      if (!raw) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const requirePin = settings.requirePin !== false;
  const isAdmin = activeRole === 'admin' || activeRole === 'owner';
  const isCashier = activeRole === 'cashier';
  const canApplyGlobalCartDiscount = isAdmin || (isCashier && cashierDiscountOverrideGranted);
  const isLocked = requirePin && activeRole === null;

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (globalThis.window === undefined) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.transactions);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((transaction) => ({
        ...transaction,
        date: new Date(transaction.date),
      })) as Transaction[];
    } catch {
      return [];
    }
  });
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    if (globalThis.window === undefined) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.heldCarts);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((cart) => Array.isArray(cart?.items))
        .map((cart) => ({
          ...cart,
          discountAmount: Number(cart.discountAmount) || 0,
          cartDiscountType:
            cart.cartDiscountType === 'percent' || cart.cartDiscountType === 'amount'
              ? cart.cartDiscountType
              : 'none',
          cartDiscountValue: Number(cart.cartDiscountValue) || 0,
          bogoEnabled: Boolean(cart.bogoEnabled),
        })) as HeldCart[];
    } catch {
      return [];
    }
  });
  const [activeShift, setActiveShift] = useState<ShiftSession | null>(() => {
    if (globalThis.window === undefined) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.activeShift);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<ShiftSession>;
      return normalizeShiftSession(parsed);
    } catch {
      return null;
    }
  });
  const [shiftReports, setShiftReports] = useState<ShiftReport[]>(() => {
    if (globalThis.window === undefined) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.shiftReports);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((report) => normalizeShiftReport(report as Partial<ShiftReport>))
        .filter((report): report is ShiftReport => Boolean(report));
    } catch {
      return [];
    }
  });
  const [shiftSequenceCounter, setShiftSequenceCounter] = useState<number>(() => {
    if (globalThis.window === undefined) return 1;
    const stored = Number(localStorage.getItem(STORAGE_KEYS.shiftSequence));
    if (Number.isFinite(stored) && stored >= 1) {
      return Math.floor(stored);
    }

    let maxSequence = 0;
    try {
      const activeRaw = localStorage.getItem(STORAGE_KEYS.activeShift);
      if (activeRaw) {
        const activeParsed = normalizeShiftSession(JSON.parse(activeRaw) as Partial<ShiftSession>);
        maxSequence = Math.max(maxSequence, activeParsed?.sequenceNumber || 0);
      }
    } catch {
      // Ignore active-shift parsing errors.
    }
    try {
      const reportsRaw = localStorage.getItem(STORAGE_KEYS.shiftReports);
      if (reportsRaw) {
        const parsedReports = JSON.parse(reportsRaw);
        if (Array.isArray(parsedReports)) {
          parsedReports.forEach((report, index) => {
            const normalized = normalizeShiftReport(report as Partial<ShiftReport>);
            maxSequence = Math.max(maxSequence, normalized?.sequenceNumber || 0, index + 1);
          });
        }
      }
    } catch {
      // Ignore report parsing errors.
    }
    return maxSequence + 1;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (globalThis.window === undefined) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.expenses);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((expense) => normalizeExpense(expense as Partial<Expense>))
        .filter((expense): expense is Expense => Boolean(expense));
    } catch {
      return [];
    }
  });
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(() => {
    if (globalThis.window === undefined) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.auditLogs);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => normalizeAuditRecord(entry as Partial<AuditRecord>))
        .filter((entry): entry is AuditRecord => Boolean(entry));
    } catch {
      return [];
    }
  });

  // Modals
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDebtReport, setShowDebtReport] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showLowStockReport, setShowLowStockReport] = useState(false);
  const [showShiftManager, setShowShiftManager] = useState(false);
  const [showPWABanner, setShowPWABanner] = useState(() => {
    if (globalThis.window === undefined) return false;
    return localStorage.getItem(STORAGE_KEYS.pwaBannerDismissed) !== '1';
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editDraft, setEditDraft] = useState({
    name: '',
    nameAr: '',
    priceUSD: '',
    stock: '',
    minStockLevel: '10',
  });
  const [discountEditor, setDiscountEditor] = useState<{ productId: string; value: string } | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [openShiftCashInput, setOpenShiftCashInput] = useState('');
  const [openShiftCashLocalInput, setOpenShiftCashLocalInput] = useState('');
  const [openShiftOperatorInput, setOpenShiftOperatorInput] = useState('');
  const [openShiftNoteInput, setOpenShiftNoteInput] = useState('');
  const [closeShiftOperatorInput, setCloseShiftOperatorInput] = useState('');
  const [closeShiftActualCashInput, setCloseShiftActualCashInput] = useState('');
  const [closeShiftActualCashLocalInput, setCloseShiftActualCashLocalInput] = useState('');
  const [closeShiftNoteInput, setCloseShiftNoteInput] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [pendingExpenseEditAuditContext, setPendingExpenseEditAuditContext] = useState<{
    expenseId: string;
    context: ExpenseAuditContext;
  } | null>(null);
  const [isClosingShift, setIsClosingShift] = useState(false);

  const importProductsInputRef = useRef<HTMLInputElement | null>(null);
  const importProductsCsvInputRef = useRef<HTMLInputElement | null>(null);
  const restoreBackupInputRef = useRef<HTMLInputElement | null>(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  // Apply RTL for Arabic
  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.language, lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (globalThis.window === undefined) return;
    if (activeRole) {
      sessionStorage.setItem(ROLE_SESSION_KEY, activeRole);
    } else {
      sessionStorage.removeItem(ROLE_SESSION_KEY);
    }
  }, [activeRole]);

  useEffect(() => {
    if (activeRole !== 'cashier') {
      setCashierDiscountOverrideGranted(false);
      setShowManagerOverridePrompt(false);
      setManagerOverridePinInput('');
      setManagerOverrideError('');
      setManagerOverrideAction(null);
    }
    if (!activeRole) {
      setPendingExpenseEditAuditContext(null);
    }
  }, [activeRole]);

  useEffect(() => {
    if (!showExpenses) {
      setEditingExpenseId(null);
      setPendingExpenseEditAuditContext(null);
    }
  }, [showExpenses]);

  useEffect(() => {
    if (!requirePin) {
      setActiveRole('admin');
      setPinError('');
      setPinInput('');
      return;
    }
    if (!activeRole) {
      globalThis.setTimeout(() => pinInputRef.current?.focus(), 10);
    }
  }, [requirePin, activeRole]);

  useEffect(() => {
    if (isAdmin) return;
    setShowAnalytics(false);
    setShowHistory(false);
    setShowSettings(false);
    setShowDebtReport(false);
    setShowAuditLogs(false);
  }, [isAdmin]);

  useEffect(() => {
    const serializable = transactions.map((transaction) => ({
      ...transaction,
      date: transaction.date.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(serializable));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.heldCarts, JSON.stringify(heldCarts));
  }, [heldCarts]);

  useEffect(() => {
    if (activeShift) {
      localStorage.setItem(STORAGE_KEYS.activeShift, JSON.stringify(activeShift));
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeShift);
    }
  }, [activeShift]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.shiftReports, JSON.stringify(shiftReports));
  }, [shiftReports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.shiftSequence,
      String(Math.max(1, Math.floor(shiftSequenceCounter || 1)))
    );
  }, [shiftSequenceCounter]);

  useEffect(() => {
    const maxFromReports = shiftReports.reduce(
      (max, report) => Math.max(max, Number(report.sequenceNumber) || 0),
      0
    );
    const maxFromActive = activeShift?.sequenceNumber || 0;
    const suggestedNext = Math.max(maxFromReports, maxFromActive, 0) + 1;
    setShiftSequenceCounter((prev) => (prev < suggestedNext ? suggestedNext : prev));
  }, [shiftReports, activeShift]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);
    return () => {
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as InstallPromptEvent);
      setShowPWABanner(localStorage.getItem(STORAGE_KEYS.pwaBannerDismissed) !== '1');
    };

    const handleInstalled = () => {
      setDeferredInstallPrompt(null);
      setShowPWABanner(false);
      localStorage.setItem(STORAGE_KEYS.pwaBannerDismissed, '1');
    };

    globalThis.addEventListener('beforeinstallprompt', handleBeforeInstall);
    globalThis.addEventListener('appinstalled', handleInstalled);
    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      globalThis.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (settings.exchangeRateSource !== 'auto') return;

    let disposed = false;
    const fetchRate = async () => {
      if (!navigator.onLine) return;

      try {
        const primaryResp = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (primaryResp.ok) {
          const primaryData = await primaryResp.json();
          const next = Number(primaryData?.rates?.[settings.localCurrency]);
          if (Number.isFinite(next) && next > 0 && !disposed) {
            setSettings((prev) =>
              prev.exchangeRateSource === 'auto'
                ? { ...prev, exchangeRate: next }
                : prev
            );
            return;
          }
        }
      } catch {
        // Try fallback below.
      }

      try {
        const fallbackResp = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!fallbackResp.ok) return;
        const fallbackData = await fallbackResp.json();
        const next = Number(fallbackData?.rates?.[settings.localCurrency]);
        if (Number.isFinite(next) && next > 0 && !disposed) {
          setSettings((prev) =>
            prev.exchangeRateSource === 'auto'
              ? { ...prev, exchangeRate: next }
              : prev
          );
        }
      } catch {
        // Keep the last known exchange rate if all requests fail.
      }
    };

    fetchRate();
    const interval = globalThis.setInterval(fetchRate, 60_000);
    return () => {
      disposed = true;
      globalThis.clearInterval(interval);
    };
  }, [settings.exchangeRateSource, settings.localCurrency]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.nameAr.includes(searchQuery);
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);
  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => product.stock <= (product.minStockLevel ?? 10))
      .sort((a, b) => a.stock - b.stock);
  }, [products]);
  const inventoryForecast = useMemo(() => {
    const today = new Date();
    const windowDays = 30;
    const windowStart = new Date(today);
    windowStart.setHours(0, 0, 0, 0);
    windowStart.setDate(windowStart.getDate() - (windowDays - 1));
    const windowStartMs = windowStart.getTime();

    const soldQtyByProductId = new Map<string, number>();
    transactions
      .filter((transaction) => transaction.status === 'completed' && transaction.date.getTime() >= windowStartMs)
      .forEach((transaction) => {
        transaction.items.forEach((item) => {
          const current = soldQtyByProductId.get(item.product.id) || 0;
          soldQtyByProductId.set(item.product.id, current + item.quantity);
        });
      });

    return products
      .map<InventoryForecast>((product) => {
        const totalSold = soldQtyByProductId.get(product.id) || 0;
        const avgDailySales = totalSold / windowDays;
        const daysUntilStockout = avgDailySales > 0 ? product.stock / avgDailySales : null;
        return {
          productId: product.id,
          name: product.name,
          nameAr: product.nameAr,
          stock: product.stock,
          avgDailySales,
          daysUntilStockout,
        };
      })
      .sort((a, b) => {
        const daysA = a.daysUntilStockout ?? Number.POSITIVE_INFINITY;
        const daysB = b.daysUntilStockout ?? Number.POSITIVE_INFINITY;
        return daysA - daysB;
      });
  }, [products, transactions]);
  const forecastByProductId = useMemo(
    () => new Map(inventoryForecast.map((item) => [item.productId, item])),
    [inventoryForecast]
  );
  const forecastAlerts = useMemo(
    () => inventoryForecast.filter((item) => item.daysUntilStockout !== null).slice(0, 6),
    [inventoryForecast]
  );

  // Calculate cart totals
  const cartTotals = useMemo(() => {
    return calculateCartTotal(cartItems, settings.taxRate, discountAmount, {
      cartDiscountType,
      cartDiscountValue,
      bogoEnabled,
    });
  }, [cartItems, settings.taxRate, discountAmount, cartDiscountType, cartDiscountValue, bogoEnabled]);

  const totalLocal = cartTotals.total * settings.exchangeRate;
  const roundUSD = (value: number): number => Math.round(value * 100) / 100;
  const roundLocal = (value: number): number => Math.round(value);
  const activeShiftMetrics = useMemo(() => {
    if (!activeShift) {
      return {
        transactionCount: 0,
        salesUSD: 0,
        cashSalesUSD: 0,
        cashSalesLocal: 0,
        cardSalesUSD: 0,
        mobileSalesUSD: 0,
        splitCashUSD: 0,
        splitCashLocal: 0,
        debtCashUSD: 0,
        debtCashLocal: 0,
        debtRecordedUSD: 0,
        totalExpensesUSD: 0,
        totalExpensesLocal: 0,
        expectedCashUSD: 0,
        expectedCashLocal: 0,
      };
    }

    const shiftTransactions = transactions.filter(
      (transaction) => transaction.status === 'completed' && transaction.shiftId === activeShift.id
    );
    const shiftExpenses = expenses.filter((expense) => expense.shiftSequence === activeShift.sequenceCode);

    let salesUSD = 0;
    let cashSalesUSD = 0;
    let cashSalesLocal = 0;
    let cardSalesUSD = 0;
    let mobileSalesUSD = 0;
    let splitCashUSD = 0;
    let splitCashLocal = 0;
    let debtCashUSD = 0;
    let debtCashLocal = 0;
    let debtRecordedUSD = 0;
    let totalExpensesUSD = 0;
    let totalExpensesLocal = 0;

    shiftTransactions.forEach((transaction) => {
      salesUSD += Number(transaction.totalUSD) || 0;

      if (transaction.paymentMethod === 'cash') {
        const paidUSD = Number(transaction.amountPaidUSD) || 0;
        const paidLocal = Number(transaction.amountPaidLocal) || 0;
        if (paidLocal > 0 && paidUSD <= 0) {
          cashSalesLocal += paidLocal;
        } else {
          cashSalesUSD += Number(transaction.totalUSD) || 0;
        }
      } else if (transaction.paymentMethod === 'card') {
        cardSalesUSD += Number(transaction.totalUSD) || 0;
      } else if (transaction.paymentMethod === 'mobile') {
        mobileSalesUSD += Number(transaction.totalUSD) || 0;
      } else if (transaction.paymentMethod === 'split') {
        const usdPart = Number(transaction.amountPaidUSD) || 0;
        const localPart = Number(transaction.amountPaidLocal) || 0;
        splitCashUSD += usdPart;
        splitCashLocal += localPart;
      } else if (transaction.paymentMethod === 'debt') {
        debtCashUSD += Math.max(0, Number(transaction.partialPayment) || 0);
        debtCashLocal += Math.max(0, Number(transaction.partialPaymentLocal) || 0);
        debtRecordedUSD += Math.max(0, Number(transaction.debtAmount) || 0);
      }
    });

    shiftExpenses.forEach((expense) => {
      if (expense.currency === 'USD') {
        totalExpensesUSD += Math.max(0, Number(expense.amount) || 0);
      } else {
        totalExpensesLocal += Math.max(0, Number(expense.amount) || 0);
      }
    });

    const expectedCashUSD =
      activeShift.openingCashUSD + cashSalesUSD + splitCashUSD + debtCashUSD - totalExpensesUSD;
    const expectedCashLocal =
      activeShift.openingCashLocal + cashSalesLocal + splitCashLocal + debtCashLocal - totalExpensesLocal;
    return {
      transactionCount: shiftTransactions.length,
      salesUSD: roundUSD(salesUSD),
      cashSalesUSD: roundUSD(cashSalesUSD),
      cashSalesLocal: roundLocal(cashSalesLocal),
      cardSalesUSD: roundUSD(cardSalesUSD),
      mobileSalesUSD: roundUSD(mobileSalesUSD),
      splitCashUSD: roundUSD(splitCashUSD),
      splitCashLocal: roundLocal(splitCashLocal),
      debtCashUSD: roundUSD(debtCashUSD),
      debtCashLocal: roundLocal(debtCashLocal),
      debtRecordedUSD: roundUSD(debtRecordedUSD),
      totalExpensesUSD: roundUSD(totalExpensesUSD),
      totalExpensesLocal: roundLocal(totalExpensesLocal),
      expectedCashUSD: roundUSD(expectedCashUSD),
      expectedCashLocal: roundLocal(expectedCashLocal),
    };
  }, [activeShift, transactions, expenses]);
  const activeShiftExpenses = useMemo(() => {
    if (!activeShift) return [];
    return expenses
      .filter((expense) => expense.shiftSequence === activeShift.sequenceCode)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, activeShift]);
  const defaultExpenseRecordedBy = activeRole
    ? getRoleAuditLabel(activeRole)
    : activeShift?.openedByLabel || 'CASHIER';
  const getActiveActorRole = (): UserRole =>
    activeRole === 'owner' || activeRole === 'admin' || activeRole === 'cashier'
      ? activeRole
      : 'cashier';
  const createSelfExpenseAuditContext = (): ExpenseAuditContext => {
    const role = getActiveActorRole();
    const now = new Date().toISOString();
    const label = getRoleAuditLabel(role);
    return {
      requestedByRole: role,
      requestedByLabel: label,
      requestedAt: now,
      approvedByRole: role,
      approvedByLabel: label,
      approvedAt: now,
      overrideUsed: false,
    };
  };
  const createExpenseAuditRequest = () => {
    const role = getActiveActorRole();
    return {
      requestedByRole: role,
      requestedByLabel: getRoleAuditLabel(role),
      requestedAt: new Date().toISOString(),
    };
  };
  const appendExpenseAuditRecord = (
    eventType: AuditEventType,
    expenseId: string,
    before: Expense | null,
    after: Expense | null,
    context: ExpenseAuditContext
  ) => {
    const timestamp = new Date().toISOString();
    const record: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType,
      timestamp,
      requestedAt: context.requestedAt,
      approvedAt: context.approvedAt,
      shiftSequence: before?.shiftSequence || after?.shiftSequence || activeShift?.sequenceCode || '',
      expenseId,
      requesterRole: context.requestedByRole,
      requesterLabel: context.requestedByLabel,
      approverRole: context.approvedByRole,
      approverLabel: context.approvedByLabel,
      overrideUsed: context.overrideUsed,
      before,
      after,
    };
    setAuditLogs((prev) => [record, ...prev].slice(0, MAX_AUDIT_LOGS));
  };

  const handleAddExpense = (payload: {
    amount: number;
    currency: 'USD' | 'LBP';
    category: ExpenseCategory;
    description: string;
    recordedBy: string;
  }) => {
    if (!activeShift) {
      alert(lang === 'ar' ? 'افتح وردية أولاً.' : 'Open a shift first.');
      return;
    }
    const expense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      amount: Math.max(0, Number(payload.amount) || 0),
      currency: payload.currency,
      category: payload.category,
      description: payload.description.trim(),
      date: new Date().toISOString(),
      shiftSequence: activeShift.sequenceCode,
      recordedBy: payload.recordedBy.trim() || defaultExpenseRecordedBy,
    };
    setExpenses((prev) => [expense, ...prev].slice(0, 2000));
  };

  const handleUpdateExpense = (
    expenseId: string,
    payload: {
      amount: number;
      currency: 'USD' | 'LBP';
      category: ExpenseCategory;
      description: string;
      recordedBy: string;
    }
  ) => {
    const previousExpense = expenses.find((expense) => expense.id === expenseId);
    if (!previousExpense) return;
    const nextExpense: Expense = {
      ...previousExpense,
      amount: Math.max(0, Number(payload.amount) || 0),
      currency: payload.currency,
      category: payload.category,
      description: payload.description.trim(),
      recordedBy: payload.recordedBy.trim() || defaultExpenseRecordedBy,
    };
    const changed =
      previousExpense.amount !== nextExpense.amount ||
      previousExpense.currency !== nextExpense.currency ||
      previousExpense.category !== nextExpense.category ||
      previousExpense.description !== nextExpense.description ||
      previousExpense.recordedBy !== nextExpense.recordedBy;
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === expenseId
          ? nextExpense
          : expense
      )
    );
    if (changed) {
      const auditContext =
        pendingExpenseEditAuditContext?.expenseId === expenseId
          ? pendingExpenseEditAuditContext.context
          : createSelfExpenseAuditContext();
      appendExpenseAuditRecord('EXPENSE_EDITED', expenseId, previousExpense, nextExpense, auditContext);
    }
    if (pendingExpenseEditAuditContext?.expenseId === expenseId) {
      setPendingExpenseEditAuditContext(null);
    }
    setEditingExpenseId(null);
  };

  const handleDeleteExpense = (expenseId: string, auditContext?: ExpenseAuditContext) => {
    const targetExpense = expenses.find((expense) => expense.id === expenseId);
    if (!targetExpense) return;
    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
    appendExpenseAuditRecord(
      'EXPENSE_DELETED',
      expenseId,
      targetExpense,
      null,
      auditContext || createSelfExpenseAuditContext()
    );
    if (editingExpenseId === expenseId) {
      setEditingExpenseId(null);
    }
    if (pendingExpenseEditAuditContext?.expenseId === expenseId) {
      setPendingExpenseEditAuditContext(null);
    }
  };

  const cloneCartItems = (items: CartItemType[]): CartItemType[] =>
    items.map((item) => ({
      ...item,
      product: { ...item.product },
    }));
  const createHeldCart = (
    items: CartItemType[],
    discount: number,
    nextCartDiscountType: CartDiscountType,
    nextCartDiscountValue: number,
    nextBogoEnabled: boolean
  ): HeldCart => ({
    id: `held-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: `H-${new Date().toISOString().slice(11, 19)}`,
    items: cloneCartItems(items),
    discountAmount: discount,
    cartDiscountType: nextCartDiscountType,
    cartDiscountValue: nextCartDiscountValue,
    bogoEnabled: nextBogoEnabled,
    createdAt: new Date().toISOString(),
  });

  const applyManagerOverrideAction = (
    action: ManagerOverrideAction,
    managerApproval?: {
      approvedByRole: UserRole;
      approvedByLabel: string;
      approvedAt: string;
    }
  ) => {
    if (!action) return;
    if (action.type === 'set-cart-discount-type') {
      setCartDiscountType(action.value);
      if (action.value === 'none') {
        setCartDiscountValue(0);
      }
      return;
    }
    if (action.type === 'toggle-bogo') {
      setBogoEnabled(action.value);
      return;
    }
    if (action.type === 'edit-expense') {
      if (managerApproval) {
        setPendingExpenseEditAuditContext({
          expenseId: action.expenseId,
          context: {
            requestedByRole: action.requestedByRole,
            requestedByLabel: action.requestedByLabel,
            requestedAt: action.requestedAt,
            approvedByRole: managerApproval.approvedByRole,
            approvedByLabel: managerApproval.approvedByLabel,
            approvedAt: managerApproval.approvedAt,
            overrideUsed: true,
          },
        });
      }
      setShowExpenses(true);
      setEditingExpenseId(action.expenseId);
      return;
    }
    if (action.type === 'delete-expense') {
      if (managerApproval) {
        handleDeleteExpense(action.expenseId, {
          requestedByRole: action.requestedByRole,
          requestedByLabel: action.requestedByLabel,
          requestedAt: action.requestedAt,
          approvedByRole: managerApproval.approvedByRole,
          approvedByLabel: managerApproval.approvedByLabel,
          approvedAt: managerApproval.approvedAt,
          overrideUsed: true,
        });
        setShowExpenses(true);
        return;
      }
      handleDeleteExpense(action.expenseId);
    }
  };

  const isDiscountOverrideAction = (action: ManagerOverrideAction): boolean =>
    !action || action.type === 'set-cart-discount-type' || action.type === 'toggle-bogo';

  const requestManagerOverride = (action: ManagerOverrideAction = null) => {
    if (isAdmin) {
      applyManagerOverrideAction(action);
      return;
    }
    if (!isCashier) return;
    if (showManagerOverridePrompt) return;
    if (action?.type === 'edit-expense' || action?.type === 'delete-expense') {
      setShowExpenses(false);
    }
    setManagerOverrideAction(action);
    setManagerOverridePinInput('');
    setManagerOverrideError('');
    setShowManagerOverridePrompt(true);
  };

  const handleApproveManagerOverride = () => {
    const pin = managerOverridePinInput.trim();
    const adminPin = String(settings.adminPin || DEFAULT_SETTINGS.adminPin);
    const ownerPin = String(settings.ownerPin || DEFAULT_SETTINGS.ownerPin);
    if (!pin || (pin !== adminPin && pin !== ownerPin)) {
      setManagerOverrideError(
        lang === 'ar' ? 'رمز المدير/المالك غير صحيح.' : 'Invalid Manager/Owner PIN.'
      );
      return;
    }

    const approverRole: UserRole = pin === ownerPin ? 'owner' : 'admin';
    const managerApproval = {
      approvedByRole: approverRole,
      approvedByLabel: getRoleAuditLabel(approverRole),
      approvedAt: new Date().toISOString(),
    };
    if (isDiscountOverrideAction(managerOverrideAction)) {
      setCashierDiscountOverrideGranted(true);
    }
    applyManagerOverrideAction(managerOverrideAction, managerApproval);
    setShowManagerOverridePrompt(false);
    setManagerOverridePinInput('');
    setManagerOverrideError('');
    setManagerOverrideAction(null);
  };

  const handleCloseManagerOverridePrompt = () => {
    setShowManagerOverridePrompt(false);
    setManagerOverridePinInput('');
    setManagerOverrideError('');
    setManagerOverrideAction(null);
  };

  const handleSelectCartDiscountType = (nextType: CartDiscountType) => {
    if (nextType === 'none') {
      setCartDiscountType('none');
      setCartDiscountValue(0);
      return;
    }
    if (!canApplyGlobalCartDiscount) {
      requestManagerOverride({ type: 'set-cart-discount-type', value: nextType });
      return;
    }
    setCartDiscountType(nextType);
  };

  const handleCartDiscountValueChange = (rawValue: string) => {
    if (!canApplyGlobalCartDiscount) {
      requestManagerOverride();
      return;
    }
    const parsed = Math.max(0, Number(rawValue) || 0);
    setCartDiscountValue(cartDiscountType === 'percent' ? Math.min(100, parsed) : parsed);
  };

  const handleToggleBogoOffer = (enabled: boolean) => {
    if (!enabled) {
      setBogoEnabled(false);
      return;
    }
    if (!canApplyGlobalCartDiscount) {
      requestManagerOverride({ type: 'toggle-bogo', value: true });
      return;
    }
    setBogoEnabled(true);
  };

  const requestExpenseEdit = (expenseId: string) => {
    if (isAdmin) {
      setPendingExpenseEditAuditContext({
        expenseId,
        context: createSelfExpenseAuditContext(),
      });
      setEditingExpenseId(expenseId);
      setShowExpenses(true);
      return;
    }
    requestManagerOverride({
      type: 'edit-expense',
      expenseId,
      ...createExpenseAuditRequest(),
    });
  };

  const requestExpenseDelete = (expenseId: string) => {
    if (isAdmin) {
      handleDeleteExpense(expenseId, createSelfExpenseAuditContext());
      return;
    }
    requestManagerOverride({
      type: 'delete-expense',
      expenseId,
      ...createExpenseAuditRequest(),
    });
  };

  const clearCartState = () => {
    setCartItems([]);
    setDiscountAmount(0);
    setCartDiscountType('none');
    setCartDiscountValue(0);
    setBogoEnabled(false);
    setCashierDiscountOverrideGranted(false);
  };

  const handleHoldCurrentCart = () => {
    if (cartItems.length === 0) return;
    const nextHeldCart = createHeldCart(
      cartItems,
      discountAmount,
      cartDiscountType,
      cartDiscountValue,
      bogoEnabled
    );
    setHeldCarts((prev) => [nextHeldCart, ...prev]);
    clearCartState();
  };

  const handleResumeHeldCart = (heldCartId: string) => {
    const selected = heldCarts.find((cart) => cart.id === heldCartId);
    if (!selected) return;

    setHeldCarts((prev) => {
      const remaining = prev.filter((cart) => cart.id !== heldCartId);
      if (cartItems.length === 0) return remaining;
      const parkedCurrent = createHeldCart(
        cartItems,
        discountAmount,
        cartDiscountType,
        cartDiscountValue,
        bogoEnabled
      );
      return [parkedCurrent, ...remaining];
    });

    setCartItems(cloneCartItems(selected.items));
    setDiscountAmount(selected.discountAmount || 0);
    setCartDiscountType(selected.cartDiscountType || 'none');
    setCartDiscountValue(Number(selected.cartDiscountValue) || 0);
    setBogoEnabled(Boolean(selected.bogoEnabled));
    setCashierDiscountOverrideGranted(false);
    setShowHeldCarts(false);
  };

  const handleDeleteHeldCart = (heldCartId: string) => {
    setHeldCarts((prev) => prev.filter((cart) => cart.id !== heldCartId));
  };

  // Cart handlers
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(lang === 'ar' ? 'هذا المنتج غير متوفر حاليا.' : 'This product is out of stock.');
      return;
    }

    const existingItem = cartItems.find((item) => item.product.id === product.id);
    if (existingItem && existingItem.quantity >= product.stock) {
      alert(
        lang === 'ar'
          ? 'لا يمكن إضافة كمية أكبر من المخزون المتاح.'
          : 'Cannot add more than available stock.'
      );
      return;
    }

    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCartItems([...cartItems, { product, quantity: 1, discount: 0 }]);
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const clampedQty = Math.max(0, Math.min(quantity, product.stock));
    if (clampedQty === 0) {
      setCartItems(cartItems.filter((item) => item.product.id !== productId));
      return;
    }

    setCartItems(
      cartItems.map((item) =>
        item.product.id === productId ? { ...item, quantity: clampedQty } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.product.id !== productId));
  };

  const handleApplyItemDiscount = (productId: string) => {
    const existingItem = cartItems.find((item) => item.product.id === productId);
    setDiscountEditor({
      productId,
      value: existingItem ? String(existingItem.discount) : '0',
    });
  };

  const handleClearCart = () => {
    setShowClearCartConfirm(true);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (!activeShift) {
      alert(
        lang === 'ar'
          ? 'يجب فتح وردية قبل إتمام عمليات البيع.'
          : 'You need to open a shift before processing sales.'
      );
      setShowShiftManager(true);
      return;
    }
    setShowPayment(true);
  };

  const handleCompletePayment = (transaction: Transaction) => {
    const soldByProductId = new Map(
      cartItems.map((item) => [item.product.id, item.quantity])
    );

    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        const soldQty = soldByProductId.get(product.id);
        if (!soldQty) return product;
        const nextStock = Math.max(0, product.stock - soldQty);
        const minStockLevel = product.minStockLevel ?? 10;
        return {
          ...product,
          stock: nextStock,
          stockStatus: getStockStatus(nextStock, minStockLevel),
        };
      })
    );

    const enrichedTransaction: Transaction = {
      ...transaction,
      shiftId: activeShift?.id,
      bogoEnabled,
      bogoDiscount: cartTotals.bogoDiscount,
      cartDiscountType,
      cartDiscountValue,
      cartDiscountApplied: cartTotals.cartDiscount + discountAmount,
    };

    setTransactions((prev) => [enrichedTransaction, ...prev]);
    setSelectedTransaction(enrichedTransaction);
    clearCartState();
    setShowPayment(false);
    setShowReceipt(true);
  };

  const handleExchangeRateChange = (rate: number, source: 'manual' | 'auto') => {
    if (!isAdmin) return;
    setSettings((prev) => ({
      ...prev,
      exchangeRate: Math.max(0.000001, rate),
      exchangeRateSource: source,
    }));
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditDraft({
      name: product.name,
      nameAr: product.nameAr,
      priceUSD: String(product.priceUSD),
      stock: String(product.stock),
      minStockLevel: String(product.minStockLevel ?? 10),
    });
  };

  const handleDeleteProduct = (product: Product) => {
    setPendingDeleteProduct(product);
  };

  const handleSaveProductEdit = () => {
    if (!editingProduct) return;

    const nextName = editDraft.name.trim();
    const nextNameAr = editDraft.nameAr.trim() || nextName;
    const nextPrice = Number(editDraft.priceUSD);
    const nextStock = Math.floor(Number(editDraft.stock));
    const nextMinStockLevel = Math.floor(Number(editDraft.minStockLevel));

    if (
      !nextName ||
      !Number.isFinite(nextPrice) ||
      nextPrice < 0 ||
      !Number.isFinite(nextStock) ||
      nextStock < 0 ||
      !Number.isFinite(nextMinStockLevel) ||
      nextMinStockLevel < 0
    ) {
      alert(lang === 'ar' ? 'قيمة غير صالحة.' : 'Invalid values entered.');
      return;
    }

    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: nextName,
              nameAr: nextNameAr,
              priceUSD: nextPrice,
              stock: nextStock,
              minStockLevel: nextMinStockLevel,
              stockStatus: getStockStatus(nextStock, nextMinStockLevel),
            }
          : p
      )
    );

    setEditingProduct(null);
  };

  const handleConfirmDeleteProduct = () => {
    if (!pendingDeleteProduct) return;

    setProducts((prevProducts) => prevProducts.filter((p) => p.id !== pendingDeleteProduct.id));
    setCartItems((prevCartItems) => prevCartItems.filter((item) => item.product.id !== pendingDeleteProduct.id));
    setPendingDeleteProduct(null);
  };

  const handleSaveDiscount = () => {
    if (!discountEditor) return;
    const discountValue = Math.min(100, Math.max(0, Number.parseFloat(discountEditor.value) || 0));
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === discountEditor.productId
          ? { ...item, discount: discountValue }
          : item
      )
    );
    setDiscountEditor(null);
  };

  const handleExportProducts = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      products,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `products-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const source = Array.isArray(parsed) ? parsed : parsed?.products;
      if (!Array.isArray(source)) {
        alert(lang === 'ar' ? 'تنسيق ملف المنتجات غير صالح.' : 'Invalid products file format.');
        return;
      }

      const normalized = source
        .map((product: Partial<Product>, index: number) => normalizeProduct(product, index))
        .filter((product: Product | null): product is Product => Boolean(product));

      if (normalized.length === 0) {
        alert(lang === 'ar' ? 'لا توجد منتجات صالحة للاستيراد.' : 'No valid products found to import.');
        return;
      }

      setProducts(normalized);
      setCartItems([]);
    } catch {
      alert(lang === 'ar' ? 'تعذر قراءة ملف المنتجات.' : 'Failed to read products file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleExportProductsCSV = () => {
    const headers = [
      'id',
      'name',
      'nameAr',
      'priceUSD',
      'category',
      'barcode',
      'stock',
      'minStockLevel',
      'cost',
      'stockStatus',
    ];
    const rows: Array<Array<unknown>> = [
      headers,
      ...products.map((product) => [
        product.id,
        product.name,
        product.nameAr,
        product.priceUSD,
        product.category,
        product.barcode || '',
        product.stock,
        product.minStockLevel ?? 10,
        product.cost ?? '',
        product.stockStatus,
      ]),
    ];
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportProductsCSVFile = async (file: File) => {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      let rows: string[][];

      if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          alert(lang === 'ar' ? 'ملف Excel لا يحتوي على أوراق.' : 'Excel file has no sheets.');
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const sheetRows = XLSX.utils.sheet_to_json<Array<string | number | boolean>>(worksheet, {
          header: 1,
          raw: false,
          defval: '',
        });
        rows = sheetRows.map((row) => row.map((value) => String(value ?? '')));
      } else {
        const content = await file.text();
        rows = parseCSV(content);
      }

      if (rows.length < 2) {
        alert(
          lang === 'ar'
            ? 'الملف فارغ أو غير صالح (CSV/Excel).'
            : 'Spreadsheet file is empty or invalid (CSV/Excel).'
        );
        return;
      }

      const headerIndex = new Map<string, number>();
      rows[0].forEach((header, index) => {
        headerIndex.set(header.replace(/^\uFEFF/, '').trim().toLowerCase(), index);
      });
      const getCell = (row: string[], ...keys: string[]) => {
        for (const key of keys) {
          const idx = headerIndex.get(key.toLowerCase());
          if (idx === undefined) continue;
          if (idx >= row.length) continue;
          return row[idx];
        }
        return '';
      };

      const normalized = rows
        .slice(1)
        .map((row, index) =>
          normalizeProduct(
            {
              id: getCell(row, 'id'),
              name: getCell(row, 'name', 'product', 'productname'),
              nameAr: getCell(row, 'namear', 'name_ar', 'arabicname'),
              priceUSD: Number(getCell(row, 'priceusd', 'price', 'usd')),
              category: getCell(row, 'category') || 'Other',
              barcode: getCell(row, 'barcode', 'sku'),
              stock: Number(getCell(row, 'stock', 'qty', 'quantity')),
              minStockLevel: Number(getCell(row, 'minstocklevel', 'minstock', 'reorderlevel')),
              cost: getCell(row, 'cost') ? Number(getCell(row, 'cost')) : undefined,
            },
            index
          )
        )
        .filter((product: Product | null): product is Product => Boolean(product));

      if (normalized.length === 0) {
        alert(
          lang === 'ar'
            ? 'لم يتم العثور على صفوف منتجات صالحة.'
            : 'No valid product rows were found in CSV/Excel.'
        );
        return;
      }

      setProducts((prev) => {
        const byId = new Map(prev.map((product) => [product.id, product]));
        const rowsByBarcode = new Map(
          prev
            .filter((product) => product.barcode)
            .map((product) => [String(product.barcode), product.id])
        );

        normalized.forEach((product, idx) => {
          const barcodeKey = product.barcode ? String(product.barcode) : '';
          if (byId.has(product.id)) {
            byId.set(product.id, product);
            return;
          }
          if (barcodeKey && rowsByBarcode.has(barcodeKey)) {
            const existingId = rowsByBarcode.get(barcodeKey)!;
            byId.set(existingId, { ...product, id: existingId });
            return;
          }

          const uniqueId = product.id || `csv-${Date.now()}-${idx}`;
          byId.set(uniqueId, { ...product, id: uniqueId });
          if (barcodeKey) {
            rowsByBarcode.set(barcodeKey, uniqueId);
          }
        });

        return Array.from(byId.values());
      });

      alert(
        lang === 'ar'
          ? `تم استيراد/تحديث ${normalized.length} منتج من CSV/Excel.`
          : `Imported/updated ${normalized.length} products from CSV/Excel.`
      );
    } catch {
      alert(lang === 'ar' ? 'تعذر قراءة ملف CSV/Excel.' : 'Failed to read CSV/Excel file.');
    }
  };

  const openShift = () => {
    if (activeShift) {
      alert(lang === 'ar' ? 'توجد وردية مفتوحة حالياً.' : 'There is already an open shift.');
      return;
    }

    const openingCash = Number(openShiftCashInput);
    if (!Number.isFinite(openingCash) || openingCash < 0) {
      alert(lang === 'ar' ? 'أدخل عهدة نقدية صحيحة.' : 'Please enter a valid opening cash amount.');
      return;
    }
    const openingCashLocal = Number(openShiftCashLocalInput || 0);
    if (!Number.isFinite(openingCashLocal) || openingCashLocal < 0) {
      alert(
        lang === 'ar'
          ? `أدخل عهدة ${settings.localCurrency} صحيحة.`
          : `Please enter a valid opening ${settings.localCurrency} amount.`
      );
      return;
    }

    if (!activeRole) {
      alert(lang === 'ar' ? 'يجب تسجيل الدخول أولاً.' : 'Please unlock the system first.');
      return;
    }

    const sequenceNumber = Math.max(1, Math.floor(shiftSequenceCounter || 1));
    const sequenceCode = formatShiftSequence(sequenceNumber);
    const openedByLabel = openShiftOperatorInput.trim() || getRoleAuditLabel(activeRole);
    setActiveShift({
      id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sequenceNumber,
      sequenceCode,
      openedAt: new Date().toISOString(),
      openedBy: activeRole,
      openedByLabel,
      openingCashUSD: roundUSD(openingCash),
      openingCashLocal: roundLocal(openingCashLocal),
      note: openShiftNoteInput.trim(),
    });
    setShiftSequenceCounter((prev) => Math.max(Math.floor(prev || 1), sequenceNumber + 1));
    setOpenShiftCashInput('');
    setOpenShiftCashLocalInput('');
    setOpenShiftOperatorInput('');
    setOpenShiftNoteInput('');
    setCloseShiftOperatorInput('');
    setCloseShiftActualCashLocalInput('');
  };

  const printShiftReport = (report: ShiftReport) => {
    const printWindow = globalThis.window.open('', '_blank', 'width=420,height=760');
    if (!printWindow) return;

    const storeName = lang === 'ar' ? settings.storeNameAr : settings.storeName;
    const rows: Array<[string, string]> = [
      [lang === 'ar' ? 'المتجر' : 'Store', storeName],
      [lang === 'ar' ? 'رقم الوردية' : 'Shift Sequence', report.sequenceCode],
      [lang === 'ar' ? 'معرّف الوردية' : 'Shift ID', report.shiftId],
      [lang === 'ar' ? 'فتح بواسطة' : 'Opened By', `${report.openedByLabel} (${report.openedBy.toUpperCase()})`],
      [lang === 'ar' ? 'وقت الفتح' : 'Opened At', formatShiftTimestamp(report.openedAt, lang)],
      [lang === 'ar' ? 'إغلاق بواسطة' : 'Closed By', `${report.closedByLabel} (${report.closedBy.toUpperCase()})`],
      [lang === 'ar' ? 'وقت الإغلاق' : 'Closed At', formatShiftTimestamp(report.closedAt, lang)],
      [lang === 'ar' ? 'العهدة الافتتاحية' : 'Opening Cash', formatCurrency(report.openingCashUSD, 'USD')],
      [lang === 'ar' ? `العهدة الافتتاحية (${settings.localCurrency})` : `Opening Cash (${settings.localCurrency})`, formatCurrency(report.openingCashLocal, settings.localCurrency)],
      [lang === 'ar' ? 'مبيعات نقدية' : 'Cash Sales', formatCurrency(report.cashSalesUSD, 'USD')],
      [lang === 'ar' ? `مبيعات نقدية (${settings.localCurrency})` : `Cash Sales (${settings.localCurrency})`, formatCurrency(report.cashSalesLocal, settings.localCurrency)],
      [lang === 'ar' ? 'مبيعات بطاقات' : 'Card Sales', formatCurrency(report.cardSalesUSD, 'USD')],
      [lang === 'ar' ? 'مبيعات محفظة' : 'Mobile Sales', formatCurrency(report.mobileSalesUSD, 'USD')],
      [lang === 'ar' ? 'نقد من دفع مختلط' : 'Split Cash Portion', formatCurrency(report.splitCashUSD, 'USD')],
      [lang === 'ar' ? `جزء الدفع المختلط (${settings.localCurrency})` : `Split Cash (${settings.localCurrency})`, formatCurrency(report.splitCashLocal, settings.localCurrency)],
      [lang === 'ar' ? 'تحصيل ديون (نقد)' : 'Debt Cash Collected', formatCurrency(report.debtCashUSD, 'USD')],
      [lang === 'ar' ? `تحصيل ديون (${settings.localCurrency})` : `Debt Cash (${settings.localCurrency})`, formatCurrency(report.debtCashLocal, settings.localCurrency)],
      [lang === 'ar' ? 'ديون مسجلة' : 'Debt Recorded', formatCurrency(report.debtRecordedUSD, 'USD')],
      [lang === 'ar' ? 'إجمالي المصروفات (USD)' : 'Total Expenses (USD)', formatCurrency(report.totalExpensesUSD, 'USD')],
      [lang === 'ar' ? `إجمالي المصروفات (${settings.localCurrency})` : `Total Expenses (${settings.localCurrency})`, formatCurrency(report.totalExpensesLocal, settings.localCurrency)],
      [lang === 'ar' ? 'النقد المتوقع' : 'Expected Cash', formatCurrency(report.expectedCashUSD, 'USD')],
      [lang === 'ar' ? `النقد المتوقع (${settings.localCurrency})` : `Expected Cash (${settings.localCurrency})`, formatCurrency(report.expectedCashLocal, settings.localCurrency)],
      [lang === 'ar' ? 'النقد الفعلي' : 'Actual Cash', formatCurrency(report.actualCashUSD, 'USD')],
      [lang === 'ar' ? `النقد الفعلي (${settings.localCurrency})` : `Actual Cash (${settings.localCurrency})`, formatCurrency(report.actualCashLocal, settings.localCurrency)],
      [lang === 'ar' ? 'الفارق' : 'Variance', formatCurrency(report.varianceUSD, 'USD')],
      [lang === 'ar' ? `الفارق (${settings.localCurrency})` : `Variance (${settings.localCurrency})`, formatCurrency(report.varianceLocal, settings.localCurrency)],
      [lang === 'ar' ? 'مبيعات الوردية' : 'Sales', formatCurrency(report.salesUSD, 'USD')],
      [lang === 'ar' ? 'عدد العمليات' : 'Transactions', String(report.transactionCount)],
      [lang === 'ar' ? 'توقيع التدقيق' : 'Audit Signature', report.auditSignature],
    ];

    if (report.note.trim()) {
      rows.push([lang === 'ar' ? 'ملاحظة' : 'Note', report.note.trim()]);
    }

    const tableRows = rows
      .map(
        ([label, value]) =>
          `<div class="row"><span>${label}</span><span>${value}</span></div>`
      )
      .join('');

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Z Report</title>
  <style>
    body { font-family: "IBM Plex Mono", monospace; margin: 0; padding: 12px; }
    .paper { width: 290px; margin: 0 auto; border: 1px dashed #000; padding: 12px; }
    .title { text-align: center; font-weight: 700; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; font-size: 12px; margin: 6px 0; gap: 8px; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    @media print { .paper { border: none; width: 100%; } }
  </style>
</head>
	<body>
	  <div class="paper">
	    <div class="title">Z-Report</div>
	    ${tableRows}
	    <div class="divider"></div>
	    <div class="row"><span>${lang === 'ar' ? 'تمت الطباعة' : 'Printed At'}</span><span>${formatShiftTimestamp(new Date().toISOString(), lang)}</span></div>
	  </div>
	  <script>window.print();</script>
</body>
</html>`);
    printWindow.document.close();
  };

  const closeShift = async () => {
    if (!activeShift || isClosingShift) return;
    if (!activeRole) {
      alert(lang === 'ar' ? 'يجب تسجيل الدخول قبل إغلاق الوردية.' : 'Please unlock before closing shift.');
      return;
    }

    const actualCash = Number(closeShiftActualCashInput);
    if (!Number.isFinite(actualCash) || actualCash < 0) {
      alert(lang === 'ar' ? 'أدخل المبلغ النقدي الفعلي بشكل صحيح.' : 'Enter a valid actual cash amount.');
      return;
    }
    const actualCashLocal = Number(closeShiftActualCashLocalInput || 0);
    if (!Number.isFinite(actualCashLocal) || actualCashLocal < 0) {
      alert(
        lang === 'ar'
          ? `أدخل المبلغ الفعلي (${settings.localCurrency}) بشكل صحيح.`
          : `Enter a valid actual ${settings.localCurrency} amount.`
      );
      return;
    }

    setIsClosingShift(true);
    try {
      const closedAt = new Date().toISOString();
      const closedBy = activeRole;
      const closedByLabel = closeShiftOperatorInput.trim() || getRoleAuditLabel(closedBy);
      const reportBase = {
        id: `z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        shiftId: activeShift.id,
        sequenceNumber: activeShift.sequenceNumber,
        sequenceCode: activeShift.sequenceCode,
        openedAt: activeShift.openedAt,
        closedAt,
        openedBy: activeShift.openedBy,
        openedByLabel: activeShift.openedByLabel || getRoleAuditLabel(activeShift.openedBy),
        closedBy,
        closedByLabel,
        openingCashUSD: activeShift.openingCashUSD,
        openingCashLocal: activeShift.openingCashLocal,
        expectedCashUSD: activeShiftMetrics.expectedCashUSD,
        expectedCashLocal: activeShiftMetrics.expectedCashLocal,
        actualCashUSD: roundUSD(actualCash),
        actualCashLocal: roundLocal(actualCashLocal),
        varianceUSD: roundUSD(actualCash - activeShiftMetrics.expectedCashUSD),
        varianceLocal: roundLocal(actualCashLocal - activeShiftMetrics.expectedCashLocal),
        salesUSD: activeShiftMetrics.salesUSD,
        cashSalesUSD: activeShiftMetrics.cashSalesUSD,
        cashSalesLocal: activeShiftMetrics.cashSalesLocal,
        cardSalesUSD: activeShiftMetrics.cardSalesUSD,
        mobileSalesUSD: activeShiftMetrics.mobileSalesUSD,
        splitCashUSD: activeShiftMetrics.splitCashUSD,
        splitCashLocal: activeShiftMetrics.splitCashLocal,
        debtCashUSD: activeShiftMetrics.debtCashUSD,
        debtCashLocal: activeShiftMetrics.debtCashLocal,
        debtRecordedUSD: activeShiftMetrics.debtRecordedUSD,
        totalExpensesUSD: activeShiftMetrics.totalExpensesUSD,
        totalExpensesLocal: activeShiftMetrics.totalExpensesLocal,
        transactionCount: activeShiftMetrics.transactionCount,
        note: closeShiftNoteInput.trim() || activeShift.note || '',
      };
      const auditSignature = await computeSimpleHash(
        buildShiftAuditPayload({
          sequenceCode: reportBase.sequenceCode,
          shiftId: reportBase.shiftId,
          openedAt: reportBase.openedAt,
          closedAt: reportBase.closedAt,
          salesUSD: reportBase.salesUSD,
          expectedCashUSD: reportBase.expectedCashUSD,
          expectedCashLocal: reportBase.expectedCashLocal,
          actualCashUSD: reportBase.actualCashUSD,
          actualCashLocal: reportBase.actualCashLocal,
          varianceUSD: reportBase.varianceUSD,
          varianceLocal: reportBase.varianceLocal,
          totalExpensesUSD: reportBase.totalExpensesUSD,
          totalExpensesLocal: reportBase.totalExpensesLocal,
          transactionCount: reportBase.transactionCount,
        })
      );
      const report: ShiftReport = {
        ...reportBase,
        auditSignature,
      };

      setShiftReports((prev) => [report, ...prev].slice(0, 100));
      setActiveShift(null);
      setCloseShiftOperatorInput('');
      setCloseShiftActualCashInput('');
      setCloseShiftActualCashLocalInput('');
      setCloseShiftNoteInput('');
      setEditingExpenseId(null);
      setPendingExpenseEditAuditContext(null);
      printShiftReport(report);
    } finally {
      setIsClosingShift(false);
    }
  };

  const handleBackupData = () => {
    const localStorageDump = Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith('dcpos-'))
        .map((key) => [key, localStorage.getItem(key) ?? ''])
    );
    const payload = {
      version: BACKUP_FILE_VERSION,
      app: 'dcpos',
      exportedAt: new Date().toISOString(),
      appState: {
        theme,
        lang,
        settings,
        products,
        heldCarts,
        activeShift,
        shiftReports,
        shiftSequenceCounter,
        expenses,
        auditLogs,
        transactions: transactions.map((transaction) => ({
          ...transaction,
          date: transaction.date.toISOString(),
        })),
      },
      localStorageDump,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dcpos-full-backup-v${BACKUP_FILE_VERSION}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleRestoreData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const appState = parsed?.appState && typeof parsed.appState === 'object' ? parsed.appState : parsed;

      if (parsed?.localStorageDump && typeof parsed.localStorageDump === 'object') {
        Object.keys(localStorage)
          .filter((key) => key.startsWith('dcpos-'))
          .forEach((key) => localStorage.removeItem(key));

        Object.entries(parsed.localStorageDump as Record<string, unknown>).forEach(([key, value]) => {
          if (key.startsWith('dcpos-') && typeof value === 'string') {
            localStorage.setItem(key, value);
          }
        });
      }

      if (Array.isArray(appState?.products)) {
        const restoredProducts = appState.products
          .map((product: Partial<Product>, index: number) => normalizeProduct(product, index))
          .filter((product: Product | null): product is Product => Boolean(product));
        if (restoredProducts.length > 0) {
          setProducts(restoredProducts);
        }
      }

      if (Array.isArray(appState?.heldCarts)) {
        const restoredHeld = appState.heldCarts
          .filter((cart: HeldCart) => Array.isArray(cart?.items))
          .map((cart: HeldCart) => ({
            ...cart,
            items: cloneCartItems(cart.items),
            discountAmount: Number(cart.discountAmount) || 0,
            cartDiscountType:
              cart.cartDiscountType === 'percent' || cart.cartDiscountType === 'amount'
                ? cart.cartDiscountType
                : 'none',
            cartDiscountValue: Number(cart.cartDiscountValue) || 0,
            bogoEnabled: Boolean(cart.bogoEnabled),
          }));
        setHeldCarts(restoredHeld);
      }

      const restoredActiveShift =
        appState?.activeShift && typeof appState.activeShift === 'object'
          ? normalizeShiftSession(appState.activeShift as Partial<ShiftSession>)
          : null;
      setActiveShift(restoredActiveShift);

      const restoredReports = Array.isArray(appState?.shiftReports)
        ? appState.shiftReports
            .filter((report: ShiftReport) => Boolean(report?.id && report?.shiftId))
            .map((report: ShiftReport) => normalizeShiftReport(report))
            .filter((report): report is ShiftReport => Boolean(report))
        : [];
      setShiftReports(restoredReports);

      const restoredExpenses = Array.isArray(appState?.expenses)
        ? appState.expenses
            .map((expense: Expense) => normalizeExpense(expense))
            .filter((expense): expense is Expense => Boolean(expense))
        : [];
      setExpenses(restoredExpenses);

      const restoredAuditLogs = Array.isArray(appState?.auditLogs)
        ? appState.auditLogs
            .map((entry: AuditRecord) => normalizeAuditRecord(entry))
            .filter((entry): entry is AuditRecord => Boolean(entry))
        : [];
      setAuditLogs(restoredAuditLogs);

      const maxRestoredSequence = Math.max(
        restoredActiveShift?.sequenceNumber || 0,
        ...restoredReports.map((report) => report.sequenceNumber || 0),
        restoredReports.length,
        0
      );
      const restoredCounterRaw = Number(appState?.shiftSequenceCounter);
      const restoredCounter =
        Number.isFinite(restoredCounterRaw) && restoredCounterRaw >= 1
          ? Math.floor(restoredCounterRaw)
          : maxRestoredSequence + 1;
      setShiftSequenceCounter(Math.max(1, restoredCounter, maxRestoredSequence + 1));

      let restoredSettings: Settings | null = null;
      if (appState?.settings && typeof appState.settings === 'object') {
        restoredSettings = { ...DEFAULT_SETTINGS, ...appState.settings } as Settings;
        setSettings(restoredSettings);
      }

      if (Array.isArray(appState?.transactions)) {
        const restoredTransactions = appState.transactions
          .map((transaction: Transaction) => ({
            ...transaction,
            date: new Date(transaction.date),
          }))
          .filter((transaction: Transaction) => !Number.isNaN(transaction.date.getTime()));
        setTransactions(restoredTransactions);
      }

      if (appState?.lang === 'en' || appState?.lang === 'ar') {
        setLang(appState.lang);
      }

      if (appState?.theme === 'light' || appState?.theme === 'dark') {
        setTheme(appState.theme);
      }

      const nextRequirePin = restoredSettings ? restoredSettings.requirePin !== false : requirePin;
      setActiveRole(nextRequirePin ? null : 'admin');
      setPinInput('');
      setPinError('');
      clearCartState();
      setEditingExpenseId(null);
      setPendingExpenseEditAuditContext(null);
    } catch {
      alert(lang === 'ar' ? 'تعذر استعادة النسخة الاحتياطية.' : 'Failed to restore backup file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDismissPWABanner = () => {
    setShowPWABanner(false);
    localStorage.setItem(STORAGE_KEYS.pwaBannerDismissed, '1');
  };

  const handleInstallPWA = async () => {
    if (!deferredInstallPrompt) {
      handleDismissPWABanner();
      return;
    }

    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      setDeferredInstallPrompt(null);
      handleDismissPWABanner();
    } catch {
      // Keep banner visible if install prompt fails.
    }
  };

  const handleVoidTransaction = (transactionId: string) => {
    if (!isAdmin) return;
    setTransactions((prevTransactions) =>
      prevTransactions.map((transaction) =>
        transaction.id === transactionId
          ? { ...transaction, status: 'voided' }
          : transaction
      )
    );
  };

  const handleLockSystem = () => {
    setActiveRole(null);
    setPinInput('');
    setPinError('');
    setShowExpenses(false);
    setShowAuditLogs(false);
    setEditingExpenseId(null);
    setPendingExpenseEditAuditContext(null);
  };

  const handleUnlockWithPin = () => {
    const attemptedPin = pinInput.trim();
    if (!attemptedPin) {
      setPinError(lang === 'ar' ? 'أدخل رمز PIN.' : 'Enter PIN.');
      return;
    }

    if (attemptedPin === String(settings.ownerPin || DEFAULT_SETTINGS.ownerPin)) {
      setActiveRole('owner');
      setPinInput('');
      setPinError('');
      return;
    }

    if (attemptedPin === String(settings.adminPin || DEFAULT_SETTINGS.adminPin)) {
      setActiveRole('admin');
      setPinInput('');
      setPinError('');
      return;
    }

    if (attemptedPin === String(settings.cashierPin || DEFAULT_SETTINGS.cashierPin)) {
      setActiveRole('cashier');
      setPinInput('');
      setPinError('');
      return;
    }

    setPinError(lang === 'ar' ? 'رمز PIN غير صحيح.' : 'Invalid PIN.');
  };

  useEffect(() => {
    const onBarcodeCandidate = (rawCode: string) => {
      if (isLocked) return;
      const code = rawCode.trim();
      if (!code) return;
      const matched = products.find(
        (product) => product.barcode === code || product.id === code
      );
      if (!matched) return;
      handleAddToCart(matched);
      setSearchQuery('');
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
      );
      if (isTypingTarget || event.ctrlKey || event.metaKey || event.altKey) return;

      const now = Date.now();
      const delta = now - barcodeLastKeyTimeRef.current;
      barcodeLastKeyTimeRef.current = now;

      if (delta > 120) {
        barcodeBufferRef.current = '';
      }

      if (event.key === 'Enter') {
        const candidate = barcodeBufferRef.current;
        barcodeBufferRef.current = '';
        if (candidate.length >= 3) {
          onBarcodeCandidate(candidate);
        }
        return;
      }

      if (/^[0-9A-Za-z-]$/.test(event.key)) {
        barcodeBufferRef.current += event.key;
        if (barcodeBufferRef.current.length > 64) {
          barcodeBufferRef.current = barcodeBufferRef.current.slice(-64);
        }
      } else {
        barcodeBufferRef.current = '';
      }
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [products, isLocked, cartItems, lang]);

  useEffect(() => {
    const handleCtrlShortcuts = (event: KeyboardEvent, key: string): boolean => {
      if (key === 'k') {
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder]');
        searchInput?.focus();
        return true;
      }
      if (key === 's') {
        if (!isAdmin) return false;
        setShowSettings(true);
        return true;
      }
      if (key === 'l') {
        setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
        return true;
      }
      if (key === 'd') {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
        return true;
      }
      if (key === 'r') {
        if (!isAdmin) return false;
        setShowHistory(true);
        return true;
      }
      if (key === 'n') {
        clearCartState();
        return true;
      }
      if (key === 'enter' && cartItems.length > 0) {
        handleCheckout();
        return true;
      }
      if (key === 'c' && event.shiftKey) {
        setShowClearCartConfirm(true);
        return true;
      }
      if (key === '/' || (key === '?' && event.shiftKey)) {
        setShowShortcuts((prev) => !prev);
        return true;
      }
      return false;
    };

    const handleFunctionShortcuts = (key: string): boolean => {
      if (key === 'F1') {
        setShowShortcuts((prev) => !prev);
        return true;
      }
      if (key === 'F2') {
        if (!isAdmin) return false;
        setShowSettings(true);
        return true;
      }
      if (key === 'F3') {
        if (!isAdmin) return false;
        setShowAnalytics(true);
        return true;
      }
      if (key === 'F4' && cartItems.length > 0) {
        handleCheckout();
        return true;
      }
      return false;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isLocked) return;
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
      );

      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (!handleCtrlShortcuts(event, key)) return;
        event.preventDefault();
        return;
      }

      if (isTypingTarget) return;

      if (handleFunctionShortcuts(event.key)) {
        event.preventDefault();
      }
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [cartItems.length, isAdmin, isLocked, activeShift, lang]);

  const categories = ['All', 'Drinks', 'Food', 'Bakery', 'Other'];
  const managerOverrideDescription =
    managerOverrideAction?.type === 'edit-expense' || managerOverrideAction?.type === 'delete-expense'
      ? lang === 'ar'
        ? 'أدخل رمز PIN الخاص بالمدير أو المالك لتعديل/حذف المصروف. سيتم تسجيل العملية في سجل التدقيق.'
        : 'Enter Admin or Owner PIN to edit/delete expense entries. This action will be logged.'
      : lang === 'ar'
        ? 'أدخل رمز PIN الخاص بالمدير أو المالك لتفعيل الخصم الشامل و BOGO.'
        : 'Enter Admin or Owner PIN to unlock global cart discount and BOGO.';

  return (
    <div className={cn('h-screen flex flex-col bg-background', lang === 'ar' && 'font-arabic')}>
      {/* Offline Ribbon */}
      {!isOnline && <OfflineRibbon message={t('offlineMode')} />}

      {/* PWA Install Banner */}
      {showPWABanner && (
        <PWAInstallBanner onClose={handleDismissPWABanner} onInstall={handleInstallPWA} lang={lang} />
      )}

      {/* Top Bar */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-accent" />
              <h1 className="text-xl font-semibold">
                {lang === 'ar' ? settings.storeNameAr : settings.storeName}
              </h1>
            </div>
            <StatusIndicator online={isOnline} />
            {!isLocked && (
              <span className="px-2 py-1 text-xs rounded-md border border-border bg-muted text-muted-foreground">
                {activeRole === 'owner'
                  ? lang === 'ar'
                    ? 'المالك'
                    : 'Owner'
                  : activeRole === 'admin'
                  ? lang === 'ar'
                    ? 'مدير'
                    : 'Admin'
                  : lang === 'ar'
                    ? 'كاشير'
                    : 'Cashier'}
              </span>
            )}
            {!isLocked && (
              <span
                className={cn(
                  'px-2 py-1 text-xs rounded-md border',
                  activeShift
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                )}
              >
                {activeShift
                  ? lang === 'ar'
                    ? 'وردية مفتوحة'
                    : 'Shift Open'
                  : lang === 'ar'
                    ? 'لا توجد وردية'
                    : 'No Shift'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <ExchangeRateBadge
                rate={settings.exchangeRate}
                currency={settings.localCurrency}
                source={settings.exchangeRateSource}
                onRateChange={handleExchangeRateChange}
              />
            )}

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            >
              <Globe className="h-4 w-4" />
              {lang === 'en' ? 'AR' : 'EN'}
            </Button>

            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowSettings(true)}
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setShowShortcuts(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            {!isLocked && (
              <Button
                size="sm"
                variant={activeShift ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => setShowShiftManager(true)}
              >
                {lang === 'ar' ? 'الوردية' : 'Shift'}
              </Button>
            )}
            {!isLocked && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowExpenses(true)}
              >
                <Wallet className="h-4 w-4" />
                {lang === 'ar' ? 'مصروفات' : 'Expenses'}
              </Button>
            )}

            {requirePin && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleLockSystem}
              >
                <Lock className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col border-r border-border bg-background">
          {/* Search and Categories */}
          <div className="p-6 space-y-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchProducts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full justify-start">
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {t(category.toLowerCase() === 'all' ? 'allProducts' : category.toLowerCase())}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {isAdmin && (
              <>
                {/* Product Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={handleExportProducts}>
                    <Download className="h-3.5 w-3.5" />
                    {t('exportProducts')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-xs"
                    onClick={() => importProductsInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {t('importProducts')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-xs"
                    onClick={() => importProductsCsvInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {lang === 'ar' ? 'استيراد CSV/Excel' : 'Import CSV/Excel'}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={handleExportProductsCSV}>
                    <Download className="h-3.5 w-3.5" />
                    {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={handleBackupData}>
                    <Database className="h-3.5 w-3.5" />
                    {t('backupDB')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-xs"
                    onClick={() => restoreBackupInputRef.current?.click()}
                  >
                    <HardDrive className="h-3.5 w-3.5" />
                    {t('restoreDB')}
                  </Button>
                </div>

                <input
                  ref={importProductsInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImportProducts}
                />
                <input
                  ref={importProductsCsvInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await handleImportProductsCSVFile(file);
                    event.target.value = '';
                  }}
                />
                <input
                  ref={restoreBackupInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleRestoreData}
                />
              </>
            )}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-auto p-6">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery ? t('noResults') : t('noProducts')}
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    lang={lang}
                    exchangeRate={settings.exchangeRate}
                    localCurrency={settings.localCurrency}
                    onAddToCart={handleAddToCart}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    canManageProductActions={isAdmin}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart & Reports */}
        <div className="w-96 flex flex-col bg-card">
          {/* Cart */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t('cart')}</h2>
              <Button size="sm" variant="outline" onClick={() => setShowHeldCarts(true)}>
                {lang === 'ar'
                  ? `المعلقة (${heldCarts.length})`
                  : `Held (${heldCarts.length})`}
              </Button>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="font-medium text-foreground mb-1">{t('emptyCart')}</h3>
                <p className="text-sm text-muted-foreground">{t('addProducts')}</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto px-6">
                  {cartItems.map((item) => (
                    <CartItem
                      key={item.product.id}
                      item={item}
                      lang={lang}
                      exchangeRate={settings.exchangeRate}
                      localCurrency={settings.localCurrency}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveFromCart}
                      onApplyDiscount={handleApplyItemDiscount}
                    />
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-border p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('subtotal')}</span>
                      <span className="font-mono">{formatCurrency(cartTotals.subtotal, 'USD')}</span>
                    </div>
                    {cartTotals.bogoDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-600">
                          {lang === 'ar' ? 'خصم BOGO (2+1)' : 'BOGO Discount (2+1)'}
                        </span>
                        <span className="font-mono text-emerald-600">
                          -{formatCurrency(cartTotals.bogoDiscount, 'USD')}
                        </span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {lang === 'ar' ? 'خصم مقطوع (قديم)' : 'Legacy Fixed Discount'}
                        </span>
                        <span className="font-mono">-{formatCurrency(discountAmount, 'USD')}</span>
                      </div>
                    )}
                    {cartTotals.cartDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {lang === 'ar'
                            ? cartDiscountType === 'percent'
                              ? `خصم السلة (${cartDiscountValue}%)`
                              : 'خصم السلة'
                            : cartDiscountType === 'percent'
                              ? `Cart Discount (${cartDiscountValue}%)`
                              : 'Cart Discount'}
                        </span>
                        <span className="font-mono">-{formatCurrency(cartTotals.cartDiscount, 'USD')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {lang === 'ar' ? 'الخاضع للضريبة' : 'Taxable Base'}
                      </span>
                      <span className="font-mono">{formatCurrency(cartTotals.taxableBase, 'USD')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('tax')} ({settings.taxRate}%)</span>
                      <span className="font-mono">{formatCurrency(cartTotals.tax, 'USD')}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-semibold">{t('totalUSD')}</span>
                      <span className="font-mono font-semibold text-lg">{formatCurrency(cartTotals.total, 'USD')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">{t('totalLocal')}</span>
                      <span className="font-mono font-semibold text-lg">{formatCurrency(totalLocal, settings.localCurrency)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {t('exchangeRateHint')}: 1 USD = {settings.exchangeRate.toLocaleString()} {settings.localCurrency}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {lang === 'ar' ? 'محرك الخصومات المتقدمة' : 'Advanced Discount Engine'}
                      </div>
                      {isCashier && !cashierDiscountOverrideGranted && (
                        <Button size="sm" variant="outline" onClick={() => requestManagerOverride()}>
                          {lang === 'ar' ? 'تفويض مدير' : 'Manager Override'}
                        </Button>
                      )}
                      {isCashier && cashierDiscountOverrideGranted && (
                        <span className="text-[11px] rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                          {lang === 'ar' ? 'تم تفويض المدير' : 'Manager Approved'}
                        </span>
                      )}
                    </div>
                    {isCashier && !cashierDiscountOverrideGranted && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-300">
                        {lang === 'ar'
                          ? 'الخصم الشامل و BOGO يتطلبان رمز المدير/المالك.'
                          : 'Global discount and BOGO require Manager/Owner PIN.'}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant={cartDiscountType === 'none' ? 'default' : 'outline'}
                        onClick={() => handleSelectCartDiscountType('none')}
                      >
                        {lang === 'ar' ? 'بدون' : 'None'}
                      </Button>
                      <Button
                        size="sm"
                        variant={cartDiscountType === 'percent' ? 'default' : 'outline'}
                        onClick={() => handleSelectCartDiscountType('percent')}
                      >
                        {lang === 'ar' ? 'نسبة %' : 'Percent %'}
                      </Button>
                      <Button
                        size="sm"
                        variant={cartDiscountType === 'amount' ? 'default' : 'outline'}
                        onClick={() => handleSelectCartDiscountType('amount')}
                      >
                        {lang === 'ar' ? 'مبلغ ثابت' : 'Fixed $'}
                      </Button>
                    </div>

                    {cartDiscountType !== 'none' && (
                      <Input
                        type="number"
                        min="0"
                        max={cartDiscountType === 'percent' ? 100 : undefined}
                        step={cartDiscountType === 'percent' ? '0.1' : '0.01'}
                        value={cartDiscountValue}
                        onFocus={() => {
                          if (!canApplyGlobalCartDiscount) requestManagerOverride();
                        }}
                        onChange={(event) => handleCartDiscountValueChange(event.target.value)}
                        readOnly={!canApplyGlobalCartDiscount}
                        className={cn(!canApplyGlobalCartDiscount && 'opacity-70 cursor-not-allowed')}
                        placeholder={
                          cartDiscountType === 'percent'
                            ? lang === 'ar'
                              ? 'نسبة الخصم %'
                              : 'Discount percent %'
                            : lang === 'ar'
                              ? 'قيمة الخصم بالدولار'
                              : 'Discount amount in USD'
                        }
                      />
                    )}

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={bogoEnabled}
                        onChange={(event) => handleToggleBogoOffer(event.target.checked)}
                      />
                      <span>
                        {lang === 'ar'
                          ? 'عرض BOGO: اشتر 2 وخذ 1 مجاناً'
                          : 'BOGO Offer: Buy 2 Get 1 Free'}
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleClearCart}>
                      {t('clearCart')}
                    </Button>
                    <Button className="flex-1" onClick={handleCheckout}>
                      {t('checkout')}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleHoldCurrentCart}>
                      {lang === 'ar' ? 'تعليق الطلب' : 'Hold Cart'}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setShowHeldCarts(true)}>
                      {lang === 'ar'
                        ? `الطلبات المعلقة (${heldCarts.length})`
                        : `Held Carts (${heldCarts.length})`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {!isLocked && (
            <div className="border-t border-border px-6 py-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activeShift ? 'default' : 'outline'}
                  className="w-full justify-between"
                  onClick={() => setShowShiftManager(true)}
                >
                  <span>{lang === 'ar' ? 'إدارة الوردية' : 'Shift Management'}</span>
                  <span className="text-xs opacity-80">
                    {activeShift
                      ? lang === 'ar'
                        ? 'مفتوحة'
                        : 'Open'
                      : lang === 'ar'
                        ? 'مغلقة'
                        : 'Closed'}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowExpenses(true)}
                >
                  <Wallet className="h-4 w-4" />
                  {lang === 'ar' ? 'المصروفات' : 'Expenses'}
                </Button>
              </div>
            </div>
          )}

          {/* Reports Section */}
          {isAdmin && (
            <div className="border-t border-border p-6 space-y-3">
              <h3 className="font-semibold text-sm">{t('reports')}</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  onClick={() => setShowAnalytics(true)}
                >
                  <BarChart3 className="h-4 w-4" />
                  {t('dashboard')}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  onClick={() => setShowDebtReport(true)}
                >
                  <DollarSign className="h-4 w-4" />
                  {t('debtReport') || 'Debt Report'}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="h-4 w-4" />
                  {t('history')}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  onClick={() => setShowAuditLogs(true)}
                >
                  <Lock className="h-4 w-4" />
                  {lang === 'ar' ? `سجل التدقيق (${auditLogs.length})` : `Audit Log (${auditLogs.length})`}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  onClick={() => setShowLowStockReport(true)}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {lang === 'ar'
                    ? `مخزون منخفض (${lowStockProducts.length})`
                    : `Low Stock (${lowStockProducts.length})`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showHeldCarts && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">
                {lang === 'ar' ? 'الطلبات المعلقة' : 'Held Carts'}
              </h3>
              <Button variant="outline" onClick={() => setShowHeldCarts(false)}>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>

            {heldCarts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'لا توجد طلبات معلقة حالياً.' : 'No held carts yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                {heldCarts.map((heldCart) => {
                  const totals = calculateCartTotal(heldCart.items, settings.taxRate, heldCart.discountAmount, {
                    cartDiscountType: heldCart.cartDiscountType,
                    cartDiscountValue: heldCart.cartDiscountValue,
                    bogoEnabled: heldCart.bogoEnabled,
                  });
                  return (
                    <div key={heldCart.id} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{heldCart.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(heldCart.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">{formatCurrency(totals.total, 'USD')}</div>
                          <div className="text-xs text-muted-foreground">
                            {heldCart.items.length} {lang === 'ar' ? 'عنصر' : 'items'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => handleResumeHeldCart(heldCart.id)}>
                          {lang === 'ar' ? 'استئناف' : 'Resume'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteHeldCart(heldCart.id)}>
                          {lang === 'ar' ? 'حذف' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showExpenses && (
        <ExpensesModal
          open={showExpenses}
          onClose={() => setShowExpenses(false)}
          lang={lang}
          localCurrency={settings.localCurrency}
          activeShiftSequence={activeShift?.sequenceCode || null}
          expenses={activeShiftExpenses}
          editingExpenseId={editingExpenseId}
          defaultRecordedBy={defaultExpenseRecordedBy}
          canManageExpenses={isAdmin}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          onRequestEditExpense={requestExpenseEdit}
          onRequestDeleteExpense={requestExpenseDelete}
          onCancelEditExpense={() => setEditingExpenseId(null)}
        />
      )}

      {showAuditLogs && (
        <AuditLogModal
          open={showAuditLogs}
          onClose={() => setShowAuditLogs(false)}
          lang={lang}
          localCurrency={settings.localCurrency}
          logs={auditLogs}
        />
      )}

      {showLowStockReport && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">
                {lang === 'ar' ? 'تنبيهات المخزون المنخفض' : 'Low Stock Alerts'}
              </h3>
              <Button variant="outline" onClick={() => setShowLowStockReport(false)}>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {lang === 'ar'
                  ? 'لا توجد منتجات تقترب من النفاذ.'
                  : 'No products currently near stock-out.'}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {lang === 'ar'
                      ? 'تنبؤ النفاد (اعتماداً على آخر 30 يوم مبيعات)'
                      : 'Stockout Forecast (based on last 30 days)'}
                  </div>
                  {forecastAlerts.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar'
                        ? 'لا توجد بيانات مبيعات كافية لاحتساب التنبؤ حالياً.'
                        : 'Not enough sales data to compute forecast yet.'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {forecastAlerts.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span>{lang === 'ar' ? item.nameAr : item.name}</span>
                          <span className={cn((item.daysUntilStockout || 0) <= 7 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
                            {item.daysUntilStockout === null
                              ? lang === 'ar'
                                ? 'بدون توقع'
                                : 'No forecast'
                              : lang === 'ar'
                                ? `${item.daysUntilStockout.toFixed(1)} يوم`
                                : `${item.daysUntilStockout.toFixed(1)} days`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {lowStockProducts.map((product) => {
                  const threshold = product.minStockLevel ?? 10;
                  const forecast = forecastByProductId.get(product.id);
                  const daysUntilStockout = forecast?.daysUntilStockout ?? null;
                  const avgDailySales = forecast?.avgDailySales ?? 0;
                  return (
                    <div key={product.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{lang === 'ar' ? product.nameAr : product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {lang === 'ar'
                            ? `الحد الأدنى: ${threshold}`
                            : `Min stock level: ${threshold}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lang === 'ar'
                            ? `متوسط البيع اليومي: ${avgDailySales.toFixed(2)}`
                            : `Avg daily sales: ${avgDailySales.toFixed(2)}`}
                        </div>
                        <div
                          className={cn(
                            'text-xs',
                            daysUntilStockout !== null && daysUntilStockout <= 3
                              ? 'text-destructive'
                              : daysUntilStockout !== null && daysUntilStockout <= 7
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-muted-foreground'
                          )}
                        >
                          {daysUntilStockout === null
                            ? lang === 'ar'
                              ? 'توقع النفاد: لا توجد بيانات كافية'
                              : 'Stockout forecast: not enough data'
                            : lang === 'ar'
                              ? `توقع النفاد خلال ${daysUntilStockout.toFixed(1)} يوم`
                              : `Estimated stockout in ${daysUntilStockout.toFixed(1)} days`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn('font-mono font-bold', product.stock <= 0 ? 'text-destructive' : 'text-red-500')}>
                          {lang === 'ar'
                            ? `المتوفر: ${product.stock}`
                            : `In stock: ${product.stock}`}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(product.priceUSD, 'USD')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showShiftManager && (
        <div className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-5 shadow-xl space-y-4 max-h-[86vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">
                {lang === 'ar' ? 'إدارة الورديات و Z-Report' : 'Shift Management & Z-Report'}
              </h3>
              <Button variant="outline" onClick={() => setShowShiftManager(false)}>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>

            {!activeShift ? (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="font-medium">
                  {lang === 'ar'
                    ? `فتح وردية جديدة (${formatShiftSequence(shiftSequenceCounter)})`
                    : `Open New Shift (${formatShiftSequence(shiftSequenceCounter)})`}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'العهدة النقدية (USD)' : 'Opening Cash (USD)'}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={openShiftCashInput}
                      onChange={(event) => setOpenShiftCashInput(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {lang === 'ar'
                        ? `العهدة النقدية (${settings.localCurrency})`
                        : `Opening Cash (${settings.localCurrency})`}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={openShiftCashLocalInput}
                      onChange={(event) => setOpenShiftCashLocalInput(event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'اسم الكاشير/المستخدم' : 'Cashier/User Name'}
                    </div>
                    <Input
                      value={openShiftOperatorInput}
                      onChange={(event) => setOpenShiftOperatorInput(event.target.value)}
                      placeholder={lang === 'ar' ? 'اختياري (أو سيُحفظ الدور)' : 'Optional (or role will be saved)'}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'ملاحظة البداية (اختياري)' : 'Opening Note (optional)'}
                    </div>
                    <Input
                      value={openShiftNoteInput}
                      onChange={(event) => setOpenShiftNoteInput(event.target.value)}
                      placeholder={lang === 'ar' ? 'ملاحظة بداية الوردية' : 'Shift opening note'}
                    />
                  </div>
                </div>
                <Button onClick={openShift} className="w-full">
                  {lang === 'ar' ? 'بدء الوردية' : 'Open Shift'}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">
                    {lang === 'ar'
                      ? `وردية نشطة حالياً (${activeShift.sequenceCode})`
                      : `Active Shift (${activeShift.sequenceCode})`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatShiftTimestamp(activeShift.openedAt, lang)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {lang === 'ar'
                    ? `تم فتحها بواسطة: ${activeShift.openedByLabel} (${activeShift.openedBy.toUpperCase()})`
                    : `Opened by: ${activeShift.openedByLabel} (${activeShift.openedBy.toUpperCase()})`}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'العهدة الافتتاحية (USD)' : 'Opening Cash (USD)'}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShift.openingCashUSD, 'USD')}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar'
                        ? `العهدة الافتتاحية (${settings.localCurrency})`
                        : `Opening Cash (${settings.localCurrency})`}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShift.openingCashLocal, settings.localCurrency)}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'النقد المتوقع (USD)' : 'Expected Cash (USD)'}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShiftMetrics.expectedCashUSD, 'USD')}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar'
                        ? `النقد المتوقع (${settings.localCurrency})`
                        : `Expected Cash (${settings.localCurrency})`}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShiftMetrics.expectedCashLocal, settings.localCurrency)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'مبيعات نقدية (USD)' : 'Cash Sales (USD)'}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShiftMetrics.cashSalesUSD, 'USD')}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'مبيعات بطاقات' : 'Card Sales'}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShiftMetrics.cardSalesUSD, 'USD')}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'مبيعات محفظة' : 'Mobile Sales'}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShiftMetrics.mobileSalesUSD, 'USD')}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar'
                        ? `مبيعات مختلطة (${settings.localCurrency})`
                        : `Split Cash (${settings.localCurrency})`}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShiftMetrics.splitCashLocal, settings.localCurrency)}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'ديون مسجلة' : 'Debt Recorded'}
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(activeShiftMetrics.debtRecordedUSD, 'USD')}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'مصروفات (USD)' : 'Expenses (USD)'}
                    </div>
                    <div className="font-mono font-semibold text-destructive">
                      -{formatCurrency(activeShiftMetrics.totalExpensesUSD, 'USD')}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? `مصروفات (${settings.localCurrency})` : `Expenses (${settings.localCurrency})`}
                    </div>
                    <div className="font-mono font-semibold text-destructive">
                      -{formatCurrency(activeShiftMetrics.totalExpensesLocal, settings.localCurrency)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'عمليات الوردية' : 'Shift Transactions'}
                    </div>
                    <div className="font-mono font-semibold">{activeShiftMetrics.transactionCount}</div>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'مصروفات الوردية' : 'Shift Expenses Count'}
                    </div>
                    <div className="font-mono font-semibold">{activeShiftExpenses.length}</div>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>
                    {lang === 'ar'
                      ? `USD المتوقع = العهدة (${formatCurrency(activeShift.openingCashUSD, 'USD')}) + النقدي (${formatCurrency(activeShiftMetrics.cashSalesUSD, 'USD')}) + المختلط (${formatCurrency(activeShiftMetrics.splitCashUSD, 'USD')}) + الديون (${formatCurrency(activeShiftMetrics.debtCashUSD, 'USD')}) - المصروفات (${formatCurrency(activeShiftMetrics.totalExpensesUSD, 'USD')})`
                      : `Expected USD = opening (${formatCurrency(activeShift.openingCashUSD, 'USD')}) + cash sales (${formatCurrency(activeShiftMetrics.cashSalesUSD, 'USD')}) + split (${formatCurrency(activeShiftMetrics.splitCashUSD, 'USD')}) + debt cash (${formatCurrency(activeShiftMetrics.debtCashUSD, 'USD')}) - expenses (${formatCurrency(activeShiftMetrics.totalExpensesUSD, 'USD')})`}
                  </div>
                  <div>
                    {lang === 'ar'
                      ? `${settings.localCurrency} المتوقع = العهدة (${formatCurrency(activeShift.openingCashLocal, settings.localCurrency)}) + النقدي (${formatCurrency(activeShiftMetrics.cashSalesLocal, settings.localCurrency)}) + المختلط (${formatCurrency(activeShiftMetrics.splitCashLocal, settings.localCurrency)}) + الديون (${formatCurrency(activeShiftMetrics.debtCashLocal, settings.localCurrency)}) - المصروفات (${formatCurrency(activeShiftMetrics.totalExpensesLocal, settings.localCurrency)})`
                      : `Expected ${settings.localCurrency} = opening (${formatCurrency(activeShift.openingCashLocal, settings.localCurrency)}) + cash sales (${formatCurrency(activeShiftMetrics.cashSalesLocal, settings.localCurrency)}) + split (${formatCurrency(activeShiftMetrics.splitCashLocal, settings.localCurrency)}) + debt cash (${formatCurrency(activeShiftMetrics.debtCashLocal, settings.localCurrency)}) - expenses (${formatCurrency(activeShiftMetrics.totalExpensesLocal, settings.localCurrency)})`}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'النقد الفعلي عند الإغلاق (USD)' : 'Actual Cash at Close (USD)'}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={closeShiftActualCashInput}
                      onChange={(event) => setCloseShiftActualCashInput(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {lang === 'ar'
                        ? `النقد الفعلي عند الإغلاق (${settings.localCurrency})`
                        : `Actual Cash at Close (${settings.localCurrency})`}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={closeShiftActualCashLocalInput}
                      onChange={(event) => setCloseShiftActualCashLocalInput(event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'اسم مغلق الوردية' : 'Closing User Name'}
                    </div>
                    <Input
                      value={closeShiftOperatorInput}
                      onChange={(event) => setCloseShiftOperatorInput(event.target.value)}
                      placeholder={lang === 'ar' ? 'اختياري (أو سيُحفظ الدور)' : 'Optional (or role will be saved)'}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'ملاحظة الإغلاق (اختياري)' : 'Closing Note (optional)'}
                    </div>
                    <Input
                      value={closeShiftNoteInput}
                      onChange={(event) => setCloseShiftNoteInput(event.target.value)}
                      placeholder={lang === 'ar' ? 'ملاحظة عن العجز/الزيادة' : 'Variance note'}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {lang === 'ar'
                    ? 'سيتم توليد Z-Report مع طرح المصروفات النقدية لكل عملة وتوقيع تدقيق محاسبي (SHA-1).'
                    : 'Z-Report will deduct cash expenses per currency and generate a SHA-1 audit signature.'}
                </div>
                <Button
                  variant="destructive"
                  onClick={closeShift}
                  className="w-full"
                  disabled={isClosingShift}
                >
                  {isClosingShift
                    ? lang === 'ar'
                      ? 'جارٍ إنشاء التقرير...'
                      : 'Generating Report...'
                    : lang === 'ar'
                      ? 'إغلاق الصندوق (Close Shift)'
                      : 'Close Shift & Generate Z-Report'}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <div className="font-medium text-sm">
                {lang === 'ar' ? 'آخر تقارير الإغلاق' : 'Recent Z-Reports'}
              </div>
              {shiftReports.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {lang === 'ar' ? 'لا توجد تقارير إغلاق بعد.' : 'No closed shift reports yet.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {shiftReports.slice(0, 8).map((report) => (
                    <div
                      key={report.id}
                      className="rounded-lg border border-border p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {report.sequenceCode} • {formatShiftTimestamp(report.closedAt, lang)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lang === 'ar' ? 'المسؤول' : 'User'}: {report.closedByLabel} ({report.closedBy.toUpperCase()}) |{' '}
                          {lang === 'ar' ? 'المبيعات' : 'Sales'}: {formatCurrency(report.salesUSD, 'USD')} |{' '}
                          {lang === 'ar' ? 'نقد' : 'Cash'}: {formatCurrency(report.cashSalesUSD, 'USD')} |{' '}
                          {lang === 'ar' ? 'مصروفات' : 'Expenses'}: {formatCurrency(report.totalExpensesUSD, 'USD')} /{' '}
                          {formatCurrency(report.totalExpensesLocal, settings.localCurrency)} |{' '}
                          {lang === 'ar' ? 'بطاقات' : 'Cards'}: {formatCurrency(report.cardSalesUSD, 'USD')} |{' '}
                          {lang === 'ar' ? 'الفارق' : 'Variance'}: {formatCurrency(report.varianceUSD, 'USD')} / {formatCurrency(report.varianceLocal, settings.localCurrency)}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {lang === 'ar' ? 'توقيع' : 'Signature'}: {report.auditSignature}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => printShiftReport(report)}>
                        {lang === 'ar' ? 'طباعة' : 'Print'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showManagerOverridePrompt && (
        <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">
              {lang === 'ar' ? 'تفويض المدير' : 'Manager Override'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {managerOverrideDescription}
            </p>
            <Input
              type="password"
              value={managerOverridePinInput}
              onChange={(event) => {
                setManagerOverridePinInput(event.target.value);
                setManagerOverrideError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleApproveManagerOverride();
                }
              }}
              placeholder={lang === 'ar' ? 'PIN المدير/المالك' : 'Manager/Owner PIN'}
              autoComplete="off"
            />
            {managerOverrideError && (
              <div className="text-sm text-destructive">{managerOverrideError}</div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseManagerOverridePrompt}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleApproveManagerOverride}>
                {lang === 'ar' ? 'تأكيد التفويض' : 'Approve Override'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLocked && (
        <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">
              {lang === 'ar' ? 'النظام مقفل' : 'System Locked'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {lang === 'ar'
                ? 'أدخل رمز PIN للمتابعة كمالك أو مدير أو كاشير.'
                : 'Enter PIN to continue as Owner, Admin, or Cashier.'}
            </p>
            <Input
              ref={pinInputRef}
              type="password"
              value={pinInput}
              onChange={(event) => {
                setPinInput(event.target.value);
                setPinError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleUnlockWithPin();
                }
              }}
              placeholder={lang === 'ar' ? 'رمز PIN' : 'PIN code'}
              autoComplete="off"
            />
            {pinError && <div className="text-sm text-destructive">{pinError}</div>}
            <Button className="w-full" onClick={handleUnlockWithPin}>
              {lang === 'ar' ? 'دخول' : 'Unlock'}
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPayment && (
        <PaymentModal
          open={showPayment}
          onClose={() => setShowPayment(false)}
          cartItems={cartItems}
          totals={cartTotals}
          settings={settings}
          lang={lang}
          onComplete={handleCompletePayment}
        />
      )}

      {showReceipt && selectedTransaction && (
        <ReceiptModal
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          transaction={selectedTransaction}
          settings={settings}
          lang={lang}
        />
      )}

      {showAnalytics && (
        <AnalyticsModal
          open={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          transactions={transactions}
          lang={lang}
        />
      )}

      {showSettings && (
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={setSettings}
          lang={lang}
          onExportProductsCSV={handleExportProductsCSV}
          onImportProductsCSV={handleImportProductsCSVFile}
        />
      )}

      {showDebtReport && (
        <DebtReportModal
          open={showDebtReport}
          onClose={() => setShowDebtReport(false)}
          lang={lang}
          settings={settings}
        />
      )}

      {showHistory && (
        <SalesHistoryModal
          open={showHistory}
          onClose={() => setShowHistory(false)}
          transactions={transactions}
          onViewReceipt={(transaction) => {
            setSelectedTransaction(transaction);
            setShowReceipt(true);
          }}
          onVoidTransaction={handleVoidTransaction}
          lang={lang}
          settings={settings}
          canVoid={isAdmin}
        />
      )}

      {showShortcuts && (
        <KeyboardShortcutsModal
          open={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          lang={lang}
        />
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">
              {lang === 'ar' ? 'تعديل المنتج' : 'Edit Product'}
            </h3>

            <div className="space-y-3">
              <Input
                value={editDraft.name}
                onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={lang === 'ar' ? 'الاسم بالانجليزية' : 'English name'}
              />
              <Input
                value={editDraft.nameAr}
                onChange={(event) => setEditDraft((prev) => ({ ...prev, nameAr: event.target.value }))}
                placeholder={lang === 'ar' ? 'الاسم بالعربية' : 'Arabic name'}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editDraft.priceUSD}
                onChange={(event) => setEditDraft((prev) => ({ ...prev, priceUSD: event.target.value }))}
                placeholder={lang === 'ar' ? 'السعر بالدولار' : 'Price in USD'}
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={editDraft.stock}
                onChange={(event) => setEditDraft((prev) => ({ ...prev, stock: event.target.value }))}
                placeholder={lang === 'ar' ? 'المخزون' : 'Stock'}
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={editDraft.minStockLevel}
                onChange={(event) =>
                  setEditDraft((prev) => ({ ...prev, minStockLevel: event.target.value }))
                }
                placeholder={lang === 'ar' ? 'حد المخزون الأدنى' : 'Minimum stock level'}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSaveProductEdit}>{lang === 'ar' ? 'حفظ' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}

      {discountEditor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">
              {lang === 'ar' ? 'خصم المنتج' : 'Item Discount'}
            </h3>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discountEditor.value}
              onChange={(event) =>
                setDiscountEditor((prev) =>
                  prev
                    ? { ...prev, value: event.target.value }
                    : prev
                )
              }
              placeholder={lang === 'ar' ? 'نسبة الخصم %' : 'Discount %'}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDiscountEditor(null)}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSaveDiscount}>{lang === 'ar' ? 'تطبيق' : 'Apply'}</Button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">
              {lang === 'ar' ? 'حذف المنتج' : 'Delete Product'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {lang === 'ar'
                ? `هل تريد حذف ${pendingDeleteProduct.nameAr}؟`
                : `Are you sure you want to delete ${pendingDeleteProduct.name}?`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDeleteProduct(null)}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteProduct}>
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showClearCartConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">{t('clearCart')}</h3>
            <p className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'سيتم حذف كل عناصر السلة.' : 'All items in cart will be removed.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowClearCartConfirm(false)}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  clearCartState();
                  setShowClearCartConfirm(false);
                }}
              >
                {lang === 'ar' ? 'تأكيد' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
