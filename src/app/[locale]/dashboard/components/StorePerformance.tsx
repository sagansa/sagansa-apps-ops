'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Store as StoreIcon } from 'lucide-react';
import { SalesSummaryBreakdownItem } from '@/app/services/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

export interface StorePerformanceProps {
  byStore: SalesSummaryBreakdownItem[];
  isLoading?: boolean;
}

export function StorePerformance({ byStore, isLoading }: StorePerformanceProps) {
  const t = useTranslations('Dashboard.storePerf');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID').format(value || 0);

  const top5 = byStore.slice(0, 5);
  const totalRevenue = byStore.reduce((sum, s) => sum + (s.total || 0), 0);

  return (
    <Card className={cn(isLoading && 'animate-pulse')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <StoreIcon className="h-5 w-5 text-blue-500" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {top5.length > 0 ? (
          <div className="space-y-3">
            {top5.map((store, idx) => {
              const share =
                totalRevenue > 0 ? ((store.total / totalRevenue) * 100).toFixed(1) : '0';
              return (
                <div key={store.store_id || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground truncate flex-1">
                      {store.store_nickname || store.store_name || tCommon('unknown')}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {t('orders', { count: formatNumber(store.count || 0) })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-20 text-right">
                      {formatCurrency(store.total || 0)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{t('share', { pct: share })}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6">
            <EmptyState
              title={isLoading ? tCommon('loadingData') : t('noStoreData')}
              description={
                isLoading ? undefined : t('noTransactions')
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}