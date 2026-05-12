/**
 * Canonical feature catalog for subscription packages.
 *
 * Each feature key is a stable identifier used in:
 *   - subscription_packages.features  (map of key → boolean)
 *   - subscriptions.feature_overrides (per-branch overrides)
 *   - useBranchFeatures() in the frontend (gate UI)
 *
 * Add new features here as a single source of truth. The IT admin UI reads
 * this catalog to render toggles automatically — no UI edits needed.
 */

export type FeatureKey =
  | "ai_mirror"
  | "avexa_ai_email"
  | "loyalty_program"
  | "customer_wallet"
  | "branch_wallet"
  | "kiosk_attendance"
  | "face_recognition_attendance"
  | "email_marketing"
  | "vouchers"
  | "referrals"
  | "membership_cards"
  | "branch_analytics"
  | "customer_analytics"
  | "multi_branch_hq"
  | "whitelabel_branding"
  | "desktop_notifications"
  | "audit_logs"
  | "product_catalog"
  | "delivery_orders"
  | "damage_claims";

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  description: string;
  category: "Operations" | "Marketing" | "Finance" | "Insights" | "Platform";
}

export const FEATURE_CATALOG: FeatureDef[] = [
  // Operations
  { key: "product_catalog", label: "Product Catalog", description: "Branch product inventory + POS retail items", category: "Operations" },
  { key: "kiosk_attendance", label: "Kiosk Attendance", description: "Standalone tablet kiosk for staff clock-in/out", category: "Operations" },
  { key: "face_recognition_attendance", label: "Face Recognition Attendance", description: "FR-based clock-in (requires Kiosk Attendance)", category: "Operations" },
  { key: "delivery_orders", label: "Delivery Orders", description: "Branch order requests + HQ shipping flow", category: "Operations" },
  { key: "damage_claims", label: "Damage Claims", description: "File damage / loss claims against HQ shipments", category: "Operations" },

  // Marketing
  { key: "ai_mirror", label: "AI Mirror", description: "Virtual hairstyle try-on for customers", category: "Marketing" },
  { key: "avexa_ai_email", label: "Avexa (AI Email Composer)", description: "Gemini-powered email campaign generation", category: "Marketing" },
  { key: "email_marketing", label: "Email Marketing", description: "Campaign creation, sending, scheduling", category: "Marketing" },
  { key: "loyalty_program", label: "Loyalty Program", description: "Points, tiers, and rewards for customers", category: "Marketing" },
  { key: "vouchers", label: "Vouchers", description: "Voucher creation, distribution, and POS redemption", category: "Marketing" },
  { key: "referrals", label: "Referrals", description: "Customer-to-customer referral incentives", category: "Marketing" },
  { key: "membership_cards", label: "Membership Cards", description: "Paid membership cards with perks", category: "Marketing" },
  { key: "desktop_notifications", label: "Desktop Notifications", description: "Native browser notifications for staff/admin", category: "Marketing" },

  // Finance
  { key: "customer_wallet", label: "Customer Wallet", description: "Customer-facing top-up wallet + wallet payments at POS", category: "Finance" },
  { key: "branch_wallet", label: "Branch Wallet", description: "Branch-side wallet earnings, settlements, top-up flow", category: "Finance" },

  // Insights
  { key: "branch_analytics", label: "Branch Analytics", description: "Per-branch P&L, transactions, performance reports", category: "Insights" },
  { key: "customer_analytics", label: "Customer Analytics", description: "Customer behavior, retention, churn analysis", category: "Insights" },
  { key: "audit_logs", label: "Audit Logs", description: "Full system action log viewer", category: "Insights" },

  // Platform
  { key: "multi_branch_hq", label: "Multi-Branch HQ Tools", description: "Franchise HQ dashboards, royalty, branch mirror", category: "Platform" },
  { key: "whitelabel_branding", label: "White-Label Branding", description: "Custom logo, colors, email sender, domain", category: "Platform" },
];

export const FEATURE_KEYS: FeatureKey[] = FEATURE_CATALOG.map((f) => f.key);

/** Merge a package's features with a branch's per-feature overrides. */
export function mergeFeatures(
  packageFeatures: Record<string, boolean> | undefined,
  overrides: Record<string, boolean> | undefined
): Record<FeatureKey, boolean> {
  const result = {} as Record<FeatureKey, boolean>;
  for (const def of FEATURE_CATALOG) {
    const fromPkg = packageFeatures?.[def.key];
    const fromOverride = overrides?.[def.key];
    // Override (if explicitly set) wins. Otherwise fall back to package. Default off.
    if (typeof fromOverride === "boolean") {
      result[def.key] = fromOverride;
    } else if (typeof fromPkg === "boolean") {
      result[def.key] = fromPkg;
    } else {
      result[def.key] = false;
    }
  }
  return result;
}
