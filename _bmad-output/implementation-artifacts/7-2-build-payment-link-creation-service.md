# Story 7.2: Build Payment Link Creation Service

Status: done

## Story

As a **customer**,
I want **the system to create secure payment links or allow booking without payment**,
So that **I can complete my booking with my preferred payment method**.

## Acceptance Criteria

1. **Given** a customer is completing a booking with Pay Now or Pay Later selected
   **When** the `createPaymentLink` action is called with booking details
   **Then** the system retrieves the branch's decrypted PayMongo keys
   **And** calls PayMongo API to create a payment link
   **And** converts amount from pesos to centavos for PayMongo
   **And** logs a `link_created` audit event (FR27)
   **And** updates the booking with `paymongo_link_id`
   **And** returns the `checkout_url` for customer redirect

2. **Given** a customer selects "Pay at Shop"
   **When** the booking is submitted
   **Then** the system creates the booking with `payment_status: "unpaid"`
   **And** NO PayMongo link is created
   **And** booking confirmation shows "Pay at branch upon arrival"

3. **Given** the branch has no PayMongo configuration
   **When** the payment options are loaded
   **Then** only "Pay at Shop" option is available (graceful fallback)

4. **Given** PayMongo API returns an error
   **When** `createPaymentLink` is called
   **Then** it throws `PAYMONGO_API_ERROR` with user-friendly message (FR22)
   **And** customer is offered "Pay at Shop" as fallback option

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Implement logPaymentEvent helper
  - [x] 2.1 Create mutation for audit logging
  - [x] 2.2 Accept all event types
- [x] Task 3: Implement createPaymentLink action
  - [x] 3.1 Get decrypted PayMongo config for branch
  - [x] 3.2 Calculate amount (Pay Now = full, Pay Later = convenience fee)
  - [x] 3.3 Call PayMongo API to create payment link
  - [x] 3.4 Update booking with paymongo_link_id
  - [x] 3.5 Log link_created audit event
  - [x] 3.6 Return checkout_url
- [x] Task 4: Deploy and verify
  - [x] 4.1 Run npx convex dev
  - [x] 4.2 Verify no errors

## Dev Notes

### PayMongo Payment Links API

```
POST https://api.paymongo.com/v1/links
Authorization: Basic {base64(secret_key:)}
Content-Type: application/json

{
  "data": {
    "attributes": {
      "amount": 10000,  // centavos (₱100.00)
      "description": "Booking #ABC123 - Haircut",
      "remarks": "booking_id:{id}"
    }
  }
}
```

### Response

```json
{
  "data": {
    "id": "link_xxx",
    "attributes": {
      "amount": 10000,
      "checkout_url": "https://pm.link/xxx",
      "status": "unpaid"
    }
  }
}
```

### Amount Calculation

| Payment Type | Amount Sent to PayMongo |
|--------------|-------------------------|
| Pay Now | Full service price (price * 100 centavos) |
| Pay Later | Convenience fee only (price * fee_percent/100 * 100 centavos) |

### Error Handling

| Error | User Message |
|-------|--------------|
| PAYMONGO_NOT_CONFIGURED | "Online payment is not available for this branch" |
| PAYMONGO_API_ERROR | "Payment processing failed. Please try again or pay at the branch" |

### References

- [Source: architecture-paymongo.md#payment-link-creation]
- [Source: prd-paymongo.md#FR18] - Create payment links
- [Source: prd-paymongo.md#FR22] - Error handling
- [Source: prd-paymongo.md#FR27] - Audit logging

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None yet_

### Completion Notes List

1. Created story file with all requirements
2. Added `logPaymentEvent` mutation for audit logging (FR27, FR28, FR29)
3. Added `updateBookingPaymentLink` mutation to update booking with link ID
4. Added `createPaymentLink` action with full implementation:
   - Gets decrypted PayMongo config using branch's keys
   - Calculates amount based on payment type (Pay Now = full, Pay Later = fee)
   - Calls PayMongo Links API to create payment link
   - Updates booking with paymongo_link_id
   - Logs link_created audit event
   - Returns checkout_url for redirect
5. Added `getBookingForPayment` query for internal use
6. Added `getDecryptedConfigInternal` action for internal use
7. Proper error handling with PAYMONGO_NOT_CONFIGURED and PAYMONGO_API_ERROR
8. Deployment successful

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 7-2-build-payment-link-creation-service.md |
| 2026-01-27 | Added | logPaymentEvent mutation |
| 2026-01-27 | Added | updateBookingPaymentLink mutation |
| 2026-01-27 | Added | createPaymentLink action |
| 2026-01-27 | Added | getBookingForPayment query |
| 2026-01-27 | Added | getDecryptedConfigInternal action |
| 2026-01-27 | Deployed | Convex functions ready |

### File List

- `convex/services/paymongo.ts` (modified - added 5 functions)
