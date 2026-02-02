---
stepsCompleted: [1, 2, 3]
inputDocuments: []
session_topic: 'Multi-branch TPX Wallet Payment Architecture'
session_goals: 'Design money flow for branches, enable POS wallet payments, solve deposit routing and settlement'
selected_approach: 'AI-Recommended Techniques'
techniques_used: ['Six Thinking Hats', 'First Principles Thinking', 'Cross-Pollination']
ideas_generated: ['Centralized wallet model', 'Percentage-based commission', 'Request-approval settlement', 'Bank transfer payouts', 'Flexible per-branch settlement']
context_file: ''
status: 'completed'
---

# Brainstorming Session Results

**Facilitator:** MASTERPAINTER
**Date:** 2026-01-30

## Session Overview

**Topic:** Multi-branch TPX Wallet Payment Architecture

**Goals:**
- Determine where wallet top-up deposits should go (branch vs central)
- Design settlement flow for branches when customers pay with wallet
- Align wallet deposits with branch-specific PayMongo configuration
- Enable POS to accept TPX wallet payments

### Key Challenges Identified

1. **Deposit Routing**: Which PayMongo account receives wallet top-ups?
2. **Branch Settlement**: How do branches get paid when customers use central wallet?
3. **Branch PayMongo Integration**: Each branch has own PayMongo - how does wallet fit?
4. **POS Wallet Support**: Staff need to accept wallet payments at counter

### Session Setup

**Approach Selected:** AI-Recommended Techniques (customized for payment/business model problems)

## Technique Selection

**AI-Recommended Sequence:**
1. **Six Thinking Hats** - Stakeholder perspective exploration (~20 min)
2. **First Principles Thinking** - Fundamental truths about payment flow (~25 min)
3. **Cross-Pollination** - Patterns from other industries (~20 min)

**Rationale:** Multi-stakeholder payment architecture requires understanding all perspectives first, then stripping assumptions to find core truths, and finally borrowing proven patterns from similar business models.

---

## Phase 1: Six Thinking Hats ✅

*Exploring the wallet architecture from six distinct perspectives*

### White Hat (Facts)
- 15-20 branches, each with own PayMongo account
- 50-100 wallet transactions/month expected
- Wallet balance stored centrally in `users.wallet_balance`
- Bi-weekly settlement needed for branches

### Red Hat (Emotions)
- **Branch Owners**: Worried about "how will withdrawal work?"
- **Customers**: Trust wallet IF usable at any branch (portability = trust)
- **Super Admin**: Willing to manage complexity centrally to help branches

### Yellow Hat (Benefits)
- Customers: Smooth, frictionless transactions
- Branches: More versatile payment options
- Super Admin: Full visibility into deposits and money flow
- Brand: "The versatile payment system for barbershops"

### Black Hat (Risks & Mitigations)
- Cash Flow → Implement withdrawal timeframe/schedule
- Technical → Manual checking as fallback
- Trust/Disputes → Thorough checking before release
- Regulatory → None identified
- Fraud → Security-first approach

### Green Hat (Creativity)
- Branch-specific deposits ❌ Conflicts when branches are nearby
- Home branch concept ❌ Would raise disputes
- Super_admin float fund ❌ Not applicable
- **Conclusion: Centralized wallet is the ONLY viable option**

### Blue Hat (Process Summary)
**Emerging Architecture:**
1. All wallet top-ups → Super Admin's PayMongo
2. Branches settled bi-weekly based on wallet transactions at their location
3. Central system tracks which branch earned what

---

## Phase 2: First Principles Thinking ✅

*Stripping away assumptions to find fundamental truths about the payment flow*

### Core Questions & Answers

| Question | Answer |
|----------|--------|
| Where does money go when customer tops up? | **Super Admin's PayMongo** (single collection point) |
| Where does money sit until used? | **Super Admin's bank account** (central treasury) |
| How do branches get their share? | **Branch ledger** tracks wallet payments → withdrawal requests |
| Is settlement automatic or manual? | **Configurable per branch** |
| Can branches see pending earnings? | **Yes** - real-time dashboard visibility |

### Settlement Model Decision

**Chosen Approach: Flexible Per-Branch Settlement**
- Can be **daily** (high-volume branches)
- Can be **weekly/bi-weekly** (smaller branches)
- **Branch-configurable** frequency
- Super Admin approves/processes withdrawals

### Fundamental Truths Identified

| Principle | Implication |
|-----------|-------------|
| **Single Collection Point** | Super Admin PayMongo receives ALL wallet top-ups |
| **Central Treasury** | Super Admin holds float until settlement |
| **Branch Ledger** | Each branch has virtual "receivable" balance |
| **Withdrawal Model** | Branches request payout from Super Admin |
| **Transparency Required** | Branches must see their earnings in real-time |
| **Flexible Settlement** | Daily/weekly/bi-weekly per branch preference |

---

## Phase 3: Cross-Pollination ✅

*Borrowing proven patterns from similar multi-location payment systems*

### Industry Parallels Analyzed

| System | Pattern | Applied to TPX |
|--------|---------|----------------|
| **Starbucks Card** | Central wallet, any store | ✅ Same model |
| **GrabPay Merchants** | Central → daily/weekly payout | ✅ Settlement model |
| **Foodpanda/GrabFood** | Order → central collects → restaurant settles | ✅ Exact pattern |

### Cross-Pollination Decisions

| Question | Decision |
|----------|----------|
| **Commission/Fee Model** | **Percentage-based** - Super Admin takes % for managing system |
| **Settlement Initiation** | **Branch requests → Super Admin approves** |
| **Settlement Method** | **Bank transfer** (GCash/Maya to branch account) |

### Patterns Adopted

**Pattern 1: Hub & Spoke Money Flow**
```
Customer Top-up → Super Admin PayMongo → Super Admin Bank
                                              ↓
Customer Pays at Branch A ──────────→ Branch A Ledger (+)
                                              ↓
Branch A Requests Settlement ─────→ Super Admin Approves
                                              ↓
                              Bank Transfer → Branch A Account
```

**Pattern 2: Commission Model (like GrabFood)**
- Branch earns: **Service Amount - Commission %**
- Super Admin keeps: **Commission %** for wallet management
- Transparent: Branch sees gross and net in dashboard

**Pattern 3: Request-Approval Flow**
1. Branch sees accumulated wallet earnings
2. Branch clicks "Request Settlement"
3. Super Admin reviews and approves
4. System processes bank transfer
5. Both parties get confirmation

---

## 🎯 Final Architecture Summary

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

### Data Model Required

| Table | Purpose |
|-------|---------|
| `wallet_topups` | Track customer top-ups (to Super Admin) |
| `branch_wallet_earnings` | Ledger of wallet payments per branch |
| `branch_settlements` | Settlement requests and status |
| `wallet_config` | Commission %, settlement frequency per branch |

### Key Features to Build

1. **Super Admin PayMongo Config** - Separate config for wallet top-ups
2. **Branch Earnings Dashboard** - Real-time wallet earnings view
3. **Settlement Request UI** - Branch requests payout
4. **Settlement Approval UI** - Super Admin approves/processes
5. **Commission Configuration** - Set % per branch or global
6. **POS Wallet Payment** - Staff accepts wallet at counter

### Commission Structure

```
Example: Customer pays ₱500 with wallet at Branch A
─────────────────────────────────────────────────────
Gross Amount:           ₱500.00
Commission (5%):       -₱25.00
─────────────────────────────────────────────────────
Branch A Earns:         ₱475.00 (added to ledger)
Super Admin Keeps:      ₱25.00
```

---

## 📋 Implementation Roadmap

### Phase 1: Foundation
- [ ] Super Admin wallet PayMongo configuration
- [ ] `branch_wallet_earnings` ledger table
- [ ] Commission % configuration

### Phase 2: Customer Flow
- [ ] Wallet top-up goes to Super Admin PayMongo
- [ ] Balance stored centrally in `users.wallet_balance`

### Phase 3: Branch Payment
- [ ] POS wallet payment acceptance
- [ ] Auto-record to branch earnings ledger
- [ ] Apply commission calculation

### Phase 4: Settlement
- [ ] Branch settlement request UI
- [ ] Super Admin approval dashboard
- [ ] Bank transfer processing
- [ ] Settlement history/receipts

---

## ✅ Session Complete

**Key Decisions Made:**
1. ✅ Centralized wallet (Super Admin PayMongo)
2. ✅ Percentage-based commission
3. ✅ Branch request → Super Admin approve settlement
4. ✅ Bank transfer (GCash/Maya) for payouts
5. ✅ Flexible settlement frequency per branch
6. ✅ Real-time earnings visibility for branches

