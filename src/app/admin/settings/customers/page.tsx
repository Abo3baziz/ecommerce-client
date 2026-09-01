"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const schema = z.object({
  allow_registration: z.boolean(),
  require_email_verification: z.boolean(),
  require_phone_verification: z.boolean(),
  password_min_length: z.coerce.number().int().min(8).max(128),
  password_requirements: z.object({ upper: z.boolean(), lower: z.boolean(), digit: z.boolean(), special: z.boolean() }),
  session_duration_ms: z.coerce.number().int().min(60000).max(2592000000),
  max_active_sessions: z.coerce.number().int().min(1).max(10),
  allow_account_deletion: z.boolean(),
  allow_reviews: z.boolean(),
  review_moderation: z.enum(["auto", "manual"]),
  purchase_gated_reviews: z.boolean(),
});
type FormValues = z.infer<typeof schema>;
export default function CustomerSettingsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <CustomerForm />;
}
function CustomerForm() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.admin.settings("customer"),
    queryFn: async () => {
      const data = await getSystemSettings("customer") as unknown as { value: FormValues };
      const v = (data as unknown as { value: FormValues })?.value ?? (data as unknown as FormValues);
      return v as FormValues;
    },
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: { allow_registration: true, require_email_verification: false, require_phone_verification: false, password_min_length: 8, password_requirements: { upper: true, lower: true, digit: true, special: true }, session_duration_ms: 2592000000, max_active_sessions: 5, allow_account_deletion: true, allow_reviews: true, review_moderation: "auto", purchase_gated_reviews: false },
  });
  useEffect(() => { if (query.data) form.reset(query.data as FormValues); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateSystemSection("customer", v),
    onSuccess: async () => { toast.success("Customer settings saved"); await qc.invalidateQueries({ queryKey: qk.admin.settings("customer") }); },
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const isDirty = form.formState.isDirty;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Customer Settings</h1><p className="mt-1 text-sm text-muted-foreground">Registration, verification, passwords, sessions and reviews.</p></div>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleSettingsInvalid)} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none"><CardHeader><CardTitle>Registration & verification</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Allow registration</span><Switch checked={form.watch("allow_registration")} onCheckedChange={(v) => form.setValue("allow_registration", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Require email verification</span><Switch checked={form.watch("require_email_verification")} onCheckedChange={(v) => form.setValue("require_email_verification", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Require phone verification</span><Switch checked={form.watch("require_phone_verification")} onCheckedChange={(v) => form.setValue("require_phone_verification", v, { shouldDirty: true })} /></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Password</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2"><Label>Min length</Label><Input type="number" {...form.register("password_min_length")} /></div>
          {(["upper", "lower", "digit", "special"] as const).map((k) => (
            <div key={k} className="flex items-center justify-between rounded-md border p-3"><span className="text-sm capitalize">{k}</span><Switch checked={(form.watch("password_requirements") as FormValues["password_requirements"])[k]} onCheckedChange={(v) => form.setValue(`password_requirements.${k}` as never, v as never, { shouldDirty: true })} /></div>
          ))}
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Session & reviews</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2"><Label>Session duration (ms)</Label><Input type="number" {...form.register("session_duration_ms")} /></div>
          <div className="grid gap-2"><Label>Max sessions</Label><Input type="number" {...form.register("max_active_sessions")} /></div>
          <div className="grid gap-2"><Label>Review moderation</Label><Select value={form.watch("review_moderation")} onValueChange={(v) => form.setValue("review_moderation", v as FormValues["review_moderation"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent></Select></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Allow account deletion</span><Switch checked={form.watch("allow_account_deletion")} onCheckedChange={(v) => form.setValue("allow_account_deletion", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Allow reviews</span><Switch checked={form.watch("allow_reviews")} onCheckedChange={(v) => form.setValue("allow_reviews", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Purchase-gated reviews</span><Switch checked={form.watch("purchase_gated_reviews")} onCheckedChange={(v) => form.setValue("purchase_gated_reviews", v, { shouldDirty: true })} /></div>
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">{mutation.isPending ? "Saving…" : "Save changes"}</Button>{isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}<Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button></div>
      </form>
    </div>
  );
}
