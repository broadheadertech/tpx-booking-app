# Story 3.2: Auto Tier Calculation

Status: done

## Story

As a **customer**,
I want to be automatically promoted to higher tiers when I earn enough points,
So that I don't have to manually claim my tier upgrades.

## Acceptance Criteria

1. **Given** I am Bronze tier with 4900 lifetime points
   **When** I earn 150 points (new total: 5050)
   **Then** I am automatically promoted to Silver tier
   **And** my current_tier_id is updated in the database

2. **Given** I earn a large amount of points at once (e.g., 20000)
   **When** the transaction completes
   **Then** I skip intermediate tiers and land at the correct tier (Gold if at 20000)
   **And** the promotion message reflects the final tier reached

3. **Given** I redeem points, reducing my current balance
   **When** my current_balance drops below a tier threshold
   **Then** I am NOT demoted (tier based on lifetime_earned, not current_balance)
   **And** I keep my tier status

4. **Given** a tier promotion occurs
   **When** the mutation completes
   **Then** it returns promotion data: { promoted: true, newTier: "Silver", previousTier: "Bronze" }
   **And** the frontend can display the celebration

5. **Given** the tier thresholds are checked
   **When** determining eligibility
   **Then** the check happens after every points_transaction insert (earn type)
   **And** the check uses lifetime_earned field, not current_balance

## Tasks / Subtasks

- [x] Task 1: Integrate tier check in earnPoints mutation (AC: #1, #4, #5)
  - [x] 1.1 Call updateUserTier after points are earned
  - [x] 1.2 Return promotion info in earnPoints response

- [x] Task 2: Tier promotion logic (AC: #1, #2, #3)
  - [x] 2.1 updateUserTier uses lifetime_earned for tier check
  - [x] 2.2 Skips intermediate tiers if points jump high
  - [x] 2.3 No demotion on redemption (only checks on earn)

- [x] Task 3: Deploy and verify (AC: #1-5)
  - [x] 3.1 Convex functions deployed successfully
  - [x] 3.2 earnPoints returns tierPromotion object when promoted

## Dev Notes

### Integration Flow

1. User earns points (payment, wallet payment, top-up bonus)
2. `earnPoints` mutation:
   - Updates points_ledger with new balance and lifetime_earned
   - Records points_transaction
   - Calls `updateUserTier` to check for promotion
   - Returns tierPromotion info if promoted

### Tier Promotion Response

```typescript
// When promoted, earnPoints returns:
{
  newBalance: 550000,
  pointsEarned: 15000,
  lifetimeEarned: 550000,
  tierPromotion: {
    promoted: true,
    previousTier: "Bronze",
    newTier: "Silver",
    newTierIcon: "🥈",
    newTierColor: "#C0C0C0"
  }
}
```

### No Demotion Guarantee

- updateUserTier only promotes (newOrder > currentOrder)
- Redemptions don't trigger tier check
- Tier based on lifetime_earned, not current_balance

### References

- [Source: convex/services/points.ts] - earnPoints mutation with tier integration
- [Source: convex/services/tiers.ts] - updateUserTier mutation
- [Source: epics-customer-experience.md#Story 3.4]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Convex functions ready

### Completion Notes List

1. Added api import to points.ts for calling tiers service

2. Modified earnPoints mutation to:
   - Call `updateUserTier` after updating points ledger
   - Return `tierPromotion` object with promotion details
   - Include `lifetimeEarned` in response for tier progress tracking

3. Tier promotion details returned:
   - `promoted: true/false`
   - `previousTier`: Name of previous tier
   - `newTier`: Name of new tier
   - `newTierIcon`: Emoji icon for celebration
   - `newTierColor`: Hex color for badge display

4. Error handling:
   - Tier check failure doesn't fail points earning
   - Logged but continues with points operation

### File List

- [x] convex/services/points.ts (MODIFY) - Integrate tier check and return promotion info
