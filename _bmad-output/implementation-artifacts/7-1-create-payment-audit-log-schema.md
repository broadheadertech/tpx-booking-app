# Story 7.1: Create Payment Audit Log Schema & Booking Extensions

Status: done

## Story

As a **system administrator**,
I want **the database schema extended for payment tracking**,
So that **payment events can be logged and bookings can track payment state**.

## Acceptance Criteria

1. **Given** the system needs to log payment events
   **When** I add the `paymentAuditLog` table to schema.ts
   **Then** the table includes fields for:
   - `branch_id`, `booking_id`, `transaction_id` (references)
   - `paymongo_payment_id`, `paymongo_link_id` (strings)
   - `event_type` (union of link_created, payment_initiated, payment_completed, payment_failed, payment_refunded, webhook_received, webhook_verified, webhook_failed)
   - `amount`, `payment_method`, `raw_payload`, `error_message`, `ip_address`
   - `created_at` (timestamp)
   **And** indexes: `by_branch`, `by_booking`, `by_paymongo_payment`, `by_created_at`

2. **Given** bookings need to track payment state
   **When** I extend the `bookings` table
   **Then** it includes new fields:
   - `paymongo_link_id` (optional string)
   - `paymongo_payment_id` (optional string)
   - `convenience_fee_paid` (optional number)
   **And** `payment_status` includes new value `"partial"`

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Add paymentAuditLog table to schema
  - [x] 2.1 Define table with all required fields
  - [x] 2.2 Add indexes for querying
- [x] Task 3: Extend bookings table
  - [x] 3.1 Add paymongo_link_id field
  - [x] 3.2 Add paymongo_payment_id field
  - [x] 3.3 Add convenience_fee_paid field
  - [x] 3.4 Add "partial" to payment_status union
- [x] Task 4: Deploy and verify
  - [x] 4.1 Run npx convex dev
  - [x] 4.2 Verify no errors

## Dev Notes

### paymentAuditLog Table Structure

| Field | Type | Description |
|-------|------|-------------|
| branch_id | id("branches") | Branch reference |
| booking_id | optional id("bookings") | Booking reference (optional for webhook events) |
| transaction_id | optional id("transactions") | POS transaction reference |
| paymongo_payment_id | optional string | PayMongo payment ID |
| paymongo_link_id | optional string | PayMongo link ID |
| event_type | union | Event type enum |
| amount | optional number | Amount in pesos |
| payment_method | optional string | GCash, Maya, Card, etc. |
| raw_payload | optional any | Webhook raw payload for FR29 |
| error_message | optional string | Error details for failures |
| ip_address | optional string | IP address of request |
| created_at | number | Timestamp |
| created_by | optional id("users") | User who triggered event |

### Event Types

- `link_created` - Payment link generated (FR27)
- `payment_initiated` - Customer started payment
- `payment_completed` - Payment successful (FR28)
- `payment_failed` - Payment failed (FR28)
- `payment_refunded` - Payment refunded
- `webhook_received` - Webhook received (FR29)
- `webhook_verified` - Webhook signature verified
- `webhook_failed` - Webhook signature invalid

### Bookings Table Extensions

| Field | Type | Description |
|-------|------|-------------|
| paymongo_link_id | optional string | PayMongo payment link ID |
| paymongo_payment_id | optional string | PayMongo payment ID |
| convenience_fee_paid | optional number | Amount of convenience fee paid |

### References

- [Source: architecture-paymongo.md#payment-audit-log]
- [Source: prd-paymongo.md#FR27-29] - Audit logging requirements

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None yet_

### Completion Notes List

1. Created story file with all requirements
2. Added `paymentAuditLog` table to schema.ts with all required fields
3. Added 7 indexes for efficient querying: by_branch, by_booking, by_paymongo_payment, by_paymongo_link, by_created_at, by_event_type, by_branch_created
4. Extended bookings table with paymongo_link_id, paymongo_payment_id, convenience_fee_paid
5. Added "partial" payment status for Pay Later bookings
6. Schema deployed successfully to Convex

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 7-1-create-payment-audit-log-schema.md |
| 2026-01-27 | Added | paymentAuditLog table with event types and indexes |
| 2026-01-27 | Modified | bookings table - PayMongo fields and partial status |
| 2026-01-27 | Deployed | Schema version 2026-01-27v2 |

### File List

- `convex/schema.ts` (modified)
