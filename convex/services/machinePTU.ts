/**
 * BIR Machine PTU (Permit to Use) service.
 *
 * One POS-machine registration per branch, gated by a universal super/IT-admin
 * approval. A branch only counts as "BIR-accredited" — and its POS only prints
 * a valid INVOICE — once its machine PTU is APPROVED. Branch admins set up and
 * submit their machine; super_admin / it_admin approve, reject, or revoke.
 *
 * @module convex/services/machinePTU
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { logAudit } from "./auditLogs";

const SETUP_ROLES = new Set(["admin", "branch_admin", "super_admin", "it_admin"]);
const APPROVER_ROLES = new Set(["super_admin", "it_admin"]);

async function getActor(ctx: any, userId: any) {
  const u = await ctx.db.get(userId);
  if (!u) throw new Error("User not found.");
  return u;
}

// Content fields that, when edited, invalidate an existing approval.
const CONTENT_KEYS = [
  "min",
  "serial_number",
  "ptu_number",
  "ptu_date",
  "accreditation_number",
  "accreditation_date",
  "software_provider_name",
  "software_provider_tin",
  "software_provider_accreditation",
  "software_provider_date_issued",
  "notes",
] as const;

// ============================================================================
// QUERIES
// ============================================================================

/** The branch's single machine PTU record (or null if never set up). */
export const getMachinePTUByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("machine_ptu")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
  },
});

/** The branch's APPROVED machine PTU, or null. Used to decide accreditation. */
export const getApprovedMachinePTU = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const m = await ctx.db
      .query("machine_ptu")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
    return m && m.status === "approved" ? m : null;
  },
});

/** Universal queue: every branch's machine PTU, enriched with branch name. */
export const listMachinePTUs = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("revoked")
      )
    ),
  },
  handler: async (ctx, args) => {
    let rows;
    if (args.status) {
      rows = await ctx.db
        .query("machine_ptu")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      rows = await ctx.db.query("machine_ptu").collect();
    }
    const enriched = await Promise.all(
      rows.map(async (m) => {
        const branch = await ctx.db.get(m.branch_id);
        return {
          ...m,
          branch_name: branch?.name || "Unknown Branch",
          branch_code: (branch as any)?.branch_code || "",
          branch_type: (branch as any)?.branch_type || "tipuno_x",
        };
      })
    );
    // Pending first, then by most recently updated
    const order: Record<string, number> = {
      pending: 0,
      draft: 1,
      rejected: 2,
      approved: 3,
      revoked: 4,
    };
    return enriched.sort(
      (a, b) =>
        (order[a.status] ?? 9) - (order[b.status] ?? 9) ||
        b.updated_at - a.updated_at
    );
  },
});

// ============================================================================
// SETUP (branch-side)
// ============================================================================

/**
 * Create or update the branch's machine PTU details. Editing any content field
 * resets the record to "draft" and clears prior approval, so an approved
 * machine always reflects exactly what was approved.
 */
export const upsertMachinePTU = mutation({
  args: {
    branch_id: v.id("branches"),
    actor_id: v.id("users"),
    min: v.optional(v.string()),
    serial_number: v.optional(v.string()),
    ptu_number: v.optional(v.string()),
    ptu_date: v.optional(v.string()),
    accreditation_number: v.optional(v.string()),
    accreditation_date: v.optional(v.string()),
    software_provider_name: v.optional(v.string()),
    software_provider_tin: v.optional(v.string()),
    software_provider_accreditation: v.optional(v.string()),
    software_provider_date_issued: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx, args.actor_id);
    if (!SETUP_ROLES.has(actor.role)) throw new Error("Not authorized to set up a machine PTU.");
    // Branch-scoped roles may only set up their own branch.
    if (
      (actor.role === "branch_admin" || actor.role === "admin") &&
      String(actor.branch_id) !== String(args.branch_id)
    ) {
      throw new Error("You can only set up the machine PTU for your own branch.");
    }

    const now = Date.now();
    const fields: Record<string, any> = {};
    for (const k of CONTENT_KEYS) {
      if ((args as any)[k] !== undefined) fields[k] = (args as any)[k];
    }

    const existing = await ctx.db
      .query("machine_ptu")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (existing) {
      // Editing resets to draft and clears the approval trail.
      await ctx.db.patch(existing._id, {
        ...fields,
        status: "draft",
        approved_at: undefined,
        approved_by: undefined,
        approval_notes: undefined,
        rejected_at: undefined,
        rejected_by: undefined,
        rejection_reason: undefined,
        updated_at: now,
      });
      return { machine_ptu_id: existing._id, status: "draft" as const };
    }

    const id = await ctx.db.insert("machine_ptu", {
      branch_id: args.branch_id,
      ...fields,
      status: "draft",
      created_by: args.actor_id,
      created_at: now,
      updated_at: now,
    });
    return { machine_ptu_id: id, status: "draft" as const };
  },
});

/** Submit the branch's machine PTU for universal approval (draft/rejected → pending). */
export const submitMachinePTU = mutation({
  args: { branch_id: v.id("branches"), actor_id: v.id("users") },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx, args.actor_id);
    if (!SETUP_ROLES.has(actor.role)) throw new Error("Not authorized.");
    if (
      (actor.role === "branch_admin" || actor.role === "admin") &&
      String(actor.branch_id) !== String(args.branch_id)
    ) {
      throw new Error("You can only submit your own branch's machine PTU.");
    }

    const m = await ctx.db
      .query("machine_ptu")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
    if (!m) throw new Error("No machine PTU set up for this branch yet.");
    if (m.status === "pending") throw new Error("Already submitted and awaiting approval.");
    if (m.status === "approved") throw new Error("This machine PTU is already approved.");

    // Minimum BIR fields required before approval can be requested.
    const missing: string[] = [];
    if (!m.min) missing.push("MIN");
    if (!m.serial_number) missing.push("Serial No.");
    if (!m.ptu_number) missing.push("PTU No.");
    if (!m.accreditation_number) missing.push("Accreditation No.");
    if (missing.length) {
      throw new Error(`Fill in required fields before submitting: ${missing.join(", ")}.`);
    }

    const now = Date.now();
    await ctx.db.patch(m._id, {
      status: "pending",
      submitted_at: now,
      submitted_by: args.actor_id,
      // clear any prior rejection
      rejected_at: undefined,
      rejected_by: undefined,
      rejection_reason: undefined,
      updated_at: now,
    });

    await logAudit(ctx, {
      user_id: args.actor_id as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: args.branch_id as any,
      category: "settings",
      action: "machine_ptu.submitted",
      description: `Submitted machine PTU "${m.ptu_number}" for approval`,
      target_type: "machine_ptu",
      target_id: m._id as string,
    });

    return { success: true, status: "pending" as const };
  },
});

// ============================================================================
// APPROVAL (universal — super_admin / it_admin)
// ============================================================================

async function requireApprover(ctx: any, userId: any) {
  const actor = await getActor(ctx, userId);
  if (!APPROVER_ROLES.has(actor.role)) {
    throw new Error("Only super admin or IT admin can approve machine PTUs.");
  }
  return actor;
}

export const approveMachinePTU = mutation({
  args: {
    machine_ptu_id: v.id("machine_ptu"),
    actor_id: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireApprover(ctx, args.actor_id);
    const m = await ctx.db.get(args.machine_ptu_id);
    if (!m) throw new Error("Machine PTU not found.");
    if (m.status !== "pending") throw new Error("Only a pending machine PTU can be approved.");

    const now = Date.now();
    await ctx.db.patch(m._id, {
      status: "approved",
      approved_at: now,
      approved_by: args.actor_id,
      approval_notes: args.notes,
      updated_at: now,
    });

    await logAudit(ctx, {
      user_id: args.actor_id as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: m.branch_id as any,
      category: "settings",
      action: "machine_ptu.approved",
      description: `Approved machine PTU "${m.ptu_number}" (accredited)`,
      target_type: "machine_ptu",
      target_id: m._id as string,
    });

    return { success: true, status: "approved" as const };
  },
});

export const rejectMachinePTU = mutation({
  args: {
    machine_ptu_id: v.id("machine_ptu"),
    actor_id: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireApprover(ctx, args.actor_id);
    const m = await ctx.db.get(args.machine_ptu_id);
    if (!m) throw new Error("Machine PTU not found.");
    if (m.status !== "pending") throw new Error("Only a pending machine PTU can be rejected.");
    if (!args.reason.trim()) throw new Error("A rejection reason is required.");

    const now = Date.now();
    await ctx.db.patch(m._id, {
      status: "rejected",
      rejected_at: now,
      rejected_by: args.actor_id,
      rejection_reason: args.reason.trim(),
      updated_at: now,
    });

    await logAudit(ctx, {
      user_id: args.actor_id as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: m.branch_id as any,
      category: "settings",
      action: "machine_ptu.rejected",
      description: `Rejected machine PTU "${m.ptu_number}": ${args.reason.trim()}`,
      target_type: "machine_ptu",
      target_id: m._id as string,
    });

    return { success: true, status: "rejected" as const };
  },
});

export const revokeMachinePTU = mutation({
  args: {
    machine_ptu_id: v.id("machine_ptu"),
    actor_id: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireApprover(ctx, args.actor_id);
    const m = await ctx.db.get(args.machine_ptu_id);
    if (!m) throw new Error("Machine PTU not found.");
    if (m.status !== "approved") throw new Error("Only an approved machine PTU can be revoked.");
    if (!args.reason.trim()) throw new Error("A revoke reason is required.");

    const now = Date.now();
    await ctx.db.patch(m._id, {
      status: "revoked",
      revoked_at: now,
      revoked_by: args.actor_id,
      revoke_reason: args.reason.trim(),
      updated_at: now,
    });

    await logAudit(ctx, {
      user_id: args.actor_id as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: m.branch_id as any,
      category: "settings",
      action: "machine_ptu.revoked",
      description: `Revoked accreditation for machine PTU "${m.ptu_number}": ${args.reason.trim()}`,
      target_type: "machine_ptu",
      target_id: m._id as string,
    });

    return { success: true, status: "revoked" as const };
  },
});
