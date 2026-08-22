"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeEmailSchema,
  type ChangeEmailValues,
} from "@/features/auth/schemas";
import { requestEmailChange } from "@/features/account/api";
import { useProfile } from "@/features/account/hooks";
import { useRateLimit } from "@/features/account/components/use-rate-limit";
import type { ApiError } from "@/types/envelopes";

const PENDING_EMAIL_STORAGE_KEY = "account.pending-email-change";
const PENDING_EMAIL_EVENT = "pending-email-change";

function subscribeToPendingEmail(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PENDING_EMAIL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PENDING_EMAIL_EVENT, callback);
  };
}

function getPendingEmailSnapshot(): string | null {
  return window.localStorage.getItem(PENDING_EMAIL_STORAGE_KEY);
}

function getPendingEmailServerSnapshot(): string | null {
  return null;
}

function writePendingEmail(email: string) {
  try {
    window.localStorage.setItem(PENDING_EMAIL_STORAGE_KEY, email);
    window.dispatchEvent(new Event(PENDING_EMAIL_EVENT));
  } catch {
    return;
  }
}

function clearPendingEmail() {
  try {
    window.localStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
    window.dispatchEvent(new Event(PENDING_EMAIL_EVENT));
  } catch {
    return;
  }
}

function PendingBanner({ email }: { email: string }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
    >
      <p className="font-medium">Email change pending</p>
      <p className="text-muted-foreground">
        We sent a confirmation link to <strong>{email}</strong>. It expires
        after a while — opening it takes you to{" "}
        <code>/verify-email-change</code> to finalize the change. If it expired
        you can request a new one below.
      </p>
      <p className="text-xs text-muted-foreground">
        Heads up: changing your password or other credentials invalidates any
        pending email-change link.
      </p>
    </div>
  );
}

export default function AccountEmailPage() {
  const profileQuery = useProfile();
  const [rootError, setRootError] = useState<string | null>(null);
  const { secondsLeft, start } = useRateLimit(60);

  const form = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { new_email: "", password: "" },
  });

  const storedPendingEmail = useSyncExternalStore(
    subscribeToPendingEmail,
    getPendingEmailSnapshot,
    getPendingEmailServerSnapshot,
  );

  const currentEmail = profileQuery.data?.email;
  const pendingEmail =
    storedPendingEmail && storedPendingEmail !== currentEmail
      ? storedPendingEmail
      : null;

  useEffect(() => {
    if (storedPendingEmail && currentEmail === storedPendingEmail) {
      clearPendingEmail();
    }
  }, [storedPendingEmail, currentEmail]);

  async function onSubmit(values: ChangeEmailValues) {
    setRootError(null);
    try {
      await requestEmailChange(values);
      writePendingEmail(values.new_email);
      form.reset();
      toast.success(
        "Check your inbox — click the link to confirm your new email.",
      );
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 409) {
        form.setError("new_email", {
          message: err.message || "That email address is already in use.",
        });
      } else if (err.status === 422) {
        form.setError("new_email", {
          message: err.message || "Enter a valid email address.",
        });
      } else if (err.status === 429) {
        start(60);
        setRootError(
          err.message ||
            "Too many requests. Please wait a minute and try again.",
        );
      } else if (err.status === 401) {
        form.setError("password", {
          message: err.message || "Your password is incorrect.",
        });
      } else {
        setRootError(err.message || "Could not start the email change.");
      }
    }
  }

  const errors = form.formState.errors;
  const locked = secondsLeft > 0;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Change email</CardTitle>
          {profileQuery.data ? (
            profileQuery.data.email_verified ? (
              <Badge variant="secondary">Verified</Badge>
            ) : (
              <Badge variant="outline">Unverified</Badge>
            )
          ) : null}
        </div>
        <CardDescription>
          Current address: {currentEmail ?? "…"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {pendingEmail ? <PendingBanner email={pendingEmail} /> : null}
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-4">
            {rootError ? (
              <p role="alert" className="text-sm text-destructive">
                {rootError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="new_email">New email address</Label>
              <Input
                id="new_email"
                type="email"
                autoComplete="email"
                {...form.register("new_email")}
              />
              {errors.new_email ? (
                <p className="text-sm text-destructive">
                  {errors.new_email.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email-password">Current password</Label>
              <Input
                id="email-password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <div>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || locked}
              >
                {locked
                  ? `Retry in ${secondsLeft}s`
                  : form.formState.isSubmitting
                    ? "Sending…"
                    : pendingEmail
                      ? "Resend confirmation link"
                      : "Send confirmation link"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The change only applies after you open the emailed link and
              confirm it there.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
