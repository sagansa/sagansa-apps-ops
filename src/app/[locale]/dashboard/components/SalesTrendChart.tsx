'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { SalesChart } from '@/app/services/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTranslations, useLocale } from 'next-intl';

type Metric = 'gross_sales' | 'net_sales' | 'gross_profit';

const METRIC_COLORS: Record<Metric, string> = {
  gross_sales: '#10b981',
  net_sales: '#3b82f6',
  gross_profit: '#8b5cf6',
};

const formatCompactCurrency = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs}`;
};

const formatPeriodLabel = (period: string): string => {
  try {
    const [, month, day] = period.split('-');
    return `${day}/${month}`;
  } catch {
    return period;
  }
};

export interface SalesTrendChartProps {
  chartData: SalesChart | null;
  isLoading?: boolean;
}

export function SalesTrendChart({ chartData, isLoading }: SalesTrendChartProps) {
  const t = useTranslations('Dashboard.salesTrend');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const [activeMetric, setActiveMetric] = useState<Metric>('net_sales');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);

  const METRIC_CONFIG: Record<
    Metric,
    { label: string; color: string; description: string }
  > = {
    gross_sales: {
      label: t('metrics.grossSales'),
      color: METRIC_COLORS.gross_sales,
      description: t('metrics.grossSalesDesc'),
    },
    net_sales: {
      label: t('metrics.netSales'),
      color: METRIC_COLORS.net_sales,
      description: t('metrics.netSalesDesc'),
    },
    gross_profit: {
      label: t('metrics.grossProfit'),
      color: METRIC_COLORS.gross_profit,
      description: t('metrics.grossProfitDesc'),
    },
  };

  const series = chartData?.series ?? [];
  const totals = chartData?.totals;
  const hasData = series.length > 0;

  const activeConfig = METRIC_CONFIG[activeMetric];
  const activeTotal = (totals?.[activeMetric] as number) ?? 0;

  const chartDataWithLabels = series.map((item) => ({
    ...item,
    label: formatPeriodLabel(item.period),
  }));

  return (
    <Card className={isLoading ? 'animate-pulse' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: activeConfig.color }}
          />
          {t('title')}
        </CardTitle>
        <CardDescription>{activeConfig.description}</CardDescription>
        <div className="flex gap-2 mt-2">
          {(Object.keys(METRIC_CONFIG) as Metric[]).map((metric) => (
            <button
              key={metric}
              onClick={() => setActiveMetric(metric)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeMetric === metric
                  ? 'text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              style={
                activeMetric === metric
                  ? { backgroundColor: METRIC_CONFIG[metric].color }
                  : {}
              }
            >
              {METRIC_CONFIG[metric].label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold text-foreground">
                  {formatCurrency(activeTotal)}
                </span>
                <span className="ml-3 text-sm text-muted-foreground">
                  {t('totalLabel', { metric: activeConfig.label })}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {t('dataPoints', { count: series.length })}
              </span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataWithLabels}
                  margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    angle={0}
                    height={30}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatCompactCurrency}
                    width={70}
                  />
                  <RechartsTooltip
                    formatter={(value) => [
                      formatCurrency(Number(value) || 0),
                      activeConfig.label,
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey={activeMetric} radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {chartDataWithLabels.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={activeConfig.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[250px]">
            <EmptyState
              title={isLoading ? tCommon('loadingData') : t('noData')}
              description={
                isLoading ? undefined : t('noDataDesc')
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}