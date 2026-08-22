"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ForbiddenCard } from "@/components/guards";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  createOperatingExpense,
  deleteOperatingExpense,
  listOperatingExpenses,
  updateOperatingExpense,
} from "@/features/admin/analytics-api";
import { useSession } from "@/features/auth/session-context";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import type {
  AnalyticsExpenseCategory,
  OperatingExpense,
} from "@/types";
import { ANALYTICS_EXPENSE_CATEGORIES } from "@/types";

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export default function AnalyticsExpensesPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();

  if (superAdminProbePending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (!isSuperAdmin) {
    return (
      <ForbiddenCard message="The expense ledger is only available to the platform super admin." />
    );
  }

  return <ExpensesTable />;
}

function ExpensesTable() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OperatingExpense | null>(null);
  const [deleting, setDeleting] = useState<OperatingExpense | null>(null);

  const categoryParam = searchParams.get("category") ?? "";
  const page = parsePage(searchParams.get("page"));

  const query = useQuery({
    queryKey: [
      "admin-analytics-expenses",
      { page, category: categoryParam },
    ],
    queryFn: () =>
      listOperatingExpenses({
        page,
        limit: 20,
        category: (categoryParam || undefined) as
          | AnalyticsExpenseCategory
          | undefined,
      }),
    placeholderData: (previous) => previous,
  });

  function invalidate() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-analytics-expenses"] }),
      // Overview totals include operating expenses.
      queryClient.invalidateQueries({
        queryKey: ["admin-analytics-overview"],
      }),
    ]);
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteOperatingExpense(deleting.public_id)
      .then(() => toast.success("Expense removed"))
      .catch(() => toast.error("Could not remove the expense."));
    setDeleting(null);
    await invalidate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operating costs feeding net profit in Analytics.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add expense
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <div className="pt-2">
            <Select
              value={categoryParam || "all"}
              onValueChange={(value) =>
                updateParams({ category: value === "all" ? null : value, page: null })
              }
            >
              <SelectTrigger aria-label="Filter by category" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ANALYTICS_EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>        <CardContent>
          {query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : query.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : query.data.data.length === 0 ? (
            <EmptyState
              title="No expenses recorded"
              description="Add operating costs like rent or salaries so net profit reflects reality."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Spent on</TableHead>
                    <TableHead>Recorded</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.data.map((expense) => (
                    <TableRow key={expense.public_id}>
                      <TableCell className="max-w-72 truncate font-medium">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>{expense.spent_at}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(expense.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={expense.amount} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditing(expense);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleting(expense)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationFromStandard
                pagination={query.data.pagination}
                onPageChange={(next) => updateParams({ page: String(next) })}
              />
            </>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={formOpen}
        expense={editing}
        onClose={() => {
          setEditing(null);
          setFormOpen(false);
        }}
        onSaved={() => invalidate()}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this expense?"
        description={
          deleting
            ? `"${deleting.description}" (${deleting.amount}) will be permanently removed and net profit will recalculate.`
            : undefined
        }
        confirmLabel="Delete expense"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

interface ExpenseFormValues {
  description: string;
  category: AnalyticsExpenseCategory;
  amount: string;
  spent_at: string;
}

const EMPTY_FORM: ExpenseFormValues = {
  description: "",
  category: "OTHER",
  amount: "",
  spent_at: new Date().toISOString().slice(0, 10),
};

function ExpenseFormDialog({
  open,
  expense,
  onClose,
  onSaved,
}: {
  open: boolean;
  expense: OperatingExpense | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const isEdit = expense !== null;
  const [values, setValues] = useState<ExpenseFormValues>(
    expense
      ? {
          description: expense.description,
          category: expense.category,
          amount: expense.amount,
          spent_at: expense.spent_at,
        }
      : EMPTY_FORM,
  );

  const errors = validateForm(values);
  const valid = Object.keys(errors).length === 0;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        description: values.description.trim(),
        category: values.category,
        amount: Number(values.amount),
        spent_at: `${values.spent_at}T00:00:00.000Z`,
      };
      return isEdit && expense
        ? updateOperatingExpense(expense.public_id, payload)
        : createOperatingExpense(payload);
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Expense updated" : "Expense added");
      await onSaved();
      onClose();
    },
    onError: () => toast.error("Could not save the expense."),
  });

  function set<K extends keyof ExpenseFormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            Operating costs are excluded from revenue and reduce net profit.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) mutation.mutate();
          }}
          noValidate
        >
          <div className="flex flex-col gap-4">
            <Field label="Description" error={errors.description}>
              <Textarea
                id="expense-description"
                rows={2}
                maxLength={255}
                value={values.description}
                placeholder="e.g. Office rent — August"
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field label="Category" error={errors.category}>
              <Select
                value={values.category}
                onValueChange={(value) =>
                  set("category", value as AnalyticsExpenseCategory)
                }
              >
                <SelectTrigger id="expense-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYTICS_EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount" error={errors.amount}>
                <Input
                  id="expense-amount"
                  inputMode="decimal"
                  value={values.amount}
                  placeholder="e.g. 1200.00"
                  onChange={(e) => set("amount", e.target.value)}
                />
              </Field>
              <Field label="Spent on" error={errors.spent_at}>
                <Input
                  id="expense-spent-at"
                  type="date"
                  value={values.spent_at}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("spent_at", e.target.value)}
                />
              </Field>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!valid || mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function validateForm(values: ExpenseFormValues): Partial<
  Record<keyof ExpenseFormValues, string>
> {
  const errors: Partial<Record<keyof ExpenseFormValues, string>> = {};
  if (values.description.trim() === "") {
    errors.description = "Description is required.";
  } else if (values.description.length > 255) {
    errors.description = "Max 255 characters.";
  }
  const amount = Number(values.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter an amount greater than zero.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.spent_at)) {
    errors.spent_at = "Pick a date.";
  }
  return errors;
}
