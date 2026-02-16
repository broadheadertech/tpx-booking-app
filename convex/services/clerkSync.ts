/**
 * Clerk Sync Service
 * Story 10.3: Webhook handlers for Clerk user events
 *
 * Handles Clerk webhook events to keep Convex users table in sync:
 * - user.created: Create or link user with clerk_user_id
 * - user.updated: Update user email/name from Clerk
 * - user.deleted: Soft delete user (preserve relationships)
 *
 * All mutations are idempotent - safe to receive duplicate webhooks.
 * Uses internal mutations for HTTP handler access.
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Clerk user payload from webhook events (user.created, user.updated)
 */
export interface ClerkUserPayload {
  id: string; // clerk_user_id (e.g., "user_2abc123def")
  email_addresses: Array<{
    email_address: string;
    id: string;
    verification?: { status: string };
  }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Clerk deleted user payload from user.deleted event
 */
export interface ClerkDeletedUserPayload {
  id: string; // clerk_user_id
  deleted: boolean;
}

/**
 * Clerk organization payload from webhook events (organization.created, etc.)
 */
export interface ClerkOrgPayload {
  id: string; // clerk_org_id (e.g., "org_2abc123def")
  name: string;
  slug: string;
  created_at: number;
  updated_at: number;
  members_count?: number;
  public_metadata?: {
    branch_id?: string; // Convex branch ID stored in Clerk org metadata
  };
}

/**
 * Clerk organization membership payload
 */
export interface ClerkOrgMembershipPayload {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  public_user_data: {
    user_id: string;
  };
  role: string;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// INTERNAL MUTATIONS (for HTTP handler access)
// ============================================================================

/**
 * Handle user.created webhook event
 *
 * Creates or links a user with clerk_user_id:
 * 1. Check if user already exists by clerk_user_id (idempotent)
 * 2. If user exists by email but no clerk_user_id, link them (migration)
 * 3. If new user, create with role "customer" by default
 *
 * @param payload - Clerk user webhook payload
 */
export const handleUserCreated = internalMutation({
  args: {
    payload: v.object({
      id: v.string(),
      email_addresses: v.array(
        v.object({
          email_address: v.string(),
          id: v.string(),
          verification: v.optional(
            v.object({
              status: v.string(),
            })
          ),
        })
      ),
      first_name: v.union(v.string(), v.null()),
      last_name: v.union(v.string(), v.null()),
      image_url: v.union(v.string(), v.null()),
      created_at: v.number(),
      updated_at: v.number(),
    }),
  },
  handler: async (ctx, { payload }) => {
    const clerk_user_id = payload.id;

    // Defensive handling: validate email_addresses array
    if (!payload.email_addresses || payload.email_addresses.length === 0) {
      console.warn("[ClerkSync] No email addresses in payload for:", clerk_user_id);
    }

    const primaryEmail =
      payload.email_addresses.find(
        (e) => e.verification?.status === "verified"
      )?.email_address || payload.email_addresses[0]?.email_address;
    const firstName = payload.first_name || "";
    const lastName = payload.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User";

    console.log("[ClerkSync] handleUserCreated:", {
      clerk_user_id,
      email: primaryEmail,
      name: fullName,
    });

    // 1. Check if user already exists by clerk_user_id (idempotent)
    const existingByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerk_user_id", clerk_user_id)
      )
      .first();

    if (existingByClerkId) {
      console.log(
        "[ClerkSync] User already exists with clerk_user_id:",
        existingByClerkId._id
      );
      return { success: true, userId: existingByClerkId._id, action: "exists" };
    }

    // 2. Check if user exists by email but no clerk_user_id (migration case)
    if (primaryEmail) {
      const existingByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", primaryEmail))
        .first();

      if (existingByEmail && !existingByEmail.clerk_user_id) {
        console.log(
          "[ClerkSync] Linking existing user by email:",
          existingByEmail._id
        );
        await ctx.db.patch(existingByEmail._id, {
          clerk_user_id,
          migration_status: "completed",
        });
        return {
          success: true,
          userId: existingByEmail._id,
          action: "linked",
        };
      }
    }

    // 3. Create new user with role "customer" by default
    // Generate unique username by appending clerk_user_id suffix if needed
    const baseUsername = primaryEmail?.split("@")[0] || clerk_user_id;
    const uniqueUsername = `${baseUsername}_${clerk_user_id.slice(-6)}`;

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: primaryEmail || `${clerk_user_id}@clerk.local`,
      username: uniqueUsername,
      nickname: fullName,
      password: "", // Clerk manages authentication - no local password
      mobile_number: "", // Can be updated later
      role: "customer", // Default role for new Clerk users
      clerk_user_id,
      migration_status: "completed",
      is_active: true,
      isVerified: true, // Clerk users are pre-verified
      skills: [], // Empty skills array for customers
      createdAt: now,
      updatedAt: now,
    });

    // =========================================================================
    // INITIALIZE LOYALTY DATA FOR NEW CUSTOMERS
    // Creates wallet and points ledger with 0 balance (fresh start)
    // =========================================================================

    // Create wallet with 0 balance (fresh start for new customers)
    await ctx.db.insert("wallets", {
      user_id: userId,
      balance: 0, // ₱0.00 in centavos
      bonus_balance: 0, // ₱0.00 bonus
      currency: "PHP",
      createdAt: now,
      updatedAt: now,
    });

    // Create points ledger with 0 points (Bronze tier - starting tier)
    await ctx.db.insert("points_ledger", {
      user_id: userId,
      current_balance: 0, // 0 points (×100 format)
      lifetime_earned: 0, // 0 points total
      lifetime_redeemed: 0, // 0 points redeemed
      last_activity_at: now,
    });

    console.log("[ClerkSync] Initialized loyalty data for new customer:", {
      userId,
      wallet: "₱0.00",
      points: "0 pts",
      tier: "Bronze",
    });

    // Audit log: User created via Clerk webhook
    console.log("[ClerkSync] AUDIT: User created via webhook", {
      userId,
      clerk_user_id,
      email: primaryEmail,
      action: "user_created_via_clerk",
      timestamp: now,
    });

    console.log("[ClerkSync] Created new user:", userId);
    return { success: true, userId, action: "created", loyaltyInitialized: true };
  },
});

/**
 * Handle user.updated webhook event
 *
 * Updates user email and name from Clerk payload.
 * Logs warning if user not found (don't error to prevent webhook retries).
 *
 * @param payload - Clerk user webhook payload
 */
export const handleUserUpdated = internalMutation({
  args: {
    payload: v.object({
      id: v.string(),
      email_addresses: v.array(
        v.object({
          email_address: v.string(),
          id: v.string(),
          verification: v.optional(
            v.object({
              status: v.string(),
            })
          ),
        })
      ),
      first_name: v.union(v.string(), v.null()),
      last_name: v.union(v.string(), v.null()),
      image_url: v.union(v.string(), v.null()),
      created_at: v.number(),
      updated_at: v.number(),
    }),
  },
  handler: async (ctx, { payload }) => {
    const clerk_user_id = payload.id;

    // Defensive handling: validate email_addresses array
    if (!payload.email_addresses || payload.email_addresses.length === 0) {
      console.warn("[ClerkSync] No email addresses in update payload for:", clerk_user_id);
    }

    const primaryEmail =
      payload.email_addresses.find(
        (e) => e.verification?.status === "verified"
      )?.email_address || payload.email_addresses[0]?.email_address;
    const firstName = payload.first_name || "";
    const lastName = payload.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    console.log("[ClerkSync] handleUserUpdated:", {
      clerk_user_id,
      email: primaryEmail,
      name: fullName,
    });

    // Find user by clerk_user_id
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerk_user_id", clerk_user_id)
      )
      .first();

    if (!user) {
      console.warn(
        "[ClerkSync] User not found for clerk_user_id:",
        clerk_user_id
      );
      // Don't throw - return success to prevent webhook retries
      return { success: true, action: "not_found" };
    }

    // Update user with new email and name
    const updates: Record<string, unknown> = {};
    if (primaryEmail && primaryEmail !== user.email) {
      updates.email = primaryEmail;
    }
    if (fullName && fullName !== user.nickname) {
      updates.nickname = fullName;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
      console.log("[ClerkSync] Updated user:", user._id, updates);

      // Audit log: User updated via Clerk webhook
      console.log("[ClerkSync] AUDIT: User updated via webhook", {
        userId: user._id,
        clerk_user_id,
        updates,
        action: "user_updated_via_clerk",
        timestamp: Date.now(),
      });

      return { success: true, userId: user._id, action: "updated", updates };
    }

    console.log("[ClerkSync] No changes for user:", user._id);
    return { success: true, userId: user._id, action: "no_changes" };
  },
});

/**
 * Handle user.deleted webhook event
 *
 * Soft deletes user by setting is_active = false.
 * NEVER hard delete to preserve booking/payment history relationships.
 *
 * @param payload - Clerk deleted user webhook payload
 */
export const handleUserDeleted = internalMutation({
  args: {
    payload: v.object({
      id: v.string(),
      deleted: v.boolean(),
    }),
  },
  handler: async (ctx, { payload }) => {
    const clerk_user_id = payload.id;

    console.log("[ClerkSync] handleUserDeleted:", { clerk_user_id });

    // Find user by clerk_user_id
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerk_user_id", clerk_user_id)
      )
      .first();

    if (!user) {
      console.warn(
        "[ClerkSync] User not found for deletion, clerk_user_id:",
        clerk_user_id
      );
      // Don't throw - return success to prevent webhook retries
      return { success: true, action: "not_found" };
    }

    // Soft delete - set is_active to false
    // NEVER hard delete to preserve booking/payment relationships
    await ctx.db.patch(user._id, {
      is_active: false,
    });

    console.log("[ClerkSync] Soft deleted user:", user._id);

    // Send account suspension email
    if (user.email) {
      try {
        await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationEmail, {
          notification_type: "account_banned",
          to_email: user.email,
          to_name: (user as any).nickname || (user as any).username || "Customer",
          variables: {
            customer_name: (user as any).nickname || (user as any).username || "there",
            reason: "Your account has been removed by an administrator.",
          },
        });
      } catch (e) { console.error("[CLERK_SYNC] Account banned email failed:", e); }
    }

    // Audit log: User soft deleted via Clerk webhook
    console.log("[ClerkSync] AUDIT: User soft deleted via webhook", {
      userId: user._id,
      clerk_user_id,
      email: user.email,
      action: "user_deleted_via_clerk",
      timestamp: Date.now(),
    });

    return { success: true, userId: user._id, action: "soft_deleted" };
  },
});

// ============================================================================
// ORGANIZATION WEBHOOK HANDLERS (Story 13-1)
// ============================================================================

/**
 * Handle organization.created webhook event
 *
 * Links a Clerk Organization to an existing branch if:
 * 1. The organization has a branch_id in public_metadata (created via our API)
 * 2. OR a branch exists with matching name (externally created org)
 *
 * @param payload - Clerk organization webhook payload
 */
export const handleOrgCreated = internalMutation({
  args: {
    payload: v.object({
      id: v.string(),
      name: v.string(),
      slug: v.string(),
      created_at: v.number(),
      updated_at: v.number(),
      members_count: v.optional(v.number()),
      public_metadata: v.optional(
        v.object({
          branch_id: v.optional(v.string()),
        })
      ),
    }),
  },
  handler: async (ctx, { payload }) => {
    const clerk_org_id = payload.id;

    console.log("[ClerkSync] handleOrgCreated:", {
      clerk_org_id,
      name: payload.name,
      slug: payload.slug,
      branch_id_metadata: payload.public_metadata?.branch_id,
    });

    // 1. Check if org already linked to a branch
    const existingByClerkOrgId = await ctx.db
      .query("branches")
      .filter((q) => q.eq(q.field("clerk_org_id"), clerk_org_id))
      .first();

    if (existingByClerkOrgId) {
      console.log(
        "[ClerkSync] Organization already linked to branch:",
        existingByClerkOrgId._id
      );
      return { success: true, branchId: existingByClerkOrgId._id, action: "already_linked" };
    }

    // 2. Check if branch_id is in metadata (created via our createBranch mutation)
    if (payload.public_metadata?.branch_id) {
      const branchId = payload.public_metadata.branch_id as any; // Convex ID from metadata
      const branch = await ctx.db.get(branchId);

      if (branch && !branch.clerk_org_id) {
        await ctx.db.patch(branchId, {
          clerk_org_id,
          updatedAt: Date.now(),
        });
        console.log("[ClerkSync] Linked organization to branch via metadata:", branchId);
        return { success: true, branchId, action: "linked_via_metadata" };
      }
    }

    // 3. Try to match by name (for externally created organizations)
    const branchByName = await ctx.db
      .query("branches")
      .filter((q) =>
        q.and(
          q.eq(q.field("name"), payload.name),
          q.eq(q.field("clerk_org_id"), undefined)
        )
      )
      .first();

    if (branchByName) {
      await ctx.db.patch(branchByName._id, {
        clerk_org_id,
        updatedAt: Date.now(),
      });
      console.log("[ClerkSync] Linked organization to branch by name:", branchByName._id);

      // Audit log
      console.log("[ClerkSync] AUDIT: Organization linked via webhook", {
        branchId: branchByName._id,
        clerk_org_id,
        matchedBy: "name",
        action: "org_linked_via_webhook",
        timestamp: Date.now(),
      });

      return { success: true, branchId: branchByName._id, action: "linked_by_name" };
    }

    // 4. No matching branch found - log for manual review
    console.log("[ClerkSync] No matching branch found for organization:", {
      clerk_org_id,
      name: payload.name,
    });
    return { success: true, action: "no_match" };
  },
});

/**
 * Handle organization.updated webhook event
 *
 * Currently logs the update - can be extended to sync org name changes to branch name.
 *
 * @param payload - Clerk organization webhook payload
 */
export const handleOrgUpdated = internalMutation({
  args: {
    payload: v.object({
      id: v.string(),
      name: v.string(),
      slug: v.string(),
      created_at: v.number(),
      updated_at: v.number(),
      members_count: v.optional(v.number()),
      public_metadata: v.optional(
        v.object({
          branch_id: v.optional(v.string()),
        })
      ),
    }),
  },
  handler: async (ctx, { payload }) => {
    const clerk_org_id = payload.id;

    console.log("[ClerkSync] handleOrgUpdated:", {
      clerk_org_id,
      name: payload.name,
    });

    // Find linked branch
    const branch = await ctx.db
      .query("branches")
      .filter((q) => q.eq(q.field("clerk_org_id"), clerk_org_id))
      .first();

    if (!branch) {
      console.log("[ClerkSync] No branch linked to organization:", clerk_org_id);
      return { success: true, action: "not_found" };
    }

    // Log the update - name sync could be added here if needed
    console.log("[ClerkSync] Organization updated for branch:", branch._id);
    return { success: true, branchId: branch._id, action: "logged" };
  },
});

/**
 * Handle organization.deleted webhook event
 *
 * Removes the clerk_org_id from the linked branch (does NOT delete the branch).
 *
 * @param payload - Clerk organization deleted webhook payload
 */
export const handleOrgDeleted = internalMutation({
  args: {
    payload: v.object({
      id: v.string(),
      deleted: v.boolean(),
    }),
  },
  handler: async (ctx, { payload }) => {
    const clerk_org_id = payload.id;

    console.log("[ClerkSync] handleOrgDeleted:", { clerk_org_id });

    // Find linked branch
    const branch = await ctx.db
      .query("branches")
      .filter((q) => q.eq(q.field("clerk_org_id"), clerk_org_id))
      .first();

    if (!branch) {
      console.log("[ClerkSync] No branch linked to deleted organization:", clerk_org_id);
      return { success: true, action: "not_found" };
    }

    // Remove clerk_org_id from branch (don't delete the branch)
    await ctx.db.patch(branch._id, {
      clerk_org_id: undefined,
      updatedAt: Date.now(),
    });

    console.log("[ClerkSync] Unlinked organization from branch:", branch._id);

    // Audit log
    console.log("[ClerkSync] AUDIT: Organization unlinked via webhook", {
      branchId: branch._id,
      clerk_org_id,
      action: "org_unlinked_via_webhook",
      timestamp: Date.now(),
    });

    return { success: true, branchId: branch._id, action: "unlinked" };
  },
});

/**
 * Handle organizationMembership.created webhook event
 *
 * When a user is added to a Clerk Organization, update their branch_id in Convex.
 *
 * @param payload - Clerk organization membership webhook payload
 */
export const handleOrgMembershipCreated = internalMutation({
  args: {
    payload: v.object({
      id: v.string(),
      organization: v.object({
        id: v.string(),
        name: v.string(),
        slug: v.string(),
      }),
      public_user_data: v.object({
        user_id: v.string(),
      }),
      role: v.string(),
      created_at: v.number(),
      updated_at: v.number(),
    }),
  },
  handler: async (ctx, { payload }) => {
    const clerk_org_id = payload.organization.id;
    const clerk_user_id = payload.public_user_data.user_id;

    console.log("[ClerkSync] handleOrgMembershipCreated:", {
      clerk_org_id,
      clerk_user_id,
      role: payload.role,
    });

    // Find the branch linked to this organization
    const branch = await ctx.db
      .query("branches")
      .filter((q) => q.eq(q.field("clerk_org_id"), clerk_org_id))
      .first();

    if (!branch) {
      console.log("[ClerkSync] No branch found for organization:", clerk_org_id);
      return { success: true, action: "no_branch" };
    }

    // Find the user by clerk_user_id
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", clerk_user_id))
      .first();

    if (!user) {
      console.log("[ClerkSync] User not found for clerk_user_id:", clerk_user_id);
      return { success: true, action: "user_not_found" };
    }

    // Update user's branch_id
    await ctx.db.patch(user._id, {
      branch_id: branch._id,
      updatedAt: Date.now(),
    });

    console.log("[ClerkSync] Updated user branch assignment:", {
      userId: user._id,
      branchId: branch._id,
    });

    // Audit log
    console.log("[ClerkSync] AUDIT: User branch assigned via org membership", {
      userId: user._id,
      branchId: branch._id,
      clerk_org_id,
      clerk_user_id,
      action: "branch_assigned_via_membership",
      timestamp: Date.now(),
    });

    return { success: true, userId: user._id, branchId: branch._id, action: "assigned" };
  },
});

/**
 * Handle organizationMembership.deleted webhook event
 *
 * When a user is removed from a Clerk Organization, remove their branch_id.
 *
 * @param payload - Clerk organization membership deleted webhook payload
 */
export const handleOrgMembershipDeleted = internalMutation({
  args: {
    payload: v.object({
      id: v.string(),
      organization: v.object({
        id: v.string(),
        name: v.string(),
        slug: v.string(),
      }),
      public_user_data: v.object({
        user_id: v.string(),
      }),
      role: v.string(),
      created_at: v.number(),
      updated_at: v.number(),
    }),
  },
  handler: async (ctx, { payload }) => {
    const clerk_org_id = payload.organization.id;
    const clerk_user_id = payload.public_user_data.user_id;

    console.log("[ClerkSync] handleOrgMembershipDeleted:", {
      clerk_org_id,
      clerk_user_id,
    });

    // Find the user by clerk_user_id
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", clerk_user_id))
      .first();

    if (!user) {
      console.log("[ClerkSync] User not found for clerk_user_id:", clerk_user_id);
      return { success: true, action: "user_not_found" };
    }

    // Find the branch linked to this organization
    const branch = await ctx.db
      .query("branches")
      .filter((q) => q.eq(q.field("clerk_org_id"), clerk_org_id))
      .first();

    // Only remove branch_id if user is currently assigned to this branch
    if (branch && user.branch_id === branch._id) {
      await ctx.db.patch(user._id, {
        branch_id: undefined,
        updatedAt: Date.now(),
      });

      console.log("[ClerkSync] Removed user branch assignment:", {
        userId: user._id,
        previousBranchId: branch._id,
      });

      // Audit log
      console.log("[ClerkSync] AUDIT: User branch unassigned via org membership removal", {
        userId: user._id,
        branchId: branch._id,
        clerk_org_id,
        clerk_user_id,
        action: "branch_unassigned_via_membership_removal",
        timestamp: Date.now(),
      });

      return { success: true, userId: user._id, action: "unassigned" };
    }

    return { success: true, action: "no_change" };
  },
});
