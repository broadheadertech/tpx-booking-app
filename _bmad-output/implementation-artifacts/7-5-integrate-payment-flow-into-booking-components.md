# Story 7.5: Integrate Payment Flow into Booking Components

Status: done

## Story

As a **guest or authenticated customer**,
I want **to complete payment during the booking flow**,
So that **my appointment is secured with payment**.

## Acceptance Criteria

1. **Given** I am a guest on GuestServiceBooking (FR1)
   **When** I complete the booking form and click "Book Now"
   **Then** the PaymentOptionsModal is displayed

2. **Given** I am an authenticated user on ServiceBooking (FR2)
   **When** I complete the booking and click "Book Now"
   **Then** the PaymentOptionsModal is displayed

3. **Given** I select Pay Now or Pay Later in the modal
   **When** I click "Proceed to Payment"
   **Then** the system creates the booking
   **And** creates a payment link via createPaymentLink action
   **And** redirects me to PayMongo checkout

4. **Given** I select Pay Later
   **When** payment completes
   **Then** booking `payment_status` is set to `partial`
   **And** `convenience_fee_paid` stores the amount paid

5. **Given** I select Pay Now
   **When** payment completes
   **Then** booking `payment_status` is set to `paid`

6. **Given** I select Pay at Shop
   **When** booking is submitted
   **Then** booking `payment_status` is set to `unpaid`
   **And** I see confirmation with amount due at branch

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Integrate PaymentOptionsModal into ServiceBooking.jsx
  - [x] 2.1 Import PaymentOptionsModal component
  - [x] 2.2 Add state for modal visibility (showPaymentModal, paymentProcessing)
  - [x] 2.3 Replace "Book Now" button to open modal
  - [x] 2.4 Handle payment option selection via onSelect callback
- [x] Task 3: Implement payment flow handling
  - [x] 3.1 Create booking first with appropriate payment_status
  - [x] 3.2 Call createPaymentLink for Pay Now/Pay Later
  - [x] 3.3 Redirect to PayMongo checkout URL
  - [x] 3.4 Handle Pay at Shop (direct to step 6)
- [x] Task 4: Handle edge cases
  - [x] 4.1 Payment link creation failure - offer Pay at Shop fallback (FR22)
  - [x] 4.2 Loading states during payment processing
  - [x] 4.3 Error handling with user-friendly messages
- [x] Task 5: Build and verify
  - [x] 5.1 Run npm run build
  - [x] 5.2 Verify no errors

## Dev Notes

### Integration Points

**ServiceBooking.jsx** changes:
1. Import PaymentOptionsModal
2. Add `showPaymentModal` state
3. Add `selectedPaymentOption` state
4. Modify "Book Now" button to open modal
5. Add `handlePaymentOptionSelect` function
6. Import `useAction` for createPaymentLink

### Payment Flow

```
[Book Now clicked]
    ↓
[PaymentOptionsModal opens]
    ↓
[User selects option]
    ↓
[Pay Now / Pay Later]          [Pay at Shop]
    ↓                              ↓
[Create Booking]               [Create Booking (payment_status: unpaid)]
    ↓                              ↓
[createPaymentLink]            [Step 6: Success]
    ↓
[Redirect to checkout_url]
    ↓
[PayMongo handles payment]
    ↓
[Webhook updates booking]
    ↓
[User returns to success page]
```

### createPaymentLink Action

```javascript
const result = await createPaymentLink({
  booking_id: bookingId,
  payment_type: selectedOption, // "pay_now" or "pay_later"
  origin: window.location.origin,
  created_by: user?._id,
});

// Redirect to PayMongo checkout
window.location.href = result.checkoutUrl;
```

### References

- [Source: architecture-paymongo.md#customer-booking-flow]
- [Source: prd-paymongo.md#FR1] - Guest booking
- [Source: prd-paymongo.md#FR2] - Authenticated booking
- [Source: epics-paymongo.md#Story-2.5]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None yet_

### Completion Notes List

1. Created story file with all requirements
2. Imported PaymentOptionsModal component in ServiceBooking.jsx
3. Added `showPaymentModal` and `paymentProcessing` states
4. Added `createPaymentLink` action hook
5. Created `handlePaymentOptionSelect` function that:
   - Creates booking first
   - For Pay Now/Pay Later: Calls createPaymentLink and redirects to checkout
   - For Pay at Shop: Sets payment_status = "unpaid" and shows confirmation
   - Offers Pay at Shop fallback on payment failure (FR22)
6. Modified "Book Now" button to open PaymentOptionsModal
7. Added PaymentOptionsModal component to JSX with calculated servicePrice
8. Build successful with no errors

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 7-5-integrate-payment-flow-into-booking-components.md |
| 2026-01-27 | Modified | ServiceBooking.jsx - added PaymentOptionsModal integration |
| 2026-01-27 | Added | handlePaymentOptionSelect function for payment flow |
| 2026-01-27 | Verified | Build successful |

### File List

- `src/components/customer/ServiceBooking.jsx` (modified)
