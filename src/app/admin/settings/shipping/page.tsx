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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ForbiddenCard } from "@/components/guards";
import { ErrorState } from "@/components/shared/error-state";
import { useSession } from "@/features/auth/session-context";
import { getSystemSettings, updateSystemSection } from "@/features/admin/settings-api";
import { handleSettingsError, handleSettingsInvalid } from "@/features/admin/settings-components/handle-error";
import { qk } from "@/lib/api/queryKeys";

const rateSchema = z.object({ zone: z.string().min(1), weight_max: z.string().optional().or(z.literal("")), price: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/) });
const schema = z.object({
  enabled_methods: z.array(z.string()).default(["standard"]),
  zones: z.array(z.object({ name: z.string().min(1), countries: z.array(z.string()).default([]), regions: z.array(z.string()).default([]) })).default([]),
  rates: z.array(rateSchema).default([]),
  estimated_delivery: z.object({ min_days: z.coerce.number().int().min(0).max(60), max_days: z.coerce.number().int().min(0).max(60) }).default({ min_days: 3, max_days: 7 }),
  default_method: z.string().min(1).default("standard"),
});
type FormValues = z.infer<typeof schema>;
export default function ShippingSettingsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <ShippingForm />;
}
function ShippingForm() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.admin.settings("shipping"),
    queryFn: async () => {
      const data = await getSystemSettings("shipping") as unknown as { value: FormValues };
      const v = (data as unknown as { value: FormValues })?.value ?? (data as unknown as FormValues);
      return v as FormValues;
    },
  });
  const form = useForm<FormValues>({ resolver: zodResolver(schema as never), defaultValues: { enabled_methods: ["standard"], zones: [], rates: [], estimated_delivery: { min_days: 3, max_days: 7 }, default_method: "standard" } });
  useEffect(() => { if (query.data) form.reset(query.data as FormValues); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateSystemSection("shipping", v),
    onSuccess: async () => { toast.success("Shipping settings saved"); await qc.invalidateQueries({ queryKey: qk.admin.settings("shipping") }); },
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const isDirty = form.formState.isDirty;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Shipping Settings</h1><p className="mt-1 text-sm text-muted-foreground">Methods, zones, rates, and delivery estimates.</p></div>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleSettingsInvalid)} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none"><CardHeader><CardTitle>General</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Default method</Label><Input {...form.register("default_method")} /></div>
          <div className="grid gap-2"><Label>Enabled methods (comma separated)</Label><Input value={Array.isArray(form.watch("enabled_methods")) ? (form.watch("enabled_methods") as string[]).join(", ") : ""} onChange={(e) => form.setValue("enabled_methods", e.target.value.split(",").map((s) => s.trim()).filter(Boolean), { shouldDirty: true })} placeholder="standard, express" /></div>
          <div className="grid gap-2"><Label>Estimated min days</Label><Input type="number" {...form.register("estimated_delivery.min_days")} /></div>
          <div className="grid gap-2"><Label>Estimated max days</Label><Input type="number" {...form.register("estimated_delivery.max_days")} /></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Rates (simple editor)</CardTitle><CardDescription>JSON array of {`{zone, weight_max, price}`}. Advanced zone editor planned.</CardDescription></CardHeader><CardContent className="grid gap-2">
          <Label>Rates JSON</Label>
          <textarea className="min-h-32 w-full rounded-md border px-3 py-2 text-sm font-mono" value={JSON.stringify(form.watch("rates") ?? [], null, 2)} onChange={(e) => { try { const v = JSON.parse(e.target.value); form.setValue("rates", v, { shouldDirty: true }); } catch { /* ignore */ } }} />
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">{mutation.isPending ? "Saving…" : "Save changes"}</Button>{isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}<Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button></div>
      </form>
    </div>
  );
}
