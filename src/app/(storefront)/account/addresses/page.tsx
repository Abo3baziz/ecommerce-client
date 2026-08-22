"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/shared/tooltip-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  Pagination,
  type PaginationProps,
} from "@/components/shared/pagination";
import {
  createAddress,
  deleteAddress,
  updateAddress,
} from "@/features/account/api";
import { useAddresses } from "@/features/account/hooks";
import { AddressFormDialog } from "@/features/account/components/address-form-dialog";
import { qk } from "@/lib/api/queryKeys";
import type {
  Address,
  AddressInput,
  AddressUpdateInput,
} from "@/types";

type DefaultField = "is_default_shipping" | "is_default_billing";

function friendlyMutationError(error: unknown): string | null {
  const err = error as { status?: number; message?: string };
  if (err.status === 404) {
    return null;
  }
  return err.message || "Something went wrong.";
}

export default function AccountAddressesPage() {
  const [page, setPage] = useState(1);
  const addressesQuery = useAddresses(page);
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: qk.addresses() });
  }

  async function handleToggleDefault(
    address: Address,
    field: DefaultField,
    next: boolean,
  ) {
    setTogglingKey(`${address.public_id}:${field}`);
    try {
      const patch: AddressUpdateInput = { [field]: next };
      await updateAddress(address.public_id, patch);
      await refresh();
    } catch (error) {
      const message = friendlyMutationError(error);
      if (message === null) {
        toast.error("That address no longer exists.");
      } else {
        toast.error(message);
      }
      await refresh();
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleCreate(input: AddressInput) {
    await createAddress(input);
    await refresh();
    setPage(1);
    toast.success("Address added.");
  }

  async function handleUpdate(input: AddressInput) {
    if (!editing) {
      return;
    }
    try {
      await updateAddress(editing.public_id, input);
      await refresh();
      toast.success("Address updated.");
    } catch (error) {
      const message = friendlyMutationError(error);
      if (message === null) {
        toast.error("That address no longer exists.");
        setFormOpen(false);
        await refresh();
        return;
      }
      throw error;
    }
  }

  async function handleDelete() {
    if (!deleting) {
      return;
    }
    try {
      await deleteAddress(deleting.public_id);
      toast.success("Address removed.");
    } catch (error) {
      const message = friendlyMutationError(error);
      if (message === null) {
        toast.error("That address no longer exists.");
      } else {
        toast.error(message);
      }
    }
    await refresh();
  }

  const data = addressesQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Address book</CardTitle>
              <CardDescription>
                Saved shipping and billing addresses for checkout.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden className="size-4" />
              Add address
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {addressesQuery.isPending ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : addressesQuery.isError ? (
            <ErrorState
              error={addressesQuery.error}
              onRetry={() => void addressesQuery.refetch()}
            />
          ) : !data || data.data.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No saved addresses"
              description="Add an address to speed up checkout."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus aria-hidden className="size-4" />
                  Add address
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.data.map((address) => (
                <div
                  key={address.public_id}
                  className="flex flex-col rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary">
                      {address.label || "Address"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <TooltipIconButton
                        variant="ghost"
                        size="icon-sm"
                        side="left"
                        label={`Edit ${address.label || "address"}`}
                        onClick={() => {
                          setEditing(address);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil aria-hidden className="size-3.5" />
                      </TooltipIconButton>
                      <TooltipIconButton
                        variant="ghost"
                        size="icon-sm"
                        side="left"
                        label={`Delete ${address.label || "address"}`}
                        onClick={() => setDeleting(address)}
                      >
                        <Trash2
                          aria-hidden
                          className="size-3.5 text-destructive"
                        />
                      </TooltipIconButton>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5 text-sm">
                    <p className="font-medium">{address.recipient_name}</p>
                    <p>{address.address_1}</p>
                    {address.address_2 ? <p>{address.address_2}</p> : null}
                    <p>
                      {address.city}, {address.state}
                      {address.zip_code ? ` ${address.zip_code}` : ""}
                    </p>
                    <p>{address.country}</p>
                    <p className="text-muted-foreground">
                      {address.phone_number}
                    </p>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        ["is_default_shipping", "Default shipping"],
                        ["is_default_billing", "Default billing"],
                      ] as const
                    ).map(([field, label]) => {
                      const checked = address[field];
                      const busy =
                        togglingKey === `${address.public_id}:${field}`;
                      return (
                        <div
                          key={field}
                          className="flex items-center justify-between gap-3"
                        >
                          <Label
                            htmlFor={`${address.public_id}-${field}`}
                            className="text-xs text-muted-foreground"
                          >
                            {label}
                          </Label>
                          <Switch
                            id={`${address.public_id}-${field}`}
                            size="sm"
                            checked={checked}
                            disabled={busy}
                            onCheckedChange={(next) => {
                              void handleToggleDefault(address, field, next);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data && data.data.length > 0 && data.pagination ? (
            (() => {
              const pagination = data.pagination;
              const multiPage =
                (pagination.totalPages !== undefined &&
                  pagination.totalPages > 1) ||
                pagination.hasNext === true ||
                pagination.has_more === true ||
                pagination.page > 1;
              if (!multiPage) {
                return null;
              }
              const onPageChange: PaginationProps["onPageChange"] = (next) => {
                setPage(next);
              };
              return (
                <Pagination
                  className="mt-6"
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  hasNext={pagination.hasNext}
                  hasMore={pagination.has_more}
                  onPageChange={onPageChange}
                />
              );
            })()
          ) : null}
        </CardContent>
      </Card>

      <AddressFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
        address={editing}
        onSubmit={editing ? handleUpdate : handleCreate}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        destructive
        title="Delete this address?"
        description={
          deleting
            ? `"${deleting.label || deleting.recipient_name}" will be removed permanently and can no longer be selected at checkout.`
            : undefined
        }
        confirmLabel="Delete address"
        onConfirm={handleDelete}
      />
    </div>
  );
}
