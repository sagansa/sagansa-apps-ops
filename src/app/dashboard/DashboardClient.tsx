'use client';

import { useEffect, useState } from 'react';
import { useStoreContext } from '@/app/contexts/StoreContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  UserCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { KpiCard } from './components/KpiCard';
import { SalesTrendChart } from './components/SalesTrendChart';
import { AlertPanel } from './components/AlertPanel';
import { TopProductsTable } from './components/TopProductsTable';
import { StorePerformance } from './components/StorePerformance';
import { OperationsStatus } from './components/OperationsStatus';
import { useDashboardData } from './hooks/useDashboardData';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('id-ID').format(value || 0);

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
};

const formatDateLong = (): string => {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function DashboardClient() {
  const { user } = useAuth();
  const { stores, fetchStores } = useStoreContext();
  const [storeId, setStoreId] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const tenantId = user?.tenant?.id;

  // Fetch stores when tenant is available
  useEffect(() => {
    if (tenantId) {
      fetchStores(tenantId);
    }
  }, [tenantId, fetchStores]);

  const {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useDashboardData(stores, storeId, tenantId);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!autoRefresh || !tenantId) return;
    const interval = setInterval(() => {
      refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, tenantId, refresh]);

  const salesTodayTotals = data?.salesToday?.totals;
  const salesYesterdayTotals = data?.salesYesterday?.totals;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateLong()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Store Filter */}
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.nickname || store.name}
              </option>
            ))}
          </select>

          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs"
          >
            <Clock className="h-3.5 w-3.5" />
            Auto
          </Button>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
        </p>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Sebagian data gagal dimuat
            </p>
            <p className="text-xs text-amber-700 mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
            Coba lagi
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Revenue Hari Ini"
          value={formatCurrency(salesTodayTotals?.total_revenue ?? 0)}
          icon={DollarSign}
          color="green"
          subtitle="Completed orders"
          previousValue={salesYesterdayTotals?.total_revenue}
          currentValue={salesTodayTotals?.total_revenue}
          isLoading={loading && !data}
        />
        <KpiCard
          title="Orders Hari Ini"
          value={formatNumber(salesTodayTotals?.total_orders ?? 0)}
          icon={ShoppingCart}
          color="blue"
          subtitle="Completed transactions"
          previousValue={salesYesterdayTotals?.total_orders}
          currentValue={salesTodayTotals?.total_orders}
          isLoading={loading && !data}
        />
        <KpiCard
          title="Avg Order Value"
          value={formatCurrency(salesTodayTotals?.average_order_value ?? 0)}
          icon={TrendingUp}
          color="indigo"
          subtitle="Revenue / orders"
          previousValue={salesYesterdayTotals?.average_order_value}
          currentValue={salesTodayTotals?.average_order_value}
          isLoading={loading && !data}
        />
        <KpiCard
          title="Active POS Shifts"
          value={formatNumber(data?.shifts.open.length ?? 0)}
          icon={Clock}
          color="amber"
          subtitle={`${data?.shifts.overdue.length ?? 0} overdue`}
          isLoading={loading && !data}
        />
        <KpiCard
          title="Staff Hadir"
          value={formatNumber(
            (data?.attendanceToday ?? []).filter((a) => a.check_in && !a.check_out).length,
          )}
          icon={UserCheck}
          color="teal"
          subtitle="Sedang check-in"
          isLoading={loading && !data}
        />
      </div>

      {/* Sales Trend + Alert Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesTrendChart chartData={data?.chart7d ?? null} isLoading={loading && !data} />
        </div>
        <div className="lg:col-span-1">
          <AlertPanel
            overdueShifts={data?.shifts.overdue ?? []}
            pendingLeaves={data?.pendingLeaves ?? []}
            isLoading={loading && !data}
          />
        </div>
      </div>

      {/* Top Products + Store Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductsTable
          products={data?.topProducts ?? []}
          isLoading={loading && !data}
        />
        <StorePerformance
          byStore={data?.byStore ?? []}
          isLoading={loading && !data}
        />
      </div>

      {/* Operations Status */}
      <OperationsStatus
        openShifts={data?.shifts.open ?? []}
        overdueShifts={data?.shifts.overdue ?? []}
        attendanceToday={data?.attendanceToday ?? []}
        stores={stores}
        isLoading={loading && !data}
      />

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/products">Kelola Produk</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/reports/summary">Laporan Penjualan</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/shift-management">Manajemen Shift</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/attendance">Attendance</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/team-members">Tim</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/transactions">Receipts</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}