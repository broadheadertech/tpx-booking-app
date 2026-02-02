# Story 19.4: Manual Points Adjustment

Status: ready-for-dev

## Story

As a **Super Admin**,
I want to manually adjust customer points balances,
So that I can handle exceptions, corrections, and special cases.

## Acceptance Criteria

1. **Given** I am logged in as Super Admin
   **When** I navigate to Loyalty > Points Management
   **Then** I see a "Manual Adjustment" section with customer search

2. **Given** I want to adjust a customer's points
   **When** I search for a customer by name, email, or phone
   **Then** I see matching customers with their current points balance
   **And** I can select a customer to adjust

3. **Given** I select a customer for adjustment
   **When** I enter adjustment details
   **Then** I can specify: adjustment type (add/deduct), amount, reason
   **And** I must provide a reason before submitting

4. **Given** I submit a points adjustment
   **When** the adjustment is processed
   **Then** the customer's points_ledger is updated
   **And** a points_transaction is created with type="adjust"
   **And** the adjustment is logged with admin ID, timestamp, and reason

5. **Given** I deduct points from a customer
   **When** the deduction exceeds their current balance
   **Then** I see a warning about negative balance
   **And** I can choose to proceed (balance goes negative) or cancel

6. **Given** an adjustment is completed
   **When** I view the confirmation
   **Then** I see old balance, adjustment amount, new balance
   **And** the customer receives a notification about the adjustment

## Tasks / Subtasks

- [ ] Task 1: Add adjustPoints mutation to points.ts (AC: #3, #4, #5)
  - [ ] 1.1 Create adjustPoints mutation with validation
  - [ ] 1.2 Support positive (add) and negative (deduct) amounts
  - [ ] 1.3 Add reason as required field
  - [ ] 1.4 Handle negative balance scenario with option to allow
  - [ ] 1.5 Return old/new balance for confirmation

- [ ] Task 2: Add customer search query (AC: #2)
  - [ ] 2.1 Create searchCustomersForAdjustment query in points.ts
  - [ ] 2.2 Search by name, email, or phone
  - [ ] 2.3 Include current points balance in results

- [ ] Task 3: Create ManualPointsAdjustment component (AC: #1, #2, #3)
  - [ ] 3.1 Create src/components/admin/ManualPointsAdjustment.jsx
  - [ ] 3.2 Customer search input with debounced search
  - [ ] 3.3 Results list showing customer info and balance
  - [ ] 3.4 Adjustment form: type toggle, amount, reason textarea

- [ ] Task 4: Add confirmation and feedback (AC: #4, #5, #6)
  - [ ] 4.1 Show balance preview before confirming
  - [ ] 4.2 Warning dialog for negative balance
  - [ ] 4.3 Success message with old/new balance display
  - [ ] 4.4 Adjustment history view (recent adjustments)

- [ ] Task 5: Integrate into Loyalty tab (AC: #1)
  - [ ] 5.1 Add ManualPointsAdjustment to PointsConfigPanel
  - [ ] 5.2 Super Admin only access

- [ ] Task 6: Deploy and verify (AC: #1-6)
  - [ ] 6.1 Build passes successfully
  - [ ] 6.2 Adjustments persist correctly
  - [ ] 6.3 Audit trail works as expected

## Dev Notes

### Existing Schema Support

The points_transactions table already supports adjustments:

```typescript
points_transactions: defineTable({
  user_id: v.id("users"),
  branch_id: v.optional(v.id("branches")),
  type: v.union(
    v.literal("earn"),
    v.literal("redeem"),
    v.literal("expire"),
    v.literal("adjust")  // <-- Already defined
  ),
  amount: v.number(), // Can be positive or negative
  balance_after: v.number(),
  source_type: v.union(
    v.literal("payment"),
    v.literal("wallet_payment"),
    v.literal("redemption"),
    v.literal("top_up_bonus"),
    v.literal("manual_adjustment"),  // <-- Already defined
    v.literal("expiry")
  ),
  source_id: v.optional(v.string()),
  notes: v.optional(v.string()),  // Use for adjustment reason
  created_at: v.number(),
})
```

### Mutation Pattern

```typescript
export const adjustPoints = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // Positive to add, negative to deduct
    reason: v.string(),
    allowNegativeBalance: v.optional(v.boolean()),
    adjustedBy: v.id("users"), // Admin performing the adjustment
  },
  handler: async (ctx, args) => {
    // 1. Get user's ledger
    // 2. Calculate new balance
    // 3. Check for negative balance if deducting
    // 4. Update ledger
    // 5. Create transaction record with type="adjust"
    // 6. Return result with old/new balance
  },
});
```

### Customer Search Pattern

```typescript
export const searchCustomersForAdjustment = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    // Search users by name, email, or phone
    // Join with points_ledger for balance
    // Return: { userId, name, email, phone, currentBalance }
  },
});
```

### UI Component Pattern

Follow existing PointsConfigPanel patterns:
- Dark theme styling (#1A1A1A, #2A2A2A)
- Card-based layout
- Form validation with inline errors
- Confirmation modal before submit

### Previous Story Learnings (from 19.1, 19.2, 19.3)

1. **×100 Format**: Points stored as integers ×100 (4575 = 45.75 pts)
2. **Real-time**: Use Convex subscriptions for live updates
3. **Audit**: All changes should be logged with timestamp and user
4. **UI**: Dark theme with #1A1A1A background, #2A2A2A borders

### File Structure

```
src/components/admin/
├── PointsConfigPanel.jsx (existing - integrate)
├── TierManagementPanel.jsx (existing)
├── LoyaltyAnalyticsDashboard.jsx (existing)
└── ManualPointsAdjustment.jsx (NEW)

convex/services/
└── points.ts (MODIFY - add adjustPoints, searchCustomers)
```

### References

- [Source: convex/schema.ts:1120-1148] - points_transactions schema
- [Source: convex/services/points.ts] - Points service patterns
- [Source: src/components/admin/PointsConfigPanel.jsx] - UI pattern reference

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- [ ] convex/services/points.ts (MODIFY) - Add adjustPoints and searchCustomers
- [ ] src/components/admin/ManualPointsAdjustment.jsx (CREATE) - Admin UI
- [ ] src/components/admin/PointsConfigPanel.jsx (MODIFY) - Integrate
