'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { useStoreContext } from '@/app/contexts/StoreContext';
import { useAuth } from '@/app/contexts/AuthContext';
import apiService, { SalesSummary } from '@/app/services/api';
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

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

type Preset = 'last-month' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom';

export default function SummaryClient() {
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
      setError(err?.message || 'Failed to load sales summary');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, storeId, source]);

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

  const metricCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(summary?.totals.total_revenue ?? 0),
      icon: DollarSign,
      color: 'bg-green-500',
      subtitle: 'Completed orders only',
    },
    {
      title: 'Total Orders',
      value: formatNumber(summary?.totals.total_orders ?? 0),
      icon: ShoppingCart,
      color: 'bg-blue-500',
      subtitle: 'Completed transactions',
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(summary?.totals.average_order_value ?? 0),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      subtitle: 'Revenue / orders',
    },
    {
      title: 'Total Subtotal',
      value: formatCurrency(summary?.totals.total_subtotal ?? 0),
      icon: Receipt,
      color: 'bg-slate-500',
      subtitle: 'Before adjustments',
    },
    {
      title: 'Total Discount',
      value: formatCurrency(summary?.totals.total_discount ?? 0),
      icon: Percent,
      color: 'bg-orange-500',
      subtitle: 'Discounts given',
    },
    {
      title: 'Total Tax',
      value: formatCurrency(summary?.totals.total_tax ?? 0),
      icon: Wallet,
      color: 'bg-purple-500',
      subtitle: 'Tax collected',
    },
    {
      title: 'Total Service',
      value: formatCurrency(summary?.totals.total_service ?? 0),
      icon: Receipt,
      color: 'bg-teal-500',
      subtitle: 'Service charge',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Summary</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ringkasan penjualan dari point-of-sale dan web order.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Pilih periode, store, dan sumber transaksi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Preset buttons */}
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
              {/* Start Date */}
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

              {/* End Date */}
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

              {/* Store */}
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

              {/* Source */}
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
            </div>

            <div className="flex justify-end">
              <button
                onClick={fetchSummary}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="mt-1 text-xs text-gray-400">{card.subtitle}</p>
                  </div>
                  <div className={`${card.color} rounded-lg p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
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
              Orders by Status
            </CardTitle>
            <CardDescription>Semua order dalam periode terpilih</CardDescription>
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
                        <span className="text-sm font-medium text-gray-900">{formatNumber(item.count)} orders</span>
                        <span className="ml-3 text-sm text-gray-500">{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </CardContent>
        </Card>

        {/* By Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              Orders by Source
            </CardTitle>
            <CardDescription>POS vs Web Order</CardDescription>
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
                      <span className="text-sm font-medium text-gray-900">{formatNumber(item.count)} orders</span>
                      <span className="ml-3 text-sm text-gray-500">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </CardContent>
        </Card>

        {/* By Store */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <StoreIcon className="h-5 w-5 text-gray-500" />
              Revenue by Store
            </CardTitle>
            <CardDescription>Completed orders per store</CardDescription>
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
                      <span className="text-sm font-medium text-gray-900">{formatNumber(item.count)} orders</span>
                      <span className="ml-3 text-sm text-gray-500">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </CardContent>
        </Card>

        {/* By Payment Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-gray-500" />
              Payment Method Breakdown
            </CardTitle>
            <CardDescription>Metode pembayaran terpakai</CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.by_payment_type.length ? (
              <div className="space-y-3">
                {summary.by_payment_type.map((item, idx) => (
                  <div key={item.payment_type_id || idx} className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {item.payment_type_name || 'Unknown'}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{formatNumber(item.order_count || 0)} orders</span>
                      <span className="ml-3 text-sm text-gray-500">{formatCurrency(item.total_amount || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-gray-500" />
            Top Products
          </CardTitle>
          <CardDescription>10 produk terlaris berdasarkan kuantitas</CardDescription>
        </CardHeader>
        <CardContent>
          {summary?.top_products.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
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
            <p className="text-sm text-gray-400">No data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}