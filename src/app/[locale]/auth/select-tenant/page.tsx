'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/app/services/api';

interface Tenant {
    id: string;
    name: string;
    is_primary: boolean;
    is_owner: boolean;
    role?: string;
}

export default function SelectTenantPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selecting, setSelecting] = useState(false);

    useEffect(() => {
        loadTenants();
    }, []);

    async function loadTenants() {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            if (!token) {
                router.replace('/auth/login');
                return;
            }
            apiService.setToken(token);
            // Use ApiService's internal request method pattern
            const data = await apiService.getAccessibleTenants() as { success?: boolean; tenants?: Tenant[] };

            if (data.success && data.tenants) {
                setTenants(data.tenants);

                // If only one tenant, auto-select and proceed
                if (data.tenants.length === 1) {
                    await selectTenant(data.tenants[0]);
                    return;
                }

                if (data.tenants.length === 0 && localStorage.getItem('activeTenantId')) {
                    router.replace('/dashboard');
                    return;
                }
            } else {
                setError('Failed to load tenants');
            }
        } catch (err) {
            setError('An error occurred while loading tenants');
            console.error('Load tenants error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function selectTenant(tenant: Tenant) {
        try {
            setSelecting(true);

            // Save selected tenant to localStorage
            localStorage.setItem('activeTenantId', tenant.id);
            localStorage.setItem('active_tenant_id', tenant.id);
            localStorage.setItem('active_tenant_name', tenant.name);

            // Navigate to dashboard
            router.push('/dashboard');
        } catch (err) {
            setError('Failed to select tenant');
            console.error('Select tenant error:', err);
        } finally {
            setSelecting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading tenants...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={loadTenants}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-8">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        Select Tenant
                    </h2>
                    <p className="mt-2 text-center text-gray-600">
                        Choose which tenant you want to access
                    </p>
                </div>

                <div className="space-y-4">
                    {tenants.map((tenant) => (
                        <button
                            key={tenant.id}
                            onClick={() => selectTenant(tenant)}
                            disabled={selecting}
                            className="w-full text-left p-6 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all disabled:opacity-50"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {tenant.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {tenant.is_owner ? 'Owner' : tenant.role || 'Employee'}
                                    </p>
                                </div>
                                {tenant.is_primary && (
                                    <span className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                                        Primary
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {selecting && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-lg">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
