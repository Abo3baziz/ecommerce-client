import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Dossier stamps: every state is a named phase — a printed word beside its
 * tint, never color alone. Tints are harmonized to the paper/ink world.
 */
export const BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
  confirmed: "bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800",
  processing: "bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800",
  shipped: "bg-cyan-100 text-cyan-950 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-800",
  delivered: "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-600",
  returned: "bg-orange-100 text-orange-950 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-800",
  refunded: "bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800",

  ACTIVE: "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-600",
  INACTIVE: "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
  ARCHIVED: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-600",

  IN_STOCK: "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
  LOW_STOCK: "bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700",
  OUT_OF_STOCK: "bg-red-100 text-red-950 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800",

  CUSTOMER: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-600",
  ADMIN: "bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800",
  SUPER_ADMIN: "bg-violet-100 text-violet-950 border-violet-300 dark:bg-violet-950/60 dark:text-violet-200 dark:border-violet-800",

  SUSPENDED: "bg-red-100 text-red-950 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800",
  DELETED: "bg-zinc-200 text-zinc-600 border-zinc-300 line-through dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-600",

  authorized: "bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800",
  paid: "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
  failed: "bg-red-100 text-red-950 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800",

  EXPIRED: "bg-red-100 text-red-950 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800",
  USAGE_LIMIT_REACHED: "bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800",
};

export function StatusBadge({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) {
    return <Badge variant="outline">—</Badge>;
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-none font-mono text-[0.6875rem] uppercase tracking-[0.1em]",
        BADGE_STYLES[value] ?? "",
        className,
      )}
    >
      {value.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}
