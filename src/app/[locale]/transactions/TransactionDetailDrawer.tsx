 'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Printer,
  Receipt as ReceiptIcon,
  CheckCircle2,
  XCircle,
  Clock as ClockIcon,
  RotateCcw,
} from 'lucide-react';
import apiService, { Receipt, ReceiptItem, getReceiptItemName } from '@/app/services/api';
import { useAuth } from '@/app/contexts/AuthContext';
import RefundModal from './RefundModal';
import { useTranslations, useLocale } from 'next-intl';

/**
 * Merge all variant sources (variant_snapshot object/array + legacy variants rows)
 * into a single normalized list of { name, price } entries.
 */
function getMergedVariants(item: ReceiptItem): Array<{ name: string; price: number }> {
  const merged: Array<{ name: string; price: number }> = [];

  // 1. variant_snapshot — can be a single object OR an array
  const snapshot = item.variant_snapshot;
  if (snapshot) {
    const snapshots = Array.isArray(snapshot) ? snapshot : [snapshot];
    snapshots.forEach((v) => {
      if (v && typeof v === 'object' && (v.name || v.price != null)) {
        merged.push({
          name: String(v.name ?? 'Variant'),
          price: Number(v.price ?? 0),
        });
      }
    });
  }

  // 2. Legacy variants rows (only add if not already captured via snapshot)
  if (Array.isArray(item.variants)) {
    item.variants.forEach((v) => {
      const name = String(v.name ?? 'Variant');
      const alreadyAdded = merged.some((m) => m.name === name && m.price === Number(v.price ?? 0));
      if (!alreadyAdded) {
        merged.push({ name, price: Number(v.price ?? 0) });
      }
    });
  }

  return merged;
}

/**
 * Merge all modification sources (modifications_snapshot + legacy order_item_modifications)
 * into a single normalized list of { name, price } entries.
 */
function getMergedModifications(item: ReceiptItem): Array<{ name: string; price: number }> {
  const merged: Array<{ name: string; price: number }> = [];

  if (Array.isArray(item.modifications_snapshot)) {
    item.modifications_snapshot.forEach((m) => {
      merged.push({
        name: String(m.name ?? 'Mod'),
        price: Number(m.price ?? 0),
      });
    });
  }

  if (Array.isArray(item.order_item_modifications)) {
    item.order_item_modifications.forEach((m) => {
      merged.push({
        name: 'Mod',
        price: Number(m.price ?? 0),
      });
    });
  }

  return merged;
}

/**
 * Compute the product base price (price of the product itself, excluding
 * variants/modifications). Matches the printer/POS logic: prefer
 * product_snapshot.price when valid, otherwise derive from unit_price minus
 * the total of all options.
 */
function getItemBasePrice(item: ReceiptItem): number {
  const variants = getMergedVariants(item);
  const mods = getMergedModifications(item);
  const optionTotal =
    variants.reduce((sum, v) => sum + Number(v.price || 0), 0) +
    mods.reduce((sum, m) => sum + Number(m.price || 0), 0);
  const unitPrice = Number(item.unit_price || 0);
  const snapshotBasePrice =
    item.product_snapshot?.price != null ? Number(item.product_snapshot.price || 0) : 0;
  return snapshotBasePrice > 0 && snapshotBasePrice < unitPrice
    ? snapshotBasePrice
    : Math.max(0, unitPrice - optionTotal);
}

interface TransactionDetailDrawerProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TransactionDetailDrawer({ orderId, open, onOpenChange }: TransactionDetailDrawerProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  const { user, isAdmin } = useAuth();
  const t = useTranslations('Transactions.detail');
  const tStatus = useTranslations('Transactions.status');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString(locale === 'en' ? 'en-US' : 'id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    completed: { label: tStatus('completed'), color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
    pending: { label: tStatus('pending'), color: 'text-yellow-600 bg-yellow-50', icon: ClockIcon },
    cancelled: { label: tStatus('cancelled'), color: 'text-red-600 bg-red-50', icon: XCircle },
    refunded: { label: tStatus('refunded'), color: 'text-gray-600 bg-gray-50', icon: RotateCcw },
  };

  // Refund is only available to manager / owner roles (in addition to admin).
  const canRefund =
    !!user &&
    (isAdmin ||
      user.roles?.some(
        (role) => role.name === 'manager' || role.name === 'owner',
      ));

  const fetchReceipt = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getOrder(orderId);
      const data = (response as { success?: boolean; data?: Receipt })?.data;
      if (data) {
        setReceipt(data);
      } else {
        setError(t('receiptNotFound'));
      }
    } catch (err: any) {
      setError(err?.message || t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && orderId) {
      fetchReceipt();
    }
    // Reset state when closed
    if (!open) {
      setReceipt(null);
      setError(null);
    }
  }, [open, orderId, fetchReceipt]);

  const handlePrint = () => {
    window.print();
  };

  const statusInfo = receipt ? statusConfig[receipt.status] || statusConfig.pending : statusConfig.pending;
  const StatusIcon = statusInfo.icon;
  const orderItems = receipt?.order_items || [];
  const orderPayments = receipt?.order_payments || [];
  const store = receipt?.store;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 gap-0 flex flex-col"
      >
        {/* Header (fixed) */}
        <SheetHeader className="border-b px-5 py-4 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2 min-w-0">
            <ReceiptIcon className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <SheetTitle className="truncate">{t('title')}</SheetTitle>
              <SheetDescription className="truncate text-xs">
                {receipt?.receipt_number || (loading ? tCommon('loading') : '—')}
              </SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReceipt}
              disabled={loading || !orderId}
              title={tCommon('refresh')}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{tCommon('refresh')}</span>
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={!receipt}
              title={t('print')}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('print')}</span>
            </Button>
            {canRefund && receipt && receipt.status !== 'cancelled' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRefundModalOpen(true)}
                disabled={!receipt.paid_at}
                title={
                  !receipt.paid_at
                    ? t('refundDisabled')
                    : t('refundTooltip')
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('refund')}</span>
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && !receipt ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : receipt ? (
            <>
              {/* Status badge */}
              <div className="print:hidden">
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${statusInfo.color}`}>
                  <StatusIcon className="h-5 w-5" />
                  <span className="font-medium">{statusInfo.label}</span>
                </div>
              </div>

              {/* Receipt Paper */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="bg-white p-5 font-mono text-sm rounded-lg" id="receipt-printable">
                  {/* Store Header */}
                  <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                    {store && (
                      <>
                        <h2 className="text-lg font-bold uppercase tracking-wide">
                          {store.name}
                        </h2>
                        {store.address && (
                          <p className="text-xs text-gray-600 mt-1">{store.address}</p>
                        )}
                        {store.phone && (
                          <p className="text-xs text-gray-600">Telp: {store.phone}</p>
                        )}
                        {store.receipt_header && (
                          <p className="text-xs text-gray-700 mt-2 whitespace-pre-line">
                            {store.receipt_header}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Receipt Info */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('receiptNo')}</span>
                      <span className="font-bold">{receipt.receipt_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('date')}</span>
                      <span>{formatDateTime(receipt.created_at)}</span>
                    </div>
                    {receipt.customer_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('customer')}</span>
                        <span>{receipt.customer_name}</span>
                      </div>
                    )}
                    {receipt.table_code && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('table')}</span>
                        <span>{receipt.table_code}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('source')}</span>
                      <span className="uppercase">{receipt.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('status')}</span>
                      <span className="font-bold uppercase">{statusInfo.label}</span>
                    </div>
                    {receipt.is_offline && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('mode')}</span>
                        <span className="text-amber-600 font-bold">OFFLINE</span>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="border-t border-dashed border-gray-300 pt-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-1 font-bold">{t('item')}</th>
                          <th className="text-center py-1 font-bold w-12">Qty</th>
                          <th className="text-right py-1 font-bold w-24">{t('price')}</th>
                          <th className="text-right py-1 font-bold w-24">{t('total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-4 text-gray-400">
                              {t('noItems')}
                            </td>
                          </tr>
                        ) : (
                          orderItems.flatMap((item) => {
                            const variants = getMergedVariants(item);
                            const mods = getMergedModifications(item);
                            const basePrice = getItemBasePrice(item);
                            const unitPrice = Number(item.unit_price || 0);

                            return [
                              <tr key={item.id} className="align-top">
                                <td className="py-1">
                                  <div className="font-medium">{getReceiptItemName(item)}</div>
                                  {item.notes && (
                                    <div className="text-gray-400 italic">Note: {item.notes}</div>
                                  )}
                                </td>
                                <td className="text-center py-1">{item.quantity}</td>
                                <td className="text-right py-1">{formatCurrency(basePrice)}</td>
                                <td className="text-right py-1"></td>
                              </tr>,
                              ...variants.map((v, idx) => (
                                <tr key={`${item.id}-v-${idx}`} className="text-gray-500">
                                  <td className="py-0.5 pl-4">+ {v.name}</td>
                                  <td className="text-center py-0.5"></td>
                                  <td className="text-right py-0.5">{formatCurrency(v.price)}</td>
                                  <td className="text-right py-0.5"></td>
                                </tr>
                              )),
                              ...mods.map((m, idx) => (
                                <tr key={`${item.id}-m-${idx}`} className="text-gray-500">
                                  <td className="py-0.5 pl-4">+ {m.name}</td>
                                  <td className="text-center py-0.5"></td>
                                  <td className="text-right py-0.5">{formatCurrency(m.price)}</td>
                                  <td className="text-right py-0.5"></td>
                                </tr>
                              )),
                              <tr key={`${item.id}-calc`} className="text-gray-700">
                                <td className="py-1 text-right font-medium" colSpan={3}>
                                  {item.quantity} x {formatCurrency(unitPrice)}
                                </td>
                                <td className="py-1 text-right font-bold">
                                  {formatCurrency(item.total_price)}
                                </td>
                              </tr>,
                            ];
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="border-t border-dashed border-gray-300 mt-4 pt-4 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">{t('subtotal')}</span>
                      <span>{formatCurrency(receipt.subtotal)}</span>
                    </div>
                    {Number(receipt.discount_total) > 0 && (
                      <div className="flex justify-between text-xs text-red-600">
                        <span>{t('discount')}</span>
                        <span>- {formatCurrency(receipt.discount_total)}</span>
                      </div>
                    )}
                    {Number(receipt.tax_total) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">{t('tax')}</span>
                        <span>{formatCurrency(receipt.tax_total)}</span>
                      </div>
                    )}
                    {Number(receipt.service_total) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">{t('service')}</span>
                        <span>{formatCurrency(receipt.service_total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t border-gray-400 pt-2 mt-2">
                      <span>{t('grandTotalLabel')}</span>
                      <span>{formatCurrency(receipt.grand_total)}</span>
                    </div>
                    {Number((receipt as any).total_refunded) > 0 && (
                      <>
                        <div className="flex justify-between text-xs text-orange-600 mt-1">
                          <span>{t('refunded')}</span>
                          <span>- {formatCurrency((receipt as any).total_refunded)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-gray-900 border-t border-gray-300 pt-1 mt-1">
                          <span>{t('netTotal')}</span>
                          <span>
                            {formatCurrency(
                              Number(receipt.grand_total) -
                                Number((receipt as any).total_refunded),
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payment Info */}
                  {orderPayments.length > 0 && (
                    <div className="border-t border-dashed border-gray-300 mt-4 pt-4 space-y-1">
                      {orderPayments.map((payment) => (
                        <div key={payment.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">
                            {t('payment')}
                            {payment.reference && ` (${payment.reference})`}
                            {payment.is_offline && ' [OFFLINE]'}
                          </span>
                          <span>{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                      {receipt.payment_snapshot && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{t('method')}</span>
                          <span className="uppercase">
                            {(receipt.payment_snapshot as Record<string, unknown>).method as string ||
                              (receipt.payment_snapshot as Record<string, unknown>).payment_method as string ||
                              (receipt.payment_snapshot as Record<string, unknown>).name as string ||
                              'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  {store?.receipt_footer && (
                    <div className="border-t border-dashed border-gray-300 mt-4 pt-4 text-center">
                      <p className="text-xs text-gray-600 whitespace-pre-line">
                        {store.receipt_footer}
                      </p>
                    </div>
                  )}

                  <div className="text-center mt-4 text-xs text-gray-400">
                    <p>{t('thankYou')}</p>
                    <p className="mt-1">{t('poweredBy')}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ReceiptIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">{t('selectReceipt')}</p>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Refund Modal */}
      <RefundModal
        orderId={orderId}
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={fetchReceipt}
      />
    </Sheet>
  );
}
