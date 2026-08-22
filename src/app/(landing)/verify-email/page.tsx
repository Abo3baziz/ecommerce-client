"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CircleX,
  Loader2,
  MailWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { qk } from "@/lib/api/queryKeys";
import {
  resendEmailVerification,
  verifyEmailRegistration,
} from "@/features/auth/api";
import type { ApiError } from "@/types/envelopes";

type VerifyState = "verifying" | "success" | "unknown" | "expired" | "error";
type ResendState =
  | "idle"
  | "sending"
  | "sent"
  | "already"
  | "rate-limited"
  | "failed";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const queryClient = useQueryClient();

  const [state, setState] = useState<VerifyState>(
    token ? "verifying" : "unknown",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resend, setResend] = useState<ResendState>("idle");
  const [countdown, setCountdown] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) {
      return;
    }
    startedRef.current = true;
    verifyEmailRegistration(token)
      .then(async () => {
        setState("success");
        await queryClient.invalidateQueries({ queryKey: qk.session });
      })
      .catch((error: unknown) => {
        const err = error as ApiError;
        if (err.status === 404) {
          setState("unknown");
        } else if (err.status === 410) {
          setState("expired");
        } else {
          setState("error");
          setErrorMessage(err.message || "Verification failed.");
        }
      });
  }, [token, queryClient]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleResend() {
    setResend("sending");
    try {
      await resendEmailVerification();
      setResend("sent");
      setCountdown(60);
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 409) {
        setResend("already");
      } else if (err.status === 429) {
        setResend("rate-limited");
        setCountdown(60);
      } else {
        setResend("failed");
      }
    }
  }

  return (
    <Card className="text-center">
      <CardHeader className="items-center">
        <div className="flex justify-center pb-1">
          {state === "verifying" || resend === "sending" ? (
            <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden />
          ) : state === "success" || resend === "sent" || resend === "already" ? (
            <BadgeCheck className="size-10 text-green-600" aria-hidden />
          ) : (
            <CircleX className="size-10 text-destructive" aria-hidden />
          )}
        </div>
        <CardTitle className="text-xl">Email verification</CardTitle>
        <CardDescription>
          {state === "verifying"
            ? "Verifying your email…"
            : state === "success"
              ? "Your email address is now verified."
              : state === "unknown"
                ? "This verification link is not valid."
                : state === "expired"
                  ? "This link has expired or was already used."
                  : errorMessage ?? "Something went wrong."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        {state === "success" ? (
          <Button asChild>
            <Link href="/">Continue shopping</Link>
          </Button>
        ) : null}

        {state === "expired" &&
        resend !== "sent" &&
        resend !== "already" ? (
          <>
            <p className="flex items-center gap-1.5">
              <MailWarning className="size-4" aria-hidden />
              You can request a fresh link below.
            </p>
            <Button
              onClick={() => void handleResend()}
              disabled={resend === "sending" || countdown > 0}
            >
              {resend === "sending"
                ? "Sending…"
                : countdown > 0
                  ? `Resend available in ${countdown}s`
                  : "Resend verification email"}
            </Button>
          </>
        ) : null}

        {resend === "sent" ? (
          <p>Verification email sent — please check your inbox.</p>
        ) : null}
        {resend === "already" ? (
          <p>Your email is already verified. You can sign in.</p>
        ) : null}
        {resend === "rate-limited" ? (
          <p>Too many requests. Please wait before trying again.</p>
        ) : null}

        <Link href="/" className="underline underline-offset-4">
          Back to store
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
