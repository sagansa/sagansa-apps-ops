'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TenantProvider } from '@/app/contexts/TenantContext';
import { ShiftStoreProvider } from '@/app/contexts/ShiftStoreContext';

// Import existing components
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const ShiftScheduleContent = dynamic(() => import('@/app/[locale]/shift-schedules/ShiftSchedulesContent'), { ssr: false });
const ShiftStockContent = dynamic(() => import('./ShiftStockContent'), { ssr: false });

type TabValue = 'shift-schedule' | 'shift-stock';

function ShiftManagementContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('Shifts.management');
    const [activeTab, setActiveTab] = useState<TabValue>('shift-schedule');

    useEffect(() => {
        const tab = searchParams.get('tab') as TabValue;
        if (tab && ['shift-schedule', 'shift-stock'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value as TabValue);
        router.push(`/shift-management?tab=${value}`);
    };

    return (
        <ProtectedRoute requiredRole="admin">
            <AdminLayout>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            {t('subtitle')}
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
                            <TabsTrigger value="shift-schedule">{t('tabSchedule')}</TabsTrigger>
                            <TabsTrigger value="shift-stock">{t('tabStock')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="shift-schedule" className="mt-6">
                            <TenantProvider>
                                <ShiftStoreProvider>
                                    <ShiftScheduleContent />
                                </ShiftStoreProvider>
                            </TenantProvider>
                        </TabsContent>
                        <TabsContent value="shift-stock" className="mt-6">
                            <ShiftStockContent />
                        </TabsContent>
                    </Tabs>
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}

export default function ShiftManagementPage() {
    return (
        <Suspense fallback={null}>
            <ShiftManagementContent />
        </Suspense>
    );
}
