import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * User Addresses Service - Saved delivery addresses
 */

// Get all addresses for a user
export const getUserAddresses = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const addresses = await ctx.db
      .query("user_addresses")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .collect();

    // Add computed full_address for display
    return addresses.map((addr) => ({
      ...addr,
      full_address: formatFullAddress(addr),
    }));
  },
});

// Helper to format full address
function formatFullAddress(addr: {
  street_address: string;
  barangay?: string;
  city: string;
  province: string;
  zip_code: string;
}): string {
  const parts = [addr.street_address];
  if (addr.barangay) parts.push(`Brgy. ${addr.barangay}`);
  parts.push(addr.city);
  parts.push(addr.province);
  parts.push(addr.zip_code);
  return parts.join(", ");
}

// Get user's default address
export const getDefaultAddress = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const addr = await ctx.db
      .query("user_addresses")
      .withIndex("by_user_default", (q) =>
        q.eq("user_id", args.user_id).eq("is_default", true)
      )
      .first();

    if (!addr) return null;

    return {
      ...addr,
      full_address: formatFullAddress(addr),
    };
  },
});

// Add a new address
export const addAddress = mutation({
  args: {
    user_id: v.id("users"),
    label: v.string(),
    street_address: v.string(),
    barangay: v.optional(v.string()),
    city: v.string(),
    province: v.string(),
    zip_code: v.string(),
    landmark: v.optional(v.string()),
    contact_name: v.string(),
    contact_phone: v.string(),
    is_default: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isDefault = args.is_default ?? false;

    // If this is the default address, unset other defaults
    if (isDefault) {
      const existingAddresses = await ctx.db
        .query("user_addresses")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .collect();

      for (const addr of existingAddresses) {
        if (addr.is_default) {
          await ctx.db.patch(addr._id, { is_default: false, updatedAt: now });
        }
      }
    }

    // Check if this is the first address - make it default
    const addressCount = await ctx.db
      .query("user_addresses")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    const shouldBeDefault = isDefault || addressCount.length === 0;

    const addressId = await ctx.db.insert("user_addresses", {
      user_id: args.user_id,
      label: args.label,
      street_address: args.street_address,
      barangay: args.barangay,
      city: args.city,
      province: args.province,
      zip_code: args.zip_code,
      landmark: args.landmark,
      contact_name: args.contact_name,
      contact_phone: args.contact_phone,
      is_default: shouldBeDefault,
      createdAt: now,
      updatedAt: now,
    });

    return { addressId, is_default: shouldBeDefault };
  },
});

// Update an address
export const updateAddress = mutation({
  args: {
    address_id: v.id("user_addresses"),
    label: v.optional(v.string()),
    street_address: v.optional(v.string()),
    barangay: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    zip_code: v.optional(v.string()),
    landmark: v.optional(v.string()),
    contact_name: v.optional(v.string()),
    contact_phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { address_id, ...updates } = args;

    const address = await ctx.db.get(address_id);
    if (!address) {
      throw new Error("Address not found");
    }

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(address_id, filteredUpdates);
    return { success: true };
  },
});

// Set an address as default
export const setDefaultAddress = mutation({
  args: {
    user_id: v.id("users"),
    address_id: v.id("user_addresses"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify address belongs to user
    const address = await ctx.db.get(args.address_id);
    if (!address || address.user_id !== args.user_id) {
      throw new Error("Address not found or does not belong to user");
    }

    // Unset all other defaults for this user
    const allAddresses = await ctx.db
      .query("user_addresses")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    for (const addr of allAddresses) {
      if (addr._id === args.address_id) {
        await ctx.db.patch(addr._id, { is_default: true, updatedAt: now });
      } else if (addr.is_default) {
        await ctx.db.patch(addr._id, { is_default: false, updatedAt: now });
      }
    }

    return { success: true };
  },
});

// Delete an address
export const deleteAddress = mutation({
  args: {
    user_id: v.id("users"),
    address_id: v.id("user_addresses"),
  },
  handler: async (ctx, args) => {
    // Verify address belongs to user
    const address = await ctx.db.get(args.address_id);
    if (!address || address.user_id !== args.user_id) {
      throw new Error("Address not found or does not belong to user");
    }

    const wasDefault = address.is_default;
    await ctx.db.delete(args.address_id);

    // If we deleted the default, set another as default
    if (wasDefault) {
      const remainingAddresses = await ctx.db
        .query("user_addresses")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .order("desc")
        .first();

      if (remainingAddresses) {
        await ctx.db.patch(remainingAddresses._id, {
          is_default: true,
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});
