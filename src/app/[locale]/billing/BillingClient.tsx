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
import apiService, {
  BillingCycle,
  BillingCycleStatus,
  BillingDashboard,
  BillingPreview,
} from '@/app/services/api';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  CreditCard,
  Clock,
  TrendingUp,
  Store as StoreIcon,
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatCompactCurrency = (value: number, locale: string) => {
  const abs = Math.abs(value || 0);
  const sign = value < 0 ? '-' : '';
  const prefix = 'Rp ';
  if (abs >= 1_000_000_000) return `${prefix}${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${prefix}${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${sign}${(abs / 1_000).toFixed(0)}K`;
  return formatCurrency(value, locale);
};

const formatPeriod = (year: number, month: number, locale: string) => {
  try {
    return new Date(year, month - 1, 1).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return `${month}/${year}`;
  }
};

const formatDate = (dateStr: string | null, locale: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const STATUS_STYLES: Record<string, string> = {
  trialing: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  exempt: 'bg-purple-100 text-purple-800',
};

const CYCLE_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function BillingClient() {
  const t = useTranslations('Billing');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const { activeTenant } = useAuth();
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, cyclesRes] = await Promise.all([
        apiService.getBillingDashboard(),
        apiService.getBillingCycles({ perPage: 12 }),
      ]);
      setDashboard(dash);
      const cyclesData = (cyclesRes as { data?: BillingCycle[] })?.data ?? [];
      setCycles(cyclesData);
    } catch (err: any) {
      setError(err?.message || t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePay = async (cycleId: string) => {
    setPaying(cycleId);
    try {
      const result = await apiService.payBillingCycle(cycleId);
      if (result?.provider_invoice_url) {
        window.open(result.provider_invoice_url, '_blank');
      }
      await fetchData();
    } catch (err: any) {
      setError(err?.message || t('errors.payFailed'));
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          {tCommon('retry')}
        </Button>
      </div>
    );
  }

  const subscription = dashboard?.subscription;
  const status = subscription?.status ?? 'active';
  const isExempt = status === 'exempt' || activeTenant?.billing_exempt;
  const isSuspended = dashboard?.is_suspended ?? false;
  const currentCycle = dashboard?.current_cycle ?? null;
  const preview = dashboard?.preview ?? null;
  const overdueCycles = dashboard?.overdue_cycles ?? [];
  const trialDays = dashboard?.trial_days_remaining ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>
      </div>

      {/* Exempt banner */}
      {isExempt && (
        <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
          <CheckCircle2 className="h-5 w-5 text-purple-500 flex-shrink-0" />
          <p className="text-sm text-purple-700">{t('banner.exempt')}</p>
        </div>
      )}

      {/* Suspended banner */}
      {isSuspended && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{t('banner.suspended')}</p>
          {overdueCycles[0] && (
            <Button size="sm" onClick={() => handlePay(overdueCycles[0].id)}>
              {t('payNow')}
            </Button>
          )}
        </div>
      )}

      {/* Status card */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-gray-500">
              {t('status.' + status, { defaultMessage: status })}
            </p>
            <CreditCard className="h-4 w-4 flex-shrink-0 text-indigo-500" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize',
                STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800',
              )}
            >
              {t('status.' + status, { defaultMessage: status })}
            </span>
            {status === 'trialing' && trialDays !== null && (
              <span className="inline-flex items-center gap-1 text-sm text-blue-600">
                <Clock className="h-4 w-4" />
                {trialDays > 0
                  ? t('trialEndsIn', { days: trialDays })
                  : t('trialEnded')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current invoice (issued / overdue) */}
      {currentCycle && (currentCycle.status === 'issued' || currentCycle.status === 'overdue') && (
        <Card className={cn(currentCycle.status === 'overdue' && 'border-red-300')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{t('currentInvoice')}</span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  CYCLE_STATUS_STYLES[currentCycle.status],
                )}
              >
                {currentCycle.status === 'overdue' ? t('overdue') : formatPeriod(currentCycle.period_year, currentCycle.period_month, locale)}
              </span>
            </CardTitle>
            {currentCycle.due_at && (
              <CardDescription>
                {t('dueDate', { date: formatDate(currentCycle.due_at, locale) })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('posCharge')}</span>
                <span>{formatCurrency(currentCycle.pos_charge, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('attendanceCharge')}</span>
                <span>{formatCurrency(currentCycle.attendance_charge, locale)}</span>
              </div>
              {currentCycle.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('discount')}</span>
                  <span>- {formatCurrency(currentCycle.discount_amount, locale)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>{t('total')}</span>
                <span>{formatCurrency(currentCycle.total_charge, locale)}</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => handlePay(currentCycle.id)}
              disabled={paying === currentCycle.id}
            >
              {paying === currentCycle.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tCommon('loading')}
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  {t('payNow')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Estimasi real-time */}
      {!isExempt && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              {t('estimate')}
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardTitle>
            <CardDescription>{t('estimateHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('posCharge')}</span>
                <span>{formatCurrency(preview.pos_charge, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('attendanceCharge')}</span>
                <span>{formatCurrency(preview.attendance_charge, locale)}</span>
              </div>
              {preview.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('discount')}</span>
                  <span>- {formatCurrency(preview.discount_amount, locale)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>{t('total')}</span>
                <span title={formatCurrency(preview.total_charge, locale)}>
                  {formatCompactCurrency(preview.total_charge, locale)}
                </span>
              </div>
            </div>

            {/* POS breakdown */}
            {preview.pos_breakdown?.length > 0 && (
              <div className="mt-3 rounded-lg border border-gray-100 p-3">
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('breakdown.title')}
                </p>
                <div className="space-y-1.5">
                  {preview.pos_breakdown.map((item) => (
                    <div key={item.store_id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-600 truncate">
                        <StoreIcon className="h-3 w-3 flex-shrink-0" />
                        {item.store_name}
                      </span>
                      <span className="text-gray-500 ml-2 flex-shrink-0">
                        {formatCompactCurrency(item.revenue, locale)} → {formatCompactCurrency(item.charge, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance info */}
            {preview.attendance_employees_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                {t('breakdown.employees', { count: preview.attendance_employees_count })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t('noHistory')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('period')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('amount')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tCommon('status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('paidAt')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tCommon('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cycles.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatPeriod(cycle.period_year, cycle.period_month, locale)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(cycle.total_charge, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                            CYCLE_STATUS_STYLES[cycle.status] ?? 'bg-gray-100 text-gray-800',
                          )}
                        >
                          {cycle.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(cycle.paid_at, locale)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(cycle.status === 'issued' || cycle.status === 'overdue') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePay(cycle.id)}
                            disabled={paying === cycle.id}
                          >
                            {paying === cycle.id ? tCommon('loading') : t('payNow')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
