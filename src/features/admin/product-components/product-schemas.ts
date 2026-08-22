import { z } from "zod";
import { SLUG_REGEX } from "@/features/auth/schemas";

export const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Max 255 characters"),
  slug: z
    .string()
    .trim()
    .max(255, "Max 255 characters")
    .refine(
      (v) => v === "" || SLUG_REGEX.test(v),
      "Lowercase letters, numbers and single dashes (e.g. blue-tee)",
    ),
  description: z.string().trim().max(10000, "Max 10000 characters"),
  brand: z.string().trim().max(255, "Max 255 characters"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

const unsignedMoney = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || MONEY_PATTERN.test(v), message);

const positiveMoney = () =>
  unsignedMoney("Enter a decimal like 12.99").refine(
    (v) => v === "" || Number(v) > 0,
    "Must be greater than 0",
  );

export const variantFormSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(80, "Max 80 characters"),
  barcode: z.string().trim().max(80, "Max 80 characters"),
  color: z.string().trim().max(100, "Max 100 characters"),
  size: z.string().trim().max(100, "Max 100 characters"),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .regex(MONEY_PATTERN, "Decimal ≥ 0, up to 10 integer + 2 fraction digits"),
  cost_price: unsignedMoney("Decimal ≥ 0, up to 10 integer + 2 fraction digits"),
  discount_percentage: unsignedMoney("Decimal between 0 and 100").refine(
    (v) => v === "" || Number(v) <= 100,
    "Must be 100 or less",
  ),
  weight: positiveMoney(),
  length: positiveMoney(),
  width: positiveMoney(),
  height: positiveMoney(),
  status: z.enum(["", "ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]),
});

export type VariantFormValues = z.infer<typeof variantFormSchema>;

export function emptyVariantValues(): VariantFormValues {
  return {
    sku: "",
    barcode: "",
    color: "",
    size: "",
    price: "",
    cost_price: "",
    discount_percentage: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    status: "",
  };
}

export const productImageFormSchema = z.object({
  image_url: z
    .string()
    .trim()
    .min(1, "Image URL is required")
    .url("Enter a valid URL"),
  alt_text: z.string().trim().max(255, "Max 255 characters"),
  display_order: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v), "Whole number ≥ 0"),
  is_primary: z.boolean(),
});

export type ProductImageFormValues = z.infer<typeof productImageFormSchema>;

export const variantImageFormSchema = z.object({
  image_url: z
    .string()
    .trim()
    .min(1, "Image URL is required")
    .url("Enter a valid URL"),
  alt_text: z.string().trim().max(255, "Max 255 characters"),
  display_order: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v), "Whole number ≥ 0"),
});

export type VariantImageFormValues = z.infer<typeof variantImageFormSchema>;
