"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
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
import { register } from "@/features/auth/api";
import { useSession } from "@/features/auth/session-context";
import {
  passwordChecks,
  registerSchema,
  type RegisterValues,
} from "@/features/auth/schemas";
import type { ApiError } from "@/types/envelopes";

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="grid gap-1 text-xs">
      {passwordChecks.map(({ label, test }) => {
        const ok = test(password);
        return (
          <li
            key={label}
            className={`flex items-center gap-1.5 ${
              ok ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {ok ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <X className="size-3.5" aria-hidden />
            )}
            {label}
          </li>
        );
      })}
    </ul>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useSession();
  const [rootError, setRootError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  const nextPath = (() => {
    const from = searchParams.get("from");
    return from && from.startsWith("/") ? from : "/";
  })();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone_number: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setRootError(null);
    try {
      await register(values);
      await fetchCsrfToken();
      await refreshSession();
      toast.success("Account created — check your inbox to verify your email.");
      router.replace(nextPath);
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 409) {
        if (/phone/i.test(err.message)) {
          form.setError("phone_number", {
            message: "This phone number is already registered.",
          });
        } else {
          form.setError("email", {
            message: "This email is already registered.",
          });
        }
      } else if (err.status === 422) {
        form.setError("password", {
          message: err.message || "Password does not meet the policy.",
        });
      } else if (err.status === 429) {
        setRootError(
          err.message || "Too many attempts. Please wait and try again.",
        );
      } else {
        setRootError(err.message || "Registration failed. Please try again.");
      }
    }
  }

  const errors = form.formState.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>You will be signed in automatically.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent className="flex flex-col gap-4">
          {rootError ? (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" autoComplete="given-name" {...form.register("first_name")} />
              {errors.first_name ? (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" autoComplete="family-name" {...form.register("last_name")} />
              {errors.last_name ? (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone_number">Phone</Label>
            <Input
              id="phone_number"
              type="tel"
              placeholder="+15551234567"
              autoComplete="tel"
              {...form.register("phone_number")}
            />
            {errors.phone_number ? (
              <p className="text-sm text-destructive">{errors.phone_number.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-describedby="password-policy"
              {...form.register("password", {
                onChange: (event) => setPassword(event.target.value),
              })}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
            <PasswordChecklist password={password} />
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            We&apos;ll email you a verification link after signup.
          </p>
          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
