import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// Helper function to get or create a walk-in customer
async function getOrCreateWalkInCustomer(ctx: any, branch_id: Id<"branches">, customerName?: string, customerPhone?: string): Promise<Id<"users"> | undefined> {
  try {
    console.log('[WALK-IN CUSTOMER] Creating walk-in customer:', {
      branch_id,
      customerName,
      customerPhone
    });
    
    // For walk-in customers, we'll always create a new record
    // This ensures each walk-in transaction is properly tracked
    // Use customer name if provided, otherwise generate a unique walk-in username
    const baseUsername = customerName?.trim() 
      ? customerName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      : `walkin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const walkInUsername = `${baseUsername}_${Date.now()}`;
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[WALK-IN CUSTOMER] Inserting user with data:', userData);

    const customerId = await ctx.db.insert("users", userData);

    console.log('[WALK-IN CUSTOMER] Successfully created walk-in customer with ID:', customerId);

    return customerId;
  } catch (error) {
    console.error("[WALK-IN CUSTOMER] ERROR - Failed to create walk-in customer:", error);
    console.error('[WALK-IN CUSTOMER] ERROR details:', {
      message: error.message,
      stack: error.stack,
      data: error.data
    });
    return undefined;
  }
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
    barber: v.id("barbers"),
    services: v.array(v.object({
      service_id: v.id("services"),
      service_name: v.string(),
      price: v.number(),
      quantity: v.number()
    })),
    products: v.optional(v.array(v.object({
      product_id: v.id("products"),
      product_name: v.string(),
      price: v.number(),
      quantity: v.number()
    }))),
    subtotal: v.number(),
    discount_amount: v.number(),
    voucher_applied: v.optional(v.id("vouchers")),
    tax_amount: v.number(),
    total_amount: v.number(),
    payment_method: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("digital_wallet"),
      v.literal("bank_transfer")
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
    processed_by: v.id("users"),
    skip_booking_creation: v.optional(v.boolean()) // Flag to skip automatic booking creation
  },
  handler: async (ctx, args) => {
    console.log('[TRANSACTION] Starting transaction creation with args:', args);
    
    // Validate walk-in customer has a name
    if (!args.customer && (!args.customer_name || args.customer_name.trim() === '')) {
      console.error('[TRANSACTION] Invalid customer name for walk-in customer');
      throwUserError(ERROR_CODES.TRANSACTION_INVALID_CUSTOMER_NAME);
    }

    // Generate unique transaction ID and receipt number
    const timestamp = Date.now();
    const transactionId = `TXN-${timestamp}`;
    const receiptNumber = `RCP-${timestamp}`;
    
    console.log('[TRANSACTION] Generated IDs:', { transactionId, receiptNumber });

    // Extract control flags that shouldn't be stored in the database
    const { skip_booking_creation, ...transactionFields } = args;

    const transactionData = {
      transaction_id: transactionId,
      receipt_number: receiptNumber,
      ...transactionFields,
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

    // Create booking records for services performed in POS (skip if it's a booking payment)
    console.log('[BOOKING CREATION] Checking if bookings should be created:', {
      hasServices: !!args.services,
      servicesCount: args.services?.length || 0,
      skip_booking_creation: skip_booking_creation,
      willCreateBookings: args.services && args.services.length > 0 && !skip_booking_creation
    });

    if (args.services && args.services.length > 0 && !skip_booking_creation) {
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
        } catch (error) {
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
        const productDoc = await ctx.db.get(product.product_id);
        if (productDoc) {
          await ctx.db.patch(product.product_id, {
            stock: Math.max(0, productDoc.stock - product.quantity),
            soldThisMonth: productDoc.soldThisMonth + product.quantity,
            updatedAt: timestamp
          });
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

    return {
      transactionId: transactionDocId,
      transaction_id: transactionId,
      receipt_number: receiptNumber
    };
  },
});

// Get all transactions (for super admin)
export const getAllTransactions = query({
  handler: async (ctx) => {
    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .collect();

    // Populate related data
    const populatedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const [customer, barber, processedBy, voucher, branch] = await Promise.all([
          transaction.customer ? ctx.db.get(transaction.customer) : null,
          ctx.db.get(transaction.barber),
          ctx.db.get(transaction.processed_by),
          transaction.voucher_applied ? ctx.db.get(transaction.voucher_applied) : null,
          ctx.db.get(transaction.branch_id),
        ]);

        return {
          ...transaction,
          branch_name: branch?.name || 'Unknown Branch',
          customer_details: customer,
          barber_details: barber,
          processed_by_details: processedBy,
          voucher_details: voucher
        };
      })
    );

    return populatedTransactions;
  },
});

// Get transactions by branch (for branch admin/staff)
export const getTransactionsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    // Populate related data
    const populatedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const [customer, barber, processedBy, voucher] = await Promise.all([
          transaction.customer ? ctx.db.get(transaction.customer) : null,
          ctx.db.get(transaction.barber),
          ctx.db.get(transaction.processed_by),
          transaction.voucher_applied ? ctx.db.get(transaction.voucher_applied) : null,
        ]);

        return {
          ...transaction,
          customer_display: customer?.username || transaction.customer_name || 'Walk-in Customer',
          barber_name: barber?.full_name || 'Unknown Barber',
          processed_by_name: processedBy?.username || 'Unknown Staff',
          voucher_code: voucher?.code || null,
        };
      })
    );

    return populatedTransactions;
  },
});

// Get transactions by date range
export const getTransactionsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number()
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), args.startDate),
          q.lte(q.field("createdAt"), args.endDate)
        )
      )
      .order("desc")
      .collect();

    return transactions;
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
    const barber = await ctx.db.get(transaction.barber);
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
        const productDoc = await ctx.db.get(product.product_id);
        if (productDoc) {
          await ctx.db.patch(product.product_id, {
            stock: productDoc.stock + product.quantity,
            soldThisMonth: Math.max(0, productDoc.soldThisMonth - product.quantity),
            updatedAt: timestamp
          });
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