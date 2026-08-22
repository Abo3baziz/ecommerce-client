"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CircleX,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthGate } from "@/components/guards";
import { qk } from "@/lib/api/queryKeys";
import { verifyEmailChange } from "@/features/auth/api";
import type { ApiError } from "@/types/envelopes";

type State = "verifying" | "success" | "unknown" | "expired" | "error";

function VerifyEmailChangeInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const queryClient = useQueryClient();

  const [state, setState] = useState<State>(token ? "verifying" : "unknown");
  const [email, setEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) {
      return;
    }
    startedRef.current = true;
    verifyEmailChange(token)
      .then(async (result) => {
        setState("success");
        setEmail(result.email);
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

  return (
    <Card className="text-center">
      <CardHeader className="items-center">
        <div className="flex justify-center pb-1">
          {state === "verifying" ? (
            <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden />
          ) : state === "success" ? (
            <BadgeCheck className="size-10 text-green-600" aria-hidden />
          ) : (
            <CircleX className="size-10 text-destructive" aria-hidden />
          )}
        </div>
        <CardTitle className="text-xl">Update email</CardTitle>
        <CardDescription>
          {state === "verifying"
            ? "Applying your new email address…"
            : state === "success"
              ? email
                ? `Your email is now ${email}.`
                : "Your email address has been updated."
              : state === "unknown"
                ? "This link is not valid."
                : state === "expired"
                  ? "This link has expired or was already used."
                  : errorMessage ?? "Something went wrong."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        {state === "expired" ? (
          <Button asChild variant="outline">
            <Link href="/account/email">Request a new link</Link>
          </Button>
        ) : null}
        <Link href="/account" className="underline underline-offset-4">
          Go to account
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <AuthGate>
      <Suspense>
        <VerifyEmailChangeInner />
      </Suspense>
    </AuthGate>
  );
}
