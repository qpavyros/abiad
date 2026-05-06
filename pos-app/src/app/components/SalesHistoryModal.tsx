import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Transaction, Language, Settings } from '../types';
import { useTranslation } from '../i18n';
import { formatCurrency, formatDate, formatTime } from '../utils';
import { Eye, Ban } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../../lib/utils';

interface SalesHistoryModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onViewReceipt: (transaction: Transaction) => void;
  onVoidTransaction: (transactionId: string) => void;
  lang: Language;
  settings: Settings;
  canVoid: boolean;
}

export function SalesHistoryModal({
  open,
  onClose,
  transactions,
  onViewReceipt,
  onVoidTransaction,
  lang,
  settings,
  canVoid,
}: SalesHistoryModalProps) {
  const { t } = useTranslation(lang);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('salesHistory')}</DialogTitle>
        </DialogHeader>

        <div className="overflow-auto max-h-[70vh]">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('noTransactions')}
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={cn(
                    'border border-border rounded-lg p-4 transition-all',
                    transaction.status === 'voided' && 'opacity-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">
                          #{transaction.id}
                        </span>
                        <Badge
                          variant={transaction.status === 'voided' ? 'destructive' : 'default'}
                        >
                          {t(transaction.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatDate(transaction.date)}</span>
                        <span>{formatTime(transaction.date)}</span>
                        <span className="capitalize">{transaction.paymentMethod}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-mono font-semibold">
                            {formatCurrency(transaction.totalUSD, 'USD')}
                          </span>
                        </div>
                        <div>
                          <span className="font-mono text-sm text-muted-foreground">
                            {formatCurrency(transaction.totalLocal, settings.localCurrency)}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {transaction.items.length} {t('items')}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => onViewReceipt(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                        {t('viewReceipt')}
                      </Button>
                      {canVoid && transaction.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-2"
                          onClick={() => {
                            if (confirm('Void this transaction?')) {
                              onVoidTransaction(transaction.id);
                            }
                          }}
                        >
                          <Ban className="h-4 w-4" />
                          {t('voidTransaction')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose}>{t('close')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
