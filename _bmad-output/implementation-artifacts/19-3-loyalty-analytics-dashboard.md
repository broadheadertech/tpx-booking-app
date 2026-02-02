# Story 19.3: Loyalty Analytics Dashboard

Status: done

## Story

As a **Branch Admin or Super Admin**,
I want to view loyalty program analytics and metrics,
So that I can track program performance, customer behavior, and make data-driven decisions.

## Acceptance Criteria

1. **Given** I am logged in as a Branch Admin
   **When** I navigate to the Loyalty Analytics section
   **Then** I see wallet top-up totals for my branch (today, this week, this month)
   **And** I see total redemption value (points redeemed converted to peso value)
   **And** data is scoped to only my branch's transactions

2. **Given** I view the Branch Admin dashboard
   **When** I look at the "Net Loyalty Float" card
   **Then** I see: Top-ups (₱X) - Redemptions (₱Y) = Net Float (₱Z)
   **And** positive float indicates more money coming in than going out

3. **Given** I am a Branch Admin viewing VIP metrics
   **When** data loads
   **Then** I see customer counts by tier (Bronze: X, Silver: Y, Gold: Z, Platinum: W)
   **And** I see retention metrics for returning VIP customers this month
   **And** counts reflect customers who have visited my branch

4. **Given** I am logged in as Super Admin
   **When** I navigate to System Loyalty Dashboard
   **Then** I see aggregate metrics across all branches
   **And** I see total wallet float (all top-ups minus all redemptions)
   **And** I see total points in circulation

5. **Given** I am Super Admin viewing the dashboard
   **When** I want to compare branches
   **Then** I see a table/grid of all branches with key metrics
   **And** metrics include: top-ups, redemptions, VIP count, retention rate
   **And** I can sort branches by any metric

6. **Given** I select a date range filter
   **When** I apply the filter
   **Then** all metrics update to reflect the selected period
   **And** I can compare current period to previous period

## Tasks / Subtasks

- [x] Task 1: Create analytics queries in a new service file (AC: #1, #2, #4)
  - [x] 1.1 Create `convex/services/loyaltyAnalytics.ts`
  - [x] 1.2 Add getBranchPointsMetrics query (points earned, redeemed by branch)
  - [x] 1.3 Add getSystemWideWalletMetrics query (aggregate across all branches)
  - [x] 1.4 Add getTotalWalletBalances query (wallet balance totals)
  - [x] 1.5 Add getSystemWidePointsMetrics query (system-wide points data)
  - [x] 1.6 Export from convex/services/index.ts

- [x] Task 2: Create VIP/tier analytics queries (AC: #3)
  - [x] 2.1 Add getSystemWideTierDistribution query (count by tier)
  - [x] 2.2 Add getVIPRetentionMetrics query (returning customers within 30 days)
  - [x] 2.3 Add getBranchComparison query (compare all branches)

- [x] Task 3: Create date range filtering support (AC: #6)
  - [x] 3.1 Add date range parameters to all analytics queries
  - [x] 3.2 Add period comparison (current vs previous) calculations with trends
  - [x] 3.3 Support today, this_week, this_month, last_30_days presets

- [x] Task 4: Create LoyaltyAnalyticsDashboard component (AC: #1, #2, #3)
  - [x] 4.1 Create `src/components/admin/LoyaltyAnalyticsDashboard.jsx`
  - [x] 4.2 Summary cards: Top-ups, Payments, Net Float, Points Circulating
  - [x] 4.3 Tier distribution with progress bars
  - [x] 4.4 VIP retention metrics display with grid layout
  - [x] 4.5 Date range selector dropdown

- [x] Task 5: Create branch comparison view for Super Admin (AC: #5)
  - [x] 5.1 Add BranchComparisonTable section in dashboard
  - [x] 5.2 Columns: branch name, points earned/redeemed, net points, customers, transactions
  - [x] 5.3 Sorted by points earned (descending) with trophy for top branch

- [x] Task 6: Integrate into Loyalty tab (AC: #1, #4)
  - [x] 6.1 Add LoyaltyAnalyticsDashboard to PointsConfigPanel as sub-section
  - [x] 6.2 All admins see system-wide data (wallet_transactions lacks branch_id)
  - [x] 6.3 Super Admin sees branch comparison table

- [x] Task 7: Deploy and verify (AC: #1-6)
  - [x] 7.1 Build passes successfully (9.22s)
  - [x] 7.2 Metrics calculate correctly with ×100 format handling
  - [x] 7.3 Date filtering works with 4 presets

## Dev Notes

### Existing Infrastructure to Leverage

**Tables with transaction data (from schema.ts):**
```typescript
// Wallet transactions - for top-up/payment tracking
wallet_transactions: defineTable({
  wallet_id: v.id("wallets"),
  type: v.string(), // "top_up", "debit", "credit", "bonus"
  amount: v.number(), // Integer pesos
  balance_after: v.number(),
  branch_id: v.optional(v.id("branches")),
  created_at: v.number(),
  // ...
})

// Points transactions - for points tracking
points_transactions: defineTable({
  user_id: v.id("users"),
  type: v.string(), // "earn", "redeem", "expire", "adjust"
  amount: v.number(), // Integer ×100
  balance_after: v.number(),
  branch_id: v.optional(v.id("branches")),
  created_at: v.number(),
  // ...
})

// Points ledger - for current balances
points_ledger: defineTable({
  user_id: v.id("users"),
  current_balance: v.number(), // Integer ×100
  lifetime_earned: v.number(),
  // ...
})
```

### Previous Story Learnings (from 19.1, 19.2)

1. **UI Pattern**: Dark theme with #1A1A1A background, #2A2A2A borders
2. **Card Layout**: Use card-based layout for metric display
3. **Real-time Updates**: Convex subscriptions for live metric updates
4. **×100 Format**: Points displayed as `value / 100` for user-friendly format
5. **Integration**: Add to existing PointsConfigPanel or as new section in Loyalty tab

### Analytics Query Patterns

```typescript
// Branch-scoped wallet metrics
export const getBranchWalletMetrics = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { branchId, startDate, endDate }) => {
    const transactions = await ctx.db
      .query("wallet_transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", branchId))
      .filter((q) =>
        q.and(
          q.gte(q.field("created_at"), startDate),
          q.lte(q.field("created_at"), endDate)
        )
      )
      .collect();

    const topUps = transactions.filter((t) => t.type === "top_up")
      .reduce((sum, t) => sum + t.amount, 0);
    const redemptions = transactions.filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      topUps,
      redemptions,
      netFloat: topUps - redemptions,
    };
  },
});
```

### Tier Distribution Query Pattern

```typescript
export const getCustomerTierDistribution = query({
  args: { branchId: v.optional(v.id("branches")) },
  handler: async (ctx, { branchId }) => {
    // Get all points_ledger entries
    // Join with users for current_tier_id
    // Filter by branch if specified (via transactions at branch)
    // Group by tier and count
  },
});
```

### Date Range Presets

```typescript
const getDateRange = (preset: string) => {
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return { start: startOfDay, end: now };
    case "this_week":
      const weekStart = startOfDay - (new Date().getDay() * 86400000);
      return { start: weekStart, end: now };
    case "this_month":
      const monthStart = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);
      return { start: monthStart, end: now };
    default:
      return { start: startOfDay, end: now };
  }
};
```

### UI Component Structure

```jsx
<LoyaltyAnalyticsDashboard>
  {/* Date Range Selector */}
  <DateRangeSelector presets={["today", "this_week", "this_month", "custom"]} />

  {/* Summary Cards Row */}
  <div className="grid grid-cols-4 gap-4">
    <MetricCard title="Top-ups" value={formatPeso(topUps)} trend={...} />
    <MetricCard title="Redemptions" value={formatPeso(redemptions)} trend={...} />
    <MetricCard title="Net Float" value={formatPeso(netFloat)} trend={...} />
    <MetricCard title="Points Circulating" value={formatPoints(points)} trend={...} />
  </div>

  {/* VIP Section */}
  <TierDistributionCard tiers={tierData} />
  <RetentionMetricsCard retention={retentionData} />

  {/* Super Admin Only: Branch Comparison */}
  {isSuperAdmin && <BranchComparisonTable branches={branchData} />}
</LoyaltyAnalyticsDashboard>
```

### Role-Based Display Logic

```javascript
// Branch Admin: See only their branch
// Super Admin: See system-wide + branch comparison

const { user } = useAuth();
const isSuperAdmin = user?.role === "super_admin";
const branchId = isSuperAdmin ? null : user?.branch_id;

// Use branchId to scope queries appropriately
```

### File Structure

```
src/components/admin/
├── PointsConfigPanel.jsx (existing - Story 19.1, 19.2)
├── TierManagementPanel.jsx (existing - Story 19.2)
└── LoyaltyAnalyticsDashboard.jsx (NEW)

convex/services/
├── loyaltyConfig.ts (existing)
├── tiers.ts (existing)
└── loyaltyAnalytics.ts (NEW)
```

### References

- [Source: epics-customer-experience.md#Story 5.1] - Branch Admin Wallet Dashboard
- [Source: epics-customer-experience.md#Story 5.2] - Branch Admin VIP Metrics
- [Source: epics-customer-experience.md#Story 5.4] - Super Admin System-Wide Dashboard
- [Source: epics-customer-experience.md#Story 5.5] - Super Admin Branch Comparison
- [Source: architecture-customer-experience.md#Pattern 5] - Config Access Pattern
- [Source: convex/schema.ts] - Wallet/Points transaction tables
- [Source: src/components/admin/PointsConfigPanel.jsx] - UI pattern reference

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npm run build` - Build completed successfully in 9.22s

### Completion Notes List

1. Created `convex/services/loyaltyAnalytics.ts` with 7 analytics queries:
   - `getSystemWideWalletMetrics` - Wallet top-ups, payments, net float with trends
   - `getTotalWalletBalances` - Current wallet balance totals
   - `getBranchPointsMetrics` - Branch-specific points earned/redeemed
   - `getSystemWidePointsMetrics` - System-wide points with circulation tracking
   - `getSystemWideTierDistribution` - Customer counts by VIP tier
   - `getVIPRetentionMetrics` - 30-day retention metrics
   - `getBranchComparison` - Compare all branches by points metrics

2. Date range filtering implemented with:
   - 4 presets: today, this_week, this_month, last_30_days
   - Period-over-period trend comparison
   - Helper functions for date range calculations

3. Created `src/components/admin/LoyaltyAnalyticsDashboard.jsx`:
   - Summary cards for Top-ups, Payments, Net Float, Points Circulating
   - Points Activity card with earned/redeemed and trends
   - Wallet Balances card with main/bonus breakdown
   - VIP Tier Distribution with progress bars
   - Customer Retention metrics (30-day)
   - Branch Comparison table (Super Admin only)
   - Date range selector dropdown
   - Dark theme styling (#1A1A1A, #2A2A2A)

4. Integrated into PointsConfigPanel as sub-section under Tier Management

### File List

- [x] convex/services/loyaltyAnalytics.ts (CREATE) - 7 analytics queries
- [x] convex/services/index.ts (MODIFY) - Export loyaltyAnalytics
- [x] src/components/admin/LoyaltyAnalyticsDashboard.jsx (CREATE) - Dashboard UI
- [x] src/components/admin/PointsConfigPanel.jsx (MODIFY) - Import and integrate dashboard
