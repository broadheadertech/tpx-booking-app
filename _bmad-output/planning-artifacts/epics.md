---
stepsCompleted: [1, 2, 3, 4]
workflowComplete: true
completedAt: '2026-01-25'
totalEpics: 5
totalStories: 22
frsCovered: 44
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# tpx-booking-app - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for tpx-booking-app, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Financial Reporting (FR1-FR9)**
- FR1: Branch Admin can view monthly income summary for their branch
- FR2: Branch Admin can view monthly expense summary for their branch
- FR3: Branch Admin can view yearly income summary for their branch
- FR4: Branch Admin can view yearly expense summary for their branch
- FR5: Branch Admin can view net income (P&L) for a selected time period
- FR6: Branch Admin can view income breakdown by category (services, products)
- FR7: Branch Admin can view revenue breakdown by barber
- FR8: Branch Admin can export P&L report to CSV format
- FR9: Branch Admin can export P&L report to PDF format

**Royalty Management (FR10-FR19)**
- FR10: Super Admin can configure royalty rate (percentage) for a branch
- FR11: Super Admin can configure royalty rate (fixed amount) for a branch
- FR12: Super Admin can set billing cycle (monthly) for a branch
- FR13: System can calculate royalty amount based on branch revenue and configured rate
- FR14: System can send email notification to Branch Admin when royalty is due
- FR15: Super Admin can view royalty status for all branches (paid/unpaid/overdue)
- FR16: Super Admin can manually mark a royalty payment as received
- FR17: System can generate official receipt (OR) for royalty payment
- FR18: Branch Admin can view their royalty payment history
- FR19: Branch Admin can view current royalty amount due

**Cash Advance (FR20-FR29)**
- FR20: Barber can submit a cash advance request with amount and reason
- FR21: System can validate cash advance does not exceed 50% of barber's average 2-week earnings
- FR22: System can reject cash advance if barber has an existing active advance
- FR23: Branch Admin can view pending cash advance requests for their branch
- FR24: Branch Admin can approve a cash advance request
- FR25: Branch Admin can reject a cash advance request
- FR26: Barber can view status of their cash advance request (pending/approved/rejected)
- FR27: System can automatically deduct approved advance from barber's next payroll
- FR28: Barber can view cash advance repayment in their payroll breakdown
- FR29: Branch Admin can view cash advance history for barbers in their branch

**Product Catalog Management (FR30-FR37)**
- FR30: Super Admin can add a product to the central catalog
- FR31: Super Admin can edit product details (name, description, price, category, image)
- FR32: Super Admin can remove a product from the central catalog
- FR33: Super Admin can set MSRP (manufacturer's suggested retail price) for a product
- FR34: Super Admin can toggle price enforcement (branches cannot change price)
- FR35: Super Admin can view all products in the central catalog
- FR36: Branch Staff can view products available in the central catalog
- FR37: System can sync product catalog changes to all branches in real-time

**Time & Attendance (FR38-FR41)**
- FR38: Barber can record time-in for a work shift
- FR39: Barber can record time-out for a work shift
- FR40: Branch Admin can view attendance records for barbers in their branch
- FR41: Branch Admin can view attendance for a specific date or date range

**Notifications & Alerts (FR42-FR44)**
- FR42: System can send email notification to Branch Admin when royalty billing cycle triggers
- FR43: Branch Admin can receive in-app notification of pending cash advance requests
- FR44: Barber can receive notification when cash advance is approved or rejected

### Non-Functional Requirements

**Performance**
- NFR1: P&L dashboard loads within 3 seconds for monthly view
- NFR2: Product catalog sync propagates to branches within 5 seconds
- NFR3: Cash advance request submission completes within 2 seconds
- NFR4: Time in/out recording completes within 1 second

**Security**
- NFR5: All data transmissions use HTTPS/TLS encryption
- NFR6: Branch data isolation ensures branches cannot access other branches' data
- NFR7: Cash advance details visible only to requesting barber and approving branch admin
- NFR8: Financial data (P&L, royalty) requires authenticated access
- NFR9: All financial operations logged with audit trail (user, timestamp, action)

**Data Integrity**
- NFR10: P&L calculations derived solely from transaction data (no manual override in MVP)
- NFR11: Official receipt numbers are unique and sequential
- NFR12: Cash advance deductions appear in payroll only after admin approval

**Integration**
- NFR13: Email notifications delivered via Resend API with >95% delivery rate
- NFR14: Cash advance integrates with existing payroll service without manual intervention
- NFR15: Real-time data sync via Convex subscriptions for all dashboards

**Reliability**
- NFR16: System available during business hours (6 AM - 10 PM PHT)
- NFR17: Financial data retained indefinitely (no automatic deletion)
- NFR18: Failed email notifications logged and retryable

### Additional Requirements

**From Architecture Document:**
- AR1: Add 6 new tables to Convex schema (royaltyConfig, royaltyPayments, cashAdvances, officialReceipts, productCatalog, timeAttendance)
- AR2: Create 5 new Convex services (accounting.ts, royalty.ts, cashAdvance.ts, productCatalog.ts, timeAttendance.ts)
- AR3: Extend existing payroll.ts service with getCashAdvanceDeductions() function
- AR4: Extend existing notifications.ts service with royalty and cash advance notification types
- AR5: Implement official receipt sequential numbering in officialReceipts table
- AR6: All new services must follow existing naming conventions (camelCase tables, snake_case fields, by_fieldname indexes)
- AR7: All queries must filter by branch_id for multi-branch isolation
- AR8: Cash advance privacy - exclude super admin from viewing individual advance details

**From UX Design Document:**
- UX1: Create 5 custom UI components (MetricCard, StatusBadge, ClockButton, ApprovalCard, BranchStatusCard)
- UX2: Time clock must complete in < 2 seconds with one-tap action (no confirmation dialog)
- UX3: Cash advance approval must complete in < 5 seconds
- UX4: P&L summary cards must be visible without scrolling (above the fold)
- UX5: All status indicators must use traffic light pattern (green/yellow/red) with icons (not color alone)
- UX6: Mobile touch targets minimum 44px
- UX7: Use skeleton loaders for loading states (not spinners)
- UX8: Dark theme (#0A0A0A) with orange accent (#FF8C42) for all new components
- UX9: WCAG AA accessibility compliance for all new features

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 3 | Branch Admin view monthly income summary |
| FR2 | Epic 3 | Branch Admin view monthly expense summary |
| FR3 | Epic 3 | Branch Admin view yearly income summary |
| FR4 | Epic 3 | Branch Admin view yearly expense summary |
| FR5 | Epic 3 | Branch Admin view net income (P&L) |
| FR6 | Epic 3 | Branch Admin view income by category |
| FR7 | Epic 3 | Branch Admin view revenue by barber |
| FR8 | Epic 3 | Branch Admin export P&L to CSV |
| FR9 | Epic 3 | Branch Admin export P&L to PDF |
| FR10 | Epic 5 | Super Admin configure royalty rate (percentage) |
| FR11 | Epic 5 | Super Admin configure royalty rate (fixed) |
| FR12 | Epic 5 | Super Admin set billing cycle |
| FR13 | Epic 5 | System calculate royalty amount |
| FR14 | Epic 5 | System send royalty due email |
| FR15 | Epic 5 | Super Admin view all branches royalty status |
| FR16 | Epic 5 | Super Admin mark royalty as paid |
| FR17 | Epic 5 | System generate official receipt |
| FR18 | Epic 5 | Branch Admin view royalty history |
| FR19 | Epic 5 | Branch Admin view current royalty due |
| FR20 | Epic 4 | Barber submit cash advance request |
| FR21 | Epic 4 | System validate 50% earnings limit |
| FR22 | Epic 4 | System reject if active advance exists |
| FR23 | Epic 4 | Branch Admin view pending requests |
| FR24 | Epic 4 | Branch Admin approve advance |
| FR25 | Epic 4 | Branch Admin reject advance |
| FR26 | Epic 4 | Barber view request status |
| FR27 | Epic 4 | System auto-deduct from payroll |
| FR28 | Epic 4 | Barber view repayment in payroll |
| FR29 | Epic 4 | Branch Admin view advance history |
| FR30 | Epic 2 | Super Admin add product to catalog |
| FR31 | Epic 2 | Super Admin edit product details |
| FR32 | Epic 2 | Super Admin remove product |
| FR33 | Epic 2 | Super Admin set MSRP |
| FR34 | Epic 2 | Super Admin toggle price enforcement |
| FR35 | Epic 2 | Super Admin view all catalog products |
| FR36 | Epic 2 | Branch Staff view catalog products |
| FR37 | Epic 2 | System sync catalog to branches |
| FR38 | Epic 1 | Barber record time-in |
| FR39 | Epic 1 | Barber record time-out |
| FR40 | Epic 1 | Branch Admin view attendance records |
| FR41 | Epic 1 | Branch Admin view attendance by date range |
| FR42 | Epic 5 | System send royalty billing email |
| FR43 | Epic 4 | Branch Admin notification of pending advance |
| FR44 | Epic 4 | Barber notification of advance decision |

## Epic List

### Epic 1: Time & Attendance Tracking
*Barbers can track their work hours and Branch Admins can monitor attendance*

**User Outcome:** Barbers clock in/out with one tap; Branch Admins view attendance records for payroll and scheduling decisions.

**FRs covered:** FR38, FR39, FR40, FR41

**Standalone:** Yes - no dependencies on other new features

---

### Epic 2: Central Product Catalog
*Super Admin can manage a centralized product catalog with optional price enforcement*

**User Outcome:** Super Admin creates/edits products centrally; all branches see the same catalog with consistent pricing.

**FRs covered:** FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37

**Standalone:** Yes - independent of other new features

---

### Epic 3: Branch Financial Reporting (P&L)
*Branch Admins can view their financial performance and export reports*

**User Outcome:** Branch Admin sees monthly/yearly income, expenses, and net profit at a glance; can export to CSV/PDF for BIR compliance.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9

**Standalone:** Yes - uses existing transaction data

---

### Epic 4: Cash Advance Workflow
*Barbers can request advances and Branch Admins can approve with automatic payroll integration*

**User Outcome:** Barbers request emergency funds digitally; Branch Admins approve/reject with full visibility; deductions appear automatically in payroll.

**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR43, FR44

**Standalone:** Yes - integrates with existing payroll service

---

### Epic 5: Royalty Management System
*Super Admin can configure, track, and collect royalty payments from franchisees*

**User Outcome:** Super Admin sets royalty rates; system calculates and sends email reminders; generates official receipts when paid.

**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR42

**Standalone:** Yes - calculates from existing transactions

---

## Epic 1: Time & Attendance Tracking

*Barbers can track their work hours and Branch Admins can monitor attendance*

### Story 1.1: Barber Clock In

As a **Barber**,
I want to **clock in with a single tap when I arrive at work**,
So that **my attendance is recorded automatically without paperwork**.

**Acceptance Criteria:**

**Given** I am a logged-in barber who is not currently clocked in
**When** I tap the "Clock In" button on my dashboard
**Then** the system records my time-in with current timestamp
**And** I see a success message "Welcome back, [name]!"
**And** the button changes to show "Clock Out" state
**And** the action completes within 1 second (NFR4)

**Given** I am already clocked in
**When** I view my dashboard
**Then** I see a "Clock Out" button (not "Clock In")
**And** I see my current shift duration

**Technical Notes:**
- Creates `timeAttendance` table with fields: barber_id, branch_id, clock_in, clock_out, created_at
- Creates `clockIn` mutation in `timeAttendance.ts` service
- Creates `getBarberClockStatus` query
- Creates `ClockButton` component (clock-in state)

---

### Story 1.2: Barber Clock Out

As a **Barber**,
I want to **clock out when I finish my shift**,
So that **my total hours worked are recorded for payroll**.

**Acceptance Criteria:**

**Given** I am a logged-in barber who is currently clocked in
**When** I tap the "Clock Out" button
**Then** the system records my time-out with current timestamp
**And** I see my total hours worked for this shift
**And** the button changes to show "Clock In" state
**And** the action completes within 1 second (NFR4)

**Given** I forgot to clock out yesterday
**When** I clock in today
**Then** I can still clock in (previous shift auto-closed at midnight)

**Technical Notes:**
- Creates `clockOut` mutation in `timeAttendance.ts`
- Updates `ClockButton` component (clock-out state with hours display)
- Handles edge case of unclosed shifts

---

### Story 1.3: Branch Admin View Attendance

As a **Branch Admin**,
I want to **view attendance records for all barbers in my branch**,
So that **I can track who's working and manage payroll**.

**Acceptance Criteria:**

**Given** I am a logged-in branch admin
**When** I navigate to the Attendance section
**Then** I see a list of barbers with their current clock status (In/Out)
**And** I can see today's attendance by default

**Given** I am viewing attendance records
**When** I select a specific date or date range
**Then** I see attendance records filtered by that period
**And** I see total hours worked per barber

**Given** I am a branch admin for Branch A
**When** I view attendance
**Then** I only see barbers from Branch A (branch isolation - NFR6)

**Technical Notes:**
- Creates `getAttendanceRecords` query with branch_id filtering
- Creates `TimeAttendanceView.jsx` in `src/components/staff/`
- Implements date range filtering
- Uses StatusBadge for clock in/out status

---

## Epic 2: Central Product Catalog

*Super Admin can manage a centralized product catalog with optional price enforcement*

### Story 2.1: Super Admin Add Product to Catalog

As a **Super Admin**,
I want to **add products to a central catalog**,
So that **all branches have access to approved products with correct pricing**.

**Acceptance Criteria:**

**Given** I am a logged-in super admin
**When** I navigate to Product Catalog and click "Add Product"
**Then** I see a form with fields: name, description, price (MSRP), category, image
**And** I can submit to create the product

**Given** I submit a valid product form
**When** the product is created
**Then** the product appears in the catalog immediately
**And** the product is visible to all branches in real-time (NFR2)

**Given** I try to add a product without required fields
**When** I submit the form
**Then** I see validation errors for missing fields

**Technical Notes:**
- Creates `productCatalog` table with fields: name, description, price, category, image_url, is_active, price_enforced, created_at
- Creates `addProduct` mutation in `productCatalog.ts` service
- Creates `ProductCatalogManager.jsx` in `src/components/admin/`

---

### Story 2.2: Super Admin Edit and Remove Products

As a **Super Admin**,
I want to **edit or remove products from the catalog**,
So that **I can keep the product list accurate and up-to-date**.

**Acceptance Criteria:**

**Given** I am viewing the product catalog
**When** I click on a product
**Then** I can edit its details (name, description, price, category, image)
**And** changes sync to all branches within 5 seconds (NFR2)

**Given** I want to remove a product
**When** I click "Remove" and confirm
**Then** the product is soft-deleted (marked inactive)
**And** branches no longer see this product

**Technical Notes:**
- Creates `updateProduct` and `removeProduct` mutations
- Implements soft delete via `is_active` flag

---

### Story 2.3: Super Admin Price Enforcement Toggle

As a **Super Admin**,
I want to **toggle price enforcement for products**,
So that **I can control whether branches can change prices**.

**Acceptance Criteria:**

**Given** I am editing a product
**When** I toggle "Enforce MSRP" on
**Then** branches cannot modify the price for this product
**And** the product displays the enforced price to all branches

**Given** "Enforce MSRP" is off for a product
**When** a branch views the product
**Then** they see the MSRP as suggested price (informational only)

**Technical Notes:**
- Adds `price_enforced` boolean field to productCatalog table
- Creates `togglePriceEnforcement` mutation

---

### Story 2.4: Branch Staff View Product Catalog

As a **Branch Staff**,
I want to **view the central product catalog**,
So that **I know what products are available to sell and at what price**.

**Acceptance Criteria:**

**Given** I am a logged-in branch staff or branch admin
**When** I navigate to Product Catalog
**Then** I see all active products from the central catalog
**And** I see the price (MSRP or enforced price)
**And** I see product images and categories

**Given** super admin adds or updates a product
**When** I refresh my view
**Then** I see the changes in real-time (Convex subscription)

**Technical Notes:**
- Creates `getCatalogProducts` query
- Creates read-only product list view for branch staff

---

## Epic 3: Branch Financial Reporting (P&L)

*Branch Admins can view their financial performance and export reports*

### Story 3.1: P&L Dashboard with Summary Cards

As a **Branch Admin**,
I want to **see my branch's financial summary at a glance**,
So that **I know if my branch is profitable without digging through data**.

**Acceptance Criteria:**

**Given** I am a logged-in branch admin
**When** I navigate to the Accounting section
**Then** I see three summary cards: Total Revenue, Total Expenses, Net Income
**And** the cards show current month data by default
**And** the dashboard loads within 3 seconds (NFR1)
**And** summary cards are visible without scrolling (UX4)

**Given** I view the P&L dashboard
**When** the data is loading
**Then** I see skeleton loaders (not spinners - UX7)

**Technical Notes:**
- Creates `accounting.ts` service with `getPLSummary` query
- Creates `MetricCard` component
- Creates `AccountingDashboard.jsx` in `src/components/staff/`
- Aggregates from existing `transactions` table

---

### Story 3.2: Income and Expense Breakdown

As a **Branch Admin**,
I want to **see income breakdown by category and expenses by type**,
So that **I understand where money is coming from and going**.

**Acceptance Criteria:**

**Given** I am viewing the P&L dashboard
**When** I tap on the Revenue card
**Then** I see income breakdown by category (services, products)

**Given** I am viewing the P&L dashboard
**When** I tap on the Expenses card
**Then** I see expense breakdown by type

**Given** I want to see revenue by barber
**When** I view the barber breakdown section
**Then** I see each barber's contribution to revenue

**Technical Notes:**
- Creates `getIncomeByCategory` and `getExpenseByCategory` queries
- Creates `getRevenueByBarber` query
- Expandable card pattern for drill-down

---

### Story 3.3: Date Range Selection for P&L

As a **Branch Admin**,
I want to **select different time periods for P&L reports**,
So that **I can compare monthly or yearly performance**.

**Acceptance Criteria:**

**Given** I am viewing the P&L dashboard
**When** I select "This Month" / "Last Month" / "This Year" / "Custom Range"
**Then** all financial data updates to reflect the selected period

**Given** I select a custom date range
**When** I pick start and end dates
**Then** I see P&L data for exactly that period

**Technical Notes:**
- Adds date range parameters to all accounting queries
- Uses existing date picker component

---

### Story 3.4: Export P&L to CSV and PDF

As a **Branch Admin**,
I want to **export P&L reports to CSV and PDF**,
So that **I can submit them for BIR tax filing**.

**Acceptance Criteria:**

**Given** I am viewing P&L data for a specific period
**When** I tap "Export" and select "CSV"
**Then** a CSV file downloads with all P&L line items

**Given** I am viewing P&L data
**When** I tap "Export" and select "PDF"
**Then** a formatted PDF report downloads
**And** the PDF includes branch name, period, and all financial data

**Technical Notes:**
- Creates `exportPLReport` action using jsPDF
- CSV export using browser download API

---

## Epic 4: Cash Advance Workflow

*Barbers can request advances and Branch Admins can approve with automatic payroll integration*

### Story 4.1: Barber Request Cash Advance

As a **Barber**,
I want to **request a cash advance through the app**,
So that **I can get emergency funds without awkward conversations**.

**Acceptance Criteria:**

**Given** I am a logged-in barber with no active advance
**When** I navigate to Cash Advance and tap "Request"
**Then** I see a form with amount field and optional reason
**And** I see my maximum available amount (50% of avg 2-week earnings)

**Given** I enter a valid amount and submit
**When** the request is created
**Then** I see confirmation "Request submitted"
**And** the request completes within 2 seconds (NFR3)

**Given** I request more than 50% of my average earnings
**When** I submit the form
**Then** I see an error with my maximum allowed amount (FR21)

**Given** I already have an active (pending or approved) advance
**When** I try to request another
**Then** I see a message that I must repay my current advance first (FR22)

**Technical Notes:**
- Creates `cashAdvances` table with fields: barber_id, branch_id, amount, reason, status, requested_at, decided_at, decided_by
- Creates `requestAdvance` mutation with validation
- Creates `CashAdvanceRequest.jsx` in `src/components/barber/`
- Privacy: Only barber and branch admin can see (NFR7)

---

### Story 4.2: Barber View Advance Status

As a **Barber**,
I want to **see the status of my cash advance request**,
So that **I know if it's approved and when I'll be repaid**.

**Acceptance Criteria:**

**Given** I have submitted a cash advance request
**When** I view my Cash Advance section
**Then** I see my request with status (Pending/Approved/Rejected)
**And** I see the amount requested and date

**Given** my advance is approved
**When** I view the details
**Then** I see when it will be deducted from payroll

**Technical Notes:**
- Creates `getBarberAdvanceStatus` query
- Uses StatusBadge component for status display

---

### Story 4.3: Branch Admin Approve or Reject Advance

As a **Branch Admin**,
I want to **review and decide on cash advance requests**,
So that **I can help my barbers while managing cash flow**.

**Acceptance Criteria:**

**Given** I am a logged-in branch admin
**When** I have pending cash advance requests
**Then** I see a notification badge
**And** I receive an in-app notification (FR43)

**Given** I view a pending request
**When** I see the ApprovalCard
**Then** I see: barber name, amount, reason, available balance, request date
**And** I can approve or reject in < 5 seconds (UX3)

**Given** I approve a request
**When** I tap "Approve"
**Then** the status changes to "Approved"
**And** the barber receives a notification (FR44)

**Given** I reject a request
**When** I tap "Reject" and provide a reason
**Then** the status changes to "Rejected"
**And** the barber receives a notification with the reason

**Technical Notes:**
- Creates `getAdvanceRequests` query (pending only)
- Creates `approveAdvance` and `rejectAdvance` mutations
- Creates `CashAdvanceApproval.jsx` in `src/components/staff/`
- Creates `ApprovalCard` component
- Extends notifications service for cash advance types

---

### Story 4.4: Payroll Integration for Cash Advance

As a **Barber**,
I want to **see my cash advance automatically deducted from payroll**,
So that **repayment is handled without manual tracking**.

**Acceptance Criteria:**

**Given** I have an approved cash advance
**When** my next payroll is calculated
**Then** the advance amount is automatically deducted
**And** my payroll breakdown shows "Cash Advance Repayment: -₱X,XXX"

**Given** I view my payroll history
**When** I see a period with a cash advance deduction
**Then** I see the deduction as a clear line item (FR28)

**Technical Notes:**
- Extends `payroll.ts` with `getCashAdvanceDeductions()` function
- Integrates deduction into existing payroll calculation
- Updates advance status to "Repaid" after deduction

---

### Story 4.5: Branch Admin View Advance History

As a **Branch Admin**,
I want to **view cash advance history for my branch**,
So that **I can track patterns and manage cash flow**.

**Acceptance Criteria:**

**Given** I am a logged-in branch admin
**When** I navigate to Cash Advance History
**Then** I see all advances for my branch (past and current)
**And** I see: barber name, amount, status, dates

**Given** I am a super admin
**When** I try to view cash advance details
**Then** I cannot see individual advance details (privacy - AR8)

**Technical Notes:**
- Creates `getAdvanceHistory` query with branch_id filtering
- Enforces privacy: super admin excluded from individual records

---

## Epic 5: Royalty Management System

*Super Admin can configure, track, and collect royalty payments from franchisees*

### Story 5.1: Configure Royalty Rate for Branch

As a **Super Admin**,
I want to **set royalty rates for each branch**,
So that **franchisees know exactly what they owe**.

**Acceptance Criteria:**

**Given** I am a logged-in super admin
**When** I navigate to a branch's Royalty Settings
**Then** I can set royalty type: Percentage or Fixed Amount

**Given** I select Percentage
**When** I enter a rate (e.g., 10%)
**Then** the branch will owe that % of monthly revenue

**Given** I select Fixed Amount
**When** I enter an amount (e.g., ₱20,000)
**Then** the branch will owe that fixed amount monthly

**Given** I save the royalty configuration
**When** the billing cycle runs
**Then** the system calculates based on these settings

**Technical Notes:**
- Creates `royaltyConfig` table with fields: branch_id, type (percentage/fixed), rate, billing_cycle, created_at
- Creates `setRoyaltyConfig` mutation in `royalty.ts` service
- Creates `RoyaltyManagement.jsx` in `src/components/admin/`

---

### Story 5.2: System Calculate and Create Royalty Payment

As a **System**,
I want to **automatically calculate royalty amounts each billing cycle**,
So that **branch admins receive accurate billing**.

**Acceptance Criteria:**

**Given** a branch has royalty configured
**When** the billing cycle triggers (1st of month)
**Then** the system calculates the royalty amount
**And** creates a royalty payment record with status "Due"

**Given** royalty type is Percentage
**When** the system calculates
**Then** royalty = branch revenue × configured percentage

**Given** royalty type is Fixed
**When** the system calculates
**Then** royalty = configured fixed amount

**Technical Notes:**
- Creates `royaltyPayments` table with fields: branch_id, period, amount, status, due_date, paid_at
- Creates scheduled function or manual trigger for calculation
- Uses accounting service to get branch revenue

---

### Story 5.3: Email Notification for Royalty Due

As a **Branch Admin**,
I want to **receive email when royalty is due**,
So that **I know exactly what to pay and when**.

**Acceptance Criteria:**

**Given** a royalty payment is created
**When** the system sends notification
**Then** branch admin receives email with: amount due, due date, payment instructions

**Given** the email is sent
**When** delivery is attempted
**Then** delivery rate is tracked (>95% target - NFR13)

**Given** email delivery fails
**When** the system logs the failure
**Then** the notification is retryable (NFR18)

**Technical Notes:**
- Extends `notifications.ts` with royalty email type
- Uses Resend API for email delivery
- Logs delivery status for monitoring

---

### Story 5.4: Super Admin View Royalty Dashboard

As a **Super Admin**,
I want to **see royalty status for all branches at a glance**,
So that **I know who has paid and who is overdue**.

**Acceptance Criteria:**

**Given** I am a logged-in super admin
**When** I navigate to Royalty Dashboard
**Then** I see all branches with their royalty status
**And** I see: branch name, amount due, due date, status (Paid/Pending/Overdue)

**Given** a branch is overdue
**When** I view the dashboard
**Then** that branch is highlighted with red status indicator

**Given** I want to filter
**When** I select a status filter
**Then** I see only branches matching that status

**Technical Notes:**
- Creates `getBranchRoyaltyStatus` query
- Creates `BranchStatusCard` component
- Uses traffic light status (green/yellow/red - UX5)

---

### Story 5.5: Mark Royalty as Paid with Official Receipt

As a **Super Admin**,
I want to **mark royalty as paid and generate an official receipt**,
So that **franchisees have documentation for their records**.

**Acceptance Criteria:**

**Given** I view a branch with "Due" or "Overdue" royalty
**When** I click "Mark as Paid"
**Then** the status changes to "Paid"
**And** the system generates an official receipt (OR)

**Given** an OR is generated
**When** I view the receipt
**Then** I see: OR number (sequential), branch name, amount, payment date, period covered

**Given** the OR numbering system
**When** each OR is created
**Then** the number is unique and sequential (NFR11)

**Technical Notes:**
- Creates `officialReceipts` table with fields: receipt_number, payment_id, branch_id, amount, issued_at
- Creates `markRoyaltyPaid` and `generateOR` mutations
- Implements atomic increment for sequential numbering

---

### Story 5.6: Branch Admin View Royalty History

As a **Branch Admin**,
I want to **view my royalty payment history and current amount due**,
So that **I can track my franchise obligations**.

**Acceptance Criteria:**

**Given** I am a logged-in branch admin
**When** I navigate to Royalty section
**Then** I see my current royalty amount due (if any)
**And** I see my payment history

**Given** I have past payments
**When** I view history
**Then** I see: period, amount, payment date, OR number

**Given** I want to view a receipt
**When** I tap on a paid period
**Then** I can view or download the official receipt

**Technical Notes:**
- Creates `getRoyaltyPayments` query filtered by branch
- Creates Branch Admin royalty view in staff components
