import { apiRequest } from "@/lib/api/client";
import type {
  AdminAnalyticsOverview,
  AdminAnalyticsOverviewParams,
  CreateOperatingExpenseInput,
  OperatingExpense,
  OperatingExpenseListParams,
  Paginated,
  UpdateOperatingExpenseInput,
} from "@/types";

export async function getAnalyticsOverview(
  params: AdminAnalyticsOverviewParams = {},
): Promise<AdminAnalyticsOverview> {
  return apiRequest<AdminAnalyticsOverview>({
    url: "/admin/analytics/overview",
    params: {
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
    },
  });
}

export async function listOperatingExpenses(
  params: OperatingExpenseListParams = {},
): Promise<Paginated<OperatingExpense>> {
  return apiRequest<Paginated<OperatingExpense>>({
    url: "/admin/analytics/expenses",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      category: params.category || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
    },
  });
}

export async function createOperatingExpense(
  input: CreateOperatingExpenseInput,
): Promise<OperatingExpense> {
  return apiRequest<OperatingExpense>({
    url: "/admin/analytics/expenses",
    method: "POST",
    data: input,
  });
}

export async function updateOperatingExpense(
  expenseId: string,
  input: UpdateOperatingExpenseInput,
): Promise<OperatingExpense> {
  return apiRequest<OperatingExpense>({
    url: `/admin/analytics/expenses/${expenseId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteOperatingExpense(
  expenseId: string,
): Promise<void> {
  await apiRequest<void>({
    url: `/admin/analytics/expenses/${expenseId}`,
    method: "DELETE",
  });
}
