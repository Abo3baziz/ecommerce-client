"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ForbiddenCard } from "@/components/guards";
import { ErrorState } from "@/components/shared/error-state";
import { useSession } from "@/features/auth/session-context";
import { getSystemSettings, updateSystemSection } from "@/features/admin/settings-api";
import { handleSettingsError, handleSettingsInvalid } from "@/features/admin/settings-components/handle-error";
import { qk } from "@/lib/api/queryKeys";

const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
const percent = z.string().regex(/^\d{1,5}(\.\d{1,2})?$/);
const schema = z.object({
  default_currency: z.enum(["USD", "EUR", "GBP", "EGP", "SAR", "AED"]),
  tax_config: z.object({ mode: z.enum(["inclusive", "exclusive"]), rate: percent }),
  payment_fee: z.object({ fixed: money, percent }),
  refund_accounting: z.enum(["credit", "reverse"]),
  coupon_cost_attribution: z.enum(["discount", "marketing"]),
  default_reporting_period: z.enum(["month", "quarter", "year", "custom"]),
  fiscal_year_start: z.coerce.number().int().min(1).max(12),
  report_preferences: z.object({ granularity: z.enum(["auto", "day", "month"]), currency: z.enum(["USD", "EUR", "GBP", "EGP", "SAR", "AED"]) }),
  expense_categories: z.array(z.string().min(1).max(50)),
});
type FormValues = z.infer<typeof schema>;
export default function FinancialSettingsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <FinancialForm />;
}
function FinancialForm() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.admin.settings("financial"),
    queryFn: async () => {
      const data = await getSystemSettings("financial") as unknown as { value: FormValues };
      const v = (data as unknown as { value: FormValues })?.value ?? (data as unknown as FormValues);
      return v as FormValues;
    },
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: { default_currency: "USD", tax_config: { mode: "exclusive", rate: "0.00" }, payment_fee: { fixed: "0.00", percent: "0.00" }, refund_accounting: "credit", coupon_cost_attribution: "discount", default_reporting_period: "month", fiscal_year_start: 1, report_preferences: { granularity: "auto", currency: "USD" }, expense_categories: ["RENT", "SALARIES", "MARKETING", "UTILITIES", "SHIPPING", "SOFTWARE", "OTHER"] },
  });
  useEffect(() => { if (query.data) form.reset(query.data as FormValues); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateSystemSection("financial", v),
    onSuccess: async () => { toast.success("Financial settings saved"); await qc.invalidateQueries({ queryKey: qk.admin.settings("financial") }); },
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const isDirty = form.formState.isDirty;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Financial Settings</h1><p className="mt-1 text-sm text-muted-foreground">Currency, tax, fees, refunds, coupons and reporting. Feeds P&L/revenue/expenses analytics.</p></div>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleSettingsInvalid)} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none"><CardHeader><CardTitle>Currency & tax</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2"><Label>Default currency</Label><Select value={form.watch("default_currency")} onValueChange={(v) => form.setValue("default_currency", v as FormValues["default_currency"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USD","EUR","GBP","EGP","SAR","AED"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label>Tax mode</Label><Select value={form.watch("tax_config.mode")} onValueChange={(v) => form.setValue("tax_config.mode", v as never, { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inclusive">Inclusive</SelectItem><SelectItem value="exclusive">Exclusive</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Tax rate (%)</Label><Input {...form.register("tax_config.rate")} /></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Fees & refunds</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2"><Label>Payment fee fixed</Label><Input {...form.register("payment_fee.fixed")} /></div>
          <div className="grid gap-2"><Label>Payment fee percent (%)</Label><Input {...form.register("payment_fee.percent")} /></div>
          <div className="grid gap-2"><Label>Refund accounting</Label><Select value={form.watch("refund_accounting")} onValueChange={(v) => form.setValue("refund_accounting", v as FormValues["refund_accounting"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="credit">Credit</SelectItem><SelectItem value="reverse">Reverse</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Coupon cost attribution</Label><Select value={form.watch("coupon_cost_attribution")} onValueChange={(v) => form.setValue("coupon_cost_attribution", v as FormValues["coupon_cost_attribution"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="discount">Discount</SelectItem><SelectItem value="marketing">Marketing</SelectItem></SelectContent></Select></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Reporting</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2"><Label>Default reporting period</Label><Select value={form.watch("default_reporting_period")} onValueChange={(v) => form.setValue("default_reporting_period", v as FormValues["default_reporting_period"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">Month</SelectItem><SelectItem value="quarter">Quarter</SelectItem><SelectItem value="year">Year</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Fiscal year start (month)</Label><Input type="number" {...form.register("fiscal_year_start")} /></div>
          <div className="grid gap-2"><Label>Report granularity</Label><Select value={form.watch("report_preferences.granularity")} onValueChange={(v) => form.setValue("report_preferences.granularity", v as never, { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto</SelectItem><SelectItem value="day">Day</SelectItem><SelectItem value="month">Month</SelectItem></SelectContent></Select></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Expense categories</CardTitle><CardDescription>Comma-separated. Superset of expense_category enum.</CardDescription></CardHeader><CardContent className="grid gap-2">
          <Label>Categories</Label><Input value={Array.isArray(form.watch("expense_categories")) ? (form.watch("expense_categories") as string[]).join(", ") : ""} onChange={(e) => form.setValue("expense_categories", e.target.value.split(",").map((s) => s.trim()).filter(Boolean), { shouldDirty: true })} placeholder="RENT, SALARIES, MARKETING, ..." />
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">{mutation.isPending ? "Saving…" : "Save changes"}</Button>{isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}<Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button></div>
      </form>
    </div>
  );
}
