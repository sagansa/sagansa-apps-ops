'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { useStoreContext } from '@/app/contexts/StoreContext';
import { useAuth } from '@/app/contexts/AuthContext';
import apiService, { Receipt, ReceiptsPaginatedResponse } from '@/app/services/api';
import TransactionDetailDrawer from './TransactionDetailDrawer';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Store as StoreIcon,
  Receipt as ReceiptIcon,
  CalendarDays,
  ShoppingCart,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { formatCompactCurrency } from '@/lib/format';

export default function TransactionsClient() {
  const { stores, fetchStores } = useStoreContext();
  const { user } = useAuth();
  const t = useTranslations('Transactions');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(locale === 'en' ? 'en-US' : 'id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    completed: { label: t('status.completed'), color: 'bg-green-100 text-green-800 border-green-200' },
    pending: { label: t('status.pending'), color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    cancelled: { label: t('status.cancelled'), color: 'bg-red-100 text-red-800 border-red-200' },
    refunded: { label: t('status.refunded'), color: 'bg-gray-100 text-gray-800 border-gray-200' },
  };

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    from: 0,
    to: 0,
    perPage: 15,
  });

  // Filters
  const [storeId, setStoreId] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Detail drawer state
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (user?.tenant?.id) {
      fetchStores(user.tenant.id);
    }
  }, [user?.tenant?.id, fetchStores]);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getOrders({
        storeId: storeId || undefined,
        status: status || undefined,
        source: source || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        perPage: pagination.perPage,
        page,
      });

      const data = (response as { success?: boolean; data?: ReceiptsPaginatedResponse })?.data;
      if (data && Array.isArray(data.data)) {
        setReceipts(data.data);
        setPagination({
          currentPage: data.current_page,
          lastPage: data.last_page,
          total: data.total,
          from: data.from ?? 0,
          to: data.to ?? 0,
          perPage: data.per_page,
        });
      } else {
        setReceipts([]);
        setPagination({ currentPage: 1, lastPage: 1, total: 0, from: 0, to: 0, perPage: 15 });
      }
    } catch (err: any) {
      const errorMsg = err?.message || t('loadError');
      setError(errorMsg);
      console.error('Receipts fetch error:', err);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, status, source, search, startDate, endDate, page, pagination.perPage]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleFilterChange = () => {
    setPage(1);
    fetchReceipts();
  };

  const handleResetFilters = () => {
    setStoreId('');
    setStatus('');
    setSource('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const goToDetail = (id: string) => {
    setDrawerOrderId(id);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ReceiptIcon className="h-7 w-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Store */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.store')}</label>
                <select
                  value={storeId}
                  onChange={(e) => {
                    setStoreId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('options.allStores')}</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.nickname || store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.status')}</label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('options.allStatus')}</option>
                  <option value="completed">{t('status.completed')}</option>
                  <option value="pending">{t('status.pending')}</option>
                  <option value="cancelled">{t('status.cancelled')}</option>
                  <option value="refunded">{t('status.refunded')}</option>
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.source')}</label>
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('options.allSources')}</option>
                  <option value="pos">{t('options.pos')}</option>
                  <option value="web-order">{t('options.webOrder')}</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.start')}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('labels.end')}</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleResetFilters}
              >
                {t('reset')}
              </Button>
              <Button
                onClick={fetchReceipts}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? tCommon('loading') : tCommon('refresh')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">{t('stats.totalReceipts')}</p>
              <ReceiptIcon className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">{t('stats.totalRevenue')}</p>
              <ShoppingCart className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
            </div>
            <p className="text-xl font-bold text-gray-900" title={formatCurrency(
                receipts
                  .filter((r) => r.status === 'completed')
                  .reduce((sum, r) => sum + Number(r.grand_total || 0), 0),
            )}>
              {formatCompactCurrency(
                receipts
                  .filter((r) => r.status === 'completed')
                  .reduce((sum, r) => sum + Number(r.grand_total || 0), 0),
                locale,
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">{t('stats.onPage')}</p>
              <StoreIcon className="h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">
              {receipts.length} / {pagination.perPage}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">{t('stats.page')}</p>
              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">
                  {pagination.currentPage} / {pagination.lastPage}
                </p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardContent className="p-0">
          {loading && receipts.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ReceiptIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">{t('empty')}</p>
              <p className="text-xs mt-1">{t('emptyHint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.receiptNo')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.dateTime')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.store')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.customer')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.source')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.createdBy')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.total')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receipts.map((receipt) => {
                    const statusInfo = statusConfig[receipt.status] || statusConfig.pending;
                    return (
                      <tr
                        key={receipt.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => goToDetail(receipt.id)}
                      >
                        <td className="px-4 py-3 text-sm">
                          <div className="font-mono font-medium text-gray-900">
                            {receipt.receipt_number}
                          </div>
                          {receipt.is_offline && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-amber-600">
                              <WifiOff className="h-3 w-3" />
                              {t('table.offline')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDateTime(receipt.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {receipt.store?.nickname || receipt.store?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{receipt.customer_name || '-'}</div>
                          {receipt.table_code && (
                            <div className="text-xs text-gray-400">{t('table.table')}: {receipt.table_code}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {receipt.source === 'pos' ? t('options.pos') : t('options.webOrder')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {(receipt as any).creator?.name || receipt.created_by || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(Number(receipt.grand_total || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('pagination.showing', { from: pagination.from, to: pagination.to, total: pagination.total })}
          </p>
           <div className="flex items-center gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => setPage(page - 1)}
               disabled={page <= 1 || loading}
             >
               <ChevronLeft className="h-4 w-4" />
               {t('pagination.prev')}
             </Button>
             <span className="text-sm text-gray-600">
               {t('pagination.page', { current: pagination.currentPage, last: pagination.lastPage })}
             </span>
             <Button
               variant="outline"
               size="sm"
               onClick={() => setPage(page + 1)}
               disabled={page >= pagination.lastPage || loading}
             >
               {t('pagination.next')}
               <ChevronRight className="h-4 w-4" />
             </Button>
           </div>
         </div>
       )}

      {/* Detail Drawer (Side) — re-fetch receipts list when drawer closes
          (e.g. after a refund) so the table reflects the updated status/totals. */}
      <TransactionDetailDrawer
        orderId={drawerOrderId}
        open={drawerOpen}
        onOpenChange={(newOpen) => {
          setDrawerOpen(newOpen);
          if (!newOpen) {
            fetchReceipts();
          }
        }}
      />
    </div>
  );
}
