# Story 19.1: Points Configuration Panel

Status: done

## Story

As a **Super Admin**,
I want to configure point earning rates and wallet bonus multipliers,
So that I can adjust the loyalty program economics dynamically.

## Acceptance Criteria

1. **Given** I am logged in as Super Admin
   **When** I navigate to Loyalty Configuration > Points
   **Then** I see the current base earning rate (default 1:1)
   **And** I can modify the rate

2. **Given** I change the base rate from 1:1 to 1.5:1
   **When** I save the configuration
   **Then** all future payments earn 1.5 points per peso
   **And** existing points are unaffected

3. **Given** I configure the wallet bonus multiplier
   **When** I change from 1.5x to 2x
   **Then** future wallet payments earn 2x points instead of 1.5x
   **And** the change is logged with timestamp and admin ID

4. **Given** I make a configuration change
   **When** the change is saved
   **Then** it's stored in the loyalty_config table
   **And** all services fetch the latest config dynamically via getConfig()

5. **Given** I want to preview impact
   **When** I change a rate
   **Then** I see a preview: "A ₱500 payment will now earn X points (was Y)"
   **And** I must confirm before the change takes effect

## Tasks / Subtasks

- [x] Task 1: Create loyalty_config schema (AC: #4)
  - [x] 1.1 Add loyalty_config table to schema.ts
  - [x] 1.2 Fields: config_key, config_value, config_type, description, updated_at, updated_by
  - [x] 1.3 Add index by_key for config lookups
  - [x] 1.4 Also added loyalty_config_audit table for change history
  - [x] 1.5 Run `npx convex dev --once` to deploy schema

- [x] Task 2: Create loyaltyConfig service (AC: #1, #2, #3, #4)
  - [x] 2.1 Create convex/services/loyaltyConfig.ts
  - [x] 2.2 Add getConfig query for fetching single config value (with type parsing)
  - [x] 2.3 Add getAllConfigs query for admin panel display (merged with defaults)
  - [x] 2.4 Add setConfig mutation with audit logging
  - [x] 2.5 Add seedDefaultConfigs mutation for initial values
  - [x] 2.6 Add getConfigAuditHistory query for audit trail
  - [x] 2.7 Export from convex/services/index.ts

- [x] Task 3: Seed default configuration values (AC: #1)
  - [x] 3.1 Base earning rate: 1.0 (1:1 ratio)
  - [x] 3.2 Wallet bonus multiplier: 1.5 (1.5x points for wallet payments)
  - [x] 3.3 Top-up bonus tiers: [{amount: 500, bonus: 50}, {amount: 1000, bonus: 150}]
  - [x] 3.4 Points enabled toggle: true
  - [x] 3.5 Min redemption points: 10000 (100 pts in ×100 format)

- [x] Task 4: Update transactions.ts to use dynamic config (AC: #2, #3)
  - [x] 4.1 Import loyaltyConfig via api.services
  - [x] 4.2 Replace hardcoded WALLET_POINTS_MULTIPLIER with dynamic config
  - [x] 4.3 Add BASE_EARNING_RATE for cash/card payments
  - [x] 4.4 Add points_enabled check to disable system if needed
  - [x] 4.5 Update notes messages to show actual rates used

- [x] Task 5: Create PointsConfigPanel component (AC: #1, #5)
  - [x] 5.1 Create src/components/admin/PointsConfigPanel.jsx
  - [x] 5.2 Display current rates with edit inputs
  - [x] 5.3 Add preview calculation showing sample ₱500 payment
  - [x] 5.4 Add "Save All Changes" button
  - [x] 5.5 Show audit history modal for each config
  - [x] 5.6 Top-up bonus tier management UI (add/edit/remove)

- [x] Task 6: Add to Super Admin navigation (AC: #1)
  - [x] 6.1 Add "Loyalty" tab to admin dashboard tabs
  - [x] 6.2 Add renderTabContent case for 'loyalty'
  - [x] 6.3 Protect with Super Admin role check

- [x] Task 7: Deploy and verify (AC: #1-5)
  - [x] 7.1 Build passes successfully (11.69s)
  - [x] 7.2 Convex functions deployed successfully
  - [x] 7.3 Dynamic config integrated into transactions.ts

## Dev Notes

### Architecture Pattern: Config Table

The loyalty system uses a config table pattern for dynamic values:

```typescript
// Schema
loyalty_config: defineTable({
  config_key: v.string(),     // e.g., "base_earning_rate", "wallet_bonus_multiplier"
  config_value: v.string(),   // JSON-encoded value
  config_type: v.union(
    v.literal("number"),
    v.literal("boolean"),
    v.literal("json")
  ),
  description: v.string(),
  updated_at: v.number(),
  updated_by: v.optional(v.id("users")),
}).index("by_key", ["config_key"])
```

### Service Pattern: getConfig Helper

```typescript
// In loyaltyConfig.ts
export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("loyalty_config")
      .withIndex("by_key", q => q.eq("config_key", args.key))
      .unique();

    if (!config) return null;

    // Parse based on type
    switch (config.config_type) {
      case "number": return parseFloat(config.config_value);
      case "boolean": return config.config_value === "true";
      case "json": return JSON.parse(config.config_value);
      default: return config.config_value;
    }
  }
});
```

### Default Configuration Values

| Config Key | Type | Default Value | Description |
|------------|------|---------------|-------------|
| base_earning_rate | number | 1.0 | Points per peso (1:1 default) |
| wallet_bonus_multiplier | number | 1.5 | Multiplier for wallet payments |
| top_up_bonuses | json | [{amount: 500, bonus: 50}, {amount: 1000, bonus: 150}] | Top-up tier bonuses |
| points_enabled | boolean | true | Master toggle for points system |

### UI Component Location

Place in `/src/components/admin/PointsConfigPanel.jsx`

Follow existing admin panel patterns:
- Dark theme (#1A1A1A background, #2A2A2A borders)
- Primary color: var(--color-primary)
- Card-based layout with section headers
- Input validation with inline errors

### Integration with points.ts

In earnPoints mutation, replace hardcoded values:

```typescript
// BEFORE (hardcoded)
const baseRate = 1.0;
const walletMultiplier = 1.5;

// AFTER (dynamic)
const baseRate = await ctx.runQuery(api.services.loyaltyConfig.getConfig,
  { key: "base_earning_rate" }) || 1.0;
const walletMultiplier = await ctx.runQuery(api.services.loyaltyConfig.getConfig,
  { key: "wallet_bonus_multiplier" }) || 1.5;
```

### Audit Logging

Every config change should record:
- `updated_at`: Unix timestamp
- `updated_by`: User ID of admin making change
- Consider adding a `loyalty_config_audit` table for history

### Previous Story Patterns

From Epic 17-18 implementation:
- Tier config uses DEFAULT_TIERS constant in tiers.ts
- Points use integer ×100 storage (500000 = 5000 pts)
- Real-time updates via Convex subscriptions

### Project Structure Notes

- Service: `convex/services/loyaltyConfig.ts` (NEW)
- Schema update: `convex/schema.ts` (add loyalty_config table)
- Component: `src/components/admin/PointsConfigPanel.jsx` (NEW)
- Route: Add to admin routes in App.jsx

### References

- [Source: epics-customer-experience.md#Story 5.6]
- [Source: convex/services/points.ts] - Points earning logic
- [Source: convex/services/tiers.ts] - Config pattern reference
- [Source: convex/schema.ts:1110-1188] - Points schema

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Schema deployed successfully (6.19s)
- `npx convex dev --once` - Functions deployed successfully (6.39s)
- `npm run build` - Build completed successfully in 11.69s

### Completion Notes List

1. Created `loyalty_config` and `loyalty_config_audit` tables in schema.ts:
   - config_key, config_value, config_type, description, updated_at, updated_by
   - Index by_key for fast lookups
   - Audit table tracks all changes with old/new values

2. Created `convex/services/loyaltyConfig.ts` with:
   - DEFAULT_CONFIGS array with 5 default config values
   - getConfig query (parses value based on type)
   - getAllConfigs query (merges DB with defaults)
   - setConfig mutation (with audit logging)
   - seedDefaultConfigs mutation
   - getConfigAuditHistory query

3. Updated `convex/services/transactions.ts`:
   - Replaced hardcoded WALLET_POINTS_MULTIPLIER with dynamic config
   - Added BASE_EARNING_RATE for cash/card payments
   - Added points_enabled check to disable system
   - Updated notes messages to show actual rates

4. Created `src/components/admin/PointsConfigPanel.jsx`:
   - Card-based UI with dark theme styling
   - Preview card showing ₱500 payment breakdown
   - Point earning rates configuration
   - Top-up bonus tiers management (add/edit/remove)
   - Audit history modal per config
   - Save All Changes button

5. Updated `src/pages/admin/Dashboard.jsx`:
   - Added PointsConfigPanel import
   - Added 'loyalty' tab for super admins
   - Added renderTabContent case for loyalty

### File List

- [x] convex/schema.ts (MODIFY) - Add loyalty_config and loyalty_config_audit tables
- [x] convex/services/loyaltyConfig.ts (CREATE) - Config service with queries/mutations
- [x] convex/services/index.ts (MODIFY) - Export loyaltyConfig
- [x] convex/services/transactions.ts (MODIFY) - Use dynamic config for points
- [x] src/components/admin/PointsConfigPanel.jsx (CREATE) - Admin UI panel
- [x] src/pages/admin/Dashboard.jsx (MODIFY) - Add Loyalty tab
