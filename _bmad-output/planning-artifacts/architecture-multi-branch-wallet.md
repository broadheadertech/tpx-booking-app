---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['prd-multi-branch-wallet.md', 'project-context.md', 'brainstorming-session-2026-01-30.md']
workflowType: 'architecture'
project_name: 'tpx-booking-app'
feature_name: 'Multi-branch Wallet Payment'
user_name: 'MASTERPAINTER'
date: '2026-01-30'
status: 'complete'
completedAt: '2026-01-30'
---

# Architecture Decision Document: Multi-branch Wallet Payment

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
17 user stories across 6 epics covering wallet configuration, branch earnings, customer top-up, POS payment, settlement process, and analytics.

**Non-Functional Requirements:**
- Security: Encrypted storage for PayMongo credentials
- Audit: Complete transaction logging for financial operations
- Performance: Dashboard queries under 3 seconds
- Isolation: Branch-level data isolation for earnings

**Scale & Complexity:**
- Primary domain: Financial/Payment Backend
- Complexity level: Medium
- New database tables: 4
- External integrations: PayMongo (existing pattern extended)

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|------------|--------|--------|
| Currency as whole pesos | project-context.md | All amounts stored as integers (500 = ₱500) |
| Branch isolation required | project-context.md | All queries must include branch_id filtering |
| Convex patterns | project-context.md | Use `v.id()` for FKs, `withIndex()` for queries |
| Existing PayMongo integration | architecture-paymongo.md | Reuse webhook patterns, add SA config |

### Cross-Cutting Concerns Identified

1. **Branch Data Isolation** - Earnings, settlements visible only to owning branch + super admin
2. **Financial Audit Trail** - All wallet debits, credits, settlements must be logged
3. **Commission Consistency** - Same calculation logic in POS payment and branch dashboard
4. **Real-time Updates** - Wallet balance, pending earnings use Convex subscriptions
5. **Settlement State Management** - 5-state machine with proper transitions

### Architecture Decisions (From Brainstorming)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deposit Collection | Super Admin PayMongo | Single collection point |
| Commission Model | Percentage-based | Fair, scalable |
| Settlement Flow | Branch request → SA approve | Controlled disbursement |
| Payout Method | GCash/Maya transfer | Philippine e-wallet standard |

## Starter Template Evaluation

### Primary Technology Domain

**Brownfield Extension** - This is a feature addition to an existing production application.

### Existing Technology Stack (No Changes Required)

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 19 + Vite | Existing patterns |
| Backend | Convex 1.26.1 | Real-time database |
| Styling | TailwindCSS v4 | Dark theme (#0A0A0A) |
| Types | TypeScript 5.8.3 | Strict mode |

### Architectural Foundation

**Existing Patterns to Follow:**
- Service files: `convex/services/[feature].ts`
- Components by role: `src/components/[role]/[Component].jsx`
- Queries/Mutations: Use `withIndex()` for branch isolation
- Currency: Whole pesos as integers (500 = ₱500)

**Existing Services to Extend:**
- `convex/services/paymongo.ts` - Add wallet top-up flow
- `convex/services/wallet.ts` - Add POS payment mutation
- `convex/http.ts` - Webhook handling patterns

**New Services to Create:**
- `convex/services/walletConfig.ts` - Super Admin wallet settings
- `convex/services/branchEarnings.ts` - Branch ledger management
- `convex/services/settlements.ts` - Settlement request/approval

**Note:** First implementation story should be schema additions, not project initialization.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Already Made):**
- Database: Convex (existing)
- Auth: Clerk + RBAC (existing)
- PayMongo Integration: Extend existing patterns

**Important Decisions (Made This Session):**
- Wallet config: Single global row in `wallet_config` table
- Settlement states: State machine enforced transitions
- Encryption: Reuse existing PayMongo encryption pattern
- Commission: Calculate and store on write

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wallet Config Storage | Single `wallet_config` row | One SA config needed |
| Settlement State Machine | Enforced transitions | Prevent invalid state jumps |
| Commission Storage | Calculated on write | Faster reads, audit trail |
| Currency Format | Whole pesos (integers) | Match existing pattern |

**State Machine Definition:**
```
pending → approved → processing → completed
    ↓                     ↓
 rejected             rejected
```

**Valid State Transitions:**
- `pending` → `approved` (SA approves)
- `pending` → `rejected` (SA rejects)
- `approved` → `processing` (SA initiates transfer)
- `approved` → `rejected` (SA cancels)
- `processing` → `completed` (Transfer confirmed)
- `processing` → `rejected` (Transfer failed)

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth Provider | Clerk (existing) | Already integrated |
| RBAC Pattern | Role-based queries | Match existing pattern |
| Key Encryption | Reuse `encryptData()` | Proven pattern in paymongo.ts |
| Branch Isolation | `by_branch` index filtering | Required for all earnings queries |

**Access Control Matrix:**

| Resource | super_admin | branch_admin | staff |
|----------|-------------|--------------|-------|
| Wallet Config | Read/Write | - | - |
| Branch Earnings | All branches | Own branch | - |
| Settlements | Approve all | Request own | - |
| Commission Settings | Configure | View | - |

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Style | Convex queries/mutations | Existing pattern |
| Real-time Updates | Convex subscriptions | Automatic reactivity |
| External Calls | Convex actions | PayMongo API calls |
| Webhook Handler | Extend `convex/http.ts` | Add SA wallet webhook route |

### Implementation Sequence

1. Schema additions (4 new tables)
2. Wallet config service + encryption
3. Branch earnings service + commission calculation
4. Settlement service + state machine
5. POS wallet payment integration
6. Dashboard components

## Implementation Patterns & Consistency Rules

### Pattern Categories (Wallet-Specific)

**Aligned with existing project-context.md patterns, extended for wallet feature.**

### Naming Patterns

**Service Files:**

| Service | File | Purpose |
|---------|------|---------|
| Wallet Config | `convex/services/walletConfig.ts` | Super Admin settings |
| Branch Earnings | `convex/services/branchEarnings.ts` | Ledger management |
| Settlements | `convex/services/settlements.ts` | Request/approval flow |

**Query/Mutation Naming:**

| Type | Pattern | Example |
|------|---------|---------|
| Get single | `get{Entity}` | `getWalletConfig` |
| Get list | `get{Entity}List` | `getBranchEarningsList` |
| Get by branch | `getBranch{Entity}` | `getBranchPendingTotal` |
| Create | `create{Entity}` | `createEarningRecord` |
| Update status | `{action}{Entity}` | `approveSettlement`, `rejectSettlement` |

**Component Naming:**

| Component | File | Location |
|-----------|------|----------|
| Earnings Dashboard | `WalletEarningsDashboard.jsx` | `src/components/staff/` |
| Settlement Request | `SettlementRequestForm.jsx` | `src/components/staff/` |
| Settlement Queue | `SettlementApprovalQueue.jsx` | `src/components/admin/` |
| Wallet Config | `WalletConfigPanel.jsx` | `src/components/admin/` |

### Financial Calculation Patterns

**Commission Calculation (MANDATORY):**

```typescript
// All agents MUST use this exact pattern
function calculateCommission(grossAmount: number, commissionPercent: number) {
  const commissionAmount = Math.round(grossAmount * (commissionPercent / 100));
  const netAmount = grossAmount - commissionAmount;
  return { commissionAmount, netAmount };
}
```

**Currency Rules:**
- Store as integers: `500` = ₱500
- Display with `toLocaleString()`: `₱500.00`
- Never use floats for money calculations

### State Machine Patterns

**Settlement Status Transitions:**

```typescript
const SETTLEMENT_TRANSITIONS = {
  pending: ["approved", "rejected"],
  approved: ["processing", "rejected"],
  processing: ["completed", "rejected"],
  completed: [],
  rejected: [],
} as const;
```

**Mutation Pattern for State Changes:**

```typescript
// ALWAYS validate transition before update
export const approveSettlement = mutation({
  handler: async (ctx, args) => {
    const settlement = await ctx.db.get(args.settlement_id);
    if (settlement.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot approve from ${settlement.status} state`,
      });
    }
    // ... proceed with update
  },
});
```

### Query Patterns

**Branch-Isolated Queries (branch_admin):**

```typescript
// ALWAYS include branch_id in args and use index
.withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
```

**Super Admin Queries:**

```typescript
// Use different function name: getAll* prefix
export const getAllPendingSettlements = query({...});
```

### Error Handling Patterns

**Financial Error Codes:**

| Code | When | Message Pattern |
|------|------|-----------------|
| `INSUFFICIENT_BALANCE` | Wallet balance < amount | "Insufficient wallet balance" |
| `INVALID_TRANSITION` | Bad state change | "Cannot {action} from {state} state" |
| `SETTLEMENT_PENDING` | Duplicate request | "Settlement already pending" |
| `MINIMUM_NOT_MET` | Below min settlement | "Minimum settlement is ₱{amount}" |

### Anti-Patterns (AVOID)

- ❌ Using floats for currency: `amount: 500.00`
- ❌ Skipping state validation: Direct status update without checking current state
- ❌ Missing branch filter: Querying earnings without `branch_id`
- ❌ Wrong credentials: Using branch PayMongo for wallet top-ups
- ❌ Direct field access: `settlement.status = "approved"` instead of mutation

## Project Structure & Boundaries

### New Files for Multi-branch Wallet Feature

**Backend (Convex) - New Files:**

```
convex/
├── schema.ts                          # ADD: 4 new tables
├── services/
│   ├── walletConfig.ts                # NEW: SA wallet settings
│   ├── branchEarnings.ts              # NEW: Branch ledger management
│   ├── settlements.ts                 # NEW: Settlement request/approval
│   ├── walletAnalytics.ts             # NEW: SA overview queries
│   ├── wallet.ts                      # EXTEND: POS wallet payment
│   └── paymongo.ts                    # EXTEND: SA wallet top-up flow
├── http.ts                            # EXTEND: SA wallet webhook route
└── lib/
    └── walletUtils.ts                 # NEW: Commission calculation helper
```

**Frontend - New Files:**

```
src/
├── components/
│   ├── admin/
│   │   ├── WalletConfigPanel.jsx           # NEW: SA PayMongo config UI
│   │   ├── SettlementApprovalQueue.jsx     # NEW: SA settlement queue
│   │   └── WalletOverviewDashboard.jsx     # NEW: SA analytics
│   ├── staff/
│   │   ├── WalletEarningsDashboard.jsx     # NEW: Branch earnings view
│   │   ├── SettlementRequestForm.jsx       # NEW: Request settlement
│   │   ├── SettlementHistoryList.jsx       # NEW: Settlement history
│   │   └── POSWalletPayment.jsx            # NEW: Accept wallet at POS
│   └── common/
│       └── WalletPaymentOption.jsx         # NEW: POS payment option
├── pages/
│   └── customer/
│       └── WalletTopUp.jsx                 # EXTEND: Route to SA PayMongo
└── hooks/
    └── useWalletEarnings.js                # NEW: Branch earnings hook
```

### Schema Additions (convex/schema.ts)

```typescript
// NEW TABLES - Add to schema.ts

walletConfig: defineTable({
  paymongo_public_key: v.string(),
  paymongo_secret_key: v.string(),      // Encrypted
  paymongo_webhook_secret: v.string(),  // Encrypted
  is_test_mode: v.boolean(),
  default_commission_percent: v.number(),
  default_settlement_frequency: v.string(),
  min_settlement_amount: v.number(),
  created_at: v.number(),
  updated_at: v.number(),
}),

branchWalletSettings: defineTable({
  branch_id: v.id("branches"),
  commission_override: v.optional(v.number()),
  settlement_frequency: v.optional(v.string()),
  payout_method: v.string(),
  payout_account_number: v.string(),
  payout_account_name: v.string(),
  payout_bank_name: v.optional(v.string()),
  created_at: v.number(),
  updated_at: v.number(),
}).index("by_branch", ["branch_id"]),

branchWalletEarnings: defineTable({
  branch_id: v.id("branches"),
  booking_id: v.id("bookings"),
  customer_id: v.id("users"),
  staff_id: v.optional(v.id("users")),
  service_name: v.string(),
  gross_amount: v.number(),
  commission_percent: v.number(),
  commission_amount: v.number(),
  net_amount: v.number(),
  settlement_id: v.optional(v.id("branchSettlements")),
  status: v.string(),
  created_at: v.number(),
})
.index("by_branch", ["branch_id"])
.index("by_branch_status", ["branch_id", "status"])
.index("by_settlement", ["settlement_id"]),

branchSettlements: defineTable({
  branch_id: v.id("branches"),
  requested_by: v.id("users"),
  amount: v.number(),
  earnings_count: v.number(),
  payout_method: v.string(),
  payout_account_number: v.string(),
  payout_account_name: v.string(),
  payout_bank_name: v.optional(v.string()),
  status: v.string(),
  approved_by: v.optional(v.id("users")),
  approved_at: v.optional(v.number()),
  completed_at: v.optional(v.number()),
  rejection_reason: v.optional(v.string()),
  transfer_reference: v.optional(v.string()),
  notes: v.optional(v.string()),
  created_at: v.number(),
  updated_at: v.number(),
})
.index("by_branch", ["branch_id"])
.index("by_status", ["status"])
.index("by_branch_status", ["branch_id", "status"]),
```

### Architectural Boundaries

**API Boundaries:**

| Service | Accessible By | Purpose |
|---------|---------------|---------|
| `walletConfig` | super_admin only | SA PayMongo credentials |
| `branchEarnings` | branch_admin (own), super_admin (all) | Ledger queries |
| `settlements` | branch_admin (request), super_admin (approve) | Settlement flow |
| `walletAnalytics` | super_admin only | System overview |

**Data Flow:**

```
Customer Top-up Flow:
─────────────────────
Customer → WalletTopUp.jsx
         → wallet.createWalletTopup (action)
         → PayMongo Checkout (SA credentials from walletConfig)
         → Webhook → http.ts
         → wallet.processWalletTopup (mutation)
         → users.wallet_balance updated

POS Wallet Payment Flow:
────────────────────────
Staff → POSWalletPayment.jsx
      → wallet.processWalletPayment (mutation)
      → Deduct users.wallet_balance
      → Create branchWalletEarnings record
      → Apply commission calculation

Settlement Flow:
────────────────
Branch → SettlementRequestForm.jsx
       → settlements.requestSettlement (mutation)
       → branchSettlements created (status: pending)
       → SA notification

SA → SettlementApprovalQueue.jsx
   → settlements.approveSettlement (mutation)
   → Status: pending → approved → processing → completed
   → branchWalletEarnings linked to settlement
```

### Integration Points

**Internal Communication:**
- All components use Convex `useQuery` / `useMutation` hooks
- Real-time updates via Convex subscriptions (automatic)
- No REST APIs or manual polling

**External Integrations:**
- PayMongo API (wallet top-up checkout)
- Existing webhook pattern in `convex/http.ts`

### Existing Files to Modify

| File | Changes |
|------|---------|
| `convex/schema.ts` | Add 4 new tables |
| `convex/services/wallet.ts` | Add `processWalletPayment` mutation |
| `convex/services/paymongo.ts` | Add SA wallet top-up action |
| `convex/http.ts` | Add SA wallet webhook route |
| `convex/services/index.ts` | Export new services |
| `src/pages/customer/WalletTopUp.jsx` | Route to SA PayMongo |

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All architectural decisions work together seamlessly. The brownfield approach respects existing patterns (Convex, Clerk, PayMongo) while extending them logically. Technology choices (React 19, Convex 1.26.1, TypeScript 5.8.3) are compatible and already proven in production.

**Pattern Consistency:**
Implementation patterns align with existing project conventions. Service files follow `convex/services/[feature].ts` pattern, components use role-based organization, and all queries use `withIndex()` for branch isolation as required.

**Structure Alignment:**
Project structure extends existing architecture without conflicts. New files are placed in appropriate directories following established conventions. No structural contradictions identified.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
All 17 user stories across 6 epics are architecturally supported:
- Epic 1: Wallet Configuration (3 stories) → `walletConfig` service
- Epic 2: Branch Earnings (3 stories) → `branchEarnings` service
- Epic 3: Customer Top-up (2 stories) → Extended `wallet` + `paymongo` services
- Epic 4: POS Payment (3 stories) → `wallet.processWalletPayment` mutation
- Epic 5: Settlement (4 stories) → `settlements` service with state machine
- Epic 6: Analytics (2 stories) → `walletAnalytics` service

**Functional Requirements Coverage:**
All functional requirements have clear architectural support. Commission calculation, state machine transitions, branch isolation, and real-time updates are all specified with patterns.

**Non-Functional Requirements Coverage:**
- Security: Encryption pattern for PayMongo keys documented
- Audit: Transaction logging in earnings records
- Performance: Indexed queries for dashboard
- Isolation: Branch filtering on all queries

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical decisions documented with specific versions (Convex 1.26.1, TypeScript 5.8.3). Implementation patterns include code examples. Consistency rules are clear and enforceable.

**Structure Completeness:**
Project structure is complete with all files and directories defined. 4 new tables, 4 new services, 8 new frontend components specified. Integration points clearly mapped.

**Pattern Completeness:**
All potential conflict points addressed: commission calculation is MANDATORY pattern, state machine transitions are defined, branch isolation queries specified, error codes documented. Anti-patterns explicitly listed.

### Gap Analysis Results

**Critical Gaps:** None identified

**Important Gaps:** None identified - architecture is comprehensive

**Nice-to-Have Enhancements:**
- Consider adding audit log table for settlement state changes (can be added in Phase 2)
- Optional: Email/SMS notifications for settlement status changes

### Validation Issues Addressed

No critical or important issues found during validation. Architecture is coherent and complete.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium complexity)
- [x] Technical constraints identified (4 constraints)
- [x] Cross-cutting concerns mapped (5 concerns)

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (brownfield extension)
- [x] Integration patterns defined (PayMongo webhook)
- [x] Performance considerations addressed (indexed queries)

**✅ Implementation Patterns**

- [x] Naming conventions established (service files, queries, components)
- [x] Structure patterns defined (commission calculation)
- [x] Communication patterns specified (Convex subscriptions)
- [x] Process patterns documented (state machine, error handling)

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established (4 services, role-based components)
- [x] Integration points mapped (3 data flows)
- [x] Requirements to structure mapping complete (6 epics → specific files)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH based on validation results

**Key Strengths:**
- Brownfield approach respects existing production patterns
- Clear state machine prevents invalid settlement transitions
- Commission calculation is standardized across all touchpoints
- Branch isolation is enforced at query level
- Complete traceability from requirements to implementation

**Areas for Future Enhancement:**
- Audit logging for state changes (Phase 2)
- Notification system for settlements (Phase 2)
- Advanced analytics and reporting (Phase 2)

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
Add 4 new tables to `convex/schema.ts` following the schema definitions in this document.

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-30
**Document Location:** `_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 12+ architectural decisions made
- 6 implementation pattern categories defined
- 15 new architectural components specified
- 17 requirements fully supported

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions (Convex 1.26.1, TypeScript 5.8.3)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing Multi-branch Wallet Payment. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**
Add 4 new tables to `convex/schema.ts`

**Development Sequence:**

1. Add schema tables (walletConfig, branchWalletSettings, branchWalletEarnings, branchSettlements)
2. Create walletConfig service with encryption
3. Implement branchEarnings service with commission calculation
4. Build settlements service with state machine
5. Extend wallet.ts with POS payment mutation
6. Create frontend components following role-based organization

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**

- [x] All functional requirements are supported
- [x] All non-functional requirements are addressed
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
The brownfield extension approach preserves production stability while adding comprehensive wallet payment capabilities.

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.

