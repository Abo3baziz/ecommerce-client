"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Info } from "lucide-react";
import { toast } from "sonner";
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
import { useSession } from "@/features/auth/session-context";
import { changePasswordSchema, type ChangePasswordValues } from "@/features/auth/schemas";
import { changePassword } from "@/features/account/api";
import { useRateLimit } from "@/features/account/components/use-rate-limit";
import type { ApiError } from "@/types/envelopes";

export default function AccountPasswordPage() {
  const { refreshSession } = useSession();
  const [rootError, setRootError] = useState<string | null>(null);
  const { secondsLeft, start } = useRateLimit(60);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: ChangePasswordValues) {
    setRootError(null);
    try {
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      form.reset();
      await refreshSession();
      toast.success(
        "Password updated. Other devices have been signed out.",
      );
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 401 && err.code === "INVALID_CURRENT_PASSWORD") {
        form.setError("current_password", {
          message: err.message || "Your current password is incorrect.",
        });
      } else if (err.status === 422) {
        form.setError("new_password", {
          message: err.message || "The new password does not meet the policy.",
        });
      } else if (err.status === 429) {
        start(60);
        setRootError(
          err.message ||
            "Too many attempts. Please wait a minute and try again.",
        );
      } else {
        setRootError(err.message || "Could not change your password.");
      }
    }
  }

  const locked = secondsLeft > 0;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Choose a strong password you have not used elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-4">
            {rootError ? (
              <p role="alert" className="text-sm text-destructive">
                {rootError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                {...form.register("current_password")}
              />
              {errors.current_password ? (
                <p className="text-sm text-destructive">
                  {errors.current_password.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                {...form.register("new_password")}
              />
              {errors.new_password ? (
                <p className="text-sm text-destructive">
                  {errors.new_password.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...form.register("confirm_password")}
              />
              {errors.confirm_password ? (
                <p className="text-sm text-destructive">
                  {errors.confirm_password.message}
                </p>
              ) : null}
            </div>
            <p className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Changing your password signs out all other sessions. This device
              stays signed in.
            </p>
            <div>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || locked}
              >
                {locked
                  ? `Retry in ${secondsLeft}s`
                  : form.formState.isSubmitting
                    ? "Updating…"
                    : "Update password"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
