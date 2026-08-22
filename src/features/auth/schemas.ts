import { z } from "zod";

export const E164_REGEX = /^\+[1-9]\d{7,14}$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const passwordChecks = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  {
    label: "One special character",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

export function passwordPolicySchema() {
  return z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/\d/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character");
}

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(100, "Max 100 characters");

export const registerSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  phone_number: z
    .string()
    .trim()
    .regex(E164_REGEX, "Use E.164 format, e.g. +15551234567"),
  email: z.string().trim().email("Enter a valid email"),
  password: passwordPolicySchema(),
});

export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: passwordPolicySchema(),
    confirm_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  new_email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;

export const changePhoneSchema = z.object({
  new_phone_number: z
    .string()
    .trim()
    .regex(E164_REGEX, "Use E.164 format, e.g. +15551234567"),
  password: z.string().min(1, "Password is required"),
});

export type ChangePhoneValues = z.infer<typeof changePhoneSchema>;

export const otpSchema = z.object({
  otp: z.string().trim().regex(/^\d{4,8}$/, "Enter the verification code"),
});

export type OtpValues = z.infer<typeof otpSchema>;

export const addressSchema = z.object({
  recipient_name: nameSchema,
  phone_number: z
    .string()
    .trim()
    .min(1, "Required")
    .max(20, "Max 20 characters"),
  label: z.string().trim().max(50, "Max 50 characters").optional(),
  country: nameSchema,
  state: nameSchema,
  city: nameSchema,
  address_1: z
    .string()
    .trim()
    .min(1, "Required")
    .max(255, "Max 255 characters"),
  address_2: z.string().trim().max(255, "Max 255 characters").optional(),
  zip_code: z.string().trim().max(20, "Max 20 characters").optional(),
  is_default_shipping: z.boolean().optional(),
  is_default_billing: z.boolean().optional(),
});

export type AddressValues = z.infer<typeof addressSchema>;
