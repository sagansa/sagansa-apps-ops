'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import apiService, {
  BillingSettings,
  Plan,
  PlanDiscount,
  PaymentProvider,
} from '@/app/services/api';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  Settings,
  CreditCard,
  Percent,
  Tag,
  Building2,
  Loader2,
  Save,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BillingConfigClient() {
  const t = useTranslations('Billing.config');
  const tBilling = useTranslations('Billing');
  const tCommon = useTranslations('Common');
  const { isSuperAdmin } = useAuth();

  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [discounts, setDiscounts] = useState<PlanDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p, d] = await Promise.all([
        apiService.getBillingSettings(),
        apiService.getPlans(),
        apiService.getDiscounts(),
      ]);
      setSettings(s);
      setPlans(p);
      setDiscounts(d);
    } catch (err: any) {
      setError(err?.message || tBilling('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [tBilling]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-gray-400">{tCommon('accessDenied')}</p>
      </div>
    );
  }

  if (error || !settings || plans.length === 0) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <Button variant="outline" onClick={fetchData}>
          {tCommon('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      <Tabs defaultValue="provider">
        <TabsList className="grid w-full grid-cols-2 md:flex md:w-auto">
          <TabsTrigger value="provider" className="flex-1 md:flex-initial">
            <CreditCard className="mr-1.5 h-4 w-4" />
            {t('tabProvider')}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex-1 md:flex-initial">
            <Percent className="mr-1.5 h-4 w-4" />
            {t('tabPricing')}
          </TabsTrigger>
          <TabsTrigger value="discounts" className="flex-1 md:flex-initial">
            <Tag className="mr-1.5 h-4 w-4" />
            {t('tabDiscounts')}
          </TabsTrigger>
        </TabsList>

        {/* === Provider Tab === */}
        <TabsContent value="provider">
          <ProviderTab settings={settings} onSaved={fetchData} />
        </TabsContent>

        {/* === Pricing Tab === */}
        <TabsContent value="pricing">
          <PricingTab plan={plans[0]} onSaved={fetchData} />
        </TabsContent>

        {/* === Discounts Tab === */}
        <TabsContent value="discounts">
          <DiscountsTab
            discounts={discounts}
            planId={plans[0].id}
            onSaved={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =========================================================================
// Provider Tab
// =========================================================================
function ProviderTab({
  settings,
  onSaved,
}: {
  settings: BillingSettings;
  onSaved: () => void;
}) {
  const t = useTranslations('Billing.config.provider');
  const tBilling = useTranslations('Billing');
  const [form, setForm] = useState<BillingSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.updateBillingSettings({
        active_provider: form.active_provider,
        xendit_secret_key: form.xendit_secret_key,
        xendit_verify_key: form.xendit_verify_key,
        midtrans_server_key: form.midtrans_server_key,
        midtrans_client_key: form.midtrans_client_key,
        midtrans_is_production: form.midtrans_is_production,
        webhook_secret: form.webhook_secret,
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
      onSaved();
    } catch (err: any) {
      alert(err?.message || tBilling('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('active')}</CardTitle>
        <CardDescription>
          {tBilling('subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active provider */}
        <div className="space-y-2">
          <Label>{t('active')}</Label>
          <Select
            value={form.active_provider}
            onValueChange={(v) =>
              setForm({ ...form, active_provider: v as PaymentProvider })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xendit">{t('xendit')}</SelectItem>
              <SelectItem value="midtrans">{t('midtrans')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Xendit */}
        <div className="space-y-3 rounded-lg border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700">{t('xendit')}</p>
          <div>
            <Label htmlFor="xendit-secret">{t('xenditSecret')}</Label>
            <Input
              id="xendit-secret"
              type="password"
              value={form.xendit_secret_key ?? ''}
              onChange={(e) =>
                setForm({ ...form, xendit_secret_key: e.target.value })
              }
              placeholder="xnd_..."
            />
          </div>
          <div>
            <Label htmlFor="xendit-verify">{t('xenditVerify')}</Label>
            <Input
              id="xendit-verify"
              type="password"
              value={form.xendit_verify_key ?? ''}
              onChange={(e) =>
                setForm({ ...form, xendit_verify_key: e.target.value })
              }
            />
          </div>
        </div>

        {/* Midtrans */}
        <div className="space-y-3 rounded-lg border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700">{t('midtrans')}</p>
          <div>
            <Label htmlFor="midtrans-server">{t('midtransServer')}</Label>
            <Input
              id="midtrans-server"
              type="password"
              value={form.midtrans_server_key ?? ''}
              onChange={(e) =>
                setForm({ ...form, midtrans_server_key: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="midtrans-client">{t('midtransClient')}</Label>
            <Input
              id="midtrans-client"
              type="password"
              value={form.midtrans_client_key ?? ''}
              onChange={(e) =>
                setForm({ ...form, midtrans_client_key: e.target.value })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.midtrans_is_production}
              onChange={(e) =>
                setForm({ ...form, midtrans_is_production: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            {t('midtransProduction')}
          </label>
        </div>

        {/* Webhook */}
        <div>
          <Label htmlFor="webhook-secret">{t('webhookSecret')}</Label>
          <Input
            id="webhook-secret"
            value={form.webhook_secret ?? ''}
            onChange={(e) =>
              setForm({ ...form, webhook_secret: e.target.value })
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('save')}
          </Button>
          {savedMsg && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {t('saved')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Pricing Tab
// =========================================================================
function PricingTab({ plan, onSaved }: { plan: Plan; onSaved: () => void }) {
  const t = useTranslations('Billing.config.pricing');
  const tBilling = useTranslations('Billing');
  const [form, setForm] = useState<Plan>(plan);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.updatePlan(plan.id, {
        pos_rate_percent: Number(form.pos_rate_percent),
        pos_base_charge: Number(form.pos_base_charge),
        attendance_rate: Number(form.attendance_rate),
        attendance_free_count: Number(form.attendance_free_count),
        trial_months: Number(form.trial_months),
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
      onSaved();
    } catch (err: any) {
      alert(err?.message || tBilling('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{plan.name}</CardTitle>
        <CardDescription>{tBilling('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pos-rate">{t('posRate')}</Label>
            <Input
              id="pos-rate"
              type="number"
              step="0.01"
              value={form.pos_rate_percent * 100}
              onChange={(e) =>
                setForm({
                  ...form,
                  pos_rate_percent: Number(e.target.value) / 100,
                })
              }
            />
            <p className="mt-1 text-xs text-gray-400">1% = 1.00</p>
          </div>
          <div>
            <Label htmlFor="pos-base">{t('posBase')}</Label>
            <Input
              id="pos-base"
              type="number"
              value={form.pos_base_charge}
              onChange={(e) =>
                setForm({ ...form, pos_base_charge: Number(e.target.value) })
              }
            />
            <p className="mt-1 text-xs text-gray-400">99000 = Rp 99.000</p>
          </div>
          <div>
            <Label htmlFor="att-rate">{t('attendanceRate')}</Label>
            <Input
              id="att-rate"
              type="number"
              value={form.attendance_rate}
              onChange={(e) =>
                setForm({ ...form, attendance_rate: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="att-free">{t('attendanceFree')}</Label>
            <Input
              id="att-free"
              type="number"
              value={form.attendance_free_count}
              onChange={(e) =>
                setForm({
                  ...form,
                  attendance_free_count: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="trial">{t('trialMonths')}</Label>
            <Input
              id="trial"
              type="number"
              value={form.trial_months}
              onChange={(e) =>
                setForm({ ...form, trial_months: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('save')}
          </Button>
          {savedMsg && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {t('saved')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Discounts Tab
// =========================================================================
function DiscountsTab({
  discounts,
  planId,
  onSaved,
}: {
  discounts: PlanDiscount[];
  planId: string;
  onSaved: () => void;
}) {
  const t = useTranslations('Billing.config.discount');
  const tBilling = useTranslations('Billing');
  const tCommon = useTranslations('Common');
  const [editing, setEditing] = useState<PlanDiscount | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm(tCommon('confirmDelete'))) return;
    try {
      await apiService.deleteDiscount(id);
      onSaved();
    } catch (err: any) {
      alert(err?.message || tBilling('errors.saveFailed'));
    }
  };

  if (showForm || editing) {
    return (
      <DiscountForm
        discount={editing}
        planId={planId}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSaved={() => {
          setShowForm(false);
          setEditing(null);
          onSaved();
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{tBilling('config.tabDiscounts')}</CardTitle>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            {t('add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {discounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">{t('noDiscounts')}</p>
        ) : (
          <div className="space-y-2">
            {discounts.map((discount) => (
              <div
                key={discount.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold rounded bg-gray-100 px-1.5 py-0.5">
                      {discount.code}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {discount.name}
                    </span>
                    {!discount.is_active && (
                      <span className="text-xs text-gray-400">(inactive)</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {discount.type === 'percentage'
                      ? `${discount.value}%`
                      : `Rp ${discount.value.toLocaleString('id-ID')}`}
                    {' • '}
                    {discount.applies_to}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing(discount)}
                    title={t('edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(discount.id)}
                    title={t('delete')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Discount Form (create/edit)
// =========================================================================
function DiscountForm({
  discount,
  planId,
  onClose,
  onSaved,
}: {
  discount: PlanDiscount | null;
  planId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('Billing.config.discount');
  const tBilling = useTranslations('Billing');
  const tCommon = useTranslations('Common');
  const [form, setForm] = useState({
    code: discount?.code ?? '',
    name: discount?.name ?? '',
    type: discount?.type ?? ('percentage' as 'percentage' | 'fixed'),
    value: discount?.value ?? 30,
    applies_to: discount?.applies_to ?? ('pos' as 'pos' | 'attendance' | 'total'),
    starts_at: discount?.starts_at ?? new Date().toISOString().split('T')[0],
    ends_at: discount?.ends_at ?? '',
    is_active: discount?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        plan_id: planId,
        ends_at: form.ends_at || null,
        value: Number(form.value),
      };
      if (discount) {
        await apiService.updateDiscount(discount.id, payload);
      } else {
        await apiService.createDiscount(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err?.message || tBilling('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {discount ? t('edit') : t('add')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="d-code">{t('code')}</Label>
            <Input
              id="d-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="LAUNCH30"
            />
          </div>
          <div>
            <Label htmlFor="d-name">{t('name')}</Label>
            <Input
              id="d-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>{t('type')}</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as 'percentage' | 'fixed' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{t('percentage')}</SelectItem>
                <SelectItem value="fixed">{t('fixed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="d-value">{t('value')}</Label>
            <Input
              id="d-value"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
            <p className="mt-1 text-xs text-gray-400">
              {form.type === 'percentage' ? '30 = 30%' : '30000 = Rp 30.000'}
            </p>
          </div>
          <div>
            <Label>{t('appliesTo')}</Label>
            <Select
              value={form.applies_to}
              onValueChange={(v) => setForm({ ...form, applies_to: v as 'pos' | 'attendance' | 'total' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="total">Total</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="d-start">{t('startsAt')}</Label>
            <Input
              id="d-start"
              type="date"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="d-end">{t('endsAt')}</Label>
            <Input
              id="d-end"
              type="date"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              {t('active')}
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
