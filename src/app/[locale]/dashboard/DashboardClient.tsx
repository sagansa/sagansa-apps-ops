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
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatCompactCurrency } from '@/lib/format';

const formatCurrency = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID').format(value || 0);

const getGreeting = (gt: (k: 'morning' | 'midday' | 'afternoon' | 'evening') => string): string => {
  const hour = new Date().getHours();
  if (hour < 11) return gt('morning');
  if (hour < 15) return gt('midday');
  if (hour < 18) return gt('afternoon');
  return gt('evening');
};

const formatDateLong = (locale: string): string => {
  return new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function DashboardClient() {
  const { user } = useAuth();
  const { stores, fetchStores } = useStoreContext();
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
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
            {getGreeting((k) => t(`greeting.${k}`))}, {user?.name?.split(' ')[0] || t('adminFallback')} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateLong(locale)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Store Filter */}
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{tCommon('allStores')}</option>
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
            {t('auto')}
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
            {tCommon('refresh')}
          </Button>
        </div>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          {t('lastUpdated', { time: lastUpdated.toLocaleTimeString(locale === 'en' ? 'en-US' : 'id-ID') })}
        </p>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {t('errorBanner')}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
            {tCommon('tryAgain')}
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title={t('kpi.revenueToday')}
          value={formatCompactCurrency(salesTodayTotals?.total_revenue ?? 0, locale)}
          icon={DollarSign}
          color="green"
          subtitle={t('kpi.revenueTodaySub')}
          previousValue={salesYesterdayTotals?.total_revenue}
          currentValue={salesTodayTotals?.total_revenue}
          isLoading={loading && !data}
          trendUpLabel={(pct) => t("trend.vsYesterday", { pct: pct.toFixed(1) })}
          trendStableLabel={t('trend.stable')}
        />
        <KpiCard
          title={t('kpi.ordersToday')}
          value={formatNumber(salesTodayTotals?.total_orders ?? 0, locale)}
          icon={ShoppingCart}
          color="blue"
          subtitle={t('kpi.ordersTodaySub')}
          previousValue={salesYesterdayTotals?.total_orders}
          currentValue={salesTodayTotals?.total_orders}
          isLoading={loading && !data}
          trendUpLabel={(pct) => t("trend.vsYesterday", { pct: pct.toFixed(1) })}
          trendStableLabel={t('trend.stable')}
        />
        <KpiCard
          title={t('kpi.avgOrderValue')}
          value={formatCompactCurrency(salesTodayTotals?.average_order_value ?? 0, locale)}
          icon={TrendingUp}
          color="indigo"
          subtitle={t('kpi.avgOrderValueSub')}
          previousValue={salesYesterdayTotals?.average_order_value}
          currentValue={salesTodayTotals?.average_order_value}
          isLoading={loading && !data}
          trendUpLabel={(pct) => t("trend.vsYesterday", { pct: pct.toFixed(1) })}
          trendStableLabel={t('trend.stable')}
        />
        <KpiCard
          title={t('kpi.activeShifts')}
          value={formatNumber(data?.shifts.open.length ?? 0, locale)}
          icon={Clock}
          color="amber"
          subtitle={t('kpi.activeShiftsSub', { count: data?.shifts.overdue.length ?? 0 })}
          isLoading={loading && !data}
        />
        <KpiCard
          title={t('kpi.staffPresent')}
          value={formatNumber(
            (data?.attendanceToday ?? []).filter((a) => a.check_in && !a.check_out).length, locale,
          )}
          icon={UserCheck}
          color="teal"
          subtitle={t('kpi.staffPresentSub')}
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
            {t('quickActions')}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/products">{t('quickLinks.manageProducts')}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports/summary">{t('quickLinks.salesReport')}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/shift-management">{t('quickLinks.shiftManagement')}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/attendance">{t('quickLinks.attendance')}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/team-members">{t('quickLinks.team')}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/transactions">{t('quickLinks.receipts')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}