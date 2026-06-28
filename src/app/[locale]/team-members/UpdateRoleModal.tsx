'use client';

import { useState, useEffect } from 'react';
import { useTeamMemberContext } from '@/app/contexts/TeamMemberContext';
import { Button, Modal, RadioGroup, RadioGroupItem, Label } from '@/components/ui';
import apiService from '@/app/services/api';
import { useTranslations } from 'next-intl';

interface UpdateRoleModalProps {
    member: {
        id: string;
        name: string;
        pivot_role: string;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export default function UpdateRoleModal({ member, onClose, onSuccess }: UpdateRoleModalProps) {
    const { updateMemberRole } = useTeamMemberContext();
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState(member.pivot_role);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations('Team.updateRole');
    const tCommon = useTranslations('Common');

    useEffect(() => {
        const loadRoles = async () => {
            try {
                const response = await apiService.getRoles();
                const r = response as Record<string, unknown>;
                if (r.roles) {
                    setRoles(r.roles as any[]);
                }
            } catch (err) {
                console.error('Failed to load roles', err);
                setError(t('failedLoadRoles'));
            }
        };
        loadRoles();
    }, [t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;

        setLoading(true);
        setError(null);

        const success = await updateMemberRole(member.id, selectedRole);

        setLoading(false);

        if (success) {
            onSuccess();
            onClose();
        } else {
            // Error is handled by context but we can show a generic one here if needed
            // context sets its own error state which is displayed in the list
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`${t('title')}: ${member.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 p-4 rounded-md">
                        <div className="text-sm text-red-700">{error}</div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        {t('selectRole')}
                    </label>
                    <RadioGroup
                        value={selectedRole}
                        onValueChange={setSelectedRole}
                        disabled={loading}
                        className="gap-3"
                    >
                        {roles.map((role) => (
                            <div key={role.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 transition-colors">
                                <RadioGroupItem value={role.name} id={role.id} />
                                <Label htmlFor={role.id} className="flex-1 cursor-pointer font-normal">
                                    {role.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading || !selectedRole || selectedRole === member.pivot_role}
                    >
                        {loading ? t('saving') : t('title')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
