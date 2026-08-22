"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { otpSchema, type OtpValues } from "@/features/auth/schemas";
import { useRateLimit } from "./use-rate-limit";
import type { ApiError } from "@/types/envelopes";

interface PhoneOtpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  onVerify: (otp: string) => Promise<void>;
  onRequestResend: () => Promise<void>;
}

function PhoneOtpForm({
  phoneNumber,
  onVerify,
  onRequestResend,
}: {
  phoneNumber: string;
  onVerify: (otp: string) => Promise<void>;
  onRequestResend: () => Promise<void>;
}) {
  const [rootError, setRootError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [resending, setResending] = useState(false);
  const { secondsLeft, start } = useRateLimit(60);

  const form = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  async function handleVerify(values: OtpValues) {
    setRootError(null);
    try {
      await onVerify(values.otp);
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 422) {
        form.setError("otp", {
          message: err.message || "That code is not correct.",
        });
      } else if (err.status === 410) {
        setExpired(true);
      } else if (err.status === 429) {
        start(60);
        setRootError(
          err.message ||
            "Too many attempts. Please wait before trying another code.",
        );
      } else {
        setRootError(err.message || "Could not verify the code.");
      }
    }
  }

  async function handleResend() {
    setRootError(null);
    setResending(true);
    try {
      await onRequestResend();
      setExpired(false);
      form.reset();
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 429) {
        start(60);
        setRootError(
          err.message ||
            "Too many attempts. Please wait before requesting again.",
        );
      } else {
        setRootError(err.message || "Could not send a new code.");
      }
    } finally {
      setResending(false);
    }
  }

  const locked = secondsLeft > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Verify your new number</DialogTitle>
        <DialogDescription>
          Enter the code we sent by SMS to {phoneNumber}. In development the
          code is printed in the backend server logs.
        </DialogDescription>
      </DialogHeader>
      {expired ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-sm text-destructive">
            This code has expired. Request a new one and try again.
          </p>
          <Button
            onClick={() => void handleResend()}
            disabled={resending || locked}
          >
            {resending ? "Sending…" : "Send a new code"}
          </Button>
          {locked ? (
            <p className="text-xs text-muted-foreground">
              You can request a new code in {secondsLeft}s.
            </p>
          ) : null}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(handleVerify)} noValidate>
          <div className="flex flex-col gap-4">
            {rootError ? (
              <p role="alert" className="text-sm text-destructive">
                {rootError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone-otp">Verification code</Label>
              <Input
                id="phone-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={8}
                {...form.register("otp")}
              />
              {form.formState.errors.otp ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.otp.message}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || locked}
            >
              {form.formState.isSubmitting
                ? "Verifying…"
                : locked
                  ? `Retry in ${secondsLeft}s`
                  : "Verify number"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={resending || locked}
              onClick={() => void handleResend()}
            >
              {resending ? "Sending…" : "Didn't get it? Send a new code"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

export function PhoneOtpDialog({
  open,
  onOpenChange,
  phoneNumber,
  onVerify,
  onRequestResend,
}: PhoneOtpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {open ? (
          <PhoneOtpForm
            phoneNumber={phoneNumber}
            onVerify={onVerify}
            onRequestResend={onRequestResend}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
