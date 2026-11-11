"use client";

import { useSyncExternalStore } from "react";
import { Clock, X } from "lucide-react";

/**
 * Simple top-of-site notice that the demo backend sleeps when idle and the
 * first request can take up to ~50 seconds (free-tier cold start).
 *
 * Session-scoped: it stays visible until the visitor dismisses it — it never
 * auto-hides, so on a fast server it still reads as a demo notice rather
 * than flashing away. The dismissed flag lives in sessionStorage, so the
 * banner returns only on a fresh tab.
 */

const DISMISSED_KEY = "demo:wake-banner-dismissed";
const DISMISS_EVENT = "demo:wake-banner-dismissed";

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeDismissed(callback: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

export function WakeBanner() {
  // Server snapshot `true` keeps SSR/hydration safe; the banner then appears
  // (or stays hidden) based on the client's sessionStorage after hydration.
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    isDismissed,
    () => true,
  );

  if (dismissed) {
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
