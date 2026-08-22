"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completePasswordReset,
  requestPasswordReset,
  verifyOtpPasswordReset,
} from "@/features/auth/api";
import { passwordChecks } from "@/features/auth/schemas";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import type { ApiError } from "@/types/envelopes";
import { cn } from "@/lib/utils";

type Step = "email" | "code" | "password" | "done";

const STEPS: readonly Step[] = ["email", "code", "password", "done"] as const;

function parseStep(value: string | null): Step {
  return STEPS.includes(value as Step) ? (value as Step) : "email";
}

function ForgotPasswordFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();

  const step = parseStep(searchParams.get("step"));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  function goTo(next: Step) {
    updateParams({ step: next === "email" ? null : next });
  }

  function setStepAndClearErrors(next: Step) {
    setRootError(null);
    setNotice(null);
    goTo(next);
  }

  async function handleRequestEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setRootError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setRootError(null);
    try {
      await requestPasswordReset(email.trim());
      setCountdown(60);
      setNotice(null);
      goTo("code");
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 429) {
        // Still advance: the code from an earlier email may be usable; the
        // cooldown only blocks resending.
        setCountdown(60);
        setNotice(err.message || "Please wait before requesting another code.");
        goTo("code");
      } else {
        setRootError(err.message || "Could not send the reset email. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setRootError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    setRootError(null);
    try {
      const result = await verifyOtpPasswordReset(email.trim(), code);
      setResetToken(result.reset_token);
      goTo("password");
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 410) {
        setNotice("This code has expired or was locked. Request a new one.");
        setCode("");
        goTo("email");
      } else {
        setRootError(err.message || "Invalid code. Please try again.");
        setCode("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setSubmitting(true);
    setRootError(null);
    try {
      await requestPasswordReset(email.trim());
      setCountdown(60);
      setNotice("A new code is on its way — check your inbox.");
      setCode("");
    } catch (error) {
      const err = error as ApiError;
      setRootError(
        err.status === 429
          ? "Too many requests. Please wait a minute."
          : err.message || "Could not resend the code.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const policyPassed = passwordChecks.every((check) => check.test(newPassword));
  const passwordsMatch =
    confirmPassword !== "" && confirmPassword === newPassword;

  async function handleSetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!policyPassed || !passwordsMatch || resetToken === null) {
      return;
    }
    setSubmitting(true);
    setRootError(null);
    try {
      await completePasswordReset(resetToken, newPassword);
      setResetToken(null);
      setNotice(null);
      goTo("done");
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 410 || err.status === 404) {
        setNotice("This reset link expired. Start again to get a new code.");
        setResetToken(null);
        setNewPassword("");
        setConfirmPassword("");
        goTo("email");
      } else {
        setRootError(err.message || "Could not update the password. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot your password?</CardTitle>
        <CardDescription>
          {step === "email" && "We'll email you a 6-digit verification code."}
          {step === "code" && `Enter the code we sent to ${email}.`}
          {step === "password" && "Choose a new password for your account."}
          {step === "done" && "All set — your password has been updated."}
        </CardDescription>
      </CardHeader>

      {step === "email" ? (
        <form onSubmit={handleRequestEmail} noValidate>
          <CardContent className="flex flex-col gap-4">
            <ErrorNotice error={rootError} notice={notice} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </CardContent>
          <WizardFooter submitting={submitting} label="Send code">
            <Link
              href="/login"
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Back to sign in
            </Link>
          </WizardFooter>
        </form>
      ) : null}

      {step === "code" ? (
        <form onSubmit={handleVerifyCode} noValidate>
          <CardContent className="flex flex-col gap-4">
            <ErrorNotice error={rootError} notice={notice} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-code">Verification code</Label>
              <Input
                id="forgot-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="text-center font-mono text-lg tracking-[0.5em]"
                placeholder="••••••"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={submitting || countdown > 0}
              className="self-start text-sm underline underline-offset-4 disabled:opacity-60 disabled:no-underline"
            >
              {countdown > 0 ? `Resend available in ${countdown}s` : "Resend code"}
            </button>
          </CardContent>
          <WizardFooter submitting={submitting} label="Verify code">
            <button
              type="button"
              onClick={() => setStepAndClearErrors("email")}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Use a different email
            </button>
          </WizardFooter>
        </form>
      ) : null}

      {step === "password" ? (
        <form onSubmit={handleSetPassword} noValidate>
          <CardContent className="flex flex-col gap-4">
            <ErrorNotice error={rootError} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-new-password">New password</Label>
              <Input
                id="forgot-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {passwordChecks.map((check) => (
                  <li
                    key={check.label}
                    className={cn(
                      "text-xs",
                      check.test(newPassword)
                        ? "text-green-700 dark:text-green-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {check.test(newPassword) ? "✓" : "•"} {check.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-confirm-password">Confirm password</Label>
              <Input
                id="forgot-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword !== "" && !passwordsMatch ? (
                <p className="text-sm text-destructive">Passwords do not match.</p>
              ) : null}
            </div>
          </CardContent>
          <WizardFooter
            submitting={submitting}
            label="Update password"
            disabled={!policyPassed || !passwordsMatch}
          >
            <span />
          </WizardFooter>
        </form>
      ) : null}

      {step === "done" ? (
        <>
          <CardContent>
            <p
              role="status"
              className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            >
              Your password has been updated and other sessions were signed out.
              Sign in with your new password.
            </p>
          </CardContent>
          <CardFooter className="mt-6">
            <Button className="w-full" onClick={() => router.push("/login")}>
              Go to sign in
            </Button>
          </CardFooter>
        </>
      ) : null}
    </Card>
  );
}

function ErrorNotice({
  error,
  notice,
}: {
  error: string | null;
  notice?: string | null;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}
    </>
  );
}

function WizardFooter({
  submitting,
  label,
  disabled = false,
  children,
}: {
  submitting: boolean;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <CardFooter className="mt-6 flex-col items-stretch gap-3">
      <Button type="submit" className="w-full" disabled={disabled || submitting}>
        {submitting ? "Working…" : label}
      </Button>
      <div className="flex justify-center">{children}</div>
    </CardFooter>
  );
}

// useSearchParams requires a Suspense boundary during prerender.
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <Suspense>
        <ForgotPasswordFlow />
      </Suspense>
    </div>
  );
}
