import { CartItem as CartItemType, Language } from '../types';
import { Minus, Plus, X, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { formatCurrency } from '../utils';
import { cn } from '../../lib/utils';

interface CartItemProps {
  item: CartItemType;
  lang: Language;
  exchangeRate: number;
  localCurrency: string;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onApplyDiscount: (productId: string) => void;
  className?: string;
}

export function CartItem({
  item,
  lang,
  exchangeRate,
  localCurrency,
  onUpdateQuantity,
  onRemove,
  onApplyDiscount,
  className,
}: CartItemProps) {
  const displayName = lang === 'ar' ? item.product.nameAr : item.product.name;
  const itemTotal = item.product.priceUSD * item.quantity;
  const discountAmount = (itemTotal * item.discount) / 100;
  const finalTotal = itemTotal - discountAmount;
  const localTotal = finalTotal * exchangeRate;

  return (
    <div className={cn('flex items-start gap-3 py-3 border-b border-border', className)}>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-foreground truncate">{displayName}</h4>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.product.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-md">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="font-mono text-sm font-medium w-8 text-center">
              {item.quantity}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => onApplyDiscount(item.product.id)}
          >
            <Tag className="h-3 w-3" />
            {item.discount > 0 ? `${item.discount}%` : 'Discount'}
          </Button>
        </div>

        <div className="space-y-0.5">
          {item.discount > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground line-through">
              <span>{formatCurrency(itemTotal, 'USD')}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatCurrency(finalTotal, 'USD')}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatCurrency(localTotal, localCurrency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
