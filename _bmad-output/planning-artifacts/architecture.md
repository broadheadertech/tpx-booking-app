---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - docs/index.md
  - docs/project_details.md
  - docs/CONVEX_DATABASE_SCHEMA.md
  - docs/convex-services-documentation.md
workflowType: 'architecture'
project_name: 'tpx-booking-app'
user_name: 'MASTERPAINTER'
date: '2026-01-25'
lastStep: 8
status: 'complete'
completedAt: '2026-01-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
44 requirements across 5 MVP feature areas:

| Feature | FRs | Core Capabilities |
|---------|-----|-------------------|
| Financial Reporting | FR1-FR9 | P&L dashboard, income/expense tracking, CSV/PDF export |
| Royalty Management | FR10-FR19 | Rate configuration, auto-calculation, email reminders, OR generation |
| Cash Advance | FR20-FR29 | Request workflow, eligibility validation, auto-payroll deduction |
| Product Catalog | FR30-FR37 | Central CRUD, MSRP management, price enforcement, branch sync |
| Time Tracking | FR38-FR41 | Time in/out recording, attendance views |
| Notifications | FR42-FR44 | Royalty emails, cash advance alerts |

**Non-Functional Requirements:**
18 requirements shaping architectural decisions:

| Category | Key Requirements |
|----------|------------------|
| Performance | P&L <3s, catalog sync <5s, clock-in <1s |
| Security | Branch isolation, cash advance privacy, HTTPS, audit trails |
| Data Integrity | Transaction-derived P&L, sequential OR numbers, approval-gated deductions |
| Integration | Resend email >95%, payroll service integration, Convex real-time |
| Reliability | 6AM-10PM availability, indefinite data retention, retryable failed emails |

**Scale & Complexity:**

- Primary domain: Full-stack hybrid (React 19 + Convex + Capacitor)
- Complexity level: Medium-High
- Estimated architectural components: 5 feature modules + 5 custom UI components

### Technical Constraints & Dependencies

**Brownfield Constraints:**
- Must integrate with existing Convex schema (24 tables)
- Must reuse existing services (auth, bookings, payments, payroll, notifications)
- UI must follow established patterns (dark theme, orange accent, TailwindCSS 4)
- Mobile must work within Capacitor wrapper

**Infrastructure Dependencies:**
- Convex real-time database for all data operations
- Existing payroll.ts service for cash advance deductions
- Resend API for royalty email notifications
- Existing RBAC system (6 roles: super_admin, admin, branch_admin, staff, barber, customer)

**Technical Stack (Locked):**
- Frontend: React 19.1.1 + Vite 7.0.6 + TailwindCSS 4.1.11
- Backend: Convex 1.26.1 (serverless, real-time)
- Mobile: Capacitor 7.4.3
- UI Components: shadcn/ui (Tailwind-native)

### Cross-Cutting Concerns Identified

| Concern | Affected Features | Implementation Approach |
|---------|-------------------|------------------------|
| Branch Isolation | All 5 features | Existing branch_id filtering pattern |
| Audit Logging | Financial, Royalty, Cash Advance | Extend existing audit trail pattern |
| Role-Based Access | All features | Leverage existing 6-role RBAC |
| Real-Time Updates | All dashboards | Convex subscriptions (existing pattern) |
| Email Notifications | Royalty, Cash Advance | Extend existing notification service |
| Mobile Compatibility | All features | 44px touch targets, bottom navigation |
| Accessibility | All UI | WCAG AA, color-independent status indicators |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack hybrid (React + Convex + Capacitor) - **Established brownfield project**

### Existing Foundation (Not Evaluating New Starters)

This is a brownfield enhancement project. The technical foundation is already established and validated in production.

**Rationale:** New features (Accounting, Royalty, Cash Advance, Product Catalog, Time Tracking) must integrate with the existing codebase rather than establish new patterns.

### Architectural Decisions Already Established

**Language & Runtime:**
- TypeScript across frontend and backend
- React 19.1.1 with modern hooks
- Convex serverless functions (TypeScript)

**Styling Solution:**
- TailwindCSS 4.1.11 with custom color palette
- shadcn/ui components (Tailwind-native)
- Dark theme (#0A0A0A) with orange accent (#FF8C42)

**Build Tooling:**
- Vite 7.0.6 for development and production builds
- Manual chunk optimization (vendor, router, convex)
- Capacitor for mobile deployment

**Testing Framework:**
- TestSprite for automated testing
- Jest for unit tests
- Manual QA workflows

**Code Organization:**
```
src/
├── components/        # By role: admin, staff, customer, barber, common
├── pages/             # Route-based pages
├── context/           # React Context providers (Auth, Notification, Toast)
├── hooks/             # Custom React hooks
├── services/          # Frontend services
├── utils/             # Utility functions
└── styles/            # Global styles

convex/
├── services/          # 27 service modules
├── utils/             # Backend utilities
├── schema.ts          # Database schema (24 tables)
└── http.ts            # HTTP endpoints
```

**Development Experience:**
- Hot module replacement via Vite
- Convex dev mode with real-time sync
- Android development via Android Studio
- Semantic versioning with auto-deploy scripts

**Note:** Project foundation is established. New feature implementation should follow existing patterns and integrate with current services.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- New database schema extensions for 5 features
- Cash advance ↔ payroll integration pattern
- Official receipt numbering for BIR compliance

**Important Decisions (Shape Architecture):**
- P&L calculation strategy
- Email notification extension
- Component organization pattern

**Deferred Decisions (Post-MVP):**
- Cached financial aggregates (if performance needs)
- Consolidated HQ reporting (Phase 2)

### Data Architecture

**New Tables (6 additions to existing 24-table schema):**

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `royaltyConfig` | Branch royalty settings | by_branch |
| `royaltyPayments` | Payment tracking with OR | by_branch, by_period, by_status |
| `cashAdvances` | Advance request workflow | by_barber, by_branch, by_status |
| `officialReceipts` | Sequential OR generation | by_number, by_type |
| `productCatalog` | Central product management | by_sku, by_category |
| `timeAttendance` | Barber clock in/out | by_barber, by_branch, by_date |

**P&L Calculation:**
- Real-time aggregation from existing `transactions` table
- No materialized views for MVP
- Filter by branch_id, date range, category

**Official Receipt Numbering:**
- Simple sequential counter in `officialReceipts` table
- Atomic increment on each OR generation
- Format: Numeric sequence (e.g., 000001, 000002)

### Authentication & Security

**Leveraging Existing RBAC:**

| Feature | Super Admin | Branch Admin | Barber |
|---------|-------------|--------------|--------|
| P&L Dashboard | All branches | Own branch | - |
| Royalty Config | Full CRUD | View only | - |
| Royalty Payments | Mark paid | View due | - |
| Cash Advance | - | Approve/reject | Request |
| Product Catalog | Full CRUD | View | View |
| Time Tracking | - | View branch | Own records |

**Cash Advance Privacy:**
- Visible only to requesting barber + approving branch admin
- Super admin excluded per PRD requirement

### API & Communication Patterns

**Convex Service Extensions:**

| Existing Service | Extension |
|-----------------|-----------|
| `payroll.ts` | Add `getCashAdvanceDeductions()`, integrate deductions into payroll calculation |
| `notifications.ts` | Add royalty reminder and cash advance notification types |

**New Convex Services:**

| Service | Queries | Mutations |
|---------|---------|-----------|
| `accounting.ts` | getPLSummary, getIncomeByCategory, getExpenseByCategory | exportPLReport |
| `royalty.ts` | getRoyaltyConfig, getRoyaltyPayments, getBranchRoyaltyStatus | setRoyaltyConfig, markRoyaltyPaid, generateOR |
| `cashAdvance.ts` | getAdvanceRequests, getBarberAdvanceStatus, getAdvanceHistory | requestAdvance, approveAdvance, rejectAdvance |
| `productCatalog.ts` | getCatalogProducts, getProductById | addProduct, updateProduct, removeProduct, togglePriceEnforcement |
| `timeAttendance.ts` | getAttendanceRecords, getBarberClockStatus | clockIn, clockOut |

### Frontend Architecture

**Component Organization (Role-Based):**

```
src/components/
├── staff/
│   ├── AccountingDashboard.jsx      # P&L view for branch admin
│   ├── CashAdvanceApproval.jsx      # Approval workflow
│   └── TimeAttendanceView.jsx       # Branch attendance records
├── admin/
│   ├── RoyaltyManagement.jsx        # Config + status dashboard
│   └── ProductCatalogManager.jsx    # Central catalog CRUD
├── barber/
│   ├── CashAdvanceRequest.jsx       # Request form + status
│   └── TimeClockButton.jsx          # One-tap clock in/out
└── common/
    ├── MetricCard.jsx               # P&L summary cards
    ├── StatusBadge.jsx              # Traffic light status
    ├── ClockButton.jsx              # Time clock component
    ├── ApprovalCard.jsx             # Cash advance approval UI
    └── BranchStatusCard.jsx         # Royalty status per branch
```

### Infrastructure & Deployment

**No Changes Required:**
- Existing Convex cloud deployment
- Existing Vercel static hosting
- Existing Capacitor mobile build pipeline
- Existing CI/CD via deploy scripts

**Schema Migration:**
- Add 6 new tables to `convex/schema.ts`
- Deploy via `npx convex deploy`
- No data migration needed (new features, empty tables)

### Decision Impact Analysis

**Implementation Sequence:**
1. Schema extension (all 6 tables)
2. Core services (accounting.ts, royalty.ts, cashAdvance.ts, productCatalog.ts, timeAttendance.ts)
3. Payroll integration (extend payroll.ts)
4. Common components (5 custom components)
5. Feature pages (by role)
6. Email notifications (extend notifications.ts)

**Cross-Component Dependencies:**
- Cash Advance depends on Payroll integration
- Royalty Payments depends on Accounting (revenue calculation)
- All features depend on existing auth/RBAC

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Addressed:**
8 areas where AI agents could make inconsistent choices, now standardized below.

### Naming Patterns

**Database Naming Conventions (Convex):**

| Element | Convention | Example |
|---------|------------|---------|
| Tables | camelCase | `royaltyPayments`, `cashAdvances` |
| Fields | snake_case | `branch_id`, `created_at`, `is_active` |
| Indexes | by_fieldname | `by_branch`, `by_status`, `by_date` |
| Foreign Keys | entity_id | `barber_id`, `branch_id` |

**API Naming Conventions (Convex Functions):**

| Type | Convention | Example |
|------|------------|---------|
| Queries | get* prefix | `getPLSummary`, `getRoyaltyPayments` |
| Mutations | verb + noun | `createAdvanceRequest`, `approveAdvance` |
| Actions | verb + noun | `sendRoyaltyReminder`, `generateORPdf` |

**Code Naming Conventions:**

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase.jsx | `AccountingDashboard.jsx` |
| Hooks | useCamelCase | `useRoyaltyStatus` |
| Utilities | camelCase.js | `formatCurrency.js` |
| Constants | SCREAMING_SNAKE | `MAX_ADVANCE_PERCENT` |

### Structure Patterns

**New Feature File Placement:**

```
# Backend (Convex)
convex/services/accounting.ts      # P&L queries and exports
convex/services/royalty.ts         # Royalty config and payments
convex/services/cashAdvance.ts     # Advance request workflow
convex/services/productCatalog.ts  # Central catalog management
convex/services/timeAttendance.ts  # Clock in/out tracking

# Frontend (React)
src/components/staff/AccountingDashboard.jsx
src/components/staff/CashAdvanceApproval.jsx
src/components/staff/TimeAttendanceView.jsx
src/components/admin/RoyaltyManagement.jsx
src/components/admin/ProductCatalogManager.jsx
src/components/barber/CashAdvanceRequest.jsx
src/components/barber/TimeClockButton.jsx

# Shared Components
src/components/common/MetricCard.jsx
src/components/common/StatusBadge.jsx
src/components/common/ClockButton.jsx
src/components/common/ApprovalCard.jsx
src/components/common/BranchStatusCard.jsx
```

### Format Patterns

**Data Types:**

| Data Type | Format | Example |
|-----------|--------|---------|
| Currency | Number (whole pesos) | `amount: 5000` for ₱5,000 |
| Dates | Unix timestamp (ms) | `created_at: 1706140800000` |
| Status | String literal union | `"pending" \| "approved" \| "rejected"` |
| IDs | Convex Id type | `v.id("royaltyPayments")` |

**API Response Format:**
- Direct return from Convex (no wrapper)
- Convex handles errors automatically
- Use `ConvexError` for user-facing errors

### Communication Patterns

**Real-time Updates:**
- All dashboards use `useQuery` for live data
- No manual polling or refresh buttons needed
- Convex subscriptions handle sync automatically

**Notifications:**
- Extend existing `notifications.ts` service
- Use existing notification types: `"royalty"`, `"cash_advance"`
- Follow existing `createNotification` mutation pattern

### Process Patterns

**Error Handling:**

```typescript
// Use ConvexError for user-facing errors
import { ConvexError } from "convex/values";

throw new ConvexError({
  code: "ADVANCE_LIMIT_EXCEEDED",
  message: "Cash advance exceeds 50% of average earnings"
});
```

**Loading States:**
- Use Convex's built-in loading (`query === undefined`)
- Show skeleton loaders, not spinners
- Optimistic updates for time clock and approvals

**Validation Pattern:**

```typescript
// All validation in mutation args
export const requestAdvance = mutation({
  args: {
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side validation
    const eligibility = await checkEligibility(ctx, args);
    if (!eligibility.eligible) {
      throw new ConvexError({ code: "NOT_ELIGIBLE", message: eligibility.reason });
    }
    // ... proceed
  },
});
```

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow existing naming conventions (camelCase tables, snake_case fields)
2. Place new services in `convex/services/[feature].ts`
3. Place components in role-based directories (`staff/`, `admin/`, `barber/`)
4. Use whole peso amounts for currency (no decimals)
5. Use Unix timestamps for dates
6. Extend existing notification service, not create new email patterns
7. Use Convex's real-time subscriptions, not polling
8. Validate on server-side (mutations), client-side validation optional

**Anti-Patterns to Avoid:**

- ❌ Creating new notification services instead of extending existing
- ❌ Using REST-style endpoints (use Convex queries/mutations)
- ❌ Manual polling for data updates
- ❌ Storing currency as decimals or strings
- ❌ Creating components outside role-based structure

## Project Structure & Boundaries

### Complete Project Directory Structure

**Existing Structure with New Feature Additions (marked with `# NEW`):**

```
tpx-booking-app/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── capacitor.config.json
├── tsconfig.json
├── .env.local
├── .gitignore
│
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── DashboardHeader.jsx
│   │   │   ├── BranchManagement.jsx
│   │   │   ├── UserManagement.jsx
│   │   │   ├── RoyaltyManagement.jsx        # NEW - Royalty config + status
│   │   │   └── ProductCatalogManager.jsx    # NEW - Central catalog CRUD
│   │   │
│   │   ├── staff/
│   │   │   ├── DashboardHeader.jsx
│   │   │   ├── BookingsManagement.jsx
│   │   │   ├── ServicesManagement.jsx
│   │   │   ├── AccountingDashboard.jsx      # NEW - P&L view
│   │   │   ├── CashAdvanceApproval.jsx      # NEW - Approval workflow
│   │   │   └── TimeAttendanceView.jsx       # NEW - Branch attendance
│   │   │
│   │   ├── barber/
│   │   │   ├── ScheduleView.jsx
│   │   │   ├── CashAdvanceRequest.jsx       # NEW - Request form
│   │   │   └── TimeClockButton.jsx          # NEW - One-tap clock
│   │   │
│   │   ├── customer/
│   │   │   ├── ServiceBooking.jsx
│   │   │   └── MyBookings.jsx
│   │   │
│   │   └── common/
│   │       ├── Button.jsx
│   │       ├── Modal.jsx
│   │       ├── ProtectedRoute.jsx
│   │       ├── MetricCard.jsx               # NEW - P&L summary cards
│   │       ├── StatusBadge.jsx              # NEW - Traffic light status
│   │       ├── ClockButton.jsx              # NEW - Time clock component
│   │       ├── ApprovalCard.jsx             # NEW - Cash advance UI
│   │       └── BranchStatusCard.jsx         # NEW - Royalty status
│   │
│   ├── pages/
│   │   ├── staff/
│   │   │   └── StaffDashboard.jsx           # Add accounting, time tabs
│   │   ├── admin/
│   │   │   └── AdminDashboard.jsx           # Add royalty, catalog tabs
│   │   └── barber/
│   │       └── BarberDashboard.jsx          # Add cash advance, clock
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── NotificationContext.tsx
│   │
│   ├── hooks/
│   │   ├── useRealtimeNotifications.js
│   │   ├── useRoyaltyStatus.js              # NEW
│   │   ├── useCashAdvance.js                # NEW
│   │   └── useTimeAttendance.js             # NEW
│   │
│   ├── utils/
│   │   ├── formatCurrency.js
│   │   └── formatDate.js
│   │
│   └── styles/
│       └── index.css
│
├── convex/
│   ├── schema.ts                            # ADD 6 new tables
│   ├── _generated/
│   │
│   ├── services/
│   │   ├── auth.ts
│   │   ├── bookings.ts
│   │   ├── payments.ts
│   │   ├── payroll.ts                       # EXTEND for cash advance
│   │   ├── notifications.ts                 # EXTEND for royalty/CA
│   │   ├── accounting.ts                    # NEW - P&L queries
│   │   ├── royalty.ts                       # NEW - Royalty management
│   │   ├── cashAdvance.ts                   # NEW - Advance workflow
│   │   ├── productCatalog.ts                # NEW - Catalog management
│   │   └── timeAttendance.ts                # NEW - Time tracking
│   │
│   └── utils/
│       └── errors.ts
│
├── android/                                 # Capacitor Android project
│
├── public/
│   └── assets/
│
└── docs/
    ├── index.md
    ├── project_details.md
    └── CONVEX_DATABASE_SCHEMA.md
```

### Architectural Boundaries

**API Boundaries (Convex):**

| Boundary | Description | Access Control |
|----------|-------------|----------------|
| Branch Data | All queries filter by `branch_id` | User's assigned branch only |
| Financial Data | P&L, royalty, cash advance | Role-based (see RBAC matrix) |
| Cash Advance | Private to barber + branch admin | Exclude super admin |
| Product Catalog | Central management | Super admin writes, all read |

**Component Boundaries:**

| Layer | Communication | Pattern |
|-------|---------------|---------|
| UI → Backend | Convex hooks | `useQuery`, `useMutation` |
| Real-time | Subscriptions | Automatic via Convex |
| Auth | Context | `AuthContext.jsx` |
| Notifications | Context | `NotificationContext.tsx` |

**Service Boundaries:**

| Service | Owns | Depends On |
|---------|------|------------|
| `accounting.ts` | P&L calculations | `transactions` table |
| `royalty.ts` | Royalty config/payments | `accounting.ts` (revenue) |
| `cashAdvance.ts` | Advance workflow | `payroll.ts` (deductions) |
| `productCatalog.ts` | Central catalog | None |
| `timeAttendance.ts` | Clock in/out | None |

### Requirements to Structure Mapping

**Feature → File Mapping:**

| Feature | Backend Service | UI Components | Page Integration |
|---------|-----------------|---------------|------------------|
| Accounting (FR1-FR9) | `accounting.ts` | `AccountingDashboard`, `MetricCard` | Staff Dashboard |
| Royalty (FR10-FR19) | `royalty.ts` | `RoyaltyManagement`, `BranchStatusCard` | Admin Dashboard |
| Cash Advance (FR20-FR29) | `cashAdvance.ts` | `CashAdvanceRequest`, `CashAdvanceApproval`, `ApprovalCard` | Barber + Staff Dashboard |
| Product Catalog (FR30-FR37) | `productCatalog.ts` | `ProductCatalogManager` | Admin Dashboard |
| Time Tracking (FR38-FR41) | `timeAttendance.ts` | `TimeClockButton`, `TimeAttendanceView`, `ClockButton` | Barber + Staff Dashboard |

**Cross-Cutting Concerns:**

| Concern | Location |
|---------|----------|
| Branch isolation | All services filter by `branch_id` |
| RBAC | Existing auth middleware |
| Audit logging | Add to `convex/utils/audit.ts` |
| Email notifications | Extend `notifications.ts` |

### Integration Points

**Internal Communication:**
- Frontend ↔ Backend: Convex React hooks
- Real-time sync: Convex subscriptions (automatic)
- State: React Context for auth/notifications

**External Integrations:**
- Resend API: Royalty reminders, cash advance alerts
- Xendit: Payment status (existing)
- No new external integrations for MVP

**Data Flow:**

```
User Action → React Component → useMutation() → Convex Mutation → Database
                    ↑                                                  ↓
              useQuery() ← Convex Subscription ←────────────────────────┘
```

### File Organization Patterns

**New Service Template:**

```typescript
// convex/services/[feature].ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getItems = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tableName")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});
```

**New Component Template:**

```jsx
// src/components/[role]/FeatureComponent.jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function FeatureComponent({ branchId }) {
  const data = useQuery(api.services.feature.getData, { branch_id: branchId });
  const mutation = useMutation(api.services.feature.doAction);

  if (data === undefined) return <Skeleton />;
  return <div>...</div>;
}
```

### Development Workflow Integration

**Development:**
1. Run `npm run dev` (Vite) + `npx convex dev` (backend)
2. Hot reload on frontend changes
3. Auto-deploy schema changes to dev environment

**Build:**
1. `npm run build` → Vite production build
2. `npx convex deploy` → Deploy backend
3. `npm run android:sync` → Capacitor sync

**Deployment:**
1. Schema deployed to Convex cloud
2. Frontend deployed to Vercel
3. Mobile built via Capacitor CLI

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible. React 19 + Convex 1.26.1 + TailwindCSS 4 + Capacitor 7.4.3 work together seamlessly. TypeScript provides type safety across frontend and backend.

**Pattern Consistency:**
Implementation patterns align with existing codebase conventions. Naming, structure, and communication patterns are consistent with the brownfield foundation.

**Structure Alignment:**
Project structure integrates naturally with existing 99+ components and 27 services. New additions follow established organizational patterns.

### Requirements Coverage Validation ✅

**Feature Coverage:**
All 5 MVP features (44 FRs) have complete architectural support with dedicated services, components, and data models.

**Non-Functional Requirements Coverage:**
All 18 NFRs are architecturally addressed through Convex real-time capabilities, existing RBAC, branch isolation patterns, and integration strategies.

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions documented with specific files, functions, and patterns.

**Structure Completeness:** Complete directory tree with explicit placement for all new files.

**Pattern Completeness:** Comprehensive naming conventions, code templates, and anti-patterns documented.

### Gap Analysis Results

**Critical Gaps:** None

**Important Gaps (Non-blocking):**
- PDF export library selection (defer to implementation)
- Audit logging utility details (extend existing patterns)

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (brownfield, 5 features)
- [x] Scale and complexity assessed (medium-high)
- [x] Technical constraints identified (existing 24 tables, 27 services)
- [x] Cross-cutting concerns mapped (7 concerns addressed)

**✅ Architectural Decisions**
- [x] Critical decisions documented (6 new tables, 5 new services)
- [x] Technology stack fully specified (locked to existing)
- [x] Integration patterns defined (Convex hooks, service extensions)
- [x] Performance considerations addressed (real-time, optimistic updates)

**✅ Implementation Patterns**
- [x] Naming conventions established (4 categories)
- [x] Structure patterns defined (role-based, service-per-feature)
- [x] Communication patterns specified (Convex subscriptions)
- [x] Process patterns documented (error handling, validation)

**✅ Project Structure**
- [x] Complete directory structure defined (with NEW markers)
- [x] Component boundaries established (5 service boundaries)
- [x] Integration points mapped (4 data flow patterns)
- [x] Requirements to structure mapping complete (5 features → files)

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** HIGH - Brownfield integration with established patterns minimizes risk

**Key Strengths:**
- Leverages proven existing infrastructure (24 tables, 27 services)
- Clear separation of 5 independent features
- Comprehensive patterns prevent AI agent conflicts
- Real-time capabilities via Convex subscriptions

**Areas for Future Enhancement:**
- Add cached aggregates if P&L performance needs optimization
- Consolidated HQ reporting in Phase 2
- Enhanced audit logging with dedicated utility

### Implementation Handoff

**AI Agent Guidelines:**
1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and boundaries
4. Refer to this document for all architectural questions
5. Extend existing services (payroll.ts, notifications.ts) rather than creating new ones

**First Implementation Priority:**
1. Add 6 new tables to `convex/schema.ts`
2. Deploy schema with `npx convex deploy`
3. Implement services in dependency order (accounting → royalty → cashAdvance)

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-25
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**
- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**
- 15+ architectural decisions made
- 8 implementation patterns defined
- 12 new components + 5 new services specified
- 44 FRs + 18 NFRs fully supported

**📚 AI Agent Implementation Guide**
- Technology stack with verified versions
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All 44 functional requirements are supported
- [x] All 18 non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**📋 Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**🏗️ Solid Foundation**
The brownfield integration approach leverages existing proven infrastructure (24 tables, 27 services) while adding 5 new feature modules.

---

**Architecture Status:** ✅ READY FOR IMPLEMENTATION

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.

