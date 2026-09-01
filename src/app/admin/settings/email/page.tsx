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
import { getSystemSettings, updateSystemSection, testEmail } from "@/features/admin/settings-api";
import { handleSettingsError, handleSettingsInvalid } from "@/features/admin/settings-components/handle-error";
import { qk } from "@/lib/api/queryKeys";

const schema = z.object({
  sender_name: z.string().min(1).max(100),
  sender_email: z.string().email(),
  provider: z.enum(["resend", "smtp", "ses"]),
  smtp_password: z.string().optional().or(z.literal("__REDACTED__")).or(z.literal("")),
  notifications: z.object({
    order_placed: z.boolean(),
    order_confirmed: z.boolean(),
    order_shipped: z.boolean(),
    order_delivered: z.boolean(),
    order_cancelled: z.boolean(),
    refund_issued: z.boolean(),
    password_reset: z.boolean(),
    new_registration: z.boolean(),
    low_inventory: z.boolean(),
    new_review: z.boolean(),
    admin_security_alert: z.boolean(),
  }),
});
type FormValues = z.infer<typeof schema>;
export default function EmailSettingsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <EmailForm />;
}
function EmailForm() {
  const qc = useQueryClient();
  const [testTo, setTestTo] = useState("");
  const [showPass, setShowPass] = useState(false);
  const query = useQuery({
    queryKey: qk.admin.settings("email"),
    queryFn: async () => {
      const data = await getSystemSettings("email") as unknown as { value: FormValues };
      const v = (data as unknown as { value: FormValues })?.value ?? (data as unknown as FormValues);
      return v as FormValues;
    },
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: { sender_name: "Ecommerce Store", sender_email: "no-reply@example.com", provider: "resend", smtp_password: "", notifications: { order_placed: true, order_confirmed: true, order_shipped: true, order_delivered: true, order_cancelled: true, refund_issued: true, password_reset: true, new_registration: true, low_inventory: true, new_review: true, admin_security_alert: true } },
  });
  useEffect(() => { if (query.data) form.reset({ ...query.data, smtp_password: (query.data as FormValues).smtp_password ?? "" }); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateSystemSection("email", v),
    onSuccess: async () => { toast.success("Email settings saved"); await qc.invalidateQueries({ queryKey: qk.admin.settings("email") }); },
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  const testMutation = useMutation({
    mutationFn: () => testEmail(testTo),
    onSuccess: () => toast.success(`Test email sent to ${testTo}`),
    onError: (e: unknown) => handleSettingsError(e, (form as unknown as { setError: never }).setError),
  });
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const isDirty = form.formState.isDirty;
  const notifs = form.watch("notifications");
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Email & Notifications</h1><p className="mt-1 text-sm text-muted-foreground">Sender, provider, and 11 notification toggles.</p></div>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleSettingsInvalid)} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none"><CardHeader><CardTitle>Sender</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Sender name</Label><Input {...form.register("sender_name")} />{form.formState.errors.sender_name && <p className="text-sm text-destructive">{form.formState.errors.sender_name.message}</p>}</div>
          <div className="grid gap-2"><Label>Sender email</Label><Input type="email" {...form.register("sender_email")} />{form.formState.errors.sender_email && <p className="text-sm text-destructive">{form.formState.errors.sender_email.message}</p>}</div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Provider</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Provider</Label><Select value={form.watch("provider")} onValueChange={(v) => form.setValue("provider", v as FormValues["provider"], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="resend">Resend</SelectItem><SelectItem value="smtp">SMTP</SelectItem><SelectItem value="ses">SES</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>SMTP password (masked)</Label><div className="flex gap-2"><Input type={showPass ? "text" : "password"} placeholder={form.watch("smtp_password") === "[redacted]" ? "[redacted]" : "••••"} {...form.register("smtp_password")} /><Button type="button" variant="outline" className="rounded-none" onClick={() => setShowPass((s) => !s)}>{showPass ? "Hide" : "Show"}</Button></div><p className="text-xs text-muted-foreground">Leave [redacted] to preserve.</p></div>
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Toggle each email trigger.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(notifs).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between rounded-md border p-3"><span className="text-sm capitalize">{key.replaceAll("_", " ")}</span><Switch checked={val as boolean} onCheckedChange={(v) => form.setValue(`notifications.${key}` as never, v as never, { shouldDirty: true })} /></div>
          ))}
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle>Test email</CardTitle></CardHeader><CardContent className="flex gap-2">
          <Input placeholder="test@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="max-w-sm" />
          <Button type="button" variant="outline" className="rounded-none" onClick={() => testMutation.mutate()} disabled={testMutation.isPending || !testTo}> {testMutation.isPending ? "Sending…" : "Send test"}</Button>
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">{mutation.isPending ? "Saving…" : "Save changes"}</Button>{isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}<Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button></div>
      </form>
    </div>
  );
}
