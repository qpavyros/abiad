import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Transaction, Language, Settings } from '../types';
import { useTranslation } from '../i18n';
import { formatCurrency, formatDate, formatTime } from '../utils';
import { Printer } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '../../lib/utils';

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
  settings: Settings;
  lang: Language;
}

export function ReceiptModal({
  open,
  onClose,
  transaction,
  settings,
  lang,
}: ReceiptModalProps) {
  const { t } = useTranslation(lang);
  const [receiptSize, setReceiptSize] = useState<'58mm' | '80mm'>('58mm');

  const storeName = lang === 'ar' ? settings.storeNameAr : settings.storeName;

  const handlePrint = () => {
    window.print();
  };

  const ReceiptContent = ({ width }: { width: string }) => (
    <div
      className={cn(
        'bg-white text-black p-6 mx-auto font-mono text-xs',
        width === '58mm' ? 'max-w-[220px]' : 'max-w-[300px]'
      )}
      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
    >
      <div className="text-center space-y-1 mb-4">
        {settings.receiptLogoBase64 && (
          <img
            src={settings.receiptLogoBase64}
            alt="Store logo"
            className="h-14 w-full object-contain mb-2"
          />
        )}
        <div className="font-bold text-sm">{storeName}</div>
        {settings.vatNumber && <div className="text-xs">VAT: {settings.vatNumber}</div>}
        <div className="text-xs">{formatDate(transaction.date)}</div>
        <div className="text-xs">{formatTime(transaction.date)}</div>
        <div className="text-xs">#{transaction.id}</div>
      </div>

      <div className="border-t border-b border-dashed border-black py-2 my-3">
        {transaction.items.map((item, index) => {
          const itemName = lang === 'ar' ? item.product.nameAr : item.product.name;
          const itemTotal = item.product.priceUSD * item.quantity;
          const discount = (itemTotal * item.discount) / 100;
          const finalPrice = itemTotal - discount;

          return (
            <div key={index} className="mb-2">
              <div className="flex justify-between">
                <span className="truncate">{itemName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>
                  {item.quantity} x {formatCurrency(item.product.priceUSD, 'USD')}
                </span>
                <span>{formatCurrency(finalPrice, 'USD')}</span>
              </div>
              {item.discount > 0 && (
                <div className="text-xs text-gray-600">Discount: -{item.discount}%</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(transaction.subtotal, 'USD')}</span>
        </div>
        {(transaction.bogoDiscount || 0) > 0 && (
          <div className="flex justify-between">
            <span>BOGO Discount:</span>
            <span>-{formatCurrency(transaction.bogoDiscount || 0, 'USD')}</span>
          </div>
        )}
        {(transaction.cartDiscountApplied || 0) > 0 && (
          <div className="flex justify-between">
            <span>Cart Discount:</span>
            <span>-{formatCurrency(transaction.cartDiscountApplied || 0, 'USD')}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax:</span>
          <span>{formatCurrency(transaction.tax, 'USD')}</span>
        </div>
        <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1 mt-1">
          <span>Total USD:</span>
          <span>{formatCurrency(transaction.totalUSD, 'USD')}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>Total {settings.localCurrency}:</span>
          <span>{formatCurrency(transaction.totalLocal, settings.localCurrency)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black pt-2 mt-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span>Payment:</span>
          <span className="capitalize">{transaction.paymentMethod}</span>
        </div>
        <div className="flex justify-between">
          <span>Rate:</span>
          <span>
            1 USD = {transaction.exchangeRate.toLocaleString()} {settings.localCurrency}
          </span>
        </div>
      </div>

      <div className="text-center mt-4 pt-3 border-t border-dashed border-black">
        <div className="text-xs">{settings.receiptFooter || t('thankYou')}</div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t('receipt')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={receiptSize} onValueChange={(v) => setReceiptSize(v as '58mm' | '80mm')}>
            <TabsList>
              <TabsTrigger value="58mm">{t('thermal58mm')}</TabsTrigger>
              <TabsTrigger value="80mm">{t('thermal80mm')}</TabsTrigger>
            </TabsList>

            <TabsContent value="58mm" className="mt-6">
              <ReceiptContent width="58mm" />
            </TabsContent>

            <TabsContent value="80mm" className="mt-6">
              <ReceiptContent width="80mm" />
            </TabsContent>
          </Tabs>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {t('close')}
            </Button>
            <Button className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              {t('print')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
