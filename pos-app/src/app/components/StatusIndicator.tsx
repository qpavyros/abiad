import { cn } from '../../../lib/utils';

interface StatusIndicatorProps {
  online: boolean;
  className?: string;
}

export function StatusIndicator({ online, className }: StatusIndicatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
        online
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-error/10 text-error border border-error/20',
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          online ? 'bg-success' : 'bg-error'
        )}
      />
      {online ? 'Online' : 'Offline'}
    </div>
  );
}
