'use client';

import { useState, useEffect } from 'react';
import apiService, { PermissionModule, TenantUser } from '@/app/services/api';
import { Button } from '@/components/ui';
import { X, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PermissionModalProps {
    user: {
        id: string;
        name: string;
        email: string;
    };
    tenantId: string;
    onClose: () => void;
    onSave?: () => void;
}

export default function PermissionModal({ user, tenantId, onClose, onSave }: PermissionModalProps) {
    const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations('Permissions');
    const tCommon = useTranslations('Common');

    useEffect(() => {
        loadPermissions();
    }, [user.id, tenantId]);

    const loadPermissions = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load all available permissions
            const { permissions } = await apiService.getAllPermissionsGrouped();
            setPermissionModules(permissions);

            // Load user's current permissions
            const { users } = await apiService.getTenantUsers(tenantId);
            const currentUser = users.find(u => u.id === user.id);

            if (currentUser) {
                setSelectedPermissions(new Set(currentUser.permissions));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('failedLoad'));
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (permissionName: string) => {
        const newSelected = new Set(selectedPermissions);
        if (newSelected.has(permissionName)) {
            newSelected.delete(permissionName);
        } else {
            newSelected.add(permissionName);
        }
        setSelectedPermissions(newSelected);
    };

    const toggleModule = (module: PermissionModule) => {
        const modulePermissions = module.permissions.map(p => p.name);
        const allSelected = modulePermissions.every(p => selectedPermissions.has(p));

        const newSelected = new Set(selectedPermissions);
        if (allSelected) {
            // Deselect all
            modulePermissions.forEach(p => newSelected.delete(p));
        } else {
            // Select all
            modulePermissions.forEach(p => newSelected.add(p));
        }
        setSelectedPermissions(newSelected);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            await apiService.assignPermissionsToUser(
                tenantId,
                user.id,
                Array.from(selectedPermissions)
            );

            onSave?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('failedSave'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-8 max-w-4xl w-full m-4">
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{t('manageTitle')}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {user.name} ({user.email})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
                        <div className="text-sm text-red-700">{error}</div>
                    </div>
                )}

                {/* Permission List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-6">
                        {permissionModules.map((module) => {
                            const modulePermissions = module.permissions.map(p => p.name);
                            const allSelected = modulePermissions.every(p => selectedPermissions.has(p));
                            const someSelected = modulePermissions.some(p => selectedPermissions.has(p));

                            return (
                                <div key={module.module} className="border border-gray-200 rounded-lg p-4">
                                    {/* Module Header */}
                                    <div className="flex items-center mb-3">
                                        <button
                                            onClick={() => toggleModule(module)}
                                            className="flex items-center space-x-2 text-left"
                                        >
                                            <div
                                                className={`h-5 w-5 flex items-center justify-center border-2 rounded ${allSelected
                                                    ? 'bg-indigo-600 border-indigo-600'
                                                    : someSelected
                                                        ? 'bg-indigo-300 border-indigo-300'
                                                        : 'border-gray-300'
                                                    }`}
                                            >
                                                {allSelected && <Check className="h-3 w-3 text-white" />}
                                                {someSelected && !allSelected && <div className="h-2 w-2 bg-gray-500 rounded"></div>}
                                            </div>
                                            <span className="text-base font-semibold text-gray-900">
                                                {module.module}
                                            </span>
                                        </button>
                                        <span className="ml-auto text-xs text-gray-500">
                                            {modulePermissions.filter(p => selectedPermissions.has(p)).length}/{modulePermissions.length}
                                        </span>
                                    </div>

                                    {/* Permissions */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                        {module.permissions.map((permission) => (
                                            <label
                                                key={permission.name}
                                                className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.has(permission.name)}
                                                    onChange={() => togglePermission(permission.name)}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-0.5"
                                                />
                                                <span className="text-sm text-gray-700">{permission.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="text-sm text-gray-600">
                        {selectedPermissions.size} permission(s) selected
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? t('saving') : t('saveBtn')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
