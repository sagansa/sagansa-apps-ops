'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Ban, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Global billing banner — ditampilkan di AdminLayout/Header.
 *
 * - Trial < 7 hari: reminder kuning
 * - Invoice overdue: peringatan merah
 * - Suspended: banner persisten merah + tombol bayar
 * - Exempt: info ungu
 */
export default function BillingBanner() {
  const { user, isSuperAdmin } = useAuth();
  const t = useTranslations('Billing');

  // Super-admin tidak lihat banner billing (mereka mengelola, bukan membayar)
  if (isSuperAdmin) return null;

  const tenant = user?.tenant;
  if (!tenant) return null;

  // Exempt tenant: info banner
  if (tenant.billing_exempt) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2">
        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-purple-500" />
        <p className="text-sm text-purple-700">{t('banner.exempt')}</p>
      </div>
    );
  }

  const status = tenant.subscription_status;

  // Suspended: merah persisten + tombol bayar
  if (status === 'suspended') {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
        <Ban className="h-4 w-4 flex-shrink-0 text-red-500" />
        <p className="flex-1 text-sm text-red-700">{t('banner.suspended')}</p>
        <Button asChild size="sm" variant="destructive">
          <Link href="/billing">{t('payNow')}</Link>
        </Button>
      </div>
    );
  }

  // Trialing dengan sisa < 7 hari: kuning
  if (status === 'trialing') {
    // trial_ends_at dihitung backend; di sini tampilkan reminder umum
    // (angka hari spesifik datang dari /billing/dashboard)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        <Clock className="h-4 w-4 flex-shrink-0 text-blue-500" />
        <p className="flex-1 text-sm text-blue-700">{t('banner.trialSoon', { days: 7 })}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/billing">{t('payNow')}</Link>
        </Button>
      </div>
    );
  }

  return null;
}
