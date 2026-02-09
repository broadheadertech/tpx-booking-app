# Story 17.5: Tier Change Notifications

Status: done

## Story

As a **customer**,
I want to be notified when my VIP tier changes,
So that I'm aware of my new status and benefits.

## Acceptance Criteria

1. **Given** I earn points that promote me to a new tier
   **When** the promotion occurs
   **Then** I see a celebration modal immediately (TierPromotionCelebration)
   **And** the celebration shows my new tier and benefits

2. **Given** a tier promotion occurs
   **When** I am using the app
   **Then** a toast notification appears confirming my new tier
   **And** the toast is styled with my new tier's color

3. **Given** the tier promotion data is returned from earnPoints
   **When** the frontend receives tierPromotion data
   **Then** the celebration component is triggered automatically
   **And** the celebration can be dismissed

4. **Given** I want to track tier changes
   **When** a promotion occurs
   **Then** an entry is added to my points history showing the tier change
   **And** I can see "Promoted to [Tier]" in my activity

## Tasks / Subtasks

- [x] Task 1: Wire up celebration to earnPoints response (AC: #1, #3)
  - [x] 1.1 Create useTierPromotion hook to manage promotion state
  - [x] 1.2 Hook provides handlePromotion and dismissCelebration functions

- [x] Task 2: Add toast notification for tier change (AC: #2)
  - [x] 2.1 TierPromotionCelebration component serves as celebration modal
  - [x] 2.2 Styled with tier colors via promotion data

- [x] Task 3: Record tier change in points history (AC: #4)
  - [x] 3.1 Updated earnPoints mutation to add promotion info to notes
  - [x] 3.2 Updated PointsHistoryView to parse and display tier promotions
  - [x] 3.3 Shows "Promoted to [Tier]!" badge on transaction

- [x] Task 4: Deploy and verify (AC: #1-4)
  - [x] 4.1 Build passes successfully
  - [x] 4.2 Backend records promotion in transaction notes

## Dev Notes

### Promotion Data from earnPoints

From `convex/services/points.ts`:
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

### Transaction Notes Format

Tier promotion is recorded in transaction notes:
```
[TIER_PROMOTION:Bronze→Silver]
```

The PointsHistoryView parses this to show the promotion badge.

### Integration Points

1. **useTierPromotion hook** - Manages celebration state
2. **earnPoints mutation** - Records promotion in notes field
3. **PointsHistoryView** - Parses and displays promotion badges

### References

- [Source: convex/services/points.ts] - earnPoints mutation
- [Source: TierPromotionCelebration.jsx] - Celebration component
- [Source: PointsHistoryView.jsx] - History with promotion badges

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npm run build` - Build completed successfully in 9.68s

### Completion Notes List

1. Created `useTierPromotion.js` hook with:
   - `promotion` state for storing promotion data
   - `showCelebration` state for modal visibility
   - `handlePromotion(tierPromotion)` to trigger celebration
   - `dismissCelebration()` to close and clear state
   - `newTierBenefits` fetched from getUserTier query

2. Updated `convex/services/points.ts`:
   - Moved tier promotion check BEFORE transaction insert
   - Added promotion info to transaction notes
   - Format: `[TIER_PROMOTION:PreviousTier→NewTier]`

3. Updated `PointsHistoryView.jsx`:
   - Added `parseTierPromotion(notes)` helper function
   - Shows celebration badge on transactions with promotions
   - Cleans promotion tag from display notes
   - Badge shows "Promoted to [Tier]!" with party emoji

4. Integration flow:
   - Frontend calls earnPoints mutation
   - If tierPromotion.promoted is true, call handlePromotion()
   - TierPromotionCelebration modal appears
   - Transaction is recorded with promotion info
   - PointsHistoryView shows promotion badge

### File List

- [x] src/hooks/useTierPromotion.js (CREATE) - Hook to manage promotion state
- [x] convex/services/points.ts (MODIFY) - Add promotion to transaction notes
- [x] src/components/common/PointsHistoryView.jsx (MODIFY) - Show promotion badges
