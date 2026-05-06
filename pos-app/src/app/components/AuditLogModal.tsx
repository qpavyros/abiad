import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { AuditRecord, ExpenseCategory, Language } from '../types';
import { formatCurrency } from '../utils';

interface AuditLogModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  localCurrency: string;
  logs: AuditRecord[];
}

const formatTimestamp = (value: string, lang: Language): string => {
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
};

export function AuditLogModal({ open, onClose, lang, localCurrency, logs }: AuditLogModalProps) {
  const isArabic = lang === 'ar';
  const visibleLogs = useMemo(() => logs.slice(0, 500), [logs]);
  const editsCount = useMemo(
    () => logs.filter((entry) => entry.eventType === 'EXPENSE_EDITED').length,
    [logs]
  );
  const deletesCount = useMemo(
    () => logs.filter((entry) => entry.eventType === 'EXPENSE_DELETED').length,
    [logs]
  );
  const overrideCount = useMemo(() => logs.filter((entry) => entry.overrideUsed).length, [logs]);

  const categoryLabel = (category: ExpenseCategory): string => {
    if (category === 'supplier') return isArabic ? 'موردون' : 'Supplier';
    if (category === 'bills') return isArabic ? 'فواتير' : 'Bills';
    if (category === 'salaries') return isArabic ? 'رواتب' : 'Salaries';
    if (category === 'petty_cash') return isArabic ? 'مصروف يومي' : 'Petty Cash';
    return isArabic ? 'أخرى' : 'Other';
  };

  const eventLabel = (type: AuditRecord['eventType']): string =>
    type === 'EXPENSE_EDITED'
      ? isArabic
        ? 'تعديل مصروف'
        : 'Expense Edited'
      : isArabic
      ? 'حذف مصروف'
      : 'Expense Deleted';

  const formatExpenseSnapshot = (snapshot: AuditRecord['before']): string => {
    if (!snapshot) return isArabic ? 'لا يوجد' : 'N/A';
    const currency = snapshot.currency === 'USD' ? 'USD' : localCurrency || 'LBP';
    const amount = formatCurrency(snapshot.amount, currency);
    const description = snapshot.description || (isArabic ? 'بدون وصف' : 'No description');
    return `${amount} | ${categoryLabel(snapshot.category)} | ${description} | ${snapshot.recordedBy}`;
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isArabic ? 'سجل التدقيق الأمني' : 'Security Audit Log'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-md bg-muted p-3">
              <div className="text-xs text-muted-foreground">{isArabic ? 'إجمالي السجلات' : 'Total Logs'}</div>
              <div className="font-mono font-semibold">{logs.length}</div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="text-xs text-muted-foreground">{isArabic ? 'عمليات التعديل' : 'Edited'}</div>
              <div className="font-mono font-semibold">{editsCount}</div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="text-xs text-muted-foreground">{isArabic ? 'عمليات الحذف' : 'Deleted'}</div>
              <div className="font-mono font-semibold">{deletesCount}</div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="text-xs text-muted-foreground">
                {isArabic ? 'بتفويض مدير/مالك' : 'Manager/Owner Overrides'}
              </div>
              <div className="font-mono font-semibold">{overrideCount}</div>
            </div>
          </div>

          {visibleLogs.length === 0 ? (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              {isArabic ? 'لا توجد سجلات تدقيق حتى الآن.' : 'No audit records yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleLogs.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs">
                      {eventLabel(entry.eventType)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(entry.timestamp, lang)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {isArabic ? 'الوردية' : 'Shift'}: {entry.shiftSequence || 'N/A'} |{' '}
                    {isArabic ? 'رقم المصروف' : 'Expense ID'}: {entry.expenseId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isArabic ? 'الطالب' : 'Requested By'}: {entry.requesterLabel} (
                    {entry.requesterRole.toUpperCase()}) | {isArabic ? 'المفوض' : 'Approved By'}:{' '}
                    {entry.approverLabel} ({entry.approverRole.toUpperCase()}) |{' '}
                    {entry.overrideUsed
                      ? isArabic
                        ? 'تفويض PIN: نعم'
                        : 'PIN Override: YES'
                      : isArabic
                      ? 'تفويض PIN: لا'
                      : 'PIN Override: NO'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isArabic ? 'وقت الطلب' : 'Requested At'}: {formatTimestamp(entry.requestedAt, lang)} |{' '}
                    {isArabic ? 'وقت الموافقة' : 'Approved At'}: {formatTimestamp(entry.approvedAt, lang)}
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">{isArabic ? 'قبل' : 'Before'}: </span>
                    <span className="font-mono">{formatExpenseSnapshot(entry.before)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">{isArabic ? 'بعد' : 'After'}: </span>
                    <span className="font-mono">{formatExpenseSnapshot(entry.after)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              {isArabic ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
