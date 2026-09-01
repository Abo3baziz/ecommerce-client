"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
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
  invite_enabled: z.boolean(),
  require_2fa: z.boolean(),
  force_password_reset: z.boolean(),
  max_admins: z.coerce.number().int().min(1).max(100),
  last_login_tracking: z.boolean(),
  active_sessions_tracking: z.boolean(),
});
type FormValues = z.infer<typeof schema>;
export default function AdminPermissionsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <AdminForm />;
}
function AdminForm() {
  const qc = useQueryClient();
  const router = useRouter();
  const query = useQuery({
    queryKey: qk.admin.settings("admin_permissions"),
    queryFn: async () => {
      const data = await getSystemSettings("admin_permissions") as unknown as { value: FormValues };
      const v = (data as unknown as { value: FormValues })?.value ?? (data as unknown as FormValues);
      return v as FormValues;
    },
  });
  const form = useForm<FormValues>({ resolver: zodResolver(schema as never), defaultValues: { invite_enabled: true, require_2fa: false, force_password_reset: false, max_admins: 50, last_login_tracking: true, active_sessions_tracking: true } });
  useEffect(() => { if (query.data) form.reset(query.data as FormValues); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateSystemSection("admin_permissions", v),
    onSuccess: async () => { toast.success("Admin & Permissions saved"); await qc.invalidateQueries({ queryKey: qk.admin.settings("admin_permissions") }); },
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const isDirty = form.formState.isDirty;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Admin & Permissions</h1><p className="mt-1 text-sm text-muted-foreground">Roles, invite, session tracking and 2FA. See <a href="/admin/admins" className="underline">Admins list</a> for accounts.</p></div>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleSettingsInvalid)} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none"><CardHeader><CardTitle>General</CardTitle><CardDescription>SUPER_ADMIN only. Changes are audited.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Invite enabled</span><Switch checked={form.watch("invite_enabled")} onCheckedChange={(v) => form.setValue("invite_enabled", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Require 2FA</span><Switch checked={form.watch("require_2fa")} onCheckedChange={(v) => form.setValue("require_2fa", v, { shouldDirty: true })} /></div>
          <div className="grid gap-2"><Label>Max admins</Label><Input type="number" {...form.register("max_admins")} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Last login tracking</span><Switch checked={form.watch("last_login_tracking")} onCheckedChange={(v) => form.setValue("last_login_tracking", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Active sessions tracking</span><Switch checked={form.watch("active_sessions_tracking")} onCheckedChange={(v) => form.setValue("active_sessions_tracking", v, { shouldDirty: true })} /></div>
          <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 p-3"><span className="text-sm font-medium text-destructive">Force password reset</span><Switch checked={form.watch("force_password_reset")} onCheckedChange={(v) => form.setValue("force_password_reset", v, { shouldDirty: true })} /></div>
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">{mutation.isPending ? "Saving…" : "Save changes"}</Button>{isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}<Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button><Button type="button" variant="outline" className="rounded-none" onClick={() => router.push("/admin/admins")}>Manage Admins</Button></div>
      </form>
    </div>
  );
}
