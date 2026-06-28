'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import apiService, { Receipt, ReceiptItem, getReceiptItemName } from '@/app/services/api';
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  Receipt as ReceiptIcon,
  Store as StoreIcon,
  User,
  Clock,
  CreditCard,
  ShoppingCart,
  Hash,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Clock as ClockIcon,
  RotateCcw,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

/**
 * Merge all variant sources (variant_snapshot object/array + legacy variants rows)
 * into a single normalized list of { name, price } entries.
 */
function getMergedVariants(item: ReceiptItem): Array<{ name: string; price: number }> {
  const merged: Array<{ name: string; price: number }> = [];

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

export default function TransactionDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter();
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

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipt = useCallback(async () => {
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
  }, [orderId, t]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/transactions')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToReceipts')}
        </Button>
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error || t('receiptNotFound')}</p>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[receipt.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;
  const orderItems = receipt.order_items || [];
  const orderPayments = receipt.order_payments || [];
  const store = receipt.store;

  return (
    <div className="space-y-6">
      {/* Back button & actions */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/transactions')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToReceipts')}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReceipt}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {tCommon('refresh')}
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            {t('print')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Receipt view */}
        <div className="lg:col-span-2">
          <Card className="print:shadow-none print:border-0">
            <CardContent className="p-0">
              {/* Receipt Paper Style */}
              <div className="bg-white p-6 font-mono text-sm" id="receipt-printable">
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
                                  <div className="ml-2 text-gray-400 italic">Note: {item.notes}</div>
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
                </div>

                {/* Payment Info */}
                {(orderPayments.length > 0 || receipt.paid_at) && (
                  <div className="border-t border-dashed border-gray-300 mt-4 pt-4 space-y-1">
                    {receipt.paid_at && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">{t('paidAt')}</span>
                        <span>{formatDateTime(receipt.paid_at)}</span>
                      </div>
                    )}
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
            </CardContent>
          </Card>
        </div>

        {/* Right column: Meta info */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base">{t('status')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${statusInfo.color}`}>
                <StatusIcon className="h-5 w-5" />
                <span className="font-medium">{statusInfo.label}</span>
              </div>
              {receipt.time_ago && (
                <p className="mt-2 text-xs text-gray-500">{receipt.time_ago}</p>
              )}
            </CardContent>
          </Card>

          {/* Transaction Info */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                {t('transactionInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <ReceiptIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{t('receiptNumber')}</p>
                  <p className="font-mono font-medium text-gray-900 break-all">
                    {receipt.receipt_number}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">{t('created')}</p>
                  <p className="text-gray-900">{formatDateTime(receipt.created_at)}</p>
                </div>
              </div>
              {store && (
                <div className="flex items-start gap-2">
                  <StoreIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">{t('store')}</p>
                    <p className="text-gray-900">{store.name}</p>
                    {store.nickname && (
                      <p className="text-xs text-gray-500">{store.nickname}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <ShoppingCart className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">{t('source')}</p>
                  <p className="text-gray-900 uppercase">{receipt.source}</p>
                </div>
              </div>
              {receipt.is_offline ? (
                <div className="flex items-start gap-2">
                  <WifiOff className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">{t('mode')}</p>
                    <p className="text-amber-600 font-medium">{t('offline')}</p>
                    {receipt.synced_at && (
                      <p className="text-xs text-gray-500">
                        {t('synced')}: {formatDateTime(receipt.synced_at)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Wifi className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">{t('mode')}</p>
                    <p className="text-green-600 font-medium">{t('online')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base">{t('summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('items')}</span>
                <span className="font-medium">{orderItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('subtotal')}</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              {Number(receipt.discount_total) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>{t('discount')}</span>
                  <span>- {formatCurrency(receipt.discount_total)}</span>
                </div>
              )}
              {Number(receipt.tax_total) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('tax')}</span>
                  <span>{formatCurrency(receipt.tax_total)}</span>
                </div>
              )}
              {Number(receipt.service_total) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('service')}</span>
                  <span>{formatCurrency(receipt.service_total)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>{t('grandTotal')}</span>
                <span>{formatCurrency(receipt.grand_total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          {(receipt.customer_name || receipt.table_code) && (
            <Card className="print:hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  {t('customer')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {receipt.customer_name && (
                  <div>
                    <p className="text-xs text-gray-500">{t('name')}</p>
                    <p className="text-gray-900">{receipt.customer_name}</p>
                  </div>
                )}
                {receipt.table_code && (
                  <div>
                    <p className="text-xs text-gray-500">{t('table')}</p>
                    <p className="text-gray-900">{receipt.table_code}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}