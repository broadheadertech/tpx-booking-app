# Story 17.4: Tier Progress Display

Status: done

## Story

As a **customer**,
I want to see my progress toward the next tier,
So that I'm motivated to earn more points and reach the next level.

## Acceptance Criteria

1. **Given** I am a Bronze tier customer with 2500 lifetime points
   **When** I view my tier progress
   **Then** I see a progress bar showing 2500/5000 (50% to Silver)
   **And** I see "2,500 more points to reach Silver"

2. **Given** I am a Platinum tier customer
   **When** I view my tier progress
   **Then** I see "You've reached the highest tier!" messaging
   **And** no progress bar is shown (already at max)

3. **Given** I am close to the next tier (4800/5000 to Silver)
   **When** I view my progress
   **Then** the UI highlights that I'm "almost there!"
   **And** shows "Only 200 points to go!"

4. **Given** I earn points that push me over a tier threshold
   **When** the transaction completes
   **Then** a celebration animation/modal appears
   **And** I see "Congratulations! You've reached Silver tier!"
   **And** the new tier benefits are displayed

## Tasks / Subtasks

- [x] Task 1: Create TierProgressBar component (AC: #1, #2, #3)
  - [x] 1.1 Create src/components/common/TierProgressBar.jsx
  - [x] 1.2 Show progress bar with percentage fill
  - [x] 1.3 Display points progress (current/threshold)
  - [x] 1.4 Show "almost there" highlight when >80%
  - [x] 1.5 Handle max tier case (no progress bar)

- [x] Task 2: Create TierPromotionCelebration component (AC: #4)
  - [x] 2.1 Create celebration modal/animation component
  - [x] 2.2 Show tier icon and congratulations message
  - [x] 2.3 Display new tier benefits

- [x] Task 3: Integrate into customer pages (AC: #1-4)
  - [x] 3.1 Add progress bar to TierStatusCard (showProgress prop)
  - [x] 3.2 TierProgressSection component inside TierStatusCard

- [x] Task 4: Deploy and verify (AC: #1-4)
  - [x] 4.1 Build passes successfully
  - [x] 4.2 Components use real-time Convex subscriptions

## Dev Notes

### Backend Already Complete

The tiers service provides:
- `getTierProgress` - Returns current tier, next tier, lifetime points, points to next tier, progress percent, isMaxTier

### Progress Calculation

From `convex/services/tiers.ts`:
```typescript
{
  currentTier,
  nextTier,
  lifetimePoints,
  pointsToNextTier,
  progressPercent,
  isMaxTier,
}
```

### Almost There Threshold

"Almost there" shows when progressPercent >= 80%

### Components Created

1. **TierProgressBar** (standalone) - Three variants:
   - `full`: Complete progress display with tier icons
   - `compact`: Horizontal bar with tier names
   - `mini`: Simple progress bar only

2. **TierPromotionCelebration** - Modal for tier promotion:
   - Animated celebration with floating particles
   - Shows new tier icon, name, and color
   - Lists new benefits
   - Auto-dismiss option

3. **TierProgressSection** (in TierStatusCard) - Inline progress:
   - Progress bar with gradient fill
   - Points display (current/threshold)
   - "Almost there!" badge when close

### References

- [Source: epics-customer-experience.md#Story 3.3]
- [Source: convex/services/tiers.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npm run build` - Build completed successfully in 7.90s

### Completion Notes List

1. Created `TierProgressBar.jsx` standalone component with:
   - Three variants: full, compact, mini
   - Animated progress bar with gradient fill
   - "Almost there!" pulsing badge when >80% progress
   - Max tier celebration display
   - Skeleton loading states

2. Created `TierPromotionCelebration.jsx` modal component with:
   - Animated floating particles effect
   - Bouncing tier icon with glow
   - Congratulations message with tier transition info
   - Benefits preview (up to 3)
   - Auto-dismiss option (via autoDismissMs prop)
   - CSS animations for float and bounce-slow

3. Updated `TierStatusCard.jsx`:
   - Added `showProgress` prop (default: true)
   - Created inline `TierProgressSection` component
   - Progress bar shows when not at max tier
   - Gradient fill animates toward next tier color

4. Progress display features:
   - Points displayed in human format (÷100)
   - "X pts to [TierName]" messaging
   - "Only X to go!" when almost there
   - Hidden when at max tier (Platinum)

### File List

- [x] src/components/common/TierProgressBar.jsx (CREATE) - Standalone progress bar
- [x] src/components/common/TierPromotionCelebration.jsx (CREATE) - Celebration modal
- [x] src/components/common/TierStatusCard.jsx (MODIFY) - Added progress section
