'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import existing components
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const ReceiptConfigContent = dynamic(() => import('@/app/[locale]/stores/receipt-config/ReceiptConfigContent'), { ssr: false });
const ProductsContent = dynamic(() => import('@/app/[locale]/products/ProductsClient'), { ssr: false });
const CategoriesContent = dynamic(() => import('@/app/[locale]/categories/CategoriesClient'), { ssr: false });
const TablesContent = dynamic(() => import('@/app/[locale]/tables/TablesClient'), { ssr: false });
const CustomerTypesContent = dynamic(() => import('@/app/[locale]/customer-types/CustomerTypesClient'), { ssr: false });
const ChannelPricingContent = dynamic(() => import('@/app/[locale]/channel-pricing/ChannelPricingClient'), { ssr: false });

type TabValue = 'receipt-config' | 'products' | 'categories' | 'tables' | 'customer-types' | 'channel-pricing';

function PointOfSaleContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('POS');
    const [activeTab, setActiveTab] = useState<TabValue>('products');

    useEffect(() => {
        const tab = searchParams.get('tab') as TabValue;
        if (tab && ['receipt-config', 'products', 'categories', 'tables', 'customer-types', 'channel-pricing'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value as TabValue);
        router.push(`/point-of-sale?tab=${value}`);
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
                        <TabsList className="flex w-full gap-1 overflow-x-auto overflow-y-hidden whitespace-nowrap md:flex-wrap md:overflow-visible">
                            <TabsTrigger value="products" className="flex-1 md:flex-initial">{t('tabs.products')}</TabsTrigger>
                            <TabsTrigger value="channel-pricing" className="flex-1 md:flex-initial">{t('tabs.channelPricing')}</TabsTrigger>
                            <TabsTrigger value="categories" className="flex-1 md:flex-initial">{t('tabs.categories')}</TabsTrigger>
                            <TabsTrigger value="receipt-config" className="flex-1 md:flex-initial">{t('tabs.receiptConfig')}</TabsTrigger>
                            <TabsTrigger value="tables" className="flex-1 md:flex-initial">{t('tabs.tables')}</TabsTrigger>
                            <TabsTrigger value="customer-types" className="flex-1 md:flex-initial">{t('tabs.customerTypes')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="receipt-config" className="mt-6">
                            <ReceiptConfigContent />
                        </TabsContent>

                        <TabsContent value="products" className="mt-6">
                            <ProductsContent />
                        </TabsContent>

                        <TabsContent value="channel-pricing" className="mt-6">
                            <ChannelPricingContent />
                        </TabsContent>

                        <TabsContent value="categories" className="mt-6">
                            <CategoriesContent />
                        </TabsContent>

                        <TabsContent value="tables" className="mt-6">
                            <TablesContent />
                        </TabsContent>

                        <TabsContent value="customer-types" className="mt-6">
                            <CustomerTypesContent />
                        </TabsContent>
                    </Tabs>
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}

export default function PointOfSalePage() {
    return (
        <Suspense fallback={null}>
            <PointOfSaleContent />
        </Suspense>
    );
}
