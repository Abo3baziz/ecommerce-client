"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, MapPin, Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/error-state";
import { createCheckoutAddress } from "@/features/orders/address-api";
import { useCheckoutAddresses } from "@/features/checkout/hooks";
import { addressSchema, type AddressValues } from "@/features/auth/schemas";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError } from "@/types/envelopes";
import type { Address, AddressId, AddressInput } from "@/types/users";

interface AddressStepProps {
  selectedId: AddressId | null;
  onSelect: (addressId: AddressId) => void;
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
  };
}

function CreateAddressForm({
  onCreated,
}: {
  onCreated: (address: Address) => void;
}) {
  const [rootError, setRootError] = useState<string | null>(null);
  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
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
    },
  });
  const errors = form.formState.errors;
  const isDefaultShipping = useWatch({
    control: form.control,
    name: "is_default_shipping",
  });

  async function handleSubmit(values: AddressValues) {
    setRootError(null);
    try {
      const created = await createCheckoutAddress(toInput(values));
      toast.success("Address added.");
      onCreated(created);
    } catch (error) {
      const err = error as ApiError;
      setRootError(err.message || "Could not save this address.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
      {rootError ? (
        <p role="alert" className="text-sm text-destructive">
          {rootError}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkout-address-recipient">Recipient name</Label>
          <Input
            id="checkout-address-recipient"
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
          <Label htmlFor="checkout-address-phone">Phone number</Label>
          <Input
            id="checkout-address-phone"
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
        <Label htmlFor="checkout-address-label">Label (optional)</Label>
        <Input
          id="checkout-address-label"
          placeholder="Home, Office…"
          {...form.register("label")}
        />
        {errors.label ? (
          <p className="text-sm text-destructive">{errors.label.message}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkout-address-country">Country</Label>
          <Input id="checkout-address-country" {...form.register("country")} />
          {errors.country ? (
            <p className="text-sm text-destructive">{errors.country.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkout-address-state">State</Label>
          <Input id="checkout-address-state" {...form.register("state")} />
          {errors.state ? (
            <p className="text-sm text-destructive">{errors.state.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkout-address-city">City</Label>
          <Input id="checkout-address-city" {...form.register("city")} />
          {errors.city ? (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="checkout-address-line-1">Address line 1</Label>
        <Input
          id="checkout-address-line-1"
          autoComplete="address-line1"
          {...form.register("address_1")}
        />
        {errors.address_1 ? (
          <p className="text-sm text-destructive">{errors.address_1.message}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkout-address-line-2">Address line 2 (optional)</Label>
          <Input
            id="checkout-address-line-2"
            autoComplete="address-line2"
            {...form.register("address_2")}
          />
          {errors.address_2 ? (
            <p className="text-sm text-destructive">{errors.address_2.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkout-address-zip">ZIP code (optional)</Label>
          <Input
            id="checkout-address-zip"
            autoComplete="postal-code"
            {...form.register("zip_code")}
          />
          {errors.zip_code ? (
            <p className="text-sm text-destructive">{errors.zip_code.message}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <Label
          htmlFor="checkout-address-default"
          className="font-normal"
        >
          Set as default shipping address
        </Label>
        <Switch
          id="checkout-address-default"
          checked={isDefaultShipping ?? false}
          onCheckedChange={(checked) =>
            form.setValue("is_default_shipping", checked)
          }
        />
      </div>
      <Button
        type="submit"
        size="sm"
        className="self-start"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Saving…" : "Save address"}
      </Button>
    </form>
  );
}

export function AddressStep({ selectedId, onSelect }: AddressStepProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const addressesQuery = useCheckoutAddresses();

  const addresses = addressesQuery.data ?? [];

  function handleCreated(address: Address) {
    setFormOpen(false);
    void queryClient.invalidateQueries({ queryKey: qk.addresses() });
    onSelect(address.public_id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping address</CardTitle>
        <CardDescription>
          Choose where your order should be delivered.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {addressesQuery.isPending ? (
          <div className="flex flex-col gap-3" aria-hidden>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : addressesQuery.isError ? (
          <ErrorState
            error={addressesQuery.error}
            onRetry={() => void addressesQuery.refetch()}
          />
        ) : (
          <>
            <div role="radiogroup" aria-label="Shipping address" className="flex flex-col gap-3">
              {addresses.map((address) => {
                const selected = address.public_id === selectedId;
                return (
                  <label
                    key={address.public_id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-foreground/20",
                    )}
                  >
                    <input
                      type="radio"
                      name="checkout-address"
                      className="mt-1 accent-primary"
                      checked={selected}
                      onChange={() => onSelect(address.public_id)}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {address.recipient_name}
                        </span>
                        {address.label ? (
                          <Badge variant="secondary">{address.label}</Badge>
                        ) : null}
                        {address.is_default_shipping ? (
                          <Badge variant="outline">Default shipping</Badge>
                        ) : null}
                      </span>
                      <span>{address.address_1}</span>
                      {address.address_2 ? (
                        <span>{address.address_2}</span>
                      ) : null}
                      <span>
                        {address.city}, {address.state}
                        {address.zip_code ? ` ${address.zip_code}` : ""},{" "}
                        {address.country}
                      </span>
                      <span className="text-muted-foreground">
                        {address.phone_number}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              aria-expanded={formOpen}
              onClick={() => setFormOpen((open) => !open)}
            >
              {formOpen ? (
                <ChevronDown aria-hidden className="size-4" />
              ) : (
                <Plus aria-hidden className="size-4" />
              )}
              {formOpen ? "Hide form" : "Add a new address"}
            </Button>
            {formOpen ? (
              <CreateAddressForm onCreated={handleCreated} />
            ) : null}

            {addresses.length === 0 && !formOpen ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin aria-hidden className="size-4" />
                You have no saved addresses yet — add one to continue.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
