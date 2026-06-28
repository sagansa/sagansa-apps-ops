'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { useStoreContext } from '@/app/contexts/StoreContext';
import { useAuth } from '@/app/contexts/AuthContext';
import apiService, { SalesSummary } from '@/app/services/api';
import { formatCompactCurrency } from '@/lib/format';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Receipt,
  Percent,
  Wallet,
  Package,
  CreditCard,
  Store as StoreIcon,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

type Preset = 'last-month' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom';

export default function SummaryClient() {
  const { stores, fetchStores } = useStoreContext();
  const { user } = useAuth();
  const t = useTranslations('Reports.summary');
  const tCommon = useTranslations('Common');

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
  const [storeId, setStoreId] = useState('');
  const [source, setSource] = useState('');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stores when tenant is available
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
        const day = now.getDay(); // 0 = Sunday
        const diff = day === 0 ? 6 : day - 1; // Monday as first day
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
        return; // don't auto-change dates
    }

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getSalesSummary({
        startDate,
        endDate,
        storeId: storeId || undefined,
        source: source || undefined,
      });
      setSummary(data);
    } catch (err: any) {
      setError(err?.message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, storeId, source, t]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value || 0);
  };

  const presetLabels: Record<Preset, string> = {
    'last-month': t('presets.lastMonth'),
    today: t('presets.today'),
    yesterday: t('presets.yesterday'),
    'this-week': t('presets.thisWeek'),
    'this-month': t('presets.thisMonth'),
    custom: t('presets.custom'),
  };

  const metricCards = [
    {
      title: t('metrics.totalRevenue'),
      raw: summary?.totals.total_revenue ?? 0,
      value: formatCompactCurrency(summary?.totals.total_revenue ?? 0),
      fullValue: formatCurrency(summary?.totals.total_revenue ?? 0),
      icon: DollarSign,
      color: 'text-green-500',
      subtitle: t('metrics.totalRevenueSub'),
    },
    {
      title: t('metrics.totalOrders'),
      raw: summary?.totals.total_orders ?? 0,
      value: formatNumber(summary?.totals.total_orders ?? 0),
      fullValue: null,
      icon: ShoppingCart,
      color: 'text-blue-500',
      subtitle: t('metrics.totalOrdersSub'),
    },
    {
      title: t('metrics.averageOrderValue'),
      raw: summary?.totals.average_order_value ?? 0,
      value: formatCompactCurrency(summary?.totals.average_order_value ?? 0),
      fullValue: formatCurrency(summary?.totals.average_order_value ?? 0),
      icon: TrendingUp,
      color: 'text-indigo-500',
      subtitle: t('metrics.averageOrderValueSub'),
    },
    {
      title: t('metrics.totalSubtotal'),
      raw: summary?.totals.total_subtotal ?? 0,
      value: formatCompactCurrency(summary?.totals.total_subtotal ?? 0),
      fullValue: formatCurrency(summary?.totals.total_subtotal ?? 0),
      icon: Receipt,
      color: 'text-slate-500',
      subtitle: t('metrics.totalSubtotalSub'),
    },
    {
      title: t('metrics.totalDiscount'),
      raw: summary?.totals.total_discount ?? 0,
      value: formatCompactCurrency(summary?.totals.total_discount ?? 0),
      fullValue: formatCurrency(summary?.totals.total_discount ?? 0),
      icon: Percent,
      color: 'text-orange-500',
      subtitle: t('metrics.totalDiscountSub'),
    },
    {
      title: t('metrics.totalTax'),
      raw: summary?.totals.total_tax ?? 0,
      value: formatCompactCurrency(summary?.totals.total_tax ?? 0),
      fullValue: formatCurrency(summary?.totals.total_tax ?? 0),
      icon: Wallet,
      color: 'text-purple-500',
      subtitle: t('metrics.totalTaxSub'),
    },
    {
      title: t('metrics.totalService'),
      raw: summary?.totals.total_service ?? 0,
      value: formatCompactCurrency(summary?.totals.total_service ?? 0),
      fullValue: formatCurrency(summary?.totals.total_service ?? 0),
      icon: Receipt,
      color: 'text-teal-500',
      subtitle: t('metrics.totalServiceSub'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('filters')}</CardTitle>
          <CardDescription>{t('filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
              {(['last-month', 'today', 'yesterday', 'this-week', 'this-month', 'custom'] as Preset[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={preset === p ? 'default' : 'secondary'}
                  onClick={() => applyPreset(p)}
                >
                  {presetLabels[p]}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.startDate')}</label>
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

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.endDate')}</label>
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

              {/* Store */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.store')}</label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('options.allStores')}</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.nickname || store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.source')}</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('options.allSources')}</option>
                  <option value="pos">{t('options.pos')}</option>
                  <option value="web-order">{t('options.webOrder')}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={fetchSummary}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? tCommon('loading') : t('refresh')}
              </Button>
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <Icon className={`h-4 w-4 flex-shrink-0 ${card.color}`} />
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900" title={card.fullValue ?? undefined}>{card.value}</p>
                <p className="mt-1 text-xs text-gray-400">{card.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-gray-500" />
              {t('breakdowns.byStatus')}
            </CardTitle>
            <CardDescription>{t('breakdowns.byStatusDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.by_status.length ? (
              <div className="space-y-3">
                {summary.by_status.map((item) => {
                  const statusColors: Record<string, string> = {
                    completed: 'bg-green-100 text-green-800',
                    pending: 'bg-yellow-100 text-yellow-800',
                    cancelled: 'bg-red-100 text-red-800',
                    refunded: 'bg-gray-100 text-gray-800',
                  };
                  return (
                    <div key={item.status} className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${statusColors[item.status || ''] || 'bg-gray-100 text-gray-800'}`}>
                        {item.status}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">{t('ordersUnit', { count: formatNumber(item.count) })}</span>
                        <span className="ml-3 text-sm text-gray-500">{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{tCommon('noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* By Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              {t('breakdowns.bySource')}
            </CardTitle>
            <CardDescription>{t('breakdowns.bySourceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.by_source.length ? (
              <div className="space-y-3">
                {summary.by_source.map((item) => (
                  <div key={item.source} className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                      {item.source?.replace('-', ' ')}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{t('ordersUnit', { count: formatNumber(item.count) })}</span>
                      <span className="ml-3 text-sm text-gray-500">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{tCommon('noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* By Store */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <StoreIcon className="h-5 w-5 text-gray-500" />
              {t('breakdowns.byStore')}
            </CardTitle>
            <CardDescription>{t('breakdowns.byStoreDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.by_store.length ? (
              <div className="space-y-3">
                {summary.by_store.map((item) => (
                  <div key={item.store_id} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {item.store_nickname || item.store_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{t('ordersUnit', { count: formatNumber(item.count) })}</span>
                      <span className="ml-3 text-sm text-gray-500">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{tCommon('noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* By Payment Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-gray-500" />
              {t('breakdowns.byPayment')}
            </CardTitle>
            <CardDescription>{t('breakdowns.byPaymentDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.by_payment_type.length ? (
              <div className="space-y-3">
                {summary.by_payment_type.map((item, idx) => (
                  <div key={item.payment_type_id || idx} className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {item.payment_type_name || t('breakdowns.unknownPayment')}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{t('ordersUnit', { count: formatNumber(item.order_count || 0) })}</span>
                      <span className="ml-3 text-sm text-gray-500">{formatCurrency(item.total_amount || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{tCommon('noData')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-gray-500" />
            {t('topProducts')}
          </CardTitle>
          <CardDescription>{t('topProductsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {summary?.top_products.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.rank')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.product')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.quantity')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.revenue')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summary.top_products.map((item, idx) => (
                    <tr key={`${item.product_id}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(item.total_quantity || 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.total_revenue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{tCommon('noData')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

