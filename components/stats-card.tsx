import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'default' | 'profit' | 'loss' | 'neutral' | 'volume';

interface StatsCardProps {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  subLabel?: string;
  icon?: ReactNode;
  variant?: CardVariant;
  className?: string;
}

// Top accent bar: profit/loss use semantic data colors; volume/neutral/default
// use white-opacity steps to keep the monochrome luxury aesthetic.
const accentBar: Record<CardVariant, string> = {
  default: 'bg-border',
  profit:  'bg-otc-profit',
  loss:    'bg-otc-loss',
  neutral: 'bg-white/20',
  volume:  'bg-white/30',
};

const valueColor: Record<CardVariant, string> = {
  default: 'text-foreground',
  profit:  'text-otc-profit',
  loss:    'text-otc-loss',
  neutral: 'text-foreground',
  volume:  'text-otc-volume',
};

export function StatsCard({
  label,
  value,
  subValue,
  subLabel,
  icon,
  variant = 'default',
  className,
}: StatsCardProps) {
  return (
    <div className={cn(
      'sheen relative overflow-hidden rounded-xl border border-border bg-card shadow-sm',
      className
    )}>
      {/* Top accent bar */}
      <div className={cn('h-0.5 w-full', accentBar[variant])} />

      <div className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </span>
          {icon && (
            <span className="text-muted-foreground/40">
              {icon}
            </span>
          )}
        </div>

        <p className={cn(
          'font-mono text-2xl font-bold leading-none tracking-tight',
          valueColor[variant]
        )}>
          {value}
        </p>

        {subValue && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">{subValue}</p>
        )}

        {subLabel && (
          <p className="mt-3 text-xs text-muted-foreground/70">{subLabel}</p>
        )}
      </div>
    </div>
  );
}
