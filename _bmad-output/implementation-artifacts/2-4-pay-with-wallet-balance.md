# Story 2.4: Pay with Wallet Balance

Status: done

## Story

As a **customer**,
I want to pay for services using my wallet balance,
So that I can complete transactions quickly without cash.

## Acceptance Criteria

1. **Given** I have sufficient wallet balance (₱500) for a ₱350 service
   **When** I select "Pay with Wallet" at checkout
   **Then** ₱350 is deducted from my wallet atomically with payment completion
   **And** the payment record shows payment_method = "wallet"

2. **Given** I have ₱200 wallet balance for a ₱350 service
   **When** I try to select "Pay with Wallet"
   **Then** the option is disabled or shows "Insufficient balance"
   **And** I cannot proceed with wallet-only payment

3. **Given** I have both main balance (₱400) and bonus balance (₱100)
   **When** I pay ₱350
   **Then** bonus balance is used first (₱100), then main balance (₱250)
   **And** remaining balances are: main ₱150, bonus ₱0

4. **Given** a wallet payment is attempted
   **When** the server processes the request
   **Then** balance validation happens server-side only (not client-side)
   **And** the deduction and payment are atomic (both succeed or both fail)

## Tasks / Subtasks

- [x] Task 1: Add "wallet" to payment_method union (AC: #1)
  - [x] 1.1 Update convex/schema.ts transactions table
  - [x] 1.2 Update convex/services/transactions.ts payment_method arg

- [x] Task 2: Create debitWallet mutation (AC: #3, #4)
  - [x] 2.1 Add debitWallet mutation to convex/services/wallet.ts
  - [x] 2.2 Implement bonus-first deduction logic
  - [x] 2.3 Return deduction breakdown (bonus used, main used)

- [x] Task 3: Integrate wallet payment in transaction flow (AC: #1, #4)
  - [x] 3.1 Modify createTransaction to call debitWallet for wallet payments
  - [x] 3.2 Ensure atomicity (fail transaction if wallet debit fails)

- [x] Task 4: Deploy and verify (AC: #1-4)
  - [x] 4.1 Convex functions deployed successfully
  - [x] 4.2 Schema updated with wallet payment_method
  - [x] 4.3 Wallet debit mutation ready

## Dev Notes

### Bonus-First Deduction Logic

```typescript
// When paying ₱350 with ₱400 main + ₱100 bonus:
// 1. Use all bonus first: ₱100 from bonus
// 2. Remaining from main: ₱250 from main
// Result: main=₱150, bonus=₱0

function calculateDeduction(amount, mainBalance, bonusBalance) {
  const bonusUsed = Math.min(bonusBalance, amount);
  const remainingAmount = amount - bonusUsed;
  const mainUsed = Math.min(mainBalance, remainingAmount);

  return { bonusUsed, mainUsed, totalDeducted: bonusUsed + mainUsed };
}
```

### Atomicity Requirements

- Wallet debit and transaction creation must be in same mutation
- If wallet debit fails (insufficient funds), entire transaction fails
- No partial states allowed

### References

- [Source: convex/services/wallet.ts] - Existing wallet mutations
- [Source: convex/services/transactions.ts] - createTransaction mutation
- [Source: epics-customer-experience.md#Story 2.4]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Convex functions ready

### Completion Notes List

1. Added "wallet" to payment_method union in:
   - `convex/schema.ts` (line 594)
   - `convex/services/transactions.ts` (line 118)

2. Created `debitWallet` mutation in `convex/services/wallet.ts`:
   - Server-side balance validation
   - Bonus-first deduction logic
   - Returns breakdown: bonusUsed, mainUsed, remainingBonus, remainingMain
   - Throws error if insufficient balance

3. Created `checkWalletBalance` query in `convex/services/wallet.ts`:
   - For UI to check if wallet payment option should be enabled
   - Returns hasWallet, hasSufficientBalance, balances, shortfall

4. Integrated wallet payment in `convex/services/transactions.ts`:
   - Calls debitWallet before creating transaction
   - Ensures atomicity - if wallet debit fails, entire transaction fails
   - Requires registered customer for wallet payments

### File List

- [x] convex/schema.ts (MODIFY) - Add "wallet" to payment_method
- [x] convex/services/wallet.ts (MODIFY) - Add debitWallet and checkWalletBalance
- [x] convex/services/transactions.ts (MODIFY) - Integrate wallet payment
