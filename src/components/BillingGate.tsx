'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Lock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Gate wrapper untuk halaman yang harus dikunci saat tenant suspended.
 *
 * Saat tenant suspended (overdue & belum bayar):
 * - Operasional (POS baru, check-in) tetap jalan (tidak di-wrap gate ini)
 * - Riwayat & laporan (Transactions, Reports, Attendance history) DIKUNCI
 *
 * Saat gate aktif, render lock screen dengan tombol "Bayar untuk Membuka"
 * yang mengarah ke halaman /billing.
 */
export default function BillingGate({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  const t = useTranslations('Billing.gate');
  const tCommon = useTranslations('Common');

  // Super-admin selalu bypass gate (bisa lihat semua untuk support)
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Exempt tenant tidak pernah di-gate
  if (user?.tenant?.billing_exempt) {
    return <>{children}</>;
  }

  // Hanya gate saat status suspended
  const isSuspended = user?.tenant?.subscription_status === 'suspended';

  if (!isSuspended) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[400px] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <Lock className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('lockedTitle')}</h2>
        <p className="mt-2 text-sm text-gray-600">{t('lockedDesc')}</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/billing">
              <CreditCard className="h-4 w-4" />
              {t('payToUnlock')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
