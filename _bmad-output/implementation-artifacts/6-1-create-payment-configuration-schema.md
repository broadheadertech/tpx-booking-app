# Story 6.1: Create Payment Configuration Schema

Status: done

## Story

As a **system administrator**,
I want **the database schema for branch payment configuration to be created**,
so that **branch-specific PayMongo credentials and settings can be securely stored**.

## Acceptance Criteria

1. **Given** the Convex schema needs to support PayMongo configuration
   **When** I add the `branchPaymentConfig` table to schema.ts
   **Then** the table includes all required fields with proper types

2. **Given** the table schema is defined
   **When** I run `npx convex dev`
   **Then** the schema deploys without errors

3. **Given** the table exists
   **When** I query with `by_branch` index
   **Then** I can efficiently find config by branch_id

## Tasks / Subtasks

- [x] Task 1: Add `branchPaymentConfig` table to schema.ts (AC: #1)
  - [x] 1.1 Define table with all required fields
  - [x] 1.2 Add `by_branch` index
  - [x] 1.3 Verify field types match architecture spec
- [x] Task 2: Deploy schema changes (AC: #2)
  - [x] 2.1 Run `npx convex dev`
  - [x] 2.2 Verify no errors in console
  - [x] 2.3 Confirm table visible in Convex dashboard
- [x] Task 3: Validate index functionality (AC: #3)
  - [x] 3.1 Index `by_branch` added and deployed
  - [x] 3.2 Schema validation complete - ready for queries

## Dev Notes

### Schema Definition (from architecture-paymongo.md)

Add this table definition to `convex/schema.ts` after the existing tables:

```typescript
// ============================================================================
// PAYMONGO PAYMENT INTEGRATION
// ============================================================================
// Branch-level PayMongo payment configuration with encrypted credentials
// ============================================================================

branchPaymentConfig: defineTable({
  branch_id: v.id("branches"),
  provider: v.literal("paymongo"),            // Future-proof for other providers
  is_enabled: v.boolean(),

  // Encrypted credentials (AES-256-GCM)
  public_key_encrypted: v.string(),           // pk_live_xxx (encrypted)
  secret_key_encrypted: v.string(),           // sk_live_xxx (encrypted)
  webhook_secret_encrypted: v.string(),       // whsec_xxx (encrypted)
  encryption_iv: v.string(),                  // IV for decryption

  // Payment option toggles
  pay_now_enabled: v.boolean(),               // Toggle for Pay Now (full payment via PayMongo)
  pay_later_enabled: v.boolean(),             // Toggle for Pay Later (convenience fee now)
  pay_at_shop_enabled: v.boolean(),           // Toggle for Pay at Shop (no online payment)

  // Payment policies
  convenience_fee_percent: v.number(),        // Fee for Pay Later (e.g., 5 = 5%)

  // Timestamps
  created_at: v.number(),
  updated_at: v.number(),
  updated_by: v.id("users"),
})
  .index("by_branch", ["branch_id"]),
```

### Insertion Point

Insert the new table definition after the `cashAdvances` table (around line 1947) and before the closing `});` of the schema.

### Field Type Requirements

| Field | Type | Purpose |
|-------|------|---------|
| `branch_id` | `v.id("branches")` | Foreign key to branches table |
| `provider` | `v.literal("paymongo")` | Locked to "paymongo" for MVP |
| `is_enabled` | `v.boolean()` | Master toggle for payment gateway |
| `public_key_encrypted` | `v.string()` | AES-256-GCM encrypted pk_live_xxx |
| `secret_key_encrypted` | `v.string()` | AES-256-GCM encrypted sk_live_xxx |
| `webhook_secret_encrypted` | `v.string()` | AES-256-GCM encrypted whsec_xxx |
| `encryption_iv` | `v.string()` | Random 16-byte IV for decryption |
| `pay_now_enabled` | `v.boolean()` | Allow full payment via PayMongo |
| `pay_later_enabled` | `v.boolean()` | Allow convenience fee payment |
| `pay_at_shop_enabled` | `v.boolean()` | Allow pay at branch option |
| `convenience_fee_percent` | `v.number()` | Whole number percentage (5 = 5%) |
| `created_at` | `v.number()` | Unix timestamp in milliseconds |
| `updated_at` | `v.number()` | Unix timestamp in milliseconds |
| `updated_by` | `v.id("users")` | Admin who last modified config |

### Project Structure Notes

**File to modify:** `convex/schema.ts`

This is a schema-only story. No new files are created - only the existing schema.ts is extended.

**Alignment with project-context.md:**
- Table name: `branchPaymentConfig` (camelCase) ✅
- Field names: snake_case (`branch_id`, `created_at`) ✅
- Index name: `by_branch` (by_fieldname pattern) ✅
- Foreign keys: `v.id("tableName")` pattern ✅
- Timestamps: `v.number()` for Unix milliseconds ✅
- Currency: whole pesos as `v.number()` ✅

### Critical Implementation Rules

1. **DO NOT** create plaintext fields for API keys - always use `_encrypted` suffix
2. **DO NOT** use `v.string()` for foreign keys - use `v.id("tableName")`
3. **DO NOT** use `v.optional()` for required fields
4. **DO** use `v.literal("paymongo")` not `v.string()` for provider
5. **DO** run `npx convex dev` after schema changes

### References

- [Source: architecture-paymongo.md#data-architecture] - Schema definition
- [Source: architecture-paymongo.md#payMongo-specific-naming-patterns] - Field naming conventions
- [Source: project-context.md#naming-conventions] - Table/field naming rules
- [Source: prd-paymongo.md#FR23] - Encrypted API key storage requirement

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None - clean deployment_

### Completion Notes List

1. Added `branchPaymentConfig` table after `cashAdvances` table (line 1949-1980)
2. All 14 fields defined as per architecture-paymongo.md specification
3. Index `by_branch` created successfully
4. Schema version updated to 2026-01-27v1
5. Deployment successful with no errors

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Added branchPaymentConfig table to schema.ts |
| 2026-01-27 | Deployed | Schema pushed successfully via `npx convex dev` |
| 2026-01-27 | Verified | Index by_branch confirmed in deployment output |

### File List

- `convex/schema.ts` (modified - lines 1949-1980)
