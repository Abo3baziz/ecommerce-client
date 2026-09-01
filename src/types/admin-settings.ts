export type SettingsKey =
  | "general"
  | "commerce"
  | "payment"
  | "shipping"
  | "email"
  | "customer"
  | "security"
  | "admin_permissions"
  | "financial";

export const SETTINGS_KEYS: readonly SettingsKey[] = [
  "general",
  "commerce",
  "payment",
  "shipping",
  "email",
  "customer",
  "security",
  "admin_permissions",
  "financial",
] as const;

export interface SystemSettingRecord {
  key: SettingsKey;
  value: unknown;
  updated_at: string;
  updated_by: number | null;
}

export interface GeneralSettings {
  store_name: string;
  store_description?: string;
  contact_email: string;
  support_phone?: string;
  store_address?: string;
  default_language: string;
  default_currency: string;
  timezone: string;
  date_format: string;
  maintenance_mode: boolean;
  store_active: boolean;
  logo_url?: string | null;
}

export interface CommerceSettings {
  vat_enabled: boolean;
  default_tax_rate: string;
  tax_mode: "inclusive" | "exclusive";
  min_order_amount: string;
  max_order_amount: string;
  free_shipping_threshold: string;
  allow_guest_checkout: boolean;
  allow_customer_registration: boolean;
  allow_multiple_addresses: boolean;
  order_cancellation_window_hours: number;
  return_window_days: number;
  refund_window_days: number;
  low_stock_threshold: number;
}

export interface PaymentSettings {
  enabled_methods: ("cod" | "card")[];
  cod_enabled: boolean;
  card_enabled: boolean;
  provider: "manual" | "stripe" | "paymob";
  provider_config: Record<string, unknown>;
  provider_secret_key?: string;
  webhook_secret?: string;
  test_mode: boolean;
  currency_restrictions: string[];
  payment_failure_behavior: "retry" | "hold" | "fail";
  min_transaction: string;
  max_transaction: string;
}

export interface ShippingZone {
  name: string;
  countries: string[];
  regions: string[];
}
export interface ShippingRate {
  zone: string;
  weight_max?: string;
  price: string;
}
export interface ShippingSettings {
  enabled_methods: string[];
  zones: ShippingZone[];
  rates: ShippingRate[];
  free_shipping_rules: Record<string, unknown>;
  estimated_delivery: { min_days: number; max_days: number };
  default_method: string;
  provider_config: Record<string, unknown>;
}

export interface EmailNotifications {
  order_placed: boolean;
  order_confirmed: boolean;
  order_shipped: boolean;
  order_delivered: boolean;
  order_cancelled: boolean;
  refund_issued: boolean;
  password_reset: boolean;
  new_registration: boolean;
  low_inventory: boolean;
  new_review: boolean;
  admin_security_alert: boolean;
}
export interface EmailSettings {
  sender_name: string;
  sender_email: string;
  provider: "resend" | "smtp" | "ses";
  provider_config: Record<string, unknown>;
  smtp_password?: string;
  notifications: EmailNotifications;
}

export interface CustomerSettings {
  allow_registration: boolean;
  require_email_verification: boolean;
  require_phone_verification: boolean;
  password_min_length: number;
  password_requirements: { upper: boolean; lower: boolean; digit: boolean; special: boolean };
  session_duration_ms: number;
  max_active_sessions: number;
  allow_account_deletion: boolean;
  allow_reviews: boolean;
  review_moderation: "auto" | "manual";
  purchase_gated_reviews: boolean;
}

export interface SecuritySettings {
  session_timeout_ms: number;
  admin_session_duration_ms: number;
  max_login_attempts: number;
  lockout_duration_ms: number;
  rate_limit: { window_ms: number; max: number };
  password_policy: { min_length: number; require_upper: boolean; require_lower: boolean; require_digit: boolean; require_special: boolean };
  require_email_verification: boolean;
  require_2fa_admins: boolean;
  login_notifications: boolean;
  suspicious_login_alerts: boolean;
}

export interface AdminPermissionsSettings {
  invite_enabled: boolean;
  require_2fa: boolean;
  force_password_reset: boolean;
  max_admins: number;
  last_login_tracking: boolean;
  active_sessions_tracking: boolean;
  permissions_matrix?: Record<string, unknown>;
}

export interface FinancialSettings {
  default_currency: string;
  tax_config: { mode: "inclusive" | "exclusive"; rate: string };
  payment_fee: { fixed: string; percent: string };
  refund_accounting: "credit" | "reverse";
  coupon_cost_attribution: "discount" | "marketing";
  default_reporting_period: "month" | "quarter" | "year" | "custom";
  fiscal_year_start: number;
  report_preferences: { granularity: "auto" | "day" | "month"; currency: string };
  expense_categories: string[];
}
