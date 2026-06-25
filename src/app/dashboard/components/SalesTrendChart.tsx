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

type Metric = 'gross_sales' | 'net_sales' | 'gross_profit';

const METRIC_CONFIG: Record<
  Metric,
  { label: string; color: string; description: string }
> = {
  gross_sales: {
    label: 'Gross Sales',
    color: '#10b981',
    description: 'Total penjualan sebelum discount/refund',
  },
  net_sales: {
    label: 'Net Sales',
    color: '#3b82f6',
    description: 'Gross − Refund − Discount',
  },
  gross_profit: {
    label: 'Gross Profit',
    color: '#8b5cf6',
    description: 'Net Sales − COGS (harga modal)',
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

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
  const [activeMetric, setActiveMetric] = useState<Metric>('net_sales');

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
          Sales Trend — 7 Hari Terakhir
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
                  Total {activeConfig.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {series.length} data points
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
              title={isLoading ? 'Memuat data...' : 'Belum ada data'}
              description={
                isLoading ? undefined : 'Data sales 7 hari terakhir belum tersedia'
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}