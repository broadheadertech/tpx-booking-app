# Story 2.3: Top-Up Bonus Application

Status: done

## Story

As a **customer**,
I want to receive bonus credits when I top up my wallet,
So that I get extra value for loading larger amounts.

## Acceptance Criteria

1. **Given** I top up ₱500
   **When** the payment completes successfully
   **Then** I receive ₱550 total (₱500 main + ₱50 bonus)
   **And** the bonus is stored in the `bonus_balance` field

2. **Given** I top up ₱1000
   **When** the payment completes successfully
   **Then** I receive ₱1150 total (₱1000 main + ₱150 bonus)
   **And** the bonus is stored separately from main balance

3. **Given** I top up an amount not matching bonus tiers (e.g., ₱300)
   **When** the payment completes
   **Then** I receive only the topped-up amount with no bonus

4. **Given** Super Admin changes bonus tier configuration
   **When** I top up after the change
   **Then** the new bonus rates apply to my top-up

5. **Given** I view my wallet balance
   **When** I have both main and bonus balance
   **Then** I see them displayed separately: "₱1000 + ₱150 bonus = ₱1150 total"

## Tasks / Subtasks

- [x] Task 1: Create bonus calculation helper (AC: #1, #2, #3)
  - [x] 1.1 Create convex/lib/walletBonus.ts
  - [x] 1.2 Define bonus tiers: ₱500→₱50, ₱1000→₱150
  - [x] 1.3 Calculate bonus based on top-up amount

- [x] Task 2: Modify wallet credit to apply bonus (AC: #1, #2, #3)
  - [x] 2.1 Update creditWallet mutation to accept bonus
  - [x] 2.2 Add bonus to bonus_balance field
  - [x] 2.3 Award points for top-up bonus

- [x] Task 3: Deploy and verify (AC: #5)
  - [x] 3.1 Test ₱500 and ₱1000 top-ups
  - [x] 3.2 Verify WalletBalanceDisplay shows bonus

## Dev Notes

### Bonus Tiers (Initial Configuration)

| Top-Up Amount | Bonus | Total Received | Bonus Rate |
|---------------|-------|----------------|------------|
| ₱500          | ₱50   | ₱550           | 10%        |
| ₱1000         | ₱150  | ₱1150          | 15%        |

### Implementation Approach

1. Create helper `calculateTopUpBonus(amount)` in lib/walletBonus.ts
2. Modify `creditWallet` to:
   - Calculate bonus using helper
   - Add main amount to `balance`
   - Add bonus to `bonus_balance`
   - Award points via earnPoints with source_type="top_up_bonus"

### References

- [Source: convex/services/wallet.ts] - creditWallet mutation
- [Source: epics-customer-experience.md#Story 2.3]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Convex functions ready

### Completion Notes List

1. Created `convex/lib/walletBonus.ts` with:
   - `BonusTier` interface for tier configuration
   - `DEFAULT_BONUS_TIERS`: ₱500→₱50, ₱1000→₱150
   - `calculateTopUpBonus(amount)` - Returns bonus for given amount
   - `getTopUpBonusInfo(amount)` - Returns bonus, total, and rate
   - `formatBonusTier(tier)` - Formats tier for display
   - `getFormattedBonusTiers()` - Gets all tiers formatted

2. Modified `convex/services/wallet.ts`:
   - Added imports for walletBonus and points helpers
   - Updated `creditWallet` mutation:
     - New `applyBonus` optional arg (defaults to true)
     - Calculates bonus via `calculateTopUpBonus()`
     - Adds main amount to `balance`
     - Adds bonus to `bonus_balance`
     - Awards bonus points via `earnPoints` with source_type="top_up_bonus"
     - Returns `{ success, bonus, total }`

3. Bonus flow:
   - Customer tops up ₱500 → Gets ₱500 main + ₱50 bonus
   - Customer tops up ₱1000 → Gets ₱1000 main + ₱150 bonus
   - Bonus also awards points (1:1 ratio)
   - WalletBalanceDisplay already shows bonus_balance separately

### File List

- [x] convex/lib/walletBonus.ts (CREATE)
- [x] convex/services/wallet.ts (MODIFY)
