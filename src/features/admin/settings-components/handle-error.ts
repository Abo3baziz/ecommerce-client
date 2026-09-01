import { toast } from "sonner";
import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import type { ApiError } from "@/types/envelopes";

/**
 * react-hook-form onInvalid handler: client-side validation blocked the save,
 * so surface the first problem instead of failing silently.
 */
export function handleSettingsInvalid(errors: FieldValues): void {
  const findMessage = (value: unknown, depth = 0): string | undefined => {
    if (depth > 3 || value === null || typeof value !== "object") return undefined;
    for (const entry of Object.values(value as Record<string, unknown>)) {
      if (entry && typeof entry === "object" && "message" in entry && typeof (entry as { message: unknown }).message === "string") {
        return (entry as { message: string }).message;
      }
      const nested = findMessage(entry, depth + 1);
      if (nested) return nested;
    }
    return undefined;
  };
  toast.error(`Cannot save: ${findMessage(errors) ?? "please fix the highlighted fields"}`);
}

export function handleSettingsError<T extends FieldValues>(
  error: unknown,
  setError?: UseFormSetError<T>,
) {
  const err = error as ApiError & { errors?: Record<string, unknown> };
  if (err.errors && typeof err.errors === "object" && Object.keys(err.errors).length > 0) {
    const details = Object.entries(err.errors)
      .map(([k, v]) => {
        const msgs = Array.isArray(v) ? (v as string[]).join(", ") : JSON.stringify(v);
        return `${k}: ${msgs}`;
      })
      .join("; ");
    toast.error(`${err.message ?? "Validation error"} — ${details}`);
    if (setError) {
      for (const [k, v] of Object.entries(err.errors)) {
        // keys are like "body.store_name" or "body.default_currency" or "body.tax_config.rate"
        const field = k.replace(/^body\./, "").replace(/^query\./, "").replace(/^params\./, "");
        if (!field) continue;
        const msgs = Array.isArray(v) ? (v as string[]) : [];
        const msg = msgs[0] as string | undefined;
        if (msg) {
          try {
            setError(field as Path<T>, { message: msg } as never);
          } catch {
            // ignore if field not in form
          }
        }
      }
    }
    return;
  }
  toast.error((err as { message?: string }).message ?? "Failed to save");
}
