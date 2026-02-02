# Story 26.2: By-Branch Breakdown Table

Status: done

## Story

As a **Super Admin**,
I want to see per-branch wallet performance,
So that I can monitor each branch's earnings and settlements.

## Acceptance Criteria

1. **Given** I am on the Wallet Overview dashboard
   **When** I scroll to the branch breakdown section
   **Then** I see a table with columns:
   - Branch Name
   - Total Earnings (all-time or period)
   - Pending Amount
   - Settled Amount
   - Last Settlement Date

2. **Given** I am viewing the branch table
   **When** I click a column header
   **Then** the table sorts by that column (ascending/descending)

3. **Given** I want to see specific branches
   **When** I use the search/filter
   **Then** only matching branches are shown

4. **Given** I click on a branch row
   **When** the detail view opens
   **Then** I see that branch's:
   - Earnings history
   - Settlement history
   - Commission rate (global or override)
   - Payout details

5. **Given** I want to export the data
   **When** I click "Export"
   **Then** a CSV file downloads with all branch wallet data

## Tasks / Subtasks

- [x] Task 1: Add backend queries (AC: #1, #4)
  - [x] 1.1 Add getBranchWalletSummaries query to walletAnalytics.ts
  - [x] 1.2 Add getBranchWalletDetail query for branch detail modal

- [x] Task 2: Create BranchBreakdownTable component (AC: #1, #2, #3)
  - [x] 2.1 Create component at `src/components/admin/BranchBreakdownTable.jsx`
  - [x] 2.2 Display table with required columns
  - [x] 2.3 Implement column sorting (click to sort)
  - [x] 2.4 Add search/filter by branch name
  - [x] 2.5 Add skeleton loaders for loading state

- [x] Task 3: Create BranchWalletDetailModal component (AC: #4)
  - [x] 3.1 Create component at `src/components/admin/BranchWalletDetailModal.jsx`
  - [x] 3.2 Display earnings history list
  - [x] 3.3 Display settlement history list
  - [x] 3.4 Show commission rate and payout details

- [x] Task 4: Add CSV export (AC: #5)
  - [x] 4.1 Implement client-side CSV generation
  - [x] 4.2 Add export button to table header
  - [x] 4.3 Format currency properly in export

- [x] Task 5: Integration
  - [x] 5.1 Add BranchBreakdownTable to WalletOverviewDashboard
  - [x] 5.2 Update sprint-status.yaml

## Dev Notes

### Architecture Compliance

This story adds branch-level analytics for Super Admin. Follows established patterns:

- Super Admin only access (role check)
- Currency as whole pesos (500 = ₱500)
- Dark theme: #0A0A0A background, #1A1A1A cards
- Skeleton loaders for loading states
- Real-time via Convex useQuery subscriptions
- Client-side sorting and filtering for responsiveness

### Queries Required

**getBranchWalletSummaries:**
```typescript
{
  branches: Array<{
    branchId: string,
    branchName: string,
    totalEarnings: number,      // Sum of all gross_amount
    pendingAmount: number,      // Sum of pending earnings
    settledAmount: number,      // Sum of settled earnings
    lastSettlementDate: number | null,
    transactionCount: number,
  }>
}
```

**getBranchWalletDetail:**
```typescript
{
  branch: { id, name, ... },
  commissionRate: number,        // Override or global
  payoutDetails: { method, accountNumber, accountName, bankName },
  recentEarnings: Array<EarningRecord>,
  recentSettlements: Array<SettlementRecord>,
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Branch Wallet Performance                    [Search] [Export] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Branch ▼  │ Total   │ Pending │ Settled │ Last Settlement │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Main Branch    │ ₱50,000 │ ₱5,000  │ ₱45,000 │ Jan 28, 2026│  │
│  │ North Branch   │ ₱35,000 │ ₱3,500  │ ₱31,500 │ Jan 25, 2026│  │
│  │ South Branch   │ ₱28,000 │ ₱8,000  │ ₱20,000 │ Jan 20, 2026│  │
│  │ ...            │ ...     │ ...     │ ...     │ ...         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### References

- [Source: epics-multi-branch-wallet.md#Story 6.2]
- [Source: architecture-multi-branch-wallet.md#Analytics Queries]
- [Source: project-context.md#Currency and Loading States]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **Backend Queries Added** - `convex/services/walletAnalytics.ts`:
   - `getBranchWalletSummaries` - Returns all branches with wallet activity, including totalEarnings, pendingAmount, settledAmount, lastSettlementDate
   - `getBranchWalletDetail` - Returns detailed info for a specific branch including earnings history, settlement history, commission rate, and payout details
   - Optimized queries with Promise.all for parallel data fetching

2. **BranchBreakdownTable Component Created** - `src/components/admin/BranchBreakdownTable.jsx`:
   - Table with columns: Branch Name, Total Earnings, Pending, Settled, Last Settlement
   - Click-to-sort on all columns with ascending/descending toggle
   - Search/filter by branch name
   - Skeleton loader rows for loading state
   - Totals row showing filtered aggregate data
   - Pending settlement badge indicator per branch

3. **BranchWalletDetailModal Component Created** - `src/components/admin/BranchWalletDetailModal.jsx`:
   - Summary cards: Total Earnings, Pending, Settled, Commission
   - Commission rate display with "Custom Override" indicator
   - Payout details (method, account name, account number, bank)
   - Recent earnings list (last 20) with status badges
   - Recent settlements list (last 10) with status badges
   - Skeleton loader for loading state
   - Error state handling for missing branch

4. **CSV Export Functionality (AC #5)**:
   - Client-side CSV generation using Blob API
   - Exports all filtered branches with proper currency formatting
   - Filename includes date: `branch-wallet-breakdown-YYYY-MM-DD.csv`
   - Button disabled when no data or during export

5. **Dashboard Integration**:
   - BranchBreakdownTable added to WalletOverviewDashboard
   - Placed at bottom of analytics page for comprehensive view

6. **Code Review Fixes** (26-2 review):
   - Added super_admin role check to `getBranchWalletSummaries` and `getBranchWalletDetail` queries
   - Removed unused `XCircle` import from BranchWalletDetailModal
   - Added error state handling (`hasError`) in BranchBreakdownTable
   - Added keyboard accessibility for table rows (tabIndex, onKeyDown, role, aria-label)
   - Added Escape key handler to close BranchWalletDetailModal
   - Fixed CSV export quote escaping to handle internal quotes properly

### File List

**Created:**
- `_bmad-output/implementation-artifacts/26-2-by-branch-breakdown-table.md` - This story file
- `src/components/admin/BranchBreakdownTable.jsx` - Branch performance table with sorting, filtering, export
- `src/components/admin/BranchWalletDetailModal.jsx` - Branch detail modal with earnings/settlement history

**Modified:**
- `convex/services/walletAnalytics.ts` - Added getBranchWalletSummaries and getBranchWalletDetail queries
- `src/components/admin/WalletOverviewDashboard.jsx` - Added BranchBreakdownTable import and component
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status to done, epic-26 to done
