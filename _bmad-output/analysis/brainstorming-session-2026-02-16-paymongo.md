---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'PayMongo Payment Fallback & Settlement System'
session_goals: 'Define fallback routing when branch has no PayMongo, admin account as temporary gateway, settlement tracking by source (online vs wallet), integration with existing settlement UI'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'Morphological Analysis', 'SCAMPER Method']
ideas_generated: [27]
context_file: ''
technique_execution_complete: true
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** MASTERPAINTER
**Date:** 2026-02-16

## Session Overview

**Topic:** PayMongo Payment Fallback & Settlement System
**Goals:** Define how admin's PayMongo acts as temporary fallback for branches without their own setup, how settlements are tracked by source (online payment vs wallet payment), and how this integrates with the existing wallet settlement queue/approval UI.

### Session Setup

Branches can have their own PayMongo account for receiving booking payments and product purchases. When a branch hasn't set up PayMongo yet, the super admin's PayMongo account should temporarily process those payments. The collected funds then need to be settled to the branch through a process similar to the existing wallet settlement feature, with clear labeling of whether each settlement item came from online payments or wallet payments.

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Payment fallback system with focus on multi-stakeholder flows, financial accountability, and settlement reconciliation

**Recommended Techniques:**

- **Role Playing:** Embody super admin, branch manager, and customer perspectives to map what each stakeholder needs from the fallback and settlement system
- **Morphological Analysis:** Systematically explore all parameters — payment sources, settlement frequencies, approval flows, fee handling, labeling — and map combinations
- **SCAMPER Method:** Stress-test the design through 7 innovation lenses, maximizing reuse of existing wallet settlement infrastructure

## Technique Execution Results

### Role Playing (Phase 1: Foundation)

**Super Admin Perspective:**
- **#1 Branch-Level Transaction Breakdown**: Admin dashboard shows payments grouped by branch — each expandable to see individual transactions. Admin sees money already attributed to the right branch automatically.
- **#2 Source Labeling Per Transaction**: Every transaction tagged with source — "Online Payment (PayMongo)" vs "Wallet Payment" — as basis for settlement categorization.
- **#3 Audit Reconciliation Against PayMongo**: System cross-checks internal records against PayMongo API. Admin sees reconciliation status — "Matched", "Pending", or "Mismatch" — for two-source verification.
- **#4 Individual Transaction Approval**: Admin reviews each transaction before releasing settlement — can approve, flag, or hold individual items. No bulk "release all." Mirrors existing wallet settlement approval queue.
- **#5 Fees Absorbed in Existing Commission**: PayMongo fees already accounted for in commission percentage. No new fee logic, no branch-side fee surprises. Fallback is financially invisible to branches.

**Branch Manager Perspective:**
- **#6 Real-Time Payment Confirmation (Already Exists)**: Webhooks fire when PayMongo receives payment — branch sees "Payment Received" regardless of whose PayMongo processed it.
- **#7 Daily Settlement Cycle (Already Exists)**: Settlements happen daily during work hours — same cadence whether branch has own PayMongo or uses fallback.
- **#8 Commission Delta as Migration Incentive**: Fallback costs 3-4% commission through settlements; own PayMongo costs 2.5-2.8%. The ~1% difference is built-in financial motivation to set up own account. But this is also intentional business revenue for super admin.

**Customer Perspective:**
- **#10 Invisible Fallback — Zero Customer Impact**: PayMongo checkout identical whether branch has own account or uses admin's. Same UI, same confirmation, same receipt. Routing is purely backend.
- **#11 Consistent Payment Receipt**: Receipt shows branch name and booking details, not admin's business name. Prevents customer confusion.

### Morphological Analysis (Phase 2: Parameter Mapping)

**Routing Logic:**
- **#12 Two-Layer Routing Logic**: First check `paymongo_active: true` + valid keys → route to branch. If no → automatic fallback to admin. Toggle gives explicit control, key check is safety net.
- **#13 Admin PayMongo as System Default**: Admin's keys stored at system/platform level. Absence of branch keys IS the trigger. No special "fallback mode" flag needed.

**Transaction Attribution:**
- **#14 Transaction Attribution Schema**: Every transaction stamped with `processed_via: "admin" | "branch"`. This single field determines whether transaction enters settlement queue or goes directly to branch.
- **#15 Settlement Queue Filter**: Existing queue filtered to only show `processed_via === "admin"`. Branch-direct transactions never appear — money already in their account.

**Source Labeling:**
- **#16 Source Label as Informational Tag**: "Online Payment" or "Wallet Payment" displayed as visual badge. No filtering or batch logic tied to it. Purely answers "where did this come from?"

**Transition Flow:**
- **#17 Clean Cutoff Transition**: When branch activates own PayMongo, new payments route to their account immediately. Old unsettled transactions continue settling normally through admin queue. Two streams briefly coexist until admin queue drains.
- **#18 No Retroactive Re-routing**: Once stamped `processed_via: "admin"`, it stays forever. Historical records immutable. Prevents accounting nightmares.
- **#19 Automatic Fallback on Deactivation**: Branch PayMongo deactivated → system automatically falls back to admin's. Bidirectional — branches move on/off seamlessly.

### SCAMPER Method (Phase 3: Refinement)

- **#20 Substitute — Almost Everything Exists**: Settlement queue, approval UI, daily cycle, webhooks, PayMongo integration, commission logic — all exist. Only new work is `processed_via` + `payment_source` fields and source labels in settlement UI.
- **#21 Combine — Single Queue, Multiple Sources**: No separate "PayMongo fallback settlement" queue. Existing wallet settlement queue gets new source tags. One queue, one flow, one UI.
- **#22 Adapt — Schema + Display**: Two small adaptations: (1) Add `processed_via` to transactions, (2) Show source badge in settlement rows. Backward compatible — existing transactions default to `"branch"`.
- **#23 Modify — Summary Totals by Source**: Settlement queue header shows "Online Payments: PX | Wallet Payments: PY | Total: PZ" for instant admin snapshot.
- **#24 Put to Other Uses — Distributor Branch Pattern**: Instead of binary `"admin" | "branch"`, design `processed_via` as entity pointer. Scales to distributor→sub-branch pattern without schema changes later.
- **#25 Hierarchical Settlement Chains**: Future: Customer pays → Distributor PayMongo processes → Distributor settles to sub-branch. Same queue, same approval, same labels.
- **#26 Eliminate — No Cost Comparison Nudge**: Commission delta is deliberate business model for super admin. No "you could save X" messaging. Fallback is a service, not a penalty.
- **#27 Reverse — Permanent Fallback as Service Tier**: Fallback isn't transitional — it's a valid permanent operating mode. Some branches prefer paying higher commission in exchange for not managing own PayMongo. Admin handles everything.

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Payment Routing & Fallback Logic**
_Focus: How payments get directed to the right PayMongo account_

- **#12 Two-Layer Routing Logic** — Toggle + key validation, double safety net
- **#13 Admin PayMongo as System Default** — Absence of branch keys IS the trigger
- **#19 Automatic Fallback on Deactivation** — Bidirectional, works both ways seamlessly

**Theme 2: Transaction Attribution & Tracking**
_Focus: How each transaction gets stamped for downstream processing_

- **#14 Transaction Attribution Schema** — `processed_via: "admin" | "branch"` drives everything
- **#15 Settlement Queue Filter** — Only `processed_via === "admin"` enters the queue
- **#16 Source Label as Informational Tag** — "Online Payment" / "Wallet Payment" for visibility
- **#22 Adapt — Schema + Display** — Two small changes: field addition + badge display

**Theme 3: Settlement & Approval**
_Focus: How admin reviews and releases branch funds_

- **#1 Branch-Level Transaction Breakdown** — Payments grouped by branch, expandable
- **#2 Source Labeling Per Transaction** — Tags determine settlement categorization
- **#3 Audit Reconciliation Against PayMongo** — Two-source verification
- **#4 Individual Transaction Approval** — One-by-one review, no bulk release
- **#5 Fees in Existing Commission** — Zero new fee logic
- **#21 Single Queue, Multiple Sources** — One queue handles wallet + PayMongo fallback
- **#23 Summary Totals by Source** — Header shows Online: PX | Wallet: PY | Total: PZ

**Theme 4: Branch Experience & Transparency**
_Focus: What the branch sees and feels_

- **#6 Real-Time Payment Confirmation** — Webhooks already handle this
- **#7 Daily Settlement Cycle** — Already exists, same cadence
- **#8 Commission Delta as Migration Incentive** — 3-4% vs 2.5-2.8%, intentional business revenue

**Theme 5: Transition & Lifecycle**
_Focus: How branches move on/off the fallback_

- **#17 Clean Cutoff Transition** — Old settles normally, new goes direct
- **#18 No Retroactive Re-routing** — Transactions immutable once stamped

**Theme 6: Future Scale — Distributor Model**
_Focus: Reuse pattern for distributor branches_

- **#24 processed_via as Entity Pointer** — Points to WHO processed, not binary flag
- **#25 Hierarchical Settlement Chains** — Distributor → sub-branch, same pattern

**Breakthrough Concepts:**
- **#20 Almost Everything Already Exists** — Only metadata is new code
- **#26 No Cost Comparison Nudge** — Commission delta is intentional revenue
- **#27 Permanent Fallback as Service Tier** — Not temporary, it's a managed payment service

### Prioritization Results

**Top Priority — Implement First:**
1. **Transaction Attribution** (#14, #22) — Add `processed_via` and `payment_source` fields to schema
2. **Routing Logic** (#12, #13) — Branch key check with admin fallback
3. **Settlement Queue Extension** (#15, #21, #16, #23) — Filter + source labels + summary totals

**Quick Win (Already Done):**
- Webhooks (#6), Daily settlements (#7), Commission handling (#5), Customer experience (#10, #11) — no changes needed

**Future Phase — Distributor Model:**
- Entity pointer schema (#24), Hierarchical chains (#25) — implement when distributor branches launch

### Action Planning

**Phase 1: Schema & Backend**
1. Add `processed_via` field to transaction schema (`"admin" | "branch"` or entity reference)
2. Add `payment_source` field (`"online_paymongo" | "wallet"`)
3. Add `paymongo_active` toggle + key fields to branch record (if not already there)
4. Implement routing logic in payment processing — check branch keys → fallback to system default

**Phase 2: Settlement Queue Extension**
1. Filter settlement query to include `processed_via === "admin"` transactions
2. Add source badge (Online Payment / Wallet Payment) to each settlement row
3. Add summary totals header by source
4. Individual approval flow — reuse existing approval mutation

**Phase 3: Transition Handling**
1. On branch PayMongo activation → new payments route to branch, old queue drains naturally
2. On branch PayMongo deactivation → automatic fallback to admin
3. No retroactive changes to existing transactions

**Future Phase 4: Distributor Scale**
1. Refactor `processed_via` from string enum to entity reference
2. Enable distributor branches as intermediate payment processors
3. Same settlement queue pattern at distributor level

## Session Summary and Insights

**Key Achievements:**
- Mapped all 3 stakeholder perspectives (super admin, branch manager, customer) and discovered most infrastructure already exists
- Identified that only 2 new schema fields + UI badges constitute the entire new development work
- Uncovered that the commission delta is intentional business revenue, not a problem to fix
- Designed for future distributor branch scale without over-engineering the current implementation
- Established that permanent fallback is a valid service tier, not just a temporary workaround

**Session Reflections:**
The combination of Role Playing (stakeholder mapping), Morphological Analysis (parameter-by-parameter design), and SCAMPER (reuse optimization) revealed that this is one of the leanest features possible — 80% of the infrastructure already exists. The key breakthrough was recognizing that the fallback system isn't a workaround but a legitimate managed payment service tier with intentional revenue model. The `processed_via` field design also future-proofs for the distributor branch model without adding complexity now.
