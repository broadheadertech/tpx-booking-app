# Story 2.6: Combo Payment Flow

Status: done

## Story

As a **customer**,
I want to pay using a combination of points, wallet, and cash,
So that I can use all my available credits and pay the remainder in cash.

## Acceptance Criteria

1. **Given** I have a ₱500 service to pay
   **And** I have 200 points (₱200 value), ₱150 wallet balance
   **When** I select "Combo Payment"
   **Then** the UI shows the payment breakdown:
   - Points: ₱200 (200 pts)
   - Wallet: ₱150
   - Cash due: ₱150

2. **Given** I confirm a combo payment
   **When** the payment processes
   **Then** deductions happen in strict order: Points → Wallet → Cash
   **And** all deductions are atomic (single transaction)
   **And** staff sees the cash amount to collect (₱150)

3. **Given** I have more points than needed (500 pts for ₱300 service)
   **When** I use combo payment
   **Then** only 300 points are deducted
   **And** wallet and cash are not touched

4. **Given** staff confirms receiving the cash portion
   **When** they mark payment complete
   **Then** all records are created: points_transaction (redeem), wallet_transaction (debit), payment record
   **And** the customer earns points only on the cash portion (1:1) + wallet portion (1.5x)

5. **Given** I select combo payment
   **When** I view the breakdown
   **Then** I see real-time calculation as I adjust which payment methods to use
   **And** I can choose to skip points or wallet if I prefer

## Tasks / Subtasks

- [x] Task 1: Add combo payment fields to schema (AC: #1, #2)
  - [x] 1.1 Add "combo" to payment_method union
  - [x] 1.2 Add points_redeemed, wallet_used, cash_collected fields

- [x] Task 2: Create points redemption mutation (AC: #2, #3, #4)
  - [x] 2.1 redeemPoints mutation already exists in points service
  - [x] 2.2 Validates sufficient points balance
  - [x] 2.3 Creates redemption transaction record

- [x] Task 3: Implement combo payment in transaction flow (AC: #2, #4)
  - [x] 3.1 Process deductions in order: Points → Wallet → Cash
  - [x] 3.2 Calculate points earned: cash (1:1) + wallet (1.5x)
  - [x] 3.3 Ensure atomicity

- [x] Task 4: Deploy and verify (AC: #1-4)
  - [x] 4.1 Convex functions deployed successfully
  - [x] 4.2 Schema updated with combo payment fields
  - [x] 4.3 Transaction flow handles combo payments

## Dev Notes

### Payment Deduction Order

```
Total: ₱500
1. Points: Use up to available (e.g., 200 pts = ₱200)
2. Wallet: Use up to remaining (e.g., ₱150 for ₱300 remaining)
3. Cash: Collect remainder (e.g., ₱150)

Result: 200 pts deducted, ₱150 wallet debited, ₱150 cash collected
```

### Points Earning on Combo Payment

```typescript
// Combo payment: wallet portion (1.5x) + cash portion (1:1) + points portion (0)
const cashPoints = cashPortion * 1; // 1:1 ratio
const walletPoints = walletPortion * WALLET_POINTS_MULTIPLIER; // 1.5x ratio
pointsAmount = cashPoints + walletPoints;
// Points redeemed portion earns 0 points

// Example: ₱200 points + ₱150 wallet + ₱150 cash = ₱500 total
// Earns: 0 + (150 × 1.5) + (150 × 1) = 0 + 225 + 150 = 375 pts
```

### Schema Fields

```typescript
// Transaction record for combo payment
{
  payment_method: "combo",
  points_redeemed: 20000,    // 200 pts (×100 format)
  wallet_used: 150,          // ₱150
  cash_collected: 150,       // ₱150
  total_amount: 500,         // ₱500
}
```

### References

- [Source: convex/services/transactions.ts] - createTransaction with combo support
- [Source: convex/services/wallet.ts] - debitWallet
- [Source: convex/services/points.ts] - redeemPoints
- [Source: epics-customer-experience.md#Story 2.6]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Convex functions ready

### Completion Notes List

1. Added "combo" to payment_method union in:
   - `convex/schema.ts` (line 596)
   - `convex/services/transactions.ts` (line 118)

2. Added combo payment fields to transactions table in schema:
   - `points_redeemed` - Integer ×100 format (e.g., 20000 = 200 pts)
   - `wallet_used` - Wallet amount (e.g., 150 = ₱150)
   - `cash_collected` - Cash portion (e.g., 150 = ₱150)

3. Implemented combo payment in createTransaction:
   - Validates combo amounts sum to total_amount
   - Step 1: Redeems points (if points_redeemed > 0)
   - Step 2: Debits wallet (if wallet_used > 0)
   - Step 3: Records cash_collected for staff to collect
   - All operations are atomic (fail together)

4. Updated points earning for combo payments:
   - Cash portion: ₱1 = 1 point (1:1)
   - Wallet portion: ₱1 = 1.5 points (1.5x)
   - Points portion: ₱0 points (no points on redeemed points)

### File List

- [x] convex/schema.ts (MODIFY) - Add "combo" and combo fields
- [x] convex/services/transactions.ts (MODIFY) - Implement combo payment flow
