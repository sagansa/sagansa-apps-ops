'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  AlertTriangle,
  CalendarOff,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { Leave, PosShift } from '@/app/services/api';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

export interface AlertPanelProps {
  overdueShifts: PosShift[];
  pendingLeaves: Leave[];
  isLoading?: boolean;
}

export function AlertPanel({
  overdueShifts,
  pendingLeaves,
  isLoading,
}: AlertPanelProps) {
  const t = useTranslations('Dashboard.alert');
  const locale = useLocale();
  const totalAlerts = overdueShifts.length + pendingLeaves.length;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
      day: 'numeric',
      month: 'short',
    });

  const formatDuration = (openedAt: string | null | undefined): string => {
    if (!openedAt) return '—';
    const diff = Date.now() - new Date(openedAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}h`;
    }
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

  return (
    <Card className={cn('h-full', isLoading && 'animate-pulse')}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('title')}
          </span>
          {totalAlerts > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5">
              {totalAlerts}
            </span>
          )}
        </CardTitle>
        <CardDescription>{t('desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overdue Shifts */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-red-500" />
            <h4 className="text-sm font-semibold text-foreground">
              {t('overdueShifts')}
            </h4>
            {overdueShifts.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({overdueShifts.length})
              </span>
            )}
          </div>
          {overdueShifts.length > 0 ? (
            <div className="space-y-2">
              {overdueShifts.slice(0, 3).map((shift) => (
                <Link
                  key={shift.id}
                  href="/shift-management"
                  className="block rounded-lg border border-red-200 bg-red-50 p-3 hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {shift.store?.nickname || shift.store?.name || t('unknownStore')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('openedFor', { duration: formatDuration(shift.openedAt) })}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      {t('overdue')}
                    </span>
                  </div>
                </Link>
              ))}
              {overdueShifts.length > 3 && (
                <Link
                  href="/shift-management"
                  className="block text-center text-xs text-blue-600 hover:underline pt-1"
                >
                  {t('seeMore', { count: overdueShifts.length - 3 })}
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{t('noOverdue')}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Pending Leaves */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarOff className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-foreground">
              {t('pendingLeaves')}
            </h4>
            {pendingLeaves.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({pendingLeaves.length})
              </span>
            )}
          </div>
          {pendingLeaves.length > 0 ? (
            <div className="space-y-2">
              {pendingLeaves.slice(0, 3).map((leave) => (
                <Link
                  key={leave.id}
                  href="/leaves"
                  className="block rounded-lg border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {leave.user?.name || t('unknownUser')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {leave.type} •{' '}
                        {formatDate(leave.start_date)}{' '}
                        -{' '}
                        {formatDate(leave.end_date)}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {t('pending')}
                    </span>
                  </div>
                </Link>
              ))}
              {pendingLeaves.length > 3 && (
                <Link
                  href="/leaves"
                  className="block text-center text-xs text-blue-600 hover:underline pt-1"
                >
                  {t('seeMore', { count: pendingLeaves.length - 3 })}
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{t('noPendingLeaves')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}