# Story 7.6: Build Payment Confirmation & Status Display

Status: done

## Story

As a **customer**,
I want **to see instant confirmation and receive a QR code after booking**,
So that **I know my appointment is secured and can check in easily**.

## Acceptance Criteria

1. **Given** my payment was successful (Pay Now or Pay Later)
   **When** I am redirected back to the app (FR5)
   **Then** I see a confirmation screen showing:
   - "Payment Successful" message
   - Booking details (date, time, service, barber)
   - Amount paid
   - QR code for branch check-in (FR6)

2. **Given** I selected Pay at Shop
   **When** booking is confirmed
   **Then** I see a confirmation screen showing:
   - "Booking Confirmed" message
   - Booking details (date, time, service, barber)
   - Amount due at branch: ₱XXX
   - QR code for branch check-in (FR6)

3. **Given** I want to view my booking later
   **When** I access my booking details (FR7)
   **Then** I see payment status:
   - "Paid" (full amount paid via PayMongo)
   - "Partially Paid - ₱XX convenience fee paid, ₱XXX due at branch"
   - "Pay at Branch - ₱XXX due upon arrival"

4. **Given** my payment failed (FR22)
   **When** I am redirected back
   **Then** I see an error message explaining the failure
   **And** I am offered options to retry or select "Pay at Shop"

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Update payment success page for PayMongo
  - [x] 2.1 Handle booking query parameter
  - [x] 2.2 Fetch booking details by booking_code
  - [x] 2.3 Display payment status and amount
- [x] Task 3: Update payment failure page for PayMongo
  - [x] 3.1 Handle booking query parameter
  - [x] 3.2 Show error message
  - [x] 3.3 Offer Pay at Shop fallback option
- [x] Task 4: Add PayMongo routes to App.jsx
  - [x] 4.1 Add /booking/payment-success route
  - [x] 4.2 Add /booking/payment-failed route
- [x] Task 5: Update renderBookingSuccess for payment status
  - [x] 5.1 Display payment status badge
  - [x] 5.2 Show amount paid vs due at branch
- [x] Task 6: Update MyBookings for payment status display
  - [x] 6.1 Add payment status badge to booking cards
  - [x] 6.2 Show payment breakdown (paid/due)
- [x] Task 7: Build and verify
  - [x] 7.1 Run npm run build
  - [x] 7.2 Verify no errors

## Dev Notes

### Payment Status Display Logic

| Payment Status | Display Text | Badge Color |
|----------------|--------------|-------------|
| paid | "Paid" | green |
| partial | "Partially Paid - ₱XX paid, ₱XXX due" | yellow |
| unpaid | "Pay at Branch - ₱XXX" | blue |

### Route Structure

Current routes (existing payment system):
- /booking/payment/success
- /booking/payment/failure

PayMongo routes (new):
- /booking/payment-success?booking={booking_code}
- /booking/payment-failed?booking={booking_code}

### Convex Query for Booking

```javascript
// Query booking by code
const booking = useQuery(api.services.bookings.getBookingByCode,
  bookingCode ? { bookingCode } : "skip"
);
```

### References

- [Source: architecture-paymongo.md#confirmation-display]
- [Source: prd-paymongo.md#FR5] - Redirect to confirmation
- [Source: prd-paymongo.md#FR6] - QR code for check-in
- [Source: prd-paymongo.md#FR7] - View booking details
- [Source: prd-paymongo.md#FR22] - Payment failure handling
- [Source: epics-paymongo.md#Story-2.6]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None_

### Completion Notes List

1. Created story file with all requirements
2. Updated success.jsx with PayMongo booking support:
   - Added bookingCode query parameter handling
   - Added getBookingByCode query for PayMongo bookings
   - Added QR code generation using qrcode library
   - Added payment status display (paid/partial/unpaid)
   - Added payment summary with amount paid vs due at branch
3. Updated failure.jsx with PayMongo booking support:
   - Added bookingCode query parameter handling
   - Added getBookingByCode query
   - Added "Pay at Shop Instead" button (FR22 fallback)
   - Shows booking details on failure page
4. Added PayMongo routes to App.jsx:
   - /booking/payment-success → PaymentSuccess
   - /booking/payment-failed → PaymentFailure
5. Updated ServiceBooking.jsx renderBookingSuccess:
   - Added payment status badge (Fully Paid/Partially Paid/Pay at Branch)
   - Added payment breakdown (Amount Paid/Due at Branch)
6. Updated MyBookings.jsx:
   - Added Banknote and Store icons
   - Added payment status badges on booking cards
   - Added payment breakdown columns (Paid/Due)
7. Build verified - no errors

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 7-6-build-payment-confirmation-and-status-display.md |
| 2026-01-27 | Modified | src/pages/booking/payment/success.jsx - PayMongo booking support |
| 2026-01-27 | Modified | src/pages/booking/payment/failure.jsx - PayMongo booking support |
| 2026-01-27 | Modified | src/App.jsx - Added PayMongo routes |
| 2026-01-27 | Modified | src/components/customer/ServiceBooking.jsx - Payment status display |
| 2026-01-27 | Modified | src/components/customer/MyBookings.jsx - Payment status badges |
| 2026-01-27 | Verified | Build successful |

### File List

- `src/pages/booking/payment/success.jsx` (modified)
- `src/pages/booking/payment/failure.jsx` (modified)
- `src/App.jsx` (modified - add routes)
- `src/components/customer/ServiceBooking.jsx` (modified - renderBookingSuccess)
- `src/components/customer/MyBookings.jsx` (modified)
