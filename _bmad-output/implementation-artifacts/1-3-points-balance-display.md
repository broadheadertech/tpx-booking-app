# Story 1.3: Points Balance Display

Status: done

## Story

As a **customer**,
I want to view my current points balance with peso equivalent,
So that I understand the value of my loyalty rewards.

## Acceptance Criteria

1. **Given** I am logged in as a customer
   **When** I navigate to my account/dashboard
   **Then** I see my current points balance prominently displayed
   **And** the peso equivalent is shown (e.g., "125.50 pts (₱125.50)")

2. **Given** I have 0 points
   **When** I view my balance
   **Then** I see "0 pts (₱0.00)" with friendly messaging to earn points

3. **Given** my points balance changes (earn/redeem)
   **When** the transaction completes
   **Then** my displayed balance updates in real-time via Convex subscription

4. **Given** the points service is unavailable
   **When** I try to view my balance
   **Then** I see a graceful loading state, not an error

## Tasks / Subtasks

- [x] Task 1: Create points service with getPointsLedger query (AC: #1, #3)
  - [x] 1.1 Create convex/services/points.ts
  - [x] 1.2 Implement getPointsLedger query
  - [x] 1.3 Implement ensurePointsLedger mutation

- [x] Task 2: Create PointsBalanceDisplay component (AC: #1, #2, #4)
  - [x] 2.1 Create src/components/common/PointsBalanceDisplay.jsx
  - [x] 2.2 Use formatPointsWithPeso helper for display
  - [x] 2.3 Handle 0 points with friendly message
  - [x] 2.4 Handle loading state with Skeleton

- [x] Task 3: Verify real-time updates (AC: #3)
  - [x] 3.1 Deploy and test with useQuery subscription

## Dev Notes

### Implementation Pattern

**Service (convex/services/points.ts):**
```typescript
export const getPointsLedger = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .unique();
  },
});
```

**Component Pattern:**
- Use `useQuery` for real-time subscription
- Check `data === undefined` for loading state
- Use Skeleton component for loading
- Use formatPointsWithPeso from lib/points.ts

### References

- [Source: convex/services/wallet.ts] - Pattern reference
- [Source: convex/lib/points.ts] - Display helpers
- [Source: epics-customer-experience.md#Story 1.3]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Convex functions ready
- `npx vite build` - Build successful with no errors

### Completion Notes List

1. Created `convex/services/points.ts` with:
   - `getPointsLedger` - Query for user's points balance
   - `ensurePointsLedger` - Creates ledger if not exists
   - `getPointsHistory` - Transaction history query
   - `earnPoints` - Mutation to add points with transaction record
   - `redeemPoints` - Mutation to redeem points with validation

2. Created `src/components/common/PointsBalanceDisplay.jsx` with:
   - 3 variants: "card" (default), "inline", "compact"
   - Real-time updates via useQuery subscription
   - Skeleton loading states for all variants
   - Friendly 0 points message: "Start earning points with every purchase!"
   - Lifetime earned/redeemed stats in card variant
   - Uses formatPointsWithPeso and fromStorageFormat helpers

3. Component features:
   - Orange gradient card design matching theme
   - Points icon with peso symbol
   - Peso equivalent always displayed
   - Skip query if no userId (prevents errors)

### File List

- [x] convex/services/points.ts (CREATE)
- [x] src/components/common/PointsBalanceDisplay.jsx (CREATE)
