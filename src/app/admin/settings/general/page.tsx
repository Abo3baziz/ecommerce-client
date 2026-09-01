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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ForbiddenCard } from "@/components/guards";
import { ErrorState } from "@/components/shared/error-state";
import { useSession } from "@/features/auth/session-context";
import { getSystemSettings, updateSystemSection } from "@/features/admin/settings-api";
import { qk } from "@/lib/api/queryKeys";
import { handleSettingsError, handleSettingsInvalid } from "@/features/admin/settings-components/handle-error";

const schema = z.object({
  store_name: z.string().trim().min(1).max(100),
  store_description: z.string().trim().max(5000).optional().or(z.literal("")),
  contact_email: z.string().trim().email(),
  support_phone: z.string().trim().max(20).optional().or(z.literal("")),
  store_address: z.string().trim().max(500).optional().or(z.literal("")),
  default_language: z.enum(["en", "ar", "fr", "de", "es", "tr"]),
  default_currency: z.enum(["USD", "EUR", "GBP", "EGP", "SAR", "AED"]),
  timezone: z.string().trim().min(1).max(100),
  date_format: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]),
  maintenance_mode: z.boolean(),
  store_active: z.boolean(),
  logo_url: z.string().trim().url().optional().or(z.literal("")).or(z.null()),
});
type FormValues = z.infer<typeof schema>;

export default function GeneralSettingsPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="System settings are only available to the platform super admin." />;
  return <GeneralForm />;
}

function GeneralForm() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.admin.settings("general"),
    queryFn: async () => {
      const data = await getSystemSettings("general") as unknown as { value: FormValues; updated_at?: string };
      // Backend returns {key,value,updated_at} or {value:...}
      if ((data as unknown as { value: unknown })?.value) return (data as unknown as { value: FormValues }).value;
      return (data as unknown as FormValues);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: {
      store_name: "",
      store_description: "",
      contact_email: "",
      support_phone: "",
      store_address: "",
      default_language: "en",
      default_currency: "USD",
      timezone: "UTC",
      date_format: "YYYY-MM-DD",
      maintenance_mode: false,
      store_active: true,
      logo_url: "",
    },
  });

  useEffect(() => {
    if (query.data) {
      form.reset({
        store_name: (query.data as FormValues).store_name ?? "",
        store_description: (query.data as FormValues).store_description ?? "",
        contact_email: (query.data as FormValues).contact_email ?? "",
        support_phone: (query.data as FormValues).support_phone ?? "",
        store_address: (query.data as FormValues).store_address ?? "",
        default_language: (query.data as FormValues).default_language ?? "en",
        default_currency: (query.data as FormValues).default_currency ?? "USD",
        timezone: (query.data as FormValues).timezone ?? "UTC",
        date_format: (query.data as FormValues).date_format ?? "YYYY-MM-DD",
        maintenance_mode: (query.data as FormValues).maintenance_mode ?? false,
        store_active: (query.data as FormValues).store_active ?? true,
        logo_url: (query.data as FormValues).logo_url ?? "",
      });
    }
  }, [query.data, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateSystemSection("general", values),
    onSuccess: async () => {
      toast.success("General settings saved");
      await qc.invalidateQueries({ queryKey: qk.admin.settings("general") });
    },
    onError: (e: unknown) => handleSettingsError<FormValues>(e, form.setError),
  });

  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values), handleSettingsInvalid);
  const isDirty = form.formState.isDirty;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">General Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global store configuration — name, contact, locale, and availability.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <Card className="rounded-none">
          <CardHeader><CardTitle>Store identity</CardTitle><CardDescription>Name, description and logo (plan).</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="store_name">Store name</Label>
              <Input id="store_name" {...form.register("store_name")} />
              {form.formState.errors.store_name && <p className="text-sm text-destructive">{form.formState.errors.store_name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="store_description">Store description</Label>
              <Textarea id="store_description" {...form.register("store_description")} rows={3} />
              {form.formState.errors.store_description && <p className="text-sm text-destructive">{form.formState.errors.store_description.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logo_url">Store logo URL (plan only)</Label>
              <Input id="logo_url" placeholder="https://ik.imagekit.io/.../logo.png" {...form.register("logo_url")} />
              <p className="text-xs text-muted-foreground">Upload via ImageKit widget — coming soon. Leave empty to keep default.</p>
              {form.formState.errors.logo_url && <p className="text-sm text-destructive">{form.formState.errors.logo_url.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="contact_email">Contact email</Label>
              <Input id="contact_email" type="email" {...form.register("contact_email")} />
              {form.formState.errors.contact_email && <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support_phone">Support phone</Label>
              <Input id="support_phone" {...form.register("support_phone")} placeholder="+201234567890" />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="store_address">Store address</Label>
              <Textarea id="store_address" {...form.register("store_address")} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader><CardTitle>Locale</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label>Default language</Label>
              <Select value={form.watch("default_language")} onValueChange={(v) => form.setValue("default_language", v as FormValues["default_language"], { shouldDirty: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="ar">Arabic (ar)</SelectItem>
                  <SelectItem value="fr">French (fr)</SelectItem>
                  <SelectItem value="de">German (de)</SelectItem>
                  <SelectItem value="es">Spanish (es)</SelectItem>
                  <SelectItem value="tr">Turkish (tr)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Default currency</Label>
              <Select value={form.watch("default_currency")} onValueChange={(v) => form.setValue("default_currency", v as FormValues["default_currency"], { shouldDirty: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD","EUR","GBP","EGP","SAR","AED"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Time zone</Label>
              <Input id="timezone" {...form.register("timezone")} placeholder="UTC" />
            </div>
            <div className="grid gap-2">
              <Label>Date/time format</Label>
              <Select value={form.watch("date_format")} onValueChange={(v) => form.setValue("date_format", v as FormValues["date_format"], { shouldDirty: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-destructive/40">
          <CardHeader><CardTitle>Availability</CardTitle><CardDescription>Disabling the store or enabling maintenance shows a 503 maintenance page for customers. Admin console remains accessible for SUPER_ADMIN.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div><p className="text-sm font-medium">Store active</p><p className="text-xs text-muted-foreground">When off, storefront is unavailable.</p></div>
              <Switch checked={form.watch("store_active")} onCheckedChange={(v) => form.setValue("store_active", v, { shouldDirty: true })} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <div><p className="text-sm font-medium text-destructive">Maintenance mode</p><p className="text-xs text-muted-foreground">When on, customers see “Store under maintenance”.</p></div>
              <Switch checked={form.watch("maintenance_mode")} onCheckedChange={(v) => form.setValue("maintenance_mode", v, { shouldDirty: true })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={mutation.isPending || !isDirty} className="rounded-none">
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
          {isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          <Button type="button" variant="outline" className="rounded-none" onClick={() => form.reset()} disabled={!isDirty}>Reset</Button>
        </div>
      </form>
    </div>
  );
}
