'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import apiService, { PosShift, Store } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'force_closed', label: 'Force Closed' },
];

const statusVariant = (status: string) => {
  if (status === 'open') return 'secondary';
  if (status === 'overdue') return 'destructive';
  if (status === 'closed') return 'default';
  return 'outline';
};

export default function ShiftStockContent() {
  const [stores, setStores] = useState<Store[]>([]);
  const [shifts, setShifts] = useState<PosShift[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<PosShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiService.getStores()
      .then(setStores)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load stores.')));
  }, []);

  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPosShifts({
        storeId: selectedStoreId || undefined,
        status: selectedStatus || undefined,
      });
      setShifts(data);
      if (selectedShiftId && !data.some((shift) => shift.id === selectedShiftId)) {
        setSelectedShiftId(null);
        setSelectedShift(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load shift stock data.'));
    } finally {
      setLoading(false);
    }
  }, [selectedShiftId, selectedStatus, selectedStoreId]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  useEffect(() => {
    if (!selectedShiftId) {
      setSelectedShift(null);
      return;
    }

    setDetailLoading(true);
    apiService.getPosShift(selectedShiftId)
      .then(setSelectedShift)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load shift detail.')))
      .finally(() => setDetailLoading(false));
  }, [selectedShiftId]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId),
    [selectedStoreId, stores],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-gray-700">Store</span>
          <select
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
            className="h-10 min-w-56 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.nickname || store.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-gray-700">Status</span>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="h-10 min-w-44 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <Button type="button" variant="outline" onClick={() => void loadShifts()}>
          Refresh
        </Button>
        {selectedStore ? (
          <span className="pb-2 text-sm text-gray-600">
            {selectedStore.nickname || selectedStore.name}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Store</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Business Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Opened</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Loading shifts...</td></tr>
              ) : shifts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No shift stock sessions found.</td></tr>
              ) : shifts.map((shift) => (
                <tr
                  key={shift.id}
                  className={`cursor-pointer hover:bg-gray-50 ${selectedShiftId === shift.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedShiftId(shift.id)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{shift.store?.nickname || shift.store?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{shift.businessDate || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{shift.openedAt ? new Date(shift.openedAt).toLocaleString('id-ID') : '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={statusVariant(shift.status)}>{shift.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{shift.stockItemsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Shift Stock Detail</h3>
            {detailLoading ? <span className="text-xs text-gray-500">Loading...</span> : null}
          </div>
          {!selectedShift ? (
            <p className="text-sm text-gray-500">Select a shift to inspect stock variance.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Store</span><div className="font-medium">{selectedShift.store?.nickname || selectedShift.store?.name || '-'}</div></div>
                <div><span className="text-gray-500">Date</span><div className="font-medium">{selectedShift.businessDate || '-'}</div></div>
              </div>
              <div className="max-h-[520px] overflow-auto rounded-md border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Open</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Add</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Sold</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Expected</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Actual</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Var</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedShift.items || []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.product?.name || item.productId}</td>
                        <td className="px-3 py-2 text-right text-sm">{item.openingStock}</td>
                        <td className="px-3 py-2 text-right text-sm">{item.additionStock}</td>
                        <td className="px-3 py-2 text-right text-sm">{item.soldQuantity}</td>
                        <td className="px-3 py-2 text-right text-sm">{item.expectedClosingStock}</td>
                        <td className="px-3 py-2 text-right text-sm">{item.actualClosingStock ?? '-'}</td>
                        <td className={`px-3 py-2 text-right text-sm font-semibold ${(item.variance ?? 0) === 0 ? 'text-gray-700' : 'text-red-600'}`}>
                          {item.variance ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
