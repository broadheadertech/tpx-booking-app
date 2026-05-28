import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Returns the effective feature set for the current user's branch.
 *
 * Usage:
 *   const { features, isLoading, has } = useBranchFeatures();
 *   if (has('ai_mirror')) { ... }
 *
 * Notes:
 *   - Honors impersonation: when admin is mirroring branch X, returns X's features.
 *   - Super-admin / IT-admin without a branch get all features true (HQ view).
 *   - During load, has() returns false — gate fallback-safely.
 */
export function useBranchFeatures() {
  const { user, loading: userLoading } = useCurrentUser();

  const branchId = user?.branch_id;
  // HQ-only roles (no branch) — give them everything so platform tools render.
  const isHQRole =
    user?.role === "super_admin" ||
    user?._real_role === "super_admin" ||
    user?.role === "it_admin" ||
    user?._real_role === "it_admin";

  const data = useQuery(
    api.services.subscriptions.getEffectiveFeatures,
    branchId ? { branch_id: branchId } : "skip"
  );

  const features = data?.features || {};
  const isLoading = userLoading || (!!branchId && data === undefined);

  const has = (key) => {
    if (isHQRole && !branchId) return true;
    return !!features[key];
  };

  return {
    features,
    catalog: data?.catalog || [],
    packageName: data?.package_name || null,
    packageSlug: data?.package_slug || null,
    hasOverrides: !!data?.has_overrides,
    overrideCount: data?.override_count || 0,
    isLoading,
    has,
  };
}

export default useBranchFeatures;
