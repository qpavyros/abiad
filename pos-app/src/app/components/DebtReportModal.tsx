import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Customer, DebtRecord, Language, Settings } from '../types';
import { useTranslation } from '../i18n';
import { formatCurrency } from '../utils';
import { ArrowUpDown, Calendar, DollarSign, Printer, RefreshCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DebtReportModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  settings: Settings;
}

type SortBy = 'amount' | 'date';

type DebtPaymentRecord = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  amountUSD: number;
  amountLocal: number;
  remainingUSD: number;
  remainingLocal: number;
  receiptNumber: string;
  createdAt: string;
};

type CustomerDebtRow = Customer & {
  outstandingUSD: number;
  outstandingLocal: number;
  invoiceCount: number;
  lastDebtTimestamp: number;
};

const STORAGE_KEYS = {
  customers: 'dcpos-offline-customers',
  debts: 'dcpos-offline-debts',
  debtPayments: 'dcpos-offline-debt-payments',
};

const readStorageArray = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const toTimestamp = (value?: string | number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value) return 0;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const moneyUSD = (amount: number): number => Number(amount.toFixed(2));

export function DebtReportModal({
  open,
  onClose,
  lang,
  settings,
}: DebtReportModalProps) {
  const { t } = useTranslation(lang);
  const isArabic = lang === 'ar';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [payments, setPayments] = useState<DebtPaymentRecord[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('amount');
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, string>>({});
  const [submittingCustomerId, setSubmittingCustomerId] = useState<string | null>(null);
  const [latestReceipt, setLatestReceipt] = useState<DebtPaymentRecord | null>(null);

  const loadDebtData = () => {
    const nextCustomers = readStorageArray<Customer>(STORAGE_KEYS.customers);
    const nextDebts = readStorageArray<DebtRecord>(STORAGE_KEYS.debts);
    const nextPayments = readStorageArray<DebtPaymentRecord>(STORAGE_KEYS.debtPayments).sort(
      (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
    );

    setCustomers(nextCustomers);
    setDebts(nextDebts);
    setPayments(nextPayments);
  };

  useEffect(() => {
    if (!open) return;
    loadDebtData();
  }, [open]);

  const customerRows = useMemo(() => {
    const statsByCustomer = new Map<
      string,
      {
        invoiceCount: number;
        outstandingUSD: number;
        outstandingLocal: number;
        lastDebtTimestamp: number;
        customerName: string;
        customerPhone: string;
      }
    >();

    debts.forEach((debt) => {
      const openDebtUSD = Math.max(0, Number(debt.amountUSD) || 0);
      const openDebtLocal = Math.max(0, Number(debt.amountLBP) || 0);
      if (openDebtUSD <= 0) return;

      const key = debt.customerId || debt.customerPhone;
      if (!key) return;

      const existing = statsByCustomer.get(key) || {
        invoiceCount: 0,
        outstandingUSD: 0,
        outstandingLocal: 0,
        lastDebtTimestamp: 0,
        customerName: debt.customerName || (isArabic ? 'عميل بدون اسم' : 'Unknown Customer'),
        customerPhone: debt.customerPhone || '',
      };

      existing.invoiceCount += 1;
      existing.outstandingUSD = moneyUSD(existing.outstandingUSD + openDebtUSD);
      existing.outstandingLocal = Math.round(existing.outstandingLocal + openDebtLocal);
      existing.lastDebtTimestamp = Math.max(
        existing.lastDebtTimestamp,
        toTimestamp(debt.timestamp || debt.createdAt)
      );
      if (!existing.customerName && debt.customerName) existing.customerName = debt.customerName;
      if (!existing.customerPhone && debt.customerPhone) existing.customerPhone = debt.customerPhone;

      statsByCustomer.set(key, existing);
    });

    const rows: CustomerDebtRow[] = [];
    const seenKeys = new Set<string>();

    customers.forEach((customer) => {
      const key = customer.id || customer.phone;
      if (!key) return;
      seenKeys.add(key);
      const stats = statsByCustomer.get(key);

      const customerBalanceUSD = Math.max(0, Number(customer.balanceUSD) || 0);
      const customerBalanceLocal = Math.max(0, Number(customer.balanceLBP) || 0);
      const debtBalanceUSD = Math.max(0, stats?.outstandingUSD || 0);
      const debtBalanceLocal = Math.max(0, stats?.outstandingLocal || 0);

      const outstandingUSD = Math.max(customerBalanceUSD, debtBalanceUSD);
      const outstandingLocal = Math.max(
        customerBalanceLocal,
        debtBalanceLocal,
        Math.round(outstandingUSD * settings.exchangeRate)
      );

      rows.push({
        ...customer,
        outstandingUSD: moneyUSD(outstandingUSD),
        outstandingLocal,
        invoiceCount: stats?.invoiceCount ?? 0,
        lastDebtTimestamp: Math.max(
          toTimestamp(customer.createdAt),
          stats?.lastDebtTimestamp || 0
        ),
      });
    });

    statsByCustomer.forEach((stats, key) => {
      if (seenKeys.has(key) || stats.outstandingUSD <= 0) return;
      rows.push({
        id: key,
        name: stats.customerName || (isArabic ? 'عميل بدون اسم' : 'Unknown Customer'),
        phone: stats.customerPhone || '',
        balanceUSD: moneyUSD(stats.outstandingUSD),
        balanceLBP: Math.round(stats.outstandingLocal),
        createdAt: new Date(stats.lastDebtTimestamp || Date.now()).toISOString(),
        outstandingUSD: moneyUSD(stats.outstandingUSD),
        outstandingLocal: Math.round(stats.outstandingLocal),
        invoiceCount: stats.invoiceCount,
        lastDebtTimestamp: stats.lastDebtTimestamp,
      });
    });

    const withDebt = rows.filter((row) => row.outstandingUSD > 0);

    return withDebt.sort((a, b) => {
      if (sortBy === 'amount') return b.outstandingUSD - a.outstandingUSD;
      return a.lastDebtTimestamp - b.lastDebtTimestamp;
    });
  }, [customers, debts, sortBy, settings.exchangeRate, isArabic]);

  const summary = useMemo(() => {
    const totalDebtUSD = moneyUSD(
      customerRows.reduce((sum, row) => sum + row.outstandingUSD, 0)
    );
    const totalDebtLocal = Math.round(
      customerRows.reduce((sum, row) => sum + row.outstandingLocal, 0)
    );

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const collectedTodayUSD = moneyUSD(
      payments
        .filter((payment) => toTimestamp(payment.createdAt) >= dayStart.getTime())
        .reduce((sum, payment) => sum + payment.amountUSD, 0)
    );

    return {
      totalDebtUSD,
      totalDebtLocal,
      collectedTodayUSD,
    };
  }, [customerRows, payments]);

  const printReceipt = (receipt: DebtPaymentRecord) => {
    const printWindow = globalThis.window.open('', '_blank', 'width=380,height=680');
    if (!printWindow) {
      alert(isArabic ? 'تعذر فتح نافذة الطباعة.' : 'Unable to open print window.');
      return;
    }

    const storeName = escapeHtml(isArabic ? settings.storeNameAr : settings.storeName);
    const vatRow = settings.vatNumber
      ? `<div class="line"><span>VAT</span><span>${escapeHtml(settings.vatNumber)}</span></div>`
      : '';
    const footer = escapeHtml(
      settings.receiptFooter || (isArabic ? 'شكراً لتسديدكم' : 'Thank you for your payment')
    );
    const logo = settings.receiptLogoBase64
      ? `<div class="center"><img src="${settings.receiptLogoBase64}" alt="logo" class="logo" /></div>`
      : '';
    const issuedAt = new Date(receipt.createdAt).toLocaleString(isArabic ? 'ar-LB' : 'en-US');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${isArabic ? 'سند قبض' : 'Payment Receipt'}</title>
    <style>
      body { font-family: "IBM Plex Mono", monospace; margin: 0; padding: 12px; color: #111; }
      .paper { width: 280px; margin: 0 auto; border: 1px dashed #222; padding: 12px; }
      .center { text-align: center; }
      .logo { max-width: 130px; max-height: 65px; object-fit: contain; }
      .title { font-weight: 700; margin-top: 8px; }
      .line { display: flex; justify-content: space-between; gap: 8px; margin: 6px 0; font-size: 12px; }
      .total { font-weight: 700; border-top: 1px dashed #222; margin-top: 10px; padding-top: 8px; }
      .divider { border-top: 1px dashed #222; margin: 10px 0; }
      .footer { text-align: center; margin-top: 10px; font-size: 12px; }
      @media print {
        body { padding: 0; }
        .paper { border: none; width: 100%; }
      }
    </style>
  </head>
  <body>
    <div class="paper">
      ${logo}
      <div class="center title">${storeName}</div>
      <div class="center">${isArabic ? 'سند قبض' : 'Payment Voucher'}</div>
      <div class="divider"></div>
      <div class="line"><span>${isArabic ? 'رقم السند' : 'Receipt #'}</span><span>${escapeHtml(receipt.receiptNumber)}</span></div>
      <div class="line"><span>${isArabic ? 'التاريخ' : 'Date'}</span><span>${escapeHtml(issuedAt)}</span></div>
      <div class="line"><span>${isArabic ? 'العميل' : 'Customer'}</span><span>${escapeHtml(receipt.customerName)}</span></div>
      <div class="line"><span>${isArabic ? 'الهاتف' : 'Phone'}</span><span>${escapeHtml(receipt.customerPhone || '-')}</span></div>
      ${vatRow}
      <div class="divider"></div>
      <div class="line total"><span>${isArabic ? 'الدفعة' : 'Payment'}</span><span>${escapeHtml(formatCurrency(receipt.amountUSD, 'USD'))}</span></div>
      <div class="line"><span>${isArabic ? 'الدفعة بالمحلي' : `Payment (${settings.localCurrency})`}</span><span>${escapeHtml(formatCurrency(receipt.amountLocal, settings.localCurrency))}</span></div>
      <div class="line"><span>${isArabic ? 'المتبقي' : 'Remaining'}</span><span>${escapeHtml(formatCurrency(receipt.remainingUSD, 'USD'))}</span></div>
      <div class="line"><span>${isArabic ? 'المتبقي بالمحلي' : `Remaining (${settings.localCurrency})`}</span><span>${escapeHtml(formatCurrency(receipt.remainingLocal, settings.localCurrency))}</span></div>
      <div class="footer">${footer}</div>
    </div>
    <script>
      window.focus();
      window.print();
    </script>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSettleDebt = (row: CustomerDebtRow) => {
    const rawValue = paymentDrafts[row.id] || '';
    const paymentAmount = Number(rawValue);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      alert(isArabic ? 'أدخل قيمة دفعة صحيحة.' : 'Enter a valid payment amount.');
      return;
    }

    if (paymentAmount > row.outstandingUSD + 0.000001) {
      alert(isArabic ? 'قيمة الدفعة أكبر من الدين المتبقي.' : 'Payment exceeds remaining debt.');
      return;
    }

    setSubmittingCustomerId(row.id);
    try {
      const allCustomers = readStorageArray<Customer>(STORAGE_KEYS.customers);
      const allDebts = readStorageArray<DebtRecord>(STORAGE_KEYS.debts);
      const existingPayments = readStorageArray<DebtPaymentRecord>(STORAGE_KEYS.debtPayments);

      let customerIndex = allCustomers.findIndex(
        (customer) => customer.id === row.id || (row.phone && customer.phone === row.phone)
      );

      if (customerIndex < 0) {
        const created: Customer = {
          id: row.id || `customer_${Date.now()}`,
          name: row.name || (isArabic ? 'عميل بدون اسم' : 'Unknown Customer'),
          phone: row.phone || '',
          balanceUSD: row.outstandingUSD,
          balanceLBP: row.outstandingLocal,
          createdAt: new Date().toISOString(),
        };
        allCustomers.push(created);
        customerIndex = allCustomers.length - 1;
      }

      const customer = allCustomers[customerIndex];
      const currentBalanceUSD = Math.max(
        moneyUSD(Number(customer.balanceUSD) || 0),
        row.outstandingUSD
      );
      const currentBalanceLocal = Math.max(
        Math.round(Number(customer.balanceLBP) || 0),
        row.outstandingLocal
      );

      const paidUSD = moneyUSD(paymentAmount);
      const paidLocal = Math.round(paidUSD * settings.exchangeRate);
      let remainingToAllocate = paidUSD;

      const relatedDebtIndexes = allDebts
        .map((debt, index) => ({ debt, index }))
        .filter(({ debt }) => {
          const sameCustomerId = debt.customerId === customer.id;
          const sameCustomerPhone = Boolean(customer.phone) && debt.customerPhone === customer.phone;
          return (sameCustomerId || sameCustomerPhone) && (Number(debt.amountUSD) || 0) > 0;
        })
        .sort(
          (a, b) =>
            toTimestamp(a.debt.timestamp || a.debt.createdAt) -
            toTimestamp(b.debt.timestamp || b.debt.createdAt)
        );

      relatedDebtIndexes.forEach(({ debt, index }) => {
        if (remainingToAllocate <= 0) return;

        const debtUSD = Math.max(0, Number(debt.amountUSD) || 0);
        if (debtUSD <= 0) return;

        const debtLocal = Math.max(0, Number(debt.amountLBP) || 0);
        const applyUSD = Math.min(debtUSD, remainingToAllocate);
        const localRate = debtUSD > 0 ? debtLocal / debtUSD : settings.exchangeRate;
        const nextDebtUSD = moneyUSD(Math.max(0, debtUSD - applyUSD));
        const nextDebtLocal = Math.max(0, Math.round(debtLocal - applyUSD * localRate));

        allDebts[index] = {
          ...debt,
          amountUSD: nextDebtUSD,
          amountLBP: nextDebtLocal,
        };
        remainingToAllocate = moneyUSD(Math.max(0, remainingToAllocate - applyUSD));
      });

      const nextBalanceUSD = moneyUSD(Math.max(0, currentBalanceUSD - paidUSD));
      const nextBalanceLocal = Math.max(0, Math.round(currentBalanceLocal - paidLocal));

      allCustomers[customerIndex] = {
        ...customer,
        balanceUSD: nextBalanceUSD,
        balanceLBP: nextBalanceLocal,
      };

      const receipt: DebtPaymentRecord = {
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        amountUSD: paidUSD,
        amountLocal: paidLocal,
        remainingUSD: nextBalanceUSD,
        remainingLocal: nextBalanceLocal,
        receiptNumber: `RCPT-${Date.now().toString().slice(-8)}`,
        createdAt: new Date().toISOString(),
      };

      existingPayments.unshift(receipt);

      localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(allCustomers));
      localStorage.setItem(STORAGE_KEYS.debts, JSON.stringify(allDebts));
      localStorage.setItem(STORAGE_KEYS.debtPayments, JSON.stringify(existingPayments));

      setLatestReceipt(receipt);
      setPaymentDrafts((prev) => ({ ...prev, [row.id]: '' }));
      loadDebtData();
    } catch (error) {
      console.error('Debt settlement failed:', error);
      alert(isArabic ? 'حدث خطأ أثناء حفظ الدفعة.' : 'Failed to save settlement payment.');
    } finally {
      setSubmittingCustomerId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {isArabic ? 'تقرير الديون والتحصيل' : t('debtReport') || 'Debt Report'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <div className="text-sm text-muted-foreground">
                {isArabic ? 'العملاء المديونون' : 'Customers with Debt'}
              </div>
              <div className="text-2xl font-bold">{customerRows.length}</div>
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <div className="text-sm text-muted-foreground">
                {isArabic ? 'إجمالي الدين القائم' : 'Outstanding Debt'}
              </div>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(summary.totalDebtUSD, 'USD')}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(summary.totalDebtLocal, settings.localCurrency)}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <div className="text-sm text-muted-foreground">
                {isArabic ? 'تحصيلات اليوم' : 'Collected Today'}
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(summary.collectedTodayUSD, 'USD')}
              </div>
            </div>
          </div>

          {latestReceipt && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold">
                  {isArabic ? 'تم إصدار سند قبض' : 'Payment voucher generated'}
                </div>
                <div className="text-muted-foreground">
                  {latestReceipt.customerName} - {formatCurrency(latestReceipt.amountUSD, 'USD')}
                </div>
              </div>
              <Button size="sm" className="gap-2" onClick={() => printReceipt(latestReceipt)}>
                <Printer className="h-4 w-4" />
                {isArabic ? 'طباعة السند' : 'Print Voucher'}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant={sortBy === 'amount' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('amount')}
              className="gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              {isArabic ? 'ترتيب حسب المبلغ' : 'Sort by Amount'}
            </Button>
            <Button
              variant={sortBy === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('date')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {isArabic ? 'ترتيب حسب التاريخ' : 'Sort by Date'}
            </Button>
            <Button variant="secondary" size="sm" onClick={loadDebtData} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              {isArabic ? 'تحديث' : 'Refresh'}
            </Button>
          </div>

          <div className="space-y-3">
            {customerRows.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                {isArabic ? 'لا توجد ديون مستحقة حالياً.' : 'No outstanding debts right now.'}
              </div>
            ) : (
              customerRows.map((row) => {
                const draftValue = paymentDrafts[row.id] ?? '';
                const remainingAfterDraft = Math.max(0, row.outstandingUSD - (Number(draftValue) || 0));
                const createdAtLabel = row.lastDebtTimestamp
                  ? new Date(row.lastDebtTimestamp).toLocaleDateString(isArabic ? 'ar-LB' : 'en-US')
                  : '-';

                return (
                  <div
                    key={row.id}
                    className={cn(
                      'rounded-lg border border-border p-4 space-y-3',
                      submittingCustomerId === row.id && 'opacity-70 pointer-events-none'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{row.name || (isArabic ? 'بدون اسم' : 'Unnamed')}</div>
                        <div className="text-sm text-muted-foreground">
                          {isArabic ? 'الهاتف' : 'Phone'}: {row.phone || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isArabic ? 'آخر حركة دين' : 'Last debt entry'}: {createdAtLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xl font-bold text-destructive">
                          {formatCurrency(row.outstandingUSD, 'USD')}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {formatCurrency(row.outstandingLocal, settings.localCurrency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isArabic ? 'فواتير مفتوحة' : 'Open invoices'}: {row.invoiceCount}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draftValue}
                        onChange={(event) =>
                          setPaymentDrafts((prev) => ({
                            ...prev,
                            [row.id]: event.target.value,
                          }))
                        }
                        placeholder={isArabic ? 'قيمة دفعة جديدة (USD)' : 'New payment amount (USD)'}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setPaymentDrafts((prev) => ({
                            ...prev,
                            [row.id]: row.outstandingUSD.toFixed(2),
                          }))
                        }
                      >
                        {isArabic ? 'كامل الدين' : 'Full Amount'}
                      </Button>
                      <Button type="button" onClick={() => handleSettleDebt(row)}>
                        {submittingCustomerId === row.id
                          ? isArabic
                            ? 'جارٍ الحفظ...'
                            : 'Saving...'
                          : isArabic
                            ? 'تسديد وإصدار سند'
                            : 'Settle & Voucher'}
                      </Button>
                    </div>

                    {draftValue && Number.isFinite(Number(draftValue)) && Number(draftValue) > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {isArabic ? 'المتبقي بعد الدفعة' : 'Remaining after payment'}:{' '}
                        <span className="font-mono">
                          {formatCurrency(remainingAfterDraft, 'USD')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">
                {isArabic ? 'آخر سندات القبض' : 'Recent Payment Vouchers'}
              </h4>
              <div className="space-y-2">
                {payments.slice(0, 8).map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-md border border-border p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{payment.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        #{payment.receiptNumber} -{' '}
                        {new Date(payment.createdAt).toLocaleString(isArabic ? 'ar-LB' : 'en-US')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="font-mono text-sm font-semibold">
                        {formatCurrency(payment.amountUSD, 'USD')}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => printReceipt(payment)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        {isArabic ? 'طباعة' : 'Print'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={onClose}>{t('close')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
