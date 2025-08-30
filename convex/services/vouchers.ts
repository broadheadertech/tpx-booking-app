import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// Generate a random voucher code
function generateVoucherCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get all vouchers with assignment statistics
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
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const code = generateVoucherCode();

    const voucherId = await ctx.db.insert("vouchers", {
      code,
      value: args.value,
      points_required: args.points_required,
      max_uses: args.max_uses,
      expires_at: args.expires_at,
      description: args.description || undefined,
      created_by: args.created_by,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if code already exists
    const existingVoucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (existingVoucher) {
      throwUserError(ERROR_CODES.VOUCHER_CODE_EXISTS);
    }

    const voucherId = await ctx.db.insert("vouchers", {
      code: args.code.toUpperCase(),
      value: args.value,
      points_required: args.points_required,
      max_uses: args.max_uses,
      expires_at: args.expires_at,
      description: args.description || undefined,
      created_by: args.created_by,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      throw new Error("Voucher not found");
    }

    if (voucher.expires_at < Date.now()) {
      throw new Error("Voucher has expired");
    }

    // Find the user's assignment for this voucher
    const assignment = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher_user", (q) => 
        q.eq("voucher_id", voucher._id).eq("user_id", args.user_id)
      )
      .first();

    if (!assignment) {
      throw new Error("Voucher not assigned to this user");
    }

    if (assignment.status === "redeemed") {
      throw new Error("Voucher has already been redeemed");
    }

    // Mark assignment as redeemed
    await ctx.db.patch(assignment._id, {
      status: "redeemed",
      redeemed_at: Date.now(),
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
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete voucher
export const deleteVoucher = mutation({
  args: { id: v.id("vouchers") },
  handler: async (ctx, args) => {
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
      throw new Error("Invalid voucher code");
    }

    if (voucher.expires_at < Date.now()) {
      throw new Error("Voucher has expired");
    }

    // Check if voucher is already assigned to this user
    const existingAssignment = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher_user", (q) => 
        q.eq("voucher_id", voucher._id).eq("user_id", args.user_id)
      )
      .first();

    if (existingAssignment) {
      throw new Error("Voucher already assigned to this user");
    }

    // Check if voucher has reached max uses
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();

    if (assignments.length >= voucher.max_uses) {
      throw new Error("Voucher has reached maximum assignments");
    }

    // Create assignment (claim the voucher)
    const assignmentId = await ctx.db.insert("user_vouchers", {
      voucher_id: voucher._id,
      user_id: args.user_id,
      status: "assigned",
      assigned_at: Date.now(),
      assigned_by: args.user_id, // Self-assigned when claiming
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
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      throw new Error("Voucher not found");
    }

    if (voucher.expires_at < Date.now()) {
      throw new Error("Voucher has expired");
    }

    // Check if voucher is already assigned to this user
    const existingAssignment = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher_user", (q) => 
        q.eq("voucher_id", voucher._id).eq("user_id", args.user_id)
      )
      .first();

    if (existingAssignment) {
      throw new Error("Voucher already assigned to this user");
    }

    // Check if voucher has reached max uses
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();

    if (assignments.length >= voucher.max_uses) {
      throw new Error("Voucher has reached maximum assignments");
    }

    // Create assignment
    const assignmentId = await ctx.db.insert("user_vouchers", {
      voucher_id: voucher._id,
      user_id: args.user_id,
      status: "assigned",
      assigned_at: Date.now(),
      assigned_by: args.assigned_by,
    });

    return { voucher, assignmentId };
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
      throw new Error("Voucher not found");
    }

    if (voucher.expires_at < Date.now()) {
      throw new Error("Voucher has expired");
    }

    // Find an assigned voucher that hasn't been redeemed yet
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", voucher._id))
      .collect();

    // Look for an assigned (not redeemed) voucher
    const assignedVoucher = assignments.find(a => a.status === "assigned");
    
    if (!assignedVoucher) {
      throw new Error("No available voucher assignment found to redeem");
    }

    // Update the assignment to redeemed
    await ctx.db.patch(assignedVoucher._id, {
      status: "redeemed",
      redeemed_at: Date.now(),
    });

    return { 
      success: true, 
      voucher, 
      value: voucher.value,
      assignment: assignedVoucher 
    };
  },
});
