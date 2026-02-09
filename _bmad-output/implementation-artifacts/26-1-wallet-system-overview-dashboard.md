# Story 26.1: Wallet System Overview Dashboard

Status: done

## Story

As a **Super Admin**,
I want to see overall wallet system health metrics,
So that I can monitor the float and financial position.

## Acceptance Criteria

1. **Given** I am logged in as Super Admin
   **When** I navigate to the Wallet Overview dashboard
   **Then** I see the following key metrics prominently displayed:
   - Total Float (Money Held): Sum of all customer wallet balances
   - Outstanding to Branches: Sum of all pending earnings across branches
   - Available for Operations: Float - Outstanding

2. **Given** I am viewing the dashboard
   **When** the data loads
   **Then** I see monthly metrics:
   - Total Top-ups this month
   - Total Wallet Payments this month
   - Commission Earned this month
   - Settlements Paid this month

3. **Given** I want to see a different time period
   **When** I select a date range filter
   **Then** the metrics update to reflect that period

4. **Given** wallet activity occurs
   **When** I am viewing the dashboard
   **Then** the metrics update in real-time via Convex subscription

5. **Given** the dashboard is loading
   **When** data is undefined
   **Then** I see skeleton loaders for each metric card

## Tasks / Subtasks

- [x] Task 1: Create walletAnalytics.ts service (AC: #1, #2, #4)
  - [x] 1.1 Create new service file at `convex/services/walletAnalytics.ts`
  - [x] 1.2 Add getWalletOverview query returning float, outstanding, available
  - [x] 1.3 Add getMonthlyMetrics query for top-ups, payments, commission, settlements
  - [x] 1.4 Register service in convex/services/index.ts

- [x] Task 2: Create WalletOverviewDashboard component (AC: #1, #2, #5)
  - [x] 2.1 Create component at `src/components/admin/WalletOverviewDashboard.jsx`
  - [x] 2.2 Display key metrics cards (Float, Outstanding, Available)
  - [x] 2.3 Display monthly metrics section
  - [x] 2.4 Add skeleton loaders for loading state
  - [x] 2.5 Style with dark theme (#0A0A0A, #1A1A1A)

- [x] Task 3: Add date range filter (AC: #3)
  - [x] 3.1 Add period selector (This Month, Last Month, Last 7 Days, Last 30 Days, This Year)
  - [x] 3.2 Wire filters to query parameters
  - [x] 3.3 Add click-outside handler to close dropdown

- [x] Task 4: Integration and routing
  - [x] 4.1 Add Wallet Analytics section to Admin Dashboard
  - [x] 4.2 Ensure Super Admin role check
  - [x] 4.3 Update sprint-status.yaml

## Dev Notes

### Architecture Compliance

This story creates the analytics foundation for Super Admin wallet monitoring. Follows established patterns:

- Super Admin only access (role check)
- Currency as whole pesos (500 = ₱500)
- Dark theme: #0A0A0A background, #1A1A1A cards
- Skeleton loaders for loading states
- Real-time via Convex useQuery subscriptions

### Queries Required

**getWalletOverview:**
```typescript
{
  totalFloat: number,        // Sum of all users.wallet_balance
  outstandingToBranches: number, // Sum of pending branchWalletEarnings
  availableForOps: number,   // Float - Outstanding
}
```

**getMonthlyMetrics:**
```typescript
{
  totalTopUps: number,       // Sum of wallet_transactions where type=top-up
  totalPayments: number,     // Sum of wallet_transactions where type=payment
  commissionEarned: number,  // Sum of commission_amount from branchWalletEarnings
  settlementsPaid: number,   // Sum of completed settlements
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Wallet System Overview                    [This Month ▼]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Total Float  │  │ Outstanding  │  │  Available   │          │
│  │  ₱1,250,000  │  │   ₱85,500    │  │ ₱1,164,500   │          │
│  │ Money Held   │  │ Owed to      │  │ For Ops      │          │
│  │              │  │ Branches     │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Monthly Activity                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Top-ups     │  │  Payments    │  │  Commission  │          │
│  │  ₱500,000    │  │  ₱320,000    │  │   ₱16,000    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐                                               │
│  │ Settlements  │                                               │
│  │  ₱150,000    │                                               │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### References

- [Source: epics-multi-branch-wallet.md#Story 6.1]
- [Source: architecture-multi-branch-wallet.md#Analytics Queries]
- [Source: project-context.md#Currency and Loading States]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **Backend Service Created** - `convex/services/walletAnalytics.ts`:
   - `getWalletOverview` - Returns totalFloat, outstandingToBranches, availableForOps
   - `getMonthlyMetrics` - Returns topUps, payments, commission, settlements with date filtering
   - `getQuickStats` - Returns today's activity summary and quick stat badges
   - `getMonthlyTrends` - Returns trend data for multiple months (for future chart use)

2. **Dashboard Component Created** - `src/components/admin/WalletOverviewDashboard.jsx`:
   - Primary metrics cards with variants (primary/warning/success)
   - Monthly activity metrics grid
   - Today's summary section with net flow calculation
   - System health indicator with coverage ratio
   - Quick stat badges for at-a-glance info

3. **Date Range Filtering (AC #3)**:
   - Period selector dropdown (This Month, Last Month, Last 7 Days, Last 30 Days, This Year)
   - All metrics update based on selected period
   - Uses useMemo for efficient date range calculation

4. **Real-time Updates (AC #4)**:
   - All data via Convex useQuery subscriptions
   - Automatic updates when wallet activity occurs

5. **Loading States (AC #5)**:
   - MetricCardSkeleton for primary metrics
   - MonthlyMetricsSkeleton for activity section
   - Proper undefined checks for all queries

6. **Admin Dashboard Integration**:
   - Added 'wallet_analytics' tab with Activity icon
   - Super Admin role check for access control
   - Tab placed after Settlements in navigation

7. **Code Review Fixes** (26-1 review):
   - Removed unused `formatCompact` helper function
   - Optimized `getMonthlyTrends` to query database once using Promise.all instead of in loop
   - Added error state handling with `ErrorState` component
   - Added click-outside handler for period dropdown using useRef
   - Added aria-label and aria-expanded for accessibility
   - Updated Task 3.1 to reflect actual implementation (preset periods, not custom range)

### File List

**Created:**
- `_bmad-output/implementation-artifacts/26-1-wallet-system-overview-dashboard.md` - This story file
- `convex/services/walletAnalytics.ts` - Analytics queries
- `src/components/admin/WalletOverviewDashboard.jsx` - Dashboard component

**Modified:**
- `convex/services/index.ts` - Register walletAnalytics
- `src/pages/admin/Dashboard.jsx` - Add wallet analytics section
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status
