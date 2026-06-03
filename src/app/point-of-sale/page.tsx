'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import existing components
import dynamic from 'next/dynamic';

const ReceiptConfigContent = dynamic(() => import('@/app/stores/receipt-config/ReceiptConfigContent'), { ssr: false });
const ProductsContent = dynamic(() => import('@/app/products/ProductsClient'), { ssr: false });
const CategoriesContent = dynamic(() => import('@/app/categories/CategoriesClient'), { ssr: false });
const TablesContent = dynamic(() => import('@/app/tables/TablesClient'), { ssr: false });
const CustomerTypesContent = dynamic(() => import('@/app/customer-types/CustomerTypesClient'), { ssr: false });
const ChannelPricingContent = dynamic(() => import('@/app/channel-pricing/ChannelPricingClient'), { ssr: false });

type TabValue = 'receipt-config' | 'products' | 'categories' | 'tables' | 'customer-types' | 'channel-pricing';

function PointOfSaleContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
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
                        <h1 className="text-2xl font-bold text-gray-900">Point of Sale Management</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage products, categories, tables, and customer types for your point of sale system.
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-3 lg:w-auto lg:grid-cols-6">
                            <TabsTrigger value="products">Products</TabsTrigger>
                            <TabsTrigger value="channel-pricing">Channel Pricing</TabsTrigger>
                            <TabsTrigger value="categories">Categories</TabsTrigger>
                            <TabsTrigger value="receipt-config">Receipt Config</TabsTrigger>
                            <TabsTrigger value="tables">Tables</TabsTrigger>
                            <TabsTrigger value="customer-types">Customer Types</TabsTrigger>
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
