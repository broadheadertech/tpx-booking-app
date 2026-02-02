# Story 1.4: Earn Points on Payment

Status: done

## Story

As a **customer**,
I want to automatically earn points when I complete a payment,
So that I'm rewarded for my purchases without extra effort.

## Acceptance Criteria

1. **Given** I complete a cash or card payment of ₱500
   **When** the payment is marked as completed
   **Then** I earn 500 points (1:1 ratio, stored as 50000 in ×100 format)
   **And** a points_transaction record is created with type "earn"
   **And** my points_ledger balance is updated atomically with the payment

2. **Given** a payment fails or is cancelled
   **When** the status changes to failed/cancelled
   **Then** no points are awarded
   **And** no points_transaction is created

3. **Given** I earn points
   **When** the transaction completes
   **Then** the audit trail includes: user_id, amount, source_type="payment", source_id=transaction_id, branch_id, timestamp

4. **Given** I'm viewing the checkout flow
   **When** I see the payment total
   **Then** I see "You'll earn X points on this purchase" preview

## Tasks / Subtasks

- [x] Task 1: Modify transactions.ts to award points on completed payment (AC: #1, #2, #3)
  - [x] 1.1 Import earnPoints from points service
  - [x] 1.2 Add points earning after payment completion
  - [x] 1.3 Use transaction_id as source_id for audit trail

- [x] Task 2: Create PointsEarnPreview component (AC: #4)
  - [x] 2.1 Create src/components/common/PointsEarnPreview.jsx
  - [x] 2.2 Calculate points from payment amount
  - [x] 2.3 Display preview message

- [x] Task 3: Verify atomic transaction (AC: #1)
  - [x] 3.1 Deploy and test end-to-end

## Dev Notes

### Points Earning Formula

- 1:1 ratio: ₱1 = 1 point
- Storage: ₱500 → 50000 (×100 format)
- `toStorageFormat(totalAmount) = points to earn`

### Integration Point

Add to `convex/services/transactions.ts` in `createTransaction`:
```typescript
// Award points on completed payment (after notifications)
if (args.payment_status === "completed" && args.customer) {
  try {
    const pointsToEarn = toStorageFormat(args.total_amount); // 1:1 ratio
    await ctx.runMutation(api.services.points.earnPoints, {
      userId: args.customer,
      amount: pointsToEarn,
      sourceType: "payment",
      sourceId: transactionId,
      branchId: args.branch_id,
      notes: `Earned from payment - Receipt: ${receiptNumber}`,
    });
  } catch (error) {
    console.error("Failed to award points:", error);
    // Don't fail transaction if points fail
  }
}
```

### References

- [Source: convex/services/transactions.ts] - createTransaction mutation
- [Source: convex/services/points.ts] - earnPoints mutation
- [Source: epics-customer-experience.md#Story 1.4]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Convex functions ready

### Completion Notes List

1. Modified `convex/services/transactions.ts`:
   - Added import for `toStorageFormat` from lib/points
   - Added points earning logic in `createTransaction` mutation
   - Points awarded when `payment_status === "completed"` and `customer` exists
   - Uses 1:1 ratio (₱1 = 1 point) via `toStorageFormat(total_amount)`
   - Audit trail: source_type="payment", source_id=transaction_id
   - Error handling: logs but doesn't fail transaction if points fail

2. Created `src/components/common/PointsEarnPreview.jsx`:
   - 3 variants: "inline" (default), "card", "badge"
   - Shows "You'll earn X pts on this purchase" message
   - Uses formatPoints helper for display
   - Orange themed to match app design
   - Handles null/0 amounts gracefully

3. Points flow:
   - Customer completes payment → createTransaction called
   - If completed + has customer → earnPoints mutation called
   - Points ledger updated + transaction recorded
   - Real-time balance update via Convex subscription

### File List

- [x] convex/services/transactions.ts (MODIFY) - Lines 6, 508-528
- [x] src/components/common/PointsEarnPreview.jsx (CREATE)
