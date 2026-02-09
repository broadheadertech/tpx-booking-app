import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { toStorageFormat } from "../lib/points";

// Helper function to get or create a walk-in customer
async function getOrCreateWalkInCustomer(ctx: any, branch_id: Id<"branches">, customerName?: string, customerPhone?: string): Promise<Id<"users"> | undefined> {
  // Retry mechanism for walk-in customer creation
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[WALK-IN CUSTOMER] Attempt ${attempt}/${maxRetries} - Creating walk-in customer:`, {
        branch_id,
        customerName,
        customerPhone
      });

      // For walk-in customers, we'll always create a new record
      // This ensures each walk-in transaction is properly tracked
      // Use customer name if provided, otherwise generate a unique walk-in username
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const baseUsername = customerName?.trim()
        ? customerName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : `walkin_${timestamp}_${randomSuffix}`;
      const walkInUsername = `${baseUsername}_${timestamp}_${randomSuffix}`;
      const walkInEmail = `${walkInUsername}@walkin.local`;

      console.log('[WALK-IN CUSTOMER] Generated credentials:', {
        walkInUsername,
        walkInEmail
      });

      const userData = {
        username: walkInUsername,
        email: walkInEmail,
        password: "walkin_" + Math.random().toString(36), // Random password for walk-ins
        mobile_number: customerPhone || "",
        nickname: customerName?.trim() || "", // Store actual name in nickname
        role: "customer",
        branch_id: branch_id,
        is_active: true,
        avatar: "",
        bio: "",
        skills: [],
        isVerified: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      console.log('[WALK-IN CUSTOMER] Inserting user with data:', userData);

      const customerId = await ctx.db.insert("users", userData);

      console.log('[WALK-IN CUSTOMER] Successfully created walk-in customer with ID:', customerId);

      return customerId;
    } catch (error: any) {
      lastError = error;
      console.error(`[WALK-IN CUSTOMER] Attempt ${attempt}/${maxRetries} failed:`, error?.message || error);

      // If it's not the last attempt, wait briefly before retrying
      if (attempt < maxRetries) {
        console.log(`[WALK-IN CUSTOMER] Retrying in ${attempt * 100}ms...`);
        // Small delay between retries (can't use setTimeout in Convex, so we just continue)
      }
    }
  }

  // All retries failed
  console.error("[WALK-IN CUSTOMER] All retry attempts failed:", lastError?.message || lastError);
  console.error('[WALK-IN CUSTOMER] ERROR details:', {
    message: lastError?.message,
    stack: lastError?.stack,
    data: lastError?.data
  });
  return undefined;
}

// Create a new transaction
export const createTransaction = mutation({
  args: {
    customer: v.optional(v.id("users")),
    customer_name: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_address: v.optional(v.string()),
    branch_id: v.id("branches"),
    barber: v.optional(v.id("barbers")), // Optional for retail transactions
    services: v.optional(v.array(v.object({
      service_id: v.id("services"),
      service_name: v.string(),
      price: v.number(),
      quantity: v.number()
    }))),
    transaction_type: v.optional(v.union(
      v.literal("service"),
      v.literal("retail")
    )), // "service" = barber+services required, "retail" = products only
    products: v.optional(v.array(v.object({
      product_id: v.union(v.id("products"), v.id("productCatalog")), // Support both branch and catalog products
      product_name: v.string(),
      price: v.number(),
      quantity: v.number()
    }))),
    subtotal: v.number(),
    discount_amount: v.number(),
    voucher_applied: v.optional(v.id("vouchers")),
    tax_amount: v.number(),
    booking_fee: v.optional(v.number()),
    late_fee: v.optional(v.number()),
    total_amount: v.number(),
    payment_method: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("digital_wallet"),
      v.literal("bank_transfer"),
      v.literal("wallet"), // Customer wallet payment
      v.literal("combo") // Combination of points, wallet, and cash
    ),
    payment_status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    notes: v.optional(v.string()),
    cash_received: v.optional(v.number()),
    change_amount: v.optional(v.number()),
    // Combo payment fields (for payment_method = "combo")
    points_redeemed: v.optional(v.number()), // Integer ×100 format (e.g., 20000 = 200 pts)
    wallet_used: v.optional(v.number()), // Wallet amount (e.g., 150 = ₱150)
    cash_collected: v.optional(v.number()), // Cash portion (e.g., 150 = ₱150)
    processed_by: v.id("users"),
    skip_booking_creation: v.optional(v.boolean()), // Flag to skip automatic booking creation
    // Delivery fields
    fulfillment_type: v.optional(v.literal("delivery")),
    delivery_address: v.optional(v.object({
      street_address: v.string(),
      barangay: v.optional(v.string()),
      city: v.string(),
      province: v.string(),
      zip_code: v.string(),
      landmark: v.optional(v.string()),
      contact_name: v.string(),
      contact_phone: v.string(),
      notes: v.optional(v.string()),
    })),
    delivery_fee: v.optional(v.number()),
    delivery_status: v.optional(v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled")
    )),
    estimated_delivery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log('[TRANSACTION] Starting transaction creation with args:', args);

    // Validate walk-in customer has a name
    if (!args.customer && (!args.customer_name || args.customer_name.trim() === '')) {
      console.error('[TRANSACTION] Invalid customer name for walk-in customer');
      throwUserError(ERROR_CODES.TRANSACTION_INVALID_CUSTOMER_NAME, "Customer name missing", "Please provide a name for the walk-in customer.");
    }

    // Validate amounts
    if (args.subtotal < 0 || args.total_amount < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid amount", "Transaction amount cannot be negative.");
    }

    // Validate products stock if applicable
    if (args.products) {
      for (const product of args.products) {
        const productDoc = await ctx.db.get(product.product_id);
        if (!productDoc) {
          throwUserError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product not found`, `Product with ID ${product.product_id} not found.`);
        }
        if (productDoc.stock < product.quantity) {
          throwUserError(ERROR_CODES.PRODUCT_OUT_OF_STOCK, `Insufficient stock for ${product.product_name}`, `Only ${productDoc.stock} items available.`);
        }
      }
    }

    // Determine transaction type (default to 'service' for backward compatibility)
    const txType = args.transaction_type || 'service';

    // Validate based on transaction type
    if (txType === 'service') {
      // Service transactions require barber and services
      if (!args.barber) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Barber required", "Please select a barber for service transactions.");
      }
      if (!args.services || args.services.length === 0) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Service required", "At least one service is required for service transactions.");
      }
    } else if (txType === 'retail') {
      // Retail transactions require products
      if (!args.products || args.products.length === 0) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Product required", "At least one product is required for retail transactions.");
      }
    }

    // Process wallet payment if payment_method is "wallet"
    // This must happen BEFORE creating the transaction to ensure atomicity
    let walletDebitResult: { bonusUsed: number; mainUsed: number } | null = null;
    if (args.payment_method === "wallet") {
      // Wallet payment requires a registered customer
      if (!args.customer) {
        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          "Customer required for wallet payment",
          "Wallet payments require a registered customer account."
        );
      }

      console.log("[TRANSACTION] Processing wallet payment:", {
        customerId: args.customer,
        amount: args.total_amount,
      });

      // Debit wallet - uses bonus first, then main balance
      // This will throw if insufficient balance (atomic failure)
      walletDebitResult = await ctx.runMutation(api.services.wallet.debitWallet, {
        userId: args.customer,
        amount: args.total_amount,
        description: `Payment for services`,
        reference_id: `TXN-${Date.now()}`, // Will be updated with actual transaction ID
      });

      console.log("[TRANSACTION] Wallet debit successful:", walletDebitResult);
    }

    // Process combo payment if payment_method is "combo"
    // Deduction order: Points → Wallet → Cash
    // This must happen BEFORE creating the transaction to ensure atomicity
    let comboResult: {
      pointsRedeemed: number;
      walletUsed: number;
      cashCollected: number;
    } | null = null;

    if (args.payment_method === "combo") {
      // Combo payment requires a registered customer
      if (!args.customer) {
        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          "Customer required for combo payment",
          "Combo payments require a registered customer account."
        );
      }

      const pointsToRedeem = args.points_redeemed || 0;
      const walletToUse = args.wallet_used || 0;
      const cashToCollect = args.cash_collected || 0;

      console.log("[TRANSACTION] Processing combo payment:", {
        customerId: args.customer,
        totalAmount: args.total_amount,
        pointsToRedeem,
        walletToUse,
        cashToCollect,
      });

      // Validate combo amounts add up to total
      // Points are in ×100 format, so divide by 100 for peso value
      const pointsValue = pointsToRedeem / 100;
      const comboTotal = pointsValue + walletToUse + cashToCollect;
      if (Math.abs(comboTotal - args.total_amount) > 0.01) {
        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          "Combo payment amounts don't match",
          `Points (₱${pointsValue}) + Wallet (₱${walletToUse}) + Cash (₱${cashToCollect}) = ₱${comboTotal}, but total is ₱${args.total_amount}`
        );
      }

      // Step 1: Redeem points if any
      if (pointsToRedeem > 0) {
        console.log("[TRANSACTION] Redeeming points:", pointsToRedeem);
        await ctx.runMutation(api.services.points.redeemPoints, {
          userId: args.customer,
          amount: pointsToRedeem,
          sourceId: `TXN-${Date.now()}`,
          branchId: args.branch_id,
          notes: `Redeemed for combo payment - ₱${pointsValue}`,
        });
        console.log("[TRANSACTION] Points redeemed successfully");
      }

      // Step 2: Debit wallet if any
      if (walletToUse > 0) {
        console.log("[TRANSACTION] Debiting wallet:", walletToUse);
        walletDebitResult = await ctx.runMutation(api.services.wallet.debitWallet, {
          userId: args.customer,
          amount: walletToUse,
          description: `Combo payment - wallet portion`,
          reference_id: `TXN-${Date.now()}`,
        });
        console.log("[TRANSACTION] Wallet debit successful:", walletDebitResult);
      }

      // Step 3: Cash portion is just recorded for staff to collect
      comboResult = {
        pointsRedeemed: pointsToRedeem,
        walletUsed: walletToUse,
        cashCollected: cashToCollect,
      };

      console.log("[TRANSACTION] Combo payment processed:", comboResult);
    }

    // Generate unique transaction ID and receipt number
    const timestamp = Date.now();
    const transactionId = `TXN-${timestamp}`;
    const receiptNumber = `RCP-${timestamp}`;

    console.log('[TRANSACTION] Generated IDs:', { transactionId, receiptNumber });

    // Extract control flags that shouldn't be stored in the database
    // Delivery fields are included in transactionFields and will be stored
    const { skip_booking_creation, transaction_type, ...transactionFields } = args;

    // Set default delivery status for delivery orders
    if (transactionFields.fulfillment_type === 'delivery' && !transactionFields.delivery_status) {
      (transactionFields as Record<string, unknown>).delivery_status = 'pending';
    }

    const transactionData = {
      transaction_id: transactionId,
      receipt_number: receiptNumber,
      ...transactionFields,
      // Explicitly set transaction_type (default to 'service' for backward compatibility)
      transaction_type: txType,
      // Ensure services is always an array (empty for retail)
      services: args.services || [],
      // barber can be undefined for retail transactions
      barber: args.barber || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    console.log('[TRANSACTION] Final transaction data to insert:', transactionData);

    let transactionDocId: Id<"transactions">;
    try {
      transactionDocId = await ctx.db.insert("transactions", transactionData);
      console.log('[TRANSACTION] Successfully inserted transaction with ID:', transactionDocId);
    } catch (insertError) {
      console.error('[TRANSACTION] Failed to insert transaction:', insertError);
      throw insertError;
    }

    // Track created booking IDs for notifications
    const createdBookingIds: Id<"bookings">[] = [];

    // Create booking records for services performed in POS (skip if it's a booking payment or retail transaction)
    console.log('[BOOKING CREATION] Checking if bookings should be created:', {
      transactionType: txType,
      hasServices: !!args.services,
      servicesCount: args.services?.length || 0,
      skip_booking_creation: skip_booking_creation,
      willCreateBookings: txType === 'service' && args.services && args.services.length > 0 && !skip_booking_creation
    });

    // Only create bookings for service transactions with services (not retail)
    if (txType === 'service' && args.services && args.services.length > 0 && !skip_booking_creation) {
      console.log('[BOOKING CREATION] Starting booking creation for', args.services.length, 'services');

      for (const serviceItem of args.services) {
        try {
          console.log('[BOOKING CREATION] Processing service:', serviceItem.service_name);

          // Check if a booking already exists for this service and customer on the same day
          const today = new Date().toISOString().split('T')[0];
          let customerId = args.customer;

          console.log('[BOOKING CREATION] Initial customerId:', customerId);

          // For walk-in customers, create or find a walk-in customer record
          if (!customerId && (args.customer_name || args.customer_phone)) {
            console.log('[BOOKING CREATION] Creating walk-in customer for:', {
              customer_name: args.customer_name,
              customer_phone: args.customer_phone
            });
            customerId = await getOrCreateWalkInCustomer(ctx, args.branch_id, args.customer_name, args.customer_phone);
            console.log('[BOOKING CREATION] Walk-in customer created/found with ID:', customerId);
          }

          if (!customerId) {
            console.error('[BOOKING CREATION] ERROR: No customer ID available, skipping booking creation for service:', serviceItem.service_name);
            continue;
          }

          if (customerId) {
            const existingBooking = await ctx.db
              .query("bookings")
              .filter((q) =>
                q.and(
                  q.eq(q.field("customer"), customerId),
                  q.eq(q.field("service"), serviceItem.service_id),
                  q.eq(q.field("date"), today),
                  q.eq(q.field("barber"), args.barber),
                  q.or(
                    q.eq(q.field("status"), "pending"),
                    q.eq(q.field("status"), "confirmed")
                  )
                )
              )
              .first();

            if (!existingBooking) {
              console.log('[BOOKING CREATION] No existing booking found, creating new booking');

              // Get service details for price
              const serviceDetails = await ctx.db.get(serviceItem.service_id);
              if (!serviceDetails) {
                console.error('[BOOKING CREATION] Service not found:', serviceItem.service_id);
                continue;
              }

              // Generate booking code - exactly 8 characters (uppercase alphanumeric)
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
              let bookingCode = '';
              for (let i = 0; i < 8; i++) {
                bookingCode += chars.charAt(Math.floor(Math.random() * chars.length));
              }

              // Verify barber exists
              if (!args.barber) {
                console.error('[BOOKING CREATION] ERROR: No barber assigned to transaction');
                continue;
              }

              // Get current time in Philippine timezone (UTC+8)
              const philippineTime = new Date(Date.now() + (8 * 60 * 60 * 1000)); // Add 8 hours to UTC
              const hours = philippineTime.getUTCHours().toString().padStart(2, '0');
              const minutes = philippineTime.getUTCMinutes().toString().padStart(2, '0');
              const currentTime = `${hours}:${minutes}`;

              console.log('[BOOKING CREATION] Philippine time:', currentTime);

              // Create booking directly in database (bypass mutation validation)
              const bookingData = {
                booking_code: bookingCode,
                customer: customerId,
                customer_name: args.customer_name?.trim() || undefined,
                customer_phone: args.customer_phone?.trim() || undefined,
                customer_email: args.customer_email?.trim() || undefined,
                service: serviceItem.service_id,
                branch_id: args.branch_id,
                barber: args.barber as Id<"barbers">,
                date: today,
                time: currentTime,
                status: "completed" as const,
                payment_status: "paid" as const,
                price: serviceDetails.price,
                final_price: serviceItem.price, // Use the actual price from transaction (may include discounts)
                discount_amount: args.discount_amount || 0,
                booking_fee: args.booking_fee || 0,
                late_fee: args.late_fee || 0,
                voucher_id: args.voucher_applied || undefined,
                notes: `POS Transaction - Receipt: ${receiptNumber}${args.customer_name ? ` - ${args.customer_name}` : ''}`,
                reminder_sent: false,
                check_in_reminder_sent: false,
                createdAt: timestamp,
                updatedAt: timestamp,
              };

              console.log('[BOOKING CREATION] Creating booking directly in database:', bookingData);

              try {
                const bookingId = await ctx.db.insert("bookings", bookingData);
                console.log('[BOOKING CREATION] Successfully created booking with ID:', bookingId);

                // Track booking ID for notifications
                createdBookingIds.push(bookingId);
              } catch (bookingError) {
                console.error('[BOOKING CREATION] Failed to insert booking:', bookingError);
                console.error('[BOOKING CREATION] Booking data that failed:', bookingData);
                throw bookingError;
              }
            } else {
              // Track existing booking ID for notifications
              createdBookingIds.push(existingBooking._id);

              // Update existing booking to completed
              await ctx.runMutation(api.services.bookings.updateBooking, {
                id: existingBooking._id,
                status: "completed",
                notes: existingBooking.notes
                  ? `${existingBooking.notes}\nPOS Transaction - Receipt: ${receiptNumber}`
                  : `POS Transaction - Receipt: ${receiptNumber}`
              });

              // Update payment status to paid since transaction is completed
              await ctx.runMutation(api.services.bookings.updatePaymentStatus, {
                id: existingBooking._id,
                payment_status: "paid"
              });
            }
          }
        } catch (error: any) {
          console.error(`[BOOKING CREATION] ERROR - Failed to create/update booking for service ${serviceItem.service_name}:`, error);
          console.error('[BOOKING CREATION] ERROR details:', {
            message: error.message,
            stack: error.stack,
            data: error.data
          });
          // Don't fail the transaction if booking creation fails, but log it prominently
        }
      }

      console.log('[BOOKING CREATION] Completed booking creation process. Created bookings:', createdBookingIds.length);
    } else {
      console.log('[BOOKING CREATION] Skipping booking creation:', {
        reason: !args.services ? 'No services' :
          args.services.length === 0 ? 'Services array empty' :
            skip_booking_creation ? 'skip_booking_creation flag is true' :
              'Unknown'
      });
    }

    // Update product stock if products were sold
    if (args.products) {
      for (const product of args.products) {
        const productDoc = await ctx.db.get(product.product_id) as Record<string, unknown> | null;
        if (productDoc) {
          // Check if this is a branch product (has branch_id) or catalog product (has created_by)
          const isBranchProduct = 'branch_id' in productDoc;

          if (isBranchProduct) {
            // Branch products have soldThisMonth and updatedAt
            await ctx.db.patch(product.product_id, {
              stock: Math.max(0, (productDoc.stock as number) - product.quantity),
              soldThisMonth: ((productDoc.soldThisMonth as number) || 0) + product.quantity,
              updatedAt: timestamp
            });
          } else {
            // Catalog products only have stock field
            await ctx.db.patch(product.product_id, {
              stock: Math.max(0, (productDoc.stock as number) - product.quantity),
            });
          }
        }
      }
    }

    // Mark voucher as redeemed if applied (only for the attached customer)
    if (args.voucher_applied) {
      const voucherId = args.voucher_applied;
      console.log("[VOUCHER REDEMPTION] Starting voucher redemption process", {
        voucherId,
        customer: args.customer,
        customer_email: args.customer_email,
        customer_name: args.customer_name,
        branch_id: args.branch_id
      });

      // Resolve customer ID for redemption
      let customerIdForVoucher = args.customer as Id<"users"> | undefined;
      if (!customerIdForVoucher && args.customer_email) {
        // Try resolving by email if provided
        console.log("[VOUCHER REDEMPTION] Attempting to resolve customer by email:", args.customer_email);
        const userByEmail = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", args.customer_email!))
          .first();
        if (userByEmail) {
          customerIdForVoucher = userByEmail._id as Id<"users">;
          console.log("[VOUCHER REDEMPTION] Customer resolved by email:", customerIdForVoucher);
        } else {
          console.log("[VOUCHER REDEMPTION] No customer found with email:", args.customer_email);
        }
      }

      if (customerIdForVoucher) {
        console.log("[VOUCHER REDEMPTION] Looking for voucher assignment", {
          voucherId,
          customerIdForVoucher
        });

        // Find the specific user's assignment for this voucher
        const userAssignment = await ctx.db
          .query("user_vouchers")
          .withIndex("by_voucher_user", (q) => q.eq("voucher_id", voucherId).eq("user_id", customerIdForVoucher!))
          .first();

        console.log("[VOUCHER REDEMPTION] Voucher assignment found:", {
          assignmentId: userAssignment?._id,
          status: userAssignment?.status,
          assigned_at: userAssignment?.assigned_at
        });

        if (userAssignment && userAssignment.status === "assigned") {
          await ctx.db.patch(userAssignment._id, {
            status: "redeemed",
            redeemed_at: timestamp,
          });
          console.log("[VOUCHER REDEMPTION] Voucher successfully redeemed", {
            assignmentId: userAssignment._id,
            voucherId,
            customerIdForVoucher
          });
        } else {
          console.warn(
            "[VOUCHER REDEMPTION] Voucher assignment not found or not assignable for this customer",
            JSON.stringify({ voucherId, customerIdForVoucher, status: userAssignment?.status, assignmentExists: !!userAssignment })
          );
        }
      } else {
        console.warn(
          "[VOUCHER REDEMPTION] Skipping voucher redemption because no customer is attached to the transaction",
          JSON.stringify({
            voucherId,
            providedCustomer: args.customer,
            providedEmail: args.customer_email,
            providedName: args.customer_name
          })
        );
      }
    }

    // Send real-time payment notifications (only if bookings were created)
    // Only send notifications if we have booking IDs, as the notification function requires a booking ID
    if (createdBookingIds.length > 0) {
      try {
        // Use the first booking ID for notifications (or send multiple notifications if needed)
        const primaryBookingId = createdBookingIds[0];

        // Send payment received notification to customer
        if (args.customer && args.payment_status === "completed") {
          await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
            bookingId: primaryBookingId,
            notificationType: "CUSTOMER_PAYMENT_RECEIVED",
            recipients: [
              { type: "customer", userId: args.customer },
            ],
            metadata: {
              amount: args.total_amount,
              receipt_number: receiptNumber,
              service_name: args.services[0]?.service_name || "Services",
            }
          });
        }

        // Notify staff about new transaction
        await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
          bookingId: primaryBookingId,
          notificationType: "STAFF_NEW_BOOKING",
          recipients: [
            { type: "staff", branchId: args.branch_id },
          ],
          metadata: {
            customer_name: args.customer_name || "Walk-in Customer",
            service_name: args.services[0]?.service_name || "Services",
            amount: args.total_amount,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
          }
        });

        // If payment failed, notify staff about payment issue
        if (args.payment_status === "failed" && args.customer) {
          await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
            bookingId: primaryBookingId,
            notificationType: "STAFF_PAYMENT_ISSUE",
            recipients: [
              { type: "staff", branchId: args.branch_id },
            ],
            metadata: {
              customer_name: args.customer_name || "Customer",
              amount: args.total_amount,
              payment_method: args.payment_method,
            }
          });
        }
      } catch (error) {
        console.error("Failed to send payment notifications:", error);
        // Don't fail the transaction if notifications fail
      }
    } else {
      // Log that notifications were skipped because no bookings were created
      console.log("Skipping notifications - no bookings created for this transaction");
    }

    // Award loyalty points on completed payment (Customer Experience feature)
    // Points are earned at dynamic rates from loyalty_config (Story 19.1)
    // - wallet_bonus_multiplier (default 1.5x) for wallet payments
    // - base_earning_rate (default 1:1) for cash/card payments
    // - Combo payments: wallet portion (multiplier) + cash portion (base) + points portion (0)
    // (stored as ×100 integer format)
    if (args.payment_status === "completed" && args.customer) {
      try {
        // Get dynamic config values with fallbacks (Story 19.1)
        const WALLET_POINTS_MULTIPLIER = await ctx.runQuery(api.services.loyaltyConfig.getConfig, { key: "wallet_bonus_multiplier" }) || 1.5;
        const BASE_EARNING_RATE = await ctx.runQuery(api.services.loyaltyConfig.getConfig, { key: "base_earning_rate" }) || 1.0;
        const pointsEnabled = await ctx.runQuery(api.services.loyaltyConfig.getConfig, { key: "points_enabled" });

        // Check if points system is enabled (default true)
        if (pointsEnabled === false) {
          console.log("[POINTS] Points system disabled via loyalty_config - skipping award");
        } else {
        const isWalletPayment = args.payment_method === "wallet";
        const isComboPayment = args.payment_method === "combo";

        let pointsAmount: number;
        let sourceType: "payment" | "wallet_payment";
        let notesMessage: string;

        if (isComboPayment && comboResult) {
          // Combo payment: calculate points from cash and wallet portions only
          // Points redeemed portion earns 0 points
          const cashPortion = comboResult.cashCollected || 0;
          const walletPortion = comboResult.walletUsed || 0;

          const cashPoints = cashPortion * BASE_EARNING_RATE;
          const walletPoints = walletPortion * WALLET_POINTS_MULTIPLIER;
          pointsAmount = cashPoints + walletPoints;
          sourceType = walletPortion > 0 ? "wallet_payment" : "payment";

          notesMessage = `Earned from combo payment - Cash: ₱${cashPortion}×${BASE_EARNING_RATE} = ${cashPoints} pts, Wallet: ₱${walletPortion}×${WALLET_POINTS_MULTIPLIER} = ${walletPoints} pts - Receipt: ${receiptNumber}`;

          console.log("[POINTS] Combo payment points calculation:", {
            cashPortion,
            walletPortion,
            cashPoints,
            walletPoints,
            totalPointsEarned: pointsAmount,
          });
        } else if (isWalletPayment) {
          // Full wallet payment: wallet bonus multiplier
          pointsAmount = args.total_amount * WALLET_POINTS_MULTIPLIER;
          sourceType = "wallet_payment";
          notesMessage = `Earned from wallet payment (${WALLET_POINTS_MULTIPLIER}x bonus) - Receipt: ${receiptNumber}`;
        } else {
          // Cash/card payment: base earning rate
          pointsAmount = args.total_amount * BASE_EARNING_RATE;
          sourceType = "payment";
          notesMessage = `Earned from payment (${BASE_EARNING_RATE}x rate) - Receipt: ${receiptNumber}`;
        }

        const pointsToEarn = toStorageFormat(pointsAmount); // ×100 format

        console.log("[POINTS] Awarding points for completed payment:", {
          customerId: args.customer,
          amount: args.total_amount,
          paymentMethod: args.payment_method,
          pointsAmount,
          pointsToEarn,
          transactionId,
        });

        // Only award points if there's something to earn
        if (pointsToEarn > 0) {
          await ctx.runMutation(api.services.points.earnPoints, {
            userId: args.customer,
            amount: pointsToEarn,
            sourceType,
            sourceId: transactionId,
            branchId: args.branch_id,
            notes: notesMessage,
          });

          console.log("[POINTS] Successfully awarded points to customer:", {
            paymentMethod: args.payment_method,
            pointsEarned: pointsAmount,
          });
        } else {
          console.log("[POINTS] No points to earn (likely full points redemption)");
        }
        } // Close else block for pointsEnabled check
      } catch (pointsError) {
        // Log but don't fail the transaction if points awarding fails
        console.error("[POINTS] Failed to award points:", pointsError);
      }
    }

    return {
      transactionId: transactionDocId,
      transaction_id: transactionId,
      receipt_number: receiptNumber
    };
  },
});

// Get all transactions (for super admin) - with pagination
export const getAllTransactions = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50; // Default to 50 records per page

    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(limit + 1); // Take one extra to check if there are more

    const hasMore = transactions.length > limit;
    const results = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1]._id : null;

    // Populate related data with error handling
    const populatedTransactions = await Promise.all(
      results.map(async (transaction) => {
        try {
          const [customer, barber, processedBy, voucher, branch] = await Promise.all([
            transaction.customer ? ctx.db.get(transaction.customer) : null,
            transaction.barber ? ctx.db.get(transaction.barber) : null,
            transaction.processed_by ? ctx.db.get(transaction.processed_by) : null,
            transaction.voucher_applied ? ctx.db.get(transaction.voucher_applied) : null,
            transaction.branch_id ? ctx.db.get(transaction.branch_id) : null,
          ]);

          return {
            ...transaction,
            branch_name: branch?.name || 'Unknown Branch',
            customer_details: customer,
            barber_details: barber,
            processed_by_details: processedBy,
            voucher_details: voucher
          };
        } catch (error) {
          // Return transaction with minimal details if lookup fails
          return {
            ...transaction,
            branch_name: 'Unknown Branch',
            customer_details: null,
            barber_details: null,
            processed_by_details: null,
            voucher_details: null
          };
        }
      })
    );

    return {
      transactions: populatedTransactions,
      nextCursor,
      hasMore,
    };
  },
});

// Get transactions by branch (for branch admin/staff) - with pagination
export const getTransactionsByBranch = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50; // Default to 50 records per page

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .take(limit + 1);

    const hasMore = transactions.length > limit;
    const results = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1]._id : null;

    // Populate related data with error handling
    const populatedTransactions = await Promise.all(
      results.map(async (transaction) => {
        try {
          const [customer, barber, processedBy, voucher] = await Promise.all([
            transaction.customer ? ctx.db.get(transaction.customer) : null,
            transaction.barber ? ctx.db.get(transaction.barber) : null,
            transaction.processed_by ? ctx.db.get(transaction.processed_by) : null,
            transaction.voucher_applied ? ctx.db.get(transaction.voucher_applied) : null,
          ]);

          return {
            ...transaction,
            customer_display: customer?.username || transaction.customer_name || 'Walk-in Customer',
            barber_name: barber?.full_name || 'Unknown Barber',
            processed_by_name: processedBy?.username || 'Unknown Staff',
            voucher_code: voucher?.code || null,
          };
        } catch (error) {
          // Return transaction with minimal details if lookup fails
          return {
            ...transaction,
            customer_display: transaction.customer_name || 'Walk-in Customer',
            barber_name: 'Unknown Barber',
            processed_by_name: 'Unknown Staff',
            voucher_code: null,
          };
        }
      })
    );

    return {
      transactions: populatedTransactions,
      nextCursor,
      hasMore,
    };
  },
});

// Get transactions by date range
export const getTransactionsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branch_id: v.optional(v.id("branches"))
  },
  handler: async (ctx, args) => {
    // Basic query with time range filter using index
    let query = ctx.db
      .query("transactions")
      .withIndex("by_created_at", q => q.gte("createdAt", args.startDate).lte("createdAt", args.endDate));

    // Apply branch filter if provided
    // We use regular filter here because we already used the index for time range
    // Filtering by branch after fetching by time is usually efficient enough for analytics
    if (args.branch_id) {
      const branchId = args.branch_id;
      return await query
        .filter(q => q.eq(q.field("branch_id"), branchId))
        .order("desc")
        .collect();
    }

    return await query.order("desc").collect();
  },
});

// Get transactions by barber
export const getTransactionsByBarber = query({
  args: {
    barberId: v.id("barbers")
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_barber", (q) => q.eq("barber", args.barberId))
      .order("desc")
      .collect();

    return transactions;
  },
});

// Get transaction by receipt number
export const getTransactionByReceiptNumber = query({
  args: {
    receiptNumber: v.string()
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_receipt_number", (q) => q.eq("receipt_number", args.receiptNumber))
      .first();

    if (!transaction) {
      return null;
    }

    // Populate related data
    const customer = transaction.customer
      ? await ctx.db.get(transaction.customer)
      : null;
    const barber = transaction.barber
      ? await ctx.db.get(transaction.barber)
      : null;
    const processedBy = await ctx.db.get(transaction.processed_by);
    const voucher = transaction.voucher_applied
      ? await ctx.db.get(transaction.voucher_applied)
      : null;

    return {
      ...transaction,
      customer_details: customer,
      barber_details: barber,
      processed_by_details: processedBy,
      voucher_details: voucher
    };
  },
});

// Update transaction status
export const updateTransactionStatus = mutation({
  args: {
    transactionId: v.id("transactions"),
    payment_status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throwUserError(ERROR_CODES.TRANSACTION_NOT_FOUND, "Transaction not found", "The transaction you are trying to update does not exist.");
    }

    const timestamp = Date.now();

    await ctx.db.patch(args.transactionId, {
      payment_status: args.payment_status,
      notes: args.notes,
      updatedAt: timestamp
    });

    return { success: true };
  },
});

// Get daily sales summary
export const getDailySalesSummary = query({
  args: {
    date: v.string() // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    const startOfDay = new Date(args.date + 'T00:00:00').getTime();
    const endOfDay = new Date(args.date + 'T23:59:59').getTime();

    const transactions = await ctx.db
      .query("transactions")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), startOfDay),
          q.lte(q.field("createdAt"), endOfDay),
          q.eq(q.field("payment_status"), "completed")
        )
      )
      .collect();

    const summary = {
      totalTransactions: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.total_amount, 0),
      totalDiscount: transactions.reduce((sum, t) => sum + t.discount_amount, 0),
      totalTax: transactions.reduce((sum, t) => sum + t.tax_amount, 0),
      paymentMethods: {
        cash: transactions.filter(t => t.payment_method === 'cash').length,
        card: transactions.filter(t => t.payment_method === 'card').length,
        digital_wallet: transactions.filter(t => t.payment_method === 'digital_wallet').length,
        bank_transfer: transactions.filter(t => t.payment_method === 'bank_transfer').length
      },
      topServices: {} as Record<string, number>,
      topProducts: {} as Record<string, number>
    };

    // Calculate top services and products
    transactions.forEach(transaction => {
      transaction.services.forEach(service => {
        summary.topServices[service.service_name] =
          (summary.topServices[service.service_name] || 0) + service.quantity;
      });

      if (transaction.products) {
        transaction.products.forEach(product => {
          summary.topProducts[product.product_name] =
            (summary.topProducts[product.product_name] || 0) + product.quantity;
        });
      }
    });

    return summary;
  },
});

// Refund transaction
export const refundTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    refundReason: v.string(),
    processedBy: v.id("users")
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throwUserError(ERROR_CODES.TRANSACTION_NOT_FOUND);
    }

    if (transaction.payment_status === "refunded") {
      throwUserError(ERROR_CODES.TRANSACTION_ALREADY_REFUNDED);
    }

    const processedBy = await ctx.db.get(args.processedBy);
    if (!processedBy) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Staff not found", "The staff member processing this refund could not be found.");
    }

    const timestamp = Date.now();

    // Update transaction status
    await ctx.db.patch(args.transactionId, {
      payment_status: "refunded",
      notes: `Refunded: ${args.refundReason}`,
      updatedAt: timestamp
    });

    // Restore product stock if products were sold
    if (transaction.products) {
      for (const product of transaction.products) {
        const productDoc = await ctx.db.get(product.product_id) as Record<string, unknown> | null;
        if (productDoc) {
          // Check if this is a branch product (has branch_id) or catalog product (has created_by)
          const isBranchProduct = 'branch_id' in productDoc;

          if (isBranchProduct) {
            // Branch products have soldThisMonth and updatedAt
            await ctx.db.patch(product.product_id, {
              stock: (productDoc.stock as number) + product.quantity,
              soldThisMonth: Math.max(0, ((productDoc.soldThisMonth as number) || 0) - product.quantity),
              updatedAt: timestamp
            });
          } else {
            // Catalog products only have stock field
            await ctx.db.patch(product.product_id, {
              stock: (productDoc.stock as number) + product.quantity,
            });
          }
        }
      }
    }

    // Restore voucher if it was applied
    if (transaction.voucher_applied) {
      await ctx.db.patch(transaction.voucher_applied, {
        redeemed: false,
        redeemed_by: undefined,
        redeemed_at: undefined,
        updatedAt: timestamp
      });
    }

    return { success: true };
  },
});

// Get product/retail transaction history
export const getProductTransactionHistory = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get all transactions for the branch
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    // Filter to only include transactions with products
    const productTransactions = transactions
      .filter((t) => t.products && t.products.length > 0 && t.payment_status === "completed")
      .slice(0, limit);

    // Populate related data
    const populatedTransactions = await Promise.all(
      productTransactions.map(async (transaction) => {
        try {
          const [customer, processedBy] = await Promise.all([
            transaction.customer ? ctx.db.get(transaction.customer) : null,
            transaction.processed_by ? ctx.db.get(transaction.processed_by) : null,
          ]);

          // Calculate product total for this transaction
          const productTotal = (transaction.products || []).reduce(
            (sum, p) => sum + (p.price * p.quantity), 0
          );

          return {
            _id: transaction._id,
            receipt_number: transaction.receipt_number,
            transaction_type: transaction.transaction_type || 'service',
            customer_name: customer?.username || transaction.customer_name || 'Walk-in Customer',
            processed_by_name: processedBy?.username || 'Staff',
            products: transaction.products,
            product_total: productTotal,
            total_amount: transaction.total_amount,
            payment_method: transaction.payment_method,
            createdAt: transaction.createdAt,
          };
        } catch (error) {
          return {
            _id: transaction._id,
            receipt_number: transaction.receipt_number,
            transaction_type: transaction.transaction_type || 'service',
            customer_name: transaction.customer_name || 'Walk-in Customer',
            processed_by_name: 'Staff',
            products: transaction.products,
            product_total: (transaction.products || []).reduce(
              (sum, p) => sum + (p.price * p.quantity), 0
            ),
            total_amount: transaction.total_amount,
            payment_method: transaction.payment_method,
            createdAt: transaction.createdAt,
          };
        }
      })
    );

    return populatedTransactions;
  },
});

// Get customer's retail transaction history (for Shop order history)
export const getCustomerRetailTransactions = query({
  args: {
    customerId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customer", args.customerId))
      .order("desc")
      .take(args.limit || 50);

    // Filter to only retail transactions (products only, no services)
    const retailTransactions = transactions.filter(
      (t) => t.transaction_type === "retail" ||
             (t.products && t.products.length > 0 && (!t.services || t.services.length === 0))
    );

    // Populate with branch info
    const populatedTransactions = await Promise.all(
      retailTransactions.map(async (transaction) => {
        const branch = await ctx.db.get(transaction.branch_id);
        return {
          _id: transaction._id,
          transaction_id: transaction.transaction_id,
          receipt_number: transaction.receipt_number,
          products: transaction.products || [],
          total_amount: transaction.total_amount,
          payment_method: transaction.payment_method,
          payment_status: transaction.payment_status,
          createdAt: transaction.createdAt,
          branch_name: branch?.name || "Unknown Branch",
          branch_address: branch?.address || "",
          item_count: (transaction.products || []).reduce((sum, p) => sum + p.quantity, 0),
          // Delivery fields
          fulfillment_type: transaction.fulfillment_type || "pickup",
          delivery_address: transaction.delivery_address || null,
          delivery_status: transaction.delivery_status || null,
          delivery_fee: transaction.delivery_fee || 0,
        };
      })
    );

    return populatedTransactions;
  },
});

// Get all delivery orders (for Super Admin)
export const getDeliveryOrders = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("all")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    // Get all transactions
    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(limit * 2); // Take extra to filter

    // Filter to delivery orders only
    let deliveryOrders = transactions.filter(
      (t) => t.fulfillment_type === "delivery"
    );

    // Filter by status if specified
    if (args.status && args.status !== "all") {
      deliveryOrders = deliveryOrders.filter(
        (t) => t.delivery_status === args.status
      );
    }

    // Limit results
    deliveryOrders = deliveryOrders.slice(0, limit);

    // Populate with customer and branch info
    const populatedOrders = await Promise.all(
      deliveryOrders.map(async (order) => {
        const [customer, branch] = await Promise.all([
          order.customer ? ctx.db.get(order.customer) : null,
          ctx.db.get(order.branch_id),
        ]);

        return {
          _id: order._id,
          transaction_id: order.transaction_id,
          receipt_number: order.receipt_number,
          customer_name: customer?.username || order.customer_name || "Guest",
          customer_email: customer?.email || order.customer_email,
          customer_phone: customer?.mobile_number || order.customer_phone,
          products: order.products || [],
          total_amount: order.total_amount,
          delivery_fee: order.delivery_fee || 0,
          delivery_address: order.delivery_address,
          delivery_status: order.delivery_status || "pending",
          estimated_delivery: order.estimated_delivery,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          branch_name: branch?.name || "Unknown Branch",
          branch_id: order.branch_id,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          notes: order.notes,
          item_count: (order.products || []).reduce((sum, p) => sum + p.quantity, 0),
        };
      })
    );

    return populatedOrders;
  },
});

// Update delivery status (for Super Admin / Staff)
export const updateDeliveryStatus = mutation({
  args: {
    transactionId: v.id("transactions"),
    delivery_status: v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
    estimated_delivery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throwUserError(ERROR_CODES.TRANSACTION_NOT_FOUND, "Transaction not found", "The transaction you are trying to update does not exist.");
    }

    if (transaction.fulfillment_type !== "delivery") {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Not a delivery order", "This transaction is not a delivery order.");
    }

    const timestamp = Date.now();
    const updates: Record<string, unknown> = {
      delivery_status: args.delivery_status,
      updatedAt: timestamp,
    };

    if (args.notes) {
      updates.notes = transaction.notes
        ? `${transaction.notes}\n[${new Date(timestamp).toLocaleString()}] Status: ${args.delivery_status} - ${args.notes}`
        : `[${new Date(timestamp).toLocaleString()}] Status: ${args.delivery_status} - ${args.notes}`;
    }

    if (args.estimated_delivery) {
      updates.estimated_delivery = args.estimated_delivery;
    }

    await ctx.db.patch(args.transactionId, updates);

    return { success: true, delivery_status: args.delivery_status };
  },
});