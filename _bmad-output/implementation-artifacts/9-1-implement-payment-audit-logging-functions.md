# Story 9.1: Implement Payment Audit Logging Functions

Status: done

## Story

As a **system**,
I want **centralized audit logging functions for payment events**,
So that **all payment operations are tracked consistently for compliance and debugging**.

## Acceptance Criteria

1. **Given** the system needs to log payment events
   **When** `logPaymentEvent` function is called
   **Then** it creates an entry in `paymentAuditLog` with:
   - `branch_id`, `booking_id`, `transaction_id`
   - `event_type` (link_created, payment_initiated, payment_completed, payment_failed, webhook_received, webhook_verified, webhook_failed)
   - `amount`, `payment_method`
   - `paymongo_payment_id`, `paymongo_link_id` (when available)
   - `raw_payload` (for webhooks - FR29)
   - `created_at` timestamp

2. **Given** payment link is created
   **When** system calls PayMongo API
   **Then** `link_created` event is logged (FR27)

3. **Given** webhook is received from PayMongo
   **When** webhook handler processes the request
   **Then** `webhook_verified` event is logged with raw payload (FR29)

4. **Given** a payment completes successfully
   **When** webhook processes `payment.paid`
   **Then** `payment_completed` event is logged with PayMongo transaction ID (FR28)

5. **Given** a payment fails
   **When** webhook processes `payment.failed`
   **Then** `payment_failed` event is logged with error details (FR28)

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Create logPaymentEvent utility function
  - [x] 2.1 Create function with all required parameters
  - [x] 2.2 Support all event types
  - [x] 2.3 Handle optional fields (paymongo_payment_id, etc.)
- [x] Task 3: Create getPaymentAuditLog query functions
  - [x] 3.1 getAuditLogByBranch - for branch admins
  - [x] 3.2 getAuditLogByBooking - for detail view
  - [x] 3.3 getAllAuditLogs - for super admin
- [x] Task 4: Verify existing logging integration
  - [x] 4.1 Check webhook handler uses audit logging
  - [x] 4.2 Check recordCashPayment uses audit logging
  - [x] 4.3 Check markBookingComplete uses audit logging
- [x] Task 5: Build and verify
  - [x] 5.1 Run npm run build
  - [x] 5.2 Verify no errors

## Dev Notes

### Event Types

| Event Type | When Logged |
|------------|-------------|
| link_created | PayMongo payment link created |
| payment_initiated | Customer redirected to PayMongo |
| payment_completed | Payment successful (webhook) |
| payment_failed | Payment failed (webhook) |
| webhook_received | Raw webhook received |
| webhook_verified | Webhook signature verified |
| webhook_failed | Webhook verification failed |
| cash_collection | Cash collected at POS |
| booking_completed | Booking marked complete |

### References

- [Source: prd-paymongo.md#FR27] - Log payment initiation
- [Source: prd-paymongo.md#FR28] - Log completed payment
- [Source: prd-paymongo.md#FR29] - Log raw webhook payload
- [Source: epics-paymongo.md#Story-4.1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None yet_

### Completion Notes List

1. Created story file with all requirements
2. Updated schema.ts to add `booking_completed` event type
3. Fixed event type in bookings.ts from `cash_collection` to `cash_collected`
4. Created `convex/services/paymentAudit.ts` with:
   - `logPaymentEvent` mutation for centralized audit logging
   - `getAuditLogByBranch` query (FR30)
   - `getAuditLogByBooking` query for audit trail
   - `getAllAuditLogs` query (FR31)
   - `getPaymentStatistics` query for dashboard metrics
   - `getRevenueByBranch` query for top branches
5. Verified recordCashPayment and markBookingComplete use audit logging
6. Build verified successfully

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 9-1-implement-payment-audit-logging-functions.md |
| 2026-01-27 | Completed | All audit logging functions implemented |

### File List

- `convex/services/paymentAudit.ts` (created)
- `convex/schema.ts` (modified - added booking_completed event type)
- `convex/services/bookings.ts` (modified - fixed event types)
