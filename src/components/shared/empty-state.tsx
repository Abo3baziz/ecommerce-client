import type { LucideIcon } from "lucide-react";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "hatch-light flex flex-col items-center justify-center gap-3 border bg-card px-6 py-16 text-center",
        className,
      )}
    >
      <Icon className="size-10 text-muted-foreground/50" aria-hidden />
      <div>
        <p className="font-heading text-lg font-semibold uppercase">
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
