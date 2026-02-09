# Story 25.3: Approve or Reject Settlement

Status: done

## Story

As a **Super Admin**,
I want to approve or reject settlement requests,
So that I can control fund disbursement.

## Acceptance Criteria

1. **Given** I am reviewing a pending settlement
   **When** I click "Approve"
   **Then** a confirmation dialog appears
   **And** I can optionally add notes

2. **Given** I confirm approval
   **When** the system processes the approval
   **Then** the settlement status changes from "pending" to "approved"
   **And** approved_by is set to my user_id
   **And** approved_at timestamp is recorded
   **And** the branch receives a notification

3. **Given** I click "Reject"
   **When** the rejection dialog opens
   **Then** I must enter a rejection reason

4. **Given** I submit the rejection
   **When** the system processes it
   **Then** the settlement status changes to "rejected"
   **And** rejection_reason is stored
   **And** the associated earnings are released (settlement_id cleared)
   **And** the branch receives a notification with the reason

5. **Given** I try to approve a non-pending settlement
   **When** the mutation runs
   **Then** I see error: "Cannot approve from {status} state"
   **And** the action is blocked (state machine validation)

## Tasks / Subtasks

- [x] Task 1: Create approveSettlement mutation (AC: #1, #2, #5)
  - [x] 1.1 Add `approveSettlement` mutation to settlements.ts
  - [x] 1.2 Implement state machine validation (only pending → approved)
  - [x] 1.3 Set approved_by and approved_at fields
  - [x] 1.4 Create notification for branch

- [x] Task 2: Create rejectSettlement mutation (AC: #3, #4, #5)
  - [x] 2.1 Add `rejectSettlement` mutation to settlements.ts
  - [x] 2.2 Require rejection_reason parameter
  - [x] 2.3 Clear settlement_id from associated earnings
  - [x] 2.4 Create notification for branch with reason

- [x] Task 3: Update SettlementDetailModal with actions (AC: #1, #3)
  - [x] 3.1 Enable Approve button with confirmation dialog
  - [x] 3.2 Enable Reject button with reason input modal
  - [x] 3.3 Add optional notes field for approval
  - [x] 3.4 Handle loading states during mutation

- [x] Task 4: Add real-time status updates
  - [x] 4.1 Ensure queue updates when settlement status changes
  - [x] 4.2 Close modal or show success message after action

## Dev Notes

### Architecture Compliance

This story extends Story 25-2 by adding the approve/reject functionality to the settlement queue. It implements the core state machine transitions for the settlement workflow.

**State Machine:**
```
pending → approved (via approveSettlement)
pending → rejected (via rejectSettlement)
```

### Previous Story Intelligence (25-2)

**From Story 25-2 Implementation:**
- `SettlementDetailModal.jsx` already has disabled Approve/Reject buttons - ENABLE them
- `getSettlementWithEarnings` query provides all data needed for the modal
- Status badge styling already defined for all states
- Portal-based modal pattern established

**Key Learnings:**
- Use `?.username` for user display names (users table)
- Currency as whole pesos (500 = ₱500)
- Dark theme: #0A0A0A page, #1A1A1A cards
- 44px minimum touch targets

### Existing Code to Leverage

**settlements.ts already has:**
```typescript
// These exist from Story 25-1 and 25-2:
getSettlementById({ settlement_id })
getSettlementWithEarnings({ settlement_id })
getAllSettlements({ status, limit })
getBranchSettlements({ branch_id, limit })
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

### New Mutations

```typescript
/**
 * Approve a pending settlement request
 * AC #1, #2: Confirmation dialog, status change, timestamps
 */
export const approveSettlement = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
    approved_by: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) throw new ConvexError({ code: "NOT_FOUND", message: "Settlement not found" });

    // State machine validation
    if (settlement.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot approve from ${settlement.status} state`,
      });
    }

    // Update settlement
    await ctx.db.patch(args.settlement_id, {
      status: "approved",
      approved_by: args.approved_by,
      approved_at: Date.now(),
      notes: args.notes,
    });

    // TODO: Send notification to branch
    return { success: true };
  },
});

/**
 * Reject a pending settlement request
 * AC #3, #4: Require reason, release earnings, notify branch
 */
export const rejectSettlement = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
    rejected_by: v.id("users"),
    rejection_reason: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.rejection_reason.trim()) {
      throw new ConvexError({ code: "VALIDATION", message: "Rejection reason is required" });
    }

    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) throw new ConvexError({ code: "NOT_FOUND", message: "Settlement not found" });

    // State machine validation
    if (settlement.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot reject from ${settlement.status} state`,
      });
    }

    // Release associated earnings (clear settlement_id)
    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_settlement", (q) => q.eq("settlement_id", args.settlement_id))
      .collect();

    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        settlement_id: undefined,
        status: "pending", // Back to pending, can be included in future settlement
      });
    }

    // Update settlement
    await ctx.db.patch(args.settlement_id, {
      status: "rejected",
      rejected_by: args.rejected_by,
      rejected_at: Date.now(),
      rejection_reason: args.rejection_reason,
    });

    // TODO: Send notification to branch with reason
    return { success: true };
  },
});
```

### UI Updates for SettlementDetailModal

```jsx
// Replace disabled buttons with functional ones:

// Approval flow:
// 1. Click Approve → Show confirmation dialog with optional notes
// 2. Confirm → Call approveSettlement mutation
// 3. Show success message or close modal

// Rejection flow:
// 1. Click Reject → Show modal with required reason input
// 2. Enter reason → Submit → Call rejectSettlement mutation
// 3. Show success message or close modal

// Handle errors:
// - Show toast notification for errors
// - Keep modal open on error
// - Disable buttons during mutation (loading state)
```

### Schema Fields to Add

The branchSettlements table may need these fields if not present:
- `approved_by`: v.optional(v.id("users"))
- `approved_at`: v.optional(v.number())
- `rejected_by`: v.optional(v.id("users"))
- `rejected_at`: v.optional(v.number())
- `notes`: v.optional(v.string())

### Edge Cases

1. **Concurrent approval attempts:** Handle race condition gracefully
2. **User no longer exists:** Use optional chaining for user lookups
3. **Empty rejection reason:** Validate on both client and server
4. **Network failure during mutation:** Show retry option
5. **Modal closed during mutation:** Mutation still completes, queue refreshes

### References

- [Source: epics-multi-branch-wallet.md#Story 5.3: Approve or Reject Settlement]
- [Source: architecture-multi-branch-wallet.md#Settlement State Machine]
- [Source: 25-2-sa-settlement-queue.md - Modal and query patterns]
- [Source: project-context.md#Error Handling with ConvexError]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **Schema Update**: Added `rejected_by` and `rejected_at` fields to branchSettlements table for tracking rejection metadata

2. **Backend Mutations Added** to settlements.ts:
   - `approveSettlement` - Validates state machine (pending → approved), sets approved_by/approved_at, creates notification for branch admins
   - `rejectSettlement` - Requires rejection_reason, clears settlement_id from linked earnings (returns them to pending), creates notification with rejection reason

3. **State Machine Validation**: Both mutations validate the current status before transitioning:
   - Approve only works from "pending" state
   - Reject works from "pending", "approved", or "processing" states (per architecture)
   - ConvexError with INVALID_TRANSITION code for invalid state changes

4. **SettlementDetailModal Enhanced** with full approve/reject flow:
   - Approve button opens confirmation dialog with optional notes field
   - Reject button opens dialog with required reason textarea
   - Loading states during mutation with spinner
   - Success message displayed before auto-closing modal
   - Error handling with inline error display
   - Dialogs use higher z-index (10000) to stack above main modal

5. **Branch Notifications**: Both approve and reject actions create notifications for branch_admin users of the affected branch using the existing notifications table

6. **Real-time Updates**: Queue automatically refreshes via Convex subscriptions when settlement status changes

### File List

**Created:**
- `_bmad-output/implementation-artifacts/25-3-approve-or-reject-settlement.md` - Story file

**Modified:**
- `convex/schema.ts` - Added rejected_by, rejected_at fields to branchSettlements
- `convex/services/settlements.ts` - Added approveSettlement, rejectSettlement mutations
- `src/components/admin/SettlementDetailModal.jsx` - Enabled approve/reject buttons with confirmation dialogs
