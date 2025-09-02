import { mutation, query, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Xendit API configuration
const XENDIT_API_KEY = 'xnd_development_ES0mrBxcK9s2GqcQtp2hZsl3kDHDCkqwctk9Wb3CIlbUKj2pByM42sU6BcI';
const XENDIT_BASE_URL = 'https://api.xendit.co';
const BASE_URL = 'http://localhost:3000'; // Default base URL for redirects

// Create payment request with Xendit
export const createPaymentRequest = action({
  args: {
    amount: v.number(),
    paymentMethod: v.string(),
    bookingId: v.id("bookings"),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    try {
      // Map payment methods to Xendit channel codes
      const channelCodeMap: Record<string, string> = {
        'gcash': 'GCASH',
        'maya': 'PAYMAYA'
      };

      const channelCode = channelCodeMap[args.paymentMethod.toLowerCase()];
      if (!channelCode) {
        throw new Error('Unsupported payment method');
      }

      // Create payment request payload
      const paymentPayload = {
        reference_id: `booking_${args.bookingId}_${Date.now()}`,
        type: 'PAY',
        country: 'PH',
        currency: 'PHP',
        request_amount: args.amount,
        capture_method: 'AUTOMATIC',
        channel_code: channelCode,
        channel_properties: {
          failure_return_url: `${BASE_URL}/booking/payment/failure`,
          success_return_url: `${BASE_URL}/booking/payment/success`
        },
        description: `TPX Barbershop - Booking Payment #${args.bookingId}`,
        metadata: {
          booking_id: args.bookingId,
          customer_email: args.customerEmail || '',
          customer_name: args.customerName || '',
          payment_method: args.paymentMethod
        }
      };

      // Create base64 encoded auth header
      const authString = XENDIT_API_KEY + ':';
      const base64Auth = btoa(authString);

      // Make request to Xendit API
      const response = await fetch(`${XENDIT_BASE_URL}/v3/payment_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Auth}`,
          'Content-Type': 'application/json',
          'api-version': '2024-11-11'
        },
        body: JSON.stringify(paymentPayload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Xendit API Error:', responseData);
        throw new Error(`Payment creation failed: ${responseData.error_code || 'Unknown error'}`);
      }

      // Store payment record in database using internal mutation
      const paymentId = await ctx.runMutation(internal.services.payments.storePaymentRecord, {
        booking_id: args.bookingId,
        payment_request_id: responseData.payment_request_id,
        reference_id: responseData.reference_id,
        amount: args.amount,
        payment_method: args.paymentMethod,
        status: responseData.status
      });

      // Return payment response
      return {
        success: true,
        payment_id: responseData.payment_request_id,
        reference_id: responseData.reference_id,
        status: responseData.status,
        actions: responseData.actions,
        redirect_url: responseData.actions?.find((action: any) => action.type === 'REDIRECT_CUSTOMER')?.value,
        convex_payment_id: paymentId
      };

    } catch (error) {
      console.error('Payment creation error:', error);
      throw new Error(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

// Internal mutation to store payment record
export const storePaymentRecord = mutation({
  args: {
    booking_id: v.id("bookings"),
    payment_request_id: v.string(),
    reference_id: v.string(),
    amount: v.number(),
    payment_method: v.string(),
    status: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      booking_id: args.booking_id,
      payment_request_id: args.payment_request_id,
      reference_id: args.reference_id,
      amount: args.amount,
      payment_method: args.payment_method,
      status: args.status,
      created_at: Date.now(),
      updated_at: Date.now()
    });
  }
});

// Update payment status (for webhook handling)
export const updatePaymentStatus = mutation({
  args: {
    payment_request_id: v.string(),
    status: v.string(),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    try {
      // Find payment record
      const payment = await ctx.db
        .query("payments")
        .filter((q) => q.eq(q.field("payment_request_id"), args.payment_request_id))
        .first();

      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Update payment status
      await ctx.db.patch(payment._id, {
        status: args.status,
        updated_at: Date.now(),
        webhook_data: args.metadata
      });

      // If payment succeeded, update booking status
      if (args.status === 'SUCCEEDED') {
        await ctx.db.patch(payment.booking_id, {
          status: 'confirmed',
          updatedAt: Date.now()
        });
      } else if (args.status === 'FAILED') {
        // Keep booking as is, payment failed but booking still exists
        console.log(`Payment failed for booking ${payment.booking_id}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Payment status update error:', error);
      throw new Error(`Failed to update payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

// Get payment by booking ID
export const getPaymentByBookingId = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("booking_id"), args.bookingId))
      .order("desc")
      .first();
  }
});

// Get payment by payment request ID
export const getPaymentByRequestId = query({
  args: { paymentRequestId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("payment_request_id"), args.paymentRequestId))
      .first();
  }
});