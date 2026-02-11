---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - _bmad-output/analysis/brainstorming-session-2026-01-25.md
  - docs/index.md
  - docs/project_details.md
  - docs/CONVEX_DATABASE_SCHEMA.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 4
classification:
  projectType: saas_b2b_webapp
  domain: smb_retail_service
  complexity: medium-high
  projectContext: brownfield
---

# Product Requirements Document - tpx-booking-app

**Author:** MASTERPAINTER
**Date:** 2026-01-25
**Version:** 1.0 (MVP)

## Executive Summary

TipunoX Booking App is a **proprietary franchise management system** for the TipunoX barbershop network. This PRD defines enhancements to transform the existing booking system into a complete franchise operations platform.

**Product Differentiator:** Unlike competitors focused on single-shop operations, TipunoX is built for multi-branch franchise operations with clear franchisor/franchisee separation, automated royalty management, and centralized product control.

**MVP Scope:** 5 new capabilities targeting 1-week delivery:
1. **Accounting** - Branch-level P&L dashboards with BIR-compliant exports
2. **Royalty Management** - Automated billing with email notifications and official receipts
3. **Cash Advance** - Digital workflow integrated with existing payroll
4. **Product Catalog** - Centralized management with price enforcement
5. **Time Tracking** - Simple barber attendance logging

**Target Users:** Super Admin (franchisor), Branch Admin (franchisee), Barber (employee)

---

## Success Criteria

### User Success

| Role | Feature | Success Moment |
|------|---------|----------------|
| **Branch Admin** | Accounting | Can view monthly and yearly income/expenses at a glance without manual spreadsheets |
| **Branch Admin** | Royalty | Receives email notifications when royalty is due, knows exactly what to pay |
| **Barber** | Cash Advance | Can request an advance, see approval status, and understand repayment schedule |
| **Super Admin** | Product Mgmt | Has centralized control over product catalog across all branches |
| **Super Admin** | Royalty | Can track which branches have paid, which are overdue |

### Business Success

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Branch financial visibility | 100% of branches using P&L reports | 3 months post-launch |
| Royalty collection rate | Reduce overdue royalties by 50% via email reminders | 6 months |
| Cash advance adoption | 80% of barbers aware of the feature | 3 months |
| Product catalog consistency | All branches using centralized product catalog | 3 months |

### Technical Success

- Accounting data accurate to the transaction level
- Email delivery rate for royalty notifications > 95%
- Cash advance calculations integrated with existing payroll (no manual intervention)
- Product catalog syncs across branches in real-time

### Measurable Outcomes

- Branch admins spend 0 hours on manual P&L spreadsheets (down from current manual tracking)
- Royalty payment reminders sent automatically on billing cycle
- Cash advances processed and reflected in next payroll without staff intervention
- Product catalog changes propagate to all branches within seconds

## User Journeys

### Journey 1: Maria the Branch Admin - Monthly Financial Review

**Opening Scene:** Maria manages the Makati branch. It's the end of the month, and the owner (super admin) is asking for revenue numbers. Previously, Maria had to export transaction data and manually calculate in Excel.

**Rising Action:** Maria logs into the staff dashboard and navigates to the new "Accounting" section. She selects "January 2026" and the system instantly shows:
- Total Revenue: ₱185,000
- Total Expenses: ₱42,000
- Net Income: ₱143,000

**Climax:** Maria sees a breakdown by category - services revenue, product sales, and expenses. She can drill down to see which barbers brought in the most revenue.

**Resolution:** Maria screenshots the P&L and sends it to the owner in 2 minutes instead of 2 hours. She feels in control and confident about her branch performance.

**Capabilities Revealed:** P&L dashboard, date range filtering, category breakdown, barber revenue drill-down

---

### Journey 2: Carlos the Barber - Emergency Cash Advance

**Opening Scene:** Carlos is a top barber at the Quezon City branch. His child has a sudden medical expense. He needs ₱5,000 immediately but payday is 2 weeks away.

**Rising Action:** Carlos opens the app and sees a "Cash Advance" option in his dashboard. He requests ₱5,000, selects "Deduct from next payroll," and adds a brief reason.

**Climax:** The branch admin receives a notification, reviews Carlos's request and payroll history, and approves it within 30 minutes.

**Resolution:** Carlos receives confirmation that his advance is approved. On payday, he sees the ₱5,000 automatically deducted, with a clear line item showing "Cash Advance Repayment." No awkward conversations, no manual tracking.

**Capabilities Revealed:** Cash advance request form, approval workflow, notification system, payroll integration, repayment tracking

---

### Journey 3: Super Admin (Owner) - Setting Up Royalty for a New Branch

**Opening Scene:** The business is expanding. A new franchisee is opening a branch in Cebu. The super admin needs to configure how much royalty the new branch will pay.

**Rising Action:** Super admin goes to "Branch Settings" > "Royalty Configuration." They select the Cebu branch, set the royalty type to "Percentage" at 10% of monthly revenue, and set billing cycle to "Monthly."

**Climax:** The system confirms the setup. Super admin sees a preview: "Cebu branch will be billed 10% of monthly revenue on the 1st of each month. Email notification will be sent to [branch admin email]."

**Resolution:** On the 1st of February, the Cebu branch admin receives an email: "Your January royalty is ₱15,000 (10% of ₱150,000 revenue). Please remit by Feb 15." The super admin can see all branches' royalty status in one dashboard.

**Capabilities Revealed:** Royalty configuration (percentage/fixed), billing cycle setup, email notifications, royalty dashboard, branch-level tracking

---

### Journey 4: Super Admin - Centralizing Product Catalog

**Opening Scene:** The owner realizes different branches are selling products at different prices, and some branches have unauthorized products. There's no consistency.

**Rising Action:** Super admin goes to "Product Management" and sees the current products table is branch-specific. They click "Centralize Catalog" and create a master product list with official prices.

**Climax:** Super admin adds 15 official products with MSRP, categories, and images. They toggle "Enforce pricing" so branches cannot change prices.

**Resolution:** All branches now see the same product catalog. Branch staff can only sell from the approved list. Super admin can push new products or price changes to all branches instantly.

**Capabilities Revealed:** Centralized product catalog, MSRP management, price enforcement toggle, multi-branch sync, product CRUD operations

---

### Journey Requirements Summary

| Journey | User Type | Key Capabilities Required |
|---------|-----------|---------------------------|
| Monthly Financial Review | Branch Admin | P&L dashboard, date filtering, category breakdown, drill-down reports |
| Emergency Cash Advance | Barber + Branch Admin | Request form, approval workflow, notifications, payroll integration |
| Royalty Setup | Super Admin | Royalty configuration, billing cycles, email automation, status dashboard |
| Product Centralization | Super Admin | Central catalog CRUD, pricing control, multi-branch sync |

**Cross-Cutting Requirements:**
- Role-based access control (existing, to be extended)
- Email notification system (existing via Resend, to be extended)
- Real-time data sync (existing via Convex subscriptions)
- Mobile-responsive UI (existing pattern to follow)

## Domain-Specific Requirements

### Financial Data Integrity
- P&L reports calculated from system transactions only (no manual entries in MVP)
- All financial transactions include audit fields (created_by, created_at, updated_at)

### Cash Advance Constraints
- **Eligibility:** Barbers only (employees with payroll)
- Maximum advance: 50% of barber's average 2-week earnings
- One active advance per barber at a time
- **Approval:** Branch admin (franchise owner)
- **Visibility:** Barber + branch admin only (not visible to super admin)

### Royalty Management
- Royalty paid by branch admin (franchisee) to super admin (franchisor)
- Super admin manually confirms payment receipt
- Royalty history preserved even if rate changes

### Time Tracking
- Simple time in/time out for barbers
- Branch admin visibility only (super admin excluded)

### Data Retention
- Financial and attendance records retained indefinitely

## Innovation & Novel Patterns

### Detected Innovation Areas

**Franchise-Ready Architecture:** Unlike competitors that focus on single-shop operations, TipunoX is built from the ground up for multi-branch franchise operations with clear franchisor/franchisee separation.

| Competitor Approach | TipunoX Approach |
|---------------------|--------------|
| Single-shop POS | Multi-branch with data isolation |
| No royalty tracking | Automated royalty billing + email |
| Branch sets own prices | Centralized product catalog with MSRP enforcement |
| No franchisor visibility | HQ consolidated P&L (growth feature) |
| Generic HR features | Barber-focused cash advance + time tracking |

### Market Context & Competitive Landscape

Philippine barbershop software market primarily serves independent shops. No dominant player offers integrated franchise management (royalty, centralized products, HQ consolidated reporting). TipunoX fills this gap by targeting barbershop franchise operators or shops planning to scale.

### Validation Approach

- Test with existing TipunoX branches first (dogfooding)
- Measure time saved on royalty tracking and P&L generation
- Survey franchisees on cash advance feature adoption

## Proprietary Franchise System Requirements

### Project-Type Overview

TipunoX is a **proprietary franchise management system** built exclusively for the TipunoX barbershop franchise network. Unlike commercial SaaS products targeting the general market, this is an internal tool designed specifically for the franchise's operational needs.

**Deployment Model:** Single-tenant, proprietary system
**Target Users:** TipunoX franchise network only (franchisor + franchisees)
**No External Sales:** Not intended for licensing or resale

### Compliance Requirements

| Requirement | Scope | MVP Support |
|-------------|-------|-------------|
| **BIR Reporting** | P&L data must be exportable for tax filing purposes | Export to CSV/PDF format |
| **Official Receipts** | Royalty payments require OR for franchisee records | Generate OR number, printable receipt |

### Technical Architecture Considerations

**Existing Infrastructure:**
- Convex serverless backend (real-time subscriptions)
- Multi-branch data isolation via `branch_id`
- Role-based access control (6 user roles)
- Email via Resend API
- Payment processing via Xendit

**New Capabilities Required:**
- Financial calculation engine for P&L reports
- Email notification scheduling for royalty reminders
- Cash advance workflow with payroll integration
- Product catalog management with branch sync

### Implementation Considerations

**Data Integrity:**
- Financial calculations derived from transaction data only
- Audit trail for all financial operations
- Branch-level data isolation maintained

**User Experience:**
- Mobile-first design (existing pattern)
- Real-time updates via Convex subscriptions
- Consistent with existing dashboard patterns

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
Each feature directly solves a specific operational pain point identified by the franchise:
- Manual P&L tracking → Automated financial reports
- Royalty payment chasing → Email reminders with clear amounts
- Cash advance paperwork → Digital workflow with payroll integration
- Inconsistent product pricing → Centralized catalog with enforcement

**Scope Assessment:** Medium-complexity brownfield enhancement adding 5 new capabilities to an existing, working system with established infrastructure.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
1. Branch Admin - Monthly Financial Review (P&L dashboard)
2. Barber - Emergency Cash Advance (request → approval → deduction)
3. Super Admin - Royalty Setup (config + email automation)
4. Super Admin - Product Centralization (catalog CRUD + sync)

**Must-Have Capabilities:**

| Feature | MVP Scope |
|---------|-----------|
| **Accounting** | Branch-level P&L view (monthly/yearly), basic income/expense categories, CSV/PDF export for BIR |
| **Royalty** | Super admin sets royalty rate per branch, email notifications on billing cycle, official receipt generation |
| **Cash Advance** | Barber request form, branch admin approval, auto-deduction from payroll, repayment tracking |
| **Product Mgmt** | Super admin product catalog CRUD, branch visibility of catalog, optional price enforcement |
| **Time Tracking** | Barber time in/out, branch admin attendance view |

### Post-MVP Features

**Phase 2 (Growth):**
- Balance Sheet generation
- HQ Consolidated P&L (all branches combined)
- Royalty payment tracking with partial payments
- Cash advance installment plans and percentage caps
- Product inventory tracking across branches
- External revenue tracking (shop visits, gigs)

**Phase 3 (Vision/Expansion):**
- Automated accounting journal entries from all transactions
- Royalty auto-collection via payment gateway integration
- AI-powered financial insights and anomaly detection
- Multi-currency support for international expansion

### Risk Mitigation Strategy

| Risk Type | Risk | Mitigation |
|-----------|------|------------|
| **Technical** | Financial calculations must be accurate | Use existing transaction data as single source of truth; no manual entry in MVP |
| **Integration** | Cash advance must integrate with payroll | Leverage existing payroll service in `convex/services/payroll.ts` |
| **Adoption** | Branch admins may resist new workflows | Use familiar UI patterns consistent with existing dashboard; clear value proposition |
| **Data Quality** | P&L accuracy depends on complete transaction data | MVP reports what's in the system; flag data gaps for user awareness |
| **Compliance** | BIR export format requirements | Standard CSV/PDF export; official receipt numbering system |

## Functional Requirements

### Financial Reporting

- **FR1:** Branch Admin can view monthly income summary for their branch
- **FR2:** Branch Admin can view monthly expense summary for their branch
- **FR3:** Branch Admin can view yearly income summary for their branch
- **FR4:** Branch Admin can view yearly expense summary for their branch
- **FR5:** Branch Admin can view net income (P&L) for a selected time period
- **FR6:** Branch Admin can view income breakdown by category (services, products)
- **FR7:** Branch Admin can view revenue breakdown by barber
- **FR8:** Branch Admin can export P&L report to CSV format
- **FR9:** Branch Admin can export P&L report to PDF format

### Royalty Management

- **FR10:** Super Admin can configure royalty rate (percentage) for a branch
- **FR11:** Super Admin can configure royalty rate (fixed amount) for a branch
- **FR12:** Super Admin can set billing cycle (monthly) for a branch
- **FR13:** System can calculate royalty amount based on branch revenue and configured rate
- **FR14:** System can send email notification to Branch Admin when royalty is due
- **FR15:** Super Admin can view royalty status for all branches (paid/unpaid/overdue)
- **FR16:** Super Admin can manually mark a royalty payment as received
- **FR17:** System can generate official receipt (OR) for royalty payment
- **FR18:** Branch Admin can view their royalty payment history
- **FR19:** Branch Admin can view current royalty amount due

### Cash Advance

- **FR20:** Barber can submit a cash advance request with amount and reason
- **FR21:** System can validate cash advance does not exceed 50% of barber's average 2-week earnings
- **FR22:** System can reject cash advance if barber has an existing active advance
- **FR23:** Branch Admin can view pending cash advance requests for their branch
- **FR24:** Branch Admin can approve a cash advance request
- **FR25:** Branch Admin can reject a cash advance request
- **FR26:** Barber can view status of their cash advance request (pending/approved/rejected)
- **FR27:** System can automatically deduct approved advance from barber's next payroll
- **FR28:** Barber can view cash advance repayment in their payroll breakdown
- **FR29:** Branch Admin can view cash advance history for barbers in their branch

### Product Catalog Management

- **FR30:** Super Admin can add a product to the central catalog
- **FR31:** Super Admin can edit product details (name, description, price, category, image)
- **FR32:** Super Admin can remove a product from the central catalog
- **FR33:** Super Admin can set MSRP (manufacturer's suggested retail price) for a product
- **FR34:** Super Admin can toggle price enforcement (branches cannot change price)
- **FR35:** Super Admin can view all products in the central catalog
- **FR36:** Branch Staff can view products available in the central catalog
- **FR37:** System can sync product catalog changes to all branches in real-time

### Time & Attendance

- **FR38:** Barber can record time-in for a work shift
- **FR39:** Barber can record time-out for a work shift
- **FR40:** Branch Admin can view attendance records for barbers in their branch
- **FR41:** Branch Admin can view attendance for a specific date or date range

### Notifications & Alerts

- **FR42:** System can send email notification to Branch Admin when royalty billing cycle triggers
- **FR43:** Branch Admin can receive in-app notification of pending cash advance requests
- **FR44:** Barber can receive notification when cash advance is approved or rejected

## Non-Functional Requirements

### Performance

- **NFR1:** P&L dashboard loads within 3 seconds for monthly view
- **NFR2:** Product catalog sync propagates to branches within 5 seconds
- **NFR3:** Cash advance request submission completes within 2 seconds
- **NFR4:** Time in/out recording completes within 1 second

### Security

- **NFR5:** All data transmissions use HTTPS/TLS encryption
- **NFR6:** Branch data isolation ensures branches cannot access other branches' data
- **NFR7:** Cash advance details visible only to requesting barber and approving branch admin
- **NFR8:** Financial data (P&L, royalty) requires authenticated access
- **NFR9:** All financial operations logged with audit trail (user, timestamp, action)

### Data Integrity

- **NFR10:** P&L calculations derived solely from transaction data (no manual override in MVP)
- **NFR11:** Official receipt numbers are unique and sequential
- **NFR12:** Cash advance deductions appear in payroll only after admin approval

### Integration

- **NFR13:** Email notifications delivered via Resend API with >95% delivery rate
- **NFR14:** Cash advance integrates with existing payroll service without manual intervention
- **NFR15:** Real-time data sync via Convex subscriptions for all dashboards

### Reliability

- **NFR16:** System available during business hours (6 AM - 10 PM PHT)
- **NFR17:** Financial data retained indefinitely (no automatic deletion)
- **NFR18:** Failed email notifications logged and retryable
