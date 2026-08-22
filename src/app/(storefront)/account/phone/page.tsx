"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import {
  changePhoneSchema,
  type ChangePhoneValues,
} from "@/features/auth/schemas";
import {
  requestPhoneChange,
  verifyPhoneChange,
} from "@/features/account/api";
import { useProfile } from "@/features/account/hooks";
import { PhoneOtpDialog } from "@/features/account/components/phone-otp-dialog";
import { useRateLimit } from "@/features/account/components/use-rate-limit";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError } from "@/types/envelopes";

export default function AccountPhonePage() {
  const profileQuery = useProfile();
  const queryClient = useQueryClient();
  const [rootError, setRootError] = useState<string | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<ChangePhoneValues | null>(null);
  const { secondsLeft, start } = useRateLimit(60);

  const form = useForm<ChangePhoneValues>({
    resolver: zodResolver(changePhoneSchema),
    defaultValues: { new_phone_number: "", password: "" },
  });

  async function onSubmit(values: ChangePhoneValues) {
    setRootError(null);
    try {
      await requestPhoneChange(values);
      setPendingValues(values);
      setOtpOpen(true);
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 409) {
        form.setError("new_phone_number", {
          message:
            err.message || "That phone number is already registered.",
        });
      } else if (err.status === 422) {
        form.setError("new_phone_number", {
          message: err.message || "Enter a valid phone number in E.164 format.",
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
        setRootError(err.message || "Could not send the verification code.");
      }
    }
  }

  async function handleVerify(otp: string) {
    const result = await verifyPhoneChange({ otp });
    toast.success(result.message || "Phone number updated.");
    setOtpOpen(false);
    setPendingValues(null);
    form.reset();
    await queryClient.invalidateQueries({ queryKey: qk.me });
    await queryClient.invalidateQueries({ queryKey: qk.session });
  }

  async function handleResend() {
    if (!pendingValues) {
      throw new Error("No pending phone change.");
    }
    await requestPhoneChange(pendingValues);
    toast.success("A new code has been sent.");
  }

  const errors = form.formState.errors;
  const locked = secondsLeft > 0;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Change phone number</CardTitle>
        <CardDescription>
          Current number: {profileQuery.data?.phone_number || "Not set"}
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
              <Label htmlFor="new_phone_number">New phone number</Label>
              <Input
                id="new_phone_number"
                type="tel"
                placeholder="+15551234567"
                autoComplete="tel"
                {...form.register("new_phone_number")}
              />
              {errors.new_phone_number ? (
                <p className="text-sm text-destructive">
                  {errors.new_phone_number.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone-password">Current password</Label>
              <Input
                id="phone-password"
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
            <p className="text-xs text-muted-foreground">
              We&apos;ll text you a one-time code to confirm the new number. In
              development the code is printed in the backend server logs.
            </p>
            <div>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || locked}
              >
                {locked
                  ? `Retry in ${secondsLeft}s`
                  : form.formState.isSubmitting
                    ? "Sending…"
                    : "Send verification code"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
      <PhoneOtpDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        phoneNumber={pendingValues?.new_phone_number ?? ""}
        onVerify={handleVerify}
        onRequestResend={handleResend}
      />
    </Card>
  );
}
