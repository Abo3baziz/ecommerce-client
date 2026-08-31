"use client";

import Link from "next/link";
import { FileText, ReceiptText, Scale, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ForbiddenCard } from "@/components/guards";
import { useSession } from "@/features/auth/session-context";

const ITEMS = [
  {
    href: "/admin/reports/pnl",
    title: "P&L Statement",
    description: "Revenue, COGS, opex, profit, margins, orders, customers, top products & category share. The full financial picture.",
    icon: Scale,
  },
  {
    href: "/admin/reports/revenue",
    title: "Revenue Report",
    description: "Product revenue, collected total, refunds, discounts, order volume, top products & revenue share.",
    icon: TrendingUp,
  },
  {
    href: "/admin/reports/expenses",
    title: "Expenses Report",
    description: "Operating expenses by category, period totals, average per day, and detail ledger (up to 500 rows).",
    icon: ReceiptText,
  },
] as const;

export default function ReportsHubPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();

  if (superAdminProbePending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!isSuperAdmin) {
    return <ForbiddenCard message="Reports are only available to the platform super admin." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileText className="size-6" aria-hidden /> Reports
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Financial PDFs for auditors & ops. Each report supports <span className="font-mono">month / quarter / year / custom</span> periods, day/month granularity (auto ≤31d), multi-currency headers, and inline vs attachment PDFs. JSON preview powers in-page charts; the signed PDF is the source of truth.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ITEMS.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full rounded-none transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4" aria-hidden />
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary group-hover:underline">Open →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-sm">How periods work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="font-mono">month</span> → requires year + month; label <span className="font-mono">2026-03</span></li>
            <li><span className="font-mono">quarter</span> → requires year + quarter 1–4; label <span className="font-mono">2026 Q2</span></li>
            <li><span className="font-mono">year</span> → requires year; label <span className="font-mono">2026</span></li>
            <li><span className="font-mono">custom</span> → requires date_from + date_to (≤366d)</li>
            <li>PDF default; add <span className="font-mono">?format=json</span> for inline preview. Backend header <span className="font-mono">X-Report-Currency</span> mirrors chosen currency.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
