'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Package } from 'lucide-react';
import { SalesSummaryBreakdownItem } from '@/app/services/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

export interface TopProductsTableProps {
  products: SalesSummaryBreakdownItem[];
  isLoading?: boolean;
}

export function TopProductsTable({ products, isLoading }: TopProductsTableProps) {
  const t = useTranslations('Dashboard.topProducts');
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

  const top5 = products.slice(0, 5);

  return (
    <Card className={cn(isLoading && 'animate-pulse')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-5 w-5 text-purple-500" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {top5.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('product')}
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('qty')}
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('revenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {top5.map((item, idx) => (
                  <tr key={`${item.product_id}-${idx}`} className="hover:bg-muted/50">
                    <td className="px-2 py-2.5 text-sm text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-2.5 text-sm font-medium text-foreground">
                      {item.product_name || t('unknownProduct')}
                    </td>
                    <td className="px-2 py-2.5 text-sm text-foreground text-right">
                      {formatNumber(item.total_quantity || 0)}
                    </td>
                    <td className="px-2 py-2.5 text-sm text-foreground text-right font-medium">
                      {formatCurrency(item.total_revenue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6">
            <EmptyState
              title={isLoading ? tCommon('loadingData') : t('noSales')}
              description={
                isLoading ? undefined : t('noCompletedToday')
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}