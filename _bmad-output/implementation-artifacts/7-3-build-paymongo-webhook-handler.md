# Story 7.3: Build PayMongo Webhook Handler

Status: done

## Story

As a **system**,
I want **to receive and process PayMongo webhook notifications**,
So that **booking payment status is updated automatically when customers pay**.

## Acceptance Criteria

1. **Given** PayMongo sends a webhook to `/webhooks/paymongo`
   **When** the request is received
   **Then** the system logs a `webhook_received` audit event (FR29)
   **And** extracts the `Paymongo-Signature` header
   **And** verifies the signature using HMAC-SHA256 (FR24)

2. **Given** webhook signature is valid
   **When** the event is `payment.paid`
   **Then** the system logs `webhook_verified` event
   **And** updates the booking `payment_status` to `paid` or `partial` (FR20)
   **And** stores `paymongo_payment_id` on the booking
   **And** logs `payment_completed` audit event (FR28)
   **And** returns HTTP 200

3. **Given** webhook signature is invalid
   **When** verification fails
   **Then** the system logs `webhook_failed` event
   **And** returns HTTP 401 "Invalid signature"

4. **Given** a duplicate webhook is received (same payment_id)
   **When** processing
   **Then** the system skips duplicate processing (idempotent - NFR14)

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Create HTTP webhook endpoint
  - [x] 2.1 Add route in http.ts for /webhooks/paymongo
  - [x] 2.2 Parse request body and headers
- [x] Task 3: Implement signature verification
  - [x] 3.1 Extract Paymongo-Signature header
  - [x] 3.2 Verify HMAC-SHA256 signature (FR24)
  - [x] 3.3 Return 401 on invalid signature
- [x] Task 4: Handle payment events
  - [x] 4.1 Process link.payment.paid event
  - [x] 4.2 Extract booking_id from remarks
  - [x] 4.3 Determine payment_status (paid vs partial)
  - [x] 4.4 Update booking with payment_id and status
  - [x] 4.5 Handle idempotency (skip duplicates)
- [x] Task 5: Audit logging
  - [x] 5.1 Log webhook_received on receipt
  - [x] 5.2 Log webhook_verified on valid signature
  - [x] 5.3 Log webhook_failed on invalid signature
  - [x] 5.4 Log payment_completed on success
- [x] Task 6: Deploy and verify
  - [x] 6.1 Run npx convex dev
  - [x] 6.2 Verify no errors

## Dev Notes

### PayMongo Webhook Events

For Payment Links, PayMongo sends:
- `link.payment.paid` - When a payment link is successfully paid

### Webhook Signature Verification (FR24)

```
Paymongo-Signature: t=timestamp,te=test_signature,li=live_signature
```

Verification steps:
1. Extract timestamp (t) and signature (te for test, li for live)
2. Construct payload: `timestamp.raw_body`
3. Compute HMAC-SHA256 using webhook_secret
4. Compare computed hash with signature

### Webhook Payload Structure

```json
{
  "data": {
    "id": "evt_xxx",
    "type": "event",
    "attributes": {
      "type": "link.payment.paid",
      "data": {
        "id": "link_xxx",
        "type": "link",
        "attributes": {
          "amount": 10000,
          "status": "paid",
          "payments": [{
            "id": "pay_xxx",
            "type": "payment",
            "attributes": {
              "amount": 10000,
              "status": "paid",
              "source": { "type": "gcash" }
            }
          }],
          "remarks": "booking_id:xxx,payment_type:pay_now"
        }
      }
    }
  }
}
```

### Booking Status Updates

| Payment Type | New payment_status | Additional Updates |
|--------------|-------------------|-------------------|
| pay_now | paid | paymongo_payment_id |
| pay_later | partial | paymongo_payment_id, convenience_fee_paid |

### References

- [Source: architecture-paymongo.md#webhook-handler]
- [Source: prd-paymongo.md#FR19] - Process webhooks
- [Source: prd-paymongo.md#FR20] - Update booking status
- [Source: prd-paymongo.md#FR24] - Signature verification
- [Source: prd-paymongo.md#FR29] - Log webhook events

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None yet_

### Completion Notes List

1. Created story file with all requirements
2. Created `convex/http.ts` with webhook route at `/webhooks/paymongo`
3. Implemented `verifyWebhookSignature` using HMAC-SHA256 with Web Crypto API
4. Added `processWebhook` action to handle webhook events
5. Signature verification parses t=timestamp,te=test,li=live format
6. Added `getBookingByPaymongoLink` query to find booking by link ID
7. Added `updateBookingPaymentStatus` mutation for FR20
8. Implemented idempotency check (NFR14) - skip if payment_id already set
9. Full audit logging: webhook_received, webhook_verified/failed, payment_completed
10. Deployment successful

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 7-3-build-paymongo-webhook-handler.md |
| 2026-01-27 | Created | convex/http.ts with webhook route |
| 2026-01-27 | Added | verifyWebhookSignature function (HMAC-SHA256) |
| 2026-01-27 | Added | processWebhook action |
| 2026-01-27 | Added | getBookingByPaymongoLink query |
| 2026-01-27 | Added | updateBookingPaymentStatus mutation |
| 2026-01-27 | Deployed | Convex functions ready |

### File List

- `convex/http.ts` (created - webhook router)
- `convex/services/paymongo.ts` (modified - added 4 functions)
