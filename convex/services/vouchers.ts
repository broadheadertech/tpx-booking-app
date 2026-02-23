import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { logAudit } from "./auditLogs";

// Generate a random voucher code
function generateVoucherCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a unique per-user assignment code: VOUCHERCODE-XXXX
function generateAssignmentCode(voucherCode: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${voucherCode}-${suffix}`;
}

// Get all vouchers with assignment statistics (for super admin)
export const getAllVouchers = query({
  args: {},
  handler: async (ctx) => {
    const vouchers = await ctx.db.query("vouchers").collect();

    // Enrich vouchers with user information and assignment statistics
    const enrichedVouchers = await Promise.all(
      vouchers.map(async (voucher) => {
        const createdBy = voucher.created_by ? await ctx.db.get(voucher.created_by) : null;

        // Get assignment statistics
        const assignments = await ctx.db
          .query("user_vouchers")
          .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
          .collect();

        const assignedCount = assignments.length;
        const redeemedCount = assignments.filter(a => a.status === "redeemed").length;

        return {
          ...voucher,
          id: voucher._id,
          created_by_username: createdBy?.username || 'Unknown',
          assignedCount,
          redeemedCount,
          availableCount: voucher.max_uses - assignedCount,
          isExpired: voucher.expires_at < Date.now(),
          isFullyAssigned: assignedCount >= voucher.max_uses,
          formattedValue: `₱${parseFloat(voucher.value.toString()).toFixed(2)}`,
          formattedExpiresAt: new Date(voucher.expires_at).toLocaleDateString(),
          status: voucher.status || "active", // Default to active for legacy vouchers
          rejection_reason: voucher.rejection_reason,
          approved_at: voucher.approved_at,
        };
      })
    );

    return enrichedVouchers;
  },
});

// Get vouchers by branch with assignment statistics
export const getVouchersByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Enrich vouchers with user information and assignment statistics
    const enrichedVouchers = await Promise.all(
      vouchers.map(async (voucher) => {
        const createdBy = voucher.created_by ? await ctx.db.get(voucher.created_by) : null;

        // Get assignment statistics
        const assignments = await ctx.db
          .query("user_vouchers")
          .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
          .collect();

        const assignedCount = assignments.length;
        const redeemedCount = assignments.filter(a => a.status === "redeemed").length;
        const hasPreAssignedUsers = assignments.some(a => a.assignment_code != null);

        return {
          ...voucher,
          id: voucher._id,
          created_by_username: createdBy?.username || 'Unknown',
          assignedCount,
          redeemedCount,
          hasPreAssignedUsers,
          availableCount: voucher.max_uses - redeemedCount,
          isExpired: voucher.expires_at < Date.now(),
          isFullyAssigned: assignedCount >= voucher.max_uses,
          isFullyRedeemed: redeemedCount >= voucher.max_uses,
          formattedValue: `₱${parseFloat(voucher.value.toString()).toFixed(2)}`,
          formattedExpiresAt: new Date(voucher.expires_at).toLocaleDateString(),
          status: voucher.status || "active", // Default to active for legacy vouchers
          rejection_reason: voucher.rejection_reason,
          approved_at: voucher.approved_at,
        };
      })
    );

    return enrichedVouchers;
  },
});

// Get voucher by ID
export const getVoucherById = query({
  args: { id: v.id("vouchers") },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.id);
    if (!voucher) {
      return null;
    }

    const createdBy = await ctx.db.get(voucher.created_by);

    // Get assignment statistics
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();

    const assignedCount = assignments.length;
    const redeemedCount = assignments.filter(a => a.status === "redeemed").length;

    return {
      ...voucher,
      created_by_username: createdBy?.username || 'Unknown',
      assignedCount,
      redeemedCount,
      availableCount: voucher.max_uses - assignedCount,
      isExpired: voucher.expires_at < Date.now(),
      isFullyAssigned: assignedCount >= voucher.max_uses,
    };
  },
});

// Get voucher by code
export const getVoucherByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      return null;
    }

    const createdBy = await ctx.db.get(voucher.created_by);

    // Get assignment statistics
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();

    const assignedCount = assignments.length;
    const redeemedCount = assignments.filter(a => a.status === "redeemed").length;

    return {
      ...voucher,
      created_by_username: createdBy?.username || 'Unknown',
      assignedCount,
      redeemedCount,
      availableCount: voucher.max_uses - assignedCount,
      isExpired: voucher.expires_at < Date.now(),
      isFullyAssigned: assignedCount >= voucher.max_uses,
    };
  },
});

// Get active vouchers (not expired and have available assignments)
export const getActiveVouchers = query({
  args: {},
  handler: async (ctx) => {
    const vouchers = await ctx.db.query("vouchers").collect();
    const now = Date.now();

    const activeVouchers: any[] = [];

    for (const voucher of vouchers) {
      if (voucher.expires_at > now) {
        // Get assignment count
        const assignments = await ctx.db
          .query("user_vouchers")
          .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
          .collect();

        if (assignments.length < voucher.max_uses) {
          activeVouchers.push({
            ...voucher,
            assignedCount: assignments.length,
            availableCount: voucher.max_uses - assignments.length,
          });
        }
      }
    }

    return activeVouchers;
  },
});

// Get vouchers assigned to a specific user
export const getVouchersByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log('getVouchersByUser called with userId:', args.userId);

    // Step 1: Find all active assignments for this user in user_vouchers table
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    console.log('Found user_vouchers assignments:', assignments.length, assignments);

    if (assignments.length === 0) {
      console.log('No voucher assignments found for user:', args.userId);
      return [];
    }

    // Step 2: For each assignment, get the voucher details from vouchers table
    const userVouchers = await Promise.all(
      assignments.map(async (assignment) => {
        // Get voucher details from vouchers table
        const voucher = await ctx.db.get(assignment.voucher_id);

        if (!voucher) {
          console.log('Voucher not found in vouchers table for assignment:', assignment);
          return null;
        }

        // Calculate voucher status based on assignment and expiry
        const now = Date.now();
        const isExpired = voucher.expires_at < now;

        // Keep original assignment status ("assigned" or "redeemed")
        // We'll handle expired logic separately in the UI
        const voucherStatus = assignment.status;

        const result = {
          // Voucher data from vouchers table
          _id: voucher._id,
          code: voucher.code,
          value: voucher.value,
          points_required: voucher.points_required,
          max_uses: voucher.max_uses,
          expires_at: voucher.expires_at,
          description: voucher.description,
          created_by: voucher.created_by,
          createdAt: voucher.createdAt,
          updatedAt: voucher.updatedAt,

          // Assignment data from user_vouchers table
          assignment_id: assignment._id,
          assigned_at: assignment.assigned_at,
          redeemed_at: assignment.redeemed_at,
          assigned_by: assignment.assigned_by,

          // Computed fields
          status: voucherStatus, // "assigned", "redeemed", or "expired"
          isExpired: isExpired,

          // Debug info
          _debug: {
            originalAssignmentStatus: assignment.status,
            voucherId: voucher._id,
            assignmentId: assignment._id,
            voucherCode: voucher.code,
            expiresAt: voucher.expires_at,
            now: now,
            computedStatus: voucherStatus
          }
        };

        console.log('Processed voucher:', {
          code: result.code,
          status: result.status,
          isExpired: result.isExpired,
          assignmentStatus: assignment.status
        });

        return result;
      })
    );

    // Filter out any null vouchers (where voucher was deleted but assignment remains)
    const validVouchers = userVouchers.filter(v => v !== null);

    console.log('Returning vouchers count:', validVouchers.length);
    console.log('Voucher summary:', validVouchers.map(v => ({
      code: v.code,
      status: v.status,
      isExpired: v.isExpired
    })));

    return validVouchers;
  },
});

// Debug function to check user existence and assignments
export const debugUserVouchers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Check if user exists
    const user = await ctx.db.get(args.userId);

    // Get all user_vouchers records to see what's in the table
    const allAssignments = await ctx.db.query("user_vouchers").collect();

    // Get assignments for this specific user
    const userAssignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    // Get all vouchers to see what's available
    const allVouchers = await ctx.db.query("vouchers").collect();

    return {
      userId: args.userId,
      userExists: !!user,
      userInfo: user ? { id: user._id, email: user.email, username: user.username } : null,
      totalAssignments: allAssignments.length,
      userAssignments: userAssignments.length,
      userAssignmentsData: userAssignments,
      totalVouchers: allVouchers.length,
      allAssignmentUserIds: allAssignments.map(a => a.user_id),
      debug: {
        searchingFor: args.userId,
        foundMatches: userAssignments.map(ua => ({
          assignmentUserId: ua.user_id,
          matches: ua.user_id === args.userId
        }))
      }
    };
  },
});

// Create voucher with auto-generated code
export const createVoucher = mutation({
  args: {
    value: v.number(),
    points_required: v.number(),
    max_uses: v.number(),
    expires_at: v.number(),
    description: v.optional(v.string()),
    branch_id: v.id("branches"), // Add branch_id requirement
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.value < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid value", "Voucher value cannot be negative.");
    }
    if (args.max_uses <= 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid max uses", "Max uses must be greater than 0.");
    }
    if (args.expires_at <= Date.now()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid expiration", "Expiration date must be in the future.");
    }

    const code = generateVoucherCode();

    // Check user role to determine status — branch_admin and above can auto-approve
    const user = await ctx.db.get(args.created_by);
    const canAutoApprove = user?.role === "super_admin" || user?.role === "branch_admin" || user?.role === "admin_staff" || user?.role === "it_admin";
    const status = canAutoApprove ? "active" : "pending_approval";

    const voucherId = await ctx.db.insert("vouchers", {
      code,
      value: args.value,
      points_required: args.points_required,
      max_uses: args.max_uses,
      expires_at: args.expires_at,
      description: args.description || undefined,
      branch_id: args.branch_id,
      created_by: args.created_by,
      status: status as "active" | "inactive" | "pending_approval" | "rejected",
      approved_by: canAutoApprove ? args.created_by : undefined,
      approved_at: canAutoApprove ? Date.now() : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      user_id: args.created_by as string,
      branch_id: args.branch_id as string,
      category: "voucher",
      action: "voucher.created",
      description: `Created voucher ${code} with value ₱${args.value}`,
      target_type: "voucher",
      target_id: voucherId as string,
      metadata: { code, value: args.value, points_required: args.points_required, max_uses: args.max_uses, expires_at: args.expires_at, status },
    });

    return voucherId;
  },
});

// Create voucher with custom code
export const createVoucherWithCode = mutation({
  args: {
    code: v.string(),
    value: v.number(),
    points_required: v.number(),
    max_uses: v.number(),
    expires_at: v.number(),
    description: v.optional(v.string()),
    branch_id: v.id("branches"),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (!args.code.trim()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid code", "Voucher code cannot be empty.");
    }
    if (args.value < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid value", "Voucher value cannot be negative.");
    }
    if (args.max_uses <= 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid max uses", "Max uses must be greater than 0.");
    }
    if (args.expires_at <= Date.now()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid expiration", "Expiration date must be in the future.");
    }

    // Check if code already exists
    const existingVoucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (existingVoucher) {
      throwUserError(ERROR_CODES.VOUCHER_CODE_EXISTS);
    }

    // Check user role to determine status — branch_admin and above can auto-approve
    const user = await ctx.db.get(args.created_by);
    const canAutoApprove = user?.role === "super_admin" || user?.role === "branch_admin" || user?.role === "admin_staff" || user?.role === "it_admin";
    const status = canAutoApprove ? "active" : "pending_approval";

    const voucherId = await ctx.db.insert("vouchers", {
      code: args.code.toUpperCase(),
      value: args.value,
      points_required: args.points_required,
      max_uses: args.max_uses,
      expires_at: args.expires_at,
      description: args.description || undefined,
      branch_id: args.branch_id,
      created_by: args.created_by,
      status: status as "active" | "inactive" | "pending_approval" | "rejected",
      approved_by: canAutoApprove ? args.created_by : undefined,
      approved_at: canAutoApprove ? Date.now() : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      user_id: args.created_by as string,
      branch_id: args.branch_id as string,
      category: "voucher",
      action: "voucher.created",
      description: `Created voucher ${args.code.toUpperCase()} (custom code) with value ₱${args.value}`,
      target_type: "voucher",
      target_id: voucherId as string,
      metadata: { code: args.code.toUpperCase(), value: args.value, points_required: args.points_required, max_uses: args.max_uses, expires_at: args.expires_at, status, custom_code: true },
    });

    return voucherId;
  },
});

// Assign voucher to a user
export const assignVoucher = mutation({
  args: {
    voucher_id: v.id("vouchers"),
    user_id: v.id("users"),
    assigned_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.voucher_id);
    if (!voucher) {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);
    }

    if (voucher.expires_at < Date.now()) {
      throwUserError(ERROR_CODES.VOUCHER_EXPIRED);
    }

    if (voucher.status && voucher.status !== "active") {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Voucher not active", "This voucher is not active.");
    }

    // Check if voucher is already assigned to this user
    const existingAssignment = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher_user", (q) =>
        q.eq("voucher_id", args.voucher_id).eq("user_id", args.user_id)
      )
      .first();

    if (existingAssignment) {
      throwUserError(ERROR_CODES.VOUCHER_ALREADY_USED, "Voucher already assigned to this user.", "This voucher has already been assigned to your account.");
    }

    // Check if voucher has reached max uses
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", args.voucher_id))
      .collect();

    if (assignments.length >= voucher.max_uses) {
      throwUserError(ERROR_CODES.VOUCHER_LIMIT_REACHED);
    }

    // Create assignment
    const assignmentId = await ctx.db.insert("user_vouchers", {
      voucher_id: args.voucher_id,
      user_id: args.user_id,
      status: "assigned",
      assigned_at: Date.now(),
      assigned_by: args.assigned_by,
    });

    await logAudit(ctx, {
      user_id: args.assigned_by as string,
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.assigned",
      description: `Assigned voucher ${voucher.code} to user`,
      target_type: "voucher",
      target_id: args.voucher_id as string,
      metadata: { code: voucher.code, value: voucher.value, assigned_to: args.user_id as string, assignment_id: assignmentId as string },
    });

    return assignmentId;
  },
});

// Redeem an assigned voucher
export const redeemVoucher = mutation({
  args: {
    code: v.string(),
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log('🎫 redeemVoucher called:', { code: args.code, userId: args.user_id });

    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      console.error('❌ Voucher not found:', args.code);
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, `Voucher code "${args.code}" not found`, "Please check the voucher code and try again.");
    }

    console.log('✅ Voucher found:', { code: voucher.code, voucherId: voucher._id });

    if (voucher.expires_at < Date.now()) {
      console.error('❌ Voucher expired:', { code: voucher.code, expiresAt: new Date(voucher.expires_at) });
      throwUserError(ERROR_CODES.VOUCHER_EXPIRED, "This voucher has expired", "The voucher is no longer valid. Please use a different voucher.");
    }

    // Find the user's assignment for this voucher
    const assignment = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher_user", (q) =>
        q.eq("voucher_id", voucher._id).eq("user_id", args.user_id)
      )
      .first();

    if (!assignment) {
      console.error('❌ Voucher not assigned to user:', { code: voucher.code, userId: args.user_id, voucherId: voucher._id });
      throwUserError(ERROR_CODES.VOUCHER_NOT_ASSIGNED, "Voucher is not assigned to your account", "This voucher is not available for you to use.");
    }

    console.log('✅ Assignment found:', { assignmentId: assignment._id, currentStatus: assignment.status });

    if (assignment.status === "redeemed") {
      console.error('❌ Voucher already redeemed:', { code: voucher.code, redeemedAt: assignment.redeemed_at ? new Date(assignment.redeemed_at) : 'unknown' });
      throwUserError(ERROR_CODES.VOUCHER_ALREADY_USED, "Voucher has already been used", "This voucher has already been redeemed and cannot be used again.");
    }

    // Mark assignment as redeemed
    console.log('📝 Updating assignment status to redeemed...');
    await ctx.db.patch(assignment._id, {
      status: "redeemed",
      redeemed_at: Date.now(),
    });

    console.log('✅ Assignment updated successfully:', { assignmentId: assignment._id, newStatus: "redeemed" });

    await logAudit(ctx, {
      user_id: args.user_id as string,
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.redeemed",
      description: `Redeemed voucher ${voucher.code} (value ₱${voucher.value})`,
      target_type: "voucher",
      target_id: voucher._id as string,
      metadata: { code: voucher.code, value: voucher.value, assignment_id: assignment._id as string },
    });

    return { voucher, assignment };
  },
});

// Update voucher
export const updateVoucher = mutation({
  args: {
    id: v.id("vouchers"),
    value: v.optional(v.number()),
    points_required: v.optional(v.number()),
    max_uses: v.optional(v.number()),
    expires_at: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const voucher = await ctx.db.get(id);
    if (!voucher) {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);
    }

    if (updates.value !== undefined && updates.value < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid value", "Voucher value cannot be negative.");
    }
    if (updates.max_uses !== undefined && updates.max_uses <= 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid max uses", "Max uses must be greater than 0.");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.updated",
      description: `Updated voucher ${voucher.code}`,
      target_type: "voucher",
      target_id: id as string,
      metadata: { code: voucher.code, updates },
    });
  },
});

// Delete voucher
export const deleteVoucher = mutation({
  args: { id: v.id("vouchers"), user_id: v.id("users") },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.id);
    if (!voucher) {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);
    }

    // Check permissions
    const user = await ctx.db.get(args.user_id);
    const isAuthorized =
      user?.role === "branch_admin" ||
      user?.role === "admin" ||
      user?.role === "super_admin";

    if (!isAuthorized) {
      throw new Error("Unauthorized: Only branch admins can delete vouchers.");
    }

    // Delete all assignments first
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", args.id))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete the voucher
    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      user_id: args.user_id as string,
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.deleted",
      description: `Deleted voucher ${voucher.code} (value ₱${voucher.value})`,
      target_type: "voucher",
      target_id: args.id as string,
      metadata: { code: voucher.code, value: voucher.value, assignments_deleted: assignments.length },
    });
  },
});

// Approve voucher — branch_admin+ can approve, scoped to their branch
export const approveVoucher = mutation({
  args: {
    id: v.id("vouchers"),
    approved_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.id);
    if (!voucher) {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);
    }

    const approver = await ctx.db.get(args.approved_by);
    if (!approver) {
      throwUserError(ERROR_CODES.USER_NOT_FOUND, "User not found", "Approver not found.");
    }

    const isGlobalAdmin = approver.role === "super_admin" || approver.role === "admin_staff" || approver.role === "it_admin";
    const isBranchAdmin = approver.role === "branch_admin";

    if (!isGlobalAdmin && !isBranchAdmin) {
      throwUserError(ERROR_CODES.UNAUTHORIZED, "Not authorized", "Only branch admins or higher can approve vouchers.");
    }

    // Branch admins can only approve vouchers from their own branch
    if (isBranchAdmin && approver.branch_id !== voucher.branch_id) {
      throwUserError(ERROR_CODES.UNAUTHORIZED, "Not authorized", "You can only approve vouchers from your own branch.");
    }

    await ctx.db.patch(args.id, {
      status: "active",
      approved_by: args.approved_by,
      approved_at: Date.now(),
      rejection_reason: undefined,
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      user_id: args.approved_by as string,
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.approved",
      description: `Approved voucher ${voucher.code}`,
      target_type: "voucher",
      target_id: args.id as string,
      metadata: { code: voucher.code, value: voucher.value },
    });
  },
});

// Reject voucher — branch_admin+ can reject, scoped to their branch
export const rejectVoucher = mutation({
  args: {
    id: v.id("vouchers"),
    rejected_by: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.id);
    if (!voucher) {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);
    }

    const rejector = await ctx.db.get(args.rejected_by);
    if (!rejector) {
      throwUserError(ERROR_CODES.USER_NOT_FOUND, "User not found", "User not found.");
    }

    const isGlobalAdmin = rejector.role === "super_admin" || rejector.role === "admin_staff" || rejector.role === "it_admin";
    const isBranchAdmin = rejector.role === "branch_admin";

    if (!isGlobalAdmin && !isBranchAdmin) {
      throwUserError(ERROR_CODES.UNAUTHORIZED, "Not authorized", "Only branch admins or higher can reject vouchers.");
    }

    // Branch admins can only reject vouchers from their own branch
    if (isBranchAdmin && rejector.branch_id !== voucher.branch_id) {
      throwUserError(ERROR_CODES.UNAUTHORIZED, "Not authorized", "You can only reject vouchers from your own branch.");
    }

    await ctx.db.patch(args.id, {
      status: "rejected",
      rejection_reason: args.reason,
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      user_id: args.rejected_by as string,
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.rejected",
      description: `Rejected voucher ${voucher.code}: ${args.reason}`,
      target_type: "voucher",
      target_id: args.id as string,
      metadata: { code: voucher.code, value: voucher.value, reason: args.reason },
    });
  },
});

// Validate voucher (query)
export const validateVoucher = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      return { valid: false, message: "Voucher not found" };
    }

    if (voucher.expires_at < Date.now()) {
      return { valid: false, message: "Voucher has expired" };
    }

    if (voucher.status && voucher.status !== "active") {
      return { valid: false, message: "Voucher is not active" };
    }

    // Check if voucher has available assignments
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();

    if (assignments.length >= voucher.max_uses) {
      return { valid: false, message: "Voucher has reached maximum assignments" };
    }

    return { valid: true, voucher };
  },
});

// Claim voucher mutation (for customers claiming vouchers via code)
export const claimVoucher = mutation({
  args: {
    code: v.string(),
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Invalid voucher code", "The voucher code you entered is invalid.");
    }

    if (voucher.expires_at < Date.now()) {
      throwUserError(ERROR_CODES.VOUCHER_EXPIRED);
    }

    if (voucher.status && voucher.status !== "active") {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Voucher not active", "This voucher is not active.");
    }

    // Check if voucher is already assigned to this user
    const existingAssignment = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher_user", (q) =>
        q.eq("voucher_id", voucher._id).eq("user_id", args.user_id)
      )
      .first();

    if (existingAssignment) {
      throwUserError(ERROR_CODES.VOUCHER_ALREADY_USED, "Voucher already assigned", "You have already claimed this voucher.");
    }

    // Check if voucher has reached max uses
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();

    if (assignments.length >= voucher.max_uses) {
      throwUserError(ERROR_CODES.VOUCHER_LIMIT_REACHED, "Voucher fully claimed", "This voucher has reached its maximum number of claims.");
    }

    // Create assignment (claim the voucher)
    const assignmentId = await ctx.db.insert("user_vouchers", {
      voucher_id: voucher._id,
      user_id: args.user_id,
      status: "assigned",
      assigned_at: Date.now(),
      assigned_by: args.user_id, // Self-assigned when claiming
    });

    await logAudit(ctx, {
      user_id: args.user_id as string,
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.claimed",
      description: `Claimed voucher ${voucher.code} (value ₱${voucher.value})`,
      target_type: "voucher",
      target_id: voucher._id as string,
      metadata: { code: voucher.code, value: voucher.value, assignment_id: assignmentId as string },
    });

    return { voucher, assignmentId };
  },
});

// Get users assigned to a specific voucher
export const getVoucherAssignedUsers = query({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.voucherId);
    if (!voucher) {
      return [];
    }

    // Get all assignments for this voucher
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", args.voucherId))
      .collect();

    const assignedUsers: any[] = [];
    for (const assignment of assignments) {
      if (assignment.user_id) {
        const user = await ctx.db.get(assignment.user_id);
        if (user) {
          assignedUsers.push({
            _id: user._id,
            username: user.username,
            email: user.email,
            nickname: user.nickname,
            role: user.role,
            assignment_status: assignment.status,
            assigned_at: assignment.assigned_at,
            redeemed_at: assignment.redeemed_at,
          });
        }
      }
    }

    return assignedUsers;
  },
});

// Assign voucher by code (for SendVoucherModal)
export const assignVoucherByCode = mutation({
  args: {
    code: v.string(),
    user_id: v.id("users"),
    assigned_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log("assignVoucherByCode called with:", args);
    try {
      const voucher = await ctx.db
        .query("vouchers")
        .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
        .first();

      if (!voucher) {
        console.error("Voucher not found for code:", args.code);
        throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);
      }

      if (voucher.expires_at < Date.now()) {
        console.error("Voucher expired:", voucher);
        throwUserError(ERROR_CODES.VOUCHER_EXPIRED);
      }

      if (voucher.status && voucher.status !== "active") {
        console.error("Voucher not active:", voucher.status);
        throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Voucher not active", "This voucher is not active.");
      }

      if (voucher.status && voucher.status !== "active") {
        console.error("Voucher not active:", voucher.status);
        throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Voucher not active", "This voucher is not active.");
      }

      // Check if voucher is already assigned to this user
      const existingAssignment = await ctx.db
        .query("user_vouchers")
        .withIndex("by_voucher_user", (q) =>
          q.eq("voucher_id", voucher._id).eq("user_id", args.user_id)
        )
        .first();

      if (existingAssignment) {
        console.error("Voucher already assigned:", existingAssignment);
        throwUserError(ERROR_CODES.VOUCHER_ALREADY_USED, "Voucher already assigned", "This voucher is already assigned to the user.");
      }

      // Check if voucher has reached max uses
      const assignments = await ctx.db
        .query("user_vouchers")
        .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
        .collect();

      if (assignments.length >= voucher.max_uses) {
        console.error("Voucher limit reached:", assignments.length, voucher.max_uses);
        throwUserError(ERROR_CODES.VOUCHER_LIMIT_REACHED);
      }

      // Generate unique assignment code
      let assignmentCode = generateAssignmentCode(voucher.code);
      // Ensure uniqueness
      let existingCode = await ctx.db.query("user_vouchers").withIndex("by_assignment_code", (q) => q.eq("assignment_code", assignmentCode)).first();
      while (existingCode) {
        assignmentCode = generateAssignmentCode(voucher.code);
        existingCode = await ctx.db.query("user_vouchers").withIndex("by_assignment_code", (q) => q.eq("assignment_code", assignmentCode)).first();
      }

      // Create assignment with unique code
      const assignmentId = await ctx.db.insert("user_vouchers", {
        voucher_id: voucher._id,
        user_id: args.user_id,
        assignment_code: assignmentCode,
        status: "assigned",
        assigned_at: Date.now(),
        assigned_by: args.assigned_by,
      });

      console.log("Voucher assigned successfully:", assignmentId, "code:", assignmentCode);

      await logAudit(ctx, {
        user_id: args.assigned_by as string,
        branch_id: voucher.branch_id as string,
        category: "voucher",
        action: "voucher.assigned",
        description: `Assigned voucher ${voucher.code} to user by code`,
        target_type: "voucher",
        target_id: voucher._id as string,
        metadata: { code: voucher.code, value: voucher.value, assigned_to: args.user_id as string, assignment_code: assignmentCode },
      });

      return { voucher, assignmentId, assignmentCode };
    } catch (error) {
      console.error("Error in assignVoucherByCode:", error);
      throw error;
    }
  },
});


// Staff redemption - for QR scanner use (finds existing assignment and redeems it)
export const redeemVoucherByStaff = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);
    }

    if (voucher.expires_at < Date.now()) {
      throwUserError(ERROR_CODES.VOUCHER_EXPIRED);
    }

    if (voucher.status && voucher.status !== "active") {
      throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Voucher not active", "This voucher is not active.");
    }

    // Find an assigned voucher that hasn't been redeemed yet
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();

    // Look for an assigned (not redeemed) voucher
    const assignedVoucher = assignments.find(a => a.status === "assigned");

    if (!assignedVoucher) {
      throwUserError(ERROR_CODES.VOUCHER_NOT_ASSIGNED, "No active assignment", "This voucher is not currently assigned to anyone or has already been redeemed.");
    }

    // Update the assignment to redeemed
    await ctx.db.patch(assignedVoucher._id, {
      status: "redeemed",
      redeemed_at: Date.now(),
    });

    await logAudit(ctx, {
      user_id: assignedVoucher.user_id as string,
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.redeemed",
      description: `Staff redeemed voucher ${voucher.code} (value ₱${voucher.value})`,
      target_type: "voucher",
      target_id: voucher._id as string,
      metadata: { code: voucher.code, value: voucher.value, assignment_id: assignedVoucher._id as string, redeemed_by: "staff" },
    });

    return {
      success: true,
      voucher,
      value: voucher.value,
      assignment: assignedVoucher
    };
  },
});

/**
 * Validate a voucher for POS application.
 * Accepts either a voucher code (e.g., "ABC123") or a unique assignment code (e.g., "ABC123-X7K9").
 * Assignment codes are per-user and guarantee the right person is redeeming.
 */
export const validateVoucherForPOS = mutation({
  args: {
    code: v.string(),
    user_id: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const codeUpper = args.code.toUpperCase();

    // First try: look up by unique assignment code (e.g., "ABC123-X7K9")
    const assignmentByCode = await ctx.db
      .query("user_vouchers")
      .withIndex("by_assignment_code", (q) => q.eq("assignment_code", codeUpper))
      .first();

    if (assignmentByCode) {
      // Found a specific assignment — validate it
      if (assignmentByCode.status === "redeemed") {
        return { valid: false, reason: "This voucher has already been redeemed" };
      }

      const voucher = await ctx.db.get(assignmentByCode.voucher_id);
      if (!voucher) return { valid: false, reason: "Voucher not found" };
      if (voucher.expires_at < Date.now()) return { valid: false, reason: "Voucher has expired" };
      if (voucher.status && voucher.status !== "active") return { valid: false, reason: "Voucher is not active" };

      // Universal guard: check total redeemed uses against max_uses
      const allAssignments = await ctx.db
        .query("user_vouchers")
        .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
        .collect();
      const redeemedCount = allAssignments.filter((a) => a.status === "redeemed").length;
      if (redeemedCount >= voucher.max_uses) {
        return { valid: false, reason: "Voucher has reached maximum uses" };
      }

      await logAudit(ctx, {
        user_id: assignmentByCode.user_id ? (assignmentByCode.user_id as string) : undefined,
        branch_id: voucher.branch_id as string,
        category: "voucher",
        action: "voucher.validated",
        description: `Validated voucher ${voucher.code} for POS (assignment code)`,
        target_type: "voucher",
        target_id: voucher._id as string,
        metadata: { code: voucher.code, value: voucher.value, validated_via: "assignment_code", assignment_code: codeUpper },
      });

      return {
        valid: true,
        voucher: {
          _id: voucher._id,
          code: voucher.code,
          value: voucher.value,
          expires_at: voucher.expires_at,
          description: voucher.description,
        },
      };
    }

    // Fallback: look up by voucher code (legacy or direct voucher code scan)
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", codeUpper))
      .first();

    if (!voucher) {
      return { valid: false, reason: "Voucher not found" };
    }

    if (voucher.expires_at < Date.now()) {
      return { valid: false, reason: "Voucher has expired" };
    }

    if (voucher.status && voucher.status !== "active") {
      return { valid: false, reason: "Voucher is not active" };
    }

    // Fetch all assignments for this voucher (used in all paths below)
    const allAssignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();
    const redeemedCount = allAssignments.filter((a) => a.status === "redeemed").length;

    // Universal guard: if total redeemed >= max_uses, always reject
    if (redeemedCount >= voucher.max_uses) {
      return { valid: false, reason: "Voucher has reached maximum uses" };
    }

    if (args.user_id) {
      // Registered customer — check their specific assignment
      const assignment = allAssignments.find((a) => a.user_id === args.user_id);

      if (assignment) {
        if (assignment.status === "redeemed") {
          return { valid: false, reason: "Voucher has already been redeemed by this customer" };
        }
        // Assignment exists and is unredeemed — valid
      } else {
        // No assignment for this customer — check if there are open slots (standard "first N to claim")
        if (allAssignments.length >= voucher.max_uses) {
          return { valid: false, reason: "All voucher uses are already assigned to other customers" };
        }
        // Open slots available — customer can claim one
      }
    } else {
      // Walk-in (no user_id) with raw voucher code
      // If this voucher was distributed to specific users (has assignment_codes from SendVoucherModal),
      // walk-in can't use the base code — they must select a customer or use their unique code
      const hasPreAssignedUsers = allAssignments.some((a) => a.assignment_code != null);
      if (hasPreAssignedUsers) {
        return { valid: false, reason: "This voucher is assigned to specific customers. Please select a customer first or use the unique voucher code." };
      }
      // For standard "first N to claim" or flier vouchers (no pre-assignments):
      if (allAssignments.length >= voucher.max_uses) {
        return { valid: false, reason: "Voucher has reached maximum uses" };
      }
      // Open slots available (unclaimed) — valid for walk-in / first-come use
    }

    await logAudit(ctx, {
      user_id: args.user_id ? (args.user_id as string) : undefined,
      branch_id: voucher.branch_id as string,
      category: "voucher",
      action: "voucher.validated",
      description: `Validated voucher ${voucher.code} for POS`,
      target_type: "voucher",
      target_id: voucher._id as string,
      metadata: { code: voucher.code, value: voucher.value, validated_via: "voucher_code", user_id: args.user_id ? (args.user_id as string) : "walk-in" },
    });

    return {
      valid: true,
      voucher: {
        _id: voucher._id,
        code: voucher.code,
        value: voucher.value,
        expires_at: voucher.expires_at,
        description: voucher.description,
      },
    };
  },
});

// ─── Batch/Flier Voucher Creation ────────────────────────────────────────────

/**
 * Batch create vouchers for flier distribution.
 * Creates N individual vouchers, each with a unique auto-generated code and max_uses=1.
 * No users assigned — whoever scans the QR claims it.
 */
export const batchCreateVouchers = mutation({
  args: {
    quantity: v.number(),
    value: v.number(),
    points_required: v.number(),
    expires_at: v.number(),
    description: v.optional(v.string()),
    code_prefix: v.optional(v.string()),
    branch_id: v.id("branches"),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.quantity < 1 || args.quantity > 100) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid quantity", "Quantity must be between 1 and 100.");
    }
    if (args.value < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid value", "Voucher value cannot be negative.");
    }
    if (args.expires_at <= Date.now()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid expiration", "Expiration date must be in the future.");
    }

    // Check user role for auto-approval
    const user = await ctx.db.get(args.created_by);
    const canAutoApprove = user?.role === "super_admin" || user?.role === "branch_admin" || user?.role === "admin_staff" || user?.role === "it_admin";
    const status = canAutoApprove ? "active" : "pending_approval";

    // Generate a batch_id to group these vouchers
    const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const createdVouchers: Array<{ _id: string; code: string }> = [];

    const prefix = args.code_prefix?.trim().toUpperCase();

    for (let i = 0; i < args.quantity; i++) {
      // Generate unique code with optional prefix: PREFIX-XXXXXXXX or just XXXXXXXX
      let suffix = generateVoucherCode();
      let code = prefix ? `${prefix}-${suffix}` : suffix;
      let existing = await ctx.db.query("vouchers").withIndex("by_code", (q) => q.eq("code", code)).first();
      while (existing) {
        suffix = generateVoucherCode();
        code = prefix ? `${prefix}-${suffix}` : suffix;
        existing = await ctx.db.query("vouchers").withIndex("by_code", (q) => q.eq("code", code)).first();
      }

      const voucherId = await ctx.db.insert("vouchers", {
        code,
        value: args.value,
        points_required: args.points_required,
        max_uses: 1, // Each flier voucher is single-use
        expires_at: args.expires_at,
        description: args.description || undefined,
        branch_id: args.branch_id,
        created_by: args.created_by,
        batch_id: batchId,
        status: status as "active" | "inactive" | "pending_approval" | "rejected",
        approved_by: canAutoApprove ? args.created_by : undefined,
        approved_at: canAutoApprove ? Date.now() : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      createdVouchers.push({ _id: voucherId as string, code });
    }

    await logAudit(ctx, {
      user_id: args.created_by as string,
      branch_id: args.branch_id as string,
      category: "voucher",
      action: "voucher.batch_created",
      description: `Batch created ${createdVouchers.length} vouchers (value ₱${args.value} each)`,
      target_type: "voucher",
      target_id: batchId,
      metadata: { batch_id: batchId, quantity: createdVouchers.length, value: args.value, points_required: args.points_required, expires_at: args.expires_at, code_prefix: args.code_prefix, status },
    });

    return { batchId, vouchers: createdVouchers };
  },
});

// ─── Voucher Send Requests ───────────────────────────────────────────────────

// Create a send request (staff submits for branch_admin approval)
export const createSendRequest = mutation({
  args: {
    voucher_id: v.id("vouchers"),
    recipient_ids: v.array(v.id("users")),
    requested_by: v.id("users"),
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    if (args.recipient_ids.length === 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "No recipients", "Please select at least one recipient.");
    }

    const voucher = await ctx.db.get(args.voucher_id);
    if (!voucher) throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);
    if (voucher.status !== "active") throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Voucher not active", "Only active vouchers can be sent.");

    const requestId = await ctx.db.insert("voucher_send_requests", {
      voucher_id: args.voucher_id,
      recipient_ids: args.recipient_ids,
      requested_by: args.requested_by,
      branch_id: args.branch_id,
      status: "pending",
      createdAt: Date.now(),
    });

    await logAudit(ctx, {
      user_id: args.requested_by as string,
      branch_id: args.branch_id as string,
      category: "voucher",
      action: "voucher.send_requested",
      description: `Requested to send voucher ${voucher.code} to ${args.recipient_ids.length} recipient(s)`,
      target_type: "voucher",
      target_id: args.voucher_id as string,
      metadata: { code: voucher.code, value: voucher.value, recipient_count: args.recipient_ids.length, request_id: requestId as string },
    });

    return requestId;
  },
});

// Get pending send requests for a branch
export const getSendRequestsByBranch = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("voucher_send_requests")
      .withIndex("by_branch_status", (q) => q.eq("branch_id", args.branch_id).eq("status", "pending"))
      .collect();

    // Enrich with voucher data, requester info, and recipient details
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const voucher = await ctx.db.get(req.voucher_id);
        const requester = await ctx.db.get(req.requested_by);
        const recipients = await Promise.all(
          req.recipient_ids.map(async (id) => {
            const user = await ctx.db.get(id);
            return user ? { _id: user._id, username: user.username, email: user.email, nickname: user.nickname } : null;
          })
        );
        return {
          ...req,
          voucher: voucher ? { _id: voucher._id, code: voucher.code, value: voucher.value, expires_at: voucher.expires_at } : null,
          requester: requester ? { username: requester.username } : null,
          recipients: recipients.filter(Boolean),
        };
      })
    );

    return enriched;
  },
});

// Approve a send request — assigns vouchers to recipients, returns data for email sending
export const approveSendRequest = mutation({
  args: {
    request_id: v.id("voucher_send_requests"),
    approved_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.request_id);
    if (!request) throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Request not found", "Send request not found.");
    if (request.status !== "pending") throwUserError(ERROR_CODES.INVALID_INPUT, "Not pending", "This request has already been processed.");

    // Verify approver is branch_admin+ and same branch
    const approver = await ctx.db.get(args.approved_by);
    if (!approver) throwUserError(ERROR_CODES.USER_NOT_FOUND);
    const isGlobalAdmin = approver.role === "super_admin" || approver.role === "admin_staff" || approver.role === "it_admin";
    const isBranchAdmin = approver.role === "branch_admin";
    if (!isGlobalAdmin && !isBranchAdmin) throwUserError(ERROR_CODES.UNAUTHORIZED, "Not authorized", "Only branch admins or higher can approve send requests.");
    if (isBranchAdmin && approver.branch_id !== request.branch_id) throwUserError(ERROR_CODES.UNAUTHORIZED, "Not authorized", "You can only approve requests from your own branch.");

    const voucher = await ctx.db.get(request.voucher_id);
    if (!voucher) throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND);

    // Assign voucher to each recipient with unique assignment codes
    const assignedRecipients: Array<{ _id: string; username: string; email: string; nickname?: string; assignmentCode: string }> = [];
    for (const userId of request.recipient_ids) {
      const user = await ctx.db.get(userId);
      if (!user) continue;

      // Check not already assigned
      const existing = await ctx.db
        .query("user_vouchers")
        .withIndex("by_voucher_user", (q) => q.eq("voucher_id", voucher._id).eq("user_id", userId))
        .first();
      if (existing) continue;

      // Check max_uses
      const assignments = await ctx.db
        .query("user_vouchers")
        .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
        .collect();
      if (assignments.length >= voucher.max_uses) break;

      // Generate unique assignment code
      let assignmentCode = generateAssignmentCode(voucher.code);
      let existingCode = await ctx.db.query("user_vouchers").withIndex("by_assignment_code", (q) => q.eq("assignment_code", assignmentCode)).first();
      while (existingCode) {
        assignmentCode = generateAssignmentCode(voucher.code);
        existingCode = await ctx.db.query("user_vouchers").withIndex("by_assignment_code", (q) => q.eq("assignment_code", assignmentCode)).first();
      }

      await ctx.db.insert("user_vouchers", {
        voucher_id: voucher._id,
        user_id: userId,
        assignment_code: assignmentCode,
        status: "assigned",
        assigned_at: Date.now(),
        assigned_by: args.approved_by,
      });

      assignedRecipients.push({
        _id: user._id as string,
        username: user.username || "",
        email: user.email || "",
        nickname: user.nickname,
        assignmentCode,
      });
    }

    // Mark request as approved
    await ctx.db.patch(args.request_id, {
      status: "approved",
      approved_by: args.approved_by,
      approved_at: Date.now(),
    });

    await logAudit(ctx, {
      user_id: args.approved_by as string,
      branch_id: request.branch_id as string,
      category: "voucher",
      action: "voucher.send_approved",
      description: `Approved send request for voucher ${voucher.code} to ${assignedRecipients.length} recipient(s)`,
      target_type: "voucher",
      target_id: voucher._id as string,
      metadata: { code: voucher.code, value: voucher.value, recipient_count: assignedRecipients.length, request_id: args.request_id as string },
    });

    return {
      assignedRecipients,
      voucher: { _id: voucher._id, code: voucher.code, value: voucher.value, expires_at: voucher.expires_at, points_required: voucher.points_required },
    };
  },
});

// Reject a send request
export const rejectSendRequest = mutation({
  args: {
    request_id: v.id("voucher_send_requests"),
    rejected_by: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.request_id);
    if (!request) throwUserError(ERROR_CODES.VOUCHER_NOT_FOUND, "Request not found", "Send request not found.");
    if (request.status !== "pending") throwUserError(ERROR_CODES.INVALID_INPUT, "Not pending", "This request has already been processed.");

    const rejector = await ctx.db.get(args.rejected_by);
    if (!rejector) throwUserError(ERROR_CODES.USER_NOT_FOUND);
    const isGlobalAdmin = rejector.role === "super_admin" || rejector.role === "admin_staff" || rejector.role === "it_admin";
    const isBranchAdmin = rejector.role === "branch_admin";
    if (!isGlobalAdmin && !isBranchAdmin) throwUserError(ERROR_CODES.UNAUTHORIZED, "Not authorized", "Only branch admins or higher can reject send requests.");
    if (isBranchAdmin && rejector.branch_id !== request.branch_id) throwUserError(ERROR_CODES.UNAUTHORIZED, "Not authorized", "You can only reject requests from your own branch.");

    await ctx.db.patch(args.request_id, {
      status: "rejected",
      rejection_reason: args.reason,
    });

    await logAudit(ctx, {
      user_id: args.rejected_by as string,
      branch_id: request.branch_id as string,
      category: "voucher",
      action: "voucher.send_rejected",
      description: `Rejected send request for voucher: ${args.reason}`,
      target_type: "voucher",
      target_id: request.voucher_id as string,
      metadata: { voucher_id: request.voucher_id as string, reason: args.reason, request_id: args.request_id as string },
    });
  },
});
