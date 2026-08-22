"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/types/envelopes";

function messageFor(err: ApiError | undefined): string {
  if (!err) {
    return "Something went wrong.";
  }
  switch (err.status) {
    case 0:
      return "Network error — could not reach the server.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to do this.";
    case 404:
      return "This item could not be found.";
    case 429:
      return err.message || "Too many requests. Please wait and try again.";
    default:
      return err.message || `Request failed (${err.status}).`;
  }
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const apiError =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error
      ? (error as ApiError)
      : undefined;

  return (
    <div
      role="alert"
      className={
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center " +
        (className ?? "")
      }
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden />
      <p className="max-w-md text-sm text-muted-foreground">
        {messageFor(apiError)}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden className="size-4" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
