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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { qk } from "@/lib/api/queryKeys";
import type { AdminCustomer } from "@/types/admin-users";
import type { UserRole } from "@/types/enums";
import type { ApiError } from "@/types/envelopes";
import { changeAdminUserRole } from "@/features/admin/users-api";

const ASSIGNABLE_ROLES: readonly UserRole[] = ["CUSTOMER", "ADMIN"];

interface UserRoleDialogProps {
  user: AdminCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRoleDialog({
  user,
  open,
  onOpenChange,
}: UserRoleDialogProps) {
  if (!open) return null;
  return (
    <UserRoleDialogInner
      key={user.public_id}
      user={user}
      onOpenChange={onOpenChange}
    />
  );
}

function UserRoleDialogInner({
  user,
  onOpenChange,
}: {
  user: AdminCustomer;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<UserRole>(user.role);
  const [rootError, setRootError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => changeAdminUserRole(user.public_id, role),
    onSuccess: async (result) => {
      toast.success(`Role changed to ${result.role}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({
        queryKey: qk.admin.user(user.public_id),
      });
      onOpenChange(false);
    },
    onError: async (error: ApiError) => {
      if (error.status === 403) {
        toast.error(
          error.message ||
            "Only super admins can change roles. Your change was not applied.",
        );
        return;
      }
      if (error.status === 409) {
        toast.error(
          error.message ||
            "This is the last remaining admin — demote another admin first.",
        );
        return;
      }
      if (error.status === 400) {
        toast.error(
          error.message ||
            "This role change is not allowed (self-changes and SUPER_ADMIN accounts are protected).",
        );
        return;
      }
      setRootError(error.message || "Could not change the role.");
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            {user.first_name} {user.last_name} currently has the{" "}
            <span className="font-medium">{user.role}</span> role. Role changes
            take effect on their next sign-in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {rootError ? (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-role">New role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
            >
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((assignable) => (
                  <SelectItem key={assignable} value={assignable}>
                    {assignable.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Demoting the last admin or changing your own or a SUPER_ADMIN
              account is blocked by the server.
            </p>
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
            disabled={mutation.isPending || role === user.role}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Changing…" : `Confirm ${role.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
