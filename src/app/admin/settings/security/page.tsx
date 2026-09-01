"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ForbiddenCard } from "@/components/guards";
import { ErrorState } from "@/components/shared/error-state";
import { useSession } from "@/features/auth/session-context";
import { getSystemSettings, updateSystemSection } from "@/features/admin/settings-api";
import { handleSettingsError, handleSettingsInvalid } from "@/features/admin/settings-components/handle-error";
import { qk } from "@/lib/api/queryKeys";

const schema = z.object({
  session_timeout_ms: z.coerce.number().int().min(60000).max(2592000000),
  admin_session_duration_ms: z.coerce.number().int().min(60000).max(2592000000),
  max_login_attempts: z.coerce.number().int().min(3).max(20),
  lockout_duration_ms: z.coerce.number().int().min(60000).max(3600000),
  rate_limit: z.object({ window_ms: z.coerce.number().int().min(1000).max(3600000), max: z.coerce.number().int().min(10).max(1000) }),
  password_policy: z.object({ min_length: z.coerce.number().int().min(8).max(128), require_upper: z.boolean(), require_lower: z.boolean(), require_digit: z.boolean(), require_special: z.boolean() }),
  require_email_verification: z.boolean(),
  require_2fa_admins: z.boolean(),
  login_notifications: z.boolean(),
  suspicious_login_alerts: z.boolean(),
});
type FormValues = z.infer<typeof schema>;
function securityStatus(v: FormValues): "hardened" | "partial" | "weak" {
  const enabled = [v.require_2fa_admins, v.require_email_verification, v.login_notifications, v.suspicious_login_alerts, v.password_policy.require_upper && v.password_policy.require_lower && v.password_policy.require_digit && v.password_policy.require_special].filter(Boolean).length;
  if (enabled >= 4) return "hardened";
  if (enabled >= 2) return "partial";
  return "weak";
}
export default function SecuritySettingsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <SecurityForm />;
}
function SecurityForm() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.admin.settings("security"),
    queryFn: async () => {
      const data = await getSystemSettings("security") as unknown as { value: FormValues };
      const v = (data as unknown as { value: FormValues })?.value ?? (data as unknown as FormValues);
      return v as FormValues;
    },
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: { session_timeout_ms: 1209600000, admin_session_duration_ms: 43200000, max_login_attempts: 5, lockout_duration_ms: 900000, rate_limit: { window_ms: 60000, max: 100 }, password_policy: { min_length: 8, require_upper: true, require_lower: true, require_digit: true, require_special: true }, require_email_verification: false, require_2fa_admins: false, login_notifications: false, suspicious_login_alerts: true },
  });
  useEffect(() => { if (query.data) form.reset(query.data as FormValues); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateSystemSection("security", v),
    onSuccess: async () => { toast.success("Security settings saved"); await qc.invalidateQueries({ queryKey: qk.admin.settings("security") }); },
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const isDirty = form.formState.isDirty;
  const status = securityStatus(form.watch());
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Security</h1><p className="mt-1 text-sm text-muted-foreground">Session, rate limiting, password policy and alerts.</p></div>
      <Card className="rounded-none"><CardHeader><CardTitle>Security overview</CardTitle><CardDescription>Computed from enabled protections.</CardDescription></CardHeader><CardContent className="flex items-center gap-3">
        <Badge variant={status === "hardened" ? "default" : status === "partial" ? "secondary" : "destructive"} className="rounded-none uppercase tracking-wide">{status}</Badge>
        <span className="text-sm text-muted-foreground">2FA admins: {form.watch("require_2fa_admins") ? "on" : "off"} · Email verification: {form.watch("require_email_verification") ? "on" : "off"} · Login alerts: {form.watch("login_notifications") ? "on" : "off"}</span>
      </CardContent></Card>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleSettingsInvalid)} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none"><CardHeader><CardTitle>Session & lockout</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2"><Label>Session timeout (ms)</Label><Input type="number" {...form.register("session_timeout_ms")} /></div>
          <div className="grid gap-2"><Label>Admin session (ms)</Label><Input type="number" {...form.register("admin_session_duration_ms")} /></div>
          <div className="grid gap-2"><Label>Max login attempts</Label><Input type="number" {...form.register("max_login_attempts")} /></div>
          <div className="grid gap-2"><Label>Lockout (ms)</Label><Input type="number" {...form.register("lockout_duration_ms")} /></div>
          <div className="grid gap-2"><Label>Rate window (ms)</Label><Input type="number" {...form.register("rate_limit.window_ms")} /></div>
          <div className="grid gap-2"><Label>Rate max</Label><Input type="number" {...form.register("rate_limit.max")} /></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Password policy</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2"><Label>Min length</Label><Input type="number" {...form.register("password_policy.min_length")} /></div>
          {(["require_upper", "require_lower", "require_digit", "require_special"] as const).map((k) => (
            <div key={k} className="flex items-center justify-between rounded-md border p-3"><span className="text-sm capitalize">{k.replace("require_", "")}</span><Switch checked={(form.watch("password_policy") as FormValues["password_policy"])[k]} onCheckedChange={(v) => form.setValue(`password_policy.${k}` as never, v as never, { shouldDirty: true })} /></div>
          ))}
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Protections</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Require email verification</span><Switch checked={form.watch("require_email_verification")} onCheckedChange={(v) => form.setValue("require_email_verification", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3"><span className="text-sm font-medium">Require 2FA for admins</span><Switch checked={form.watch("require_2fa_admins")} onCheckedChange={(v) => form.setValue("require_2fa_admins", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Login notifications</span><Switch checked={form.watch("login_notifications")} onCheckedChange={(v) => form.setValue("login_notifications", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Suspicious alerts</span><Switch checked={form.watch("suspicious_login_alerts")} onCheckedChange={(v) => form.setValue("suspicious_login_alerts", v, { shouldDirty: true })} /></div>
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">{mutation.isPending ? "Saving…" : "Save changes"}</Button>{isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}<Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button></div>
      </form>
    </div>
  );
}
