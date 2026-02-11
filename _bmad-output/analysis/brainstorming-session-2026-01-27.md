---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'PayMongo Payment Integration for TipunoX Booking App'
session_goals: 'Online deposits, full payments, pay now/later, branch tracking, all PayMongo methods, per-branch API keys, per-branch QR setup'
selected_approach: 'AI-Recommended Techniques'
techniques_used:
  - 'First Principles Thinking'
ideas_generated: 7
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session - PayMongo Payment Integration

**Session Date:** 2026-01-27
**Facilitator:** Claude (Analyst Agent)
**Participant:** MASTERPAINTER

## Session Overview

**Topic:** PayMongo Payment Integration for TipunoX Barbershop Booking System
**Goals:** Design comprehensive online payment system with branch-level configuration and tracking

### Context Guidance

This is a **brownfield project** enhancement to the existing TipunoX Booking App. The system currently has:
- Multi-branch architecture with role-based access
- Existing booking and appointment system
- Branch-specific configurations
- 6 user roles (super_admin, admin, branch_admin, staff, barber, customer)

### Session Setup

**Payment Integration Requirements:**
- Online booking deposits and prepayments
- Full service payment at booking time
- Pay Now / Pay Later flexibility
- Branch Transaction Tracking
- All PayMongo payment methods (GCash, Maya, Cards, GrabPay, Bank transfers)
- Per-Branch API Keys
- Per-Branch QR Setup for payment tracking

---

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** PayMongo Payment Integration with focus on multi-branch architecture

**Recommended Techniques:**

1. **First Principles Thinking:** Break down payment integration to fundamental components - what data MUST exist for each transaction?
2. **Morphological Analysis:** Systematically explore all combinations of payment types x methods x branch configurations
3. **SCAMPER Method:** Apply creative lenses to integrate payments into existing booking flow

**AI Rationale:** Complex multi-tenant payment system requires foundational clarity (First Principles), comprehensive scenario coverage (Morphological), and practical integration design (SCAMPER).

---

## Technique Execution Results

### First Principles Thinking

**Interactive Focus:** Deconstructing payment system to fundamental building blocks
**Key Breakthroughs:** Identified core business rules and payment flows

---

## Ideas Generated

### Idea #1: Pay Later Convenience Fee Model
**Category:** Business Logic
_Concept_: "Pay Later" isn't free flexibility - it carries a convenience fee that compensates both the barber (for time commitment risk) and the shop (for payment uncertainty). This creates a financial incentive to pay online.
_Novelty_: Flips "Pay Later" from a customer convenience into a premium option rather than the default.

### Idea #2: Convenience Fee as Commitment Guarantee
**Category:** Payment Flow
_Concept_: Pay Later requires upfront online payment of ONLY the convenience fee. This creates a financial "skin in the game" without full prepayment - customer commits something, reducing no-shows.
_Novelty_: Hybrid model - not fully prepaid, not fully "pay at shop" - the fee itself is the commitment mechanism.

### Idea #3: Branch-Configurable Fee Structure
**Category:** Branch Configuration
_Concept_: Each branch sets their own convenience fee AND the split ratio between barber/shop. High-demand branches might charge more; new branches might charge less to attract customers.
_Novelty_: Turns payment policy into a competitive/business lever at the branch level.

### Idea #4: Asymmetric Refund Policy
**Category:** Business Rules
_Concept_: Pay Now no-shows CAN reschedule (with optional penalty). Pay Later convenience fees are NEVER refunded. This creates clear risk/reward for each option.
_Novelty_: Different refund rules based on payment type creates behavioral incentives.

### Idea #5: Decentralized Payment Accounts
**Category:** Architecture
_Concept_: Each branch owns their PayMongo relationship - they create their account, get their API keys, generate their QR. TipunoX just stores and uses their credentials. No central payment processing bottleneck.
_Novelty_: Branches are financially independent - funds go directly to THEIR PayMongo, not through HQ. This simplifies accounting and gives branches autonomy.

### Idea #6: Self-Service Branch Payment Setup
**Category:** Onboarding
_Concept_: Branch admin creates PayMongo account -> copies API key into TipunoX -> generates QR from PayMongo -> inputs QR link into TipunoX. No Super Admin involvement needed.
_Novelty_: Reduces HQ operational burden - branches onboard themselves for payments.

### Idea #7: Hybrid Final Payment Collection
**Category:** Payment Flow
_Concept_: "Pay Later" customers complete their balance via EITHER: (1) Scan branch QR -> PayMongo payment -> auto-recorded, OR (2) Pay cash -> staff manually marks paid. Digital option preferred but cash accepted.
_Novelty_: Doesn't force customers into one payment method at the shop - accommodates those without e-wallets while encouraging digital trail.

---

## Core Entities Identified

### Entity 1: Branch Payment Configuration
```
branch_payment_config:
  - branch_id
  - paymongo_api_key (encrypted)
  - paymongo_secret_key (encrypted)
  - qr_code_url (manual entry by branch admin)
  - convenience_fee_amount
  - convenience_fee_barber_split (%)
  - convenience_fee_shop_split (%)
  - no_show_penalty_enabled (boolean)
  - no_show_penalty_amount
  - enabled_payment_methods[] (gcash, maya, card, grabpay, bank)
  - is_active
  - created_at
  - updated_at
```

### Entity 2: Payment Transaction
```
payment_transactions:
  - booking_id
  - branch_id
  - customer_id
  - payment_type: "full" | "deposit" | "convenience_fee" | "remaining_balance"
  - payment_method: "gcash" | "maya" | "card" | "grabpay" | "bank" | "cash"
  - amount
  - paymongo_payment_id (if online payment)
  - paymongo_checkout_id (if applicable)
  - status: "pending" | "paid" | "failed" | "expired"
  - recorded_by (staff_id if manual cash payment)
  - fee_split_barber (calculated amount)
  - fee_split_shop (calculated amount)
  - created_at
  - paid_at
```

### Entity 3: Booking Payment Status
```
booking_payment_status:
  - booking_id
  - payment_option: "pay_now" | "pay_later"
  - total_service_amount
  - convenience_fee (if pay_later)
  - amount_paid_online
  - amount_paid_at_shop
  - balance_remaining
  - fully_paid: boolean
  - payment_completed_at
```

---

## Payment Flow Architecture

### Flow A: Pay Now (Full Payment)
```
1. Customer selects services and books appointment
2. Customer chooses "Pay Now"
3. System calculates total: Service Amount
4. Customer redirected to PayMongo (using BRANCH's API key)
5. Customer pays via GCash/Maya/Card/GrabPay/Bank
6. PayMongo webhook notifies TipunoX of successful payment
7. TipunoX records payment transaction
8. Booking confirmed as PAID
9. Customer receives confirmation
```

### Flow B: Pay Later (Convenience Fee Only)
```
1. Customer selects services and books appointment
2. Customer chooses "Pay Later"
3. System calculates: Convenience Fee (set by branch)
4. Customer shown: "Service: P500 | Convenience Fee: P50 (non-refundable)"
5. Customer redirected to PayMongo for fee payment only
6. Customer pays fee via GCash/Maya/Card/GrabPay/Bank
7. PayMongo webhook notifies TipunoX
8. TipunoX records fee payment, splits between barber/shop
9. Booking confirmed as RESERVED (owes service amount)
10. At shop arrival: Customer pays remaining balance
    - Option A: Scan branch QR -> PayMongo -> auto-recorded
    - Option B: Pay cash -> Staff marks as paid in TipunoX
11. Booking marked as FULLY PAID
```

### Flow C: No-Show Handling
```
Pay Now No-Show:
- Customer has already paid full amount
- Branch can reschedule to new slot
- Optional: Penalty fee for rescheduling (configurable per branch)
- If penalty enabled: Customer pays penalty before rebook

Pay Later No-Show:
- Customer only paid convenience fee
- Convenience fee is NON-REFUNDABLE (barber/shop keep their split)
- Booking marked as NO-SHOW
- Customer can rebook but must pay new convenience fee
```

---

## Idea Organization and Prioritization

### Theme 1: Payment Options & Business Logic
**Focus:** How customers pay and business rules around each option

**Ideas in this cluster:**
- Idea #1: Pay Later Convenience Fee Model
- Idea #2: Convenience Fee as Commitment Guarantee
- Idea #4: Asymmetric Refund Policy

**Pattern Insight:** Payment options aren't just technical choices - they're behavioral incentives that protect the business while offering customer flexibility.

### Theme 2: Branch Autonomy & Configuration
**Focus:** Per-branch customization and financial independence

**Ideas in this cluster:**
- Idea #3: Branch-Configurable Fee Structure
- Idea #5: Decentralized Payment Accounts
- Idea #6: Self-Service Branch Payment Setup

**Pattern Insight:** Branches are treated as independent business units with their own PayMongo accounts, fee structures, and configuration control.

### Theme 3: Transaction Flexibility
**Focus:** Multiple ways to complete payments

**Ideas in this cluster:**
- Idea #7: Hybrid Final Payment Collection

**Pattern Insight:** Supporting both digital and cash payments at the shop accommodates all customer preferences while maintaining transaction records.

---

## Implementation Priority

### Priority 1: Branch Payment Configuration (Foundation)
**Why First:** Everything else depends on branches having their PayMongo credentials configured.

**Deliverables:**
- `branch_payment_config` table in Convex schema
- Branch admin UI to input API keys and QR URL
- Encrypted storage for sensitive credentials
- Payment methods toggle per branch

### Priority 2: Pay Now Full Payment Flow
**Why Second:** Simplest payment flow, validates PayMongo integration works.

**Deliverables:**
- PayMongo checkout session creation
- Webhook endpoint for payment confirmation
- `payment_transactions` table
- Booking status update to PAID

### Priority 3: Pay Later Convenience Fee Flow
**Why Third:** Builds on Pay Now infrastructure, adds fee logic.

**Deliverables:**
- Convenience fee calculation based on branch config
- Fee-only checkout session
- Fee split tracking (barber/shop)
- Booking status as RESERVED
- Remaining balance tracking

### Priority 4: At-Shop Payment Completion
**Why Fourth:** Completes the Pay Later flow.

**Deliverables:**
- QR code payment linking
- Cash payment manual entry by staff
- Balance reconciliation
- Booking marked FULLY PAID

### Priority 5: No-Show & Penalty Handling
**Why Last:** Edge case handling after core flows work.

**Deliverables:**
- No-show marking
- Optional penalty fee enforcement
- Rescheduling with penalty payment

---

## Proposed Database Schema

```typescript
// Branch Payment Configuration
branch_payment_config: defineTable({
  branch_id: v.id("branches"),
  paymongo_public_key: v.string(),
  paymongo_secret_key: v.string(), // encrypted
  qr_code_url: v.optional(v.string()),
  convenience_fee_amount: v.number(), // e.g., 50 for P50
  convenience_fee_barber_percent: v.number(), // e.g., 60 for 60%
  convenience_fee_shop_percent: v.number(), // e.g., 40 for 40%
  no_show_penalty_enabled: v.boolean(),
  no_show_penalty_amount: v.optional(v.number()),
  enabled_payment_methods: v.array(v.string()), // ["gcash", "maya", "card"]
  is_active: v.boolean(),
  created_at: v.number(),
  updated_at: v.number(),
})
  .index("by_branch", ["branch_id"])

// Payment Transactions
payment_transactions: defineTable({
  booking_id: v.optional(v.id("bookings")),
  branch_id: v.id("branches"),
  customer_id: v.optional(v.id("users")),
  payment_type: v.union(
    v.literal("full_payment"),
    v.literal("deposit"),
    v.literal("convenience_fee"),
    v.literal("remaining_balance"),
    v.literal("no_show_penalty")
  ),
  payment_method: v.union(
    v.literal("gcash"),
    v.literal("maya"),
    v.literal("card"),
    v.literal("grabpay"),
    v.literal("bank_transfer"),
    v.literal("cash")
  ),
  amount: v.number(),
  paymongo_payment_id: v.optional(v.string()),
  paymongo_checkout_id: v.optional(v.string()),
  paymongo_checkout_url: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("paid"),
    v.literal("failed"),
    v.literal("expired")
  ),
  fee_split_barber: v.optional(v.number()),
  fee_split_shop: v.optional(v.number()),
  recorded_by: v.optional(v.id("users")), // staff who recorded cash payment
  notes: v.optional(v.string()),
  created_at: v.number(),
  paid_at: v.optional(v.number()),
})
  .index("by_booking", ["booking_id"])
  .index("by_branch", ["branch_id"])
  .index("by_status", ["status"])
  .index("by_paymongo_checkout", ["paymongo_checkout_id"])

// Booking Payment Summary (could be fields on existing bookings table)
// Or a separate tracking table:
booking_payments: defineTable({
  booking_id: v.id("bookings"),
  payment_option: v.union(v.literal("pay_now"), v.literal("pay_later")),
  total_service_amount: v.number(),
  convenience_fee: v.number(), // 0 if pay_now
  total_amount_due: v.number(), // service + fee
  amount_paid_online: v.number(),
  amount_paid_at_shop: v.number(),
  balance_remaining: v.number(),
  is_fully_paid: v.boolean(),
  payment_completed_at: v.optional(v.number()),
})
  .index("by_booking", ["booking_id"])
  .index("by_fully_paid", ["is_fully_paid"])
```

---

## Session Summary and Insights

### Key Achievements:
- Identified 7 core ideas for PayMongo integration
- Designed complete payment flow architecture for Pay Now and Pay Later
- Created branch-level autonomy model with self-service onboarding
- Established asymmetric refund policy that protects business while offering flexibility
- Defined 3 new database tables for payment tracking

### Business Model Insights:
1. **Convenience fee is a commitment mechanism** - not just a surcharge, but ensures customer "skin in the game"
2. **Branch independence simplifies accounting** - funds go directly to branch PayMongo accounts
3. **Asymmetric refund rules create behavioral incentives** - Pay Now gets reschedule flexibility, Pay Later fee is non-refundable

### Technical Insights:
1. **Per-branch API keys require secure encrypted storage** in Convex
2. **Webhook handling is critical** for payment confirmation
3. **QR codes are manually managed** by branch admins (not system-generated)
4. **Cash payments need manual staff entry** to complete Pay Later bookings

---

## Next Steps

This brainstorming session output should be used as input for:

1. **PRD Creation** - Formalize requirements with acceptance criteria
2. **Architecture Document** - Detail PayMongo API integration, webhook handling, security
3. **Epic & Stories** - Break down into implementable user stories

**Recommended PRD Sections:**
- Functional Requirements for each payment flow
- Non-Functional Requirements (security, PCI compliance considerations)
- User Stories per role (customer, branch_admin, staff)
- UI/UX wireframes for payment selection and completion
- PayMongo API integration specifications
- Webhook endpoint design
- Error handling and edge cases
