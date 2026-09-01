"use client";
import { useEffect, useState } from "react";
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

const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
const schema = z.object({
  enabled_methods: z.array(z.enum(["cod", "card"])),
  cod_enabled: z.boolean(),
  card_enabled: z.boolean(),
  provider: z.enum(["manual", "stripe", "paymob"]),
  provider_secret_key: z.string().optional().or(z.literal("__REDACTED__")).or(z.literal("")),
  webhook_secret: z.string().optional().or(z.literal("__REDACTED__")).or(z.literal("")),
  test_mode: z.boolean(),
  currency_restrictions: z.array(z.string()),
  payment_failure_behavior: z.enum(["retry", "hold", "fail"]),
  min_transaction: money,
  max_transaction: money,
}).superRefine((d, ctx) => { if (Number(d.min_transaction) > Number(d.max_transaction)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["max_transaction"], message: "max must be >= min" }); });
type FormValues = z.infer<typeof schema>;
export default function PaymentSettingsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <PaymentForm />;
}
function PaymentForm() {
  const qc = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const query = useQuery({
    queryKey: qk.admin.settings("payment"),
    queryFn: async () => {
      const data = await getSystemSettings("payment") as unknown as { value: FormValues };
      const v = (data as unknown as { value: FormValues })?.value ?? (data as unknown as FormValues);
      return v as FormValues;
    },
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: { enabled_methods: ["cod", "card"], cod_enabled: true, card_enabled: true, provider: "manual", provider_secret_key: "", webhook_secret: "", test_mode: true, currency_restrictions: [], payment_failure_behavior: "fail", min_transaction: "1.00", max_transaction: "99999.00" },
  });
  useEffect(() => {
    if (query.data) {
      const d = query.data as FormValues;
      form.reset({
        enabled_methods: d.enabled_methods ?? ["cod", "card"],
        cod_enabled: d.cod_enabled ?? true,
        card_enabled: d.card_enabled ?? true,
        provider: d.provider ?? "manual",
        provider_secret_key: d.provider_secret_key ?? "",
        webhook_secret: d.webhook_secret ?? "",
        test_mode: d.test_mode ?? true,
        currency_restrictions: d.currency_restrictions ?? [],
        payment_failure_behavior: d.payment_failure_behavior ?? "fail",
        min_transaction: d.min_transaction ?? "1.00",
        max_transaction: d.max_transaction ?? "99999.00",
      });
    }
  }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateSystemSection("payment", v),
    onSuccess: async () => { toast.success("Payment settings saved"); await qc.invalidateQueries({ queryKey: qk.admin.settings("payment") }); },
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const isDirty = form.formState.isDirty;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Payment Settings</h1><p className="mt-1 text-sm text-muted-foreground">Methods, provider, test/live, limits. Secrets are masked and encrypted at rest.</p></div>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleSettingsInvalid)} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none"><CardHeader><CardTitle>Methods</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Cash on delivery</span><Switch checked={form.watch("cod_enabled")} onCheckedChange={(v) => form.setValue("cod_enabled", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Card payments</span><Switch checked={form.watch("card_enabled")} onCheckedChange={(v) => form.setValue("card_enabled", v, { shouldDirty: true })} /></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Provider</CardTitle><CardDescription>Secrets stored encrypted, shown as [redacted]. Save with masked value to preserve.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Provider</Label><Select value={form.watch("provider")} onValueChange={(v) => form.setValue("provider", v as FormValues["provider"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="stripe">Stripe</SelectItem><SelectItem value="paymob">Paymob</SelectItem></SelectContent></Select></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Test mode</span><Switch checked={form.watch("test_mode")} onCheckedChange={(v) => form.setValue("test_mode", v, { shouldDirty: true })} /></div>
          <div className="grid gap-2"><Label>Provider secret key</Label><div className="flex gap-2"><Input type={showSecret ? "text" : "password"} placeholder={form.watch("provider_secret_key") === "[redacted]" ? "[redacted]" : "sk_..."} {...form.register("provider_secret_key")} /><Button type="button" variant="outline" className="rounded-none" onClick={() => setShowSecret((s) => !s)}>{showSecret ? "Hide" : "Show"}</Button></div><p className="text-xs text-muted-foreground">Leave [redacted] to keep existing.</p></div>
          <div className="grid gap-2"><Label>Webhook secret</Label><div className="flex gap-2"><Input type={showWebhook ? "text" : "password"} placeholder={form.watch("webhook_secret") === "[redacted]" ? "[redacted]" : "whsec_..."} {...form.register("webhook_secret")} /><Button type="button" variant="outline" className="rounded-none" onClick={() => setShowWebhook((s) => !s)}>{showWebhook ? "Hide" : "Show"}</Button></div></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Limits & behavior</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2"><Label>Min transaction</Label><Input {...form.register("min_transaction")} />{form.formState.errors.min_transaction && <p className="text-sm text-destructive">{form.formState.errors.min_transaction.message}</p>}</div>
          <div className="grid gap-2"><Label>Max transaction</Label><Input {...form.register("max_transaction")} />{form.formState.errors.max_transaction && <p className="text-sm text-destructive">{form.formState.errors.max_transaction.message}</p>}</div>
          <div className="grid gap-2"><Label>Failure behavior</Label><Select value={form.watch("payment_failure_behavior")} onValueChange={(v) => form.setValue("payment_failure_behavior", v as FormValues["payment_failure_behavior"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="retry">Retry</SelectItem><SelectItem value="hold">Hold</SelectItem><SelectItem value="fail">Fail</SelectItem></SelectContent></Select></div>
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">{mutation.isPending ? "Saving…" : "Save changes"}</Button>{isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}<Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button></div>
      </form>
    </div>
  );
}
