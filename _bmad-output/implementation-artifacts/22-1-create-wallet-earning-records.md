# Story 22.1: Create Wallet Earning Records

Status: done

## Story

As a **system**,
I want to record each wallet payment to the branch ledger,
So that branches can track their earnings accurately.

## Acceptance Criteria

1. **Given** a customer pays with their wallet at a branch
   **When** the payment is processed successfully
   **Then** a `branchWalletEarnings` record is created with:
   - branch_id from the booking/transaction
   - booking_id linking to the service
   - customer_id who made the payment
   - staff_id who processed the payment (optional)
   - service_name for display purposes
   - gross_amount (full payment amount)
   - commission_percent (from config or branch override)
   - commission_amount (calculated using `calculateCommission()`)
   - net_amount (gross - commission)
   - status = "pending"
   - created_at timestamp

2. **Given** commission calculation is needed
   **When** the system calculates commission
   **Then** it uses `Math.round(grossAmount * (commissionPercent / 100))`
   **And** stores the result as an integer (whole pesos)

3. **Given** a branch has a commission override
   **When** an earning record is created
   **Then** the override rate is used instead of global rate

4. **Given** an earning record is created
   **When** queried by branch
   **Then** proper branch isolation is enforced via `by_branch` index

5. **Given** an earning record exists
   **When** it is linked to a settlement
   **Then** the `settlement_id` field references the branchSettlements record

## Tasks / Subtasks

- [x] Task 1: Create walletUtils.ts with commission calculation helper (AC: #2)
  - [x] 1.1 Create `convex/lib/walletUtils.ts` file
  - [x] 1.2 Implement `calculateCommission(grossAmount, commissionPercent)` function
  - [x] 1.3 Return `{ commissionAmount, netAmount }` with `Math.round()` for integers
  - [x] 1.4 Export for use in other services

- [x] Task 2: Create branchEarnings service foundation (AC: #1, #3, #4)
  - [x] 2.1 Create `convex/services/branchEarnings.ts` file
  - [x] 2.2 Import walletUtils calculateCommission helper
  - [x] 2.3 Add `createEarningRecord` mutation with full field validation
  - [x] 2.4 Fetch commission rate: check branchWalletSettings for override, fallback to walletConfig default
  - [x] 2.5 Call calculateCommission and store all amounts as integers

- [x] Task 3: Add branch earnings queries (AC: #4)
  - [x] 3.1 Add `getBranchEarnings` query filtered by branch_id using `by_branch` index
  - [x] 3.2 Add `getBranchPendingTotal` query for dashboard summary
  - [x] 3.3 Add `getEarningsByStatus` query using `by_branch_status` index
  - [x] 3.4 Ensure all queries enforce branch isolation

- [x] Task 4: Integrate with wallet.ts POS payment flow (AC: #1)
  - [x] 4.1 Update `payBookingWithWallet` mutation in wallet.ts
  - [x] 4.2 After successful wallet debit, call `createEarningRecord`
  - [x] 4.3 Pass booking details: branch_id, booking_id, customer_id, staff_id, service_name
  - [x] 4.4 Ensure earning record creation is part of atomic transaction

- [x] Task 5: Export and register service (AC: #1)
  - [x] 5.1 Add branchEarnings to `convex/services/index.ts` exports
  - [x] 5.2 Test service registration by running `npx convex dev`
  - [x] 5.3 Verify queries appear in Convex dashboard

## Dev Notes

### Architecture Compliance

This story creates the foundation for Branch Wallet Earnings (Epic 22). The `branchWalletEarnings` table already exists in schema (added in Story 21.1). This story implements:
1. Commission calculation helper (reusable across the system)
2. branchEarnings service with createEarningRecord mutation
3. Branch-isolated queries
4. Integration with existing wallet payment flow

**Key Insight:** The schema is already in place. This story focuses on the service layer and integration.

### Existing Code Patterns

**Schema (already exists in convex/schema.ts):**
```typescript
branchWalletEarnings: defineTable({
  branch_id: v.id("branches"),
  booking_id: v.id("bookings"),
  customer_id: v.id("users"),
  staff_id: v.optional(v.id("users")),
  service_name: v.string(),
  gross_amount: v.number(),
  commission_percent: v.number(),
  commission_amount: v.number(),
  net_amount: v.number(),
  settlement_id: v.optional(v.id("branchSettlements")),
  status: v.string(),
  created_at: v.number(),
})
.index("by_branch", ["branch_id"])
.index("by_branch_status", ["branch_id", "status"])
.index("by_settlement", ["settlement_id"]),
```

**walletConfig service (existing, use for commission rate):**
```typescript
// convex/services/walletConfig.ts - getWalletConfig query
// Returns: { default_commission_percent, ... }
```

**branchWalletSettings (existing schema, use for override):**
```typescript
branchWalletSettings: defineTable({
  branch_id: v.id("branches"),
  commission_override: v.optional(v.number()),
  // ...
}).index("by_branch", ["branch_id"]),
```

**Existing wallet payment flow (wallet.ts:570-687):**
```typescript
export const payBookingWithWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    bookingId: v.optional(v.id("bookings")),
    branchId: v.optional(v.id("branches")),
    serviceName: v.optional(v.string()),
  },
  // This mutation debits wallet and awards points
  // EXTEND: Add createEarningRecord call after debit
});
```

### Technical Requirements

**Commission Calculation Helper (MANDATORY PATTERN):**
```typescript
// convex/lib/walletUtils.ts
export function calculateCommission(
  grossAmount: number,
  commissionPercent: number
): { commissionAmount: number; netAmount: number } {
  // Use Math.round() for whole pesos (currency as integers)
  const commissionAmount = Math.round(grossAmount * (commissionPercent / 100));
  const netAmount = grossAmount - commissionAmount;
  return { commissionAmount, netAmount };
}
```

**createEarningRecord Mutation Structure:**
```typescript
export const createEarningRecord = mutation({
  args: {
    branch_id: v.id("branches"),
    booking_id: v.id("bookings"),
    customer_id: v.id("users"),
    staff_id: v.optional(v.id("users")),
    service_name: v.string(),
    gross_amount: v.number(), // In pesos (integer)
  },
  handler: async (ctx, args) => {
    // 1. Get commission rate (branch override or global default)
    const branchSettings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    const globalConfig = await ctx.db.query("walletConfig").first();
    const commissionPercent = branchSettings?.commission_override
      ?? globalConfig?.default_commission_percent
      ?? 5; // Default 5% if no config

    // 2. Calculate commission
    const { commissionAmount, netAmount } = calculateCommission(
      args.gross_amount,
      commissionPercent
    );

    // 3. Create earning record
    const now = Date.now();
    const recordId = await ctx.db.insert("branchWalletEarnings", {
      branch_id: args.branch_id,
      booking_id: args.booking_id,
      customer_id: args.customer_id,
      staff_id: args.staff_id,
      service_name: args.service_name,
      gross_amount: args.gross_amount,
      commission_percent: commissionPercent,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      status: "pending",
      created_at: now,
    });

    return {
      recordId,
      grossAmount: args.gross_amount,
      commissionAmount,
      netAmount,
    };
  },
});
```

### File Structure Notes

**Files to create:**
- `convex/lib/walletUtils.ts` - Commission calculation helper
- `convex/services/branchEarnings.ts` - Branch earnings service

**Files to modify:**
- `convex/services/wallet.ts` - Integrate createEarningRecord in payBookingWithWallet
- `convex/services/index.ts` - Export branchEarnings service

**Files to reference:**
- `convex/schema.ts` - branchWalletEarnings table definition
- `convex/services/walletConfig.ts` - getWalletConfig query pattern
- `_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md` - Commission calculation pattern

### Previous Story Learnings

**From Epic 21 (SA Wallet Configuration):**
- walletConfig table and service are already in place
- branchWalletSettings table exists for commission overrides
- Use `ctx.db.query().withIndex()` for all branch-isolated queries

**From Epic 23 (Customer Wallet Top-up):**
- wallet.ts has established patterns for mutations and queries
- Use `ConvexError` for user-facing errors
- Always log operations with console.log for debugging

### Edge Cases

1. **Missing walletConfig:** Default to 5% commission if no global config
2. **Missing branchWalletSettings:** Use global rate, no override
3. **Zero commission:** Valid case (0% commission), calculate correctly
4. **Partial wallet payment:** Commission calculated on wallet portion only
5. **Missing staff_id:** Optional field, allow null for self-service
6. **Amount validation:** gross_amount must be > 0

### Error Codes

| Code | When | Message |
|------|------|---------|
| `INVALID_AMOUNT` | gross_amount <= 0 | "Invalid payment amount" |
| `BRANCH_NOT_FOUND` | Invalid branch_id | "Branch not found" |
| `BOOKING_NOT_FOUND` | Invalid booking_id | "Booking not found" |
| `CONFIG_ERROR` | walletConfig issues | "System configuration error" |

### Testing Notes

1. Create earning record with valid data → verify all fields populated correctly
2. Verify commission calculation: ₱1000 at 5% = ₱50 commission, ₱950 net
3. Test branch override: set 3% override → verify 3% used instead of global 5%
4. Query by branch: verify only own branch earnings returned
5. Test edge case: 0% commission → ₱0 commission, full amount as net

### References

- [Source: architecture-multi-branch-wallet.md#Commission Calculation]
- [Source: architecture-multi-branch-wallet.md#Implementation Patterns]
- [Source: project-context.md#Currency Rules]
- [Source: epics-multi-branch-wallet.md#Story 2.1]
- [Source: convex/services/wallet.ts:570-687 - payBookingWithWallet]
- [Source: convex/services/walletConfig.ts - getWalletConfig pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Convex dev deployment successful: "✔ 19:57:28 Convex functions ready!"
- Schema validation complete - branchWalletEarnings table exists

### Completion Notes List

1. **Task 1 Complete:** Created `convex/lib/walletUtils.ts` with `calculateCommission()` function using mandatory `Math.round()` pattern for whole peso calculations. Added input validation, `DEFAULT_COMMISSION_PERCENT` constant (5%), and `EARNING_STATUS` constants.

2. **Task 2 Complete:** Created `convex/services/branchEarnings.ts` with `createEarningRecord` mutation. Implements commission rate priority: branch override → global config → 5% default. Validates branch_id, booking_id, and gross_amount > 0.

3. **Task 3 Complete:** Added branch-isolated queries:
   - `getBranchEarnings` - paginated list filtered by branch
   - `getBranchPendingTotal` - aggregates pending totals for dashboard
   - `getEarningsByStatus` - compound index query
   - `getEarningsBySettlement` - for settlement linkage (AC #5)
   - Added `linkEarningsToSettlement` and `markEarningsAsSettled` for future settlement integration

4. **Task 4 Complete:** Integrated earning record creation into `payBookingWithWallet` (wallet.ts) as Step 4. Creates earning record after successful wallet debit. Uses pesos (not centavos) for gross_amount per project-context.md. Returns `branchEarning` info in response.

5. **Task 5 Complete:** Exported `branchEarnings` in `convex/services/index.ts`. Verified with `npx convex dev --once` - schema validation passed, functions ready.

### File List

**Created:**
- `convex/lib/walletUtils.ts` - Commission calculation helper with `calculateCommission()`, constants
- `convex/services/branchEarnings.ts` - Branch earnings service with mutations and queries

**Modified:**
- `convex/services/wallet.ts` - Added Step 4 (earning record creation) to `payBookingWithWallet`
- `convex/services/index.ts` - Added `branchEarnings` export
