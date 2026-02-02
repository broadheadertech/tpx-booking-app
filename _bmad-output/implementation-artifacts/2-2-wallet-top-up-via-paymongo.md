# Story 2.2: Wallet Top-Up via PayMongo

Status: done

## Story

As a **customer**,
I want to add money to my wallet through PayMongo,
So that I can pay for services conveniently without cash.

## Acceptance Criteria

1. **Given** I am logged in and on the wallet page
   **When** I click "Top Up" and select an amount (₱500 or ₱1000)
   **Then** I am redirected to PayMongo checkout page

2. **Given** I complete payment on PayMongo
   **When** PayMongo sends a successful webhook
   **Then** my wallet balance is credited with the top-up amount
   **And** a wallet transaction record is created with type "top_up"
   **And** I see a success confirmation

3. **Given** PayMongo payment fails or is cancelled
   **When** the webhook indicates failure
   **Then** my wallet balance remains unchanged
   **And** I see an appropriate error message

4. **Given** the webhook is received
   **When** processing the top-up
   **Then** idempotency is enforced (duplicate webhooks don't double-credit)
   **And** the transaction includes PayMongo reference ID for reconciliation

## Tasks / Subtasks

- [x] Task 1: PayMongo integration (ALREADY IMPLEMENTED)
  - [x] 1.1 createEwalletSource action for GCash/Maya
  - [x] 1.2 createCardPaymentIntentAndAttach for card payments
  - [x] 1.3 Webhook handler in http.ts

- [x] Task 2: Wallet service mutations (ALREADY IMPLEMENTED)
  - [x] 2.1 createPendingTransaction
  - [x] 2.2 updateTransactionStatus
  - [x] 2.3 creditWalletBalance

- [x] Task 3: WalletTopUp UI (ALREADY IMPLEMENTED)
  - [x] 3.1 Amount selection with presets (₱100, ₱200, ₱500, ₱1000)
  - [x] 3.2 Payment method selection (GCash, Maya, Card)
  - [x] 3.3 Redirect to PayMongo checkout

## Dev Notes

### Pre-existing Implementation

This story was already implemented before the Customer Experience epic:

**Backend:**
- `convex/services/paymongo.ts` - PayMongo API integration
- `convex/services/wallet.ts` - Wallet mutations
- `convex/http.ts` - Webhook endpoint at `/webhooks/paymongo`

**Frontend:**
- `src/pages/customer/WalletTopUp.jsx` - Top-up page with payment options

### References

- [Source: convex/services/paymongo.ts] - createEwalletSource action
- [Source: src/pages/customer/WalletTopUp.jsx] - Top-up UI

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Story was already implemented prior to Customer Experience epic
- Verified existing implementation matches acceptance criteria

### Completion Notes List

1. **Existing implementation verified:**
   - GCash and Maya e-wallet top-ups work via PayMongo Sources API
   - Card payments work via PayMongo Payment Intents
   - Pending transactions tracked in wallet_transactions
   - Webhook processing handles payment completion

2. **Files already in place:**
   - `convex/services/paymongo.ts` - 90+ lines of PayMongo integration
   - `convex/services/wallet.ts` - 174 lines of wallet operations
   - `src/pages/customer/WalletTopUp.jsx` - Complete UI with amount/method selection

3. **Note for Story 2.3:**
   - Top-up bonus application needs to be added to the webhook/credit flow
   - When creditWalletBalance is called, bonus should be calculated and added

### File List

- [x] convex/services/paymongo.ts (EXISTING)
- [x] convex/services/wallet.ts (EXISTING)
- [x] convex/http.ts (EXISTING)
- [x] src/pages/customer/WalletTopUp.jsx (EXISTING)
