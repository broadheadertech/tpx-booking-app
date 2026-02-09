# Story 24.2: Process Full Wallet Payment

Status: done

## Story

As a **Staff Member**,
I want to accept full wallet payment,
So that customers can pay entirely with their balance.

## Acceptance Criteria

1. **Given** a customer has wallet balance >= payment total
   **When** I click "Pay with Wallet"
   **Then** a confirmation dialog shows the deduction amount

2. **Given** I confirm the wallet payment
   **When** the system processes the payment
   **Then** the customer's `wallet_balance` is reduced by the payment amount
   **And** a `branchWalletEarnings` record is created with commission calculated
   **And** the booking/transaction is marked as paid
   **And** a `wallet_transactions` record is created with type "payment"

3. **Given** the payment succeeds
   **When** the transaction completes
   **Then** I see a success message
   **And** a receipt is generated showing "Paid via Wallet"
   **And** the customer's new balance is displayed

4. **Given** the wallet balance changed between display and payment
   **When** balance is now insufficient
   **Then** I see error: "Insufficient wallet balance"
   **And** the payment is not processed
   **And** I am offered combo payment option

## Tasks / Subtasks

- [x] Task 1: Add POS wallet payment mutation (AC: #2, #4)
  - [x] 1.1 Reused existing `payBookingWithWallet` mutation from wallet.ts (already implemented)
  - [x] 1.2 Validate sufficient balance server-side before deduction (handled by debitWallet)
  - [x] 1.3 Deduct from customer wallet balance atomically (via debitWallet mutation)
  - [x] 1.4 Create branchWalletEarnings record with commission (via createEarningRecord)
  - [x] 1.5 Create wallet_transactions record with type "payment" (via debitWallet)
  - [x] 1.6 Return success result with new balance and points earned

- [x] Task 2: Create confirmation dialog component (AC: #1)
  - [x] 2.1 Create `src/components/staff/WalletPaymentConfirmDialog.jsx`
  - [x] 2.2 Show deduction amount, new balance after payment
  - [x] 2.3 Show points customer will earn
  - [x] 2.4 Confirm/Cancel buttons with loading state

- [x] Task 3: Integrate with POSWalletPayment component (AC: #1, #3)
  - [x] 3.1 Update QueueSection.jsx to show confirmation dialog
  - [x] 3.2 Call mutation on confirm, handle response
  - [x] 3.3 Show success toast with payment details
  - [x] 3.4 Display customer's new balance after payment

- [x] Task 4: Handle insufficient balance error (AC: #4)
  - [x] 4.1 Catch INSUFFICIENT_BALANCE error from mutation
  - [x] 4.2 Display error message to staff
  - [x] 4.3 Offer combo payment as alternative (prepare for Story 24-3)

- [x] Task 5: Update booking payment status (AC: #2)
  - [x] 5.1 Mark booking as paid with payment_method="wallet" (via payBookingWithWallet)
  - [x] 5.2 Update booking status appropriately
  - [x] 5.3 Ensure real-time update in queue view (Convex real-time subscriptions)

## Dev Notes

### Architecture Compliance

This story is part of Epic 24 (POS Wallet Payment) in the Multi-branch Wallet Payment feature. It implements the actual payment processing for full wallet payments at POS.

**Key Pattern:** The existing `payBookingWithWallet` mutation in wallet.ts already handles most of the functionality. This story adapts it for the POS flow with confirmation dialog and proper error handling.

### Existing Code Patterns

**Existing wallet debit pattern (from wallet.ts):**
```typescript
// payBookingWithWallet already:
// 1. Debits wallet (debitWallet mutation)
// 2. Awards points (awardPointsWithPromo)
// 3. Creates branch earning record (createEarningRecord)
// 4. Updates booking payment status
```

**POSWalletPayment component (from Story 24-1):**
```jsx
// Already has onPayWithWallet callback
// Just need to add confirmation dialog and call mutation
```

**Branch earnings service:**
```typescript
// convex/services/branchEarnings.ts - createEarningRecord mutation
// Already handles commission calculation
```

### Technical Requirements

**POS Wallet Payment Flow:**
1. Staff clicks "Pay with Wallet" in POSWalletPayment
2. Confirmation dialog opens showing:
   - Service/booking details
   - Payment amount
   - Customer's current balance
   - Balance after payment
   - Points to be earned
3. Staff confirms payment
4. Mutation executes:
   - Server-side balance validation
   - Wallet deduction
   - Earnings record creation
   - Points award
   - Booking status update
5. Success shown with receipt info

**Confirmation Dialog Props:**
```jsx
<WalletPaymentConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleConfirmPayment}
  customerId={selectedCustomer.userId}
  customerName={selectedCustomer.name}
  amount={selectedCustomer.servicePrice}
  walletBalance={walletBalance}
  serviceName={selectedCustomer.service}
  branchId={branchId}
  bookingId={selectedCustomer.bookingId}
/>
```

### File Structure Notes

**Files to create:**
- `src/components/staff/WalletPaymentConfirmDialog.jsx` - Confirmation modal

**Files to modify:**
- `src/components/staff/QueueSection.jsx` - Add confirmation dialog integration
- `src/components/staff/POSWalletPayment.jsx` - Connect to confirmation flow

**Files to reference:**
- `convex/services/wallet.ts` - payBookingWithWallet mutation (reuse or adapt)
- `convex/services/branchEarnings.ts` - createEarningRecord mutation
- `convex/lib/walletUtils.ts` - calculateCommission helper

### Edge Cases

1. **Race condition:** Customer's balance changes between display and payment - handled by server-side validation
2. **Network failure:** Show retry option, don't leave in inconsistent state
3. **Booking already paid:** Prevent double payment
4. **Staff cancels dialog:** No action taken, balance unchanged
5. **Zero amount payment:** Validate amount > 0

### Error Codes (from project-context.md)

| Code | When | Message |
|------|------|---------|
| `INSUFFICIENT_BALANCE` | Wallet balance < payment amount | "Insufficient wallet balance" |
| `BOOKING_ALREADY_PAID` | Booking status is already "paid" | "This booking has already been paid" |
| `INVALID_AMOUNT` | Amount <= 0 | "Invalid payment amount" |

### References

- [Source: epics-multi-branch-wallet.md#Story 4.2: Process Full Wallet Payment]
- [Source: architecture-multi-branch-wallet.md#Wallet Access Control Matrix]
- [Source: project-context.md#Wallet-Specific Error Codes]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Implementation completed 2026-01-31
- All 4 acceptance criteria satisfied

### Completion Notes List

1. **Task 1 Implementation:** Reused the existing `payBookingWithWallet` mutation from `convex/services/wallet.ts` (lines 570-726). This mutation already handles:
   - Wallet debit via `debitWallet` mutation
   - Points awarding via `awardPointsWithPromo` with promo multiplier support
   - Booking payment status update (payment_status: "paid", payment_method: "wallet")
   - Branch earning record creation via `createEarningRecord` with commission calculation
   - Returns comprehensive result including new balance and points earned

2. **Task 2 Implementation:** Created `WalletPaymentConfirmDialog.jsx` component with:
   - Portal-based modal (z-index 9999 to ensure visibility above other modals)
   - Purple accent styling consistent with wallet theme
   - Payment details display (amount, current balance, balance after payment)
   - Points earning preview (1 peso = 1 point base rate)
   - Insufficient balance warning with combo payment suggestion
   - Loading state during payment processing
   - Error display with appropriate messaging

3. **Task 3 Implementation:** Integrated dialog into `QueueSection.jsx`:
   - Added state: `showWalletConfirm`, `walletPaymentData`
   - Added query: `selectedCustomerWallet` to fetch wallet balance for dialog
   - Replaced placeholder `alert()` with dialog display logic
   - Success callback closes dialogs and shows confirmation with new balance and points earned

4. **Task 4 Implementation:** Error handling included in `WalletPaymentConfirmDialog`:
   - Catches `INSUFFICIENT_BALANCE` error from mutation
   - Displays error message in dialog
   - Calls `onInsufficientBalance` callback for combo payment flow (Story 24-3)

5. **Task 5 Implementation:** Booking payment status handled by existing `payBookingWithWallet`:
   - Sets `payment_status: "paid"` and `payment_method: "wallet"`
   - Real-time update via Convex subscriptions in queue view

### File List

**Created:**
- `src/components/staff/WalletPaymentConfirmDialog.jsx` - Confirmation dialog for POS wallet payment

**Modified:**
- `src/components/staff/QueueSection.jsx` - Added dialog import, state, wallet query, and integration
