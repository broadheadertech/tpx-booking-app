# Story 8.1: Display Payment Status in POS Booking View

Status: done

## Story

As a **staff member**,
I want **to see the payment status when viewing a customer's booking**,
So that **I know how much has been paid and what's remaining**.

## Acceptance Criteria

1. **Given** a customer arrives and shows their QR code
   **When** I scan/enter the booking reference at POS (FR13)
   **Then** I see the booking details with payment status:
   - Customer name, service, barber, appointment time
   - Payment status badge (Paid / Partially Paid / Pay at Branch)
   - Amount already paid (if any)
   - Remaining balance due (FR14)

2. **Given** the booking was Pay Now (fully paid)
   **When** I view the booking
   **Then** I see "PAID - ₱XXX via PayMongo"
   **And** remaining balance shows ₱0

3. **Given** the booking was Pay Later (convenience fee paid)
   **When** I view the booking
   **Then** I see "PARTIALLY PAID - ₱XX convenience fee paid"
   **And** remaining balance shows "₱XXX due now"

4. **Given** the booking was Pay at Shop (no payment)
   **When** I view the booking
   **Then** I see "PAY AT BRANCH"
   **And** remaining balance shows "₱XXX due now"

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Update POS booking information display
  - [x] 2.1 Add payment status badge to booking section
  - [x] 2.2 Show amount paid and remaining balance
  - [x] 2.3 Color-code by payment status (green/yellow/blue)
- [x] Task 3: Update QR scanner to load payment status
  - [x] 3.1 Ensure booking query returns payment fields (validateBookingByCode already returns full booking)
  - [x] 3.2 Add payment fields to scanResult in handleBookingQR
  - [x] 3.3 Add payment status display to QR scan result details
- [x] Task 4: Build and verify
  - [x] 4.1 Run npm run build
  - [x] 4.2 Verify no errors

## Dev Notes

### Payment Status Display Logic

| Payment Status | Badge | Amount Paid | Remaining |
|----------------|-------|-------------|-----------|
| paid | Green "PAID" | ₱XXX via PayMongo | ₱0 |
| partial | Yellow "PARTIALLY PAID" | ₱XX convenience fee | ₱XXX due now |
| unpaid | Blue "PAY AT BRANCH" | ₱0 | ₱XXX due now |

### Implementation Details

1. **POS.jsx Booking Information Section** (lines ~2114-2200):
   - Added Banknote and Store icons to imports
   - Payment status badge with color-coding
   - Payment Details Section showing:
     - Service Total
     - Amount Paid (varies by status)
     - Remaining Balance

2. **QRScannerModal.jsx** (handleBookingQR function):
   - Added payment_status, convenience_fee_paid, service_price, total_amount to scanResult
   - Added Payment Status Section in scan result details grid
   - Shows badge + paid amount + balance due

### References

- [Source: prd-paymongo.md#FR13] - Staff view payment status
- [Source: prd-paymongo.md#FR14] - Show paid amount and balance
- [Source: epics-paymongo.md#Story-3.1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None_

### Completion Notes List

1. Created story file with all requirements
2. Updated POS.jsx:
   - Added Banknote and Store icons to imports
   - Updated Booking Information Section with payment status badges
   - Added Payment Details Section showing service total, amount paid, remaining balance
   - Color-coded badges: green (paid), yellow (partial), blue (unpaid)
3. Updated QRScannerModal.jsx:
   - Added Banknote and Store icons to imports
   - Updated handleBookingQR to include payment_status, convenience_fee_paid, service_price, total_amount
   - Added Payment Status Section in scan result details with badge and balance
4. Build verified - no errors

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 8-1-display-payment-status-in-pos-booking-view.md |
| 2026-01-27 | Modified | src/pages/staff/POS.jsx - Added payment status display |
| 2026-01-27 | Modified | src/components/staff/QRScannerModal.jsx - Added payment fields to scan result |
| 2026-01-27 | Verified | Build successful |

### File List

- `src/pages/staff/POS.jsx` (modified)
- `src/components/staff/QRScannerModal.jsx` (modified)
