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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ForbiddenCard } from "@/components/guards";
import { ErrorState } from "@/components/shared/error-state";
import { useSession } from "@/features/auth/session-context";
import { getSystemSettings, updateSystemSection } from "@/features/admin/settings-api";
import { handleSettingsError, handleSettingsInvalid } from "@/features/admin/settings-components/handle-error";
import { qk } from "@/lib/api/queryKeys";

const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Invalid amount");
const schema = z.object({
  vat_enabled: z.boolean(),
  default_tax_rate: z.string().regex(/^\d{1,5}(\.\d{1,2})?$/, "Invalid rate"),
  tax_mode: z.enum(["inclusive", "exclusive"]),
  min_order_amount: money,
  max_order_amount: money,
  free_shipping_threshold: money,
  allow_guest_checkout: z.boolean(),
  allow_customer_registration: z.boolean(),
  allow_multiple_addresses: z.boolean(),
  order_cancellation_window_hours: z.coerce.number().int().min(0).max(168),
  return_window_days: z.coerce.number().int().min(0).max(90),
  refund_window_days: z.coerce.number().int().min(0).max(90),
  low_stock_threshold: z.coerce.number().int().min(1).max(10000),
}).superRefine((d, ctx) => {
  if (Number(d.min_order_amount) > Number(d.max_order_amount)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["max_order_amount"], message: "max must be >= min" });
});
type FormValues = z.infer<typeof schema>;
export default function CommerceSettingsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <CommerceForm />;
}
function CommerceForm() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.admin.settings("commerce"),
    queryFn: async () => {
      const data = await getSystemSettings("commerce") as unknown as { value: FormValues };
      const v = (data as unknown as { value: FormValues })?.value ?? (data as unknown as FormValues);
      return v as FormValues;
    },
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: { vat_enabled: false, default_tax_rate: "0.00", tax_mode: "exclusive", min_order_amount: "0.00", max_order_amount: "999999.00", free_shipping_threshold: "500.00", allow_guest_checkout: true, allow_customer_registration: true, allow_multiple_addresses: true, order_cancellation_window_hours: 24, return_window_days: 14, refund_window_days: 14, low_stock_threshold: 5 },
  });
  useEffect(() => { if (query.data) form.reset(query.data as FormValues); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateSystemSection("commerce", v),
    onSuccess: async () => { toast.success("Commerce settings saved"); await qc.invalidateQueries({ queryKey: qk.admin.settings("commerce") }); },
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const isDirty = form.formState.isDirty;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Commerce Settings</h1><p className="mt-1 text-sm text-muted-foreground">Tax, order limits, guest/member rules, and inventory thresholds.</p></div>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleSettingsInvalid)} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none"><CardHeader><CardTitle>Tax</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3"><div><p className="text-sm font-medium">VAT enabled</p></div><Switch checked={form.watch("vat_enabled")} onCheckedChange={(v) => form.setValue("vat_enabled", v, { shouldDirty: true })} /></div>
          <div className="grid gap-2"><Label>Default tax rate (%)</Label><Input {...form.register("default_tax_rate")} />{form.formState.errors.default_tax_rate && <p className="text-sm text-destructive">{form.formState.errors.default_tax_rate.message}</p>}</div>
          <div className="grid gap-2"><Label>Tax mode</Label><Select value={form.watch("tax_mode")} onValueChange={(v) => form.setValue("tax_mode", v as FormValues["tax_mode"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inclusive">Inclusive</SelectItem><SelectItem value="exclusive">Exclusive</SelectItem></SelectContent></Select></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Order limits</CardTitle><CardDescription>Free-shipping threshold should be between min and max.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2"><Label>Min order</Label><Input {...form.register("min_order_amount")} />{form.formState.errors.min_order_amount && <p className="text-sm text-destructive">{form.formState.errors.min_order_amount.message}</p>}</div>
          <div className="grid gap-2"><Label>Max order</Label><Input {...form.register("max_order_amount")} />{form.formState.errors.max_order_amount && <p className="text-sm text-destructive">{form.formState.errors.max_order_amount.message}</p>}</div>
          <div className="grid gap-2"><Label>Free-shipping threshold</Label><Input {...form.register("free_shipping_threshold")} /></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Customer commerce</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Guest checkout</span><Switch checked={form.watch("allow_guest_checkout")} onCheckedChange={(v) => form.setValue("allow_guest_checkout", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Customer registration</span><Switch checked={form.watch("allow_customer_registration")} onCheckedChange={(v) => form.setValue("allow_customer_registration", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Multiple addresses</span><Switch checked={form.watch("allow_multiple_addresses")} onCheckedChange={(v) => form.setValue("allow_multiple_addresses", v, { shouldDirty: true })} /></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Order rules & inventory</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2"><Label>Cancellation window (h)</Label><Input type="number" {...form.register("order_cancellation_window_hours")} /></div>
          <div className="grid gap-2"><Label>Return window (days)</Label><Input type="number" {...form.register("return_window_days")} /></div>
          <div className="grid gap-2"><Label>Refund window (days)</Label><Input type="number" {...form.register("refund_window_days")} /></div>
          <div className="grid gap-2"><Label>Low-stock threshold</Label><Input type="number" {...form.register("low_stock_threshold")} /></div>
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">{mutation.isPending ? "Saving…" : "Save changes"}</Button>{isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}<Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button></div>
      </form>
    </div>
  );
}
