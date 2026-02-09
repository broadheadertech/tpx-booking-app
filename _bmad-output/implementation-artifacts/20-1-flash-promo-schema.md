# Story 20.1: Flash Promo Schema

Status: ready-for-dev

## Story

As a **developer**,
I want to create the database schema for flash promotions,
So that we have a foundation for time-limited promotional events.

## Acceptance Criteria

1. **Given** the Convex schema file exists
   **When** I add the flash_promotions table
   **Then** it supports: name, type, multiplier, dates, branch_id, eligibility rules, status

2. **Given** the flash_promotions table exists
   **When** I add the promo_usage table for tracking
   **Then** it tracks which customers have used which promos

3. **Given** both tables are defined
   **When** I run `npx convex dev`
   **Then** schema deploys without errors

4. **Given** I create a new promotion
   **When** I specify the promo type
   **Then** I can choose: bonus_points (multiplier), flat_bonus, wallet_bonus

5. **Given** I create a branch-scoped promotion
   **When** I set the branch_id
   **Then** the promo only applies to that branch

6. **Given** I need to query active promotions
   **When** I use the indexes
   **Then** I can efficiently query by branch, status, and date range

## Tasks / Subtasks

- [ ] Task 1: Add flash_promotions table to schema (AC: #1, #4, #5, #6)
  - [ ] 1.1 Define table fields (name, description, type, multiplier, etc.)
  - [ ] 1.2 Add eligibility fields (tier_requirement, min_purchase, etc.)
  - [ ] 1.3 Add date/status fields (start_at, end_at, status)
  - [ ] 1.4 Add branch_id for branch-scoped promos
  - [ ] 1.5 Add indexes for efficient querying

- [ ] Task 2: Add promo_usage tracking table (AC: #2)
  - [ ] 2.1 Track user_id, promo_id, used_at
  - [ ] 2.2 Add transaction_id reference
  - [ ] 2.3 Add indexes for lookups

- [ ] Task 3: Create promotions service (AC: #3)
  - [ ] 3.1 Create convex/services/promotions.ts
  - [ ] 3.2 Add basic CRUD queries/mutations
  - [ ] 3.3 Add getActivePromotions query
  - [ ] 3.4 Export from services/index.ts

- [ ] Task 4: Deploy and verify (AC: #3)
  - [ ] 4.1 Run npx convex dev to verify schema
  - [ ] 4.2 Build passes successfully

## Dev Notes

### Schema Design

```typescript
// Flash Promotions Table
flash_promotions: defineTable({
  // Basic Info
  name: v.string(),
  description: v.optional(v.string()),

  // Promo Type and Value
  type: v.union(
    v.literal("bonus_points"),    // Multiplier on points (e.g., 2x)
    v.literal("flat_bonus"),      // Flat points added (e.g., +500)
    v.literal("wallet_bonus")     // Extra wallet credit on top-up
  ),
  multiplier: v.optional(v.number()),    // For bonus_points type (e.g., 2.0 = 2x)
  flat_amount: v.optional(v.number()),   // For flat_bonus/wallet_bonus (×100 format)

  // Scope
  branch_id: v.optional(v.id("branches")), // null = system-wide

  // Eligibility Rules
  eligibility: v.object({
    tier_requirement: v.optional(v.union(
      v.literal("bronze"),
      v.literal("silver"),
      v.literal("gold"),
      v.literal("platinum")
    )), // Minimum tier required (null = all)
    min_purchase: v.optional(v.number()), // Minimum purchase amount
    new_customers_only: v.optional(v.boolean()),
    max_uses: v.optional(v.number()),      // Total uses allowed
    max_uses_per_user: v.optional(v.number()), // Per-user limit
  }),

  // Dates
  start_at: v.number(),
  end_at: v.number(),

  // Status
  status: v.union(
    v.literal("draft"),
    v.literal("scheduled"),
    v.literal("active"),
    v.literal("ended"),
    v.literal("cancelled")
  ),

  // Usage Tracking
  total_uses: v.number(),           // Counter for total uses

  // Audit
  created_by: v.id("users"),
  created_at: v.number(),
  updated_at: v.number(),
})
  .index("by_branch", ["branch_id"])
  .index("by_status", ["status"])
  .index("by_dates", ["start_at", "end_at"])
  .index("by_branch_status", ["branch_id", "status"])

// Promo Usage Tracking
promo_usage: defineTable({
  promo_id: v.id("flash_promotions"),
  user_id: v.id("users"),
  transaction_id: v.optional(v.string()), // Payment or transaction ID
  points_earned: v.number(),              // Total points with promo
  bonus_points: v.number(),               // Extra points from promo
  used_at: v.number(),
})
  .index("by_promo", ["promo_id"])
  .index("by_user", ["user_id"])
  .index("by_promo_user", ["promo_id", "user_id"])
```

### Promo Type Examples

1. **bonus_points** (2x multiplier):
   - Normal: 500 pts from ₱500 payment
   - With promo: 1000 pts (2x)

2. **flat_bonus** (+100 bonus):
   - Normal: 500 pts from ₱500 payment
   - With promo: 600 pts (+100 bonus)

3. **wallet_bonus** (extra top-up):
   - Normal: ₱500 top-up → ₱550 (standard bonus)
   - With promo: ₱500 top-up → ₱600 (+₱50 promo bonus)

### File Structure

```
convex/
├── schema.ts (MODIFY - add tables)
└── services/
    ├── index.ts (MODIFY - add export)
    └── promotions.ts (NEW - promo service)
```

### References

- [Source: _bmad-output/planning-artifacts/epics-customer-experience.md] - Epic 6 stories
- [Source: convex/schema.ts] - Existing schema patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- [ ] convex/schema.ts (MODIFY) - Add flash_promotions and promo_usage tables
- [ ] convex/services/promotions.ts (CREATE) - Promotions service
- [ ] convex/services/index.ts (MODIFY) - Export promotions
