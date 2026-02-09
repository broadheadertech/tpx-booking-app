---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/index.md
  - docs/project_details.md
  - docs/CONVEX_DATABASE_SCHEMA.md
  - convex/services/payroll.ts
session_topic: 'Financial Management Features for TPX Booking App'
session_goals: 'Branch accounting, royalty system, cash advances, external revenue tracking, HQ consolidated view'
selected_approach: 'AI-Recommended Techniques'
techniques_used:
  - 'Feature Decomposition'
  - 'Schema Design'
  - 'Integration Analysis'
ideas_generated: 5
context_file: 'docs/index.md'
---

# Brainstorming Session - TPX Booking App Financial Features

**Session Date:** 2026-01-25
**Facilitator:** Claude (Analyst Agent)
**Participant:** MASTERPAINTER

## Session Overview

**Topic:** Financial Management Features for TPX Barbershop Booking System
**Goals:** Design comprehensive financial tracking including accounting, royalties, cash advances, and consolidated reporting

### Context Guidance

This is a **brownfield project** enhancement to the existing TPX Booking App. The system currently has:
- 24 database tables in Convex
- Existing payroll system (`convex/services/payroll.ts`)
- Multi-branch architecture with role-based access
- 6 user roles (super_admin, admin, branch_admin, staff, barber, customer)

---

## Feature 1: Branch-Level Accounting System

### Description
A debit/credit accounting system for each branch to track income, expenses, and generate financial statements (Balance Sheet and P&L).

### Core Requirements
- **Double-entry accounting** (simplified journal entries)
- **Account Types:** Assets, Liabilities, Equity, Revenue, Expenses
- **Auto-generated entries** from existing transactions (bookings, sales, payroll)
- **P&L Visualization** per branch with date range filtering
- **Balance Sheet** generation

### Proposed Schema

```typescript
// Account Types (Chart of Accounts)
account_types: defineTable({
  branch_id: v.id("branches"),
  code: v.string(),           // e.g., "1000", "2000", "4000"
  name: v.string(),           // e.g., "Cash", "Accounts Payable", "Service Revenue"
  type: v.union(
    v.literal("asset"),
    v.literal("liability"),
    v.literal("equity"),
    v.literal("revenue"),
    v.literal("expense")
  ),
  is_system: v.boolean(),     // System-generated vs user-created
  is_active: v.boolean(),
})

// Journal Entries (Double-Entry)
journal_entries: defineTable({
  branch_id: v.id("branches"),
  entry_date: v.number(),
  reference_type: v.union(
    v.literal("booking"),
    v.literal("sale"),
    v.literal("payroll"),
    v.literal("expense"),
    v.literal("adjustment"),
    v.literal("royalty"),
    v.literal("external_revenue")
  ),
  reference_id: v.optional(v.string()),
  description: v.string(),
  debit_account: v.id("account_types"),
  credit_account: v.id("account_types"),
  amount: v.number(),
  created_by: v.id("users"),
  created_at: v.number(),
})

// Account Balances (Running totals for performance)
account_balances: defineTable({
  branch_id: v.id("branches"),
  account_id: v.id("account_types"),
  period: v.string(),         // "2026-01" format
  opening_balance: v.number(),
  debits: v.number(),
  credits: v.number(),
  closing_balance: v.number(),
})
```

### Key Functions
- `recordJournalEntry()` - Create journal entries with validation
- `getBranchPnL(branchId, startDate, endDate)` - Generate P&L statement
- `getBranchBalanceSheet(branchId, asOfDate)` - Generate balance sheet
- `autoRecordFromBooking()` - Auto-generate entries from bookings
- `autoRecordFromPayroll()` - Auto-generate entries from payroll

---

## Feature 2: Royalty Pay System

### Description
Super admin feature to collect royalties from branches. Supports percentage-based or fixed amount collection.

### Core Requirements
- **Configurable per branch** (percentage or fixed amount)
- **Monthly/weekly billing cycles**
- **Payment tracking** (paid, pending, overdue)
- **Royalty reports** for super admin dashboard
- **Auto-calculation** based on branch revenue

### Proposed Schema

```typescript
// Royalty Settings per Branch
royalty_settings: defineTable({
  branch_id: v.id("branches"),
  type: v.union(v.literal("percentage"), v.literal("fixed")),
  value: v.number(),          // 10 for 10% or 5000 for fixed
  billing_cycle: v.union(v.literal("weekly"), v.literal("monthly")),
  is_active: v.boolean(),
  effective_date: v.number(),
  created_by: v.id("users"),
})

// Royalty Billing Periods
royalty_periods: defineTable({
  branch_id: v.id("branches"),
  period_start: v.number(),
  period_end: v.number(),
  gross_revenue: v.number(),
  royalty_amount: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("paid"),
    v.literal("overdue"),
    v.literal("waived")
  ),
  due_date: v.number(),
  paid_date: v.optional(v.number()),
  paid_by: v.optional(v.id("users")),
  notes: v.optional(v.string()),
})

// Royalty Payments (for partial payments)
royalty_payments: defineTable({
  period_id: v.id("royalty_periods"),
  amount: v.number(),
  payment_method: v.string(),
  payment_date: v.number(),
  recorded_by: v.id("users"),
  notes: v.optional(v.string()),
})
```

### Key Functions
- `calculateRoyalty(branchId, periodStart, periodEnd)` - Calculate royalty amount
- `generateRoyaltyBilling()` - Auto-generate monthly/weekly billings
- `recordRoyaltyPayment()` - Record payment with journal entry
- `getRoyaltyDashboard()` - Super admin overview of all branches
- `getRoyaltyReport(branchId)` - Branch-level royalty history

---

## Feature 3: Cash Advance System

### Description
Allow barbers to request cash advances that are automatically deducted from their payroll earnings.

### Core Requirements
- **Advance requests** by barbers (with approval workflow)
- **Multiple repayment types:** Full deduction, installments, percentage cap
- **FIFO repayment** (oldest advances paid first)
- **Integration with existing payroll.ts**
- **Balance tracking** per barber

### Proposed Schema

```typescript
// Cash Advances
cash_advances: defineTable({
  barber_id: v.id("barbers"),
  branch_id: v.id("branches"),
  amount: v.number(),
  remaining_balance: v.number(),
  reason: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("active"),
    v.literal("paid"),
    v.literal("cancelled")
  ),
  repayment_type: v.union(
    v.literal("full"),           // Deduct full amount from next payroll
    v.literal("installment"),    // Fixed amount per payroll
    v.literal("percentage_cap")  // Cap deduction at % of earnings
  ),
  installment_amount: v.optional(v.number()),
  percentage_cap: v.optional(v.number()),
  requested_at: v.number(),
  approved_at: v.optional(v.number()),
  approved_by: v.optional(v.id("users")),
  notes: v.optional(v.string()),
})

// Cash Advance Repayments
cash_advance_repayments: defineTable({
  advance_id: v.id("cash_advances"),
  payroll_period_id: v.optional(v.id("payroll_periods")),
  amount: v.number(),
  repayment_date: v.number(),
  type: v.union(
    v.literal("payroll_deduction"),
    v.literal("manual_payment")
  ),
  recorded_by: v.id("users"),
  notes: v.optional(v.string()),
})
```

### Payroll Integration Points

**File:** `convex/services/payroll.ts`

**Integration in `calculateBarberEarnings()` (lines 189-619):**
```typescript
// After calculating net earnings, add cash advance deduction
const activeAdvances = await ctx.db
  .query("cash_advances")
  .withIndex("by_barber_status", (q) =>
    q.eq("barber_id", barberId).eq("status", "active")
  )
  .collect();

let advanceDeduction = 0;
for (const advance of activeAdvances) {
  const deduction = calculateAdvanceDeduction(advance, netEarnings - advanceDeduction);
  advanceDeduction += deduction;
  // Record repayment
}

// Final earnings = netEarnings - advanceDeduction
```

### Key Functions
- `requestCashAdvance()` - Barber requests advance
- `approveCashAdvance()` - Manager approves/rejects
- `processAdvanceRepayment()` - Deduct from payroll
- `getBarberAdvanceBalance()` - Current outstanding balance
- `getAdvanceHistory()` - Full history with repayments

---

## Feature 4: External Revenue Tracking

### Description
Track barber income from external sources (shop visits, house calls, gigs) that occurs outside the normal booking system.

### Core Requirements
- **Manual entry** by staff/barber
- **Revenue categories:** Shop visit, House call, Gig, Other
- **Commission calculation** same as regular services
- **Integration with payroll** for earnings calculation
- **Reporting** for transparency

### Proposed Schema

```typescript
// External Revenue Entries
external_revenue: defineTable({
  barber_id: v.id("barbers"),
  branch_id: v.id("branches"),
  revenue_date: v.number(),
  category: v.union(
    v.literal("shop_visit"),
    v.literal("house_call"),
    v.literal("gig"),
    v.literal("other")
  ),
  description: v.string(),
  gross_amount: v.number(),
  commission_rate: v.number(),      // Barber's share %
  barber_earnings: v.number(),
  shop_earnings: v.number(),
  recorded_by: v.id("users"),
  recorded_at: v.number(),
  notes: v.optional(v.string()),
})
```

### Key Functions
- `recordExternalRevenue()` - Add manual revenue entry
- `getBarberExternalRevenue()` - List by barber and date range
- `includeExternalInPayroll()` - Add to payroll calculations

---

## Feature 5: HQ Consolidated Accounting

### Description
Super admin level view that combines all branch P&Ls plus HQ-level expenses for a consolidated financial picture.

### Core Requirements
- **Consolidated P&L** across all branches
- **HQ-level expenses** (marketing, admin salaries, office rent)
- **HQ-level revenue** (franchise fees, royalties, corporate sales)
- **Monthly summaries** with variance tracking
- **Export capabilities** for external accounting

### Proposed Schema

```typescript
// HQ Expense Categories
hq_expense_categories: defineTable({
  name: v.string(),
  code: v.string(),
  type: v.union(
    v.literal("fixed"),      // Rent, salaries
    v.literal("variable"),   // Marketing, utilities
    v.literal("one_time")    // Equipment, setup
  ),
  is_active: v.boolean(),
})

// HQ Expenses
hq_expenses: defineTable({
  category_id: v.id("hq_expense_categories"),
  amount: v.number(),
  expense_date: v.number(),
  description: v.string(),
  vendor: v.optional(v.string()),
  receipt_url: v.optional(v.string()),
  recorded_by: v.id("users"),
  recorded_at: v.number(),
})

// HQ Revenue (non-branch)
hq_revenue: defineTable({
  source: v.union(
    v.literal("franchise_fee"),
    v.literal("royalty"),
    v.literal("corporate_sale"),
    v.literal("interest"),
    v.literal("other")
  ),
  branch_id: v.optional(v.id("branches")),
  amount: v.number(),
  revenue_date: v.number(),
  description: v.string(),
  recorded_by: v.id("users"),
  recorded_at: v.number(),
})

// HQ Monthly Summaries (cached aggregates)
hq_monthly_summaries: defineTable({
  period: v.string(),              // "2026-01"
  total_branch_revenue: v.number(),
  total_branch_expenses: v.number(),
  total_branch_profit: v.number(),
  total_royalties_collected: v.number(),
  total_hq_expenses: v.number(),
  total_hq_revenue: v.number(),
  consolidated_profit: v.number(),
  generated_at: v.number(),
})
```

### Key Functions
- `recordHQExpense()` - Add HQ-level expense
- `recordHQRevenue()` - Add HQ-level revenue
- `getConsolidatedPnL(period)` - Combined P&L report
- `generateMonthlySummary(period)` - Cache monthly aggregates
- `getBranchComparison(period)` - Compare branch performance

---

## Summary: New Database Tables

| # | Table Name | Feature | Purpose |
|---|------------|---------|---------|
| 1 | `account_types` | Branch Accounting | Chart of accounts |
| 2 | `journal_entries` | Branch Accounting | Double-entry records |
| 3 | `account_balances` | Branch Accounting | Running balances |
| 4 | `royalty_settings` | Royalty System | Branch royalty config |
| 5 | `royalty_periods` | Royalty System | Billing periods |
| 6 | `royalty_payments` | Royalty System | Payment records |
| 7 | `cash_advances` | Cash Advance | Advance requests |
| 8 | `cash_advance_repayments` | Cash Advance | Repayment tracking |
| 9 | `external_revenue` | External Revenue | Manual revenue entries |
| 10 | `hq_expense_categories` | HQ Accounting | Expense categories |
| 11 | `hq_expenses` | HQ Accounting | HQ expense records |
| 12 | `hq_revenue` | HQ Accounting | HQ revenue records |
| 13 | `hq_monthly_summaries` | HQ Accounting | Cached aggregates |

**Total: 13 new tables**

---

## Implementation Priority (Suggested)

1. **Cash Advance System** - Direct barber benefit, payroll integration exists
2. **External Revenue Tracking** - Simple addition, payroll integration
3. **Branch Accounting** - Foundation for financial reporting
4. **Royalty System** - Depends on accounting for proper tracking
5. **HQ Consolidated Accounting** - Final layer, aggregates all below

---

## Next Steps

This brainstorming session output should be used as input for the PRD workflow to formalize all requirements, define acceptance criteria, and create implementation specifications.

**Recommended PRD Sections:**
- Functional Requirements for each feature
- Non-Functional Requirements (performance, security)
- User Stories per role (super_admin, branch_admin, barber)
- UI/UX considerations
- Data migration requirements (if any)
- Integration points with existing system
