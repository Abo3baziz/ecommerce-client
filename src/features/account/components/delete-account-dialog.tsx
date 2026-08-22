"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiError } from "@/types/envelopes";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => Promise<void>;
}

function DeleteAccountForm({
  onConfirm,
  onClose,
}: {
  onConfirm: (password: string) => Promise<void>;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      await onConfirm(password);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        setError(apiErr.message || "Incorrect password.");
      } else if (apiErr.status === 429) {
        setError(
          apiErr.message || "Too many attempts. Please wait and try again.",
        );
      } else {
        setError(apiErr.message || "Could not delete your account.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently removes your profile, orders, addresses, and
          reviews. This action is irreversible.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="delete-account-password">Current password</Label>
        <Input
          id="delete-account-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={pending || password.length === 0}
          onClick={(event) => {
            event.preventDefault();
            void handleConfirm();
          }}
          className="bg-destructive text-white hover:bg-destructive/90"
        >
          {pending ? "Deleting…" : "Delete account forever"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteAccountDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {open ? (
          <DeleteAccountForm
            onConfirm={onConfirm}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
