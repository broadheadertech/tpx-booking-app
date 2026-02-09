/**
 * Unified Authentication Helper
 * Supports both Clerk JWT authentication and legacy sessionToken authentication
 *
 * Usage in Convex functions:
 *   import { getAuthenticatedUser, requireAuthenticatedUser } from "./lib/unifiedAuth";
 *
 *   export const myMutation = mutation({
 *     args: { sessionToken: v.optional(v.string()) },
 *     handler: async (ctx, args) => {
 *       const user = await requireAuthenticatedUser(ctx, args.sessionToken);
 *       // ... proceed with authenticated user
 *     }
 *   });
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { getCurrentUser } from "./clerkAuth";

/**
 * Gets the authenticated user from either Clerk JWT or legacy session token
 *
 * Authentication priority:
 * 1. Clerk JWT token (via ctx.auth.getUserIdentity())
 * 2. Legacy session token (via sessions table lookup)
 *
 * @param ctx - Convex query or mutation context
 * @param sessionToken - Optional legacy session token for backwards compatibility
 * @returns Full user document if authenticated, null otherwise
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken?: string
): Promise<Doc<"users"> | null> {
  // Try Clerk authentication first
  const clerkUser = await getCurrentUser(ctx);
  if (clerkUser) {
    return clerkUser;
  }

  // Fall back to legacy session token authentication
  if (sessionToken) {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
      .first();

    if (session && session.expiresAt > Date.now()) {
      const user = await ctx.db.get(session.userId);
      return user;
    }
  }

  return null;
}

/**
 * Gets the authenticated user or throws an error if not authenticated
 *
 * @param ctx - Convex query or mutation context
 * @param sessionToken - Optional legacy session token
 * @returns Full user document (never null)
 * @throws ConvexError with code "UNAUTHENTICATED" if not logged in
 */
export async function requireAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken?: string
): Promise<Doc<"users">> {
  const user = await getAuthenticatedUser(ctx, sessionToken);

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be logged in to perform this action",
    });
  }

  return user;
}

/**
 * Requires the authenticated user to have super_admin role
 *
 * @param ctx - Convex query or mutation context
 * @param sessionToken - Optional legacy session token
 * @returns Full user document with super_admin role
 * @throws ConvexError if not authenticated or not super_admin
 */
export async function requireSuperAdmin(
  ctx: QueryCtx | MutationCtx,
  sessionToken?: string
): Promise<Doc<"users">> {
  const user = await requireAuthenticatedUser(ctx, sessionToken);

  if (user.role !== "super_admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Permission denied: Only super admins can perform this action",
    });
  }

  return user;
}

/**
 * Requires the authenticated user to have a specific role or higher
 *
 * Role hierarchy: super_admin > admin_staff > branch_admin > staff > barber > customer
 *
 * @param ctx - Convex query or mutation context
 * @param requiredRole - Minimum role required
 * @param sessionToken - Optional legacy session token
 * @returns Full user document
 * @throws ConvexError if not authenticated or insufficient role
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  requiredRole: string,
  sessionToken?: string
): Promise<Doc<"users">> {
  const user = await requireAuthenticatedUser(ctx, sessionToken);

  const roleHierarchy: Record<string, number> = {
    super_admin: 100,
    admin_staff: 90,
    branch_admin: 80,
    staff: 70,
    barber: 60,
    customer: 50,
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  if (userLevel < requiredLevel) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Permission denied: Requires ${requiredRole} role or higher`,
    });
  }

  return user;
}
