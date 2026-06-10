import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { logAudit } from "./auditLogs";

// ============================================================================
// IMPERSONATION SESSIONS
// Lets admin / super_admin / it_admin "mirror" a branch admin view of a
// specific branch, while every action is auto-tagged in audit logs so the
// real actor is always traceable.
// ============================================================================

// Who may "login as" another role.
const ALLOWED_ROLES = new Set(["super_admin", "it_admin"]);
// Roles that can be impersonated.
const TARGET_ROLES = new Set(["super_admin", "branch_admin", "staff", "barber"]);
// Impersonated roles that operate within a specific branch.
const BRANCH_SCOPED_ROLES = new Set(["branch_admin", "staff", "barber"]);

/**
 * Get the currently active impersonation session for a user, if any.
 */
export const getActiveImpersonation = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("impersonation_sessions")
      .withIndex("by_impersonator", (q) =>
        q.eq("impersonator_id", args.user_id).eq("is_active", true)
      )
      .order("desc")
      .first();
    return session ?? null;
  },
});

/**
 * Admin reporting: list all impersonation sessions for transparency reviews.
 */
export const listAllImpersonationSessions = query({
  args: {
    branch_id: v.optional(v.id("branches")),
    impersonator_id: v.optional(v.id("users")),
    only_active: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 500);

    let rows;
    if (args.impersonator_id) {
      rows = await ctx.db
        .query("impersonation_sessions")
        .withIndex("by_impersonator", (q) =>
          q.eq("impersonator_id", args.impersonator_id!)
        )
        .order("desc")
        .take(limit * 2);
    } else if (args.branch_id) {
      rows = await ctx.db
        .query("impersonation_sessions")
        .withIndex("by_branch", (q) => q.eq("target_branch_id", args.branch_id!))
        .order("desc")
        .take(limit * 2);
    } else {
      rows = await ctx.db
        .query("impersonation_sessions")
        .order("desc")
        .take(limit * 2);
    }

    if (args.only_active) {
      rows = rows.filter((r) => r.is_active);
    }

    return rows.slice(0, limit);
  },
});

/**
 * Start a new impersonation session. Auto-closes any prior active session
 * for the same user (only one mirror at a time).
 */
export const startImpersonation = mutation({
  args: {
    user_id: v.id("users"),
    target_role: v.optional(v.string()),       // defaults to branch_admin (legacy)
    target_branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) throw new Error("User not found");

    if (!user.role || !ALLOWED_ROLES.has(user.role)) {
      throw new Error("Only super_admin or it_admin can log in as another role");
    }

    const targetRole = args.target_role || "branch_admin";
    if (!TARGET_ROLES.has(targetRole)) {
      throw new Error(`Cannot act as role "${targetRole}".`);
    }

    // Branch-scoped roles require a target branch; super_admin does not.
    let targetBranch: any = null;
    if (BRANCH_SCOPED_ROLES.has(targetRole)) {
      if (!args.target_branch_id) {
        throw new Error(`Acting as ${targetRole} requires a target branch.`);
      }
      targetBranch = await ctx.db.get(args.target_branch_id);
      if (!targetBranch) throw new Error("Target branch not found");
    }

    const now = Date.now();

    // Close any existing active session for this user
    const existing = await ctx.db
      .query("impersonation_sessions")
      .withIndex("by_impersonator", (q) =>
        q.eq("impersonator_id", args.user_id).eq("is_active", true)
      )
      .collect();
    for (const old of existing) {
      await ctx.db.patch(old._id, {
        is_active: false,
        ended_at: now,
        end_reason: "superseded",
      });
    }

    const targetBranchName = targetBranch?.name || undefined;
    const sessionId = await ctx.db.insert("impersonation_sessions", {
      impersonator_id: args.user_id,
      impersonator_name: user.name || user.email || "Unknown",
      impersonator_role: user.role,
      target_role: targetRole,
      target_branch_id: args.target_branch_id,
      target_branch_name: targetBranchName,
      started_at: now,
      is_active: true,
      action_count: 0,
    });

    const where = targetBranchName ? ` at ${targetBranchName}` : "";
    await logAudit(ctx, {
      user_id: args.user_id,
      user_name: user.name,
      user_role: user.role,
      branch_id: args.target_branch_id,
      branch_name: targetBranchName,
      category: "auth",
      action: "impersonation.started",
      description: `${user.name || user.email} started acting as ${targetRole}${where}`,
      target_type: "impersonation",
      target_id: sessionId as string,
      metadata: { session_id: sessionId, target_role: targetRole },
    });

    return { session_id: sessionId, started_at: now, target_role: targetRole };
  },
});

/**
 * End the active impersonation session for a user.
 */
export const endImpersonation = mutation({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) throw new Error("User not found");

    const active = await ctx.db
      .query("impersonation_sessions")
      .withIndex("by_impersonator", (q) =>
        q.eq("impersonator_id", args.user_id).eq("is_active", true)
      )
      .order("desc")
      .first();

    if (!active) {
      return { ended: false, reason: "No active session" };
    }

    const now = Date.now();
    const durationMs = now - active.started_at;
    await ctx.db.patch(active._id, {
      is_active: false,
      ended_at: now,
      end_reason: "manual",
    });

    await logAudit(ctx, {
      user_id: args.user_id,
      user_name: user.name,
      user_role: user.role,
      branch_id: active.target_branch_id,
      branch_name: active.target_branch_name,
      category: "auth",
      action: "impersonation.ended",
      description: `${user.name || user.email} ended mirroring branch ${active.target_branch_name} (${active.action_count} actions, ${Math.round(durationMs / 1000)}s)`,
      target_type: "branch",
      target_id: active.target_branch_id,
      metadata: {
        session_id: active._id,
        duration_ms: durationMs,
        action_count: active.action_count,
      },
    });

    return { ended: true, session_id: active._id, duration_ms: durationMs, action_count: active.action_count };
  },
});

/**
 * Internal: increment the action counter for a session. Called automatically
 * from logAudit when impersonation context is detected.
 */
export const _bumpActionCount = mutation({
  args: { session_id: v.id("impersonation_sessions") },
  handler: async (ctx, args) => {
    const s = await ctx.db.get(args.session_id);
    if (!s || !s.is_active) return;
    await ctx.db.patch(args.session_id, {
      action_count: (s.action_count || 0) + 1,
    });
  },
});
