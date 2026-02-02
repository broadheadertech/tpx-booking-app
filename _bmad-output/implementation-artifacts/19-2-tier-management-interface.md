# Story 19.2: Tier Management Interface

Status: done

## Story

As a **Super Admin**,
I want to configure tier thresholds and benefits,
So that I can adjust the VIP program structure dynamically.

## Acceptance Criteria

1. **Given** I am logged in as Super Admin
   **When** I navigate to Loyalty Configuration > Tiers
   **Then** I see all tiers with their thresholds and benefits
   **And** I can edit thresholds and benefits

2. **Given** I change Silver threshold from 5000 to 4000 points
   **When** I save the configuration
   **Then** customers with 4000+ lifetime points are now Silver
   **And** auto-promotion runs to upgrade eligible customers

3. **Given** I add a new benefit to Gold tier
   **When** I save the benefit (e.g., "Free monthly product sample")
   **Then** the benefit appears in Gold tier benefit list
   **And** Gold customers see the new benefit on their status page

4. **Given** I want to add a new tier (e.g., "Diamond" at 100000 points)
   **When** I create the new tier
   **Then** it's added to the tiers table with proper ordering
   **And** I can configure its benefits separately

5. **Given** I lower a tier threshold
   **When** saving could promote many customers
   **Then** I see a warning: "This will promote X customers to Y tier"
   **And** I must confirm the mass promotion

## Tasks / Subtasks

- [x] Task 1: Add tier management mutations to tiers.ts (AC: #1, #2, #3, #4)
  - [x] 1.1 Add updateTier mutation (threshold, name, icon, color)
  - [x] 1.2 Add createTier mutation for new tiers
  - [x] 1.3 Add deleteTier mutation (with safeguards)
  - [x] 1.4 Add addTierBenefit mutation
  - [x] 1.5 Add updateTierBenefit mutation
  - [x] 1.6 Add removeTierBenefit mutation

- [x] Task 2: Add tier promotion queries (AC: #2, #5)
  - [x] 2.1 Add countCustomersEligibleForPromotion query (countEligibleForPromotion)
  - [x] 2.2 Add promoteEligibleCustomers mutation (promoteAllEligible)
  - [x] 2.3 Return promotion preview with affected count

- [x] Task 3: Create TierManagementPanel component (AC: #1)
  - [x] 3.1 Create src/components/admin/TierManagementPanel.jsx
  - [x] 3.2 Display all tiers in cards with edit buttons
  - [x] 3.3 Show benefits list for each tier
  - [x] 3.4 Add inline editing for thresholds

- [x] Task 4: Create TierEditModal component (AC: #1, #3, #4)
  - [x] 4.1 Create modal for tier details editing (inline in TierManagementPanel)
  - [x] 4.2 Threshold input with ×100 format helper
  - [x] 4.3 Icon/color picker (emoji input + hex color picker)
  - [x] 4.4 Benefits management (add/edit/remove)

- [x] Task 5: Add promotion confirmation dialog (AC: #5)
  - [x] 5.1 Show affected customer count when threshold lowered
  - [x] 5.2 Require explicit confirmation
  - [x] 5.3 Execute batch promotion on confirm

- [x] Task 6: Integrate into Loyalty tab (AC: #1)
  - [x] 6.1 Add TierManagementPanel as sub-section in PointsConfigPanel
  - [x] 6.2 Sectioned layout with "Tier Management" header

- [x] Task 7: Deploy and verify (AC: #1-5)
  - [x] 7.1 Build passes successfully (12.00s)
  - [x] 7.2 Tier updates persist correctly
  - [x] 7.3 Promotions work as expected

## Dev Notes

### Existing Tier Schema (from schema.ts)

```typescript
// Tiers table (already exists)
tiers: defineTable({
  name: v.string(), // "Bronze", "Silver", "Gold", "Platinum"
  threshold: v.number(), // Minimum lifetime_earned (×100 format): 0, 500000, 1500000, 5000000
  display_order: v.number(), // 1, 2, 3, 4 for sorting
  icon: v.string(), // Emoji or icon identifier
  color: v.string(), // Hex color for badge display
  is_active: v.optional(v.boolean()),
  created_at: v.number(),
  updated_at: v.number(),
})

// Tier Benefits table (already exists)
tier_benefits: defineTable({
  tier_id: v.id("tiers"),
  benefit_type: v.union(
    v.literal("points_multiplier"),
    v.literal("priority_booking"),
    v.literal("free_service"),
    v.literal("discount"),
    v.literal("early_access"),
    v.literal("vip_line"),
    v.literal("exclusive_event")
  ),
  benefit_value: v.number(),
  description: v.string(),
  is_active: v.optional(v.boolean()),
  created_at: v.number(),
})
```

### Existing Constants (from tiers.ts)

```typescript
export const DEFAULT_TIERS = [
  { name: "Bronze", threshold: 0, display_order: 1, icon: "🥉", color: "#CD7F32" },
  { name: "Silver", threshold: 500000, display_order: 2, icon: "🥈", color: "#C0C0C0" },
  { name: "Gold", threshold: 1500000, display_order: 3, icon: "🥇", color: "#FFD700" },
  { name: "Platinum", threshold: 5000000, display_order: 4, icon: "💎", color: "#E5E4E2" },
];
```

### Threshold Format

- **×100 integer storage**: 5000 points = 500000 stored value
- **Display conversion**: `displayPoints = threshold / 100`
- **Input conversion**: `storageValue = inputPoints * 100`

### New Mutations Required

```typescript
// Update tier threshold/details
export const updateTier = mutation({
  args: {
    tierId: v.id("tiers"),
    name: v.optional(v.string()),
    threshold: v.optional(v.number()), // ×100 format
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    display_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => { /* ... */ }
});

// Create new tier
export const createTier = mutation({
  args: {
    name: v.string(),
    threshold: v.number(),
    display_order: v.number(),
    icon: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => { /* ... */ }
});

// Add benefit to tier
export const addTierBenefit = mutation({
  args: {
    tierId: v.id("tiers"),
    benefit_type: v.string(),
    benefit_value: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => { /* ... */ }
});
```

### Promotion Logic

When threshold is lowered, run batch promotion:

```typescript
export const promoteEligibleCustomers = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // 1. Get all points_ledger entries
    // 2. For each user, calculate their correct tier
    // 3. If dryRun, return count only
    // 4. If not dryRun, update all users
    // 5. Return { promoted: number, details: [...] }
  }
});
```

### UI Component Pattern

Follow the existing PointsConfigPanel pattern:
- Dark theme styling (#1A1A1A, #2A2A2A)
- Card-based layout per tier
- Inline editing with save buttons
- Modal for detailed editing

### Previous Story Reference

From Story 19.1 (PointsConfigPanel):
- Config service pattern for dynamic values
- Audit logging for changes
- Real-time updates via Convex subscriptions
- Save confirmation pattern

### File Structure

```
src/components/admin/
├── PointsConfigPanel.jsx (existing - Story 19.1)
└── TierManagementPanel.jsx (NEW)

convex/services/
├── tiers.ts (MODIFY - add mutations)
└── loyaltyConfig.ts (existing)
```

### Integration Notes

Option A: Add TierManagementPanel as section in PointsConfigPanel
Option B: Create separate tabs (Points | Tiers) within Loyalty tab

Recommend Option A for cohesive loyalty management experience.

### References

- [Source: epics-customer-experience.md#Story 5.7]
- [Source: convex/services/tiers.ts] - Existing tier service
- [Source: convex/schema.ts:1155-1188] - Tier schema
- [Source: src/components/admin/PointsConfigPanel.jsx] - UI pattern reference

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npm run build` - Build completed successfully in 12.00s

### Completion Notes List

1. Added tier management mutations to `convex/services/tiers.ts`:
   - `updateTier` - Update threshold, name, icon, color with validation
   - `createTier` - Create new tier with proper display_order
   - `deleteTier` - Soft delete with safeguards (prevents deleting base Bronze tier)
   - `addTierBenefit` - Add new benefit to a tier
   - `updateTierBenefit` - Modify existing benefit
   - `removeTierBenefit` - Remove benefit from tier

2. Added promotion queries to `convex/services/tiers.ts`:
   - `countEligibleForPromotion` - Returns count of customers eligible for promotion when threshold changes
   - `promoteAllEligible` - Batch updates all customers to their correct tier based on lifetime_earned
   - `getAllTiersWithBenefits` - Query that returns all tiers with their associated benefits

3. Created `src/components/admin/TierManagementPanel.jsx`:
   - Card-based layout displaying all tiers with thresholds and benefits
   - Edit tier modal with ×100 format conversion helper
   - Create new tier modal with validation
   - Benefits management UI (add/edit/remove benefits)
   - Promotion confirmation dialog showing affected customer count
   - Dark theme styling matching PointsConfigPanel (#1A1A1A, #2A2A2A)

4. Integrated into PointsConfigPanel:
   - Added TierManagementPanel as sub-section under "Tier Management" header
   - Cohesive loyalty management experience with Points and Tiers together

### File List

- [x] convex/services/tiers.ts (MODIFY) - Added 9 new mutations/queries for tier management
- [x] src/components/admin/TierManagementPanel.jsx (CREATE) - Complete admin UI with modals
- [x] src/components/admin/PointsConfigPanel.jsx (MODIFY) - Integrated TierManagementPanel
