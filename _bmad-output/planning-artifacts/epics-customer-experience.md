---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
workflowComplete: true
completedAt: '2026-01-29'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-customer-experience.md
  - _bmad-output/planning-artifacts/architecture-customer-experience.md
workflowType: 'epics'
project_name: 'tpx-booking-app'
feature_name: 'Customer Experience'
user_name: 'MASTERPAINTER'
date: '2026-01-29'
summary:
  total_epics: 6
  total_stories: 37
  total_frs_covered: 44
  phase_1_stories: 33
  phase_2_stories: 4
---

# Customer Experience - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Customer Experience features, decomposing the 44 functional requirements from the PRD and Architecture into implementable stories.

---

## Requirements Inventory

### Functional Requirements (44 Total)

#### Points Management (FR1-FR6)
- **FR1:** Customer can view their current points balance with peso equivalent display
- **FR2:** Customer can view points history (earned, redeemed, expired)
- **FR3:** Customer can earn points automatically upon completed payment
- **FR4:** Customer can earn bonus points (1.5x) when paying with wallet
- **FR5:** System can calculate points with decimal precision
- **FR6:** System can track point earn/redeem events with full audit trail

#### Wallet Operations (FR7-FR12)
- **FR7:** Customer can view their wallet balance in real-time
- **FR8:** Customer can top up wallet via PayMongo
- **FR9:** Customer can receive top-up bonus based on tier (₱500→₱550, ₱1000→₱1150)
- **FR10:** Customer can pay for services using wallet balance
- **FR11:** Customer can use combined payment (wallet + points + cash)
- **FR12:** System can validate wallet balance server-side before transactions

#### Tier & Rewards (FR13-FR18)
- **FR13:** Customer can view their current tier status (Bronze/Silver/Gold/Platinum)
- **FR14:** Customer can view progress toward next tier
- **FR15:** Customer can browse available rewards in redemption catalog
- **FR16:** Customer can redeem points for services or products
- **FR17:** System can promote customers to higher tiers based on activity
- **FR18:** System can display tier-specific benefits and perks

#### Customer Recognition (FR19-FR23)
- **FR19:** Staff can view customer VIP status badge before service begins
- **FR20:** Staff can view customer preferences and service history
- **FR21:** Staff can see "welcome back" personalization screen for returning customers
- **FR22:** Customer can view their own VIP status and achievements
- **FR23:** Customer can see visual progress bar toward next reward

#### Analytics & Reporting (FR24-FR30)
- **FR24:** Branch Admin can view wallet top-up totals for their branch
- **FR25:** Branch Admin can view points redemption totals for their branch
- **FR26:** Branch Admin can view net loyalty float (top-ups minus redemptions)
- **FR27:** Branch Admin can view VIP retention metrics for their branch
- **FR28:** Super Admin can view system-wide wallet and points metrics
- **FR29:** Super Admin can compare performance across all branches
- **FR30:** Super Admin can view VIP customer counts by branch

#### Promotions - Phase 2+ (FR31-FR34)
- **FR31:** Branch Admin can create time-limited flash promos for their branch
- **FR32:** Customer can receive and view active promotions
- **FR33:** Super Admin can create promo templates for all branches
- **FR34:** System can apply promo bonuses automatically during eligible transactions

#### Administration (FR35-FR40)
- **FR35:** Super Admin can configure system-wide point earning rates
- **FR36:** Super Admin can configure tier thresholds and benefits
- **FR37:** Super Admin can configure top-up bonus tiers
- **FR38:** Branch Admin can adjust point redemption prices for their branch
- **FR39:** System can preserve barber commission on free redemptions
- **FR40:** System can archive inactive accounts after 6 months

#### Cross-Branch Operations (FR41-FR44)
- **FR41:** Customer can earn points at any branch
- **FR42:** Customer can redeem points at any branch
- **FR43:** Customer can use wallet balance at any branch
- **FR44:** System can sync points and wallet across branches in real-time

---

### Non-Functional Requirements

#### Performance
- NFR-PERF1: Points balance update <1 second
- NFR-PERF2: Wallet balance sync real-time
- NFR-PERF3: Payment completion <3 seconds
- NFR-PERF4: Cross-branch lookup <2 seconds
- NFR-PERF5: Dashboard load <2 seconds
- NFR-PERF6: Points history load <1 second

#### Security
- NFR-SEC1: Server-side only wallet validation
- NFR-SEC2: Atomic transactions (debit/credit complete together)
- NFR-SEC3: Complete audit trail for all point events
- NFR-SEC4: PII encrypted at rest, TLS in transit
- NFR-SEC5: Role-based access control (branch isolation)
- NFR-SEC6: No card storage (delegate to PayMongo)
- NFR-SEC7: Rate limiting on redemptions with staff confirmation

#### Reliability
- NFR-REL1: Zero tolerance for failed wallet transactions
- NFR-REL2: Data consistency across branches
- NFR-REL3: 99.5% uptime during business hours
- NFR-REL4: Graceful degradation if PayMongo unavailable

#### Integration
- NFR-INT1: PayMongo webhook with retry and idempotent processing
- NFR-INT2: Convex native real-time sync (no polling)
- NFR-INT3: Points earned only on completed payments
- NFR-INT4: Points/tier visible in booking flow

---

### Additional Requirements (from Architecture)

#### Data Architecture Requirements
- **ARCH1:** Use integer ×100 storage for points (4575 = 45.75 points)
- **ARCH2:** Create 5 new tables: `points_ledger`, `points_transactions`, `tiers`, `tier_benefits`, `loyalty_config`
- **ARCH3:** Extend 2 existing tables: `wallets` (add bonus_balance), `users` (add current_tier_id)
- **ARCH4:** Define required indexes for all new tables

#### Service Architecture Requirements
- **ARCH5:** Create 3 new services: `points.ts`, `tiers.ts`, `loyaltyConfig.ts`
- **ARCH6:** Extend 2 services: `payments.ts`, `wallets.ts`
- **ARCH7:** Create helper lib: `convex/lib/points.ts` for display conversions

#### Pattern Requirements
- **ARCH8:** Implement atomic transaction pattern (payment + points in single mutation)
- **ARCH9:** Check tier promotion after every points_transaction insert
- **ARCH10:** Fetch config values dynamically via `getConfig()` helper
- **ARCH11:** Return promotion data for frontend celebrations
- **ARCH12:** Follow universal vs branch-scoped data rules

#### UI Architecture Requirements
- **ARCH13:** Place components in role-based directories (common/, staff/, admin/, barber/)
- **ARCH14:** Create 12 new components as specified
- **ARCH15:** Create 4 new pages (PointsPage, RewardsPage, TierStatusPage, LoyaltySettingsPage)

---

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | View points balance with peso display |
| FR2 | Epic 1 | View points history |
| FR3 | Epic 1 | Earn points on completed payment |
| FR5 | Epic 1 | Decimal precision calculations |
| FR6 | Epic 1 | Full audit trail |
| FR4 | Epic 2 | Earn 1.5x bonus with wallet payment |
| FR7 | Epic 2 | View wallet balance real-time |
| FR8 | Epic 2 | Top up via PayMongo |
| FR9 | Epic 2 | Receive top-up bonuses |
| FR10 | Epic 2 | Pay with wallet balance |
| FR11 | Epic 2 | Combo payment (Points → Wallet → Cash) |
| FR12 | Epic 2 | Server-side validation |
| FR13 | Epic 3 | View current tier status |
| FR14 | Epic 3 | View progress to next tier |
| FR15 | Epic 3 | Browse redemption catalog |
| FR16 | Epic 3 | Redeem points for services/products |
| FR17 | Epic 3 | Auto-promotion based on lifetime points |
| FR18 | Epic 3 | Display tier benefits |
| FR19 | Epic 4 | Staff sees VIP badge before service |
| FR20 | Epic 4 | Staff sees customer preferences/history |
| FR21 | Epic 4 | "Welcome back" personalization screen |
| FR22 | Epic 4 | Customer views own VIP status |
| FR23 | Epic 4 | Visual progress bar to next reward |
| FR24 | Epic 5 | Branch Admin wallet top-up dashboard |
| FR25 | Epic 5 | Branch Admin redemption totals |
| FR26 | Epic 5 | Branch Admin net loyalty float |
| FR27 | Epic 5 | Branch Admin VIP retention metrics |
| FR28 | Epic 5 | Super Admin system-wide metrics |
| FR29 | Epic 5 | Super Admin branch comparison |
| FR30 | Epic 5 | Super Admin VIP counts by branch |
| FR35 | Epic 5 | Super Admin config point rates |
| FR36 | Epic 5 | Super Admin config tier thresholds |
| FR37 | Epic 5 | Super Admin config top-up bonuses |
| FR38 | Epic 5 | Branch Admin redemption pricing |
| FR39 | Epic 5 | Preserve barber commission |
| FR40 | Epic 5 | Archive inactive accounts |
| FR41 | Epic 5 | Earn points at any branch |
| FR42 | Epic 5 | Redeem points at any branch |
| FR43 | Epic 5 | Use wallet at any branch |
| FR44 | Epic 5 | Real-time cross-branch sync |
| FR31 | Epic 6 | Branch Admin creates flash promos |
| FR32 | Epic 6 | Customer receives/views promos |
| FR33 | Epic 6 | Super Admin promo templates |
| FR34 | Epic 6 | Auto-apply promo bonuses |

---

## Epic List

### Epic 1: Points Foundation & Display
Customers can earn loyalty points on payments and view their balance with peso value display. This establishes the core points system with full audit trail and decimal precision.

**FRs covered:** FR1, FR2, FR3, FR5, FR6

---

### Epic 2: Enhanced Wallet Payments
Customers can pay with wallet, earn 1.5x bonus points, receive top-up bonuses, and use combo payments (Points → Wallet → Cash sequence).

**FRs covered:** FR4, FR7, FR8, FR9, FR10, FR11, FR12

---

### Epic 3: VIP Tier Progression
Customers can progress through Bronze→Silver→Gold→Platinum tiers based on lifetime points earned, view their progress, browse the redemption catalog, and redeem points for rewards.

**FRs covered:** FR13, FR14, FR15, FR16, FR17, FR18

---

### Epic 4: Customer VIP Recognition
Staff can recognize VIP customers before service begins with badges, preferences, and personalized "welcome back" screens. Customers can view their own VIP status and progress bar.

**FRs covered:** FR19, FR20, FR21, FR22, FR23

---

### Epic 5: Loyalty Administration & Analytics
Branch Admins can view wallet/redemption dashboards and adjust pricing. Super Admins can configure rates, tiers, and bonuses, plus view system-wide analytics and branch comparisons. Cross-branch sync ensures universal points/wallet.

**FRs covered:** FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44

---

### Epic 6: Flash Promotions (Phase 2)
Branch Admins can create time-limited flash promos. Super Admins can create promo templates. Customers receive and benefit from auto-applied promotional bonuses.

**FRs covered:** FR31, FR32, FR33, FR34
**Note:** Phase 2 feature per PRD scope

---

## Epic 1: Points Foundation & Display

Customers can earn loyalty points on payments and view their balance with peso value display. This establishes the core points system with full audit trail and decimal precision.

### Story 1.1: Schema Setup for Points System

As a **developer**,
I want the points system database tables created with proper indexes,
So that I can build features on a solid data foundation.

**Acceptance Criteria:**

**Given** the Convex schema file exists
**When** I add the points_ledger table with fields (user_id, current_balance, lifetime_earned, lifetime_redeemed, last_activity_at)
**Then** the table is created with integer ×100 storage pattern for decimal precision
**And** indexes are added for by_user lookups

**Given** the points_ledger table exists
**When** I add the points_transactions table with fields (user_id, type, amount, balance_after, source_type, source_id, branch_id, created_at, notes)
**Then** the table supports earn/redeem/expire/adjust transaction types
**And** indexes exist for by_user, by_branch, and by_created_at queries

**Given** both tables are defined
**When** I run `npx convex dev`
**Then** schema deploys without errors
**And** tables are queryable

---

### Story 1.2: Points Display Helpers

As a **developer**,
I want helper functions for points display conversions,
So that all components show consistent peso-equivalent formatting.

**Acceptance Criteria:**

**Given** integer ×100 storage (4575 = 45.75 points)
**When** I call `formatPoints(4575)`
**Then** it returns "45.75 pts"

**Given** points need peso conversion (1 point = ₱1)
**When** I call `formatPointsAsPeso(4575)`
**Then** it returns "₱45.75"

**Given** I need to store user input
**When** I call `toStorageFormat(45.75)`
**Then** it returns 4575 (integer)

**Given** helper file convex/lib/points.ts is created
**When** I import helpers in any service or component
**Then** they work correctly with TypeScript types

---

### Story 1.3: Points Balance Display

As a **customer**,
I want to view my current points balance with peso equivalent,
So that I understand the value of my loyalty rewards.

**Acceptance Criteria:**

**Given** I am logged in as a customer
**When** I navigate to my account/dashboard
**Then** I see my current points balance prominently displayed
**And** the peso equivalent is shown (e.g., "125.50 pts (₱125.50)")

**Given** I have 0 points
**When** I view my balance
**Then** I see "0 pts (₱0.00)" with friendly messaging to earn points

**Given** my points balance changes (earn/redeem)
**When** the transaction completes
**Then** my displayed balance updates in real-time via Convex subscription

**Given** the points service is unavailable
**When** I try to view my balance
**Then** I see a graceful loading state, not an error

---

### Story 1.4: Earn Points on Payment

As a **customer**,
I want to automatically earn points when I complete a payment,
So that I'm rewarded for my purchases without extra effort.

**Acceptance Criteria:**

**Given** I complete a cash or card payment of ₱500
**When** the payment is marked as completed
**Then** I earn 500 points (1:1 ratio, stored as 50000 in ×100 format)
**And** a points_transaction record is created with type "earn"
**And** my points_ledger balance is updated atomically with the payment

**Given** a payment fails or is cancelled
**When** the status changes to failed/cancelled
**Then** no points are awarded
**And** no points_transaction is created

**Given** I earn points
**When** the transaction completes
**Then** the audit trail includes: user_id, amount, source_type="payment", source_id=payment_id, branch_id, timestamp

**Given** I'm viewing the checkout flow
**When** I see the payment total
**Then** I see "You'll earn X points on this purchase" preview

---

### Story 1.5: Points History View

As a **customer**,
I want to view my points history showing earned, redeemed, and expired points,
So that I can track how I've accumulated and used my rewards.

**Acceptance Criteria:**

**Given** I am logged in as a customer
**When** I navigate to my points history page
**Then** I see a chronological list of all points transactions

**Given** I have points transactions
**When** I view the history
**Then** each entry shows: date, type (earned/redeemed/expired), amount, balance after, and source description

**Given** I have many transactions
**When** I scroll the history
**Then** older transactions load progressively (pagination or infinite scroll)

**Given** I earned points from a haircut payment
**When** I view that transaction
**Then** I see "Earned 350 pts from Haircut at [Branch Name]"

**Given** I redeemed points for a reward
**When** I view that transaction
**Then** I see "Redeemed 500 pts for Free Shampoo" with negative amount display

---

## Epic 2: Enhanced Wallet Payments

Customers can pay with wallet, earn 1.5x bonus points, receive top-up bonuses, and use combo payments (Points → Wallet → Cash sequence).

### Story 2.1: Real-Time Wallet Balance Display

As a **customer**,
I want to view my wallet balance with real-time updates,
So that I always know how much I have available to spend.

**Acceptance Criteria:**

**Given** I am logged in as a customer
**When** I navigate to my wallet or payment screen
**Then** I see my current wallet balance prominently displayed
**And** main balance and bonus balance are shown separately (e.g., "₱500 + ₱50 bonus")

**Given** my wallet balance changes (top-up or payment)
**When** the transaction completes
**Then** my displayed balance updates instantly via Convex subscription
**And** I do not need to refresh the page

**Given** I have ₱0 wallet balance
**When** I view my wallet
**Then** I see "₱0.00" with a prompt to top up

**Given** I am on any page showing wallet info
**When** another device/session modifies my wallet
**Then** all my sessions reflect the updated balance in real-time

---

### Story 2.2: Wallet Top-Up via PayMongo

As a **customer**,
I want to add money to my wallet through PayMongo,
So that I can pay for services conveniently without cash.

**Acceptance Criteria:**

**Given** I am logged in and on the wallet page
**When** I click "Top Up" and select an amount (₱500 or ₱1000)
**Then** I am redirected to PayMongo checkout page

**Given** I complete payment on PayMongo
**When** PayMongo sends a successful webhook
**Then** my wallet balance is credited with the top-up amount
**And** a wallet transaction record is created with type "top_up"
**And** I see a success confirmation

**Given** PayMongo payment fails or is cancelled
**When** the webhook indicates failure
**Then** my wallet balance remains unchanged
**And** I see an appropriate error message

**Given** the webhook is received
**When** processing the top-up
**Then** idempotency is enforced (duplicate webhooks don't double-credit)
**And** the transaction includes PayMongo reference ID for reconciliation

---

### Story 2.3: Top-Up Bonus Application

As a **customer**,
I want to receive bonus credits when I top up my wallet,
So that I get extra value for loading larger amounts.

**Acceptance Criteria:**

**Given** I top up ₱500
**When** the payment completes successfully
**Then** I receive ₱550 total (₱500 main + ₱50 bonus)
**And** the bonus is stored in the `bonus_balance` field

**Given** I top up ₱1000
**When** the payment completes successfully
**Then** I receive ₱1150 total (₱1000 main + ₱150 bonus)
**And** the bonus is stored separately from main balance

**Given** I top up an amount not matching bonus tiers (e.g., ₱300)
**When** the payment completes
**Then** I receive only the topped-up amount with no bonus

**Given** Super Admin changes bonus tier configuration
**When** I top up after the change
**Then** the new bonus rates apply to my top-up

**Given** I view my wallet balance
**When** I have both main and bonus balance
**Then** I see them displayed separately: "₱1000 + ₱150 bonus = ₱1150 total"

---

### Story 2.4: Pay with Wallet Balance

As a **customer**,
I want to pay for services using my wallet balance,
So that I can complete transactions quickly without cash.

**Acceptance Criteria:**

**Given** I have sufficient wallet balance (₱500) for a ₱350 service
**When** I select "Pay with Wallet" at checkout
**Then** ₱350 is deducted from my wallet atomically with payment completion
**And** the payment record shows payment_method = "wallet"

**Given** I have ₱200 wallet balance for a ₱350 service
**When** I try to select "Pay with Wallet"
**Then** the option is disabled or shows "Insufficient balance"
**And** I cannot proceed with wallet-only payment

**Given** I have both main balance (₱400) and bonus balance (₱100)
**When** I pay ₱350
**Then** bonus balance is used first (₱100), then main balance (₱250)
**And** remaining balances are: main ₱150, bonus ₱0

**Given** a wallet payment is attempted
**When** the server processes the request
**Then** balance validation happens server-side only (not client-side)
**And** the deduction and payment are atomic (both succeed or both fail)

---

### Story 2.5: Bonus Points for Wallet Payments

As a **customer**,
I want to earn 1.5x bonus points when I pay with my wallet,
So that I'm rewarded for using the wallet payment method.

**Acceptance Criteria:**

**Given** I pay ₱500 using my wallet balance
**When** the payment completes successfully
**Then** I earn 750 points (1.5x multiplier) instead of 500 points
**And** the points_transaction notes the wallet bonus multiplier

**Given** I pay ₱500 using cash or card
**When** the payment completes
**Then** I earn 500 points (1:1 standard ratio)

**Given** I use combo payment with ₱200 wallet + ₱300 cash
**When** the payment completes
**Then** I earn 300 points from wallet portion (₱200 × 1.5) + 300 points from cash (₱300 × 1.0) = 600 total

**Given** Super Admin changes the wallet multiplier from 1.5x to 2x
**When** I make a wallet payment after the change
**Then** the new multiplier applies to my points earning

**Given** I'm at checkout with wallet selected
**When** I view the points preview
**Then** I see "You'll earn 750 pts (1.5x wallet bonus!)" messaging

---

### Story 2.6: Combo Payment Flow

As a **customer**,
I want to pay using a combination of points, wallet, and cash,
So that I can use all my available credits and pay the remainder in cash.

**Acceptance Criteria:**

**Given** I have a ₱500 service to pay
**And** I have 200 points (₱200 value), ₱150 wallet balance
**When** I select "Combo Payment"
**Then** the UI shows the payment breakdown:
- Points: ₱200 (200 pts)
- Wallet: ₱150
- Cash due: ₱150

**Given** I confirm a combo payment
**When** the payment processes
**Then** deductions happen in strict order: Points → Wallet → Cash
**And** all deductions are atomic (single transaction)
**And** staff sees the cash amount to collect (₱150)

**Given** I have more points than needed (500 pts for ₱300 service)
**When** I use combo payment
**Then** only 300 points are deducted
**And** wallet and cash are not touched

**Given** staff confirms receiving the cash portion
**When** they mark payment complete
**Then** all records are created: points_transaction (redeem), wallet_transaction (debit), payment record
**And** the customer earns points only on the cash portion (1:1) + wallet portion (1.5x)

**Given** I select combo payment
**When** I view the breakdown
**Then** I see real-time calculation as I adjust which payment methods to use
**And** I can choose to skip points or wallet if I prefer

---

## Epic 3: VIP Tier Progression

Customers can progress through Bronze→Silver→Gold→Platinum tiers based on lifetime points earned, view their progress, browse the redemption catalog, and redeem points for rewards.

### Story 3.1: Tier System Schema & Configuration

As a **developer**,
I want the tier system database tables created with seed data,
So that I can build tier progression features on a solid foundation.

**Acceptance Criteria:**

**Given** the Convex schema file exists
**When** I add the tiers table with fields (name, threshold, display_order, icon, color)
**Then** the table is created with proper indexes

**Given** the tiers table exists
**When** I seed the default tiers
**Then** Bronze (0 pts), Silver (5000 pts), Gold (15000 pts), Platinum (50000 pts) are created
**And** each tier has distinct icon and color values

**Given** the tier_benefits table is created with fields (tier_id, benefit_type, benefit_value, description)
**When** I seed benefits per tier
**Then** each tier has its associated perks documented

**Given** the users table exists
**When** I add current_tier_id field
**Then** all existing users default to Bronze tier
**And** the field references the tiers table

**Given** schema changes are deployed
**When** I run `npx convex dev`
**Then** all tables and relationships work correctly

---

### Story 3.2: View Current Tier Status

As a **customer**,
I want to see my current VIP tier with its benefits,
So that I know my status and what perks I've earned.

**Acceptance Criteria:**

**Given** I am logged in as a customer
**When** I navigate to my tier status page or dashboard
**Then** I see my current tier displayed with name, icon, and color badge
**And** the badge is visually distinct (Bronze=brown, Silver=gray, Gold=gold, Platinum=purple)

**Given** I am a Silver tier customer
**When** I view my tier details
**Then** I see the list of benefits I currently have access to
**And** benefits are clearly described (e.g., "5% bonus points on all purchases")

**Given** I am a Bronze tier customer
**When** I view my tier status
**Then** I see encouraging messaging about earning more points to unlock perks

**Given** my tier information changes
**When** the backend updates my tier
**Then** my displayed tier updates in real-time via Convex subscription

---

### Story 3.3: Tier Progress Visualization

As a **customer**,
I want to see my progress toward the next tier,
So that I'm motivated to earn more points and reach the next level.

**Acceptance Criteria:**

**Given** I am a Bronze tier customer with 2500 lifetime points
**When** I view my tier progress
**Then** I see a progress bar showing 2500/5000 (50% to Silver)
**And** I see "2,500 more points to reach Silver"

**Given** I am a Platinum tier customer
**When** I view my tier progress
**Then** I see "You've reached the highest tier!" messaging
**And** no progress bar is shown (already at max)

**Given** I am close to the next tier (4800/5000 to Silver)
**When** I view my progress
**Then** the UI highlights that I'm "almost there!"
**And** shows "Only 200 points to go!"

**Given** I earn points that push me over a tier threshold
**When** the transaction completes
**Then** a celebration animation/modal appears
**And** I see "Congratulations! You've reached Silver tier!"
**And** the new tier benefits are displayed

---

### Story 3.4: Automatic Tier Promotion

As a **customer**,
I want to be automatically promoted to higher tiers when I earn enough points,
So that I don't have to manually claim my tier upgrades.

**Acceptance Criteria:**

**Given** I am Bronze tier with 4900 lifetime points
**When** I earn 150 points (new total: 5050)
**Then** I am automatically promoted to Silver tier
**And** my current_tier_id is updated in the database

**Given** I earn a large amount of points at once (e.g., 20000)
**When** the transaction completes
**Then** I skip intermediate tiers and land at the correct tier (Gold if at 20000)
**And** the promotion message reflects the final tier reached

**Given** I redeem points, reducing my current balance
**When** my current_balance drops below a tier threshold
**Then** I am NOT demoted (tier based on lifetime_earned, not current_balance)
**And** I keep my tier status

**Given** a tier promotion occurs
**When** the mutation completes
**Then** it returns promotion data: { promoted: true, newTier: "Silver", previousTier: "Bronze" }
**And** the frontend can display the celebration

**Given** the tier thresholds are checked
**When** determining eligibility
**Then** the check happens after every points_transaction insert (earn type)
**And** the check uses lifetime_earned field, not current_balance

---

### Story 3.5: Redemption Catalog Browse

As a **customer**,
I want to browse available rewards I can redeem with my points,
So that I can see what I'm saving up for.

**Acceptance Criteria:**

**Given** I am logged in as a customer
**When** I navigate to the Rewards/Redemption catalog page
**Then** I see a grid/list of available rewards with images, names, and point costs

**Given** I have 500 points and a reward costs 300 points
**When** I view that reward
**Then** it shows as "Available" or has a "Redeem" button enabled

**Given** I have 200 points and a reward costs 500 points
**When** I view that reward
**Then** it shows "Need 300 more points" or the Redeem button is disabled
**And** I can still see the reward details

**Given** rewards are categorized (Services, Products, Experiences)
**When** I browse the catalog
**Then** I can filter by category
**And** I can sort by points cost (low to high, high to low)

**Given** some rewards are tier-exclusive (e.g., Gold tier only)
**When** I am Silver tier viewing a Gold-exclusive reward
**Then** I see "Gold tier exclusive" badge
**And** the reward is visible but not redeemable

**Given** I view a reward detail
**When** I click on it
**Then** I see full description, terms, and expiration (if any)

---

### Story 3.6: Redeem Points for Rewards

As a **customer**,
I want to redeem my points for services or products,
So that I can enjoy the benefits of my loyalty.

**Acceptance Criteria:**

**Given** I have 500 points and select a 300-point reward
**When** I click "Redeem" and confirm
**Then** 300 points are deducted from my current_balance
**And** a points_transaction record is created with type "redeem"
**And** a redemption record is created with status "pending"

**Given** I redeem points for a free service (e.g., Free Haircut worth ₱350)
**When** the redemption is processed
**Then** the barber still receives their commission (₱350 × commission rate)
**And** the commission is funded from the loyalty program, not the barber's pay

**Given** I have insufficient points for a reward
**When** I try to redeem
**Then** the action is blocked with "Insufficient points" message
**And** no points are deducted

**Given** I successfully redeem a reward
**When** I view my redemptions
**Then** I see the redemption with status (pending/claimed)
**And** staff can see pending redemptions to fulfill

**Given** staff fulfills my redemption (gives me the free service/product)
**When** they mark it as "claimed"
**Then** the redemption status updates
**And** I receive a notification that my reward was fulfilled

**Given** I redeem at any branch
**When** the redemption processes
**Then** it works regardless of which branch I'm at (universal points)

---

## Epic 4: Customer VIP Recognition

Staff can recognize VIP customers before service begins with badges, preferences, and personalized "welcome back" screens. Customers can view their own VIP status and progress bar.

### Story 4.1: Staff VIP Badge Display

As a **staff member**,
I want to see customer VIP tier badges before service begins,
So that I can provide appropriate recognition and service level.

**Acceptance Criteria:**

**Given** a customer checks in for their appointment
**When** I view the queue or appointment list
**Then** I see their tier badge next to their name (Bronze/Silver/Gold/Platinum)
**And** the badge is color-coded for quick recognition

**Given** a Gold or Platinum customer is in the queue
**When** I view the list
**Then** their entry is visually highlighted
**And** I can easily identify VIP customers at a glance

**Given** I click on a customer in the queue
**When** their details expand
**Then** I see their full tier name and member-since date
**And** I see their lifetime points earned

**Given** a customer has no loyalty account yet
**When** I view their entry
**Then** I see "New Customer" badge instead of a tier badge
**And** I can invite them to join the loyalty program

---

### Story 4.2: Customer Preferences & History View (Staff)

As a **staff member**,
I want to see customer preferences and service history,
So that I can personalize their experience and anticipate their needs.

**Acceptance Criteria:**

**Given** I select a customer from the queue
**When** I view their profile panel
**Then** I see their last 5 services with dates and barbers
**And** I see their most frequently booked services

**Given** the customer has saved preferences
**When** I view their profile
**Then** I see their preferred barber (if any)
**And** I see any notes about their preferences (e.g., "likes short fade", "allergic to certain products")

**Given** the customer has purchased products before
**When** I view their history
**Then** I see their product purchase history
**And** I can recommend restocks or related products

**Given** staff adds a preference note for a customer
**When** they save the note
**Then** it appears for all staff at any branch
**And** the note includes who added it and when

**Given** I'm preparing for the customer's service
**When** I view their profile
**Then** I see "Usual order: [Service name]" prominently displayed
**And** I can quickly select it for their current visit

---

### Story 4.3: Welcome Back Personalization Screen

As a **staff member**,
I want to see a "welcome back" screen for returning customers,
So that I can greet them personally and make them feel valued.

**Acceptance Criteria:**

**Given** a returning customer checks in
**When** I open their profile or they're selected for service
**Then** I see a "Welcome back, [First Name]!" header
**And** I see their visit count (e.g., "12th visit")

**Given** the customer is a frequent visitor (5+ visits)
**When** the welcome screen appears
**Then** I see their loyalty milestone (e.g., "Loyal customer since January 2025")
**And** special messaging for long-term customers

**Given** the customer has a preferred barber
**When** the welcome screen appears
**Then** I see "Usually served by [Barber Name]"
**And** I can check if that barber is available today

**Given** it's been more than 30 days since their last visit
**When** the welcome screen appears
**Then** I see "We missed you! Last visit: [Date]"
**And** messaging encourages staff to mention we're glad they're back

**Given** the customer is visiting a different branch than usual
**When** the welcome screen appears
**Then** I see "Usually visits [Branch Name]"
**And** I have context that they may be unfamiliar with this location

---

### Story 4.4: Customer VIP Status Self-View

As a **customer**,
I want to view my own VIP achievements and status,
So that I feel recognized and can track my loyalty journey.

**Acceptance Criteria:**

**Given** I am logged in as a customer
**When** I navigate to my VIP/Loyalty status page
**Then** I see my tier badge prominently displayed with tier name
**And** I see "Member since [Date]" showing my loyalty tenure

**Given** I view my VIP status
**When** the page loads
**Then** I see my total lifetime points earned
**And** I see my total visits across all branches

**Given** I have achieved milestones
**When** I view my achievements section
**Then** I see badges for milestones (e.g., "10th Visit", "First Redemption", "1000 Points Earned")
**And** locked milestones show what I need to unlock them

**Given** I am a Silver tier customer
**When** I view my status
**Then** I see benefits I've unlocked at this tier
**And** I see a preview of benefits available at the next tier (Gold)

**Given** I view my status page
**When** data loads
**Then** I see my current points balance
**And** I see quick links to "View History", "Browse Rewards", "Top Up Wallet"

---

### Story 4.5: Progress Bar to Next Reward

As a **customer**,
I want to see visual progress toward my next affordable reward,
So that I'm motivated to earn more points and redeem rewards.

**Acceptance Criteria:**

**Given** I have 150 points and the cheapest reward costs 200 points
**When** I view my dashboard or rewards page
**Then** I see a progress bar showing 150/200 (75%)
**And** I see "50 more points until [Reward Name]!"

**Given** multiple rewards are within reach
**When** I view the progress section
**Then** I can see progress toward 2-3 closest affordable rewards
**And** I can tap to see details of each reward

**Given** I have enough points for a reward (300 points, reward costs 200)
**When** I view my dashboard
**Then** the progress bar shows "Ready to redeem!"
**And** a prominent "Redeem Now" button is displayed

**Given** I earn points
**When** the transaction completes
**Then** the progress bar animates to show the increase
**And** if I crossed a reward threshold, I see "You can now redeem [Reward]!"

**Given** I'm viewing my points balance anywhere in the app
**When** a compact progress indicator is shown
**Then** I see a mini progress ring/bar toward next reward
**And** tapping it takes me to the full rewards page

---

## Epic 5: Loyalty Administration & Analytics

Branch Admins can view wallet/redemption dashboards and adjust pricing. Super Admins can configure rates, tiers, and bonuses, plus view system-wide analytics and branch comparisons. Cross-branch sync ensures universal points/wallet.

### Story 5.1: Branch Admin Wallet Dashboard

As a **Branch Admin**,
I want to view wallet and redemption metrics for my branch,
So that I can track loyalty program performance at my location.

**Acceptance Criteria:**

**Given** I am logged in as a Branch Admin
**When** I navigate to the Loyalty Dashboard
**Then** I see wallet top-up totals for my branch (today, this week, this month)
**And** data is scoped to only my branch's transactions

**Given** I view the dashboard
**When** data loads
**Then** I see total redemption value (points redeemed converted to peso value)
**And** I see count of redemptions processed at my branch

**Given** I want to understand cash flow
**When** I view the "Net Loyalty Float" card
**Then** I see: Top-ups (₱X) - Redemptions (₱Y) = Net Float (₱Z)
**And** positive float indicates more money coming in than going out

**Given** I view the dashboard
**When** I select a date range filter
**Then** all metrics update to reflect the selected period
**And** I can compare current period to previous period

**Given** transactions happen at my branch
**When** I'm viewing the dashboard
**Then** metrics update in real-time via Convex subscriptions
**And** I see the latest data without refreshing

---

### Story 5.2: Branch Admin VIP Metrics

As a **Branch Admin**,
I want to view VIP customer metrics for my branch,
So that I can track customer loyalty and retention.

**Acceptance Criteria:**

**Given** I am logged in as a Branch Admin
**When** I view the VIP metrics section
**Then** I see customer counts by tier (Bronze: X, Silver: Y, Gold: Z, Platinum: W)
**And** counts reflect customers who have visited my branch

**Given** I want to track retention
**When** I view retention metrics
**Then** I see "Returning VIP customers this month" count
**And** I see percentage of VIP customers who returned within 30 days

**Given** I view tier distribution
**When** data loads
**Then** I see a visual chart (pie or bar) showing tier breakdown
**And** I can see trends over time (more customers moving up tiers)

**Given** a VIP customer is at risk (no visit in 45+ days)
**When** I view the "At Risk" section
**Then** I see a list of VIP customers who haven't visited recently
**And** I can see their contact info to reach out

---

### Story 5.3: Branch Admin Redemption Pricing

As a **Branch Admin**,
I want to adjust point costs for rewards at my branch,
So that I can run branch-specific promotions on redemptions.

**Acceptance Criteria:**

**Given** I am logged in as a Branch Admin
**When** I navigate to Redemption Pricing settings
**Then** I see a list of rewards with their default point costs
**And** I can set branch-specific overrides

**Given** a reward normally costs 500 points
**When** I set a branch override of 400 points
**Then** customers redeeming at my branch pay 400 points
**And** customers at other branches still pay 500 points

**Given** I set a branch-specific price
**When** the price is saved
**Then** an audit record is created showing who changed what and when
**And** the change takes effect immediately

**Given** I want to run a "Double Points Value" promo
**When** I reduce all redemption costs by 50%
**Then** customers effectively get 2x value on their points at my branch
**And** the promo is time-limited (I set start/end dates)

**Given** Super Admin sets a minimum redemption price
**When** I try to set a price below the minimum
**Then** I am prevented from doing so
**And** I see a message explaining the minimum threshold

---

### Story 5.4: Super Admin System-Wide Dashboard

As a **Super Admin**,
I want to view system-wide loyalty metrics,
So that I can monitor the overall health of the loyalty program.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to the System Loyalty Dashboard
**Then** I see aggregate metrics across all branches
**And** I see total wallet float (all top-ups minus all redemptions)

**Given** I view the dashboard
**When** data loads
**Then** I see total points in circulation (sum of all current_balance)
**And** I see total points ever earned (sum of all lifetime_earned)

**Given** I want to understand program liability
**When** I view the "Outstanding Points" metric
**Then** I see total point value outstanding (points × ₱1 = liability)
**And** I can assess if the program is sustainable

**Given** I view VIP counts
**When** data loads
**Then** I see total customers by tier across all branches
**And** I see month-over-month growth in each tier

**Given** I view the dashboard
**When** I want to drill down
**Then** I can click any metric to see branch-level breakdown
**And** I can identify which branches are driving the numbers

---

### Story 5.5: Super Admin Branch Comparison

As a **Super Admin**,
I want to compare loyalty program performance across branches,
So that I can identify top performers and those needing attention.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to Branch Comparison
**Then** I see a table/grid of all branches with key metrics
**And** metrics include: top-ups, redemptions, VIP count, retention rate

**Given** I view the comparison
**When** I click a column header
**Then** I can sort branches by that metric (ascending/descending)
**And** I can quickly find top and bottom performers

**Given** I want visual comparison
**When** I toggle to chart view
**Then** I see bar charts comparing branches on selected metrics
**And** I can select which metrics to display

**Given** I identify an underperforming branch
**When** I click on that branch
**Then** I drill down to their detailed dashboard
**And** I can see trends and identify issues

**Given** I want to share performance data
**When** I click "Export"
**Then** I can download the comparison as CSV or PDF
**And** the export includes all visible metrics and date range

---

### Story 5.6: Super Admin Points Configuration

As a **Super Admin**,
I want to configure point earning rates,
So that I can adjust the loyalty program economics.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to Loyalty Configuration > Points
**Then** I see the current base earning rate (default 1:1)
**And** I can modify the rate

**Given** I change the base rate from 1:1 to 1.5:1
**When** I save the configuration
**Then** all future payments earn 1.5 points per peso
**And** existing points are unaffected

**Given** I configure the wallet bonus multiplier
**When** I change from 1.5x to 2x
**Then** future wallet payments earn 2x points instead of 1.5x
**And** the change is logged with timestamp and admin ID

**Given** I make a configuration change
**When** the change is saved
**Then** it's stored in the loyalty_config table
**And** all services fetch the latest config dynamically via getConfig()

**Given** I want to preview impact
**When** I change a rate
**Then** I see a preview: "A ₱500 payment will now earn X points (was Y)"
**And** I must confirm before the change takes effect

---

### Story 5.7: Super Admin Tier Configuration

As a **Super Admin**,
I want to configure tier thresholds and benefits,
So that I can adjust the VIP program structure.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to Loyalty Configuration > Tiers
**Then** I see all tiers with their thresholds and benefits
**And** I can edit thresholds and benefits

**Given** I change Silver threshold from 5000 to 4000 points
**When** I save the configuration
**Then** customers with 4000+ lifetime points are now Silver
**And** auto-promotion runs to upgrade eligible customers

**Given** I add a new benefit to Gold tier
**When** I save the benefit (e.g., "Free monthly product sample")
**Then** the benefit appears in Gold tier benefit list
**And** Gold customers see the new benefit on their status page

**Given** I want to add a new tier (e.g., "Diamond" at 100000 points)
**When** I create the new tier
**Then** it's added to the tiers table with proper ordering
**And** I can configure its benefits separately

**Given** I lower a tier threshold
**When** saving could promote many customers
**Then** I see a warning: "This will promote X customers to Y tier"
**And** I must confirm the mass promotion

---

### Story 5.8: Super Admin Top-Up Bonus Configuration

As a **Super Admin**,
I want to configure wallet top-up bonus tiers,
So that I can incentivize larger top-ups.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to Loyalty Configuration > Top-Up Bonuses
**Then** I see current bonus tiers (₱500→₱550, ₱1000→₱1150)
**And** I can add, edit, or remove bonus tiers

**Given** I add a new tier: ₱2000→₱2400
**When** I save the configuration
**Then** customers topping up ₱2000 receive ₱400 bonus
**And** the new tier is immediately active

**Given** I want to disable bonuses temporarily
**When** I toggle "Bonuses Enabled" to OFF
**Then** no bonuses are applied to new top-ups
**And** existing bonus balances are unaffected

**Given** I modify a bonus tier
**When** I change ₱500 bonus from ₱50 to ₱75
**Then** future ₱500 top-ups receive ₱75 bonus
**And** previous top-ups are unaffected

**Given** I configure bonuses
**When** I save any change
**Then** an audit log records the change
**And** I can view history of bonus configuration changes

---

### Story 5.9: Barber Commission on Redemptions

As a **system**,
I want to ensure barbers receive commission on redeemed services,
So that barbers aren't penalized when customers use loyalty rewards.

**Acceptance Criteria:**

**Given** a customer redeems points for a "Free Haircut" (₱350 value)
**When** the service is completed
**Then** the barber receives their commission (₱350 × 40% = ₱140)
**And** the commission is tracked as "loyalty-funded"

**Given** a redemption service is performed
**When** calculating barber earnings
**Then** the system treats it as if the customer paid ₱350 cash
**And** commission calculation uses the service's normal price

**Given** Branch Admin views commission reports
**When** they see loyalty-funded commissions
**Then** these are clearly labeled as "Loyalty Program"
**And** separated from regular cash/wallet commissions

**Given** Super Admin views program costs
**When** they check loyalty program expenses
**Then** they see total barber commissions funded by the program
**And** this is factored into program profitability analysis

**Given** a redemption is cancelled before service
**When** the barber hasn't performed the service
**Then** no commission is generated
**And** points are refunded to the customer

---

### Story 5.10: Inactive Account Archival

As a **system**,
I want to archive accounts inactive for 6+ months,
So that the system stays clean and secure.

**Acceptance Criteria:**

**Given** a customer hasn't had any activity for 6 months
**When** the archival job runs (daily)
**Then** their account is marked as "archived"
**And** their points balance is preserved but frozen

**Given** an account is archived
**When** the customer tries to log in
**Then** they can still log in successfully
**And** they see a "Welcome back!" reactivation flow

**Given** an archived customer returns
**When** they complete their first transaction
**Then** their account is automatically reactivated
**And** their previous points balance is restored

**Given** an account is archived
**When** staff searches for the customer
**Then** archived accounts appear with an "Archived" badge
**And** staff can manually reactivate if needed

**Given** Super Admin wants to review archived accounts
**When** they access the archived accounts list
**Then** they see all archived accounts with last activity date
**And** they can bulk reactivate or permanently delete (with data retention policy)

---

### Story 5.11: Cross-Branch Points & Wallet Sync

As a **customer**,
I want my points and wallet to work at any branch,
So that I can enjoy my loyalty benefits wherever I go.

**Acceptance Criteria:**

**Given** I earn 500 points at Branch A
**When** I visit Branch B
**Then** I can see my 500 points balance
**And** I can use those points for redemption at Branch B

**Given** I have ₱1000 wallet balance
**When** I visit any branch
**Then** I can pay with my wallet
**And** the balance deducts correctly regardless of branch

**Given** I redeem 300 points at Branch B
**When** the transaction completes
**Then** my points balance updates across all branches instantly
**And** Branch A staff would see my reduced balance if they looked me up

**Given** I'm at Branch A and someone processes a top-up at Branch B (edge case)
**When** both transactions happen simultaneously
**Then** Convex's transactional guarantees ensure consistency
**And** no race conditions cause incorrect balances

**Given** I view my transaction history
**When** looking at cross-branch activity
**Then** I see which branch each transaction occurred at
**And** I can filter history by branch if desired

**Given** the system syncs across branches
**When** any points/wallet transaction occurs
**Then** real-time Convex subscriptions notify all relevant UIs
**And** no polling or manual refresh is needed

---

## Epic 6: Flash Promotions (Phase 2)

Branch Admins can create time-limited flash promos. Super Admins can create promo templates. Customers receive and benefit from auto-applied promotional bonuses.

**Note:** This is a Phase 2 feature per PRD scope.

### Story 6.1: Branch Admin Flash Promo Creation

As a **Branch Admin**,
I want to create time-limited flash promotions for my branch,
So that I can drive traffic and reward customers during specific periods.

**Acceptance Criteria:**

**Given** I am logged in as a Branch Admin
**When** I navigate to Promotions > Create New
**Then** I see a promo creation form with fields for name, type, dates, and rules

**Given** I want to create a "Double Points Weekend" promo
**When** I fill in:
- Name: "Double Points Weekend"
- Type: Bonus Points (2x multiplier)
- Start: Friday 6pm
- End: Sunday 11pm
**Then** the promo is created and scoped to my branch only

**Given** I create a promo
**When** I set eligibility rules
**Then** I can restrict to: all customers, specific tiers, new customers only, or returning customers
**And** I can set minimum purchase amount if desired

**Given** my promo is active
**When** I view my promos list
**Then** I see active, scheduled, and expired promos
**And** I can edit scheduled promos but not active ones

**Given** I want to end a promo early
**When** I click "End Now" on an active promo
**Then** the promo ends immediately
**And** transactions in progress still receive the benefit

**Given** I create a promo
**When** I save it
**Then** an audit record is created
**And** Super Admin can see all branch promos in their dashboard

---

### Story 6.2: Super Admin Promo Templates

As a **Super Admin**,
I want to create system-wide promo templates,
So that branches can run consistent promotions with pre-approved parameters.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to Promotions > Templates
**Then** I see existing templates and can create new ones

**Given** I create a template for "Holiday Double Points"
**When** I define:
- Type: Bonus Points (2x)
- Duration: 3 days max
- Eligibility: All customers
**Then** the template is saved and available for all branches

**Given** a Branch Admin views available templates
**When** they select "Holiday Double Points"
**Then** they can activate it for their branch with their chosen dates
**And** they cannot modify the multiplier (locked by template)

**Given** I want to push a promo to all branches simultaneously
**When** I create a "System-Wide Promo"
**Then** it activates at all branches automatically
**And** Branch Admins are notified of the active promo

**Given** I view template usage
**When** I check analytics
**Then** I see which branches used which templates
**And** I see the performance metrics for each template activation

**Given** I want to retire a template
**When** I mark it as "Inactive"
**Then** branches can no longer activate new instances
**And** existing active promos using the template continue until they expire

---

### Story 6.3: Customer Promo View

As a **customer**,
I want to see active promotions available to me,
So that I can take advantage of special offers.

**Acceptance Criteria:**

**Given** I am logged in as a customer
**When** I navigate to Promotions or my dashboard
**Then** I see a list of active promotions I'm eligible for
**And** each promo shows: name, benefit, and time remaining

**Given** a "Double Points" promo is active at my usual branch
**When** I view the promo details
**Then** I see clear messaging: "Earn 2x points on all purchases!"
**And** I see when the promo ends

**Given** a promo is about to expire (within 24 hours)
**When** I view my promos
**Then** the expiring promo is highlighted with "Ending Soon!" badge
**And** I receive a notification if I have notifications enabled

**Given** I visit the booking/checkout flow
**When** there's an active promo that applies
**Then** I see a banner: "Active Promo: Double Points this weekend!"
**And** the points preview reflects the promo benefit

**Given** a promo requires a minimum purchase
**When** I view the promo
**Then** I see "Minimum ₱500 purchase required" clearly stated
**And** the promo only applies if I meet the threshold

**Given** I'm not eligible for a promo (wrong tier, new customer only, etc.)
**When** I view promos
**Then** I don't see promos I can't use
**Or** I see them grayed out with "Gold tier exclusive" explanation

---

### Story 6.4: Auto-Apply Promo Bonuses

As a **system**,
I want to automatically apply promo bonuses during eligible transactions,
So that customers benefit without manual intervention.

**Acceptance Criteria:**

**Given** a "Double Points" promo is active at Branch A
**When** a customer completes a ₱500 payment at Branch A
**Then** they automatically earn 1000 points (2x) instead of 500
**And** the points_transaction notes: "Includes Double Points promo bonus"

**Given** a "Top-Up Bonus" promo offers extra ₱100 on ₱500 top-ups
**When** a customer tops up ₱500 during the promo
**Then** they receive ₱600 total (₱500 + ₱50 standard bonus + ₱50 promo bonus)
**And** the promo bonus is tracked separately from standard bonus

**Given** multiple promos could apply to a transaction
**When** the system processes the payment
**Then** the best promo for the customer is applied (highest benefit)
**And** only one promo applies per transaction (no stacking unless configured)

**Given** a promo has usage limits (e.g., "First 100 customers")
**When** the limit is reached
**Then** subsequent customers don't receive the promo
**And** the promo shows as "Sold Out" in the customer view

**Given** a promo applies to a transaction
**When** the customer receives confirmation
**Then** they see: "You saved X points with [Promo Name]!"
**And** the receipt/history shows the promo that was applied

**Given** a transaction is refunded/cancelled
**When** promo points were awarded
**Then** the bonus points are also reversed
**And** the audit trail shows the reversal linked to the original promo

