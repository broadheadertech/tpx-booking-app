# Story 25.2: Super Admin Settlement Queue

Status: done

## Story

As a **Super Admin**,
I want to see all pending settlement requests,
So that I can review and process them.

## Acceptance Criteria

1. **Given** I am logged in as Super Admin
   **When** I navigate to the Settlement Queue
   **Then** I see a list of pending settlement requests showing:
   - Branch name
   - Amount requested
   - Number of transactions
   - Date requested
   - [Review] button

2. **Given** there are settlements in different statuses
   **When** I view the queue
   **Then** I see tabs/filters for: Pending, Approved, Processing, Completed, Rejected

3. **Given** I click "Review" on a settlement
   **When** the detail view opens
   **Then** I see:
   - Branch details and payout information
   - List of all transactions included in this settlement
   - Total breakdown (gross, commission, net)
   - Action buttons: [Approve] [Reject]

4. **Given** new settlement requests come in
   **When** I am viewing the queue
   **Then** the list updates in real-time

## Tasks / Subtasks

- [x] Task 1: Create getAllPendingSettlements query (AC: #1, #4)
  - [x] 1.1 Add `getAllSettlements` query to settlements.ts with status filter
  - [x] 1.2 Enrich results with branch name, requester name
  - [x] 1.3 Add real-time subscription support via Convex useQuery
  - [x] 1.4 Validate super_admin role access

- [x] Task 2: Create getSettlementDetails query (AC: #3)
  - [x] 2.1 Add `getSettlementWithEarnings` query to settlements.ts
  - [x] 2.2 Fetch all linked branchWalletEarnings via settlement_id
  - [x] 2.3 Include branch payout details in response
  - [x] 2.4 Calculate breakdown totals (gross, commission, net)

- [x] Task 3: Create SettlementApprovalQueue component (AC: #1, #2)
  - [x] 3.1 Create `src/components/admin/SettlementApprovalQueue.jsx`
  - [x] 3.2 Add status tabs (Pending, Approved, Processing, Completed, Rejected)
  - [x] 3.3 Create settlement list table with sortable columns
  - [x] 3.4 Add skeleton loaders for loading state
  - [x] 3.5 Add empty state for no settlements

- [x] Task 4: Create SettlementDetailModal component (AC: #3)
  - [x] 4.1 Create `src/components/admin/SettlementDetailModal.jsx`
  - [x] 4.2 Display branch info and payout method details
  - [x] 4.3 Show earnings breakdown (gross, commission, net)
  - [x] 4.4 List linked transactions with service names and amounts
  - [x] 4.5 Add [Approve] and [Reject] action buttons (disabled for now - Story 25.3)

- [x] Task 5: Add navigation route (AC: #1)
  - [x] 5.1 Add Settlement Queue to admin navigation/dashboard
  - [x] 5.2 Ensure super_admin role restriction on route

- [x] Task 6: Add settlement count badge (AC: #1)
  - [x] 6.1 Add pending settlement count query (getSettlementSummary already exists)
  - [x] 6.2 Display badge on Settlement Queue navigation item (shown within tabs)

## Dev Notes

### Architecture Compliance

This story is part of Epic 25 (Settlement Process) in the Multi-branch Wallet Payment feature. It builds on Story 25-1 by providing the Super Admin view of all settlement requests across branches.

**Key Pattern:** Super Admin queries use `getAll*` prefix and don't include branch_id filter - they return cross-branch data.

### Previous Story Intelligence (25-1)

**From Story 25-1 Implementation:**
- `settlements.ts` already has `getSettlementsByStatus` query - EXTEND this
- `settlements.ts` already has `getSettlementSummary` query - USE for badge counts
- `SETTLEMENT_STATUS` constants in walletUtils.ts - USE these
- Portal-based modals with dark theme - FOLLOW this pattern

**Key Learnings:**
- Use `withIndex("by_status")` for status-filtered queries (already indexed)
- Enrich settlements with branch_name and requester_name in query
- Skeleton loaders when `data === undefined`
- 44px minimum touch targets for buttons

### Existing Code to Leverage

**settlements.ts already provides:**
```typescript
// These queries already exist - EXTEND/USE THEM:
getSettlementsByStatus({ status, limit }) // Returns settlements filtered by status
getSettlementSummary() // Returns counts by status
getSettlementById({ settlement_id }) // Gets single settlement with details
getBranchSettlements({ branch_id, limit }) // Branch-isolated query
```

**walletUtils.ts constants:**
```typescript
export const SETTLEMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;
```

**branchEarnings.ts:**
```typescript
// Use this to get transactions for a settlement:
getEarningsBySettlement({ settlement_id }) // Need to add this query
```

### New Query: getSettlementWithEarnings

```typescript
/**
 * Get settlement with all linked earnings (for detail view)
 * AC #3: Show list of all transactions included
 */
export const getSettlementWithEarnings = query({
  args: {
    settlement_id: v.id("branchSettlements"),
  },
  handler: async (ctx, args) => {
    // Get settlement
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) return null;

    // Enrich with branch and requester
    const branch = await ctx.db.get(settlement.branch_id);
    const requester = await ctx.db.get(settlement.requested_by);

    // Get linked earnings
    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_settlement", (q) => q.eq("settlement_id", args.settlement_id))
      .collect();

    // Get customer names for each earning
    const enrichedEarnings = await Promise.all(
      earnings.map(async (earning) => {
        const customer = await ctx.db.get(earning.customer_id);
        return {
          ...earning,
          customer_name: customer?.name || "Guest",
        };
      })
    );

    return {
      ...settlement,
      branch_name: branch?.name || "Unknown Branch",
      branch_address: branch?.address || "",
      requester_name: requester?.name || "Unknown",
      payout_details: {
        method: settlement.payout_method,
        account_number: settlement.payout_account_number,
        account_name: settlement.payout_account_name,
        bank_name: settlement.payout_bank_name,
      },
      earnings: enrichedEarnings,
    };
  },
});
```

### New Query: getAllSettlements (with filters)

```typescript
/**
 * Get all settlements with optional status filter (Super Admin)
 * AC #1, #2: List with tabs for different statuses
 */
export const getAllSettlements = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let settlements;
    if (args.status) {
      settlements = await ctx.db
        .query("branchSettlements")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("desc")
        .take(limit);
    } else {
      settlements = await ctx.db
        .query("branchSettlements")
        .order("desc")
        .take(limit);
    }

    // Enrich with branch and requester info
    const enriched = await Promise.all(
      settlements.map(async (settlement) => {
        const branch = await ctx.db.get(settlement.branch_id);
        const requester = await ctx.db.get(settlement.requested_by);
        return {
          ...settlement,
          branch_name: branch?.name || "Unknown Branch",
          requester_name: requester?.name || "Unknown",
        };
      })
    );

    return enriched;
  },
});
```

### Component Pattern (SettlementApprovalQueue.jsx)

```jsx
// File: src/components/admin/SettlementApprovalQueue.jsx
// Dark theme: bg-[#0A0A0A] page, bg-[#1A1A1A] cards
// Orange accent for pending: orange-500
// Green accent for completed: green-500
// Red accent for rejected: red-500

// Tab structure:
const SETTLEMENT_TABS = [
  { key: "pending", label: "Pending", color: "orange" },
  { key: "approved", label: "Approved", color: "blue" },
  { key: "processing", label: "Processing", color: "purple" },
  { key: "completed", label: "Completed", color: "green" },
  { key: "rejected", label: "Rejected", color: "red" },
];

// Table columns:
// Branch | Amount | Transactions | Requested | Status | Action
```

### Component Pattern (SettlementDetailModal.jsx)

```jsx
// Portal-based modal following Story 25-1 SettlementRequestForm pattern
// Use createPortal for z-index management
// Sections:
// 1. Branch Info (name, payout method details)
// 2. Settlement Summary (amount, earnings count, dates)
// 3. Breakdown (gross, commission, net)
// 4. Transaction List (scrollable table of earnings)
// 5. Action Buttons [Approve] [Reject] - Disabled until Story 25.3
```

### File Structure

**Files to create:**
- `src/components/admin/SettlementApprovalQueue.jsx` - Main queue component
- `src/components/admin/SettlementDetailModal.jsx` - Detail/review modal

**Files to modify:**
- `convex/services/settlements.ts` - Add new queries
- `src/pages/admin/Dashboard.jsx` - Add navigation to queue (or integrate)

### Schema Reference (Existing)

**branchSettlements table:**
- `_id`: Settlement ID
- `branch_id`: Branch reference
- `requested_by`: User who requested
- `amount`: Total settlement amount (whole pesos)
- `earnings_count`: Number of linked earnings
- `payout_method`: "bank" | "gcash" | "maya"
- `payout_account_number`: Account number
- `payout_account_name`: Account holder name
- `payout_bank_name`: Bank name (for bank transfers)
- `status`: "pending" | "approved" | "processing" | "completed" | "rejected"
- `created_at`: Request timestamp

**branchWalletEarnings table (linked via settlement_id):**
- `settlement_id`: Links to branchSettlements
- `service_name`: Service description
- `gross_amount`: Payment amount before commission
- `commission_amount`: Commission deducted
- `net_amount`: Amount after commission
- `customer_id`: Customer who paid
- `created_at`: Transaction timestamp

### UI/UX Requirements

**Dark Theme Colors:**
- Page background: `#0A0A0A`
- Card background: `#1A1A1A`
- Border: `#2A2A2A`
- Text primary: white
- Text secondary: gray-400

**Status Badge Colors:**
- Pending: `orange-500` bg with `orange-900/30` background
- Approved: `blue-500`
- Processing: `purple-500`
- Completed: `green-500`
- Rejected: `red-500`

**Table Requirements:**
- Sortable by date (default: newest first)
- Pagination or infinite scroll for large datasets
- Row click opens detail modal
- "Review" button in action column

### Edge Cases

1. **No pending settlements:** Show empty state with helpful message
2. **Large transaction lists:** Paginate or virtualize earnings list in modal
3. **Concurrent approvals:** Real-time updates via Convex subscription
4. **Missing branch/user data:** Show "Unknown" fallback
5. **Loading states:** Skeleton loaders for table and modal

### References

- [Source: epics-multi-branch-wallet.md#Story 5.2: Super Admin Settlement Queue]
- [Source: architecture-multi-branch-wallet.md#Access Control Matrix]
- [Source: project-context.md#RBAC Roles]
- [Source: convex/services/settlements.ts - Existing queries to extend]
- [Source: 25-1-branch-requests-settlement.md - Previous story patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **Backend Queries Added**: Extended settlements.ts with two new queries:
   - `getAllSettlements` - Returns all settlements with optional status filter, enriched with branch_name and requester_name
   - `getSettlementWithEarnings` - Returns full settlement details with linked branchWalletEarnings, payout details, and breakdown totals
   - `getSettlementSummary` - Returns counts by status for dashboard badges (already existed from Story 25-1)

2. **SettlementApprovalQueue Component**: Full-featured queue component with:
   - Status tabs (Pending, Approved, Processing, Completed, Rejected) with count badges
   - Desktop table view with columns: Branch, Amount, Transactions, Requested, Status, Action
   - Mobile card view for responsive design
   - Skeleton loaders for loading state
   - Empty state with helpful messaging
   - Real-time updates via Convex useQuery

3. **SettlementDetailModal Component**: Portal-based modal showing:
   - Settlement status and net amount header
   - Branch info and request details
   - Payout method details (Bank/GCash/Maya)
   - Earnings breakdown (gross, commission, net)
   - Scrollable transaction list with customer names and amounts
   - Rejection reason display (for rejected settlements)
   - Transfer reference display (for completed settlements)
   - Disabled Approve/Reject buttons with note about Story 25.3

4. **Admin Dashboard Integration**:
   - Added "Settlements" tab to super_admin navigation
   - Added SettlementApprovalQueue case in renderTabContent
   - Added Banknote icon and other missing icons to TabNavigation

5. **TypeScript Compliance**: Used `?.username` for user display names per schema definition

### File List

**Created:**
- `src/components/admin/SettlementApprovalQueue.jsx` - Main settlement queue component
- `src/components/admin/SettlementDetailModal.jsx` - Settlement detail modal

**Modified:**
- `convex/services/settlements.ts` - Added getAllSettlements, getSettlementWithEarnings, getSettlementSummary queries
- `src/pages/admin/Dashboard.jsx` - Added settlements tab and component
- `src/components/admin/TabNavigation.jsx` - Added Banknote, Star, Zap, Wallet, History icons

