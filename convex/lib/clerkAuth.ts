/**
 * Clerk Authentication Helpers
 * Story 10.2: Provides server-side JWT verification and user lookup utilities
 *
 * Usage in Convex functions:
 *   import { verifyClerkToken, getCurrentUser } from "./lib/clerkAuth";
 *
 *   export const myMutation = mutation({
 *     handler: async (ctx) => {
 *       const user = await getCurrentUser(ctx);
 *       if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
 *       // ... proceed with authenticated user
 *     }
 *   });
 */

import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { ConvexError } from "convex/values";

/**
 * Represents the authenticated Clerk user identity from JWT token
 */
export interface ClerkUser {
  /** Clerk's unique user identifier (maps to clerk_user_id in users table) */
  clerk_user_id: string;
  /** User's email address (may be undefined if not provided) */
  email?: string;
  /** User's display name (may be undefined if not provided) */
  name?: string;
}

/**
 * Verifies the Clerk JWT token and extracts user identity
 *
 * This function uses Convex's built-in auth integration with Clerk.
 * It validates the JWT token automatically when ConvexProviderWithClerk is used.
 *
 * @param ctx - Convex query, mutation, or action context
 * @returns ClerkUser object if authenticated, null otherwise
 *
 * @example
 * const clerkUser = await verifyClerkToken(ctx);
 * if (!clerkUser) {
 *   throw new ConvexError({ code: "UNAUTHENTICATED", message: "Please log in" });
 * }
 */
export async function verifyClerkToken(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<ClerkUser | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  return {
    clerk_user_id: identity.subject,
    email: identity.email,
    name: identity.name,
  };
}

/**
 * Gets the current authenticated user from the database
 *
 * This function:
 * 1. Verifies the Clerk JWT token
 * 2. Looks up the user in the database by clerk_user_id
 * 3. Returns the full user document or null
 *
 * Uses the `by_clerk_user_id` index created in Story 10.1 for efficient lookup.
 *
 * @param ctx - Convex query or mutation context (not action - no db access)
 * @returns Full user document if found, null if not authenticated or user not found
 *
 * @example
 * const user = await getCurrentUser(ctx);
 * if (!user) {
 *   throw new ConvexError({ code: "UNAUTHENTICATED", message: "User not found" });
 * }
 * // user.role, user.branch_id, user.page_access_v2, etc. are available
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const clerkUser = await verifyClerkToken(ctx);

  if (!clerkUser) {
    return null;
  }

  // Query users table using the by_clerk_user_id index (Story 10.1)
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) =>
      q.eq("clerk_user_id", clerkUser.clerk_user_id)
    )
    .first();

  return user;
}

/**
 * Gets the current user or throws an error if not authenticated
 *
 * Convenience wrapper that throws a ConvexError if the user is not found.
 * Use this when authentication is required for the operation.
 *
 * @param ctx - Convex query or mutation context
 * @returns Full user document (never null)
 * @throws ConvexError with code "UNAUTHENTICATED" if not logged in
 *
 * @example
 * const user = await requireCurrentUser(ctx);
 * // Guaranteed to have a user at this point
 */
export async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be logged in to perform this action",
    });
  }

  return user;
}
