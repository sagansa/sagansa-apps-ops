'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTeamMemberContext } from '@/app/contexts/TeamMemberContext';
import { useAuth } from '@/app/contexts/AuthContext';
import UpdateRoleModal from './UpdateRoleModal';
import AddMemberModal from './AddMemberModal';
import { Button, ConfirmationDialog, Input } from '@/components/ui';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export default function TeamMemberList() {
    const { members, loading, error, fetchTeamMembers, removeMember } = useTeamMemberContext();
    const { user: currentUser, isAdmin } = useAuth();
    const t = useTranslations('Team');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const [showAddModal, setShowAddModal] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<any | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (currentUser?.tenant?.id) {
            fetchTeamMembers(currentUser.tenant.id);
        }
    }, [currentUser, fetchTeamMembers]);

    const handleAddSuccess = () => {
        if (currentUser?.tenant?.id) {
            fetchTeamMembers(currentUser.tenant.id);
        }
    };

    const handleUpdateSuccess = () => {
        if (currentUser?.tenant?.id) {
            fetchTeamMembers(currentUser.tenant.id);
        }
    };

    const confirmRemove = async () => {
        if (!memberToRemove) return;
        await removeMember(memberToRemove.id);
        setMemberToRemove(null);
    };

    const filteredMembers = useMemo(() => {
        const matcher = searchTerm.trim().toLowerCase();
        if (!matcher) {
            return members;
        }

        return members.filter((member) => {
            const matchesName = member.name.toLowerCase().includes(matcher);
            const matchesEmail = member.email.toLowerCase().includes(matcher);
            const matchesRole = member.pivot_role.toLowerCase().includes(matcher);
            return matchesName || matchesEmail || matchesRole;
        });
    }, [searchTerm, members]);

    if (loading && members.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-3xl font-bold text-gray-900">{t('membersTitle')}</h3>
                    <p className="mt-1 text-sm text-gray-700">
                        {t('membersDesc')}
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowAddModal(true)} aria-label={t('addMember')} title={t('addMember')}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t('memberBtn')}
                    </Button>
                )}
            </div>

            <div className="mt-4">
                <div className="flex justify-between items-center">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            className="pl-10"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {t('table.name')}
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {t('table.email')}
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {t('table.role')}
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {t('table.joinedAt')}
                                        </th>
                                        <th scope="col" className="relative px-6 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredMembers.map((member) => {
                                        const isOwner = member.pivot_role === 'owner';
                                        return (
                                            <tr key={member.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{member.email}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        {member.pivot_role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(member.joined_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {!isOwner && isAdmin && member.id !== currentUser?.id && (
                                                        <div className="flex justify-end space-x-2">
                                                            <Button
                                                                // variant="info"
                                                                size="icon-sm"
                                                                onClick={() => setMemberToEdit(member)}
                                                                aria-label={t('editRole')}
                                                                title={t('editRole')}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon-sm"
                                                                onClick={() => setMemberToRemove(member)}
                                                                aria-label={t('removeTitle')}
                                                                title={t('removeTitle')}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddMemberModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={handleAddSuccess}
                />
            )}

            {memberToEdit && (
                <UpdateRoleModal
                    member={memberToEdit}
                    onClose={() => setMemberToEdit(null)}
                    onSuccess={handleUpdateSuccess}
                />
            )}

            <ConfirmationDialog
                isOpen={!!memberToRemove}
                onClose={() => setMemberToRemove(null)}
                onConfirm={confirmRemove}
                title={t('removeMember')}
                message={t('removeConfirm', { name: memberToRemove?.name ?? '' })}
                confirmText={t('removeConfirmBtn')}
                cancelText={t('cancel')}
                variant="danger"
                loading={loading}
            />
        </div>
    );
}
