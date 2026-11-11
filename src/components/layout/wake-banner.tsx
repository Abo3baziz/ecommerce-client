"use client";

import { useSyncExternalStore } from "react";
import { Clock, X } from "lucide-react";
import { SERVER_AWAKE_EVENT } from "@/lib/api/axios-instance";

/**
 * Simple top-of-site notice that the demo backend sleeps when idle and the
 * first request can take up to ~50 seconds (free-tier cold start).
 *
 * Session-scoped: hidden once the user dismisses it, and auto-hidden for the
 * rest of the tab session once any real API response arrives (the axios
 * interceptor marks `demo:server-awake` and dispatches the wake event).
 * Both flags live in sessionStorage, so the banner reappears only on a fresh
 * tab — when a cold start is actually likely.
 */

const SERVER_AWAKE_KEY = "demo:server-awake";
const DISMISSED_KEY = "demo:wake-banner-dismissed";
const DISMISS_EVENT = "demo:wake-banner-dismissed";

function isHidden(): boolean {
  try {
    return (
      sessionStorage.getItem(SERVER_AWAKE_KEY) === "1" ||
      sessionStorage.getItem(DISMISSED_KEY) === "1"
    );
  } catch {
    return false;
  }
}

function subscribeHidden(callback: () => void): () => void {
  window.addEventListener(SERVER_AWAKE_EVENT, callback);
  window.addEventListener(DISMISS_EVENT, callback);
  return () => {
    window.removeEventListener(SERVER_AWAKE_EVENT, callback);
    window.removeEventListener(DISMISS_EVENT, callback);
  };
}

export function WakeBanner() {
  // Server snapshot `true` keeps SSR/hydration safe; the banner then appears
  // (or stays hidden) based on the client's sessionStorage after hydration.
  const hidden = useSyncExternalStore(subscribeHidden, isHidden, () => true);

  if (hidden) {
    return null;
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore storage errors — still hide for this view
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <div
      role="status"
      className="relative border-b bg-amber-100 px-10 py-1.5 text-center text-xs text-amber-950"
    >
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">Demo notice:</span> the demo server
          may take up to <span className="font-mono font-semibold">~50s</span>{" "}
          to wake up on your first visit — thanks for your patience.
        </span>
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss the wake-up notice"
        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-none p-1 text-amber-950/70 transition-colors hover:bg-amber-200/60 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-1"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
