# Story 25.1: Branch Requests Settlement

Status: done

## Story

As a **Branch Manager**,
I want to request payout of my pending earnings,
So that I receive the money in my bank account.

## Acceptance Criteria

1. **Given** I am on the Wallet Earnings dashboard
   **When** I have pending earnings above the minimum threshold
   **Then** I see a "Request Settlement" button

2. **Given** I click "Request Settlement"
   **When** the settlement form opens
   **Then** I see:
   - Amount to be settled (total pending earnings)
   - Number of transactions included
   - My saved payout details (or form to enter them)

3. **Given** I have no payout details configured
   **When** I try to request settlement
   **Then** I am prompted to enter: payout method, account number, account name
   **And** I must save these before proceeding

4. **Given** I submit a settlement request
   **When** the request is created
   **Then** a `branchSettlements` record is created with status = "pending"
   **And** all pending `branchWalletEarnings` are associated with this settlement
   **And** I see confirmation: "Settlement request submitted"

5. **Given** I already have a pending settlement request
   **When** I try to request another
   **Then** I see error: "Settlement already pending for this branch"
   **And** the new request is blocked

6. **Given** my pending earnings are below minimum
   **When** I try to request settlement
   **Then** I see error: "Minimum settlement amount is ₱{min}"

## Tasks / Subtasks

- [x] Task 1: Create settlements service foundation (AC: #4, #5)
  - [x] 1.1 Create `convex/services/settlements.ts` with basic structure
  - [x] 1.2 Add `requestSettlement` mutation with validation
  - [x] 1.3 Implement check for existing pending settlement (AC #5)
  - [x] 1.4 Link pending earnings to settlement via `linkEarningsToSettlement` (already exists in branchEarnings.ts)
  - [x] 1.5 Add state machine constants for settlement statuses

- [x] Task 2: Add minimum amount validation (AC: #6)
  - [x] 2.1 Query `walletConfig` for `min_settlement_amount`
  - [x] 2.2 Query `branchWalletSettings` for branch-specific override (if any)
  - [x] 2.3 Validate pending total >= minimum before allowing request
  - [x] 2.4 Return `MINIMUM_NOT_MET` error code with amount in message

- [x] Task 3: Create payout details validation (AC: #3)
  - [x] 3.1 Query `branchWalletSettings` for payout details
  - [x] 3.2 Validate payout_method, payout_account_number, payout_account_name exist
  - [x] 3.3 Validate payout_bank_name exists if payout_method is "bank"
  - [x] 3.4 Return `PAYOUT_DETAILS_MISSING` error if incomplete

- [x] Task 4: Create SettlementRequestForm component (AC: #1, #2, #3)
  - [x] 4.1 Create `src/components/staff/SettlementRequestForm.jsx`
  - [x] 4.2 Display pending earnings summary (count, gross, commission, net)
  - [x] 4.3 Show saved payout details or inline form to enter them
  - [x] 4.4 Add payout method selector (GCash, Maya, Bank Transfer)
  - [x] 4.5 Validate and display minimum threshold
  - [x] 4.6 Handle loading and error states with skeleton loaders

- [x] Task 5: Integrate with WalletEarningsDashboard (AC: #1)
  - [x] 5.1 Add "Request Settlement" button to existing dashboard
  - [x] 5.2 Show button only when pending earnings >= minimum
  - [x] 5.3 Disable button if pending settlement exists
  - [x] 5.4 Open SettlementRequestForm modal on click
  - [x] 5.5 Handle success callback with confirmation toast

- [x] Task 6: Add settlement status queries (AC: #5)
  - [x] 6.1 Add `hasPendingSettlement` query to settlements.ts
  - [x] 6.2 Query by branch_id and status = "pending"
  - [x] 6.3 Use `withIndex("by_branch_status")` for efficient lookup

## Dev Notes

### Architecture Compliance

This story is part of Epic 25 (Settlement Process) in the Multi-branch Wallet Payment feature. It creates the foundation for the settlement workflow where branches can request payouts of their accumulated wallet earnings.

**Key Pattern:** Use the existing `linkEarningsToSettlement` mutation in branchEarnings.ts to associate pending earnings with the new settlement. This ensures atomic linking and proper audit trail.

### Existing Code to Leverage

**branchEarnings.ts already provides:**
```typescript
// These mutations already exist - REUSE THEM:
linkEarningsToSettlement({ branch_id, settlement_id }) // Links pending earnings to settlement
getBranchPendingTotal({ branch_id }) // Gets pending earnings summary
getEarningsByStatus({ branch_id, status }) // Gets earnings by status
```

**walletUtils.ts constants:**
```typescript
export const EARNING_STATUS = {
  PENDING: "pending",
  SETTLED: "settled",
} as const;

// Add to walletUtils.ts for settlements:
export const SETTLEMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;
```

### State Machine Definition

**Settlement Status Transitions (from architecture):**
```
pending → approved (SA approves)
pending → rejected (SA rejects)
approved → processing (SA initiates transfer)
approved → rejected (SA cancels)
processing → completed (Transfer confirmed)
processing → rejected (Transfer failed)
```

**Valid Transitions Map:**
```typescript
const SETTLEMENT_TRANSITIONS = {
  pending: ["approved", "rejected"],
  approved: ["processing", "rejected"],
  processing: ["completed", "rejected"],
  completed: [],
  rejected: [],
} as const;
```

### Schema Reference (Already Exists)

**branchSettlements table (convex/schema.ts:2502-2523):**
```typescript
branchSettlements: defineTable({
  branch_id: v.id("branches"),
  requested_by: v.id("users"),
  amount: v.number(), // Total settlement amount in whole pesos
  earnings_count: v.number(), // Number of earnings included
  payout_method: v.string(), // "bank" | "gcash" | "maya"
  payout_account_number: v.string(),
  payout_account_name: v.string(),
  payout_bank_name: v.optional(v.string()),
  status: v.string(), // "pending" | "approved" | "processing" | "completed" | "rejected"
  approved_by: v.optional(v.id("users")),
  approved_at: v.optional(v.number()),
  completed_at: v.optional(v.number()),
  rejection_reason: v.optional(v.string()),
  transfer_reference: v.optional(v.string()),
  notes: v.optional(v.string()),
  created_at: v.number(),
  updated_at: v.number(),
})
  .index("by_branch", ["branch_id"])
  .index("by_status", ["status"])
  .index("by_branch_status", ["branch_id", "status"]),
```

### Technical Requirements

**requestSettlement Mutation Pattern:**
```typescript
export const requestSettlement = mutation({
  args: {
    branch_id: v.id("branches"),
    requested_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Check for existing pending settlement
    const existingPending = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending")
      )
      .first();

    if (existingPending) {
      throw new ConvexError({
        code: "SETTLEMENT_PENDING",
        message: "Settlement already pending for this branch",
      });
    }

    // 2. Get pending earnings total
    const pendingTotal = await ctx.runQuery(
      api.services.branchEarnings.getBranchPendingTotal,
      { branch_id: args.branch_id }
    );

    // 3. Validate minimum amount
    const config = await ctx.db.query("walletConfig").first();
    const minAmount = config?.min_settlement_amount ?? 500;

    if (pendingTotal.totalNet < minAmount) {
      throw new ConvexError({
        code: "MINIMUM_NOT_MET",
        message: `Minimum settlement amount is ₱${minAmount}`,
      });
    }

    // 4. Get branch payout details
    const branchSettings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (!branchSettings?.payout_method || !branchSettings?.payout_account_number) {
      throw new ConvexError({
        code: "PAYOUT_DETAILS_MISSING",
        message: "Please configure payout details before requesting settlement",
      });
    }

    // 5. Create settlement record
    const now = Date.now();
    const settlementId = await ctx.db.insert("branchSettlements", {
      branch_id: args.branch_id,
      requested_by: args.requested_by,
      amount: pendingTotal.totalNet,
      earnings_count: pendingTotal.count,
      payout_method: branchSettings.payout_method,
      payout_account_number: branchSettings.payout_account_number,
      payout_account_name: branchSettings.payout_account_name,
      payout_bank_name: branchSettings.payout_bank_name,
      status: "pending",
      created_at: now,
      updated_at: now,
    });

    // 6. Link earnings to settlement
    await ctx.runMutation(api.services.branchEarnings.linkEarningsToSettlement, {
      branch_id: args.branch_id,
      settlement_id: settlementId,
    });

    return { settlementId, amount: pendingTotal.totalNet };
  },
});
```

### Component Pattern (SettlementRequestForm.jsx)

```jsx
// Portal-based modal following existing patterns
// Use createPortal for z-index management
// Dark theme: bg-[#1A1A1A], border-[#2A2A2A]
// Primary accent for settlement: green-500 (success/money theme)
// Skeleton loaders when data === undefined
// 44px minimum touch targets
// aria-labels for accessibility
```

### Error Codes (from project-context.md)

| Code | When | Message |
|------|------|---------|
| `SETTLEMENT_PENDING` | Already has pending settlement | "Settlement already pending for this branch" |
| `MINIMUM_NOT_MET` | Below min settlement amount | "Minimum settlement amount is ₱{amount}" |
| `PAYOUT_DETAILS_MISSING` | No payout info configured | "Please configure payout details..." |
| `BRANCH_NOT_FOUND` | Invalid branch_id | "Branch not found" |

### File Structure

**Files to create:**
- `convex/services/settlements.ts` - Settlement request/approval service

**Files to modify:**
- `convex/lib/walletUtils.ts` - Add SETTLEMENT_STATUS constants
- `convex/services/index.ts` - Export settlements service
- `src/components/staff/WalletEarningsDashboard.jsx` - Add settlement button

**Files to create (UI):**
- `src/components/staff/SettlementRequestForm.jsx` - Settlement request modal

### Edge Cases

1. **Concurrent requests:** First request wins due to pending check
2. **Earnings change during request:** Atomic linking captures current pending earnings
3. **Payout details incomplete:** Clear error with guidance to configure first
4. **Minimum not met:** Show clear threshold and current amount
5. **Network failure during creation:** Transaction rolled back, no partial state

### References

- [Source: epics-multi-branch-wallet.md#Story 5.1: Branch Requests Settlement]
- [Source: architecture-multi-branch-wallet.md#State Machine Definition]
- [Source: architecture-multi-branch-wallet.md#Settlement Status Transitions]
- [Source: project-context.md#Wallet-Specific Error Codes]
- [Source: convex/services/branchEarnings.ts - linkEarningsToSettlement mutation]
- [Source: convex/schema.ts:2502-2523 - branchSettlements table]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **Settlement Service Created**: Full settlements.ts service with requestSettlement mutation, hasPendingSettlement query, and additional helper queries for dashboard/admin use.

2. **State Machine Constants**: Added SETTLEMENT_STATUS and SETTLEMENT_TRANSITIONS constants to walletUtils.ts for consistent status management across the system.

3. **Settlement Request Form**: Portal-based modal component with dark theme styling, showing pending earnings summary, payout details display, and proper validation states.

4. **Dashboard Integration**: Added "Request Settlement" button to WalletEarningsDashboard with proper state management - shows settlement status when pending, disables button when below minimum.

5. **Validation Implementation**: All acceptance criteria validations implemented:
   - AC #3: Payout details must be configured before requesting
   - AC #5: Only one pending/in-progress settlement allowed per branch
   - AC #6: Minimum settlement amount validation (default ₱500)

6. **Reused Existing Code**: Leveraged existing linkEarningsToSettlement mutation from branchEarnings.ts and getSettlementParams query from walletConfig.ts.

### File List

**Created:**
- `convex/services/settlements.ts` - Settlement service with mutations and queries
- `src/components/staff/SettlementRequestForm.jsx` - Settlement request modal component

**Modified:**
- `convex/lib/walletUtils.ts` - Added SETTLEMENT_STATUS and SETTLEMENT_TRANSITIONS constants
- `convex/services/index.ts` - Exported settlements service
- `src/components/staff/WalletEarningsDashboard.jsx` - Integrated settlement button and modal
