# Story 20.4: Promo Points Calculation

Status: in-dev

## Story

As a **Customer**,
I want my points to be automatically calculated with active promo multipliers,
So that I earn bonus points when promotions are running.

## Acceptance Criteria

1. **Given** there is an active bonus_points promo (2x multiplier)
   **When** I complete a ₱100 payment
   **Then** I earn 200 points instead of 100

2. **Given** there is an active flat_bonus promo (+50 pts)
   **When** I complete a payment
   **Then** I earn base points + 50 bonus points

3. **Given** there is an active wallet_bonus promo
   **When** I top up ₱500
   **Then** I receive ₱500 + promo bonus in my wallet

4. **Given** I earn bonus points from a promo
   **When** the transaction completes
   **Then** promo_usage is recorded for tracking

5. **Given** a promo has min_purchase or tier_requirement
   **When** I don't meet the requirement
   **Then** I only earn base points (no promo applied)

## Tasks / Subtasks

- [ ] Task 1: Update awardPoints to check for active promos (AC: #1, #2)
  - [ ] 1.1 Add promo lookup in awardPoints mutation
  - [ ] 1.2 Apply multiplier or flat bonus
  - [ ] 1.3 Record promo usage

- [ ] Task 2: Update wallet top-up to apply wallet_bonus (AC: #3)
  - [ ] 2.1 Check for wallet_bonus promo before crediting
  - [ ] 2.2 Add bonus amount to credit
  - [ ] 2.3 Record promo usage

- [ ] Task 3: Add eligibility checks (AC: #5)
  - [ ] 3.1 Check tier requirement
  - [ ] 3.2 Check min purchase amount

- [ ] Task 4: Test and verify (AC: #1-5)
  - [ ] 4.1 Build passes
  - [ ] 4.2 Promo correctly applies to points

## Dev Notes

### Key Integration Points

1. **convex/services/points.ts** - `awardPoints` mutation needs promo integration
2. **convex/services/wallet.ts** - Top-up crediting needs wallet_bonus check
3. **convex/services/promotions.ts** - Already has `getActivePromotions` and `recordPromoUsage`

### Calculation Logic

```typescript
// bonus_points type
const totalPoints = basePoints * promo.multiplier;

// flat_bonus type
const totalPoints = basePoints + (promo.flat_amount / 100);

// wallet_bonus type (for top-ups)
const totalCredit = topUpAmount + (promo.flat_amount / 100);
```

### Eligibility Check Order

1. Check if promo is active (status === 'active')
2. Check if within date range
3. Check tier requirement (if set)
4. Check min purchase (if set)
5. Check if user has max_uses_per_user

## Dev Agent Record

### Completion Notes List

- Integrated promo lookup into awardPoints
- Applied multiplier/flat bonus calculations
- Wallet bonus applied on top-up
- Promo usage tracking added

### File List

- [ ] convex/services/points.ts (MODIFY) - Add promo integration to awardPoints
- [ ] convex/services/wallet.ts (MODIFY) - Add wallet_bonus to top-up
