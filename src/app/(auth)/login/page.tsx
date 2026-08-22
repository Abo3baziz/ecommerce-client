"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { fetchCsrfToken } from "@/lib/api/csrf";
import { qk } from "@/lib/api/queryKeys";
import { login } from "@/features/auth/api";
import { useSession } from "@/features/auth/session-context";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import type { ApiError } from "@/types/envelopes";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { refreshSession } = useSession();
  const [rootError, setRootError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const nextPath = (() => {
    const from = searchParams.get("from");
    return from && from.startsWith("/") ? from : "/";
  })();

  async function onSubmit(values: LoginValues) {
    setRootError(null);
    try {
      await login(values);
      await fetchCsrfToken();
      await refreshSession();
      await queryClient.invalidateQueries({ queryKey: qk.cart });
      toast.success("Welcome back!");
      router.replace(nextPath);
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 401) {
        setRootError("Invalid email or password.");
      } else if (err.status === 403) {
        setRootError(
          err.message || "This account is suspended. Contact support.",
        );
      } else if (err.status === 429) {
        setRootError(err.message || "Too many attempts. Try again later.");
      } else {
        setRootError(err.message || "Sign in failed. Please try again.");
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>Use your email and password.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent className="flex flex-col gap-4">
          {rootError ? (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Forgot your password?{" "}
            <Link
              href="/forgot-password"
              className="underline underline-offset-4"
            >
              Reset it
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="underline underline-offset-4">
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
