'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import apiService, { Store, PaymentMethod } from '@/app/services/api';
import PaymentMethodList from '@/components/stores/PaymentMethodList';
import PaymentMethodForm from '@/components/stores/PaymentMethodForm';
import TaxSettingsForm from '@/components/stores/TaxSettingsForm';
import { Button } from '@/components/ui';
import { ArrowLeft, Plus } from 'lucide-react';

const normaliseStorePaymentMethods = (methods: PaymentMethod[], storeId: string) => {
    const seen = new Set<string>();
    const selectedStoreId = String(storeId);

    return methods
        .filter((method) => String(method.store_id) === selectedStoreId)
        .filter((method) => {
            const key = [
                method.is_default ? 'default' : 'custom',
                method.type,
                String(method.name).trim().toLowerCase(),
            ].join(':');

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
};

function PaymentMethodsContent() {
    const params = useParams();
    const router = useRouter();
    const storeId = params.id as string;

    const [store, setStore] = useState<Store | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | undefined>(undefined);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [storeData, methodsData] = await Promise.all([
                apiService.getStore(storeId),
                apiService.getPaymentMethods(storeId),
            ]);

            // Handle response structure for getStore
            if (storeData && (storeData as any).store) {
                setStore((storeData as any).store);
            } else {
                setStore(storeData as any);
            }

            setPaymentMethods(normaliseStorePaymentMethods(methodsData as PaymentMethod[], storeId));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        if (storeId) {
            fetchData();
        }
    }, [storeId, fetchData]);

    const handleUpdateTax = async (data: { tax_rate: number; tax_name: string }) => {
        if (!store) return;
        // We need to update the store. api.ts updateStore requires tenantId.
        // store object should have tenant_id.
        try {
            await apiService.updateStore(store.tenant_id, store.id, {
                name: store.name, // Required fields
                latitude: store.latitude || 0,
                longitude: store.longitude || 0,
                ...data,
            });
            // Refresh store data
            const updatedStore = await apiService.getStore(storeId);
            if (updatedStore && (updatedStore as any).store) {
                setStore((updatedStore as any).store);
            } else {
                setStore(updatedStore as any);
            }
        } catch (error) {
            console.error('Error updating tax settings:', error);
            throw error;
        }
    };

    const handleSaveMethod = async (data: any) => {
        try {
            if (editingMethod) {
                await apiService.updatePaymentMethod(editingMethod.id, data);
            } else {
                await apiService.createPaymentMethod(data);
            }
            setIsFormOpen(false);
            setEditingMethod(undefined);

            // Refresh list
            const methods = await apiService.getPaymentMethods(storeId);
            setPaymentMethods(normaliseStorePaymentMethods(methods as PaymentMethod[], storeId));
        } catch (error) {
            console.error('Error saving payment method:', error);
            throw error;
        }
    };

    const handleDeleteMethod = async (id: string) => {
        const method = paymentMethods.find(m => m.id === id);

        if (method?.is_default) {
            alert('Metode pembayaran default (Tunai) tidak dapat dihapus.');
            return;
        }

        if (!confirm('Apakah Anda yakin ingin menghapus metode pembayaran ini?')) return;

        try {
            await apiService.deletePaymentMethod(id);
            // Refresh list
            const methods = await apiService.getPaymentMethods(storeId);
            setPaymentMethods(normaliseStorePaymentMethods(methods as PaymentMethod[], storeId));
        } catch (error: any) {
            console.error('Error deleting payment method:', error);
            const errorMessage = error?.message || 'Gagal menghapus metode pembayaran. Silakan coba lagi.';
            alert(errorMessage);
        }
    };

    const handleToggleStatus = async (method: PaymentMethod) => {
        try {
            await apiService.updatePaymentMethod(method.id, { is_active: !method.is_active });
            // Refresh list
            const methods = await apiService.getPaymentMethods(storeId);
            setPaymentMethods(normaliseStorePaymentMethods(methods as PaymentMethod[], storeId));
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!store) {
        return (
            <AdminLayout>
                <div className="text-center py-10">Store not found</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Kembali ke Daftar Store
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Pengaturan Pembayaran - {store.name}
                </h1>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    {/* Payment Methods Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-medium text-gray-900">Metode Pembayaran</h2>
                            <Button
                                // variant="primary"
                                size="sm"
                                onClick={() => {
                                    setEditingMethod(undefined);
                                    setIsFormOpen(true);
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah Metode
                            </Button>
                        </div>

                        {isFormOpen ? (
                            <div className="mb-6">
                                <h3 className="text-md font-medium text-gray-900 mb-4">
                                    {editingMethod ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
                                </h3>
                                <PaymentMethodForm
                                    storeId={storeId}
                                    initialData={editingMethod}
                                    onSubmit={handleSaveMethod}
                                    onCancel={() => {
                                        setIsFormOpen(false);
                                        setEditingMethod(undefined);
                                    }}
                                />
                            </div>
                        ) : (
                            <PaymentMethodList
                                paymentMethods={paymentMethods}
                                onEdit={(method) => {
                                    setEditingMethod(method);
                                    setIsFormOpen(true);
                                }}
                                onDelete={handleDeleteMethod}
                                onToggleStatus={handleToggleStatus}
                            />
                        )}
                    </section>
                </div>

                <div className="lg:col-span-1">
                    {/* Tax Settings Section */}
                    <section>
                        <TaxSettingsForm store={store} onUpdate={handleUpdateTax} />
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}

export default function PaymentMethodsPage() {
    return (
        <ProtectedRoute requiredRole="admin">
            <PaymentMethodsContent />
        </ProtectedRoute>
    );
}
