'use client';

import { Fragment } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Menu, Transition } from '@headlessui/react';
import { useTranslations } from 'next-intl';

export default function TenantSwitcher() {
    const { activeTenant, availableTenants, switchTenant, user } = useAuth();
    const t = useTranslations('Common');

    if (!user) return null;

    // Filter tenants based on access-backoffice permission
    // Backend sets has_backoffice_access flag on each tenant
    const accessibleTenants = availableTenants.filter(tenant => {
        // Check if this tenant has backoffice access permission
        return (tenant as any).has_backoffice_access === true;
    });

    if (accessibleTenants.length <= 1) {
        return null; // Don't show switcher if user has access to only one tenant
    }

    const handleSwitchTenant = async (tenantId: string) => {
        if (tenantId === activeTenant?.id) return;

        try {
            await switchTenant(tenantId);
        } catch (error) {
            console.error('Failed to switch tenant:', error);
            alert(t('failedSwitchTenant'));
        }
    };

    const getUserRoleInTenant = (tenantId: string): string => {
        const tenant = user.tenants?.find(t => t.id === tenantId);
        if (!tenant) return '';
        // Access pivot data through the tenant object
        return (tenant as any).pivot?.role || '';
    };

    return (
        <Menu as="div" className="relative w-full">
            <Menu.Button className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <div className="flex items-center flex-1 min-w-0">
                    <Building2 className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                            {activeTenant?.name || t('selectTenant')}
                        </div>
                        {activeTenant && (
                            <div className="text-xs text-gray-500 truncate">
                                {getUserRoleInTenant(activeTenant.id)}
                            </div>
                        )}
                    </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" aria-hidden="true" />
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        {accessibleTenants.map((tenant) => {
                            const isActive = tenant.id === activeTenant?.id;
                            const role = getUserRoleInTenant(tenant.id);

                            return (
                                <Menu.Item key={tenant.id}>
                                    {({ active }) => (
                                        <button
                                            onClick={() => handleSwitchTenant(tenant.id)}
                                            className={`
                        ${active ? 'bg-gray-100' : ''}
                        ${isActive ? 'bg-indigo-50' : ''}
                        w-full text-left px-4 py-2 text-sm flex items-center justify-between
                      `}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className={`
                          font-medium truncate
                          ${isActive ? 'text-indigo-600' : 'text-gray-900'}
                        `}>
                                                    {tenant.name}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate capitalize">
                                                    {role}
                                                </div>
                                            </div>
                                            {isActive && (
                                                <Check className="h-5 w-5 text-indigo-600 ml-2 flex-shrink-0" aria-hidden="true" />
                                            )}
                                        </button>
                                    )}
                                </Menu.Item>
                            );
                        })}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
