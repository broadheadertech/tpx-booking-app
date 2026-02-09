# Story 21.1: Add Wallet Schema Tables

Status: done

## Story

As a **developer**,
I want to add the wallet-related database tables to the schema,
So that the wallet system has its data foundation.

## Acceptance Criteria

1. **Given** the Convex schema file exists
   **When** I add the wallet tables
   **Then** the following tables are created in `convex/schema.ts`:
   - `walletConfig` with all SA PayMongo configuration fields
   - `branchWalletSettings` with branch-specific wallet settings
   - `branchWalletEarnings` with wallet payment tracking
   - `branchSettlements` with settlement request tracking

2. **Given** the new tables are defined
   **When** I run `npx convex dev`
   **Then** the schema deploys without errors
   **And** all tables are created in the database

3. **Given** currency fields are added
   **When** any amount is stored
   **Then** all amounts use integers representing whole pesos (500 = ₱500)

4. **Given** foreign key fields are added
   **When** referencing other tables
   **Then** all IDs use `v.id("tableName")` pattern (not strings)

5. **Given** query indexes are needed
   **When** I define the tables
   **Then** all indexes are declared in schema (by_branch, by_status, by_branch_status, by_settlement)

## Tasks / Subtasks

- [x] Task 1: Add `walletConfig` table (AC: #1)
  - [x] Define all fields with proper validators
  - [x] PayMongo keys as `v.string()` (will be encrypted at service layer)
  - [x] Commission percent as `v.number()` (integer percentage)
  - [x] Settlement frequency as `v.string()` (literal union)
  - [x] Timestamps as `v.number()` (unix ms)

- [x] Task 2: Add `branchWalletSettings` table (AC: #1, #4, #5)
  - [x] Define `branch_id` as `v.id("branches")`
  - [x] Define optional override fields
  - [x] Add `by_branch` index

- [x] Task 3: Add `branchWalletEarnings` table (AC: #1, #3, #4, #5)
  - [x] Define all foreign key fields with `v.id()`
  - [x] Define currency fields as integers
  - [x] Add 3 indexes: `by_branch`, `by_branch_status`, `by_settlement`

- [x] Task 4: Add `branchSettlements` table (AC: #1, #4, #5)
  - [x] Define all foreign key fields with `v.id()`
  - [x] Define status as `v.string()` (state machine handled at service layer)
  - [x] Add 3 indexes: `by_branch`, `by_status`, `by_branch_status`

- [x] Task 5: Validate schema deployment (AC: #2)
  - [x] Run `npx convex dev`
  - [x] Verify no deployment errors
  - [x] Confirm tables appear in Convex dashboard

## Dev Notes

### Architecture Compliance (MANDATORY)

**Source:** [architecture-multi-branch-wallet.md](../_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md#schema-additions-convexschemats)

The schema must be implemented EXACTLY as specified in the architecture document:

```typescript
// ADD TO convex/schema.ts - Do NOT modify existing tables

walletConfig: defineTable({
  paymongo_public_key: v.string(),
  paymongo_secret_key: v.string(),      // Encrypted at service layer
  paymongo_webhook_secret: v.string(),  // Encrypted at service layer
  is_test_mode: v.boolean(),
  default_commission_percent: v.number(),
  default_settlement_frequency: v.string(),
  min_settlement_amount: v.number(),
  created_at: v.number(),
  updated_at: v.number(),
}),

branchWalletSettings: defineTable({
  branch_id: v.id("branches"),
  commission_override: v.optional(v.number()),
  settlement_frequency: v.optional(v.string()),
  payout_method: v.string(),
  payout_account_number: v.string(),
  payout_account_name: v.string(),
  payout_bank_name: v.optional(v.string()),
  created_at: v.number(),
  updated_at: v.number(),
}).index("by_branch", ["branch_id"]),

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

branchSettlements: defineTable({
  branch_id: v.id("branches"),
  requested_by: v.id("users"),
  amount: v.number(),
  earnings_count: v.number(),
  payout_method: v.string(),
  payout_account_number: v.string(),
  payout_account_name: v.string(),
  payout_bank_name: v.optional(v.string()),
  status: v.string(),
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

### Project Context Rules (CRITICAL)

**Source:** [project-context.md](../_bmad-output/planning-artifacts/project-context.md)

**Data Types:**
- **Currency**: Always whole pesos as `v.number()` - NOT decimals (5000 = ₱5,000)
- **Dates**: Unix timestamps in milliseconds as `v.number()` - NOT ISO strings
- **IDs**: Use `v.id("tableName")` - never plain strings for foreign keys
- **Status**: Use `v.string()` - state machine validation at service layer

**Naming Conventions:**
| Element | Convention | Example |
|---------|------------|---------|
| Tables | camelCase | `branchWalletEarnings` |
| Fields | snake_case | `branch_id`, `created_at` |
| Indexes | by_fieldname | `by_branch`, `by_status` |
| Foreign keys | entity_id | `branch_id`, `customer_id` |

**Index Pattern:**
```typescript
// Always define index BEFORE using .withIndex()
defineTable({ ... })
  .index("by_branch", ["branch_id"])
  .index("by_status", ["status"])
  .index("by_branch_status", ["branch_id", "status"])
```

### File to Modify

| File | Action | Notes |
|------|--------|-------|
| `convex/schema.ts` | ADD 4 tables | Append after existing tables |

### Existing Tables Reference

**DO NOT modify or duplicate these existing tables:**
- `wallets` - Existing customer wallet balances
- `wallet_transactions` - Existing wallet transaction history
- `branches` - Branch master data
- `users` - User accounts
- `bookings` - Service bookings

The 4 new tables EXTEND the system, they don't replace existing ones:
- `walletConfig` - NEW: Super Admin PayMongo settings for multi-branch
- `branchWalletSettings` - NEW: Per-branch wallet configuration
- `branchWalletEarnings` - NEW: Branch ledger for wallet payments
- `branchSettlements` - NEW: Settlement request tracking

### Anti-Patterns to AVOID

- ❌ Using `v.string()` for IDs instead of `v.id("tableName")`
- ❌ Using floats for currency (e.g., `500.00`)
- ❌ Using ISO date strings instead of unix timestamps
- ❌ Forgetting to add indexes before queries use them
- ❌ Creating indexes that won't be used (waste of storage)
- ❌ Modifying existing tables instead of adding new ones

### Testing Verification

After schema changes:
1. Run `npx convex dev` - should deploy without errors
2. Check Convex dashboard - 4 new tables should appear
3. Verify indexes are created on each table
4. Note: No seed data needed - tables start empty

### Project Structure Notes

- **File location**: `convex/schema.ts` (existing file, append to it)
- **Import requirements**: Uses existing `defineTable`, `v` from `convex/server`
- **Export**: Tables are auto-exported when defined in schema

### References

- [Architecture Document - Schema Additions](../_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md#schema-additions-convexschemats)
- [Project Context - Data Types](../_bmad-output/planning-artifacts/project-context.md#data-types)
- [Project Context - Naming Conventions](../_bmad-output/planning-artifacts/project-context.md#naming-conventions)
- [Epics Document - Story 1.1](../_bmad-output/planning-artifacts/epics-multi-branch-wallet.md#story-11-add-wallet-schema-tables)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - clean implementation with no errors.

### Completion Notes List

1. **All 4 tables added** following exact architecture specification
2. **7 indexes created** as verified by Convex deployment output:
   - branchSettlements: by_branch, by_branch_status, by_status
   - branchWalletEarnings: by_branch, by_branch_status, by_settlement
   - branchWalletSettings: by_branch
3. **Schema deployed successfully** - `npx convex dev --once` completed without errors
4. **All naming conventions followed**: camelCase tables, snake_case fields
5. **Currency stored as integers** (whole pesos as per project context)
6. **All IDs use v.id()** pattern for proper foreign key references
7. **Inline documentation added** with section header comment for Epic 21-26

### File List

- [convex/schema.ts](convex/schema.ts) (modified - 4 new table definitions added at lines 2446-2518)
- [convex/_generated/api.d.ts](convex/_generated/api.d.ts) (auto-generated - TypeScript types updated by Convex after schema deployment)
