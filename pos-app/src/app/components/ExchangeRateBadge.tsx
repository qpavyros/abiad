import { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../../lib/utils';

interface ExchangeRateBadgeProps {
  rate: number;
  currency: string;
  source: 'manual' | 'auto';
  onRateChange: (rate: number, source: 'manual' | 'auto') => void;
  className?: string;
}

export function ExchangeRateBadge({
  rate,
  currency,
  source,
  onRateChange,
  className,
}: ExchangeRateBadgeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRate, setTempRate] = useState(rate.toString());

  const handleSave = () => {
    const newRate = parseFloat(tempRate);
    if (!isNaN(newRate) && newRate > 0) {
      onRateChange(newRate, 'manual');
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempRate(rate.toString());
    setIsEditing(false);
  };

  const handleAuto = () => {
    onRateChange(rate, 'auto');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg',
          className
        )}
      >
        <span className="text-sm text-muted-foreground">1 USD =</span>
        <Input
          type="number"
          value={tempRate}
          onChange={(e) => setTempRate(e.target.value)}
          className="w-24 h-7 text-sm font-mono"
          autoFocus
        />
        <span className="text-sm text-muted-foreground">{currency}</span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSave}
          >
            <Check className="h-4 w-4 text-success" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleCancel}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={handleAuto}
        >
          Auto
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors',
        className
      )}
    >
      <span className="text-sm text-muted-foreground">1 USD =</span>
      <span className="text-sm font-mono font-medium">
        {rate.toLocaleString()}
      </span>
      <span className="text-sm text-muted-foreground">{currency}</span>
      <span
        className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          source === 'auto'
            ? 'bg-info/10 text-info'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {source === 'auto' ? 'Auto' : 'Manual'}
      </span>
      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
