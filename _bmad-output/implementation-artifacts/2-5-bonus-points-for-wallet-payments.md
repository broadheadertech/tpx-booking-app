# Story 2.5: Bonus Points for Wallet Payments

Status: done

## Story

As a **customer**,
I want to earn 1.5x bonus points when I pay with my wallet,
So that I'm rewarded for using the wallet payment method.

## Acceptance Criteria

1. **Given** I pay ₱500 using my wallet balance
   **When** the payment completes successfully
   **Then** I earn 750 points (1.5x multiplier) instead of 500 points
   **And** the points_transaction notes the wallet bonus multiplier

2. **Given** I pay ₱500 using cash or card
   **When** the payment completes
   **Then** I earn 500 points (1:1 standard ratio)

3. **Given** I use combo payment with ₱200 wallet + ₱300 cash
   **When** the payment completes
   **Then** I earn 300 points from wallet portion (₱200 × 1.5) + 300 points from cash (₱300 × 1.0) = 600 total

## Tasks / Subtasks

- [x] Task 1: Add wallet_payment source type to points (AC: #1)
  - [x] 1.1 Verified "wallet_payment" exists in source_type union in points schema
  - [x] 1.2 earnPoints mutation already supports wallet_payment

- [x] Task 2: Implement 1.5x multiplier for wallet payments (AC: #1, #2)
  - [x] 2.1 Modified points calculation in createTransaction
  - [x] 2.2 Apply 1.5x when payment_method is "wallet"
  - [x] 2.3 Include multiplier info in notes

- [x] Task 3: Deploy and verify (AC: #1, #2)
  - [x] 3.1 Convex functions deployed successfully
  - [x] 3.2 Wallet payment uses "wallet_payment" source type
  - [x] 3.3 Cash/card uses "payment" source type (1:1)

## Dev Notes

### Points Multiplier Logic

```typescript
// Wallet payment: 1.5x multiplier
// Other payments: 1:1 ratio

const WALLET_POINTS_MULTIPLIER = 1.5;
const isWalletPayment = args.payment_method === "wallet";
const multiplier = isWalletPayment ? WALLET_POINTS_MULTIPLIER : 1;
const pointsAmount = args.total_amount * multiplier;
const pointsToEarn = toStorageFormat(pointsAmount); // ×100 format
```

### Combo Payment (Story 2.6)

Note: Combo payment (wallet + cash) will be handled in Story 2.6.
For now, Story 2.5 handles full wallet payment multiplier.

### References

- [Source: convex/services/transactions.ts] - Points earning logic
- [Source: convex/services/points.ts] - earnPoints mutation
- [Source: epics-customer-experience.md#Story 2.5]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Convex functions ready

### Completion Notes List

1. Verified "wallet_payment" source type already exists in schema (line 1126)

2. Modified points earning in `convex/services/transactions.ts`:
   - Added `WALLET_POINTS_MULTIPLIER = 1.5`
   - Check if `payment_method === "wallet"`
   - Apply 1.5x multiplier for wallet payments
   - Use "wallet_payment" source type for wallet payments
   - Use "payment" source type for other payments (1:1)
   - Notes include "(1.5x bonus)" for wallet payments

3. Points calculation:
   - Wallet ₱500 → 750 points (₱500 × 1.5)
   - Cash ₱500 → 500 points (₱500 × 1.0)

### File List

- [x] convex/services/transactions.ts (MODIFY) - Apply 1.5x multiplier for wallet payments
