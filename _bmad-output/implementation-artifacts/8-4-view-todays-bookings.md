# Story 8.4: View Today's Bookings with Payment Status

Status: done

## Story

As a **staff member**,
I want **to see a list of today's bookings with their payment statuses**,
So that **I can prepare for customers and know who has pre-paid**.

## Acceptance Criteria

1. **Given** I am on the POS or staff dashboard
   **When** I view today's bookings list (FR17)
   **Then** I see all bookings for today with columns:
   - Time
   - Customer name
   - Service
   - Barber
   - Payment Status (Paid / Partial / Pay at Branch)
   - Amount Due

2. **Given** I want to filter bookings
   **When** I use filter options
   **Then** I can filter by:
   - Payment status (All / Paid / Partial / Unpaid)

3. **Given** I want to view booking details
   **When** I click on a booking row
   **Then** I can load it into the POS for processing

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Create getTodaysBookingsWithPaymentStatus query
  - [x] 2.1 Filter bookings by today's date
  - [x] 2.2 Include payment_status, convenience_fee_paid, cash_collected fields
  - [x] 2.3 Sort by appointment time
- [x] Task 3: Add Today's Bookings section to POS
  - [x] 3.1 Create collapsible section
  - [x] 3.2 Display list with all required columns
  - [x] 3.3 Payment status badges with color coding
  - [x] 3.4 Click row to load booking into POS
- [x] Task 4: Add filter functionality
  - [x] 4.1 Payment status filter dropdown
- [x] Task 5: Build and verify
  - [x] 5.1 Run npm run build
  - [x] 5.2 Verify no errors

## Dev Notes

### Display Logic

| Payment Status | Badge | Color | Amount Due |
|----------------|-------|-------|------------|
| paid | PAID | Green | ₱0 |
| partial | PARTIAL | Yellow | ₱(service_price - convenience_fee_paid - cash_collected) |
| unpaid | AT BRANCH | Blue | ₱service_price |

### Query: getTodaysBookingsWithPaymentStatus

```typescript
getTodaysBookingsWithPaymentStatus: query({
  args: {
    branch_id: v.id("branches"),
    payment_status_filter: v.optional(v.union(
      v.literal("all"),
      v.literal("paid"),
      v.literal("partial"),
      v.literal("unpaid")
    )),
  },
  handler: async (ctx, args) => {
    // 1. Get today's date range
    // 2. Filter bookings by branch and date
    // 3. Apply payment status filter if provided
    // 4. Sort by appointment time
    // 5. Return with all payment fields and enriched data
  }
})
```

### References

- [Source: prd-paymongo.md#FR17] - Today's bookings with payment status
- [Source: epics-paymongo.md#Story-3.4]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None_

### Completion Notes List

1. Created story file with all requirements
2. Added getTodaysBookingsWithPaymentStatus query to bookings.ts:
   - Filters by today's date (using date string and created_at for walk-ins)
   - Applies payment status filter
   - Enriches with barber and service names
   - Calculates remaining_balance for each booking
   - Sorts by appointment time
3. Updated POS.jsx:
   - Added Calendar, Clock, ChevronDown, ChevronUp, Filter icons to imports
   - Added showTodaysBookings and todaysBookingsFilter states
   - Added todaysBookings query
   - Created collapsible "Today's Bookings" section with:
     - Toggle button showing booking count
     - Payment status filter dropdown
     - Scrollable list of bookings
     - Color-coded payment status badges
     - Click to load booking into POS
   - Added handleLoadBookingFromList handler
4. Build verified - no errors

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 8-4-view-todays-bookings.md |
| 2026-01-27 | Modified | convex/services/bookings.ts - Added getTodaysBookingsWithPaymentStatus query |
| 2026-01-27 | Modified | src/pages/staff/POS.jsx - Added Today's Bookings section |
| 2026-01-27 | Verified | Build successful |

### File List

- `src/pages/staff/POS.jsx` (modified - added Today's Bookings section)
- `convex/services/bookings.ts` (modified - added getTodaysBookingsWithPaymentStatus query)
