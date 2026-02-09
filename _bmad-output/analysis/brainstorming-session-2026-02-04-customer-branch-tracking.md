# Brainstorming Session: Customer-Branch Activity Tracking

**Date:** February 4, 2026
**Topic:** Distinguishing Customers by Branch for Marketing, Promotions & Churn
**Approach:** Pre-computed Activity Table
**Status:** ✅ FULLY IMPLEMENTED (Backend + UI)

---

## Session Overview

**Challenge:** Currently customers can book at any branch with no "home branch" concept. Need to:
1. Identify which branch a customer "belongs to"
2. Track customer activity status per branch
3. Enable branch-level marketing campaigns
4. Detect and prevent customer churn

**Goals:**
- Marketing: Send targeted branch-specific campaigns
- Promotions: Branch-specific offers to relevant customers
- Churn Prevention: Identify and win back inactive customers

---

## Decision: Pre-computed Activity Table

### Why Pre-computed?
| Benefit | Explanation |
|---------|-------------|
| **Faster queries** | No aggregation at runtime |
| **Real-time dashboards** | Instant metrics for branch admins |
| **Scheduled campaigns** | Easy segment queries |
| **Historical tracking** | Track relationship over time |

---

## Schema Design

### New Table: `customer_branch_activity`

```typescript
customer_branch_activity: defineTable({
  // Core relationship
  customer_id: v.id("users"),
  branch_id: v.id("branches"),

  // Activity metrics
  first_visit_date: v.number(),        // Timestamp of first booking
  last_visit_date: v.number(),         // Timestamp of last completed booking
  total_bookings: v.number(),          // Completed bookings count
  total_spent: v.number(),             // Total revenue from customer (pesos)

  // Engagement status
  status: v.union(
    v.literal("new"),          // Registered but no completed booking yet
    v.literal("active"),       // Visited in last 30 days
    v.literal("at_risk"),      // 30-60 days since last visit
    v.literal("churned"),      // 60+ days since last visit
    v.literal("win_back")      // Was churned, now returned
  ),
  days_since_last_visit: v.optional(v.number()),

  // Marketing preferences
  opted_in_marketing: v.boolean(),
  preferred_contact: v.optional(v.union(
    v.literal("sms"),
    v.literal("email"),
    v.literal("push"),
    v.literal("none")
  )),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_customer", ["customer_id"])
.index("by_branch", ["branch_id"])
.index("by_customer_branch", ["customer_id", "branch_id"])
.index("by_branch_status", ["branch_id", "status"])
.index("by_branch_last_visit", ["branch_id", "last_visit_date"])
.index("by_branch_total_spent", ["branch_id", "total_spent"])
```

---

## Status Definitions

**Timing Rationale:** Barbershop customers typically visit every 2-3 weeks for haircuts. 12 days without a visit signals potential churn.

| Status | Days Since Last Visit | Description |
|--------|----------------------|-------------|
| `new` | N/A | Registered, no completed booking |
| `active` | 0-12 days | Regular customer, within normal visit cycle |
| `at_risk` | 13-30 days | Missed their usual visit window - send reminder |
| `churned` | 31+ days | Lost customer - needs win-back campaign |
| `win_back` | Recently returned | Was churned, came back |

### Why 12 Days?
- Average haircut cycle: 2-3 weeks (14-21 days)
- 12 days = before typical next visit
- 13-30 days = overdue, likely forgetting or switching
- 31+ days = definitely churned for a barbershop

---

## Implementation Plan

### Phase 1: Schema & Backend

#### 1.1 Add Schema Table
**File:** `convex/schema.ts`
- Add `customer_branch_activity` table with indexes

#### 1.2 Create Service Functions
**File:** `convex/services/customerBranchActivity.ts`

```typescript
// Core functions
- upsertActivity(customerId, branchId, bookingData)  // Called after each booking
- getCustomerBranches(customerId)                    // Get all branches for customer
- getBranchCustomers(branchId, filters)              // Get customers for branch
- getCustomerStatus(customerId, branchId)            // Get specific relationship

// Analytics functions
- getBranchChurnMetrics(branchId)                    // Churn dashboard data
- getAtRiskCustomers(branchId)                       // For win-back campaigns
- getTopCustomers(branchId, limit)                   // VIP list by spending

// Scheduled job
- updateAllStatuses()                                // Daily status recalculation
```

#### 1.3 Hook into Booking Flow
**File:** `convex/services/bookings.ts`

After booking completion:
```typescript
// In completeBooking or markBookingComplete
await ctx.runMutation(api.services.customerBranchActivity.upsertActivity, {
  customerId: booking.customer,
  branchId: booking.branch_id,
  bookingAmount: booking.final_price,
  bookingDate: Date.now()
});
```

#### 1.4 Scheduled Status Update
**File:** `convex/crons.ts`

```typescript
// Run daily at midnight
crons.daily(
  "update-customer-statuses",
  { hourUTC: 16, minuteUTC: 0 }, // Midnight PHT
  api.services.customerBranchActivity.updateAllStatuses
);
```

#### 1.5 Status Calculation Logic

```typescript
function calculateStatus(daysSinceLastVisit: number, previousStatus: string): string {
  // Active: visited within 12 days
  if (daysSinceLastVisit <= 12) {
    // If was churned and came back, mark as win_back
    if (previousStatus === "churned") {
      return "win_back";
    }
    return "active";
  }

  // At-risk: 13-30 days without visit
  if (daysSinceLastVisit <= 30) {
    return "at_risk";
  }

  // Churned: 31+ days without visit
  return "churned";
}
```

---

### Phase 2: Admin Dashboard

#### 2.1 Branch Customer Analytics
**File:** `src/components/admin/BranchCustomerAnalytics.jsx`

Dashboard showing:
- Total customers per status (pie chart)
- Churn trend over time (line chart)
- At-risk customers list (action items)
- Top customers by spending

#### 2.2 Marketing Campaign Builder
**File:** `src/components/admin/MarketingCampaigns.jsx`

Features:
- Select target segment (active, at_risk, churned)
- Create campaign (SMS/Email/Push)
- Preview audience size
- Schedule or send immediately

---

### Phase 3: Automated Campaigns

#### 3.1 Win-Back Automation
Trigger: Customer status changes to `at_risk`
Action: Send automated "We miss you" message with offer

#### 3.2 Loyalty Recognition
Trigger: Customer reaches spending milestone
Action: Send thank you + reward notification

#### 3.3 Birthday/Anniversary
Trigger: Customer anniversary of first visit
Action: Send special offer

---

## Query Examples

### Get Churn Dashboard Data
```typescript
// Branch admin sees: "23 active, 8 at-risk, 12 churned"
const metrics = await ctx.db
  .query("customer_branch_activity")
  .withIndex("by_branch", q => q.eq("branch_id", branchId))
  .collect();

const summary = {
  active: metrics.filter(m => m.status === "active").length,
  at_risk: metrics.filter(m => m.status === "at_risk").length,
  churned: metrics.filter(m => m.status === "churned").length,
};
```

### Get At-Risk Customers for Campaign
```typescript
// "Send 20% off to customers who haven't visited in 30-60 days"
const atRiskCustomers = await ctx.db
  .query("customer_branch_activity")
  .withIndex("by_branch_status", q =>
    q.eq("branch_id", branchId).eq("status", "at_risk")
  )
  .filter(q => q.eq(q.field("opted_in_marketing"), true))
  .collect();
```

### Get Top Spenders for VIP Treatment
```typescript
// "Top 10 customers by total spend"
const vipCustomers = await ctx.db
  .query("customer_branch_activity")
  .withIndex("by_branch_total_spent", q => q.eq("branch_id", branchId))
  .order("desc")
  .take(10);
```

---

## Data Migration

For existing customers, run one-time backfill:

```typescript
// Backfill script
const allBookings = await ctx.db.query("bookings").collect();

// Group by customer + branch
const customerBranchMap = new Map();
for (const booking of allBookings) {
  if (!booking.customer) continue;
  const key = `${booking.customer}-${booking.branch_id}`;
  if (!customerBranchMap.has(key)) {
    customerBranchMap.set(key, {
      customer_id: booking.customer,
      branch_id: booking.branch_id,
      bookings: [],
    });
  }
  customerBranchMap.get(key).bookings.push(booking);
}

// Create activity records
for (const [key, data] of customerBranchMap) {
  const sortedBookings = data.bookings.sort((a, b) => a.createdAt - b.createdAt);
  const completedBookings = sortedBookings.filter(b => b.status === "completed");

  await ctx.db.insert("customer_branch_activity", {
    customer_id: data.customer_id,
    branch_id: data.branch_id,
    first_visit_date: sortedBookings[0].createdAt,
    last_visit_date: completedBookings.length > 0
      ? completedBookings[completedBookings.length - 1].createdAt
      : sortedBookings[0].createdAt,
    total_bookings: completedBookings.length,
    total_spent: completedBookings.reduce((sum, b) => sum + (b.final_price || 0), 0),
    status: calculateStatus(completedBookings),
    opted_in_marketing: true, // Default opt-in
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
```

---

## Success Metrics

After implementation, track:

| Metric | Target |
|--------|--------|
| Churn rate reduction | 20% decrease in 3 months |
| Win-back success | 15% of at-risk customers return |
| Campaign engagement | 30% open rate, 10% redemption |
| Branch admin adoption | 80% use dashboard weekly |

---

## Next Steps

1. [x] Add schema table - `customer_branch_activity` added to schema.ts
2. [x] Create backend service functions - `convex/services/customerBranchActivity.ts`
3. [x] Hook into booking completion flow - `markBookingComplete` in bookings.ts
4. [x] Set up daily status update cron - crons.ts (runs at midnight PHT)
5. [ ] Run data migration for existing customers - Use `backfillFromBookings` mutation
6. [x] Build admin dashboard UI - `BranchCustomerAnalytics.jsx` + "Customers" tab in admin
7. [ ] Implement marketing campaign features (SMS/Email integration)

---

## References

- Schema: `convex/schema.ts`
- Bookings: `convex/services/bookings.ts`
- Crons: `convex/crons.ts`
