"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, MailWarning, X } from "lucide-react";
import { resendEmailVerification } from "./api";
import { useSession } from "./session-context";
import type { ApiError } from "@/types/envelopes";

type ResendStatus = "idle" | "sent" | "throttled" | "error";

export function EmailVerificationBanner() {
  const { user, refreshSession } = useSession();
  const pathname = usePathname();
  const [dismissedOn, setDismissedOn] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<ResendStatus>("idle");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!user || user.email_verified) {
    return null;
  }
  if (dismissedOn === pathname) {
    return null;
  }

  async function handleResend() {
    setSending(true);
    setStatus("idle");
    try {
      await resendEmailVerification();
      setStatus("sent");
      setCountdown(60);
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 409) {
        await refreshSession();
        return;
      }
      if (err.status === 429) {
        setStatus("throttled");
        setCountdown(60);
        return;
      }
      setStatus("error");
    } finally {
      setSending(false);
    }
  }

  const locked = sending || countdown > 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-amber-100 px-4 py-2 text-sm text-amber-900">
      <MailWarning className="size-4 shrink-0" aria-hidden />
      {status === "sent" ? (
        <span>Verification email sent — please check your inbox.</span>
      ) : status === "throttled" ? (
        <span>Too many requests — retry available in {countdown}s.</span>
      ) : (
        <span>
          Please verify your email address. Check your inbox for the
          verification link.
        </span>
      )}
      {status === "error" ? (
        <span className="font-medium">Could not send — please retry.</span>
      ) : null}
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={locked}
        className="font-medium underline underline-offset-4 disabled:opacity-60 disabled:no-underline"
      >
        {sending ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Sending…
          </span>
        ) : countdown > 0 ? (
          `Resend available in ${countdown}s`
        ) : (
          "Resend email"
        )}
      </button>
      <Link
        href="/account/email"
        className="font-medium underline underline-offset-4"
      >
        Manage email
      </Link>
      <button
        type="button"
        onClick={() => setDismissedOn(pathname)}
        aria-label="Dismiss verification banner"
        className="ml-1 rounded p-1 hover:bg-amber-200"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
