import { StockStatus } from '../types';
import { cn } from '../../../lib/utils';

interface StockBadgeProps {
  status: StockStatus;
  className?: string;
}

export function StockBadge({ status, className }: StockBadgeProps) {
  const variants = {
    'in-stock': 'bg-success/10 text-success border-success/20',
    'low-stock': 'bg-red-500/10 text-red-600 border-red-500/20',
    'out-of-stock': 'bg-error/10 text-error border-error/20',
  };

  const labels = {
    'in-stock': 'In Stock',
    'low-stock': 'Low Stock',
    'out-of-stock': 'Out of Stock',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
        variants[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}
