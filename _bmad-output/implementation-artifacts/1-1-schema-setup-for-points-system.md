# Story 1.1: Schema Setup for Points System

Status: done

## Story

As a **developer**,
I want the points system database tables created with proper indexes,
So that I can build features on a solid data foundation.

## Acceptance Criteria

1. **Given** the Convex schema file exists
   **When** I add the points_ledger table with fields (user_id, current_balance, lifetime_earned, lifetime_redeemed, last_activity_at)
   **Then** the table is created with integer ×100 storage pattern for decimal precision
   **And** indexes are added for by_user lookups

2. **Given** the points_ledger table exists
   **When** I add the points_transactions table with fields (user_id, type, amount, balance_after, source_type, source_id, branch_id, created_at, notes)
   **Then** the table supports earn/redeem/expire/adjust transaction types
   **And** indexes exist for by_user, by_branch, and by_created_at queries

3. **Given** both tables are defined
   **When** I run `npx convex dev`
   **Then** schema deploys without errors
   **And** tables are queryable

## Tasks / Subtasks

- [x] Task 1: Add points_ledger table to schema (AC: #1)
  - [x] 1.1 Define points_ledger table with required fields
  - [x] 1.2 Use integer ×100 storage pattern (4575 = 45.75 points)
  - [x] 1.3 Add by_user index for user lookups
  - [x] 1.4 Include audit fields (last_activity_at)

- [x] Task 2: Add points_transactions table to schema (AC: #2)
  - [x] 2.1 Define points_transactions table with required fields
  - [x] 2.2 Create type union for transaction types (earn/redeem/expire/adjust)
  - [x] 2.3 Add source_type union for transaction sources (payment/redemption/bonus/manual)
  - [x] 2.4 Add by_user, by_branch, by_type, by_created_at indexes

- [x] Task 3: Deploy and verify schema (AC: #3)
  - [x] 3.1 Run `npx convex dev` to push schema changes
  - [x] 3.2 Verify tables are created without errors
  - [x] 3.3 Test basic insert/query operations work

## Dev Notes

### Architecture Requirements (CRITICAL)

**Integer ×100 Storage Pattern** - [Source: architecture-customer-experience.md#Decision 1]
- Store ALL points as integers multiplied by 100
- Example: 45.75 points → stored as 4575
- This avoids floating-point precision errors
- Display conversion: `storedValue / 100`

**Table Definitions:**

```typescript
// points_ledger - User balances and lifetime tracking
points_ledger: defineTable({
  user_id: v.id("users"),
  current_balance: v.number(),      // Integer ×100 (4575 = 45.75 pts)
  lifetime_earned: v.number(),      // Integer ×100 - never decreases
  lifetime_redeemed: v.number(),    // Integer ×100
  last_activity_at: v.number(),     // Unix timestamp (Date.now())
})
  .index("by_user", ["user_id"])

// points_transactions - Full audit trail
points_transactions: defineTable({
  user_id: v.id("users"),
  branch_id: v.optional(v.id("branches")),  // Optional for universal operations
  type: v.union(
    v.literal("earn"),
    v.literal("redeem"),
    v.literal("expire"),
    v.literal("adjust")
  ),
  amount: v.number(),               // Integer ×100 (positive or negative)
  balance_after: v.number(),        // Integer ×100 - balance after transaction
  source_type: v.union(
    v.literal("payment"),           // Points earned from service payment
    v.literal("wallet_payment"),    // Points earned from wallet (1.5x)
    v.literal("redemption"),        // Points redeemed for reward
    v.literal("top_up_bonus"),      // Bonus points from wallet top-up
    v.literal("manual_adjustment"), // Admin adjustment
    v.literal("expiry")             // System expiry
  ),
  source_id: v.optional(v.string()), // ID of payment/redemption/etc
  notes: v.optional(v.string()),
  created_at: v.number(),           // Unix timestamp
})
  .index("by_user", ["user_id"])
  .index("by_branch", ["branch_id"])
  .index("by_type", ["type"])
  .index("by_created_at", ["created_at"])
  .index("by_user_created", ["user_id", "created_at"])
```

### Project Context Rules (MUST FOLLOW)

**Naming Conventions** - [Source: project-context.md#Naming Conventions]
- Tables: camelCase (✅ `points_ledger`, `points_transactions`)
- Fields: snake_case (✅ `user_id`, `current_balance`, `last_activity_at`)
- Indexes: by_fieldname (✅ `by_user`, `by_branch`, `by_created_at`)
- Foreign keys: entity_id (✅ `user_id`, `branch_id`)

**Data Types** - [Source: project-context.md#Data Types]
- Currency/Points: Integer as `v.number()` - NOT decimals
- Dates: Unix timestamps in milliseconds as `v.number()`
- IDs: Use `v.id("tableName")` - never plain strings
- Status/Type: Use `v.union(v.literal())` - no open strings

**Index Pattern** - [Source: project-context.md#Index Pattern]
```typescript
// MUST define index BEFORE using .withIndex()
defineTable({ ... })
  .index("by_user", ["user_id"])
  .index("by_branch", ["branch_id"])
```

### Existing Schema Context

**Current Schema Version:** 2026-01-28v1 (Clerk RBAC)

**Existing tables to reference (DO NOT DUPLICATE):**
- `users` - Has `v.id("users")` pattern, includes branch_id
- `wallets` - Existing wallet system (will be extended in Story 2.x)
- `wallet_transactions` - Pattern reference for transaction audit trails

**Field patterns to follow (from existing schema):**
- `branch_id: v.optional(v.id("branches"))` - Optional for universal data
- `created_at: v.number()` / `createdAt: v.number()` - Timestamp patterns
- Status unions: `v.union(v.literal("a"), v.literal("b"))` pattern

### Technical Specifications

**Points Ledger Purpose:**
- Single source of truth for user's points balance
- `current_balance` - Available points for redemption
- `lifetime_earned` - Total points ever earned (used for tier promotion)
- `lifetime_redeemed` - Total points ever redeemed (audit)
- One record per user (upsert pattern)

**Points Transactions Purpose:**
- Full audit trail for all points operations
- Immutable records (no updates, only inserts)
- Links to source via `source_type` + `source_id`
- `balance_after` provides snapshot for history view

### Testing Verification

After deployment, verify with test queries:
```typescript
// Test 1: Can insert a ledger record
await ctx.db.insert("points_ledger", {
  user_id: userId,
  current_balance: 50000, // 500 points
  lifetime_earned: 50000,
  lifetime_redeemed: 0,
  last_activity_at: Date.now(),
});

// Test 2: Can insert a transaction
await ctx.db.insert("points_transactions", {
  user_id: userId,
  branch_id: branchId,
  type: "earn",
  amount: 50000,
  balance_after: 50000,
  source_type: "payment",
  source_id: paymentId,
  created_at: Date.now(),
});

// Test 3: Can query by user
const ledger = await ctx.db
  .query("points_ledger")
  .withIndex("by_user", (q) => q.eq("user_id", userId))
  .unique();
```

### Project Structure Notes

**File to modify:** `convex/schema.ts`
- Add tables after existing `wallet_transactions` table (logical grouping)
- Update schema version comment at top of file

**Naming alignment:** Follows existing patterns exactly
- Uses `v.id("users")` same as users, barbers, bookings tables
- Uses `v.id("branches")` same as all branch-scoped tables
- Index naming matches existing `by_*` convention

### References

- [Source: architecture-customer-experience.md#Category 2: Data Architecture - Table Structure]
- [Source: architecture-customer-experience.md#Pattern 1: Points Value Storage & Display]
- [Source: architecture-customer-experience.md#Pattern 8: Required Indexes]
- [Source: project-context.md#Language-Specific Rules]
- [Source: project-context.md#Framework-Specific Rules]
- [Source: epics-customer-experience.md#Story 1.1: Schema Setup for Points System]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Convex deployment succeeded with 6 new indexes created
- Schema version updated to 2026-01-29v1

### Completion Notes List

1. Added `points_ledger` table at lines 1101-1107 with:
   - `user_id: v.id("users")` - FK to users table
   - `current_balance: v.number()` - Integer ×100 for decimal precision
   - `lifetime_earned: v.number()` - For tier promotion tracking
   - `lifetime_redeemed: v.number()` - Audit trail
   - `last_activity_at: v.number()` - Unix timestamp
   - Index: `by_user` for efficient lookups

2. Added `points_transactions` table at lines 1111-1138 with:
   - Full audit trail with immutable records
   - Type union: earn/redeem/expire/adjust
   - Source type union: payment/wallet_payment/redemption/top_up_bonus/manual_adjustment/expiry
   - 5 indexes: by_user, by_branch, by_type, by_created_at, by_user_created

3. Schema deployment verified:
   - `npx convex dev --once` completed successfully
   - All indexes created and validated
   - Tables ready for Story 1.2+ implementation

### File List

- [x] convex/schema.ts (MODIFY) - Lines 1095-1138 added
