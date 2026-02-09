---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['prd-multi-branch-wallet.md', 'architecture-multi-branch-wallet.md', 'project-context.md']
workflowType: 'epics-and-stories'
project_name: 'tpx-booking-app'
feature_name: 'Multi-branch Wallet Payment'
user_name: 'MASTERPAINTER'
date: '2026-01-31'
total_stories: 22
total_epics: 6
status: 'complete'
validation_passed: true
fr_coverage: '55/55 (100%)'
---

# Multi-branch Wallet Payment - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Multi-branch Wallet Payment, decomposing the requirements from the PRD, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Epic 1: Super Admin Wallet Configuration**
- FR1: Super Admin can configure dedicated PayMongo account for wallet top-ups
- FR2: Wallet top-ups use Super Admin PayMongo credentials (not branch)
- FR3: PayMongo credentials stored securely with encryption
- FR4: Test mode toggle for development/production
- FR5: Super Admin can set global commission rate (default 5%)
- FR6: Commission rate applied to all wallet payments at branches
- FR7: Per-branch commission override available
- FR8: Commission visible in branch dashboard
- FR9: Default settlement frequency configurable (daily, weekly, bi-weekly)
- FR10: Per-branch settlement frequency override
- FR11: Minimum settlement amount configurable

**Epic 2: Branch Wallet Earnings**
- FR12: Each wallet payment creates branch_wallet_earning record
- FR13: Earning record includes branch_id, amount, commission, net_amount, booking_id
- FR14: Real-time update to branch pending balance
- FR15: Audit trail with timestamps for all transactions
- FR16: Branch dashboard shows total pending earnings
- FR17: Shows breakdown: gross, commission, net
- FR18: Lists individual wallet transactions
- FR19: Filter by date range
- FR20: Export to CSV option

**Epic 3: Customer Wallet Top-up Flow**
- FR21: Wallet top-up creates PayMongo checkout with SA credentials
- FR22: Successful payment credits user wallet_balance
- FR23: Transaction recorded in wallet_transactions table
- FR24: Customer receives confirmation notification
- FR25: Top-up bonus tiers configurable by Super Admin
- FR26: Bonus credited immediately with top-up
- FR27: Bonus tracked separately for reporting

**Epic 4: POS Wallet Payment**
- FR28: POS shows "Pay with Wallet" option
- FR29: Displays customer's current wallet balance
- FR30: Validates sufficient balance before accepting
- FR31: Deducts from wallet, records to branch ledger
- FR32: Prints/shows receipt with wallet payment
- FR33: Combo payment: wallet portion deducted first
- FR34: Remaining amount paid via cash/card
- FR35: Both payments recorded appropriately

**Epic 5: Settlement Process**
- FR36: Branch "Request Settlement" button on dashboard
- FR37: Shows amount to be settled (pending earnings)
- FR38: Branch enters bank/GCash/Maya details
- FR39: Request submitted for Super Admin approval
- FR40: Email notification sent to Super Admin
- FR41: Super Admin dashboard shows pending settlement requests
- FR42: Can view breakdown of transactions in request
- FR43: Approve or reject with reason
- FR44: On approval, marks as "processing"
- FR45: Manual bank transfer by Super Admin (Phase 1)
- FR46: Mark as "completed" after transfer done
- FR47: Settlement history list
- FR48: Status: pending, approved, processing, completed, rejected
- FR49: Downloadable receipt/confirmation
- FR50: Filter by date range and status

**Epic 6: Reporting & Analytics**
- FR51: SA dashboard shows total float (money held)
- FR52: Shows outstanding amount owed to branches
- FR53: Shows available for operations
- FR54: Monthly metrics: top-ups, payments, commission earned, settlements paid
- FR55: By-branch breakdown table

### Non-Functional Requirements

**Security:**
- NFR1: PayMongo secret keys encrypted at rest
- NFR2: Only Super Admin can view/edit wallet config
- NFR3: Branch managers can only see their own earnings
- NFR4: Settlement requests require authentication

**Audit & Compliance:**
- NFR5: All wallet transactions logged with audit trail
- NFR6: Settlement requires manual Super Admin approval
- NFR7: Bank account details validated before payout
- NFR8: Commission calculations verified and logged

**Fraud Prevention:**
- NFR9: Rate limiting on top-up requests
- NFR10: Large top-up amounts flagged for review
- NFR11: Settlement request cooldown period
- NFR12: Unusual activity alerts

**Performance:**
- NFR13: Settlement processing time < 48 hours (SLA)
- NFR14: Dashboard queries < 3 seconds

### Additional Requirements

**From Architecture Document:**
- State machine for settlements: pending → approved → processing → completed/rejected
- Commission calculation using `Math.round()` for whole pesos (no floats)
- Branch isolation via `withIndex("by_branch", ...)` on all earnings queries
- Currency as integers: 500 = ₱500 (not ₱500.00)
- Reuse existing `encryptData()`/`decryptData()` pattern from paymongo.ts
- First implementation story: schema additions (4 new tables)
- 4 new tables required: walletConfig, branchWalletSettings, branchWalletEarnings, branchSettlements
- Role-based component organization: admin/, staff/, common/
- New services: walletConfig.ts, branchEarnings.ts, settlements.ts, walletAnalytics.ts

**From Project Context:**
- All queries must filter by branch_id for multi-branch isolation
- Use `ConvexError` with code + message for user-facing errors
- Loading states: check `data === undefined` (Convex pattern)
- Use skeleton loaders, NOT spinners

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1-FR4 | Epic 1 | SA PayMongo configuration |
| FR5-FR8 | Epic 1 | Commission rate settings |
| FR9-FR11 | Epic 1 | Settlement frequency config |
| FR12-FR15 | Epic 2 | Earnings record creation |
| FR16-FR20 | Epic 2 | Earnings dashboard & export |
| FR21-FR24 | Epic 3 | Wallet top-up flow |
| FR25-FR27 | Epic 3 | Top-up bonus feature |
| FR28-FR32 | Epic 4 | POS wallet payment |
| FR33-FR35 | Epic 4 | Combo payment support |
| FR36-FR40 | Epic 5 | Branch settlement request |
| FR41-FR46 | Epic 5 | SA settlement approval |
| FR47-FR50 | Epic 5 | Settlement history |
| FR51-FR55 | Epic 6 | SA analytics dashboard |

**Coverage:** 55/55 FRs mapped (100%)

## Epic List

### Epic 1: Super Admin Wallet Configuration
Super Admin can set up and manage the centralized wallet payment system.
**FRs covered:** FR1-FR11 (11 requirements)

### Epic 2: Branch Wallet Earnings
Branch Managers can view their wallet earnings and track pending balances in real-time.
**FRs covered:** FR12-FR20 (9 requirements)

### Epic 3: Customer Wallet Top-up Flow
Customers can load money into their wallet to use at any branch.
**FRs covered:** FR21-FR27 (7 requirements)

### Epic 4: POS Wallet Payment
Staff can accept wallet payments at the counter, enabling customers to pay with their balance.
**FRs covered:** FR28-FR35 (8 requirements)

### Epic 5: Settlement Process
Branches can request payouts, and Super Admin can approve and complete transfers.
**FRs covered:** FR36-FR50 (15 requirements)

### Epic 6: Reporting & Analytics
Super Admin can monitor overall wallet system health and financial metrics.
**FRs covered:** FR51-FR55 (5 requirements)

---

## Epic 1: Super Admin Wallet Configuration

Super Admin can set up and manage the centralized wallet payment system, including PayMongo credentials, commission rates, and settlement parameters.

### Story 1.1: Add Wallet Schema Tables

As a **developer**,
I want to add the wallet-related database tables to the schema,
So that the wallet system has its data foundation.

**Acceptance Criteria:**

**Given** the Convex schema file exists
**When** I add the wallet tables
**Then** the following tables are created:
- `walletConfig` with fields: paymongo_public_key, paymongo_secret_key (encrypted), paymongo_webhook_secret (encrypted), is_test_mode, default_commission_percent, default_settlement_frequency, min_settlement_amount, created_at, updated_at
- `branchWalletSettings` with fields: branch_id, commission_override, settlement_frequency, payout_method, payout_account_number, payout_account_name, payout_bank_name, created_at, updated_at
- `branchWalletEarnings` with indexes: by_branch, by_branch_status, by_settlement
- `branchSettlements` with indexes: by_branch, by_status, by_branch_status
**And** all currency fields use integers (whole pesos)
**And** all ID references use `v.id("tableName")` pattern

**Technical Notes:**
- Follow schema definitions from architecture document
- Export new tables in schema.ts

---

### Story 1.2: Configure Super Admin PayMongo for Wallet

As a **Super Admin**,
I want to configure a dedicated PayMongo account for wallet top-ups,
So that all wallet deposits flow to a central account I control.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to the Wallet Configuration panel
**Then** I see fields for PayMongo Public Key, Secret Key, and Webhook Secret

**Given** I enter valid PayMongo credentials
**When** I save the configuration
**Then** the credentials are encrypted before storage
**And** I see a success confirmation message
**And** the test mode toggle is available

**Given** the wallet config already exists
**When** I update the credentials
**Then** the existing record is updated (not duplicated)
**And** updated_at timestamp is refreshed

**Given** I toggle test mode
**When** I save
**Then** the is_test_mode flag is updated
**And** the system uses appropriate PayMongo environment

**Technical Notes:**
- Create `convex/services/walletConfig.ts` with getWalletConfig and updateWalletConfig
- Reuse `encryptData()`/`decryptData()` pattern from existing paymongo.ts
- Create `src/components/admin/WalletConfigPanel.jsx`
- Only super_admin role can access

---

### Story 1.3: Configure Global Commission Rate

As a **Super Admin**,
I want to set a commission percentage for wallet payments,
So that I can cover wallet management costs.

**Acceptance Criteria:**

**Given** I am on the Wallet Configuration panel
**When** I set the global commission rate (e.g., 5%)
**Then** the rate is saved to walletConfig.default_commission_percent

**Given** no commission rate is set
**When** the system needs commission rate
**Then** it defaults to 5%

**Given** I enter an invalid commission rate (negative or > 100)
**When** I try to save
**Then** I see a validation error
**And** the save is prevented

**Given** the commission rate is configured
**When** a wallet payment occurs at any branch
**Then** the configured rate is applied to calculate commission

**Technical Notes:**
- Add commission rate field to WalletConfigPanel.jsx
- Validate: 0 <= rate <= 100
- Store as integer representing percentage (5 = 5%)

---

### Story 1.4: Configure Branch Wallet Settings

As a **Super Admin**,
I want to configure wallet settings for each branch,
So that branches can receive their earnings through their preferred payout method.

**Acceptance Criteria:**

**Given** I am on the Branch Management page
**When** I select a branch to configure wallet settings
**Then** I see the Branch Wallet Settings form

**Given** I am configuring a branch's wallet settings
**When** I set a commission override percentage
**Then** this branch uses the override instead of global rate
**And** the override is clearly marked as "Custom" in the UI

**Given** I am configuring payout details
**When** I select payout method (GCash, Maya, or Bank Transfer)
**Then** I must enter account number and account name
**And** for Bank Transfer, I must also enter bank name

**Given** I save branch wallet settings
**When** the settings don't exist yet
**Then** a new branchWalletSettings record is created
**When** the settings already exist
**Then** the existing record is updated

**Given** a branch has no wallet settings configured
**When** they try to request settlement
**Then** they are prompted to configure payout details first

**Technical Notes:**
- Add getBranchWalletSettings and updateBranchWalletSettings to walletConfig.ts
- Create branch wallet settings UI component
- Validate account number format based on payout method

---

### Story 1.5: Configure Settlement Parameters

As a **Super Admin**,
I want to configure default settlement frequency and minimum amounts,
So that settlement requests follow business rules.

**Acceptance Criteria:**

**Given** I am on the Wallet Configuration panel
**When** I set the default settlement frequency
**Then** I can choose from: daily, weekly, bi-weekly

**Given** I set a minimum settlement amount
**When** I enter a value (e.g., ₱500)
**Then** the minimum is saved as an integer (500)
**And** branches cannot request settlement below this amount

**Given** I configure a per-branch settlement frequency override
**When** that branch's auto-settlement runs
**Then** it uses the branch-specific frequency

**Given** a branch has pending earnings below minimum
**When** they try to request settlement
**Then** they see error: "Minimum settlement amount is ₱{amount}"

**Technical Notes:**
- Add settlement fields to WalletConfigPanel.jsx
- Frequency options: "daily" | "weekly" | "biweekly"
- Minimum stored as integer (whole pesos)

---

**Epic 1 Summary:** 5 stories covering FR1-FR11

---

## Epic 2: Branch Wallet Earnings

Branch Managers can view their wallet earnings and track pending balances in real-time, with filtering and export capabilities.

### Story 2.1: Create Wallet Earning Records

As a **system**,
I want to record each wallet payment to the branch ledger,
So that branches can track their earnings accurately.

**Acceptance Criteria:**

**Given** a customer pays with their wallet at a branch
**When** the payment is processed successfully
**Then** a `branchWalletEarnings` record is created with:
- branch_id from the booking/transaction
- booking_id linking to the service
- customer_id who made the payment
- staff_id who processed the payment (optional)
- service_name for display purposes
- gross_amount (full payment amount)
- commission_percent (from config or branch override)
- commission_amount (calculated using `calculateCommission()`)
- net_amount (gross - commission)
- status = "pending"
- created_at timestamp

**Given** commission calculation is needed
**When** the system calculates commission
**Then** it uses `Math.round(grossAmount * (commissionPercent / 100))`
**And** stores the result as an integer (whole pesos)

**Given** a branch has a commission override
**When** an earning record is created
**Then** the override rate is used instead of global rate

**Technical Notes:**
- Create `convex/services/branchEarnings.ts` with createEarningRecord mutation
- Create `convex/lib/walletUtils.ts` with calculateCommission helper
- Import and use helper in all commission calculations

---

### Story 2.2: Branch Earnings Dashboard

As a **Branch Manager**,
I want to see my wallet earnings in real-time,
So that I know how much I've earned from wallet payments.

**Acceptance Criteria:**

**Given** I am logged in as a branch_admin
**When** I navigate to the Wallet Earnings dashboard
**Then** I see the total pending earnings prominently displayed

**Given** I am viewing the earnings dashboard
**When** the data loads
**Then** I see a breakdown showing:
- Gross earnings total
- Commission deducted (with percentage)
- Net earnings (what I'll receive)

**Given** new wallet payments occur at my branch
**When** I am viewing the dashboard
**Then** the totals update in real-time via Convex subscription

**Given** I am loading the dashboard
**When** data is undefined
**Then** I see skeleton loaders (not spinners)

**Given** I am a branch_admin
**When** I query earnings
**Then** I only see my own branch's earnings (branch isolation)

**Technical Notes:**
- Create `src/components/staff/WalletEarningsDashboard.jsx`
- Add getBranchPendingTotal query to branchEarnings.ts
- Use `withIndex("by_branch_status")` for filtered queries
- Query must include branch_id parameter

---

### Story 2.3: Earnings Transaction List

As a **Branch Manager**,
I want to see individual wallet transactions,
So that I can review payment details and track activity.

**Acceptance Criteria:**

**Given** I am on the Wallet Earnings dashboard
**When** I scroll to the transactions section
**Then** I see a list of individual wallet payments showing:
- Date/time
- Service name
- Customer name (if available)
- Gross amount → Net amount

**Given** I have many transactions
**When** I view the list
**Then** transactions are sorted by date (newest first)
**And** pagination or infinite scroll is available

**Given** I want to filter by date range
**When** I select start and end dates
**Then** only transactions within that range are shown
**And** the totals update to reflect filtered data

**Given** the transaction list is loading
**When** data is undefined
**Then** I see skeleton rows (not spinners)

**Technical Notes:**
- Add getBranchEarningsList query with date filters
- Use `.take(100)` for pagination
- Add date range picker component
- Format currency with `toLocaleString()`

---

### Story 2.4: Export Earnings to CSV

As a **Branch Manager**,
I want to export my earnings to CSV,
So that I have records for accounting and reconciliation.

**Acceptance Criteria:**

**Given** I am viewing my earnings (with or without filters)
**When** I click the "Export to CSV" button
**Then** a CSV file is downloaded containing:
- Date
- Service Name
- Customer
- Gross Amount
- Commission %
- Commission Amount
- Net Amount
- Status

**Given** I have date filters applied
**When** I export to CSV
**Then** only the filtered transactions are exported

**Given** the export is processing
**When** the file is being generated
**Then** I see a loading indicator on the button
**And** the button is disabled to prevent double-clicks

**Given** the export completes
**When** the file downloads
**Then** the filename includes branch name and date range

**Technical Notes:**
- Use client-side CSV generation (no backend needed)
- Format amounts as "₱500.00" in CSV
- Include headers row
- Filename format: `wallet-earnings-{branch}-{date}.csv`

---

**Epic 2 Summary:** 4 stories covering FR12-FR20

---

## Epic 3: Customer Wallet Top-up Flow

Customers can load money into their wallet using the Super Admin's PayMongo account, with optional bonus tiers for larger top-ups.

### Story 3.1: Wallet Top-up via Super Admin PayMongo

As a **Customer**,
I want to top up my wallet using any payment method,
So that I can use my balance at any branch.

**Acceptance Criteria:**

**Given** I am logged in as a customer
**When** I navigate to the Wallet Top-up page
**Then** I see my current wallet balance
**And** I can enter the amount I want to add

**Given** I enter a valid top-up amount
**When** I click "Top Up"
**Then** a PayMongo checkout session is created using SA credentials (not branch)
**And** I am redirected to PayMongo payment page

**Given** the SA wallet config is not set up
**When** I try to top up
**Then** I see error: "Wallet top-up is currently unavailable"
**And** no checkout session is created

**Given** the PayMongo checkout succeeds
**When** the webhook fires `checkout_session.payment.paid`
**Then** my `users.wallet_balance` is credited with the top-up amount
**And** a `wallet_transactions` record is created with type "top_up"

**Given** the PayMongo checkout fails or is cancelled
**When** I return to the app
**Then** my wallet balance is unchanged
**And** I see an appropriate error message

**Technical Notes:**
- Extend `convex/services/wallet.ts` with createWalletTopup action
- Use SA PayMongo credentials from walletConfig (decrypted)
- Add webhook handler route in `convex/http.ts` for SA wallet
- Update `src/pages/customer/WalletTopUp.jsx` to use SA flow

---

### Story 3.2: Top-up Confirmation & Notification

As a **Customer**,
I want to receive confirmation after a successful top-up,
So that I know my wallet has been credited.

**Acceptance Criteria:**

**Given** my wallet top-up payment succeeds
**When** the system processes the webhook
**Then** a `wallet_transactions` record is created with:
- user_id
- amount (top-up amount)
- type = "top_up"
- reference = PayMongo payment ID
- status = "completed"
- created_at timestamp

**Given** the transaction is recorded
**When** the webhook processing completes
**Then** a notification is created for me
**And** the notification shows: "Wallet topped up: ₱{amount}"

**Given** I return to the app after payment
**When** I view my wallet
**Then** I see my updated balance immediately
**And** the recent transaction appears in my history

**Given** I am viewing my wallet transactions
**When** I look at a top-up entry
**Then** I see the date, amount, and payment reference

**Technical Notes:**
- Use existing notifications.ts service pattern
- Transaction record enables audit trail
- Real-time balance update via Convex subscription

---

### Story 3.3: Top-up Bonus Tiers

As a **Customer**,
I want to receive bonus credits for larger top-ups,
So that I'm incentivized to load more money.

**Acceptance Criteria:**

**Given** the Super Admin has configured bonus tiers
**When** I view the top-up page
**Then** I see the available bonus tiers displayed (e.g., "Top up ₱500, get ₱25 bonus!")

**Given** I top up an amount that qualifies for a bonus
**When** the payment succeeds
**Then** my wallet is credited with: top-up amount + bonus amount
**And** the bonus is tracked separately in the transaction record

**Given** the bonus tiers are:
- ₱500 = +₱25 bonus
- ₱1000 = +₱75 bonus
**When** I top up ₱1000
**Then** I receive ₱1075 total (₱1000 + ₱75 bonus)

**Given** Super Admin updates bonus tiers
**When** I view the top-up page
**Then** I see the updated bonus information

**Given** no bonus tiers are configured
**When** I top up any amount
**Then** I receive only the top-up amount (no bonus)
**And** no bonus information is displayed

**Technical Notes:**
- Add bonus_tiers field to walletConfig (JSON array)
- Bonus calculation in webhook handler
- Track bonus_amount separately in wallet_transactions
- Display bonus preview on top-up page

---

**Epic 3 Summary:** 3 stories covering FR21-FR27

---

## Epic 4: POS Wallet Payment

Staff can accept wallet payments at the counter, enabling customers to pay with their balance, including partial (combo) payments.

### Story 4.1: Display Wallet Payment Option at POS

As a **Staff Member**,
I want to see a "Pay with Wallet" option when processing payment,
So that I can offer wallet payment to customers.

**Acceptance Criteria:**

**Given** I am processing a payment for a customer at POS
**When** the customer is identified (logged in or looked up)
**Then** I see their current wallet balance displayed
**And** I see a "Pay with Wallet" button

**Given** the customer has sufficient wallet balance (>= total)
**When** I view the payment options
**Then** the "Pay with Wallet" button is enabled
**And** it shows the amount to be deducted

**Given** the customer has insufficient wallet balance (< total)
**When** I view the payment options
**Then** the "Pay with Wallet" button shows "Use ₱{balance} + pay remainder"
**And** combo payment flow is indicated

**Given** the customer has zero wallet balance
**When** I view the payment options
**Then** the wallet option is disabled or hidden
**And** I see "No wallet balance" message

**Given** the customer is a guest (not logged in)
**When** I view the payment options
**Then** wallet payment option is not shown

**Technical Notes:**
- Create `src/components/staff/POSWalletPayment.jsx`
- Query customer wallet balance by user_id
- Integrate with existing POS payment flow

---

### Story 4.2: Process Full Wallet Payment

As a **Staff Member**,
I want to accept full wallet payment,
So that customers can pay entirely with their balance.

**Acceptance Criteria:**

**Given** a customer has wallet balance >= payment total
**When** I click "Pay with Wallet"
**Then** a confirmation dialog shows the deduction amount

**Given** I confirm the wallet payment
**When** the system processes the payment
**Then** the customer's `wallet_balance` is reduced by the payment amount
**And** a `branchWalletEarnings` record is created with commission calculated
**And** the booking/transaction is marked as paid
**And** a `wallet_transactions` record is created with type "payment"

**Given** the payment succeeds
**When** the transaction completes
**Then** I see a success message
**And** a receipt is generated showing "Paid via Wallet"
**And** the customer's new balance is displayed

**Given** the wallet balance changed between display and payment
**When** balance is now insufficient
**Then** I see error: "Insufficient wallet balance"
**And** the payment is not processed
**And** I am offered combo payment option

**Technical Notes:**
- Add `processWalletPayment` mutation to `convex/services/wallet.ts`
- Atomic operation: deduct balance AND create earnings in same mutation
- Call `createEarningRecord` from branchEarnings service
- Use `calculateCommission()` helper

---

### Story 4.3: Process Combo Payment (Wallet + Cash/Card)

As a **Staff Member**,
I want to accept partial wallet payment with remainder via cash/card,
So that customers can use their full wallet balance.

**Acceptance Criteria:**

**Given** a customer's wallet balance < payment total
**When** I click "Use Wallet + Pay Remainder"
**Then** I see a breakdown:
- Wallet portion: ₱{balance}
- Remaining: ₱{total - balance}
- Payment method for remainder: [Cash] [Card] [GCash/Maya]

**Given** I select a payment method for the remainder
**When** I confirm the combo payment
**Then** the wallet portion is processed first:
- Customer wallet balance reduced to ₱0 (or partial use)
- `branchWalletEarnings` created for wallet portion
- `wallet_transactions` created with type "payment"
**Then** the remainder is processed via selected method:
- Cash/card recorded as normal payment

**Given** the combo payment completes successfully
**When** both portions are processed
**Then** the booking is marked as fully paid
**And** the receipt shows both payment parts:
- "Wallet: ₱{wallet_amount}"
- "Cash/Card: ₱{remainder_amount}"

**Given** the wallet portion succeeds but remainder fails
**When** customer cancels remainder payment
**Then** the wallet deduction is NOT reversed (partial payment stands)
**And** the remaining balance is shown as due

**Given** I want to use only part of the wallet
**When** I enter a custom wallet amount (< balance)
**Then** only that amount is deducted from wallet
**And** the rest is paid via other method

**Technical Notes:**
- Add `processComboPayment` mutation to wallet.ts
- Handle atomic wallet deduction separately from other payment
- Support partial wallet usage (not just full balance)
- Record both payment types on the booking

---

**Epic 4 Summary:** 3 stories covering FR28-FR35

---

## Epic 5: Settlement Process

Branches can request payouts of their wallet earnings, and Super Admin can approve, process, and complete transfers using a controlled state machine workflow.

### Story 5.1: Branch Requests Settlement

As a **Branch Manager**,
I want to request payout of my pending earnings,
So that I receive the money in my bank account.

**Acceptance Criteria:**

**Given** I am on the Wallet Earnings dashboard
**When** I have pending earnings above the minimum threshold
**Then** I see a "Request Settlement" button

**Given** I click "Request Settlement"
**When** the settlement form opens
**Then** I see:
- Amount to be settled (total pending earnings)
- Number of transactions included
- My saved payout details (or form to enter them)

**Given** I have no payout details configured
**When** I try to request settlement
**Then** I am prompted to enter: payout method, account number, account name
**And** I must save these before proceeding

**Given** I submit a settlement request
**When** the request is created
**Then** a `branchSettlements` record is created with status = "pending"
**And** all pending `branchWalletEarnings` are associated with this settlement
**And** I see confirmation: "Settlement request submitted"

**Given** I already have a pending settlement request
**When** I try to request another
**Then** I see error: "Settlement already pending for this branch"
**And** the new request is blocked

**Given** my pending earnings are below minimum
**When** I try to request settlement
**Then** I see error: "Minimum settlement amount is ₱{min}"

**Technical Notes:**
- Create `convex/services/settlements.ts` with requestSettlement mutation
- Create `src/components/staff/SettlementRequestForm.jsx`
- Check for existing pending settlement before creating
- Link earnings records to settlement via settlement_id

---

### Story 5.2: Super Admin Settlement Queue

As a **Super Admin**,
I want to see all pending settlement requests,
So that I can review and process them.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to the Settlement Queue
**Then** I see a list of pending settlement requests showing:
- Branch name
- Amount requested
- Number of transactions
- Date requested
- [Review] button

**Given** there are settlements in different statuses
**When** I view the queue
**Then** I see tabs/filters for: Pending, Approved, Processing, Completed, Rejected

**Given** I click "Review" on a settlement
**When** the detail view opens
**Then** I see:
- Branch details and payout information
- List of all transactions included in this settlement
- Total breakdown (gross, commission, net)
- Action buttons: [Approve] [Reject]

**Given** new settlement requests come in
**When** I am viewing the queue
**Then** the list updates in real-time

**Technical Notes:**
- Create `src/components/admin/SettlementApprovalQueue.jsx`
- Add getAllPendingSettlements query to settlements.ts
- Add getSettlementDetails query for review modal
- Use `withIndex("by_status")` for filtered queries

---

### Story 5.3: Approve or Reject Settlement

As a **Super Admin**,
I want to approve or reject settlement requests,
So that I can control fund disbursement.

**Acceptance Criteria:**

**Given** I am reviewing a pending settlement
**When** I click "Approve"
**Then** a confirmation dialog appears
**And** I can optionally add notes

**Given** I confirm approval
**When** the system processes the approval
**Then** the settlement status changes from "pending" to "approved"
**And** approved_by is set to my user_id
**And** approved_at timestamp is recorded
**And** the branch receives a notification

**Given** I click "Reject"
**When** the rejection dialog opens
**Then** I must enter a rejection reason

**Given** I submit the rejection
**When** the system processes it
**Then** the settlement status changes to "rejected"
**And** rejection_reason is stored
**And** the associated earnings are released (settlement_id cleared)
**And** the branch receives a notification with the reason

**Given** I try to approve a non-pending settlement
**When** the mutation runs
**Then** I see error: "Cannot approve from {status} state"
**And** the action is blocked (state machine validation)

**Technical Notes:**
- Add approveSettlement and rejectSettlement mutations
- Implement state machine validation before any status change
- On rejection, clear settlement_id from associated earnings
- Use ConvexError with INVALID_TRANSITION code

---

### Story 5.4: Complete Settlement Transfer

As a **Super Admin**,
I want to mark settlements as processing and completed,
So that I can track the transfer status.

**Acceptance Criteria:**

**Given** I have an approved settlement
**When** I initiate the bank transfer (manual process)
**Then** I click "Mark as Processing"
**And** the status changes from "approved" to "processing"

**Given** a settlement is in "processing" status
**When** I complete the bank transfer
**Then** I click "Mark as Completed"
**And** I enter the transfer reference number

**Given** I confirm completion
**When** the system processes it
**Then** the settlement status changes to "completed"
**And** completed_at timestamp is recorded
**And** transfer_reference is stored
**And** all associated earnings are marked as "settled"
**And** the branch receives a notification

**Given** the transfer fails
**When** I click "Reject" from processing state
**Then** I enter the failure reason
**And** the status changes to "rejected"
**And** associated earnings are released for re-settlement

**Given** I try to complete a non-processing settlement
**When** the mutation runs
**Then** I see error: "Cannot complete from {status} state"

**Technical Notes:**
- Add markAsProcessing and completeSettlement mutations
- Update all linked branchWalletEarnings status to "settled"
- Store transfer_reference for audit trail
- Implement full state machine validation

---

### Story 5.5: Settlement History & Receipts

As a **Branch Manager**,
I want to view my settlement history,
So that I have records for accounting.

**Acceptance Criteria:**

**Given** I am on the Wallet Earnings dashboard
**When** I navigate to "Settlement History"
**Then** I see a list of all my settlement requests

**Given** I am viewing settlement history
**When** the list loads
**Then** each entry shows:
- Date requested
- Amount
- Status (with status badge)
- Completed date (if applicable)

**Given** I want to filter the history
**When** I select status filter or date range
**Then** only matching settlements are shown

**Given** I click on a completed settlement
**When** the detail view opens
**Then** I see full details including:
- All transactions included
- Payout details used
- Transfer reference
- Timeline of status changes

**Given** a settlement is completed
**When** I click "Download Receipt"
**Then** a PDF/printable receipt is generated showing:
- Branch name and payout details
- Settlement amount and date
- Transfer reference
- List of included transactions

**Technical Notes:**
- Create `src/components/staff/SettlementHistoryList.jsx`
- Add getBranchSettlementHistory query
- Use branch_id filtering (branch isolation)
- Client-side receipt generation (jsPDF or print view)

---

**Epic 5 Summary:** 5 stories covering FR36-FR50

---

## Epic 6: Reporting & Analytics

Super Admin can monitor overall wallet system health, track financial metrics, and view per-branch performance.

### Story 6.1: Wallet System Overview Dashboard

As a **Super Admin**,
I want to see overall wallet system health metrics,
So that I can monitor the float and financial position.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to the Wallet Overview dashboard
**Then** I see the following key metrics prominently displayed:
- Total Float (Money Held): Sum of all customer wallet balances
- Outstanding to Branches: Sum of all pending earnings across branches
- Available for Operations: Float - Outstanding

**Given** I am viewing the dashboard
**When** the data loads
**Then** I see monthly metrics:
- Total Top-ups this month
- Total Wallet Payments this month
- Commission Earned this month
- Settlements Paid this month

**Given** I want to see a different time period
**When** I select a date range filter
**Then** the metrics update to reflect that period

**Given** wallet activity occurs
**When** I am viewing the dashboard
**Then** the metrics update in real-time via Convex subscription

**Given** the dashboard is loading
**When** data is undefined
**Then** I see skeleton loaders for each metric card

**Technical Notes:**
- Create `convex/services/walletAnalytics.ts` with getWalletOverview query
- Create `src/components/admin/WalletOverviewDashboard.jsx`
- Aggregate queries must be performant (< 3s per NFR14)
- Consider caching or materialized views for large datasets

---

### Story 6.2: By-Branch Breakdown Table

As a **Super Admin**,
I want to see per-branch wallet performance,
So that I can monitor each branch's earnings and settlements.

**Acceptance Criteria:**

**Given** I am on the Wallet Overview dashboard
**When** I scroll to the branch breakdown section
**Then** I see a table with columns:
- Branch Name
- Total Earnings (all-time or period)
- Pending Amount
- Settled Amount
- Last Settlement Date

**Given** I am viewing the branch table
**When** I click a column header
**Then** the table sorts by that column (ascending/descending)

**Given** I want to see specific branches
**When** I use the search/filter
**Then** only matching branches are shown

**Given** I click on a branch row
**When** the detail view opens
**Then** I see that branch's:
- Earnings history
- Settlement history
- Commission rate (global or override)
- Payout details

**Given** I want to export the data
**When** I click "Export"
**Then** a CSV file downloads with all branch wallet data

**Technical Notes:**
- Add getBranchWalletSummaries query to walletAnalytics.ts
- Query all branches with aggregated earnings data
- Support sorting on frontend
- Use indexed queries for performance

---

**Epic 6 Summary:** 2 stories covering FR51-FR55

---

## Document Summary

### Total Stories: 22

| Epic | Stories | FRs Covered |
|------|---------|-------------|
| Epic 1: SA Wallet Configuration | 5 | FR1-FR11 |
| Epic 2: Branch Wallet Earnings | 4 | FR12-FR20 |
| Epic 3: Customer Wallet Top-up | 3 | FR21-FR27 |
| Epic 4: POS Wallet Payment | 3 | FR28-FR35 |
| Epic 5: Settlement Process | 5 | FR36-FR50 |
| Epic 6: Reporting & Analytics | 2 | FR51-FR55 |

### Implementation Priority

**Phase 1 (Foundation):**
- Story 1.1: Add Wallet Schema Tables
- Story 1.2: Configure SA PayMongo
- Story 1.3: Configure Commission Rate
- Story 3.1: Wallet Top-up via SA PayMongo

**Phase 2 (Branch Earnings):**
- Story 2.1: Create Wallet Earning Records
- Story 2.2: Branch Earnings Dashboard
- Story 4.1: Display Wallet Payment Option
- Story 4.2: Process Full Wallet Payment

**Phase 3 (Settlement):**
- Story 5.1: Branch Requests Settlement
- Story 5.2: SA Settlement Queue
- Story 5.3: Approve/Reject Settlement
- Story 5.4: Complete Settlement Transfer

**Phase 4 (Enhancements):**
- Remaining stories from each epic
- Story 4.3: Combo Payment
- Story 6.1-6.2: Analytics

### Dependencies

```
Story 1.1 (Schema) ──┬──> All other stories
                     │
Story 1.2 (SA Config) ──> Story 3.1 (Top-up)
                     │
Story 2.1 (Earnings) ──> Story 4.2 (POS Payment)
                     │                │
                     └────────────────┴──> Story 5.1 (Settlement)
```

### New Files to Create

**Backend:**
- `convex/lib/walletUtils.ts`
- `convex/services/walletConfig.ts`
- `convex/services/branchEarnings.ts`
- `convex/services/settlements.ts`
- `convex/services/walletAnalytics.ts`

**Frontend:**
- `src/components/admin/WalletConfigPanel.jsx`
- `src/components/admin/SettlementApprovalQueue.jsx`
- `src/components/admin/WalletOverviewDashboard.jsx`
- `src/components/staff/WalletEarningsDashboard.jsx`
- `src/components/staff/SettlementRequestForm.jsx`
- `src/components/staff/SettlementHistoryList.jsx`
- `src/components/staff/POSWalletPayment.jsx`
