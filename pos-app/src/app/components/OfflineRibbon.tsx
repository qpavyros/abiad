import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface OfflineRibbonProps {
  message: string;
  className?: string;
}

export function OfflineRibbon({ message, className }: OfflineRibbonProps) {
  return (
    <div
      className={cn(
        'w-full bg-warning/90 text-warning-foreground px-4 py-2 flex items-center justify-center gap-2',
        className
      )}
    >
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
