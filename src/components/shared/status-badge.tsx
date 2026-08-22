import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const BADGE_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  shipped: "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-200",
  returned: "bg-orange-100 text-orange-800 border-orange-200",
  refunded: "bg-purple-100 text-purple-800 border-purple-200",

  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  INACTIVE: "bg-amber-100 text-amber-800 border-amber-200",
  ARCHIVED: "bg-zinc-100 text-zinc-600 border-zinc-200",

  IN_STOCK: "bg-green-100 text-green-800 border-green-200",
  LOW_STOCK: "bg-amber-100 text-amber-900 border-amber-300",
  OUT_OF_STOCK: "bg-red-100 text-red-800 border-red-200",

  CUSTOMER: "bg-zinc-100 text-zinc-700 border-zinc-200",
  ADMIN: "bg-blue-100 text-blue-800 border-blue-200",
  SUPER_ADMIN: "bg-violet-100 text-violet-800 border-violet-200",

  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  DELETED: "bg-zinc-200 text-zinc-600 border-zinc-300",

  authorized: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
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
      className={cn(BADGE_STYLES[value] ?? "", className)}
    >
      {value.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}
