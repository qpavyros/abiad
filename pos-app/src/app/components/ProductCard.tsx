import type { KeyboardEvent } from 'react';
import { Product, Language } from '../types';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { StockBadge } from './StockBadge';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../utils';

interface ProductCardProps {
  product: Product;
  lang: Language;
  exchangeRate: number;
  localCurrency: string;
  onAddToCart: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  canManageProductActions?: boolean;
  className?: string;
}

export function ProductCard({
  product,
  lang,
  exchangeRate,
  localCurrency,
  onAddToCart,
  onEdit,
  onDelete,
  canManageProductActions = true,
  className,
}: ProductCardProps) {
  const isOutOfStock = product.stockStatus === 'out-of-stock';
  const displayName = lang === 'ar' ? product.nameAr : product.name;
  const localPrice = product.priceUSD * exchangeRate;
  const handleCardClick = () => {
    if (!isOutOfStock) {
      onAddToCart(product);
    }
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isOutOfStock) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAddToCart(product);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      aria-disabled={isOutOfStock}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        'relative bg-card border border-border rounded-lg p-4 text-left transition-all hover:shadow-md hover:border-accent',
        !isOutOfStock && 'cursor-pointer',
        isOutOfStock && 'opacity-50 cursor-not-allowed hover:shadow-none hover:border-border',
        className
      )}
    >
      {isOutOfStock && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <span className="text-lg font-medium text-error">Out of Stock</span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{displayName}</h3>
          </div>
          <StockBadge status={product.stockStatus} />
        </div>

        <div className="space-y-1">
          <div className="font-mono text-lg font-semibold text-foreground">
            {formatCurrency(product.priceUSD, 'USD')}
          </div>
          <div className="font-mono text-sm text-muted-foreground">
            {formatCurrency(localPrice, localCurrency)}
          </div>
        </div>

        {canManageProductActions && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
