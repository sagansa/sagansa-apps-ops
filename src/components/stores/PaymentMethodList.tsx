'use client';

import { PaymentMethod } from '@/app/services/api';
import { Pencil, Trash2, CheckCircle, XCircle, CreditCard, Banknote, QrCode, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { getQrisSummaryItems, parseQrisPayload } from '@/app/lib/qris';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface PaymentMethodListProps {
    paymentMethods: PaymentMethod[];
    onEdit: (method: PaymentMethod) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (method: PaymentMethod) => void;
}

const getPaymentIcon = (type: string) => {
    switch (type) {
        case 'cash':
            return <Banknote className="h-5 w-5" />;
        case 'qris':
            return <QrCode className="h-5 w-5" />;
        case 'transfer':
            return <Building2 className="h-5 w-5" />;
        case 'debit':
        case 'credit':
            return <CreditCard className="h-5 w-5" />;
        default:
            return <CreditCard className="h-5 w-5" />;
    }
};

const getPaymentTypeColor = (type: string) => {
    switch (type) {
        case 'cash':
            return 'bg-green-500/10 text-green-700 dark:text-green-400';
        case 'qris':
            return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
        case 'transfer':
            return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
        case 'debit':
        case 'credit':
            return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
        default:
            return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
};

const getPaymentDetail = (method: PaymentMethod) => {
    if (method.type === 'qris') {
        const qrisData = parseQrisPayload(method.details?.qris_payload);
        const summaryItems = getQrisSummaryItems(method.details?.qris_payload).slice(0, 4);

        if (!qrisData) {
            return (
                <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">
                        {method.details?.qris_payload ? 'Payload QRIS belum dapat dibaca' : 'Data QRIS belum tersedia'}
                    </span>
                    <div className="text-xs text-muted-foreground">
                        {method.require_proof ? 'Wajib Bukti Bayar' : 'Tanpa Bukti Bayar'}
                    </div>
                </div>
            );
        }

        return (
            <div className="min-w-0 max-w-full space-y-2">
                <div className="grid min-w-0 gap-x-5 gap-y-1 xl:grid-cols-2">
                    {summaryItems.map((item) => (
                        <div key={item.label} className="min-w-0 text-xs leading-5">
                            <span className="text-muted-foreground">{item.label}: </span>
                            <span className="break-words font-medium text-gray-900">{item.value}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                        {qrisData.pointOfInitiationLabel}
                    </Badge>
                    {method.require_proof && (
                        <Badge variant="outline" className="text-xs">
                            Wajib Bukti Bayar
                        </Badge>
                    )}
                </div>
            </div>
        );
    }

    return (
        <span className="text-sm text-muted-foreground">
            {method.require_proof ? 'Wajib Bukti Bayar' : 'Tanpa Bukti Bayar'}
        </span>
    );
};

export default function PaymentMethodList({
    paymentMethods,
    onEdit,
    onDelete,
    onToggleStatus,
}: PaymentMethodListProps) {
    if (paymentMethods.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                        Belum ada metode pembayaran yang ditambahkan.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[240px]">Metode Pembayaran</TableHead>
                        <TableHead className="w-[100px]">Tipe</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[112px] text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paymentMethods.map((method) => (
                        <TableRow key={method.id}>
                            <TableCell className="align-top">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${getPaymentTypeColor(method.type)} overflow-hidden relative`}>
                                        {method.details?.image ? (
                                            <img
                                                src={method.details.image}
                                                alt={method.name}
                                                className="h-8 w-8 object-cover rounded"
                                            />
                                        ) : (
                                            getPaymentIcon(method.type)
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            {method.name}
                                            {method.is_default && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                        {method.details && method.type === 'transfer' && method.details.bank_name && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {method.details.bank_name} - {method.details.account_number}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="align-top">
                                <Badge variant="outline" className="capitalize">
                                    {method.type}
                                </Badge>
                            </TableCell>
                            <TableCell className="min-w-0 max-w-[420px] whitespace-normal align-top">
                                {getPaymentDetail(method)}
                            </TableCell>
                            <TableCell className="align-top">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onToggleStatus(method)}
                                    className={method.is_active ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground'}
                                >
                                    {method.is_active ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Aktif
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Nonaktif
                                        </>
                                    )}
                                </Button>
                            </TableCell>
                            <TableCell className="align-top text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <Button
                                        // variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(method)}
                                        className="h-8 w-8"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => onDelete(method.id)}
                                        disabled={method.is_default}
                                        // className="h-8 w-8 text-destructive hover:text-destructive"
                                        title={method.is_default ? 'Metode pembayaran default tidak dapat dihapus' : 'Hapus'}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
