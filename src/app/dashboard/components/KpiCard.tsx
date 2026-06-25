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
}

const colorClasses = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
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
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
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
                {Math.abs(trendPercentage).toFixed(1)}% vs kemarin
              </div>
            )}
            {isNeutral && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                <Minus className="h-3 w-3" />
                Stabil vs kemarin
              </div>
            )}
          </div>
          <div
            className={cn(
              'rounded-lg p-3 flex-shrink-0',
              colorClasses[color],
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}