 'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { useStoreContext } from '@/app/contexts/StoreContext';
import { useAuth } from '@/app/contexts/AuthContext';
import apiService, { SalesChart } from '@/app/services/api';
import { RefreshCw, BarChart3, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

type Preset = 'last-month' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom';
type GroupBy = 'hour' | 'day' | 'week' | 'month';

interface MetricConfig {
  key: 'gross_sales' | 'refunds' | 'discounts' | 'net_sales' | 'gross_profit';
  label: string;
  description: string;
  color: string;
}

const METRICS: MetricConfig[] = [
  {
    key: 'gross_sales',
    label: 'Gross Sales',
    description: 'SUM(subtotal) — total harga sebelum discount/refund/tax/service',
    color: '#10b981',
  },
  {
    key: 'refunds',
    label: 'Refunds',
    description: 'SUM(total_refunded) — total pengembalian uang ke customer',
    color: '#ef4444',
  },
  {
    key: 'discounts',
    label: 'Discounts',
    description: 'SUM(discount_total) — total diskon yang diberikan',
    color: '#f97316',
  },
  {
    key: 'net_sales',
    label: 'Net Sales',
    description: 'Gross Sales − Refunds − Discounts (pendapatan bersih)',
    color: '#3b82f6',
  },
  {
    key: 'gross_profit',
    label: 'Gross Profit',
    description: 'Net Sales − COGS (laba kotor setelah dikurangi harga modal)',
    color: '#8b5cf6',
  },
];

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

const formatPeriodLabel = (period: string, groupBy: string): string => {
  try {
    if (groupBy === 'hour') {
      const [, time] = period.split(' ');
      return time || period;
    }
    if (groupBy === 'month') {
      const [year, month] = period.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthIdx = parseInt(month, 10) - 1;
      return `${monthNames[monthIdx] || month} ${year?.slice(2)}`;
    }
    if (groupBy === 'week') {
      return period;
    }
    const [, month, day] = period.split('-');
    return `${day}/${month}`;
  } catch {
    return period;
  }
};

export default function ChartClient() {
  const { stores, fetchStores } = useStoreContext();
  const { user } = useAuth();

  const today = new Date();
  const defaultStart = new Date(today);
  const defaultOrigDay = defaultStart.getDate();
  defaultStart.setMonth(defaultStart.getMonth() - 1);
  if (defaultStart.getDate() < defaultOrigDay) {
    defaultStart.setDate(0);
  }
  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - 1);
  const [preset, setPreset] = useState<Preset>('last-month');
  const [startDate, setStartDate] = useState(formatDate(defaultStart));
  const [endDate, setEndDate] = useState(formatDate(defaultEnd));
  const [startHour, setStartHour] = useState<string>('');
  const [endHour, setEndHour] = useState<string>('');
  const [storeId, setStoreId] = useState('');
  const [source, setSource] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [chartData, setChartData] = useState<SalesChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tenant?.id) {
      fetchStores(user.tenant.id);
    }
  }, [user?.tenant?.id, fetchStores]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    switch (p) {
      case 'last-month': {
        const origDay = start.getDate();
        start.setMonth(start.getMonth() - 1);
        if (start.getDate() < origDay) {
          start.setDate(0);
        }
        end.setDate(now.getDate() - 1);
        break;
      }
      case 'today':
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        end.setDate(now.getDate() - 1);
        break;
      case 'this-week': {
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        start = new Date(now);
        start.setDate(now.getDate() - diff);
        end = new Date(now);
        break;
      }
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now);
        break;
      case 'custom':
        return;
    }

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      setGroupBy('hour');
    } else if (diffDays <= 31) {
      setGroupBy('day');
    } else if (diffDays <= 180) {
      setGroupBy('week');
    } else {
      setGroupBy('month');
    }
  };

  const fetchChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getSalesChart({
        startDate,
        endDate,
        startHour: startHour !== '' ? Number(startHour) : undefined,
        endHour: endHour !== '' ? Number(endHour) : undefined,
        storeId: storeId || undefined,
        source: source || undefined,
        createdBy: createdBy || undefined,
        groupBy,
      });
      setChartData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load sales chart data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, startHour, endHour, storeId, source, createdBy, groupBy]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const series = chartData?.series ?? [];
  const totals = chartData?.totals;
  const hasData = series.length > 0;

  const [activeMetric, setActiveMetric] = useState<MetricConfig['key']>('gross_sales');

  const activeConfig = METRICS.find((m) => m.key === activeMetric) ?? METRICS[0];
  const activeTotal = (totals?.[activeMetric] as number) ?? 0;

  const chartDataWithLabels = series.map((item) => ({
    ...item,
    label: formatPeriodLabel(item.period, groupBy),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-indigo-500 p-2">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sales Bar Chart</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Visualisasi Gross Sales, Refunds, Discounts, Net Sales, dan Gross Profit
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Pilih rentang waktu, jam, store, dan employee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['last-month', 'today', 'yesterday', 'this-week', 'this-month', 'custom'] as Preset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    preset === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p === 'last-month' && '1 Bulan'}
                  {p === 'today' && 'Hari Ini'}
                  {p === 'yesterday' && 'Kemarin'}
                  {p === 'this-week' && 'Minggu Ini'}
                  {p === 'this-month' && 'Bulan Ini'}
                  {p === 'custom' && 'Custom'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setPreset('custom');
                    setStartDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setPreset('custom');
                    setEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="hour">Per Jam</option>
                  <option value="day">Per Hari</option>
                  <option value="week">Per Minggu</option>
                  <option value="month">Per Bulan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.nickname || store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Hour</label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Hours</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Hour</label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Hours</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Sources</option>
                  <option value="pos">POS</option>
                  <option value="web-order">Web Order</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee / Device ID</label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  placeholder="User UUID atau device identifier"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={fetchChart}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary Cards (all metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {METRICS.map((metric) => {
          const value = (totals?.[metric.key] as number) ?? 0;
          const isActive = activeMetric === metric.key;
          return (
            <button
              key={metric.key}
              onClick={() => setActiveMetric(metric.key)}
              className={`text-left rounded-lg border-2 p-4 transition-all ${
                isActive
                  ? 'bg-white shadow-md'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
              style={isActive ? { borderColor: metric.color } : {}}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />
                  <p className="text-xs font-medium text-gray-500">{metric.label}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center h-4 w-4 rounded-full border border-gray-300 text-gray-400 font-bold text-[9px] cursor-help hover:text-gray-600 hover:border-gray-400 transition-colors"
                    >
                      i
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{metric.description}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(value)}</p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                {isActive ? '● Sedang ditampilkan' : 'Klik untuk tampilkan'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Single Bar Chart (switches by activeMetric) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: activeConfig.color }}
            />
            {activeConfig.label}
          </CardTitle>
          <CardDescription>{activeConfig.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <>
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(activeTotal)}
                  </span>
                  <span className="ml-3 text-sm text-gray-500">{activeConfig.label}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {series.length} data points • Periode {chartData?.period.start_date} s/d {chartData?.period.end_date}
                </span>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartDataWithLabels}
                    margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={series.length > 20 ? Math.floor(series.length / 15) : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatCompactCurrency}
                      width={70}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => [formatCurrency(Number(value) || 0), activeConfig.label]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey={activeMetric}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    >
                      {chartDataWithLabels.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={activeConfig.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <p className="text-sm">No data to display. Try adjusting filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Data</CardTitle>
            <CardDescription>Breakdown per periode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Sales</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Refunds</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discounts</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Sales</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">COGS</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Profit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {series.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatPeriodLabel(item.period, groupBy)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.gross_sales)}</td>
                      <td className="px-4 py-3 text-sm text-red-600 text-right">{formatCurrency(item.refunds)}</td>
                      <td className="px-4 py-3 text-sm text-orange-600 text-right">{formatCurrency(item.discounts)}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 text-right">{formatCurrency(item.net_sales)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(item.cogs)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-purple-600 text-right">{formatCurrency(item.gross_profit)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.order_count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr className="font-semibold">
                    <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(totals?.gross_sales ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right">{formatCurrency(totals?.refunds ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-orange-600 text-right">{formatCurrency(totals?.discounts ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 text-right">{formatCurrency(totals?.net_sales ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(totals?.cogs ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-purple-600 text-right">{formatCurrency(totals?.gross_profit ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{totals?.order_count ?? 0}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}