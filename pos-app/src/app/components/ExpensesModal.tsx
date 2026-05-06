import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Pencil, Trash2 } from 'lucide-react';
import { Expense, ExpenseCategory, Language } from '../types';
import { formatCurrency } from '../utils';

type ExpenseDraft = {
  amount: string;
  currency: 'USD' | 'LBP';
  category: ExpenseCategory;
  description: string;
  recordedBy: string;
};

interface ExpensesModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  localCurrency: string;
  activeShiftSequence: string | null;
  expenses: Expense[];
  editingExpenseId: string | null;
  defaultRecordedBy: string;
  canManageExpenses: boolean;
  onAddExpense: (payload: {
    amount: number;
    currency: 'USD' | 'LBP';
    category: ExpenseCategory;
    description: string;
    recordedBy: string;
  }) => void;
  onUpdateExpense: (
    expenseId: string,
    payload: {
      amount: number;
      currency: 'USD' | 'LBP';
      category: ExpenseCategory;
      description: string;
      recordedBy: string;
    }
  ) => void;
  onRequestEditExpense: (expenseId: string) => void;
  onRequestDeleteExpense: (expenseId: string) => void;
  onCancelEditExpense: () => void;
}

const DEFAULT_DRAFT: ExpenseDraft = {
  amount: '',
  currency: 'USD',
  category: 'other',
  description: '',
  recordedBy: '',
};

export function ExpensesModal({
  open,
  onClose,
  lang,
  localCurrency,
  activeShiftSequence,
  expenses,
  editingExpenseId,
  defaultRecordedBy,
  canManageExpenses,
  onAddExpense,
  onUpdateExpense,
  onRequestEditExpense,
  onRequestDeleteExpense,
  onCancelEditExpense,
}: ExpensesModalProps) {
  const [draft, setDraft] = useState<ExpenseDraft>({
    ...DEFAULT_DRAFT,
    recordedBy: defaultRecordedBy,
  });

  const editingExpense = useMemo(
    () => expenses.find((expense) => expense.id === editingExpenseId) || null,
    [expenses, editingExpenseId]
  );

  useEffect(() => {
    if (!open) return;
    if (editingExpense) {
      setDraft({
        amount: String(editingExpense.amount),
        currency: editingExpense.currency,
        category: editingExpense.category,
        description: editingExpense.description,
        recordedBy: editingExpense.recordedBy,
      });
      return;
    }
    setDraft({
      ...DEFAULT_DRAFT,
      currency: 'USD',
      recordedBy: defaultRecordedBy,
    });
  }, [open, editingExpense, defaultRecordedBy]);

  const isArabic = lang === 'ar';
  const categoryLabel = (category: ExpenseCategory): string => {
    if (category === 'supplier') return isArabic ? 'موردون' : 'Supplier';
    if (category === 'bills') return isArabic ? 'فواتير' : 'Bills';
    if (category === 'salaries') return isArabic ? 'رواتب' : 'Salaries';
    if (category === 'petty_cash') return isArabic ? 'مصروف يومي' : 'Petty Cash';
    return isArabic ? 'أخرى' : 'Other';
  };

  const handleSubmit = () => {
    if (!activeShiftSequence) {
      alert(isArabic ? 'افتح وردية أولاً لتسجيل المصروفات.' : 'Open a shift first to record expenses.');
      return;
    }

    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert(isArabic ? 'أدخل مبلغاً صحيحاً.' : 'Enter a valid amount.');
      return;
    }

    const payload = {
      amount,
      currency: draft.currency,
      category: draft.category,
      description: draft.description.trim(),
      recordedBy: draft.recordedBy.trim() || defaultRecordedBy,
    } as const;

    if (editingExpense) {
      onUpdateExpense(editingExpense.id, payload);
      return;
    }

    onAddExpense(payload);
    setDraft({
      ...DEFAULT_DRAFT,
      currency: draft.currency,
      category: draft.category,
      recordedBy: defaultRecordedBy,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancelEditExpense();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isArabic ? 'المصروفات وحركة الخزينة' : 'Expenses & Petty Cash'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
            {activeShiftSequence
              ? isArabic
                ? `الوردية الحالية: ${activeShiftSequence}`
                : `Current Shift: ${activeShiftSequence}`
              : isArabic
                ? 'لا توجد وردية نشطة حالياً.'
                : 'No active shift right now.'}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="font-medium text-sm">
              {editingExpense
                ? isArabic
                  ? 'تعديل المصروف'
                  : 'Edit Expense'
                : isArabic
                  ? 'إضافة مصروف جديد'
                  : 'Add New Expense'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
                <Input
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder={isArabic ? 'مثال: فاتورة كهرباء' : 'Example: Electricity bill'}
                />
              </div>
              <div className="space-y-1">
                <Label>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amount}
                  onChange={(event) => setDraft((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>{isArabic ? 'العملة' : 'Currency'}</Label>
                <select
                  value={draft.currency}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      currency: event.target.value === 'USD' ? 'USD' : 'LBP',
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="LBP">{localCurrency || 'LBP'}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{isArabic ? 'التصنيف' : 'Category'}</Label>
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      category: event.target.value as ExpenseCategory,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="supplier">{categoryLabel('supplier')}</option>
                  <option value="bills">{categoryLabel('bills')}</option>
                  <option value="salaries">{categoryLabel('salaries')}</option>
                  <option value="petty_cash">{categoryLabel('petty_cash')}</option>
                  <option value="other">{categoryLabel('other')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isArabic ? 'سُجل بواسطة' : 'Recorded By'}</Label>
                <Input
                  value={draft.recordedBy}
                  onChange={(event) => setDraft((prev) => ({ ...prev, recordedBy: event.target.value }))}
                  placeholder={isArabic ? 'اسم المستخدم أو الدور' : 'User name or role'}
                />
              </div>
              <div className="flex items-end gap-2 justify-end">
                {editingExpense && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onCancelEditExpense();
                      setDraft({
                        ...DEFAULT_DRAFT,
                        recordedBy: defaultRecordedBy,
                      });
                    }}
                  >
                    {isArabic ? 'إلغاء التعديل' : 'Cancel Edit'}
                  </Button>
                )}
                <Button onClick={handleSubmit}>
                  {editingExpense
                    ? isArabic
                      ? 'حفظ التعديل'
                      : 'Save Changes'
                    : isArabic
                      ? 'إضافة المصروف'
                      : 'Add Expense'}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium text-sm">
              {isArabic ? 'مصروفات الوردية الحالية' : 'Current Shift Expenses'}
            </div>
            {expenses.length === 0 ? (
              <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                {isArabic ? 'لا توجد مصروفات مسجلة لهذه الوردية.' : 'No expenses recorded for this shift.'}
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="rounded-lg border border-border p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-medium truncate">
                        {expense.description || (isArabic ? 'بدون وصف' : 'No description')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {categoryLabel(expense.category)} | {new Date(expense.date).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isArabic ? 'سجلها:' : 'Recorded by:'} {expense.recordedBy}
                      </div>
                    </div>
                    <div className="text-right space-y-2 shrink-0">
                      <div className="font-mono font-semibold">
                        {formatCurrency(expense.amount, expense.currency === 'USD' ? 'USD' : localCurrency || 'LBP')}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => onRequestEditExpense(expense.id)}
                          title={canManageExpenses ? (isArabic ? 'تعديل' : 'Edit') : (isArabic ? 'يتطلب تفويض مدير' : 'Requires manager override')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 px-2"
                          onClick={() => onRequestDeleteExpense(expense.id)}
                          title={canManageExpenses ? (isArabic ? 'حذف' : 'Delete') : (isArabic ? 'يتطلب تفويض مدير' : 'Requires manager override')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

