# Story 3.1: P&L Dashboard with Summary Cards

Status: done

---

## Story

As a **Branch Admin**,
I want to **see my branch's financial summary at a glance**,
So that **I know if my branch is profitable without digging through data**.

---

## Acceptance Criteria

### AC1: Summary Cards Display
**Given** I am a logged-in branch admin
**When** I navigate to the Accounting section
**Then** I see three summary cards: Total Revenue, Total Expenses, Net Income
**And** the cards show current month data by default
**And** the dashboard loads within 3 seconds (NFR1)
**And** summary cards are visible without scrolling (UX4)

### AC2: Skeleton Loading
**Given** I view the P&L dashboard
**When** the data is loading
**Then** I see skeleton loaders (not spinners - UX7)

### AC3: Secondary Metrics
**Given** the P&L dashboard is loaded
**When** I view the dashboard
**Then** I see Gross Profit, Gross Margin, Net Margin, and Transaction Count

---

## Tasks / Subtasks

- [x] **Task 1: Create accounting service**
  - [x] 1.1: Create `convex/services/accounting.ts`
  - [x] 1.2: Implement `getPLSummary` query
  - [x] 1.3: Implement `getIncomeByCategory` query
  - [x] 1.4: Implement `getRevenueByBarber` query
  - [x] 1.5: Implement `getPaymentMethodBreakdown` query
  - [x] 1.6: Export accounting service in index.ts

- [x] **Task 2: Create MetricCard component**
  - [x] 2.1: Create reusable MetricCard with skeleton loading
  - [x] 2.2: Support different colors (green/red/orange/blue)
  - [x] 2.3: Display icon, title, value, and optional trend

- [x] **Task 3: Create AccountingDashboard component**
  - [x] 3.1: Create `src/components/staff/AccountingDashboard.jsx`
  - [x] 3.2: Add three main summary cards (above the fold)
  - [x] 3.3: Add secondary metrics row
  - [x] 3.4: Add expandable breakdown cards
  - [x] 3.5: Add barber revenue card
  - [x] 3.6: Add payment method breakdown

- [x] **Task 4: Add to Dashboard**
  - [x] 4.1: Import AccountingDashboard in staff Dashboard
  - [x] 4.2: Add "accounting" tab to baseTabs
  - [x] 4.3: Add case for accounting in renderTabContent

---

## Dev Notes

### Accounting Service Queries

**File: convex/services/accounting.ts**

```typescript
// getPLSummary - Main P&L calculation
// Returns: total_revenue, total_expenses, net_income, breakdown details

// getIncomeByCategory - Revenue by service/product category

// getRevenueByBarber - Revenue contribution by each barber

// getPaymentMethodBreakdown - Cash/Card/Wallet/Transfer breakdown
```

### Data Sources

1. **Revenue:** `transactions` table (completed transactions)
   - Services revenue (from services array)
   - Product revenue (from products array)
   - Booking fees, late fees
   - Discounts subtracted

2. **Expenses:**
   - COGS: Product cost * quantity sold
   - Payroll: net_pay from paid payroll_records

---

## Technical Guidance

### P&L Calculation Flow

```
Gross Revenue = Services + Products + Booking Fees + Late Fees
Net Revenue = Gross Revenue - Discounts
COGS = Sum(product.cost * quantity) for each product sold
Gross Profit = Net Revenue - COGS
Payroll = Sum(net_pay) from paid payroll records
Total Expenses = COGS + Payroll
Net Income = Net Revenue - Total Expenses
```

### Patterns Used

- Skeleton loaders for loading states (UX7)
- Dark theme (#0A0A0A background, #FF8C42 accent)
- Summary cards above the fold (UX4)
- Expandable breakdown cards for drill-down

---

## File List

**Created:**
- `convex/services/accounting.ts` - P&L queries and calculations
- `src/components/staff/AccountingDashboard.jsx` - Main dashboard component

**Modified:**
- `convex/services/index.ts` - Added accounting export
- `src/pages/staff/Dashboard.jsx` - Added accounting tab

---

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes

1. **Accounting Service**: Created comprehensive P&L service with:
   - `getPLSummary` - Main P&L calculation with revenue/expense breakdown
   - `getIncomeByCategory` - Revenue by service and product categories
   - `getRevenueByBarber` - Per-barber revenue contribution
   - `getExpenseByCategory` - COGS and payroll breakdown
   - `getDailyRevenueTrend` - Daily revenue for charts
   - `getPaymentMethodBreakdown` - Cash/card/wallet breakdown

2. **AccountingDashboard Component**: Full-featured P&L dashboard with:
   - Three main MetricCards (Revenue, Expenses, Net Income)
   - Secondary metrics (Gross Profit, Margins, Transaction Count)
   - Expandable breakdown cards for revenue/expenses
   - Barber revenue contribution chart
   - Payment method breakdown
   - Service/product category breakdown

3. **Stories Combined**: This implementation covers:
   - Story 3.1: P&L Dashboard with Summary Cards
   - Story 3.2: Income and Expense Breakdown (expandable cards)
   - Story 3.3: Date Range Selection (This Month/Last Month/This Year/Custom)
   - Story 3.4: Export to CSV and PDF (download buttons)

4. **UX Requirements Met**:
   - Summary cards visible without scrolling (UX4)
   - Skeleton loaders for loading states (UX7)
   - Dark theme with orange accent (UX8)

---

## Change Log

| Date | Change | Files |
|------|--------|-------|
| 2026-01-25 | Story 3.1 implementation complete | accounting.ts, AccountingDashboard.jsx, Dashboard.jsx |
