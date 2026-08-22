"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { addressSchema, type AddressValues } from "@/features/auth/schemas";
import type { ApiError } from "@/types/envelopes";
import type { Address, AddressInput } from "@/types";

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: Address | null;
  onSubmit: (input: AddressInput) => Promise<void>;
}

function defaultsFor(address: Address | null): AddressValues {
  if (address) {
    return {
      recipient_name: address.recipient_name,
      phone_number: address.phone_number,
      label: address.label ?? "",
      country: address.country,
      state: address.state,
      city: address.city,
      address_1: address.address_1,
      address_2: address.address_2 ?? "",
      zip_code: address.zip_code ?? "",
      is_default_shipping: address.is_default_shipping,
      is_default_billing: address.is_default_billing,
    };
  }
  return {
    recipient_name: "",
    phone_number: "",
    label: "",
    country: "",
    state: "",
    city: "",
    address_1: "",
    address_2: "",
    zip_code: "",
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function toInput(values: AddressValues): AddressInput {
  return {
    recipient_name: values.recipient_name,
    phone_number: values.phone_number,
    label: values.label ? values.label : undefined,
    country: values.country,
    state: values.state,
    city: values.city,
    address_1: values.address_1,
    address_2: values.address_2 ? values.address_2 : undefined,
    zip_code: values.zip_code ? values.zip_code : undefined,
    is_default_shipping: values.is_default_shipping,
    is_default_billing: values.is_default_billing,
  };
}

function AddressForm({
  address,
  onSubmit,
  onDone,
}: Omit<AddressFormDialogProps, "open" | "onOpenChange"> & {
  onDone: () => void;
}) {
  const [rootError, setRootError] = useState<string | null>(null);
  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultsFor(address),
  });
  const isDefaultShipping = useWatch({
    control: form.control,
    name: "is_default_shipping",
  });
  const isDefaultBilling = useWatch({
    control: form.control,
    name: "is_default_billing",
  });
  const errors = form.formState.errors;

  async function handleSubmit(values: AddressValues) {
    setRootError(null);
    try {
      await onSubmit(toInput(values));
      onDone();
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 429) {
        setRootError(
          err.message || "Too many attempts. Please wait and try again.",
        );
      } else {
        setRootError(err.message || "Could not save this address.");
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <div className="grid gap-4">
        {rootError ? (
          <p role="alert" className="text-sm text-destructive">
            {rootError}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="address-recipient">Recipient name</Label>
            <Input
              id="address-recipient"
              autoComplete="name"
              {...form.register("recipient_name")}
            />
            {errors.recipient_name ? (
              <p className="text-sm text-destructive">
                {errors.recipient_name.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address-phone">Phone number</Label>
            <Input
              id="address-phone"
              type="tel"
              placeholder="+15551234567"
              autoComplete="tel"
              {...form.register("phone_number")}
            />
            {errors.phone_number ? (
              <p className="text-sm text-destructive">
                {errors.phone_number.message}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-label">Label (optional)</Label>
          <Input
            id="address-label"
            placeholder="Home, Office…"
            {...form.register("label")}
          />
          {errors.label ? (
            <p className="text-sm text-destructive">{errors.label.message}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="address-country">Country</Label>
            <Input id="address-country" {...form.register("country")} />
            {errors.country ? (
              <p className="text-sm text-destructive">
                {errors.country.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address-state">State</Label>
            <Input id="address-state" {...form.register("state")} />
            {errors.state ? (
              <p className="text-sm text-destructive">{errors.state.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address-city">City</Label>
            <Input id="address-city" {...form.register("city")} />
            {errors.city ? (
              <p className="text-sm text-destructive">{errors.city.message}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-line-1">Address line 1</Label>
          <Input
            id="address-line-1"
            autoComplete="address-line1"
            {...form.register("address_1")}
          />
          {errors.address_1 ? (
            <p className="text-sm text-destructive">
              {errors.address_1.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-line-2">Address line 2 (optional)</Label>
          <Input
            id="address-line-2"
            autoComplete="address-line2"
            {...form.register("address_2")}
          />
          {errors.address_2 ? (
            <p className="text-sm text-destructive">
              {errors.address_2.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:w-1/2">
          <Label htmlFor="address-zip">ZIP code (optional)</Label>
          <Input
            id="address-zip"
            autoComplete="postal-code"
            {...form.register("zip_code")}
          />
          {errors.zip_code ? (
            <p className="text-sm text-destructive">
              {errors.zip_code.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="address-default-shipping" className="font-normal">
              Default shipping address
            </Label>
            <Switch
              id="address-default-shipping"
              checked={isDefaultShipping ?? false}
              onCheckedChange={(checked) =>
                form.setValue("is_default_shipping", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="address-default-billing" className="font-normal">
              Default billing address
            </Label>
            <Switch
              id="address-default-billing"
              checked={isDefaultBilling ?? false}
              onCheckedChange={(checked) =>
                form.setValue("is_default_billing", checked)
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Setting a default here clears the previous default of the same kind.
          </p>
        </div>
      </div>
      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          disabled={form.formState.isSubmitting}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? "Saving…"
            : address
              ? "Save changes"
              : "Add address"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddressFormDialog({
  open,
  onOpenChange,
  address,
  onSubmit,
}: AddressFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{address ? "Edit address" : "Add address"}</DialogTitle>
          <DialogDescription>
            {address
              ? "Update the details for this saved address."
              : "Save a new shipping or billing address to your account."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <AddressForm
            address={address}
            onSubmit={onSubmit}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
