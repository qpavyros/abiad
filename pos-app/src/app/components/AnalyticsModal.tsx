import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Transaction, Language } from '../types';
import { useTranslation } from '../i18n';
import { formatCurrency } from '../utils';
import { DollarSign, ShoppingCart, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  lang: Language;
}

export function AnalyticsModal({
  open,
  onClose,
  transactions,
  lang,
}: AnalyticsModalProps) {
  const { t } = useTranslation(lang);

  const completedTransactions = transactions.filter((t) => t.status === 'completed');

  const analytics = useMemo(() => {
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.totalUSD, 0);
    const totalTransactions = completedTransactions.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Top products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    completedTransactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        const existing = productSales.get(item.product.id) || {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.product.priceUSD * item.quantity;
        productSales.set(item.product.id, existing);
      });
    });
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Payment methods
    const paymentMethods = new Map<string, number>();
    completedTransactions.forEach((t) => {
      const current = paymentMethods.get(t.paymentMethod) || 0;
      paymentMethods.set(t.paymentMethod, current + t.totalUSD);
    });
    const paymentBreakdown = Array.from(paymentMethods.entries()).map(([method, total]) => ({
      method,
      total,
    }));

    // Hourly sales from real completed transactions.
    const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      sales: 0,
    }));
    completedTransactions.forEach((transaction) => {
      const hour = transaction.date.getHours();
      if (hour >= 0 && hour < 24) {
        hourlySales[hour].sales += transaction.totalUSD;
      }
    });
    const activeHourIndexes = hourlySales
      .map((entry, index) => (entry.sales > 0 ? index : -1))
      .filter((index) => index >= 0);
    const hourlySalesView =
      activeHourIndexes.length > 0
        ? hourlySales.slice(
            Math.max(0, activeHourIndexes[0] - 1),
            Math.min(24, activeHourIndexes[activeHourIndexes.length - 1] + 2)
          )
        : hourlySales.slice(8, 20);

    return {
      totalRevenue,
      totalTransactions,
      averageTicket,
      topProducts,
      paymentBreakdown,
      hourlySales: hourlySalesView,
    };
  }, [completedTransactions]);

  const COLORS = ['#10b981', '#06b6d4', '#64748b', '#f59e0b', '#ef4444'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t('analytics')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-mono text-2xl font-bold">
                  {formatCurrency(analytics.totalRevenue, 'USD')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('transactions')}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalTransactions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('averageTicket')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-mono text-2xl font-bold">
                  {formatCurrency(analytics.averageTicket, 'USD')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>{t('topProducts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.quantity} {t('items')}
                        </div>
                      </div>
                      <div className="font-mono font-semibold">
                        {formatCurrency(product.revenue, 'USD')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>{t('paymentMethods')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.paymentBreakdown}
                      dataKey="total"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {analytics.paymentBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, 'USD')} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Sales */}
          <Card>
            <CardHeader>
              <CardTitle>{t('hourlySales')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.hourlySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value, 'USD')} />
                  <Bar dataKey="sales" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose}>{t('close')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
