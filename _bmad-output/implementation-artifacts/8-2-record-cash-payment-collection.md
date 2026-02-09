# Story 8.2: Record Cash Payment Collection

Status: done

## Story

As a **staff member**,
I want **to record when a customer pays their remaining balance**,
So that **the booking is marked as fully paid and tracked for accounting**.

## Acceptance Criteria

1. **Given** I am viewing a booking with remaining balance
   **When** I click "Collect Payment"
   **Then** I see the amount due: ₱XXX
   **And** I can select payment method: Cash, GCash (manual), Maya (manual), Card (manual)

2. **Given** the customer pays the remaining balance
   **When** I select payment method and click "Confirm Payment" (FR15)
   **Then** the system records the payment collection
   **And** logs a payment event to audit log
   **And** updates the booking `payment_status` to `paid`

3. **Given** partial payment is received (edge case)
   **When** I need to record partial payment
   **Then** I can enter a custom amount
   **And** remaining balance is updated accordingly

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Add "Collect Payment" button to POS booking section
  - [x] 2.1 Show button only when payment_status is partial or unpaid
  - [x] 2.2 Button opens CollectPaymentModal
- [x] Task 3: Create CollectPaymentModal component
  - [x] 3.1 Display amount due
  - [x] 3.2 Payment method selection (Cash, GCash, Maya, Card)
  - [x] 3.3 Optional custom amount input
  - [x] 3.4 Confirm payment button
- [x] Task 4: Create recordCashPayment mutation
  - [x] 4.1 Update booking payment_status
  - [x] 4.2 Log payment event to audit log
- [x] Task 5: Build and verify
  - [x] 5.1 Run npm run build
  - [x] 5.2 Verify no errors

## Dev Notes

### CollectPaymentModal Props

```typescript
interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    _id: string;
    booking_code: string;
    service_price: number;
    payment_status: 'partial' | 'unpaid';
    convenience_fee_paid?: number;
  };
  onPaymentCollected: () => void;
}
```

### Payment Methods

- **Cash** - Physical cash payment
- **GCash (Manual)** - Customer shows GCash proof
- **Maya (Manual)** - Customer shows Maya proof
- **Card (Manual)** - Physical card swipe

### Mutation: recordCashPayment

```typescript
recordCashPayment: mutation({
  args: {
    booking_id: v.id("bookings"),
    amount: v.number(),
    payment_method: v.union(
      v.literal("cash"),
      v.literal("gcash_manual"),
      v.literal("maya_manual"),
      v.literal("card_manual")
    ),
    collected_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Update booking payment_status to 'paid'
    // 2. Log to paymentAuditLog
    // 3. Return success
  }
})
```

### References

- [Source: prd-paymongo.md#FR15] - Record cash payment
- [Source: epics-paymongo.md#Story-3.2]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None_

### Completion Notes List

1. Created story file with all requirements
2. Created recordCashPayment mutation in bookings.ts:
   - Calculates remaining balance from service_price, convenience_fee_paid, cash_collected
   - Determines new payment_status based on amount paid
   - Updates booking with payment_status and cash_collected
   - Logs payment event to paymentAuditLog with full metadata
3. Created CollectPaymentModal component:
   - Displays booking info and amount due
   - Payment method selection (Cash, GCash, Maya, Card)
   - Optional partial payment with custom amount input
   - Validation and error handling
4. Updated POS.jsx:
   - Added CollectPaymentModal import
   - Added showCollectPaymentModal state
   - Fixed remaining balance calculation for partial payments
   - Added "Collect Payment" button (shows only for partial/unpaid)
   - Integrated CollectPaymentModal with success alert
5. Build verified - no errors

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 8-2-record-cash-payment-collection.md |
| 2026-01-27 | Created | convex/services/bookings.ts - recordCashPayment mutation |
| 2026-01-27 | Created | src/components/staff/CollectPaymentModal.jsx |
| 2026-01-27 | Modified | src/pages/staff/POS.jsx - Added Collect Payment button and modal |
| 2026-01-27 | Verified | Build successful |

### File List

- `src/pages/staff/POS.jsx` (modified)
- `src/components/staff/CollectPaymentModal.jsx` (created)
- `convex/services/bookings.ts` (modified - added recordCashPayment mutation)
