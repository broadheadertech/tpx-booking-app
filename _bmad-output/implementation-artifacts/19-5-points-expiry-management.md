# Story 19.5: Points Expiry Management

Status: ready-for-dev

## Story

As a **Super Admin**,
I want to configure and manage points expiry policies,
So that I can control when inactive points expire and maintain loyalty program health.

## Acceptance Criteria

1. **Given** I am logged in as Super Admin
   **When** I navigate to Loyalty > Points Configuration
   **Then** I see a "Points Expiry Settings" section

2. **Given** I want to configure expiry rules
   **When** I set the expiry period (e.g., 12 months of inactivity)
   **Then** the setting is saved to loyalty_config
   **And** points will expire after the configured period

3. **Given** I enable points expiry
   **When** the expiry job runs
   **Then** points from transactions older than expiry period are marked as expired
   **And** a points_transaction with type="expire" is created
   **And** the customer's balance is reduced accordingly

4. **Given** customers have points about to expire
   **When** they are within 30 days of expiry
   **Then** they can see an "expiring soon" warning in their points balance

5. **Given** I want to review expiry activity
   **When** I view the expiry dashboard
   **Then** I see: total points expired (period), upcoming expirations, customers affected

6. **Given** points expiry is disabled
   **When** the expiry period is set to 0 or "never"
   **Then** no points are automatically expired

## Tasks / Subtasks

- [ ] Task 1: Add expiry configuration to loyaltyConfig (AC: #1, #2)
  - [ ] 1.1 Add points_expiry_months config key
  - [ ] 1.2 Add points_expiry_enabled config key
  - [ ] 1.3 Add expiry_warning_days config key (default 30)

- [ ] Task 2: Create expiry mutations in points.ts (AC: #3)
  - [ ] 2.1 Create processPointsExpiry mutation
  - [ ] 2.2 Check last_activity_at against expiry period
  - [ ] 2.3 Create expire transactions for affected points
  - [ ] 2.4 Update ledger balance after expiry

- [ ] Task 3: Add expiry queries (AC: #4, #5)
  - [ ] 3.1 Create getExpiringPointsSummary query
  - [ ] 3.2 Create getUserExpiringPoints query for customer display
  - [ ] 3.3 Create getExpiryStats query for dashboard

- [ ] Task 4: Create PointsExpiryPanel component (AC: #1, #2, #5, #6)
  - [ ] 4.1 Create src/components/admin/PointsExpiryPanel.jsx
  - [ ] 4.2 Expiry period configuration form
  - [ ] 4.3 Enable/disable toggle
  - [ ] 4.4 Expiry stats display (upcoming, processed)

- [ ] Task 5: Add expiry warning to customer display (AC: #4)
  - [ ] 5.1 Update PointsBalanceDisplay to show expiring points
  - [ ] 5.2 Show warning badge if points expiring within 30 days

- [ ] Task 6: Integrate into PointsConfigPanel (AC: #1)
  - [ ] 6.1 Import and add PointsExpiryPanel component

- [ ] Task 7: Deploy and verify (AC: #1-6)
  - [ ] 7.1 Build passes successfully
  - [ ] 7.2 Configuration persists correctly
  - [ ] 7.3 Expiry processing works as expected

## Dev Notes

### Existing Schema Support

The points_transactions table already supports expiry:

```typescript
type: v.union(
  v.literal("earn"),
  v.literal("redeem"),
  v.literal("expire"),  // <-- Already defined
  v.literal("adjust")
),
source_type: v.union(
  v.literal("payment"),
  v.literal("wallet_payment"),
  v.literal("redemption"),
  v.literal("top_up_bonus"),
  v.literal("manual_adjustment"),
  v.literal("expiry")  // <-- Already defined
),
```

### Config Keys to Add

```typescript
// In loyaltyConfig.ts - seedDefaultConfigs
{
  key: 'points_expiry_enabled',
  value: 'false',
  description: 'Whether points automatically expire',
},
{
  key: 'points_expiry_months',
  value: '12',
  description: 'Months of inactivity before points expire',
},
{
  key: 'expiry_warning_days',
  value: '30',
  description: 'Days before expiry to show warning',
},
```

### Expiry Processing Pattern

```typescript
export const processPointsExpiry = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Get expiry config
    const enabled = await getConfig(ctx, 'points_expiry_enabled');
    if (enabled !== 'true') return { processed: 0 };

    const expiryMonths = parseInt(await getConfig(ctx, 'points_expiry_months') || '12');
    const cutoffDate = Date.now() - (expiryMonths * 30 * 24 * 60 * 60 * 1000);

    // 2. Find ledgers with last_activity_at before cutoff
    const inactiveLedgers = await ctx.db
      .query("points_ledger")
      .filter((q) =>
        q.and(
          q.lt(q.field("last_activity_at"), cutoffDate),
          q.gt(q.field("current_balance"), 0)
        )
      )
      .collect();

    // 3. Process each ledger - expire all points
    let processed = 0;
    for (const ledger of inactiveLedgers) {
      await expireUserPoints(ctx, ledger);
      processed++;
    }

    return { processed };
  },
});
```

### UI Pattern

Follow existing panel patterns:
- Dark theme (#1A1A1A, #2A2A2A)
- Card-based layout
- Toggle switches for enable/disable
- Number input for months
- Stats cards for metrics

### Previous Story Learnings

1. **×100 Format**: Points stored as integers ×100 (4575 = 45.75 pts)
2. **Real-time**: Use Convex subscriptions for live updates
3. **Audit**: All changes logged with timestamp
4. **UI**: Dark theme, consistent with PointsConfigPanel style

### File Structure

```
src/components/admin/
├── PointsConfigPanel.jsx (MODIFY - integrate)
└── PointsExpiryPanel.jsx (NEW)

convex/services/
├── points.ts (MODIFY - add expiry mutations)
└── loyaltyConfig.ts (MODIFY - add default configs)
```

### References

- [Source: convex/schema.ts:1125-1140] - points_transactions type/source_type
- [Source: convex/services/points.ts] - Points service patterns
- [Source: convex/services/loyaltyConfig.ts] - Config patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- [ ] convex/services/loyaltyConfig.ts (MODIFY) - Add expiry config keys
- [ ] convex/services/points.ts (MODIFY) - Add expiry mutations/queries
- [ ] src/components/admin/PointsExpiryPanel.jsx (CREATE) - Admin UI
- [ ] src/components/admin/PointsConfigPanel.jsx (MODIFY) - Integrate
- [ ] src/components/common/PointsBalanceDisplay.jsx (MODIFY) - Add expiry warning
