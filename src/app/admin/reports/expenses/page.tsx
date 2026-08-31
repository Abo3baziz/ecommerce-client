"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ForbiddenCard } from "@/components/guards";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { formatDateTime } from "@/lib/format";
import { getExpensesReport, downloadReportPdf, downloadBlob, openBlobInline } from "@/features/admin/reports-api";
import { ReportFilters } from "@/features/admin/report-components/report-filters";
import { isReportParamsValid, parseReportParams } from "@/features/admin/report-components/report-params";
import { useSession } from "@/features/auth/session-context";
import { toast } from "sonner";

export default function ExpensesReportPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="Reports are only available to the platform super admin." />;
  return <ExpensesDashboard />;
}

function ExpensesDashboard() {
  const searchParams = useSearchParams();
  const params = parseReportParams(searchParams);
  const validation = isReportParamsValid(params);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const query = useQuery({
    queryKey: ["admin-report-expenses", params],
    queryFn: () => getExpensesReport(params),
    enabled: validation.valid,
    placeholderData: (prev) => prev,
  });

  async function handleDownload() {
    setDownloading(true);
    try { const { blob, filename } = await downloadReportPdf("expenses", params); downloadBlob(blob, filename); toast.success(`Downloaded ${filename}`); } catch (e) { toast.error(e instanceof Error ? e.message : "Download failed"); } finally { setDownloading(false); }
  }
  async function handlePreview() {
    setDownloading(true);
    try { const { blob } = await downloadReportPdf("expenses", { ...params, disposition: "inline" }); const url = openBlobInline(blob); setPdfUrl((p) => { if (p) URL.revokeObjectURL(p); return url; }); } catch (e) { toast.error(e instanceof Error ? e.message : "Preview failed"); } finally { setDownloading(false); }
  }

  const data = query.data;
  const isLoading = query.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operating expenses breakdown {data ? `· ${data.window.label} · ${formatDateTime(data.range.from)} → ${formatDateTime(data.range.to)}` : ""}</p>
      </div>

      <ReportFilters showCategory onDownload={handleDownload} onPreviewInline={handlePreview} downloadLoading={downloading} />

      {!validation.valid ? <p className="text-sm text-destructive">{validation.error}</p> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {pdfUrl ? <Card className="rounded-none"><CardHeader><CardTitle className="text-sm">PDF preview</CardTitle></CardHeader><CardContent><iframe src={pdfUrl} title="Expenses PDF preview" className="h-[720px] w-full border" /></CardContent></Card> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total" isLoading={isLoading} content={data ? <Money value={data.totals.total} className="text-2xl lg:text-3xl" /> : null} sublabel={data ? `${data.totals.count} entries` : undefined} />
        <KpiCard label="Average / day" isLoading={isLoading} content={data ? <Money value={data.totals.avgPerDay} className="text-2xl lg:text-3xl" /> : null} sublabel={data ? `over ${Math.max(1, Math.round((new Date(data.range.to).getTime() - new Date(data.range.from).getTime()) / 86400000))} days` : undefined} />
        <KpiCard label="Window" isLoading={isLoading} content={data ? <span className="text-lg font-semibold">{data.window.label}</span> : null} sublabel={data ? `bucket ${data.window.bucket}` : undefined} />
        <KpiCard label="Entries shown" isLoading={isLoading} content={data ? <span className="text-2xl font-semibold tabular-nums">{data.expenses.length}</span> : null} sublabel={data ? `of ${data.totals.count} (cap 500)` : undefined} />
      </div>

      <Card className="rounded-none">
        <CardHeader><CardTitle>By category</CardTitle><CardDescription>Share of period total</CardDescription></CardHeader>
        <CardContent>
          {isLoading || !data ? <Skeleton className="h-24 w-full" /> : data.byCategory.length ? (
            <div className="space-y-2">
              {data.byCategory.map((c) => (
                <div key={c.category} className="text-sm">
                  <div className="flex justify-between"><span>{c.category}</span><span className="flex gap-3 tabular-nums"><Money value={c.total} /><span className="text-muted-foreground">{c.share_pct}%</span></span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-primary/70" style={{ width: `${Math.min(100, Number(c.share_pct))}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <p className="py-6 text-center text-sm text-muted-foreground">No expenses in period.</p>}
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Detail ledger</CardTitle><CardDescription>{data ? `${data.expenses.length} shown (up to 500)` : "Up to 500 most recent entries in window"}</CardDescription></CardHeader>
        <CardContent>
          {isLoading || !data ? <Skeleton className="h-64 w-full" /> : data.expenses.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>ID</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Created by</TableHead></TableRow></TableHeader>
                <TableBody>{data.expenses.map((e) => (
                  <TableRow key={e.public_id}>
                    <TableCell className="font-mono text-xs">{e.spent_at}</TableCell>
                    <TableCell className="font-mono text-xs">{e.public_id.slice(0, 8)}…</TableCell>
                    <TableCell className="max-w-56 truncate">{e.description}</TableCell>
                    <TableCell className="text-xs">{e.category}</TableCell>
                    <TableCell className="text-right"><Money value={e.amount} /></TableCell>
                    <TableCell className="text-xs">{e.created_by}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          ) : <p className="py-10 text-center text-sm text-muted-foreground">No expense entries match the selected window / category.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, sublabel, content, isLoading }: { label: string; sublabel?: string; content: React.ReactNode | null; isLoading: boolean }) {
  return <Card className="rounded-none"><CardContent className="flex flex-col gap-1 pt-6"><span className="text-sm font-medium text-muted-foreground">{label}</span>{isLoading || content === null ? <Skeleton className="h-9 w-24" /> : content}{sublabel ? <span className="truncate text-xs text-muted-foreground">{sublabel}</span> : null}</CardContent></Card>;
}
