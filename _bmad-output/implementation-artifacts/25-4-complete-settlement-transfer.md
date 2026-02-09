# Story 25.4: Complete Settlement Transfer

Status: done

## Story

As a **Super Admin**,
I want to mark settlements as processing and completed,
So that I can track the transfer status.

## Acceptance Criteria

1. **Given** I have an approved settlement
   **When** I initiate the bank transfer (manual process)
   **Then** I click "Mark as Processing"
   **And** the status changes from "approved" to "processing"

2. **Given** a settlement is in "processing" status
   **When** I complete the bank transfer
   **Then** I click "Mark as Completed"
   **And** I enter the transfer reference number

3. **Given** I confirm completion
   **When** the system processes it
   **Then** the settlement status changes to "completed"
   **And** completed_at timestamp is recorded
   **And** transfer_reference is stored
   **And** all associated earnings are marked as "settled"
   **And** the branch receives a notification

4. **Given** the transfer fails
   **When** I click "Reject" from processing state
   **Then** I enter the failure reason
   **And** the status changes to "rejected"
   **And** associated earnings are released for re-settlement

5. **Given** I try to complete a non-processing settlement
   **When** the mutation runs
   **Then** I see error: "Cannot complete from {status} state"

## Tasks / Subtasks

- [x] Task 1: Create markAsProcessing mutation (AC: #1)
  - [x] 1.1 Add `markAsProcessing` mutation to settlements.ts
  - [x] 1.2 Implement state machine validation (only approved → processing)
  - [x] 1.3 Set processing_started_at timestamp

- [x] Task 2: Create completeSettlement mutation (AC: #2, #3, #5)
  - [x] 2.1 Add `completeSettlement` mutation to settlements.ts
  - [x] 2.2 Require transfer_reference parameter
  - [x] 2.3 Update all linked earnings to "settled" status
  - [x] 2.4 Set completed_at timestamp
  - [x] 2.5 Create notification for branch

- [x] Task 3: Update SettlementDetailModal (AC: #1, #2)
  - [x] 3.1 Add "Mark as Processing" button for approved settlements
  - [x] 3.2 Add "Mark as Completed" button with reference input for processing settlements
  - [x] 3.3 Add confirmation dialogs
  - [x] 3.4 Handle loading states

- [x] Task 4: Verify reject from processing (AC: #4)
  - [x] 4.1 Verify rejectSettlement already handles processing state (from 25-3)

## Dev Notes

### Architecture Compliance

This story extends Story 25-3 by adding the final state transitions to complete the settlement workflow. It implements the remaining state machine transitions:

**State Machine:**
```
approved → processing (via markAsProcessing)
processing → completed (via completeSettlement)
processing → rejected (already implemented in 25-3)
```

### Previous Story Intelligence (25-3)

**From Story 25-3 Implementation:**
- `rejectSettlement` already handles rejection from processing state
- SettlementDetailModal has dialog pattern established
- Status badge styling defined for all states
- Portal-based modal with z-index 10000 for stacked dialogs

**Key Learnings:**
- Use `?.username` for user display names
- Currency as whole pesos (500 = ₱500)
- Dark theme: #0A0A0A page, #1A1A1A cards
- 44px minimum touch targets

### Existing Code to Leverage

**settlements.ts already has:**
```typescript
approveSettlement({ settlement_id, approved_by, notes })
rejectSettlement({ settlement_id, rejected_by, rejection_reason })
getSettlementWithEarnings({ settlement_id })
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

export const SETTLEMENT_TRANSITIONS = {
  pending: ["approved", "rejected"],
  approved: ["processing", "rejected"],
  processing: ["completed", "rejected"],
  completed: [],
  rejected: [],
};
```

### New Mutations

```typescript
/**
 * Mark approved settlement as processing (transfer initiated)
 * AC #1: Status change from approved to processing
 */
export const markAsProcessing = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
    processed_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) throw new ConvexError({ code: "NOT_FOUND", message: "Settlement not found" });

    // State machine validation
    if (settlement.status !== "approved") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot process from ${settlement.status} state`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.settlement_id, {
      status: "processing",
      processed_by: args.processed_by,
      processing_started_at: now,
      updated_at: now,
    });

    return { success: true };
  },
});

/**
 * Complete settlement transfer
 * AC #2, #3: Require reference, update earnings, notify branch
 */
export const completeSettlement = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
    completed_by: v.id("users"),
    transfer_reference: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.transfer_reference.trim()) {
      throw new ConvexError({ code: "VALIDATION", message: "Transfer reference is required" });
    }

    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) throw new ConvexError({ code: "NOT_FOUND", message: "Settlement not found" });

    // State machine validation
    if (settlement.status !== "processing") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot complete from ${settlement.status} state`,
      });
    }

    const now = Date.now();

    // Update all linked earnings to "settled"
    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_settlement", (q) => q.eq("settlement_id", args.settlement_id))
      .collect();

    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        status: "settled",
      });
    }

    // Update settlement
    await ctx.db.patch(args.settlement_id, {
      status: "completed",
      completed_by: args.completed_by,
      completed_at: now,
      transfer_reference: args.transfer_reference.trim(),
      updated_at: now,
    });

    // Create notification for branch
    const branchAdmins = await ctx.db
      .query("users")
      .withIndex("by_branch_role", (q) =>
        q.eq("branch_id", settlement.branch_id).eq("role", "branch_admin")
      )
      .collect();

    for (const admin of branchAdmins) {
      await ctx.db.insert("notifications", {
        user_id: admin._id,
        title: "Settlement Completed",
        message: `Your settlement of ₱${settlement.amount.toLocaleString()} has been completed. Reference: ${args.transfer_reference}`,
        type: "success",
        is_read: false,
        created_at: now,
      });
    }

    return { success: true, earningsSettled: earnings.length };
  },
});
```

### UI Updates for SettlementDetailModal

The modal footer needs to show different buttons based on settlement status:

- **pending**: Approve / Reject buttons (already implemented in 25-3)
- **approved**: Mark as Processing / Reject buttons
- **processing**: Mark as Completed / Reject buttons (with reference input)
- **completed/rejected**: Close button only

### Schema Fields Used

branchSettlements already has these fields from earlier stories:
- `processed_by`: v.optional(v.id("users"))
- `processing_started_at`: v.optional(v.number())
- `completed_by`: v.optional(v.id("users"))
- `completed_at`: v.optional(v.number())
- `transfer_reference`: v.optional(v.string())

### Edge Cases

1. **Empty transfer reference:** Validate on both client and server
2. **Concurrent completion:** Handle race condition gracefully
3. **Large number of earnings:** Batch updates efficiently
4. **Network failure:** Show retry option

### References

- [Source: epics-multi-branch-wallet.md#Story 5.4: Complete Settlement Transfer]
- [Source: architecture-multi-branch-wallet.md#Settlement State Machine]
- [Source: 25-3-approve-or-reject-settlement.md - Modal and mutation patterns]
- [Source: project-context.md#Error Handling with ConvexError]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **Backend Mutations Added** to settlements.ts:
   - `markAsProcessing` - Validates approved → processing transition, sets processed_by and processing_started_at
   - `completeSettlement` - Validates processing → completed transition, requires transfer_reference, updates all linked earnings to "settled", creates branch notifications

2. **State Machine Validation**: Both mutations validate the current status before transitioning:
   - markAsProcessing only works from "approved" state
   - completeSettlement only works from "processing" state
   - ConvexError with INVALID_TRANSITION code for invalid state changes

3. **SettlementDetailModal Enhanced** with full processing/completion flow:
   - "Mark as Processing" button appears for approved settlements (purple)
   - "Mark as Completed" button appears for processing settlements (green)
   - ProcessingDialog shows payout details and confirmation
   - CompleteDialog requires transfer reference number input
   - Loading states during mutations with spinner
   - Success message displayed before auto-closing modal
   - All statuses can still Reject (per architecture state machine)

4. **Branch Notifications**: Both complete and processing status changes create appropriate notifications for branch_admin users

5. **Real-time Updates**: Queue automatically refreshes via Convex subscriptions when settlement status changes

6. **Earnings Status Update**: When settlement is completed, all linked branchWalletEarnings are updated to "settled" status

7. **Code Review Fixes** (25-4 review):
   - Added missing schema fields: `processed_by`, `processing_started_at`, `completed_by`
   - Added "Settlement Processing" notification in markAsProcessing mutation

### File List

**Created:**
- `_bmad-output/implementation-artifacts/25-4-complete-settlement-transfer.md` - Story file

**Modified:**
- `convex/schema.ts` - Added processed_by, processing_started_at, completed_by fields to branchSettlements
- `convex/services/settlements.ts` - Added markAsProcessing, completeSettlement mutations with branch notifications
- `src/components/admin/SettlementDetailModal.jsx` - Added processing/completion dialogs and status-based action buttons
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status to done
