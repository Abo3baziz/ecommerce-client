"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { qk } from "@/lib/api/queryKeys";
import { updateAdminUser } from "@/features/admin/users-api";
import type { AdminCustomer, UpdateAdminCustomerInput } from "@/types/admin-users";
import type { ApiError } from "@/types/envelopes";

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EditUserDialogProps {
  user: AdminCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  if (!open) return null;
  return (
    <EditUserDialogInner
      key={user.public_id}
      user={user}
      onOpenChange={onOpenChange}
    />
  );
}

function EditUserDialogInner({
  user,
  onOpenChange,
}: {
  user: AdminCustomer;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email);
  const [phoneNumber, setPhoneNumber] = useState(user.phone_number);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState<string | null>(null);

  const nameInvalid =
    firstName.trim() === "" ||
    lastName.trim() === "" ||
    firstName.trim().length > 100 ||
    lastName.trim().length > 100;
  const emailInvalid =
    email.trim() !== user.email &&
    (email.trim() === "" || !EMAIL_PATTERN.test(email.trim()));
  const phoneInvalid =
    phoneNumber.trim() !== user.phone_number &&
    !E164_PATTERN.test(phoneNumber.trim());

  const mutation = useMutation({
    mutationFn: () => {
      const input: UpdateAdminCustomerInput = {};
      if (firstName.trim() !== user.first_name) {
        input.first_name = firstName.trim();
      }
      if (lastName.trim() !== user.last_name) {
        input.last_name = lastName.trim();
      }
      if (email.trim() !== user.email) {
        input.email = email.trim();
      }
      if (phoneNumber.trim() !== user.phone_number) {
        input.phone_number = phoneNumber.trim();
      }
      return updateAdminUser(user.public_id, input);
    },
    onSuccess: async () => {
      toast.success("Customer updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({
        queryKey: qk.admin.user(user.public_id),
      });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      if (error.status === 403) {
        toast.error(
          error.message ||
            "Only super admins can change a customer's email or phone number.",
        );
        return;
      }
      if (error.status === 409 || error.status === 422) {
        const message = error.message.toLowerCase();
        if (message.includes("phone")) {
          setFieldErrors({ phone_number: error.message });
          return;
        }
        if (message.includes("email")) {
          setFieldErrors({ email: error.message });
          return;
        }
        if (message.includes("first")) {
          setFieldErrors({ first_name: error.message });
          return;
        }
        if (message.includes("last")) {
          setFieldErrors({ last_name: error.message });
          return;
        }
      }
      setRootError(error.message || "Could not update the customer.");
    },
  });

  function submit() {
    setRootError(null);
    setFieldErrors({});
    if (nameInvalid || emailInvalid || phoneInvalid) return;
    mutation.mutate();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {user.first_name} {user.last_name}
          </DialogTitle>
          <DialogDescription>
            Names can be edited by any admin. Email and phone changes require
            super admin rights.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {rootError ? (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-first-name">First name</Label>
              <Input
                id="user-first-name"
                value={firstName}
                autoComplete="given-name"
                onChange={(e) => setFirstName(e.target.value)}
              />
              {fieldErrors.first_name ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.first_name}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-last-name">Last name</Label>
              <Input
                id="user-last-name"
                value={lastName}
                autoComplete="family-name"
                onChange={(e) => setLastName(e.target.value)}
              />
              {fieldErrors.last_name ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.last_name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldErrors.email ? (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            ) : emailInvalid ? (
              <p className="text-sm text-destructive">Enter a valid email.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-phone">Phone (E.164)</Label>
            <Input
              id="user-phone"
              value={phoneNumber}
              placeholder="+15551234567"
              autoComplete="off"
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            {fieldErrors.phone_number ? (
              <p className="text-sm text-destructive">
                {fieldErrors.phone_number}
              </p>
            ) : phoneInvalid ? (
              <p className="text-sm text-destructive">
                Use international format like +15551234567.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              mutation.isPending ||
              nameInvalid ||
              emailInvalid ||
              phoneInvalid ||
              Object.keys(fieldErrors).length > 0
            }
            onClick={submit}
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
