'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
} from 'lucide-react';
import apiService, {
  ApiError,
  RefundEligibility,
  RefundEligibilityItem,
} from '@/app/services/api';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

interface RefundModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ItemSelection {
  order_item_id: string;
  product_name: string;
  unit_price: number;
  available_quantity: number;
  selected_quantity: number;
}

export default function RefundModal({
  orderId,
  isOpen,
  onClose,
  onSuccess,
}: RefundModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<RefundEligibility | null>(null);
  const [selections, setSelections] = useState<ItemSelection[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const resetState = useCallback(() => {
    setEligibility(null);
    setSelections([]);
    setReason('');
    setNotes('');
    setPaymentMethod('cash');
    setError(null);
    setSuccessMessage(null);
  }, []);

  const fetchEligibility = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.checkRefundEligibility(orderId);
      setEligibility(data);
      const initialSelections: ItemSelection[] = data.available_items.map(
        (item: RefundEligibilityItem) => ({
          order_item_id: item.order_item_id,
          product_name: item.product_name,
          unit_price: item.unit_price,
          available_quantity: item.available_quantity,
          selected_quantity: 0,
        }),
      );
      setSelections(initialSelections);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to check refund eligibility');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      resetState();
      fetchEligibility();
    }
  }, [isOpen, orderId, fetchEligibility, resetState]);

  const totalRefundAmount = useMemo(() => {
    return selections.reduce(
      (sum, item) => sum + item.selected_quantity * item.unit_price,
      0,
    );
  }, [selections]);

  const selectedCount = useMemo(
    () => selections.filter((s) => s.selected_quantity > 0).length,
    [selections],
  );

  const updateQuantity = (itemId: string, delta: number) => {
    setSelections((prev) =>
      prev.map((item) => {
        if (item.order_item_id !== itemId) return item;
        const newQty = Math.max(
          0,
          Math.min(item.available_quantity, item.selected_quantity + delta),
        );
        return { ...item, selected_quantity: newQty };
      }),
    );
  };

  const setQuantity = (itemId: string, value: number) => {
    setSelections((prev) =>
      prev.map((item) => {
        if (item.order_item_id !== itemId) return item;
        const clamped = Math.max(0, Math.min(item.available_quantity, value));
        return { ...item, selected_quantity: clamped };
      }),
    );
  };

  const selectAll = () => {
    setSelections((prev) =>
      prev.map((item) => ({
        ...item,
        selected_quantity: item.available_quantity,
      })),
    );
  };

  const clearAll = () => {
    setSelections((prev) =>
      prev.map((item) => ({ ...item, selected_quantity: 0 })),
    );
  };

  const handleSubmit = async () => {
    if (!orderId) return;

    const itemsToRefund = selections
      .filter((s) => s.selected_quantity > 0)
      .map((s) => ({
        order_item_id: s.order_item_id,
        quantity: s.selected_quantity,
      }));

    if (itemsToRefund.length === 0) {
      setError('Pilih minimal satu item untuk direfund');
      return;
    }

    if (!reason.trim()) {
      setError('Alasan refund wajib diisi');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await apiService.processRefund(orderId, {
        items: itemsToRefund,
        reason: reason.trim(),
        notes: notes.trim() || null,
        payment_method: paymentMethod,
      });

      setSuccessMessage(
        `Refund ${result.refund_number} berhasil diproses sebesar ${formatCurrency(
          result.total_amount,
        )}.`,
      );

      if (onSuccess) {
        onSuccess();
      }

      // Close modal after a short delay so the success message is visible
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to process refund');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const isFullyRefunded =
    eligibility &&
    eligibility.order.available_refund_amount <= 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" />

      <div
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-orange-50 text-orange-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Refund Receipt
              </h3>
              {eligibility && (
                <p className="text-sm text-gray-500">
                  {eligibility.order.receipt_number}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RotateCcw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : successMessage ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-50 text-green-600 mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="text-center text-sm text-gray-700 font-medium">
                {successMessage}
              </p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          ) : !eligibility ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Tidak dapat memuat data refund</p>
            </div>
          ) : isFullyRefunded ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 mx-auto mb-4">
                <RotateCcw className="h-8 w-8" />
              </div>
              <p className="text-sm text-gray-600 font-medium">
                Order ini sudah di-refund sepenuhnya
              </p>
            </div>
          ) : (
            <>
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Grand Total</span>
                  <span className="font-medium">
                    {formatCurrency(eligibility.order.grand_total)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sudah Direfund</span>
                  <span className="text-red-600 font-medium">
                    - {formatCurrency(eligibility.order.total_refunded)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-700 font-medium">
                    Tersedia untuk Refund
                  </span>
                  <span className="text-green-600 font-bold">
                    {formatCurrency(eligibility.order.available_refund_amount)}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Pilih Item untuk Refund
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={clearAll}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {selections.map((item) => (
                    <div
                      key={item.order_item_id}
                      className={`border rounded-lg p-3 transition-colors ${
                        item.selected_quantity > 0
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.unit_price)} / item
                          </p>
                        </div>

                        {/* Quantity selector */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateQuantity(item.order_item_id, -1)}
                            disabled={item.selected_quantity <= 0}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={item.available_quantity}
                            value={item.selected_quantity}
                            onChange={(e) =>
                              setQuantity(
                                item.order_item_id,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-12 text-center text-sm border border-gray-300 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                          <button
                            onClick={() => updateQuantity(item.order_item_id, 1)}
                            disabled={
                              item.selected_quantity >= item.available_quantity
                            }
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs text-gray-400 w-12">
                            / {item.available_quantity}
                          </span>
                        </div>
                      </div>
                      {item.selected_quantity > 0 && (
                        <div className="mt-2 flex justify-end">
                          <span className="text-xs font-medium text-orange-700">
                            Refund: {formatCurrency(
                              item.selected_quantity * item.unit_price,
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metode Refund <span className="text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="qris">QRIS</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                    <option value="ewallet">E-Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alasan Refund <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Contoh: Barang rusak, salah pesan, dll."
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catatan <span className="text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan..."
                    rows={2}
                    maxLength={1000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
              </div>

              {/* Total */}
              {totalRefundAmount > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Total Refund ({selectedCount} item)
                    </span>
                    <span className="text-lg font-bold text-orange-700">
                      {formatCurrency(totalRefundAmount)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !successMessage && !isFullyRefunded && eligibility && (
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                totalRefundAmount <= 0 ||
                !reason.trim()
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Proses Refund
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}