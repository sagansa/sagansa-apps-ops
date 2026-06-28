'use client';

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Leave, LeaveStatus } from '@/app/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, X, Calendar, Clock, MoreHorizontal, User } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Filter } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';

type Props = {
  leaves: Leave[];
  onStatusUpdate: (leaveId: string, status: LeaveStatus) => void;
  statusFilter: LeaveStatus | '';
  setStatusFilter: (status: LeaveStatus | '') => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
};

export default function LeaveList({
  leaves,
  onStatusUpdate,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter
}: Props) {
  const t = useTranslations('Leaves');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const [pageSize, setPageSize] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [updatingLeaveId, setUpdatingLeaveId] = React.useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
            <Check className="mr-1 h-3 w-3" /> {t('status.approved')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
            <X className="mr-1 h-3 w-3" /> {t('status.rejected')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
            <Clock className="mr-1 h-3 w-3" /> {t('status.pending')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  /* Client-side filtering logic */
  const filteredLeaves = React.useMemo(() => {
    return leaves.filter((leave) => {
      // Basic search logic matching DataTable's global filter
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();

      const employeeName = leave.user?.name?.toLowerCase() || '';
      const employeeEmail = leave.user?.email?.toLowerCase() || '';
      const type = leave.type?.toLowerCase() || '';
      const status = leave.status?.toLowerCase() || '';

      return (
        employeeName.includes(lowerQuery) ||
        employeeEmail.includes(lowerQuery) ||
        type.includes(lowerQuery) ||
        status.includes(lowerQuery)
      );
    });
  }, [leaves, searchQuery]);

  const handlePageChange = (page: number) => {
    // Page change is handled by DataTable
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // Reset updating state after 2 seconds (simulated API call completion)
  React.useEffect(() => {
    if (updatingLeaveId) {
      const timer = setTimeout(() => {
        setUpdatingLeaveId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [updatingLeaveId]);

  const columns: ColumnDef<Leave>[] = [
    {
      accessorKey: "user.name",
      header: t('table.employee'),
      cell: ({ row }) => {
        const leave = row.original;
        const initials = leave.user?.name
          ? leave.user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
          : '??';

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src="" alt={leave.user?.name || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{leave.user?.name || '-'}</span>
              <span className="text-xs text-muted-foreground">{leave.user?.email || ''}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: t('table.type'),
      cell: ({ row }) => {
        const leave = row.original;
        const formattedType = leave.type?.replace(/_/g, ' ') || '';
        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm capitalize">{formattedType}</span>
            {leave.reason && (
              <span className="text-xs text-muted-foreground max-w-[200px] truncate" title={leave.reason}>
                {leave.reason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "period",
      header: t('table.period'),
      cell: ({ row }) => {
        const leave = row.original;
        return (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(leave.start_date)} – {formatDate(leave.end_date)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "duration",
      header: t('table.duration'),
      cell: ({ row }) => {
        const leave = row.original;
        return (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{t('table.days', { count: leave.duration ?? 0 })}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t('table.status'),
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const leave = row.original;
        const isUpdating = updatingLeaveId === leave.id;
        const isPending = leave.status === 'pending';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(leave.id)}
              >
                {t('copyId')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isPending && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setUpdatingLeaveId(leave.id);
                      onStatusUpdate(leave.id, 'approved');
                    }}
                    disabled={isUpdating}
                    className="text-green-600 focus:text-green-700 focus:bg-green-50"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {t('approveRequest')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setUpdatingLeaveId(leave.id);
                      onStatusUpdate(leave.id, 'rejected');
                    }}
                    disabled={isUpdating}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <X className="mr-2 h-4 w-4" />
                    {t('rejectRequest')}
                  </DropdownMenuItem>
                </>
              )}
              {!isPending && (
                <DropdownMenuItem disabled>
                  {t('noActions')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const emptyState = (
    <div className="text-center py-12">
      <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{t('empty')}</h3>
      <p className="text-gray-500">
        {searchQuery ? t('emptyFiltered') : t('emptyNew')}
      </p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Search */}
        <div className="w-full md:w-72">
          <input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as LeaveStatus | '')}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('filters.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('filters.allStatus')}</SelectItem>
              <SelectItem value="pending">{t('filters.pending')}</SelectItem>
              <SelectItem value="approved">{t('filters.approved')}</SelectItem>
              <SelectItem value="rejected">{t('filters.rejected')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value === 'ALL' ? '' : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('filters.filterType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('filters.allTypes')}</SelectItem>
              <SelectItem value="annual">{t('filters.types.annual')}</SelectItem>
              <SelectItem value="sick">{t('filters.types.sick')}</SelectItem>
              <SelectItem value="emergency">{t('filters.types.emergency')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-6">
        <DataTable
          columns={columns}
          data={filteredLeaves}
          onSearchChange={handleSearch}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          rowCount={filteredLeaves.length}
          pageSize={pageSize}
          hideToolbar={true}
          emptyState={emptyState}
        />
      </div>
    </div>
  );
}