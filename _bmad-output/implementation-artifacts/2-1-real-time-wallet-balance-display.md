# Story 2.1: Real-Time Wallet Balance Display

Status: done

## Story

As a **customer**,
I want to view my wallet balance with real-time updates,
So that I always know how much I have available to spend.

## Acceptance Criteria

1. **Given** I am logged in as a customer
   **When** I navigate to my wallet or payment screen
   **Then** I see my current wallet balance prominently displayed
   **And** main balance and bonus balance are shown separately (e.g., "₱500 + ₱50 bonus")

2. **Given** my wallet balance changes (top-up or payment)
   **When** the transaction completes
   **Then** my displayed balance updates instantly via Convex subscription
   **And** I do not need to refresh the page

3. **Given** I have ₱0 wallet balance
   **When** I view my wallet
   **Then** I see "₱0.00" with a prompt to top up

4. **Given** I am on any page showing wallet info
   **When** another device/session modifies my wallet
   **Then** all my sessions reflect the updated balance in real-time

## Tasks / Subtasks

- [x] Task 1: Add bonus_balance to wallet schema (AC: #1)
  - [x] 1.1 Add bonus_balance field to wallets table
  - [x] 1.2 Deploy schema changes

- [x] Task 2: Create WalletBalanceDisplay component (AC: #1, #2, #3, #4)
  - [x] 2.1 Create src/components/common/WalletBalanceDisplay.jsx
  - [x] 2.2 Show main balance and bonus balance separately
  - [x] 2.3 Handle ₱0 balance with top-up prompt
  - [x] 2.4 Real-time updates via useQuery

- [x] Task 3: Deploy and verify
  - [x] 3.1 Test real-time updates across sessions

## Dev Notes

### Schema Update

Add to `wallets` table:
```typescript
bonus_balance: v.optional(v.number()), // Bonus from top-ups (e.g., ₱500→₱550)
```

### Component Requirements

- Use existing `getWallet` query from wallet service
- Display format: "₱500 + ₱50 bonus" when bonus exists
- Display format: "₱500" when no bonus
- Show total available: main + bonus
- Prompt to top up when balance is 0

### References

- [Source: convex/services/wallet.ts] - getWallet query
- [Source: epics-customer-experience.md#Story 2.1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Schema validation complete, functions ready

### Completion Notes List

1. Added `bonus_balance` field to `wallets` table in schema:
   - `bonus_balance: v.optional(v.number())` - For top-up bonuses
   - Optional to maintain backward compatibility with existing wallets

2. Created `src/components/common/WalletBalanceDisplay.jsx` with:
   - 3 variants: "card" (default), "inline", "compact"
   - Main balance and bonus balance shown separately ("₱500 + ₱50")
   - Total calculation: mainBalance + bonusBalance
   - Real-time updates via useQuery subscription
   - Empty wallet prompt: "Your wallet is empty. Top up..."
   - Top Up button with onTopUp callback
   - Note about bonus usage priority

3. Component features:
   - Green theme to differentiate from points (orange)
   - Wallet icon for visual identification
   - WalletSkeleton for loading state
   - formatPeso helper for currency formatting
   - Handles null wallet gracefully (treats as 0)

### File List

- [x] convex/schema.ts (MODIFY) - Line 1062: Added bonus_balance
- [x] src/components/common/WalletBalanceDisplay.jsx (CREATE)
