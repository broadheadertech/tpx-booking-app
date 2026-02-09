---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
workflowComplete: true
completedAt: 2026-01-29
inputDocuments:
  - _bmad-output/analysis/brainstorming-session-2026-01-29.md
  - _bmad-output/planning-artifacts/project-context.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 1
classification:
  projectType: saas_b2b_webapp
  domain: smb_retail_service_fintech
  complexity: medium-high
  projectContext: brownfield
---

# Product Requirements Document - Customer Experience

**Author:** MASTERPAINTER
**Date:** 2026-01-29

## Executive Summary

**TPX Customer Experience** enhances the existing barbershop booking system with a self-funding loyalty program. Customers earn points (displayed with peso value) and advance through Bronze→Platinum tiers. Wallet payments earn 1.5x bonus points, with top-up bonuses funding the redemption costs. The system supports multi-branch recognition where VIP customers are known at any location.

**Core Value:** Transform anonymous repeat customers into recognized VIP members who feel they belong.

**Business Model:** Self-funding loyalty where wallet top-up float (₱45K/month) exceeds redemption costs (₱8K/month).

---

## Project Classification

| Aspect | Classification |
|--------|----------------|
| **Project Type** | SaaS B2B Web App (extending existing platform) |
| **Domain** | SMB Retail/Service with Fintech elements |
| **Complexity** | Medium-High (wallet, points, multi-branch) |
| **Project Context** | Brownfield (adding to existing TPX system) |

---

## Success Criteria

### User Success

| Role | Success Moment | Measurable Outcome |
|------|----------------|-------------------|
| **Customer** | First free redemption | 30-50% redeem within 6 months |
| **Customer** | Birthday VIP treatment | 100% eligible VIPs notified |
| **Customer** | Progress bar excitement | Average 3-4 month streak |
| **Barber** | VIP visibility | See status before every service |
| **Admin** | Self-funding loyalty | Wallet float > redemption costs |

### Business Success

| Metric | 3-Month Target | 12-Month Target |
|--------|----------------|-----------------|
| Wallet Adoption | 50-70% | 80%+ |
| VIP Retention | 2x regulars | 2.5x regulars |
| Points Redemption | 30-50% | 60%+ |
| Average Streak | 3-4 months | 5+ months |

### Technical Success

| Metric | Target |
|--------|--------|
| Points update | Real-time (<1s) |
| QR payment | <3 seconds |
| Top-up success | >98% |
| Cross-branch sync | Instant |

### Measurable Outcomes

**Key Performance Indicators (KPIs):**
- **Primary:** Wallet adoption rate (target: 50-70% in 3 months)
- **Secondary:** VIP retention multiplier (target: 2x regular customers)
- **Engagement:** Average streak length (target: 3-4 months)
- **Conversion:** Points redemption rate (target: 30-50%)

---

## Product Scope

### MVP - Phase 1 (Foundation)

**Points Backend:**
- Points with peso value display ("450 points = ₱45")
- Universal point value across all branches
- Decimal precision tracking
- Points earned on payment only

**Wallet Enhancements:**
- Wallet payments earn 1.5x bonus points
- Top-up bonus tiers (₱500→₱550, ₱1000→₱1150)
- Minimum top-up ₱300 (one haircut)
- Wallet + Points combo payments

**Basic Tier System:**
- Bronze → Silver → Gold → Platinum progression
- Monthly visit streak tracking
- Regular status recognition

**Points Display:**
- Visual progress bar to next reward
- Points balance on home screen
- Scissor icon collection (visual)

**Barber Integration:**
- Commission preserved on redemptions
- VIP badge visible to barber
- "Welcome back" personalization screen

### Growth Features - Phase 2 (Engagement)

- Streak-unlocked perks (3mo→Birthday, 6mo→Priority, 12mo→Platinum)
- VIP waiting lounge access
- Achievement badges system
- Points celebration animations
- Product redemption (services + products)
- VIP auto product discount (10%)
- Points expiry with warning (6 months)
- Smart reminders (2 weeks after visit)

### Vision - Phase 3-4 (Growth & Analytics)

**Phase 3 - Growth:**
- Wallet cashback bonus (5%)
- QR code quick pay
- Birthday VIP treatment
- Seasonal exclusive rewards
- Flash deal countdown timer
- Gift wallet balance
- Donate points to charity
- Household point pooling
- Shareable VIP card image
- Post-service photo prompt
- Photo reviews

**Phase 4 - Analytics:**
- VIP retention tracking dashboard
- Revenue by service report
- Streak-based loyalty health metrics
- Wallet top-up totals dashboard
- New vs VIP customer tracking
- Transaction archive (6+ months)

---

## User Journeys

### Journey 1: Juan the Customer (Primary User - Success Path)

**Persona:** Juan, 28, marketing professional in Makati, values appearance, busy schedule

#### Opening Scene
Juan finishes a long Thursday at work. His hair is overdue for a cut - he's got a client presentation Monday. He opens the TPX app on his commute home.

**Current pain:** He's been coming to TPX for 6 months but doesn't feel "recognized" - just another customer.

#### Rising Action
Juan sees something new on his home screen:
> **"✂️✂️✂️✂️ 400 points (₱40) | 60% to free haircut!"**

He's intrigued. He books for Saturday, selects his usual barber Marco, and sees:
> **"Pay with wallet = earn 1.5x points!"**

He tops up ₱500, gets ₱550 credit. Arrives Saturday, Marco greets him by name (saw the "Welcome back Juan - usual fade" on his screen).

#### Climax
After his haircut, Juan pays ₱350 with wallet. The app explodes with confetti:
> **"🎉 +52 points earned! You're now SILVER status!"**

A badge appears on his profile. He's only 100 points from his first free haircut.

#### Resolution
Juan screenshots his Silver badge and shares it. He books his next appointment before leaving - he wants to keep his streak alive. The progress bar is so close to full, he's already planning when to redeem.

**His new reality:** Juan went from "just a customer" to "Silver member with a streak" - he BELONGS here now.

---

### Journey 2: Marco the Barber (Staff User)

**Persona:** Marco, 32, 8 years experience, top barber at BGC branch

#### Opening Scene
Marco arrives at TPX BGC branch at 8:45am. He logs into the staff tablet to see his appointments for the day.

**Current pain:** He sometimes doesn't know which customers are "regulars" until they sit down. He worries that free haircut redemptions might hurt his commission.

#### Rising Action
Marco sees his 10am appointment on the tablet:
> **"Juan Cruz - ⭐ SILVER Member | 5-month streak"**
> **"Usual: Low fade, 2 on sides, trim on top"**
> **"Last visit: 3 weeks ago | Talked about new job"**

When Juan arrives, Marco greets him warmly: "Juan! How's the new job going? Same fade today?"

#### Climax
Later, a Platinum customer redeems a FREE haircut. Marco checks his earnings:
> **"Miguel (Platinum) - FREE redemption | Commission: ₱150 ✓"**

His full commission is preserved. The loyalty program doesn't hurt him.

#### Resolution
By end of day, Marco served 3 VIP customers who tipped generously and 2 redemptions where he still earned full commission. VIP customers are friendlier - they feel recognized, so they treat him better too.

**His new reality:** Marco went from "hoping customers are regulars" to "knowing every VIP before they sit down" - he delivers better service because he has better information.

---

### Journey 3: Diane the Branch Admin (Admin User)

**Persona:** Diane, 38, manages TPX Makati with 6 barbers

#### Opening Scene
It's the last Monday of the month - time to review numbers. Diane opens the admin dashboard, worried about the "free haircuts" the loyalty program is giving away.

**Current pain:** She approved the loyalty program but doesn't know if it's actually profitable.

#### Rising Action
Diane opens the Branch Dashboard and sees:
> **"Wallet Top-ups This Month: ₱45,200"**
> **"Points Redeemed (Free Haircuts): ₱8,400"**
> **"Net Loyalty Float: +₱36,800"**

The wallet deposits are 5x higher than redemptions - the program is FUNDING ITSELF. She digs deeper:
> **"VIP Retention: 2.3x regular customers"**
> **"Average Streak: 3.8 months"**

#### Climax
It's Tuesday afternoon - the shop is empty. Diane taps "Flash Promo" and launches:
> **"⏰ DOUBLE POINTS - Next 3 hours only!"**

Within 30 minutes, 4 walk-ins arrive. She solved her slow Tuesday herself.

#### Resolution
At month-end, Diane presents to the franchise owner with confidence: wallet float covers all redemptions with ₱36K surplus, VIP customers return 2.3x more often.

**Her new reality:** Diane went from "worried about giving away free haircuts" to "confident the loyalty program makes money."

---

### Journey 4: Paolo the Super Admin (Franchise Owner)

**Persona:** Paolo, 45, owns 5 TPX franchise branches

#### Opening Scene
Paolo reviews the monthly franchise report from his home office. He needs to know if the new Customer Experience features are worth the investment.

**Current pain:** He can't see across all branches easily - each admin sends separate reports.

#### Rising Action
Paolo opens the Super Admin dashboard:
> **"System-wide Wallet Balance: ₱287,000"**
> **"Total Active VIPs: 847 across 5 branches"**
> **"Lowest Performing Branch: Quezon City (42% wallet adoption)"**

He drills into QC branch and sees they haven't been running flash promos.

#### Climax
Paolo notices Makati branch has 78% wallet adoption - highest in the network. He clicks "Copy Promo Strategy" and shares Diane's successful flash promo templates with all other branches.

#### Resolution
Within 2 months, all branches reach 60%+ wallet adoption. The loyalty program generates ₱150K+ monthly float system-wide.

**His new reality:** Paolo went from "hoping loyalty works" to "seeing exactly which branches execute well" - he can replicate success across his network.

---

### Journey Requirements Summary

| Journey | Capabilities Required |
|---------|----------------------|
| **Juan (Customer)** | Points display, progress bar, wallet top-up, bonus tiers, streak tracking, tier celebration, payment with wallet |
| **Marco (Barber)** | VIP badge on check-in, customer preferences, "welcome back" screen, commission preservation |
| **Diane (Admin)** | Wallet/redemption dashboard, flash promo creation, retention metrics, branch-level control |
| **Paolo (Super Admin)** | Multi-branch dashboard, cross-branch comparison, strategy sharing, system-wide metrics |

---

## Domain-Specific Requirements

### Compliance & Regulatory

**Wallet & Payment (Philippines Context):**
- **Closed-Loop System:** Wallet is prepaid stored value usable only at TPX branches - not regulated e-money transfer
- **Points Currency:** Points with peso display ("450 = ₱45") is informational only - no actual conversion/withdrawal
- **Data Privacy Act (RA 10173):** Customer transaction data, wallet balances, and usage patterns require proper consent and protection

### Technical Constraints

**Security Requirements:**

| Area | Requirement |
|------|-------------|
| Wallet Balance | Server-side validation only (never trust client) |
| Transactions | Atomic - debit/credit must complete together |
| Points | Audit trail for all earn/redeem events |
| Access | Role-based - Branch Admin can't see other branches |

**Real-time Requirements:**

| Operation | Target |
|-----------|--------|
| Points update | <1 second |
| Wallet balance | Real-time sync |
| Cross-branch lookup | <2 seconds |
| Transaction history | Instant access |

**Data Consistency:**
- Points and wallet are universal across branches
- Customer can earn at Branch A, redeem at Branch B
- Real-time sync via Convex (native capability)

### Integration Requirements

**Existing Systems (Leverage):**
- PayMongo (wallet top-ups - already integrated)
- Convex database (real-time sync built-in)
- Multi-branch architecture (branch_id isolation exists)

**New Integrations:** None required for MVP

### Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Points inflation | Cap earning rates, require payment completion |
| Fraudulent redemptions | Require authentication, staff confirmation |
| Negative wallet balance | Server-side validation before every transaction |
| Data breach | No card storage (PayMongo handles), encrypt PII |
| Points abuse | Archive inactive accounts after 6 months, expiry warnings |
| Branch float imbalance | Central reporting, system-wide wallet pool tracking |

---

## SaaS B2B Web App - Technical Requirements

### Project-Type Overview

This is a **brownfield enhancement** to the existing TPX Booking System, adding Customer Experience features (loyalty points, wallet enhancements, VIP tiers) to an established multi-branch SaaS platform.

**Existing Architecture Leveraged:**
- Multi-branch tenant isolation (branch_id filtering)
- 6-role RBAC system
- PayMongo payment integration
- Convex real-time database
- React 19 + Vite frontend

### Multi-Branch Architecture

| Aspect | Scope | Notes |
|--------|-------|-------|
| **Points Balance** | Universal | Earned/redeemed at any branch |
| **Wallet Balance** | Universal | Top-up and pay at any branch |
| **VIP Status** | Universal | Recognized system-wide |
| **Streak Tracking** | Universal | Visits across all branches count |
| **Flash Promos** | Branch-scoped | Admin creates for their branch only |
| **Analytics** | Branch-scoped | Admin sees own branch; Super Admin sees all |

### RBAC Matrix for Customer Experience

| Feature | super_admin | admin | staff | customer |
|---------|-------------|-------|-------|----------|
| Points Config (rates, rewards) | Full | Branch adjust | View | N/A |
| Wallet Top-up Bonuses | Full | Branch adjust | N/A | Use |
| Flash Promos | Full + templates | Create/Branch | N/A | Receive |
| VIP Tier Thresholds | Full | View only | View badges | Progress |
| Redemption Approval | Override | Approve | Request | Redeem |
| Analytics Dashboard | All branches | Own branch | N/A | Own stats |
| Customer Lookup | All | Branch customers | Service view | Self only |

### Integration Points

| System | Integration Type | Customer Experience Usage |
|--------|------------------|---------------------------|
| **PayMongo** | Existing | Wallet top-ups with bonus tiers |
| **Convex** | Existing | Real-time points/wallet sync |
| **Bookings** | Internal | Points earned on completed bookings |
| **Payments** | Internal | Wallet payment option at checkout |
| **User Profiles** | Internal | VIP status, tier, streak display |

### Implementation Considerations

**New Database Tables Required:**
- `loyalty_points` - Points balance, earn/redeem history
- `loyalty_tiers` - Tier definitions (Bronze→Platinum)
- `loyalty_streaks` - Monthly visit tracking
- `loyalty_rewards` - Redeemable rewards catalog
- `flash_promos` - Branch-scoped promotions

**Existing Tables to Extend:**
- `wallets` - Add top-up bonus tracking
- `users` - Add current_tier, streak_count fields
- `wallet_transactions` - Add points_earned field

**Service Layer Pattern:**
- `convex/services/loyalty.ts` - Points operations
- `convex/services/tiers.ts` - Tier management
- `convex/services/streaks.ts` - Streak tracking
- `convex/services/rewards.ts` - Redemption catalog
- `convex/services/flashPromos.ts` - Promo management

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Focus on solving the core problem: "Customers don't feel recognized or rewarded for loyalty"
- Minimum feature set that delivers tangible value (points they can see and use)
- Self-funding model validation (wallet float covers redemptions)

**MVP Success Gate:** Phase 1 can stand alone if needed - customers can earn, see, and redeem points with basic tier recognition.

### MVP Feature Set (Phase 1 - Foundation)

**Core User Journeys Supported:**

| Journey | MVP Coverage |
|---------|--------------|
| Customer earning points | Full |
| Customer paying with wallet | Full |
| Barber seeing VIP status | Basic badge |
| Admin tracking float | Basic metrics |

**Must-Have Capabilities:**
- Points backend with peso value display
- Wallet payments earn 1.5x bonus points
- Top-up bonus tiers (₱500→₱550, ₱1000→₱1150)
- Basic tier system (Bronze → Platinum)
- Progress bar to next reward
- VIP badge visible to staff
- Basic wallet vs redemption dashboard

**Explicitly Excluded from MVP:**
- Streak-unlocked perks (Phase 2)
- Achievement badges (Phase 2)
- QR quick pay (Phase 3)
- Household pooling (Phase 3)
- Advanced analytics dashboards (Phase 4)

### Post-MVP Features

**Phase 2 - Engagement:**
- Monthly streak tracking with unlockable perks
- VIP waiting lounge access feature
- Achievement badge system
- Points celebration animations
- Product redemption (beyond services)
- Points expiry with warning (6 months)
- Smart reminders (2 weeks post-visit)

**Phase 3 - Growth:**
- Wallet cashback bonus (5%)
- QR code quick pay
- Birthday VIP treatment
- Flash deal countdown timer
- Gift wallet balance
- Household point pooling

**Phase 4 - Analytics:**
- VIP retention tracking dashboard
- Revenue by service reports
- Streak-based loyalty health metrics
- New vs VIP customer tracking

### Risk Mitigation Strategy

| Risk Type | Risk | Mitigation |
|-----------|------|------------|
| **Technical** | Points calculation errors | Decimal precision, comprehensive audit logs, server-side only |
| **Technical** | Cross-branch sync delays | Convex real-time (native), no custom sync needed |
| **Market** | Low wallet adoption | Compelling top-up bonuses (10-15%), visible progress bar |
| **Market** | Points feel worthless | Clear peso value display, achievable redemption threshold |
| **Resource** | Scope creep | Strict phase boundaries, MVP gate before Phase 2 |
| **Resource** | Team capacity | Phase 1 is self-contained, can pause before Phase 2 |

### Resource Requirements

**MVP (Phase 1):**
- 1 full-stack developer (familiar with Convex)
- Existing design system (extend current components)
- No new integrations (leverage PayMongo)

**Phase 2+:**
- Same team can continue incrementally
- No additional infrastructure needed

---

## Functional Requirements

### Points Management

- **FR1:** Customer can view their current points balance with peso equivalent display
- **FR2:** Customer can view points history (earned, redeemed, expired)
- **FR3:** Customer can earn points automatically upon completed payment
- **FR4:** Customer can earn bonus points (1.5x) when paying with wallet
- **FR5:** System can calculate points with decimal precision
- **FR6:** System can track point earn/redeem events with full audit trail

### Wallet Operations

- **FR7:** Customer can view their wallet balance in real-time
- **FR8:** Customer can top up wallet via PayMongo
- **FR9:** Customer can receive top-up bonus based on tier (₱500→₱550, ₱1000→₱1150)
- **FR10:** Customer can pay for services using wallet balance
- **FR11:** Customer can use combined payment (wallet + points + cash)
- **FR12:** System can validate wallet balance server-side before transactions

### Tier & Rewards

- **FR13:** Customer can view their current tier status (Bronze/Silver/Gold/Platinum)
- **FR14:** Customer can view progress toward next tier
- **FR15:** Customer can browse available rewards in redemption catalog
- **FR16:** Customer can redeem points for services or products
- **FR17:** System can promote customers to higher tiers based on activity
- **FR18:** System can display tier-specific benefits and perks

### Customer Recognition

- **FR19:** Staff can view customer VIP status badge before service begins
- **FR20:** Staff can view customer preferences and service history
- **FR21:** Staff can see "welcome back" personalization screen for returning customers
- **FR22:** Customer can view their own VIP status and achievements
- **FR23:** Customer can see visual progress bar toward next reward

### Analytics & Reporting

- **FR24:** Branch Admin can view wallet top-up totals for their branch
- **FR25:** Branch Admin can view points redemption totals for their branch
- **FR26:** Branch Admin can view net loyalty float (top-ups minus redemptions)
- **FR27:** Branch Admin can view VIP retention metrics for their branch
- **FR28:** Super Admin can view system-wide wallet and points metrics
- **FR29:** Super Admin can compare performance across all branches
- **FR30:** Super Admin can view VIP customer counts by branch

### Promotions (Phase 2+)

- **FR31:** Branch Admin can create time-limited flash promos for their branch
- **FR32:** Customer can receive and view active promotions
- **FR33:** Super Admin can create promo templates for all branches
- **FR34:** System can apply promo bonuses automatically during eligible transactions

### Administration

- **FR35:** Super Admin can configure system-wide point earning rates
- **FR36:** Super Admin can configure tier thresholds and benefits
- **FR37:** Super Admin can configure top-up bonus tiers
- **FR38:** Branch Admin can adjust point redemption prices for their branch
- **FR39:** System can preserve barber commission on free redemptions
- **FR40:** System can archive inactive accounts after 6 months

### Cross-Branch Operations

- **FR41:** Customer can earn points at any branch
- **FR42:** Customer can redeem points at any branch
- **FR43:** Customer can use wallet balance at any branch
- **FR44:** System can sync points and wallet across branches in real-time

---

## Non-Functional Requirements

### Performance

| Operation | Target | Rationale |
|-----------|--------|-----------|
| Points balance update | <1 second | Real-time feedback on earning |
| Wallet balance sync | Real-time | Accurate payment availability |
| Payment completion | <3 seconds | Smooth checkout experience |
| Cross-branch lookup | <2 seconds | Customer recognition at any branch |
| Dashboard load | <2 seconds | Admin productivity |
| Points history load | <1 second | Transaction transparency |

### Security

| Requirement | Specification |
|-------------|---------------|
| Wallet validation | Server-side only; never trust client-side balances |
| Transaction integrity | Atomic operations; debit/credit complete together or rollback |
| Audit trail | Complete log of all point earn/redeem/expire events |
| Data encryption | PII encrypted at rest; TLS in transit |
| Access control | Role-based; Branch Admin cannot see other branches |
| Payment security | No card storage; delegate to PayMongo (PCI-compliant) |
| Fraud prevention | Rate limiting on redemptions; staff confirmation required |

### Reliability

| Requirement | Specification |
|-------------|---------------|
| Wallet transactions | Zero tolerance for failed transactions without rollback |
| Data consistency | Points/wallet always consistent across branches |
| System availability | 99.5% uptime during business hours (7am-10pm local) |
| Failover | Graceful degradation if PayMongo unavailable (disable top-ups, not payments) |

### Integration

| System | Requirement |
|--------|-------------|
| PayMongo | Handle webhook failures with retry; idempotent processing |
| Convex | Leverage native real-time sync; no custom polling |
| Existing payments | Points earned only on completed (not pending) payments |
| Existing bookings | Points/tier visible in booking flow |

### Accessibility (Basic)

| Requirement | Specification |
|-------------|---------------|
| Color contrast | Points/tier badges readable by color-blind users |
| Screen reader | Key balances (points, wallet) accessible to screen readers |
| Touch targets | Mobile buttons minimum 44x44px |

