# Story 25.5: Settlement History & Receipts

Status: done

## Story

As a **Branch Manager**,
I want to view my settlement history,
So that I have records for accounting.

## Acceptance Criteria

1. **Given** I am on the Wallet Earnings dashboard
   **When** I navigate to "Settlement History"
   **Then** I see a list of all my settlement requests

2. **Given** I am viewing settlement history
   **When** the list loads
   **Then** each entry shows:
   - Date requested
   - Amount
   - Status (with status badge)
   - Completed date (if applicable)

3. **Given** I want to filter the history
   **When** I select status filter or date range
   **Then** only matching settlements are shown

4. **Given** I click on a completed settlement
   **When** the detail view opens
   **Then** I see full details including:
   - All transactions included
   - Payout details used
   - Transfer reference
   - Timeline of status changes

5. **Given** a settlement is completed
   **When** I click "Download Receipt"
   **Then** a PDF/printable receipt is generated showing:
   - Branch name and payout details
   - Settlement amount and date
   - Transfer reference
   - List of included transactions

## Tasks / Subtasks

- [x] Task 1: Extend settlements.ts with getBranchSettlementHistory query (AC: #1, #3)
  - [x] 1.1 Add date range and status filter parameters
  - [x] 1.2 Return enriched data with requester info

- [x] Task 2: Create SettlementHistoryList component (AC: #1, #2)
  - [x] 2.1 Create component at `src/components/staff/SettlementHistoryList.jsx`
  - [x] 2.2 Display list with date, amount, status badge, completed date
  - [x] 2.3 Add skeleton loaders for loading state
  - [x] 2.4 Add empty state when no settlements

- [x] Task 3: Add date and status filters (AC: #3)
  - [x] 3.1 Add status dropdown filter (all, pending, approved, processing, completed, rejected)
  - [x] 3.2 Add date range inputs
  - [x] 3.3 Wire up filters to query

- [x] Task 4: Add detail modal with timeline (AC: #4)
  - [x] 4.1 Reuse or extend SettlementDetailModal for branch view
  - [x] 4.2 Show transactions list, payout details, transfer reference
  - [x] 4.3 Add status timeline display

- [x] Task 5: Implement receipt download (AC: #5)
  - [x] 5.1 Add jsPDF-based receipt generation
  - [x] 5.2 Include branch name, amount, date, reference, transactions
  - [x] 5.3 Add "Download Receipt" button for completed settlements

- [x] Task 6: Integration and testing
  - [x] 6.1 Add Settlement History tab/section to WalletEarningsDashboard
  - [x] 6.2 Verify branch isolation
  - [x] 6.3 Update sprint-status.yaml

## Dev Notes

### Architecture Compliance

This story completes Epic 25 (Settlement Process) by adding settlement history visibility for branch managers. It follows the established patterns:

- Branch isolation via `withIndex("by_branch")` filtering
- Currency as whole pesos (500 = ₱500)
- Dark theme: #0A0A0A background, #1A1A1A cards
- Skeleton loaders for loading states
- Status badges consistent with admin settlement queue

### Previous Story Intelligence (25-4)

**From Story 25-4 Implementation:**
- Settlement status values: pending, approved, processing, completed, rejected
- SettlementDetailModal exists in admin/ with full earnings display
- Status badge styling already defined
- Portal-based modals with z-index 10000

### Existing Code to Leverage

**settlements.ts already has:**
```typescript
getBranchSettlements({ branch_id, limit }) // Returns settlements for a branch
getSettlementWithEarnings({ settlement_id }) // Returns full details with transactions
```

**jsPDF already in project:**
```json
"jspdf": "3.0.1"
```

### New Query Parameters

Extend getBranchSettlements to support:
- `status` filter (optional)
- `startDate` / `endDate` filter (optional, unix timestamps)

### UI Design

**SettlementHistoryList Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Settlement History                                      │
├─────────────────────────────────────────────────────────┤
│  [Status Filter ▼]  [Start Date] [End Date]  [Clear]    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐│
│  │ Jan 28, 2026          ₱15,500          ✓ Completed  ││
│  │ Completed: Jan 30                      [View] [PDF] ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ Jan 15, 2026          ₱8,200           ⏳ Processing ││
│  │                                        [View]       ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Status Badge Colors

```jsx
const statusColors = {
  pending: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
  approved: "bg-blue-900/50 text-blue-400 border-blue-700",
  processing: "bg-purple-900/50 text-purple-400 border-purple-700",
  completed: "bg-green-900/50 text-green-400 border-green-700",
  rejected: "bg-red-900/50 text-red-400 border-red-700",
};
```

### References

- [Source: epics-multi-branch-wallet.md#Story 5.5: Settlement History & Receipts]
- [Source: architecture-multi-branch-wallet.md#Settlement State Machine]
- [Source: 25-4-complete-settlement-transfer.md - Modal patterns]
- [Source: project-context.md#Currency and Date Handling]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **Backend Query Added** to settlements.ts:
   - `getBranchSettlementHistory` - Returns branch settlements with optional status and date range filters
   - Enriches data with requester, approver, completer, and rejector names
   - Uses `withIndex("by_branch_status")` for branch isolation

2. **SettlementHistoryList Component Created** with full feature set:
   - Status filter dropdown (all, pending, approved, processing, completed, rejected)
   - Date range inputs for filtering
   - Settlement cards showing date, amount, status badge, completed date
   - Skeleton loaders for loading states
   - Empty state with different messages for filtered vs unfiltered views

3. **Settlement Detail Modal** implemented:
   - Full details view with status badge, amount, transaction count
   - Transfer reference display for completed settlements
   - Rejection reason display for rejected settlements
   - Payout details section (method, account name, number, bank)
   - Amount breakdown (gross, commission, net)
   - Timeline showing status progression
   - Included transactions list with customer names and amounts

4. **PDF Receipt Generation** using jsPDF:
   - Generates professional receipt with header
   - Includes branch info, settlement ID, transfer reference
   - Shows settlement dates and transaction count
   - Payout details section
   - Amount breakdown
   - List of included transactions
   - Download button only shown for completed settlements

5. **WalletEarningsDashboard Integration**:
   - Added tab navigation (Earnings / Settlement History)
   - Tab buttons with icons and active state styling
   - SettlementHistoryList rendered in history tab

6. **Code Review Fixes** (25-5 review):
   - Removed unused imports (useMemo, Eye, Building2) from SettlementHistoryList.jsx
   - Fixed misplaced JSDoc comment in WalletEarningsDashboard.jsx (TabButton now before JSDoc)
   - Added user feedback for PDF generation errors (downloadError state + UI message)
   - Removed unused isDownloading state from SettlementCard component
   - Added "who" information to timeline (approver_name, processor_name, completer_name, rejecter_name)
   - Added no-branch-id error state handling in SettlementHistoryList
   - Updated getSettlementWithEarnings query to return actor names for timeline

### File List

**Created:**
- `_bmad-output/implementation-artifacts/25-5-settlement-history-receipts.md` - Story file
- `src/components/staff/SettlementHistoryList.jsx` - Main history component

**Modified:**
- `convex/services/settlements.ts` - Extended query with filters
- `src/components/staff/WalletEarningsDashboard.jsx` - Added history section
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status
