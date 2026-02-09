# Product Requirements Document: Multi-branch TPX Wallet Payment Architecture

**Version:** 1.0
**Date:** 2026-01-30
**Status:** Draft
**Author:** MASTERPAINTER (AI-assisted)
**Based on:** Brainstorming Session 2026-01-30

---

## Executive Summary

This PRD defines the architecture for extending TPX Wallet to support multi-branch operations. The system enables customers to top up their wallet once and use the balance at any branch, while ensuring branches receive their fair share through a centralized settlement process.

### Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deposit Collection | Super Admin PayMongo | Single collection point for simplicity |
| Commission Model | Percentage-based | Fair, scalable across branches |
| Settlement Process | Branch requests → SA approves | Controlled disbursement with approval |
| Payout Method | Bank transfer (GCash/Maya) | Standard Philippine e-wallet transfers |
| Settlement Frequency | Configurable per branch | Flexible (daily/weekly/bi-weekly) |

---

## 1. Problem Statement

### Current State
- TPX has 15-20 branches, each with their own PayMongo account
- Wallet top-ups currently go to... (unclear/not implemented for multi-branch)
- No system exists to settle wallet payments with branches
- POS cannot accept wallet payments

### Pain Points
1. **Customers**: Cannot use wallet seamlessly across branches
2. **Branches**: No visibility into wallet earnings, unclear settlement
3. **Super Admin**: No centralized control of wallet fund flow

### Target State
A "Starbucks Card" style system where:
- Customer tops up wallet → Money goes to Super Admin
- Customer pays at any branch → Branch earns credit
- Branches request settlement → Super Admin approves and transfers

---

## 2. Goals & Success Metrics

### Primary Goals
1. Enable customers to use wallet at any branch
2. Provide transparent earnings visibility to branches
3. Implement controlled settlement process
4. Support POS wallet payment acceptance

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Wallet adoption rate | 30% of active customers | Customers with wallet balance > 0 |
| Branch satisfaction | 90% positive feedback | Settlement process survey |
| Settlement processing time | < 48 hours | From request to payout |
| Wallet payment transactions | 50-100/month initially | Transaction count |

---

## 3. User Stories & Requirements

### Epic 1: Super Admin Wallet Configuration

#### Story 1.1: Configure Super Admin PayMongo for Wallet
**As a** Super Admin
**I want to** configure a dedicated PayMongo account for wallet top-ups
**So that** all wallet deposits flow to a central account

**Acceptance Criteria:**
- [ ] AC1: Super Admin can enter separate PayMongo credentials for wallet
- [ ] AC2: Wallet top-ups use Super Admin PayMongo (not branch PayMongo)
- [ ] AC3: Configuration stored securely with encryption
- [ ] AC4: Test mode toggle for development/production

**Technical Notes:**
- Add `wallet_paymongo_config` to `super_admin_settings` table
- Fields: `public_key`, `secret_key`, `webhook_secret`, `is_test_mode`

---

#### Story 1.2: Configure Global Commission Rate
**As a** Super Admin
**I want to** set a commission percentage for wallet payments
**So that** I can cover wallet management costs

**Acceptance Criteria:**
- [ ] AC1: Can set global commission rate (default 5%)
- [ ] AC2: Rate applied to all wallet payments at branches
- [ ] AC3: Can override commission per branch (optional)
- [ ] AC4: Commission visible in branch dashboard

**Technical Notes:**
- Add `wallet_commission_percent` to `super_admin_settings`
- Add optional `commission_override` to `branches` table

---

#### Story 1.3: Configure Settlement Frequency
**As a** Super Admin
**I want to** set default settlement frequency and per-branch overrides
**So that** branches receive payouts on appropriate schedules

**Acceptance Criteria:**
- [ ] AC1: Default frequency options: daily, weekly, bi-weekly
- [ ] AC2: Per-branch frequency override available
- [ ] AC3: Minimum settlement amount configurable
- [ ] AC4: Settlement day selection (e.g., every Friday)

---

### Epic 2: Branch Wallet Earnings

#### Story 2.1: Record Wallet Payment Earnings
**As a** system
**I want to** record each wallet payment to the branch ledger
**So that** branches can track their earnings

**Acceptance Criteria:**
- [ ] AC1: Each wallet payment creates `branch_wallet_earning` record
- [ ] AC2: Record includes: branch_id, amount, commission, net_amount, booking_id
- [ ] AC3: Real-time update to branch pending balance
- [ ] AC4: Audit trail with timestamps

**Data Model:**
```typescript
branch_wallet_earnings: defineTable({
  branch_id: v.id("branches"),
  booking_id: v.id("bookings"),
  customer_id: v.id("users"),
  gross_amount: v.number(),      // e.g., 500.00
  commission_percent: v.number(), // e.g., 5
  commission_amount: v.number(),  // e.g., 25.00
  net_amount: v.number(),         // e.g., 475.00
  settlement_id: v.optional(v.id("branch_settlements")),
  status: v.string(),             // "pending" | "settled"
  created_at: v.number(),
})
```

---

#### Story 2.2: Branch Earnings Dashboard
**As a** Branch Manager
**I want to** see my wallet earnings in real-time
**So that** I know how much I've earned from wallet payments

**Acceptance Criteria:**
- [ ] AC1: Dashboard shows total pending earnings
- [ ] AC2: Shows breakdown: gross, commission, net
- [ ] AC3: Lists individual wallet transactions
- [ ] AC4: Filter by date range
- [ ] AC5: Export to CSV option

**UI Wireframe:**
```
┌─────────────────────────────────────────────┐
│  WALLET EARNINGS DASHBOARD                   │
├─────────────────────────────────────────────┤
│                                              │
│  Pending Earnings         ₱4,750.00          │
│  (After 5% commission)                       │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ This Period                             │ │
│  │ Gross:      ₱5,000.00                   │ │
│  │ Commission: -₱250.00 (5%)               │ │
│  │ Net:        ₱4,750.00                   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [Request Settlement]                        │
│                                              │
│  Recent Transactions                         │
│  ┌────────────────────────────────────────┐ │
│  │ Jan 30 │ Classic Cut │ ₱450 → ₱427.50  │ │
│  │ Jan 30 │ Hair Color  │ ₱800 → ₱760.00  │ │
│  │ Jan 29 │ Haircut     │ ₱350 → ₱332.50  │ │
│  └────────────────────────────────────────┘ │
│                                              │
└─────────────────────────────────────────────┘
```

---

### Epic 3: Customer Wallet Top-up Flow

#### Story 3.1: Wallet Top-up via Super Admin PayMongo
**As a** Customer
**I want to** top up my wallet using any payment method
**So that** I can use my balance at any branch

**Acceptance Criteria:**
- [ ] AC1: Top-up creates PayMongo checkout with Super Admin credentials
- [ ] AC2: Successful payment credits user's wallet_balance
- [ ] AC3: Transaction recorded in `wallet_transactions` table
- [ ] AC4: Customer receives confirmation notification

**Flow:**
```
Customer → Top Up ₱500
    ↓
PayMongo Checkout (Super Admin Account)
    ↓
Webhook: checkout_session.payment.paid
    ↓
Credit wallet_balance +₱500
    ↓
Create wallet_transaction record
    ↓
Send notification to customer
```

---

#### Story 3.2: Wallet Top-up Bonus (Optional)
**As a** Customer
**I want to** receive bonus credits for larger top-ups
**So that** I'm incentivized to load more

**Acceptance Criteria:**
- [ ] AC1: Bonus tiers configurable by Super Admin
- [ ] AC2: Example: ₱500 = +₱25 bonus, ₱1000 = +₱75 bonus
- [ ] AC3: Bonus credited immediately with top-up
- [ ] AC4: Bonus tracked separately for reporting

**Note:** This is already partially implemented - verify integration with new architecture.

---

### Epic 4: POS Wallet Payment

#### Story 4.1: Accept Wallet Payment at POS
**As a** Staff Member
**I want to** accept wallet payments at the counter
**So that** customers can pay with their balance

**Acceptance Criteria:**
- [ ] AC1: POS shows "Pay with Wallet" option
- [ ] AC2: Displays customer's current wallet balance
- [ ] AC3: Validates sufficient balance before accepting
- [ ] AC4: Deducts from wallet, records to branch ledger
- [ ] AC5: Prints/shows receipt with wallet payment

**UI Flow:**
```
POS Payment Screen
┌─────────────────────────────────────────┐
│  Payment for: Classic Haircut ₱450      │
├─────────────────────────────────────────┤
│                                          │
│  Customer: Juan Dela Cruz                │
│  Wallet Balance: ₱750.00                 │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ [💳 Pay with Wallet - ₱450]         ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ [💵 Cash Payment]                   ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ [📱 GCash/Maya]                     ││
│  └─────────────────────────────────────┘│
│                                          │
└─────────────────────────────────────────┘
```

---

#### Story 4.2: Combo Payment (Wallet + Other)
**As a** Staff Member
**I want to** accept partial wallet payment
**So that** customers can use remaining balance + cash/card

**Acceptance Criteria:**
- [ ] AC1: If wallet balance < total, offer combo payment
- [ ] AC2: Wallet portion deducted first
- [ ] AC3: Remaining amount paid via cash/card
- [ ] AC4: Both payments recorded appropriately

**Example:**
```
Service Total: ₱450
Wallet Balance: ₱300
─────────────────
Use Wallet: ₱300 (recorded to branch ledger)
Pay Cash:   ₱150 (recorded as cash payment)
```

---

### Epic 5: Settlement Process

#### Story 5.1: Branch Requests Settlement
**As a** Branch Manager
**I want to** request payout of my pending earnings
**So that** I receive the money in my bank account

**Acceptance Criteria:**
- [ ] AC1: "Request Settlement" button on dashboard
- [ ] AC2: Shows amount to be settled (pending earnings)
- [ ] AC3: Branch enters bank/GCash/Maya details
- [ ] AC4: Request submitted for Super Admin approval
- [ ] AC5: Email notification sent to Super Admin

**Settlement Request Form:**
```
┌─────────────────────────────────────────┐
│  REQUEST SETTLEMENT                      │
├─────────────────────────────────────────┤
│                                          │
│  Amount: ₱4,750.00                       │
│  (10 wallet transactions)                │
│                                          │
│  Payout Method:                          │
│  ○ GCash                                 │
│  ● Maya                                  │
│  ○ Bank Transfer                         │
│                                          │
│  Account Number: 09*******89             │
│  Account Name: Juan Branch Inc           │
│                                          │
│  [Submit Request]                        │
│                                          │
└─────────────────────────────────────────┘
```

---

#### Story 5.2: Super Admin Approves Settlement
**As a** Super Admin
**I want to** review and approve settlement requests
**So that** I can verify before releasing funds

**Acceptance Criteria:**
- [ ] AC1: Dashboard shows pending settlement requests
- [ ] AC2: Can view breakdown of transactions in request
- [ ] AC3: Approve or reject with reason
- [ ] AC4: On approval, marks as "processing"
- [ ] AC5: Manual bank transfer by Super Admin (Phase 1)
- [ ] AC6: Mark as "completed" after transfer done

**Settlement Queue:**
```
┌─────────────────────────────────────────────────────┐
│  SETTLEMENT REQUESTS                                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Pending (3)                                         │
│  ┌─────────────────────────────────────────────────┐│
│  │ Branch A    │ ₱4,750   │ Jan 30  │ [Review]    ││
│  │ Branch B    │ ₱2,100   │ Jan 29  │ [Review]    ││
│  │ Branch C    │ ₱8,500   │ Jan 28  │ [Review]    ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Processing (1)                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ Branch D    │ ₱3,200   │ Approved │ [Complete] ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

#### Story 5.3: Settlement History & Receipts
**As a** Branch Manager
**I want to** view my settlement history
**So that** I have records for accounting

**Acceptance Criteria:**
- [ ] AC1: List of all past settlements
- [ ] AC2: Status: pending, approved, processing, completed, rejected
- [ ] AC3: Downloadable receipt/confirmation for each
- [ ] AC4: Filter by date range and status

---

### Epic 6: Reporting & Analytics

#### Story 6.1: Super Admin Wallet Overview
**As a** Super Admin
**I want to** see overall wallet system health
**So that** I can monitor the float and settlements

**Dashboard Metrics:**
```
┌─────────────────────────────────────────────────────┐
│  WALLET SYSTEM OVERVIEW                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Total Float (Money Held)        ₱125,000           │
│  Outstanding to Branches         ₱45,000            │
│  Available for Operations        ₱80,000            │
│                                                      │
│  This Month                                          │
│  ─────────────────────────────────                  │
│  Total Top-ups:          ₱250,000                   │
│  Total Wallet Payments:  ₱180,000                   │
│  Commission Earned:      ₱9,000 (5%)                │
│  Settlements Paid:       ₱135,000                   │
│                                                      │
│  By Branch                                           │
│  ┌────────────────────────────────────────────────┐ │
│  │ Branch    │ Earnings │ Pending │ Settled      │ │
│  │ Branch A  │ ₱25,000  │ ₱4,750  │ ₱20,250     │ │
│  │ Branch B  │ ₱18,000  │ ₱2,100  │ ₱15,900     │ │
│  │ Branch C  │ ₱32,000  │ ₱8,500  │ ₱23,500     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### New Tables

```typescript
// convex/schema.ts additions

// Store Super Admin wallet configuration
wallet_config: defineTable({
  paymongo_public_key: v.string(),
  paymongo_secret_key: v.string(),
  paymongo_webhook_secret: v.string(),
  is_test_mode: v.boolean(),
  default_commission_percent: v.number(),  // e.g., 5
  default_settlement_frequency: v.string(), // "daily" | "weekly" | "biweekly"
  min_settlement_amount: v.number(),        // e.g., 500
  created_at: v.number(),
  updated_at: v.number(),
}),

// Branch-specific wallet settings
branch_wallet_settings: defineTable({
  branch_id: v.id("branches"),
  commission_override: v.optional(v.number()),
  settlement_frequency: v.optional(v.string()),
  payout_method: v.string(),               // "gcash" | "maya" | "bank"
  payout_account_number: v.string(),
  payout_account_name: v.string(),
  payout_bank_name: v.optional(v.string()), // For bank transfers
  created_at: v.number(),
  updated_at: v.number(),
}).index("by_branch", ["branch_id"]),

// Wallet top-up transactions (already exists, verify structure)
wallet_topups: defineTable({
  user_id: v.id("users"),
  amount: v.number(),
  bonus_amount: v.number(),
  payment_id: v.string(),           // PayMongo payment ID
  checkout_session_id: v.string(),  // PayMongo session ID
  status: v.string(),               // "pending" | "completed" | "failed"
  created_at: v.number(),
}),

// Branch wallet earnings ledger
branch_wallet_earnings: defineTable({
  branch_id: v.id("branches"),
  booking_id: v.id("bookings"),
  customer_id: v.id("users"),
  staff_id: v.optional(v.id("users")),
  service_name: v.string(),
  gross_amount: v.number(),
  commission_percent: v.number(),
  commission_amount: v.number(),
  net_amount: v.number(),
  settlement_id: v.optional(v.id("branch_settlements")),
  status: v.string(),  // "pending" | "settled"
  created_at: v.number(),
})
.index("by_branch", ["branch_id"])
.index("by_branch_status", ["branch_id", "status"])
.index("by_settlement", ["settlement_id"]),

// Branch settlement requests
branch_settlements: defineTable({
  branch_id: v.id("branches"),
  requested_by: v.id("users"),
  amount: v.number(),
  earnings_count: v.number(),       // Number of transactions included
  payout_method: v.string(),
  payout_account_number: v.string(),
  payout_account_name: v.string(),
  payout_bank_name: v.optional(v.string()),
  status: v.string(),  // "pending" | "approved" | "processing" | "completed" | "rejected"
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

### Modified Tables

```typescript
// Add to existing users table
users: defineTable({
  // ... existing fields ...
  wallet_balance: v.number(),  // Already exists, verify
}),

// Add to existing branches table
branches: defineTable({
  // ... existing fields ...
  wallet_pending_earnings: v.optional(v.number()),  // Cached for performance
}),
```

---

## 5. API Endpoints

### Convex Services

```typescript
// convex/services/walletConfig.ts
export const getWalletConfig = query(...);           // Get Super Admin wallet config
export const updateWalletConfig = mutation(...);     // Update wallet config
export const getBranchWalletSettings = query(...);   // Get branch settings
export const updateBranchWalletSettings = mutation(...);

// convex/services/walletPayment.ts
export const createWalletTopup = action(...);        // Create top-up checkout
export const processWalletPayment = mutation(...);   // POS wallet payment
export const processComboPayment = mutation(...);    // Wallet + other payment

// convex/services/branchEarnings.ts
export const getBranchEarnings = query(...);         // Get earnings dashboard
export const getBranchEarningsList = query(...);     // List individual earnings
export const getPendingEarningsTotal = query(...);   // Sum pending earnings

// convex/services/settlements.ts
export const requestSettlement = mutation(...);      // Branch requests payout
export const getPendingSettlements = query(...);     // SA: list pending
export const approveSettlement = mutation(...);      // SA: approve
export const rejectSettlement = mutation(...);       // SA: reject
export const completeSettlement = mutation(...);     // SA: mark complete
export const getBranchSettlementHistory = query(...);// Branch: history

// convex/services/walletAnalytics.ts
export const getWalletOverview = query(...);         // SA: system overview
export const getBranchWalletSummary = query(...);    // Per-branch summary
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
| Story | Priority | Effort |
|-------|----------|--------|
| 1.1 Super Admin PayMongo Config | P0 | M |
| 1.2 Global Commission Rate | P0 | S |
| 3.1 Wallet Top-up via SA PayMongo | P0 | L |

**Deliverable:** Customers can top up wallet, money goes to Super Admin

### Phase 2: Branch Earnings (Week 2-3)
| Story | Priority | Effort |
|-------|----------|--------|
| 2.1 Record Wallet Earnings | P0 | M |
| 2.2 Branch Earnings Dashboard | P0 | M |
| 4.1 POS Wallet Payment | P0 | L |

**Deliverable:** Branches can accept wallet payments, see earnings

### Phase 3: Settlement (Week 3-4)
| Story | Priority | Effort |
|-------|----------|--------|
| 5.1 Branch Requests Settlement | P0 | M |
| 5.2 SA Approves Settlement | P0 | M |
| 5.3 Settlement History | P1 | S |
| 1.3 Settlement Frequency Config | P1 | S |

**Deliverable:** Complete settlement flow working

### Phase 4: Enhancements (Week 4+)
| Story | Priority | Effort |
|-------|----------|--------|
| 4.2 Combo Payment | P1 | M |
| 6.1 SA Wallet Overview | P1 | M |
| 3.2 Top-up Bonus Integration | P2 | S |

**Deliverable:** Full feature set complete

---

## 7. Technical Architecture

### Money Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     TPX WALLET ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    TOP-UP     ┌──────────────┐                    │
│  │ CUSTOMER │ ────────────→ │ SUPER ADMIN  │                    │
│  │  Wallet  │               │   PayMongo   │                    │
│  └──────────┘               └──────┬───────┘                    │
│       │                            │                             │
│       │ PAY WITH WALLET            ▼                             │
│       │                     ┌──────────────┐                    │
│       │                     │ SUPER ADMIN  │                    │
│       │                     │    BANK      │                    │
│       ▼                     └──────┬───────┘                    │
│  ┌──────────┐                      │                             │
│  │ BRANCH A │ ◄── Ledger Entry ────┤                             │
│  │ (Service)│     (Earned)         │                             │
│  └────┬─────┘                      │                             │
│       │                            │                             │
│       │ REQUEST                    │ APPROVE + TRANSFER          │
│       │ SETTLEMENT                 │                             │
│       ▼                            ▼                             │
│  ┌──────────────────────────────────────┐                       │
│  │          SETTLEMENT FLOW             │                       │
│  │  Branch Request → SA Approve → GCash │                       │
│  └──────────────────────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Commission Calculation

```
Example: Customer pays ₱500 with wallet at Branch A
─────────────────────────────────────────────────────
Gross Amount:           ₱500.00
Commission (5%):       -₱25.00
─────────────────────────────────────────────────────
Branch A Earns:         ₱475.00 (added to ledger)
Super Admin Keeps:      ₱25.00
```

### Wallet Payment Flow (POS)

```
1. Customer at POS → Staff selects "Wallet Payment"
2. System checks customer wallet balance
3. If balance >= total:
   - Deduct from customer wallet_balance
   - Create branch_wallet_earning record
   - Complete booking as paid
4. If balance < total:
   - Offer combo payment
   - Wallet portion → branch_wallet_earning
   - Cash/card portion → normal payment flow
```

---

## 8. Security Considerations

### Data Protection
- PayMongo secret keys encrypted at rest
- Only Super Admin can view/edit wallet config
- Branch managers can only see their own earnings
- Settlement requests require authentication

### Financial Controls
- All wallet transactions logged with audit trail
- Settlement requires manual Super Admin approval
- Bank account details validated before payout
- Commission calculations verified and logged

### Fraud Prevention
- Rate limiting on top-up requests
- Large top-up amounts flagged for review
- Settlement request cooldown period
- Unusual activity alerts

---

## 9. Testing Strategy

### Unit Tests
- Commission calculation accuracy
- Wallet balance deduction logic
- Settlement status transitions
- Data model constraints

### Integration Tests
- PayMongo checkout flow (top-up)
- POS wallet payment end-to-end
- Settlement request/approval flow
- Webhook handling for top-ups

### Manual Testing
- Branch earnings dashboard UX
- Settlement request form validation
- Super Admin approval workflow
- Mobile responsiveness

---

## 10. Rollout Plan

### Stage 1: Internal Testing
- Deploy to staging environment
- Test with 2-3 pilot branches
- Verify all flows working

### Stage 2: Soft Launch
- Enable for select branches
- Monitor for issues
- Gather feedback

### Stage 3: Full Rollout
- Enable for all branches
- Provide training materials
- Monitor adoption metrics

---

## 11. Open Questions

| Question | Status | Decision |
|----------|--------|----------|
| Automated bank transfers (Phase 2)? | Open | Manual for now, automate later |
| Refund handling for wallet payments? | Open | Needs discussion |
| Wallet expiry policy? | Open | No expiry initially |
| Minimum top-up amount? | Open | Suggest ₱100 minimum |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Float** | Total money held by Super Admin from wallet top-ups |
| **Pending Earnings** | Branch's wallet earnings not yet settled |
| **Settlement** | Process of transferring earnings to branch bank account |
| **Commission** | Percentage retained by Super Admin for wallet management |
| **Ledger** | Record of all wallet payment transactions per branch |

---

## Appendix B: Related Documents

- [Brainstorming Session 2026-01-30](../analysis/brainstorming-session-2026-01-30.md)
- [Existing Wallet Implementation](../../convex/services/wallet.ts)
- [PayMongo Integration](../../convex/services/paymongo.ts)

---

**Document History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | MASTERPAINTER | Initial draft |
