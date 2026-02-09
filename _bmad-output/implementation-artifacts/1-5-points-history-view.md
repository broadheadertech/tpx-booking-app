# Story 1.5: Points History View

Status: done

## Story

As a **customer**,
I want to view my points history showing earned, redeemed, and expired points,
So that I can track how I've accumulated and used my rewards.

## Acceptance Criteria

1. **Given** I am logged in as a customer
   **When** I navigate to my points history page
   **Then** I see a chronological list of all points transactions

2. **Given** I have points transactions
   **When** I view the history
   **Then** each entry shows: date, type (earned/redeemed/expired), amount, balance after, and source description

3. **Given** I have many transactions
   **When** I scroll the history
   **Then** older transactions load progressively (pagination or infinite scroll)

4. **Given** I earned points from a haircut payment
   **When** I view that transaction
   **Then** I see "Earned 350 pts from Haircut at [Branch Name]"

5. **Given** I redeemed points for a reward
   **When** I view that transaction
   **Then** I see "Redeemed 500 pts for Free Shampoo" with negative amount display

## Tasks / Subtasks

- [x] Task 1: Create PointsHistoryView component (AC: #1, #2, #4, #5)
  - [x] 1.1 Create src/components/common/PointsHistoryView.jsx
  - [x] 1.2 Use getPointsHistory query from points service
  - [x] 1.3 Format date, type, amount, and source for each transaction
  - [x] 1.4 Show positive amounts in green, negative in red

- [x] Task 2: Add pagination support (AC: #3)
  - [x] 2.1 Use limit parameter from query
  - [x] 2.2 Add "Load more" button for additional transactions

- [x] Task 3: Deploy and verify
  - [x] 3.1 Verify real-time updates
  - [x] 3.2 Test empty state

## Dev Notes

### Query Already Exists

`convex/services/points.ts` has `getPointsHistory`:
```typescript
export const getPointsHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("points_transactions")
      .withIndex("by_user_created", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .collect();
    return args.limit ? transactions.slice(0, args.limit) : transactions;
  },
});
```

### Transaction Type Display

| type | source_type | Display |
|------|-------------|---------|
| earn | payment | "Earned from payment" |
| earn | wallet_payment | "Earned from wallet payment (1.5x)" |
| earn | top_up_bonus | "Bonus from wallet top-up" |
| redeem | redemption | "Redeemed for [reward]" |
| expire | expiry | "Points expired" |
| adjust | manual_adjustment | "Admin adjustment" |

### References

- [Source: convex/services/points.ts] - getPointsHistory query
- [Source: convex/lib/points.ts] - formatPoints helper
- [Source: epics-customer-experience.md#Story 1.5]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Convex functions ready
- `npx vite build` - Build successful

### Completion Notes List

1. Created `src/components/common/PointsHistoryView.jsx` with:
   - Chronological transaction list with newest first
   - Color-coded amounts: green for earn, red for redeem, gray for expire, blue for adjust
   - Transaction details: date, time, type icon, amount, balance after
   - Source descriptions for each transaction type
   - "Load more" pagination with configurable initialLimit

2. Component features:
   - TransactionItem subcomponent for each entry
   - getTypeStyles() for icon/color based on type
   - getSourceDescription() for human-readable source text
   - HistorySkeleton for loading state
   - Empty state with call-to-action message

3. Transaction type styling:
   - earn: Green checkmark, "+X pts"
   - redeem: Red gift icon, "-X pts"
   - expire: Gray X icon, "-X pts"
   - adjust: Blue pencil icon, "±X pts"

4. Pagination:
   - Fetches limit+1 to detect if more exist
   - "Load more transactions" button when hasMore
   - Increments limit by initialLimit on each load

### File List

- [x] src/components/common/PointsHistoryView.jsx (CREATE)
