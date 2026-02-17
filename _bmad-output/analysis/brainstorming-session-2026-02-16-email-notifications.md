---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Email Notification System - Comprehensive Audit, Fix & Expansion'
session_goals: 'Fix broken booking emails, design new transactional email notifications for product orders, settlements, top-ups, low stock alerts, and identify any gaps before schema implementation'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'Morphological Analysis', 'Six Thinking Hats']
ideas_generated: [33]
context_file: ''
technique_execution_complete: true
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** MASTERPAINTER
**Date:** 2026-02-16

## Session Overview

**Topic:** Email Notification System - Comprehensive Audit, Fix & Expansion
**Goals:** Fix broken booking emails, design new transactional email notifications for product orders, settlements, top-ups, low stock alerts, and identify any gaps before schema implementation

### Session Setup

The current email system uses Resend (transactional) and EmailJS (marketing campaigns). Several booking notification emails are not arriving. The user wants to expand the system with new operational email notifications before implementing schema changes.

**Existing System Audit:**
- 7 functional email types (password reset, voucher, booking confirmation, custom booking, status updates, welcome, marketing)
- 3 broken/missing triggers (guest booking, service booking, barber notification)
- 4 new email types requested (product orders, settlements, top-ups, low stock alerts)

**Email Infrastructure:**
- Primary: Resend (backend transactional emails) — upgrading to premium
- Secondary: EmailJS (marketing campaigns, client-side)
- Templates: 5 customizable types + 2 HTML generators
- Database: email_templates, email_campaigns, email_campaign_logs tables

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Email notification system design with focus on stakeholder needs, systematic gap analysis, and risk evaluation

**Recommended Techniques:**

- **Role Playing:** Embody SA, BA, Customer, and Barber perspectives to understand what each stakeholder truly needs in their inbox
- **Morphological Analysis:** Systematically map ALL trigger events × recipients × urgency levels to catch every gap
- **Six Thinking Hats:** Evaluate the complete notification list through facts, risks, benefits, creativity, and process lenses

## Technique Execution Results

### Role Playing (Phase 1: Stakeholder Perspectives)

**Super Admin Perspective:**
- Laser-focused on money movement and supply chain
- Needs IMMEDIATE alerts for: low stock thresholds, settlements, top-ups, new product orders, wallet critically low
- No daily digest needed — prefers real-time for financial events
- Would not ignore any of the proposed notifications

**Branch Admin Perspective:**
- Cares about supply chain, money, and schedule disruptions
- Product order status changes (approved/rejected/shipped/delivered) — YES, needs email for each stage
- Settlement rejected — URGENT priority
- Customer books online — in-app is sufficient (BA is on-site)
- Customer cancels booking — needs email (affects barber schedule)

**Customer Perspective:**
- Booking confirmation with QR — already exists, nothing missing
- Wallet/points top-up receipt — YES, wants receipt-style email
- Booking reminder — YES, but 2 HOURS before (not 24 hours)
- Booking cancelled by branch — YES, needs email

**Barber Perspective:**
- Decision: IN-APP ONLY, no transactional emails
- Rationale: Hands busy, phone in pocket, in-app dashboard between clients is sufficient
- Exception: Monthly earnings summary (email) + Weekly payroll slip (email)
- Current barber email notification is broken and should not be fixed — wrong channel

### Morphological Analysis (Phase 2: Systematic Gap Mapping)

**Domain 1: Bookings**

| Trigger Event | SA | BA | Customer | Barber |
|---|---|---|---|---|
| New booking created | - | in-app | email (existing) | in-app |
| Guest booking created | - | in-app | email (FIX TRIGGER) | in-app |
| Booking cancelled by customer | - | email | - | in-app |
| Booking cancelled by branch | - | - | email | in-app |
| Booking reminder (2hr before) | - | - | email | in-app |
| 15-min late notice | - | - | email | - |
| No-show recorded (1hr) | - | - | email | - |

**Domain 2: Financial / Wallet**

| Trigger Event | SA | BA | Customer | Barber |
|---|---|---|---|---|
| Customer wallet top-up | - | - | email | - |
| Branch wallet top-up | email | email | - | - |
| Wallet balance critically low | email | email | - | - |
| Settlement requested | email | - | - | - |
| Settlement approved | - | email | - | - |
| Settlement completed | email | email | - | - |
| Settlement rejected | - | email (URGENT) | - | - |
| Weekly payroll processed | - | - | - | email |
| Monthly earnings summary | email | email | - | email |

**Domain 3: Products & Inventory**

| Trigger Event | SA | BA | Customer | Barber |
|---|---|---|---|---|
| New product order from branch | email | - | - | - |
| Product order approved | - | email | - | - |
| Product order rejected | - | email | - | - |
| Product order shipped | - | email | - | - |
| Product order delivered | - | email | - | - |
| Product order payment receipt | - | email | - | - |
| Customer product order confirm | - | - | email | - |
| Low stock threshold hit | email | email | - | - |

**Domain 4: Account & Auth**

| Trigger Event | SA | BA | Customer | Barber |
|---|---|---|---|---|
| Welcome / account created | - | - | email (existing) | - |
| Password reset | - | - | email (existing) | email (existing) |
| Voucher issued | - | - | email (existing) | - |
| Account banned/deactivated | - | - | email (with reason) | - |

**Domain 5: System / Operational**

| Trigger Event | SA | BA | Customer | Barber |
|---|---|---|---|---|
| Damage claim filed | email | - | - | - |
| Branch offline/inactive | email | email | - | - |
| Scheduled maintenance | email | email | email | email |

### Six Thinking Hats (Phase 3: Evaluation & Prioritization)

**White Hat (Facts):**
- Already working: 7 email types (keep as-is)
- Broken (fix trigger): Guest booking, service booking emails
- Template exists, no trigger: Booking reminder
- Brand new to build: ~25 new email notifications

**Black Hat (Risks) — Mitigated:**
- Email deliverability: Upgrading to Resend premium (volume cap removed)
- Email fatigue: Solved with 3-tier delivery system (instant/batched/scheduled)
- Implementation scope: Solved with 3-phase rollout

**Green Hat (Creativity):**
- Smart contextual footer on ALL emails (idea #33):
  - SA emails → "Current Available for Operations: ₱X"
  - BA emails → "Branch Wallet Balance: ₱X | Pending Settlements: ₱Y"
  - Customer emails → "Your Points: X | Loyalty Tier: Gold"
  - Turns every transactional email into a micro-dashboard

**Yellow Hat (Benefits):**
- SA gets operational visibility without logging in
- BA gets financial paper trail in inbox (trust & transparency)
- Customers feel premium (2hr reminders, receipts, order tracking)
- Barbers get paid transparently (weekly payslip + monthly summary)
- Digest system prevents fatigue while keeping nothing hidden

**Blue Hat (Process):**
- Schema must be designed upfront for all 3 phases
- delivery_tier field prevents mid-rollout refactoring

## Idea Organization and Prioritization

### Complete Notification Inventory (33 Ideas)

#### Theme 1: Financial Notifications (Highest Priority)
| # | Notification | Recipients | Urgency | Tier |
|---|---|---|---|---|
| 1 | Settlement requested | SA | Medium | Batched |
| 2 | Settlement approved | BA | Medium | Instant |
| 3 | Settlement completed | SA, BA | Medium | Instant |
| 4 | Settlement rejected | BA | URGENT | Instant |
| 5 | Branch wallet top-up successful | SA, BA | Medium | Batched |
| 6 | Wallet balance critically low | SA, BA | High | Instant |
| 7 | Customer wallet top-up receipt | Customer | Low | Instant |
| 8 | Product order payment receipt | BA | Low | Instant |
| 9 | Weekly payroll processed | Barber | Medium | Scheduled |
| 10 | Monthly earnings summary | SA, BA, Barber | Low | Scheduled |

#### Theme 2: Booking Lifecycle
| # | Notification | Recipients | Urgency | Tier |
|---|---|---|---|---|
| 11 | Booking confirmation + QR | Customer | High | Instant (existing) |
| 12 | Guest booking confirmation | Customer | High | Instant (FIX TRIGGER) |
| 13 | Booking reminder (2hr before) | Customer | Medium | Instant |
| 14 | Customer cancels booking | BA | Medium | Instant |
| 15 | Branch cancels booking | Customer | High | Instant |
| 16 | 15-min late notice | Customer | Medium | Instant |
| 17 | No-show recorded (1hr) | Customer | High | Instant |

#### Theme 3: Product & Inventory
| # | Notification | Recipients | Urgency | Tier |
|---|---|---|---|---|
| 18 | New product order from branch | SA | Medium | Batched |
| 19 | Product order approved | BA | Medium | Instant |
| 20 | Product order rejected | BA | Medium | Instant |
| 21 | Product order shipped | BA | Low | Instant |
| 22 | Product order delivered | BA | Low | Instant |
| 23 | Customer product order confirmation | Customer | Medium | Instant |
| 24 | Low stock threshold hit | SA, BA | High | Batched |

#### Theme 4: Account & System
| # | Notification | Recipients | Urgency | Tier |
|---|---|---|---|---|
| 25 | Welcome email | Customer | Low | Instant (existing) |
| 26 | Password reset | Customer, Barber | High | Instant (existing) |
| 27 | Voucher issued | Customer | Low | Instant (existing) |
| 28 | Account banned/deactivated | Customer | High | Instant |
| 29 | Damage claim filed | SA | Medium | Batched |
| 30 | Branch offline/inactive | SA, BA | High | Instant |
| 31 | Scheduled maintenance | ALL roles | Medium | Instant |

#### Theme 5: Architectural Enhancement
| # | Notification | Recipients | Urgency | Tier |
|---|---|---|---|---|
| 32 | Service booking confirmation | Customer | High | Instant (FIX TRIGGER) |
| 33 | Smart contextual footer | ALL roles | - | All emails |

### Delivery Tier System

| Tier | Delivery Method | When | Use Case |
|---|---|---|---|
| **Instant** | Send immediately | On trigger | Urgent financial, booking lifecycle, account security |
| **Batched** | Digest every 4-6 hours (3x/day) | Cron job | Product orders, stock alerts, settlement requests |
| **Scheduled** | Weekly or Monthly | Fixed schedule | Earnings summaries, payroll |

### Phased Rollout Plan

**Phase 1: Fix & Foundation (Week 1)**
- Fix broken guest/service booking email triggers
- Build core email queue system with `delivery_tier` support
- Implement: booking reminder 2hr (#13), customer cancellation (#14), branch cancellation (#15), late notice (#16), no-show (#17)
- Priority: Booking lifecycle — directly customer-facing

**Phase 2: Financial Notifications (Week 2)**
- Settlement emails: requested, approved, rejected, completed (#1-4)
- Top-up confirmations (#5, #7)
- Product order lifecycle (#18-23)
- Product order payment receipt (#8)
- Wallet critically low (#6)
- Priority: Money movement — operational backbone

**Phase 3: Operational & Summaries (Week 3)**
- Low stock threshold (#24)
- Monthly earnings summaries (#10)
- Weekly payroll (#9)
- Branch offline (#30), damage claims (#29)
- Account banned (#28), scheduled maintenance (#31)
- Batched digest cron job implementation
- Smart contextual footer (#33)
- Priority: Operational health — long-term infrastructure

### Schema Design Requirements (Pre-Implementation)

**New `email_queue` table needed:**
- `recipient_email`, `recipient_id`, `recipient_role` (sa/ba/customer/barber)
- `notification_type` (enum of all 33 types)
- `delivery_tier` (instant/batched/scheduled)
- `urgency` (low/medium/high/urgent)
- `subject`, `body_html`, `template_data` (JSON)
- `status` (queued/sent/failed/batched)
- `batch_id` (for digest grouping)
- `sent_at`, `created_at`, `error`

**New `email_notification_preferences` table (future):**
- `user_id`, `role`
- Per-notification-type opt-in/opt-out
- Digest frequency preference

**Update `email_templates` table:**
- Add new template types for all 25 new notification categories
- Add `delivery_tier` default per template
- Add `smart_footer_enabled` boolean

### Stakeholder Email Volume Estimates (Per Day, 5 Branches)

| Role | Instant | Batched (3x digest) | Scheduled | Total |
|---|---|---|---|---|
| SA | 3-5 | 3 digests | 1/month | ~6-8/day |
| BA | 5-10 | 0 (single branch) | 1/month | ~5-10/day |
| Customer | 1-3 (on booking day) | 0 | 0 | ~1-3/event |
| Barber | 0 | 0 | 2/month | ~2/month |

### Decisions Made

1. **Barbers = in-app only** (except monthly earnings + weekly payroll)
2. **Customer wallet low nudge = rejected** (too spammy)
3. **New customer registration = rejected** (noise for BA)
4. **Booking reminder = 2 hours before** (not 24 hours)
5. **Late notice = 15 minutes**, no-show = 1 hour
6. **Settlement approved = YES, email BA** (transparency before transfer)
7. **Smart contextual footer = YES** on all emails (micro-dashboard)
8. **Resend premium** for volume capacity
9. **3-tier delivery** (instant/batched/scheduled) to prevent SA fatigue

## Session Summary and Insights

**Key Achievements:**
- 33 distinct email notification ideas identified across 5 domains
- Complete stakeholder coverage: SA, BA, Customer, Barber
- Zero-gap notification matrix via morphological analysis
- 3-phase implementation plan with clear priorities
- Delivery tier architecture to prevent email fatigue
- Smart contextual footer innovation for micro-dashboards

**Breakthrough Concept:**
The smart contextual footer (#33) turns every transactional email into a micro-dashboard, giving each stakeholder a pulse on their key metrics without additional emails. This is a differentiator — most barbershop apps don't do this.

**Critical Fixes Identified:**
- Guest booking email trigger — broken, not sending
- Service booking email trigger — broken, not sending
- Barber email notification — intentionally deprecated (wrong channel)

**Creative Facilitation Narrative:**
The session progressed efficiently through stakeholder empathy (Role Playing), systematic coverage (Morphological Analysis), and risk evaluation (Six Thinking Hats). The user made decisive calls — particularly the barber in-app-only decision and the 2-hour reminder window — showing strong product instinct. The late notice + no-show two-stage approach was a user-driven insight that elevated the booking lifecycle notifications from basic to sophisticated.
