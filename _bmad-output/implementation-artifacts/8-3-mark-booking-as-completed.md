# Story 8.3: Mark Booking as Completed

Status: done

## Story

As a **staff member**,
I want **to mark a booking as fully paid and completed**,
So that **the service is finalized in the system**.

## Acceptance Criteria

1. **Given** the customer has paid the full amount
   **When** I click "Mark Complete" (FR16)
   **Then** the booking status changes to "completed"
   **And** the system logs the completion event

2. **Given** the customer has NOT paid the remaining balance
   **When** I try to mark as complete
   **Then** I see a warning "Customer has unpaid balance of ₱XXX"
   **And** I can choose to proceed (mark as complete anyway) or collect payment first

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Add "Mark Complete" button to POS booking section
  - [x] 2.1 Show button when booking is attached
  - [x] 2.2 Check payment status before completing
- [x] Task 3: Create confirmation/warning modal
  - [x] 3.1 Show warning if unpaid balance exists
  - [x] 3.2 Offer options: Proceed anyway or Collect Payment
- [x] Task 4: Create markBookingComplete mutation
  - [x] 4.1 Update booking status to completed
  - [x] 4.2 Log completion event to audit log
- [x] Task 5: Build and verify
  - [x] 5.1 Run npm run build
  - [x] 5.2 Verify no errors

## Dev Notes

### Implementation Approach

The "Mark Complete" functionality was added to the Booking Information Section in POS.jsx:
1. If payment_status is 'paid' - allow direct completion
2. If payment_status is 'partial' or 'unpaid' - show warning modal with options
3. Update booking status and log the event to paymentAuditLog

### Mutation: markBookingComplete

```typescript
markBookingComplete: mutation({
  args: {
    booking_id: v.id("bookings"),
    completed_by: v.id("users"),
    force_complete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 1. Get booking and check payment status
    // 2. If unpaid and not force_complete, return warning
    // 3. Update booking status to 'completed'
    // 4. Log to paymentAuditLog
    // 5. Return success
  }
})
```

### References

- [Source: prd-paymongo.md#FR16] - Mark booking as completed
- [Source: epics-paymongo.md#Story-3.3]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None_

### Completion Notes List

1. Created story file with all requirements
2. Added markBookingComplete mutation to bookings.ts:
   - Calculates remaining balance
   - Returns requires_confirmation with unpaid_balance if not force_complete
   - Updates booking status to 'completed' and completed_at timestamp
   - Logs to paymentAuditLog with metadata including forced_complete flag
3. Updated POS.jsx:
   - Added handleMarkComplete handler function
   - Added "Mark Complete" button in Booking Information Section
   - Shows "Booking Completed" badge when status is completed
   - Added confirmation modal for unpaid balance warning
   - Modal offers "Collect Payment" or "Complete Anyway" options
4. Build verified - no errors

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 8-3-mark-booking-as-completed.md |
| 2026-01-27 | Modified | convex/services/bookings.ts - Added markBookingComplete mutation |
| 2026-01-27 | Modified | src/pages/staff/POS.jsx - Added Mark Complete button and confirmation modal |
| 2026-01-27 | Verified | Build successful |

### File List

- `src/pages/staff/POS.jsx` (modified - added Mark Complete button and modal)
- `convex/services/bookings.ts` (modified - added markBookingComplete mutation)
