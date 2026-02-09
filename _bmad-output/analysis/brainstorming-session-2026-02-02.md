# Brainstorming Session: Wallet Payment in Booking Flow

**Date:** February 2, 2026
**Topic:** Wallet Payment Integration for Logged-in Customers in Booking Flow

---

## Current State Analysis

### What Already Exists

The wallet payment feature for logged-in customers in the booking flow is **already implemented**. Here's the current architecture:

#### 1. PaymentOptionsModal (`src/components/customer/PaymentOptionsModal.jsx`)

```
Current Payment Options (in order):
1. Pay with Wallet (if logged in + sufficient balance) - Purple, "Recommended"
2. Pay Now (if PayMongo configured) - Green
3. Pay Later (if PayMongo configured) - Yellow
4. Pay at Shop (always available) - Blue
```

**Key Implementation Details:**
- Uses `useCurrentUser()` hook to check if user is authenticated
- Queries wallet balance via `checkWalletBalance` query
- Only shows wallet option if: `user && walletCheck?.hasSufficientBalance`
- Shows current wallet balance in the option card
- Shows insufficient balance message if wallet exists but balance is too low

#### 2. ServiceBooking (`src/components/customer/ServiceBooking.jsx`)

**Wallet Payment Flow (lines 980-1039):**
1. Create booking first with `createBooking` mutation
2. Calculate final price (service price - voucher discount)
3. Process wallet payment via `payBookingWithWallet` mutation
4. Update booking with wallet payment info and points earned
5. Send email notification to barber
6. Navigate to success screen

#### 3. Backend - Wallet Service (`convex/services/wallet.ts`)

**Key Functions:**
- `checkWalletBalance` - Checks if user has sufficient balance
- `payBookingWithWallet` - Debits wallet, records transaction, awards points

---

## Gap Analysis: What's Missing or Could Be Improved

### 1. Combo Payment Not Available in Customer Booking

**Current State:** Customer can only pay with wallet if they have FULL balance. If wallet has ₱200 and service costs ₱500, wallet option is hidden.

**Gap:** No option to use partial wallet balance + pay remainder via PayMongo or at shop.

**Staff POS Already Has This:** `src/components/staff/ComboPaymentDialog.jsx` supports combo payments, but only at POS.

### 2. No Wallet Balance Display Before Payment Screen

**Current State:** Customer doesn't see their wallet balance until they reach the payment options modal.

**Gap:** Could show wallet balance earlier in the booking flow (e.g., on service selection page) to set expectations.

### 3. No "Low Balance" Nudge for Logged-in Users

**Current State:** If wallet balance is insufficient, only a small note shows at bottom of payment modal.

**Gap:** Could proactively suggest top-up when user enters booking flow with low/zero wallet balance.

### 4. Guest Users Can't Use Wallet

**Current State:** Wallet option only shows for authenticated users.

**Gap:** This is actually correct behavior - guests shouldn't have wallets. But could show a "Login to use wallet" prompt.

### 5. Points Preview is Static

**Current State:** Shows base points that will be earned (1 point = ₱1).

**Gap:** Doesn't show active promotions that might give bonus points (2x multipliers, etc.).

---

## Proposed Improvements

### Priority 1: Combo Payment for Customers (High Impact)

**User Story:** As a customer with insufficient wallet balance, I want to pay partially with wallet and the rest via PayMongo, so I can still use my wallet balance.

**Implementation:**
```
┌─────────────────────────────────────────┐
│ Your wallet balance: ₱200              │
│ Service price: ₱500                    │
├─────────────────────────────────────────┤
│                                         │
│ ○ Pay with Wallet (Full)  ₱500   [dim] │
│   Insufficient balance                  │
│                                         │
│ ● Use Wallet + Pay Rest    ₱300        │
│   ₱200 from wallet + ₱300 online       │
│   Earn 500 ★ points                    │
│                                         │
│ ○ Pay Now (Full Online)    ₱500        │
│                                         │
│ ○ Pay at Shop              ₱500        │
│                                         │
└─────────────────────────────────────────┘
```

**Technical Changes:**
- Add `combo_wallet_online` payment option to PaymentOptionsModal
- Modify ServiceBooking to handle combo flow:
  1. Debit wallet for partial amount
  2. Create PayMongo payment link for remainder
  3. On payment success, complete booking

### Priority 2: Early Wallet Balance Visibility

**User Story:** As a logged-in customer, I want to see my wallet balance throughout the booking flow.

**Implementation:**
- Add small wallet badge in header during booking: `💳 ₱750`
- Show balance on service selection screen with "Use wallet" indicator

### Priority 3: Promo-Aware Points Preview

**User Story:** As a customer, I want to see actual points I'll earn including any active promotions.

**Implementation:**
- Query active promotions in PaymentOptionsModal
- Show "2x POINTS TODAY!" badge if promotion active
- Calculate and display bonus points preview

### Priority 4: Login Prompt for Guests

**User Story:** As a guest user, I want to know I can save money by logging in and using wallet.

**Implementation:**
```
┌─────────────────────────────────────────┐
│ 💡 Have an account?                     │
│ Log in to pay with your wallet balance  │
│ and earn loyalty points!                │
│                [Log In]                 │
└─────────────────────────────────────────┘
```

---

## Technical Architecture for Combo Payment

### New Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER BOOKING FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Select Service (₱500)                                       │
│         ↓                                                       │
│  2. Select Date/Time/Barber                                     │
│         ↓                                                       │
│  3. Payment Options Modal                                       │
│         ├─→ [Full Wallet] → Debit Wallet → Create Booking      │
│         ├─→ [Full Online] → Create PayMongo Link → Booking     │
│         ├─→ [Combo] → Debit Wallet → PayMongo for Rest         │
│         │                     ↓                                 │
│         │             Create Deferred Booking                   │
│         │                     ↓                                 │
│         │             On Payment Success → Complete Booking     │
│         └─→ [Pay at Shop] → Create Booking → Show QR           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Changes Needed

**branchWalletEarnings** - Already exists, no changes needed

**wallet_transactions** - Add new transaction type:
```typescript
type: "combo_payment" | "topup" | "payment" | "refund"
```

**bookings** - Add fields:
```typescript
wallet_amount_paid?: number      // Portion paid by wallet
online_amount_paid?: number      // Portion paid online
combo_payment?: boolean          // Flag for combo payments
```

### Backend Mutations Needed

1. **`processComboPayment`** - New mutation
   - Validates wallet balance >= walletPortion
   - Debits wallet for walletPortion
   - Returns remaining amount for PayMongo

2. **Update `createPaymentLinkDeferred`**
   - Accept `walletAmountPaid` parameter
   - Store in pending payment record

3. **Update webhook handler**
   - On payment success, finalize booking with combo amounts

---

## UI/UX Considerations

### When to Show Combo Option

| Condition | Show Combo? | Reason |
|-----------|-------------|--------|
| No wallet | No | Nothing to combine |
| Wallet >= Price | No | Full wallet payment available |
| 0 < Wallet < Price | Yes | Partial balance scenario |
| Wallet = 0 | No | No benefit to combo |

### Combo Payment Breakdown Display

```
┌─────────────────────────────────────────┐
│ Payment Breakdown                       │
│ ─────────────────────────               │
│ From Wallet:           ₱200             │
│ Pay Now (Online):      ₱300             │
│ ─────────────────────────               │
│ Total:                 ₱500             │
│                                         │
│ ★ You'll earn 500 points               │
│ 💳 Remaining wallet: ₱50               │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Quick Win)
- [ ] Add login prompt for guest users in PaymentOptionsModal
- [ ] Show wallet balance in booking header for logged-in users
- [ ] Improve insufficient balance messaging

### Phase 2: Combo Payment (Main Feature)
- [ ] Add `combo_wallet_online` option to PaymentOptionsModal
- [ ] Create `processComboPayment` backend mutation
- [ ] Handle combo flow in ServiceBooking
- [ ] Update webhook to handle combo payments
- [ ] Add combo payment tests

### Phase 3: Enhanced Experience
- [ ] Query and display active promotions
- [ ] Show promo-aware points preview
- [ ] Add "Top up now" quick action when balance low

---

## Questions to Resolve

1. **Minimum wallet portion?** Should there be a minimum amount to use from wallet (e.g., ₱50)?

2. **Points earning for combo?** Earn points on full service price or only wallet portion?
   - Recommendation: Full service price (consistent with current behavior)

3. **Refund handling?** If combo payment is refunded, how to split between wallet and online?
   - Recommendation: Credit back to wallet first, then online refund

4. **PayMongo fees?** Does branch eat the PayMongo fee on the online portion?
   - Current: Yes, fee is on branch side

---

## Conclusion

**Good News:** Wallet payment in booking already works for logged-in customers with sufficient balance!

**Main Gap:** Combo payment (partial wallet + online) is the most impactful missing feature.

**Recommendation:**
1. Start with Phase 1 (quick UI improvements)
2. Implement combo payment in Phase 2 if business need is strong
3. Phase 3 for enhanced UX polish

---

## Implementation Summary (Completed)

The following improvements were implemented based on this brainstorm:

### Completed Features

| Feature | Status | Files Modified |
|---------|--------|----------------|
| Login prompt for guest users | Done | `PaymentOptionsModal.jsx` |
| Combo payment (wallet + online) | Done | `PaymentOptionsModal.jsx`, `ServiceBooking.jsx`, `paymongo.ts` |
| Improved insufficient balance messaging | Done | `PaymentOptionsModal.jsx` |
| Wallet balance in booking header | Done | `ServiceBooking.jsx` |

### Key Changes

1. **PaymentOptionsModal.jsx**:
   - Added login prompt for guest users with redirect to login
   - Added `combo_wallet_online` payment option for partial wallet balance
   - Improved insufficient balance display with "Top up wallet" button
   - Added combo payment breakdown (wallet portion + online portion)

2. **ServiceBooking.jsx**:
   - Added wallet balance display in header for logged-in users
   - Added `combo_wallet_online` payment handler
   - Integrated wallet query for header display

3. **paymongo.ts**:
   - Extended `createPaymentLinkDeferred` to accept `combo_wallet_online` type
   - Added combo payment fields: `is_combo_payment`, `wallet_portion`
   - Updated `createPendingPayment` to store combo payment info
   - Updated `createBookingFromPending` to debit wallet before completing booking
   - Added wallet debit logic in webhook handler

### Code Review Fixes (Feb 2, 2026)

| Issue | Severity | Fix Applied |
|-------|----------|-------------|
| Wallet balance displayed in centavos instead of pesos | HIGH | Fixed: Divide by 100 in ServiceBooking.jsx header |
| Points NOT earned on combo/pay_now payments | HIGH | Fixed: Added `awardPointsWithPromo` call in createBookingFromPending |
| Wallet debit failure silently ignored | HIGH | Fixed: Now records failure in booking with `wallet_debit_failed` flag |
| Dead code (walletCheckResponse) | MEDIUM | Fixed: Removed unused Promise in ServiceBooking.jsx |
| Debug console.log in production | MEDIUM | Fixed: Removed from PaymentOptionsModal.jsx |
| No minimum PayMongo amount validation | MEDIUM | Fixed: Backend rejects <₱1, frontend hides option if online portion <₱1 |
| Login redirect loses query params | LOW | Fixed: Now preserves pathname + search |

---

## References

- [PaymentOptionsModal.jsx](src/components/customer/PaymentOptionsModal.jsx)
- [ServiceBooking.jsx](src/components/customer/ServiceBooking.jsx)
- [wallet.ts](convex/services/wallet.ts)
- [paymongo.ts](convex/services/paymongo.ts)
- [ComboPaymentDialog.jsx](src/components/staff/ComboPaymentDialog.jsx) - Staff POS reference
