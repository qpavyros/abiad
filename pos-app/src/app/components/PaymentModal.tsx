import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CartItem, Language, Settings, Transaction, PaymentMethod, Customer } from '../types';
import { useTranslation } from '../i18n';
import { formatCurrency, generateTransactionId } from '../utils';
import { CreditCard, Banknote, Smartphone, Split, Receipt } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totals: { subtotal: number; tax: number; total: number };
  settings: Settings;
  lang: Language;
  onComplete: (transaction: Transaction) => void;
}

export function PaymentModal({
  open,
  onClose,
  cartItems,
  totals,
  settings,
  lang,
  onComplete,
}: PaymentModalProps) {
  const { t } = useTranslation(lang);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidUSD, setAmountPaidUSD] = useState('');
  const [amountPaidLocal, setAmountPaidLocal] = useState('');
  
  // Debt fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partialPayment, setPartialPayment] = useState('');

  const totalLocal = totals.total * settings.exchangeRate;

  const handleCompletePayment = () => {
    // Handle debt payment
    if (paymentMethod === 'debt') {
      if (!customerName.trim() || !customerPhone.trim()) {
        alert('Please enter customer name and phone number');
        return;
      }

      const paidAmount = parseFloat(partialPayment) || 0;
      const remainingDebt = totals.total - paidAmount;

      if (remainingDebt < 0) {
        alert('Paid amount cannot exceed total amount');
        return;
      }

      // Save customer and debt
      saveCustomerDebt(customerName, customerPhone, remainingDebt, paidAmount);

      const transaction: Transaction = {
        id: generateTransactionId(),
        date: new Date(),
        items: cartItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        totalUSD: totals.total,
        totalLocal,
        paymentMethod: 'debt',
        exchangeRate: settings.exchangeRate,
        status: 'completed',
        customerName,
        customerPhone,
        partialPayment: paidAmount,
        debtAmount: remainingDebt,
      };

      onComplete(transaction);
      resetForm();
      return;
    }

    // Handle normal payment
    const transaction: Transaction = {
      id: generateTransactionId(),
      date: new Date(),
      items: cartItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      totalUSD: totals.total,
      totalLocal,
      paymentMethod,
      exchangeRate: settings.exchangeRate,
      status: 'completed',
      amountPaidUSD: paymentMethod === 'split' ? parseFloat(amountPaidUSD) || 0 : totals.total,
      amountPaidLocal: paymentMethod === 'split' ? parseFloat(amountPaidLocal) || 0 : totalLocal,
    };

    onComplete(transaction);
    resetForm();
  };

  const saveCustomerDebt = (name: string, phone: string, debtAmount: number, paidAmount: number) => {
    try {
      // Load or initialize customers
      const stored = localStorage.getItem('dcpos-offline-customers');
      const customers: Customer[] = stored ? JSON.parse(stored) : [];
      
      // Find or create customer
      let customer = customers.find(c => c.phone === phone);
      
      if (customer) {
        // Update existing customer
        customer.balanceUSD += debtAmount;
        customer.balanceLBP += debtAmount * settings.exchangeRate;
      } else {
        // Create new customer
        customer = {
          id: `customer_${Date.now()}`,
          name,
          phone,
          balanceUSD: debtAmount,
          balanceLBP: debtAmount * settings.exchangeRate,
          createdAt: new Date().toISOString(),
        };
        customers.push(customer);
      }
      
      // Save customers
      localStorage.setItem('dcpos-offline-customers', JSON.stringify(customers));
      
      // Save debt record
      const debts = JSON.parse(localStorage.getItem('dcpos-offline-debts') || '[]');
      debts.push({
        id: `debt_${Date.now()}`,
        customerId: customer.id,
        customerName: name,
        customerPhone: phone,
        amountUSD: debtAmount,
        amountLBP: debtAmount * settings.exchangeRate,
        partialPayment: paidAmount,
        totalInvoice: totals.total,
        receiptNumber: generateTransactionId(),
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('dcpos-offline-debts', JSON.stringify(debts));
    } catch (error) {
      console.error('Failed to save customer debt:', error);
    }
  };

  const resetForm = () => {
    setAmountPaidUSD('');
    setAmountPaidLocal('');
    setCustomerName('');
    setCustomerPhone('');
    setPartialPayment('');
  };

  const calculateChange = () => {
    if (paymentMethod === 'cash') {
      const paid = parseFloat(amountPaidUSD) || 0;
      return Math.max(0, paid - totals.total);
    }
    return 0;
  };

  const calculateRemaining = () => {
    if (paymentMethod === 'split') {
      const paidUSD = parseFloat(amountPaidUSD) || 0;
      const paidLocal = parseFloat(amountPaidLocal) || 0;
      const paidLocalInUSD = paidLocal / settings.exchangeRate;
      const totalPaid = paidUSD + paidLocalInUSD;
      return Math.max(0, totals.total - totalPaid);
    }
    return 0;
  };

  const calculateDebtRemaining = () => {
    const paid = parseFloat(partialPayment) || 0;
    return Math.max(0, totals.total - paid);
  };

  const paymentMethods = [
    { id: 'cash', label: t('cash'), icon: Banknote },
    { id: 'card', label: t('card'), icon: CreditCard },
    { id: 'mobile', label: t('mobile'), icon: Smartphone },
    { id: 'split', label: t('splitPayment'), icon: Split },
    { id: 'debt', label: t('debt') || 'Debt', icon: Receipt },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('payment')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Due */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="text-sm text-muted-foreground">{t('amountDue')}</div>
            <div className="space-y-1">
              <div className="font-mono text-2xl font-bold">
                {formatCurrency(totals.total, 'USD')}
              </div>
              <div className="font-mono text-lg text-muted-foreground">
                {formatCurrency(totalLocal, settings.localCurrency)}
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>{t('selectPaymentMethod')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
                      paymentMethod === method.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Payment */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amountPaid">{t('amountPaid')} (USD)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  value={amountPaidUSD}
                  onChange={(e) => setAmountPaidUSD(e.target.value)}
                  className="font-mono"
                  placeholder="0.00"
                />
              </div>
              {amountPaidUSD && (
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('change')}</span>
                    <span className="font-mono text-xl font-bold">
                      {formatCurrency(calculateChange(), 'USD')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Split Payment */}
          {paymentMethod === 'split' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payUSD">{t('payUSD')}</Label>
                  <Input
                    id="payUSD"
                    type="number"
                    step="0.01"
                    value={amountPaidUSD}
                    onChange={(e) => setAmountPaidUSD(e.target.value)}
                    className="font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payLocal">{t('payLocal')} {settings.localCurrency}</Label>
                  <Input
                    id="payLocal"
                    type="number"
                    step="1"
                    value={amountPaidLocal}
                    onChange={(e) => setAmountPaidLocal(e.target.value)}
                    className="font-mono"
                    placeholder="0"
                  />
                </div>
              </div>
              {(amountPaidUSD || amountPaidLocal) && (
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('remaining')}</span>
                    <span className="font-mono text-xl font-bold">
                      {formatCurrency(calculateRemaining(), 'USD')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debt Payment */}
          {paymentMethod === 'debt' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">{t('customerName') || 'Customer Name'}</Label>
                <Input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">{t('customerPhone') || 'Phone Number'}</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partialPayment">{t('amountPaid') || 'Amount Paid'} (USD)</Label>
                <Input
                  id="partialPayment"
                  type="number"
                  step="0.01"
                  value={partialPayment}
                  onChange={(e) => setPartialPayment(e.target.value)}
                  className="font-mono"
                  placeholder="0.00"
                />
              </div>
              {partialPayment && (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('amountPaid') || 'Paid'}:</span>
                    <span className="font-mono font-semibold text-green-600">
                      {formatCurrency(parseFloat(partialPayment) || 0, 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('debtAmount') || 'Debt'}:</span>
                    <span className="font-mono font-bold text-red-600">
                      {formatCurrency(calculateDebtRemaining(), 'USD')}
                    </span>
                  </div>
                </div>
              )}
              {!partialPayment && (
                <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  💡 Full amount will be recorded as debt
                </div>
              )}
            </div>
          )}

          {/* Card/Mobile - No extra input needed */}
          {(paymentMethod === 'card' || paymentMethod === 'mobile') && (
            <div className="bg-muted rounded-lg p-4 text-center text-muted-foreground">
              Processing {paymentMethod} payment...
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleCompletePayment}
              disabled={paymentMethod === 'debt' && (!customerName.trim() || !customerPhone.trim())}
            >
              {t('completePayment')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
