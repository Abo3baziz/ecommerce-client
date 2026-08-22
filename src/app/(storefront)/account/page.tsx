"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useSession } from "@/features/auth/session-context";
import { nameSchema } from "@/features/auth/schemas";
import { DeleteAccountDialog } from "@/features/account/components/delete-account-dialog";
import { deleteAccount, updateProfile } from "@/features/account/api";
import { useProfile } from "@/features/account/hooks";
import { qk } from "@/lib/api/queryKeys";
import { formatDate } from "@/lib/format";
import type { ApiError } from "@/types/envelopes";

const profileFormSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfileCard() {
  const profileQuery = useProfile();
  const queryClient = useQueryClient();
  const [rootError, setRootError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { refreshSession, signOut } = useSession();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { first_name: "", last_name: "" },
  });
  const { reset } = form;

  useEffect(() => {
    if (profileQuery.data) {
      reset({
        first_name: profileQuery.data.first_name,
        last_name: profileQuery.data.last_name,
      });
    }
  }, [profileQuery.data, reset]);

  async function onSubmit(values: ProfileFormValues) {
    setRootError(null);
    try {
      await updateProfile(values);
      await queryClient.invalidateQueries({ queryKey: qk.me });
      await refreshSession();
      toast.success("Profile updated.");
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 422) {
        setRootError(err.message || "Those names could not be validated.");
      } else if (err.status === 429) {
        setRootError(
          err.message || "Too many attempts. Please wait and try again.",
        );
      } else {
        setRootError(err.message || "Could not update your profile.");
      }
    }
  }

  async function handleDeleteAccount(password: string) {
    await deleteAccount({ password });
    await signOut();
  }

  const errors = form.formState.errors;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your name as it appears on orders and reviews.
          </CardDescription>
        </CardHeader>
        {profileQuery.isPending ? (
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        ) : profileQuery.isError ? (
          <CardContent>
            <ErrorState
              error={profileQuery.error}
              onRetry={() => void profileQuery.refetch()}
            />
          </CardContent>
        ) : (
          <>
            <CardContent className="flex flex-col gap-4">
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="flex items-center gap-2">
                    {profileQuery.data?.email}
                    {profileQuery.data?.email_verified ? (
                      <Badge variant="secondary">Verified</Badge>
                    ) : (
                      <Badge variant="outline">Unverified</Badge>
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="text-muted-foreground">Member since</dt>
                  <dd>{formatDate(profileQuery.data?.created_at)}</dd>
                </div>
              </dl>
              <Separator />
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-4"
              >
                {rootError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {rootError}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="first_name">First name</Label>
                    <Input
                      id="first_name"
                      autoComplete="given-name"
                      {...form.register("first_name")}
                    />
                    {errors.first_name ? (
                      <p className="text-sm text-destructive">
                        {errors.first_name.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input
                      id="last_name"
                      autoComplete="family-name"
                      {...form.register("last_name")}
                    />
                    {errors.last_name ? (
                      <p className="text-sm text-destructive">
                        {errors.last_name.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-4" aria-hidden />
            Danger zone
          </CardTitle>
          <CardDescription>
            Deleting your account is permanent and cannot be undone. Your
            orders, addresses, and reviews will be removed.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            Delete account
          </Button>
        </CardFooter>
      </Card>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

export default function AccountProfilePage() {
  return <ProfileCard />;
}
