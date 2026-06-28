'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: 'green' | 'blue' | 'indigo' | 'amber' | 'teal' | 'purple' | 'orange' | 'red';
  subtitle?: string;
  previousValue?: number;
  currentValue?: number;
  isLoading?: boolean;
  invertTrend?: boolean;
  trendUpLabel?: (pct: number) => string;
  trendStableLabel?: string;
}

const iconColorClasses = {
  green: 'text-green-500',
  blue: 'text-blue-500',
  indigo: 'text-indigo-500',
  amber: 'text-amber-500',
  teal: 'text-teal-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  red: 'text-red-500',
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  previousValue,
  currentValue,
  isLoading,
  invertTrend,
  trendUpLabel,
  trendStableLabel,
}: KpiCardProps) {
  let trendPercentage: number | null = null;
  let isPositiveTrend = false;
  let isNeutral = false;

  if (
    previousValue !== undefined &&
    currentValue !== undefined &&
    previousValue > 0
  ) {
    trendPercentage = ((currentValue - previousValue) / previousValue) * 100;
    if (trendPercentage > 0) {
      isPositiveTrend = invertTrend ? false : true;
    } else if (trendPercentage < 0) {
      isPositiveTrend = invertTrend ? true : false;
    } else {
      isNeutral = true;
    }
  }

  return (
    <Card className={cn(isLoading && 'animate-pulse')}>
      <CardContent>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <Icon className={cn('h-4 w-4 flex-shrink-0', iconColorClasses[color])} />
        </div>
        <p className="mt-2 text-2xl font-bold text-foreground">
          {isLoading ? '—' : value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trendPercentage !== null && !isNeutral && (
          <div
            className={cn(
              'mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              isPositiveTrend
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700',
            )}
          >
            {trendPercentage > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trendUpLabel
              ? trendUpLabel(Math.abs(trendPercentage))
              : `${Math.abs(trendPercentage).toFixed(1)}% vs kemarin`}
          </div>
        )}
        {isNeutral && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
            <Minus className="h-3 w-3" />
            {trendStableLabel ?? 'Stabil vs kemarin'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}