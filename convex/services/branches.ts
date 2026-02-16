import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { throwUserError, ERROR_CODES } from "../utils/errors";
import { api, internal } from "../_generated/api";

// Generate a unique branch code
function generateBranchCode(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}${timestamp}`;
}

// Queries
export const getAllBranches = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("branches").order("desc").collect();
  },
});

export const getActiveBranches = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("branches")
      .filter((q) => q.eq(q.field("is_active"), true))
      .order("desc")
      .collect();
  },
});

export const getBranchById = query({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBranchByCode = query({
  args: { branch_code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("branches")
      .withIndex("by_branch_code", (q) => q.eq("branch_code", args.branch_code))
      .first();
  },
});

// Get branch statistics - OPTIMIZED: Uses limited queries instead of collecting all data
export const getBranchStats = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    // Use take with a reasonable limit to avoid byte limit errors
    // For counts, we just need to know the count, not all the data
    const SAMPLE_LIMIT = 1000; // Limit to avoid memory issues

    const [bookings, transactions, barbers, users] = await Promise.all([
      ctx.db
        .query("bookings")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .take(SAMPLE_LIMIT),
      ctx.db
        .query("transactions")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .take(SAMPLE_LIMIT),
      ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .take(SAMPLE_LIMIT),
      ctx.db
        .query("users")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .take(SAMPLE_LIMIT),
    ]);

    const totalRevenue = transactions
      .filter((t) => t.payment_status === "completed")
      .reduce((sum, t) => sum + t.total_amount, 0);

    const completedBookings = bookings.filter((b) => b.status === "completed").length;

    return {
      totalBookings: bookings.filter((b) => b.status !== "cancelled").length,
      completedBookings,
      totalRevenue,
      totalBarbers: barbers.length,
      totalStaff: users.filter((u) => u.role === "staff" || u.role === "branch_admin").length,
      totalCustomers: users.filter((u) => u.role === "customer").length,
    };
  },
});

// Get lightweight branch statistics using efficient counting
export const getBranchStatsLightweight = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    // Only fetch the minimum data needed for counting
    const [barberCount, staffCount] = await Promise.all([
      ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .take(100), // Limit barber fetch
      ctx.db
        .query("users")
        .withIndex("by_branch_role", (q) => q.eq("branch_id", args.branch_id))
        .take(100), // Limit staff fetch
    ]);

    return {
      totalBarbers: barberCount.length,
      totalStaff: staffCount.filter((u) => u.role === "staff" || u.role === "branch_admin").length,
    };
  },
});

// Mutations
export const createBranch = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    booking_start_hour: v.optional(v.number()),
    booking_end_hour: v.optional(v.number()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate inputs first
    if (!args.name.trim()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid name", "Branch name cannot be empty.");
    }

    if (!args.address.trim()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid address", "Branch address cannot be empty.");
    }

    if (!args.phone.trim()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid phone", "Branch phone number cannot be empty.");
    }

    if (!args.email.trim()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid email", "Branch email cannot be empty.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid email format", "Please provide a valid email address.");
    }

    try {
      const branch_code = generateBranchCode(args.name);

      // Check if branch code already exists
      const existingBranch = await ctx.db
        .query("branches")
        .withIndex("by_branch_code", (q) => q.eq("branch_code", branch_code))
        .first();

      if (existingBranch) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Branch code exists", "A branch with this code already exists. Please try again.");
      }

      const branchId = await ctx.db.insert("branches", {
        branch_code,
        name: args.name.trim(),
        address: args.address.trim(),
        phone: args.phone.trim(),
        email: args.email.trim().toLowerCase(),
        is_active: true,
        booking_start_hour: args.booking_start_hour ?? 10, // Default 10am
        booking_end_hour: args.booking_end_hour ?? 20, // Default 8pm (20:00)
        slug: args.slug,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Copy default services from the defaultServices table
      const defaultServiceTemplates = await ctx.db.query("defaultServices")
        .withIndex("by_active", (q) => q.eq("is_active", true))
        .collect();

      for (const template of defaultServiceTemplates) {
        await ctx.db.insert("services", {
          name: template.name,
          description: template.description,
          price: template.price,
          duration_minutes: template.duration_minutes,
          category: template.category,
          branch_id: branchId,
          is_active: true,
          hide_price: template.hide_price,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      return branchId;
    } catch (error: any) {
      // Check if it's already a user error (thrown by throwUserError)
      if (error.message && error.message.startsWith('{')) {
        throw error;
      }
      // Wrap unexpected errors with user-friendly message
      throwUserError(
        ERROR_CODES.OPERATION_FAILED,
        "Failed to create branch",
        `An error occurred while creating the branch: ${error.message || 'Unknown error'}. Please try again.`
      );
    }
  },
});

// ============================================================================
// CLERK ORGANIZATION INTEGRATION (Story 13-1)
// ============================================================================

/**
 * Internal mutation for creating a branch with clerk_org_id
 * Used by createBranchWithClerkOrg action after Clerk API success
 */
export const createBranchInternal = internalMutation({
  args: {
    name: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    clerk_org_id: v.optional(v.string()),
    booking_start_hour: v.optional(v.number()),
    booking_end_hour: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const branch_code = generateBranchCode(args.name);

    // Check if branch code already exists
    const existingBranch = await ctx.db
      .query("branches")
      .withIndex("by_branch_code", (q) => q.eq("branch_code", branch_code))
      .first();

    if (existingBranch) {
      throw new Error("A branch with this code already exists. Please try again.");
    }

    const branchId = await ctx.db.insert("branches", {
      branch_code,
      name: args.name.trim(),
      address: args.address.trim(),
      phone: args.phone.trim(),
      email: args.email.trim().toLowerCase(),
      is_active: true,
      clerk_org_id: args.clerk_org_id,
      booking_start_hour: args.booking_start_hour ?? 10,
      booking_end_hour: args.booking_end_hour ?? 20,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Copy default services from the defaultServices table
    const defaultServiceTemplates = await ctx.db.query("defaultServices")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    for (const template of defaultServiceTemplates) {
      await ctx.db.insert("services", {
        name: template.name,
        description: template.description,
        price: template.price,
        duration_minutes: template.duration_minutes,
        category: template.category,
        branch_id: branchId,
        is_active: true,
        hide_price: template.hide_price,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return branchId;
  },
});

/**
 * Generate a URL-safe slug from branch name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 48); // Clerk slug max length
}

/**
 * Create a branch with automatic Clerk Organization creation
 * Story 13-1: Branch Creation with Clerk Organization
 *
 * Flow:
 * 1. Validate inputs
 * 2. Call Clerk API to create organization
 * 3. Create branch with clerk_org_id
 * 4. If Clerk fails, don't create branch (automatic rollback)
 */
export const createBranchWithClerkOrg = action({
  args: {
    name: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    booking_start_hour: v.optional(v.number()),
    booking_end_hour: v.optional(v.number()),
    skipClerkOrg: v.optional(v.boolean()), // Skip Clerk org creation (for testing/migration)
  },
  handler: async (ctx, args) => {
    // 1. Validate inputs
    if (!args.name.trim()) {
      throw new Error("Branch name cannot be empty.");
    }
    if (!args.address.trim()) {
      throw new Error("Branch address cannot be empty.");
    }
    if (!args.phone.trim()) {
      throw new Error("Branch phone number cannot be empty.");
    }
    if (!args.email.trim()) {
      throw new Error("Branch email cannot be empty.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
      throw new Error("Please provide a valid email address.");
    }

    let clerk_org_id: string | undefined;

    // 2. Create Clerk Organization (unless skipped)
    if (!args.skipClerkOrg) {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;

      if (!clerkSecretKey) {
        console.warn("[Branches] CLERK_SECRET_KEY not configured, skipping org creation");
      } else {
        try {
          const slug = generateSlug(args.name);

          console.log("[Branches] Creating Clerk Organization:", {
            name: args.name,
            slug,
          });

          const response = await fetch("https://api.clerk.com/v1/organizations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: args.name.trim(),
              slug: slug,
              public_metadata: {
                source: "tpx-booking-app",
                created_via: "createBranchWithClerkOrg",
              },
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Check for slug already taken
            if (errorData.errors?.[0]?.code === "form_identifier_exists") {
              // Try with a unique suffix
              const uniqueSlug = `${slug}-${Date.now().toString().slice(-4)}`;
              const retryResponse = await fetch("https://api.clerk.com/v1/organizations", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${clerkSecretKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: args.name.trim(),
                  slug: uniqueSlug,
                  public_metadata: {
                    source: "tpx-booking-app",
                    created_via: "createBranchWithClerkOrg",
                  },
                }),
              });

              if (!retryResponse.ok) {
                const retryError = await retryResponse.json();
                console.error("[Branches] Clerk API error on retry:", retryError);
                throw new Error(
                  `Failed to create Clerk Organization: ${retryError.errors?.[0]?.message || "Unknown error"}`
                );
              }

              const retryClerkOrg = await retryResponse.json();
              clerk_org_id = retryClerkOrg.id;
              console.log("[Branches] Created Clerk Organization with unique slug:", clerk_org_id);
            } else {
              console.error("[Branches] Clerk API error:", errorData);
              throw new Error(
                `Failed to create Clerk Organization: ${errorData.errors?.[0]?.message || "Unknown error"}`
              );
            }
          } else {
            const clerkOrg = await response.json();
            clerk_org_id = clerkOrg.id;
            console.log("[Branches] Created Clerk Organization:", clerk_org_id);
          }
        } catch (error: any) {
          // If Clerk fails, don't create the branch (rollback by not proceeding)
          console.error("[Branches] Failed to create Clerk Organization:", error.message);
          throw new Error(
            `Failed to create branch: Could not create Clerk Organization. ${error.message}`
          );
        }
      }
    }

    // 3. Create the branch with clerk_org_id
    try {
      const branchId = await ctx.runMutation(internal.services.branches.createBranchInternal, {
        name: args.name.trim(),
        address: args.address.trim(),
        phone: args.phone.trim(),
        email: args.email.trim().toLowerCase(),
        clerk_org_id,
        booking_start_hour: args.booking_start_hour,
        booking_end_hour: args.booking_end_hour,
      });

      // If we created a Clerk org, update it with the branch_id in metadata
      if (clerk_org_id) {
        const clerkSecretKey = process.env.CLERK_SECRET_KEY;
        if (clerkSecretKey) {
          try {
            await fetch(`https://api.clerk.com/v1/organizations/${clerk_org_id}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                public_metadata: {
                  source: "tpx-booking-app",
                  created_via: "createBranchWithClerkOrg",
                  branch_id: branchId,
                },
              }),
            });
            console.log("[Branches] Updated Clerk org with branch_id:", branchId);
          } catch (err) {
            // Non-critical - just log the error
            console.warn("[Branches] Failed to update Clerk org metadata:", err);
          }
        }
      }

      console.log("[Branches] Branch created successfully:", branchId);
      return { branchId, clerk_org_id };
    } catch (error: any) {
      // If branch creation fails but Clerk org was created, try to delete the org
      if (clerk_org_id) {
        const clerkSecretKey = process.env.CLERK_SECRET_KEY;
        if (clerkSecretKey) {
          try {
            await fetch(`https://api.clerk.com/v1/organizations/${clerk_org_id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
              },
            });
            console.log("[Branches] Rolled back Clerk Organization:", clerk_org_id);
          } catch (deleteErr) {
            console.error("[Branches] Failed to rollback Clerk org:", deleteErr);
          }
        }
      }
      throw error;
    }
  },
});

/**
 * Update branch's clerk_org_id
 * Used to manually link a branch to an existing Clerk organization
 */
export const linkBranchToClerkOrg = mutation({
  args: {
    branchId: v.id("branches"),
    clerk_org_id: v.string(),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Branch not found", "The branch does not exist.");
    }

    // Check if another branch already has this clerk_org_id
    const existingWithOrg = await ctx.db
      .query("branches")
      .filter((q) =>
        q.and(
          q.eq(q.field("clerk_org_id"), args.clerk_org_id),
          q.neq(q.field("_id"), args.branchId)
        )
      )
      .first();

    if (existingWithOrg) {
      throwUserError(
        ERROR_CODES.OPERATION_FAILED,
        "Organization already linked",
        "This Clerk Organization is already linked to another branch."
      );
    }

    await ctx.db.patch(args.branchId, {
      clerk_org_id: args.clerk_org_id,
      updatedAt: Date.now(),
    });

    console.log("[Branches] Linked branch to Clerk org:", {
      branchId: args.branchId,
      clerk_org_id: args.clerk_org_id,
    });

    return args.branchId;
  },
});

export const updateBranch = mutation({
  args: {
    id: v.id("branches"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    booking_start_hour: v.optional(v.number()),
    booking_end_hour: v.optional(v.number()),
    carousel_images: v.optional(v.array(v.string())),
    enable_booking_fee: v.optional(v.boolean()),
    booking_fee_amount: v.optional(v.number()),
    enable_late_fee: v.optional(v.boolean()),
    late_fee_amount: v.optional(v.number()),
    booking_fee_type: v.optional(v.string()),
    late_fee_type: v.optional(v.string()),
    late_fee_grace_period: v.optional(v.number()),
    // Branch Profile fields
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    profile_photo: v.optional(v.string()),
    cover_photo: v.optional(v.string()),
    social_links: v.optional(
      v.object({
        facebook: v.optional(v.string()),
        instagram: v.optional(v.string()),
        tiktok: v.optional(v.string()),
        twitter: v.optional(v.string()),
        youtube: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const branch = await ctx.db.get(id);
    if (!branch) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Branch not found", "The branch you are trying to update does not exist.");
    }

    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid email", "Please provide a valid email address.");
    }

    const updateData: Partial<Doc<"branches">> = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key =>
      updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]
    );

    await ctx.db.patch(id, updateData);
    return id;
  },
});

// Set branch slug for testing/admin (internal use)
export const setBranchSlug = internalMutation({
  args: {
    branchId: v.id("branches"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if slug is already taken
    const existing = await ctx.db
      .query("branches")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing && existing._id !== args.branchId) {
      throw new Error(`Slug "${args.slug}" is already taken by another branch`);
    }

    await ctx.db.patch(args.branchId, {
      slug: args.slug,
      updatedAt: Date.now(),
    });

    return { success: true, slug: args.slug };
  },
});

export const deleteBranch = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.id);
    if (!branch) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Branch not found", "The branch you are trying to delete does not exist.");
    }

    // Check if branch has any associated data - only need to check if ANY exist, not count all
    const [users, barbers, services, bookings, transactions] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .first(), // Only need to know if at least one exists
      ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .first(),
      ctx.db
        .query("services")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .first(),
      ctx.db
        .query("bookings")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .first(),
      ctx.db
        .query("transactions")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .first(),
    ]);

    if (users || barbers || services || bookings || transactions) {
      throwUserError(
        ERROR_CODES.OPERATION_FAILED,
        "Cannot delete branch",
        "This branch has associated data (users, barbers, services, bookings, or transactions). Please remove or transfer these records before deleting the branch."
      );
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const toggleBranchStatus = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.id);
    if (!branch) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Branch not found", "The branch you are trying to update does not exist.");
    }

    const goingOffline = branch.is_active === true;
    await ctx.db.patch(args.id, {
      is_active: !branch.is_active,
      updatedAt: Date.now(),
    });

    // Email + in-app when branch goes offline
    if (goingOffline) {
      try {
        await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
          notification_type: "branch_offline",
          role: "super_admin",
          variables: { branch_name: branch.name || "Unknown Branch" },
        });
        await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
          notification_type: "branch_offline",
          role: "branch_admin",
          branch_id: args.id,
          variables: { branch_name: branch.name || "Unknown Branch" },
        });
      } catch (e) { console.error("[BRANCHES] Offline email failed:", e); }

      try {
        await ctx.db.insert("notifications", {
          title: "Branch Offline",
          message: `${branch.name} has been marked as inactive`,
          type: "alert" as const,
          priority: "high" as const,
          recipient_type: "admin" as const,
          is_read: false,
          is_archived: false,
          action_label: "View Branch",
          metadata: { branch_id: args.id, branch_name: branch.name },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } catch (e) { console.error("[BRANCHES] In-app notification failed:", e); }
    }

    return args.id;
  },
});