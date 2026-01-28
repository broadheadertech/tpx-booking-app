---
stepsCompleted: [1, 2, 3, 4]
status: COMPLETE
inputDocuments:
  - _bmad-output/planning-artifacts/prd-paymongo.md
  - _bmad-output/planning-artifacts/architecture-paymongo.md
completedAt: "2026-01-27"
summary:
  totalEpics: 4
  totalStories: 17
  functionalRequirements: 31
  nonFunctionalRequirements: 18
---

# PayMongo Payment Integration - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for PayMongo Payment Integration, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Customer Payment (FR1-7):**
- FR1: Guest customer can choose between Pay Now (full amount) or Pay Later (convenience fee) at booking confirmation
- FR2: Authenticated customer can choose between Pay Now or Pay Later at booking confirmation
- FR3: Customer can complete payment using GCash, Maya, Credit/Debit Card, GrabPay, or Bank Transfer
- FR4: Customer can see a clear breakdown of service cost, convenience fee (if Pay Later), and total amount before payment
- FR5: Customer receives instant visual confirmation when payment succeeds
- FR6: Customer receives a QR code for branch check-in after successful booking with payment
- FR7: Customer can see their booking payment status (paid, partially paid, pending)

**Branch Configuration (FR8-12):**
- FR8: Branch admin can enter and save PayMongo API keys (public and secret) for their branch
- FR9: Branch admin can set the convenience fee amount (₱50-100) for Pay Later option
- FR10: Branch admin can enable or disable the Pay Later option for their branch
- FR11: Branch admin can view a confirmation that payment configuration is active and working
- FR12: System validates PayMongo API keys when branch admin saves configuration

**POS Operations (FR13-17):**
- FR13: Staff can view a customer's booking payment status when scanning their QR code
- FR14: Staff can see the amount already paid and remaining balance for a booking
- FR15: Staff can record cash payment collection for remaining balance
- FR16: Staff can mark a booking as fully paid after collecting remaining balance
- FR17: Staff can view list of today's bookings with their payment statuses

**Payment Processing (FR18-22):**
- FR18: System can create PayMongo payment links using branch-specific API keys
- FR19: System can receive and process PayMongo webhook notifications for payment events
- FR20: System can update booking payment status based on webhook notifications
- FR21: System can route payment operations to correct branch based on booking data
- FR22: System can handle payment failures and display appropriate error messages to customer

**Security & Compliance (FR23-26):**
- FR23: System stores branch PayMongo API keys in encrypted form
- FR24: System verifies PayMongo webhook signatures before processing payment updates
- FR25: System ensures branch A cannot access branch B's payment configuration or transactions
- FR26: System restricts payment configuration access to branch_admin and super_admin roles only

**Audit & Tracking (FR27-31):**
- FR27: System logs all payment initiation events with booking ID, amount, method, and timestamp
- FR28: System logs all payment completion/failure events with PayMongo transaction ID
- FR29: System logs all webhook events with verification status
- FR30: Branch admin can view payment transaction history for their branch
- FR31: Super admin can view payment transaction history across all branches

### NonFunctional Requirements

**Performance (NFR1-4):**
- NFR1: Payment initiation (from "Pay" click to PayMongo redirect) completes within 3 seconds
- NFR2: Webhook processing updates booking status within 5 seconds of receipt
- NFR3: POS booking lookup (QR scan to display) completes within 2 seconds
- NFR4: Branch payment configuration save completes within 3 seconds

**Security (NFR5-10):**
- NFR5: PayMongo API keys are encrypted at rest using AES-256 or equivalent
- NFR6: Secret keys are never transmitted to or accessible from frontend code
- NFR7: Webhook endpoints verify PayMongo signature before processing any payment update
- NFR8: All payment-related API calls use HTTPS/TLS 1.2+
- NFR9: Failed authentication attempts are logged and rate-limited
- NFR10: Branch payment data is isolated; queries enforce branch_id filtering

**Reliability (NFR11-14):**
- NFR11: Webhook endpoint achieves 99.9% availability
- NFR12: Failed webhook deliveries are retried with exponential backoff
- NFR13: System logs all payment events for audit and debugging
- NFR14: Payment status updates are idempotent (duplicate webhooks don't cause issues)

**Integration (NFR15-18):**
- NFR15: System supports PayMongo API v1 for payment link creation
- NFR16: System handles PayMongo webhook events: payment.paid, payment.failed, source.chargeable
- NFR17: System gracefully handles PayMongo API downtime with user-friendly error messages
- NFR18: API key validation provides clear feedback on configuration errors

### Additional Requirements

**From Architecture Document:**
- Encryption library required: `convex/lib/encryption.ts` with AES-256-GCM
- 2 new database tables: `branchPaymentConfig`, `paymentAuditLog`
- Extend `bookings` table with payment fields (`paymongo_link_id`, `paymongo_payment_id`, `convenience_fee_paid`)
- Add new payment status: `partial` (convenience fee paid, full amount pending)
- Webhook HTTP endpoint at `/webhooks/paymongo`
- PayMongo-specific error codes: `PAYMONGO_NOT_CONFIGURED`, `PAYMONGO_API_ERROR`, `PAYMONGO_INVALID_SIGNATURE`, etc.
- All PayMongo ID fields use `paymongo_` prefix
- Amount conversion: Database stores pesos, PayMongo API uses centavos

**Implementation Sequence (from Architecture):**
1. Schema changes (tables + indexes)
2. Encryption library
3. PayMongo service (queries, mutations, actions)
4. HTTP webhook handler
5. Payment Settings UI (branch admin)
6. Booking flow integration
7. POS flow integration

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 2 | Guest Pay Now/Pay Later choice |
| FR2 | Epic 2 | Auth user Pay Now/Pay Later choice |
| FR3 | Epic 2 | GCash/Maya/Card/GrabPay/Bank payment methods |
| FR4 | Epic 2 | Payment breakdown display |
| FR5 | Epic 2 | Instant visual confirmation |
| FR6 | Epic 2 | QR code for check-in |
| FR7 | Epic 2 | Booking payment status view |
| FR8 | Epic 1 | Save PayMongo API keys |
| FR9 | Epic 1 | Set convenience fee amount |
| FR10 | Epic 1 | Enable/disable Pay Later |
| FR11 | Epic 1 | Config active confirmation |
| FR12 | Epic 1 | API key validation |
| FR13 | Epic 3 | Staff view payment status |
| FR14 | Epic 3 | Show paid amount and balance |
| FR15 | Epic 3 | Record cash payment |
| FR16 | Epic 3 | Mark booking fully paid |
| FR17 | Epic 3 | Today's bookings with payment status |
| FR18 | Epic 2 | Create PayMongo payment links |
| FR19 | Epic 2 | Process webhook notifications |
| FR20 | Epic 2 | Update booking from webhook |
| FR21 | Epic 2 | Route to correct branch |
| FR22 | Epic 2 | Handle payment failures |
| FR23 | Epic 1 | Encrypted API key storage |
| FR24 | Epic 2 | Webhook signature verification |
| FR25 | Epic 1 | Branch data isolation |
| FR26 | Epic 1 | RBAC for config access |
| FR27 | Epic 4 | Log payment initiation |
| FR28 | Epic 4 | Log payment completion/failure |
| FR29 | Epic 4 | Log webhook events |
| FR30 | Epic 4 | Branch admin view history |
| FR31 | Epic 4 | Super admin view all history |

**Coverage:** 31/31 FRs mapped ✅

## Epic List

### Epic 1: Branch Payment Configuration
**Goal:** Branch admins can configure PayMongo payment processing for their branch, enabling online payments.

**User Outcome:** Dennis (branch admin) can enter his PayMongo API keys, set convenience fees, and activate online payments for his branch.

**FRs Covered:** FR8, FR9, FR10, FR11, FR12, FR23, FR25, FR26

**Includes:**
- `branchPaymentConfig` table with encrypted credentials
- Encryption library (`convex/lib/encryption.ts`)
- PayMongo config mutations (save, validate)
- PaymentSettings.jsx UI component
- Branch isolation (FR25) and RBAC (FR26)

---

### Epic 2: Customer Online Payment Flow
**Goal:** Customers can complete online payments when booking services via Pay Now or Pay Later options.

**User Outcome:** Maria (guest) and Carlo (student) can pay via GCash, Maya, or Card when booking. They receive instant confirmation and a QR code for check-in.

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR18, FR19, FR20, FR21, FR22, FR24

**Includes:**
- PaymentOptionsModal.jsx (Pay Now / Pay Later selection)
- Payment link creation action
- Webhook handler with signature verification (FR24)
- Booking component integration
- Real-time payment status updates
- QR code generation

---

### Epic 3: POS Payment Collection
**Goal:** Staff can view and collect remaining balances for Pay Later bookings at the point of service.

**User Outcome:** Jasmine (receptionist) can scan a customer's QR code, see what's already paid, collect the remaining balance, and mark the booking complete.

**FRs Covered:** FR13, FR14, FR15, FR16, FR17

**Includes:**
- POS payment status display
- Remaining balance calculation
- Cash payment recording
- Booking completion workflow

---

### Epic 4: Payment Audit & Reporting
**Goal:** Admins can view payment transaction history and audit logs for compliance and reconciliation.

**User Outcome:** Branch admins see their branch's payment history. Super admins see all branches. Full audit trail for disputes.

**FRs Covered:** FR27, FR28, FR29, FR30, FR31

**Includes:**
- `paymentAuditLog` table queries
- Branch admin payment history view
- Super admin cross-branch view
- Audit event logging throughout all payment operations

---

## Epic 1: Branch Payment Configuration

**Goal:** Branch admins can configure PayMongo payment processing for their branch, enabling online payments.

### Story 1.1: Create Payment Configuration Schema

As a **system administrator**,
I want **the database schema for branch payment configuration to be created**,
So that **branch-specific PayMongo credentials and settings can be securely stored**.

**Acceptance Criteria:**

**Given** the Convex schema needs to support PayMongo configuration
**When** I add the `branchPaymentConfig` table to schema.ts
**Then** the table includes fields for:
- `branch_id` (reference to branches)
- `provider` (literal "paymongo")
- `is_enabled` (boolean)
- `public_key_encrypted` (string)
- `secret_key_encrypted` (string)
- `webhook_secret_encrypted` (string)
- `encryption_iv` (string)
- `pay_now_enabled` (boolean) - Toggle for Pay Now option
- `pay_later_enabled` (boolean) - Toggle for Pay Later option
- `pay_at_shop_enabled` (boolean) - Toggle for Pay at Shop option
- `convenience_fee_percent` (number)
- `created_at`, `updated_at` (timestamps)
- `updated_by` (reference to users)
**And** the table has index `by_branch` on `branch_id`
**And** `npx convex dev` succeeds without errors

**FRs:** FR23 (encrypted storage foundation)

---

### Story 1.2: Create Encryption Library

As a **developer**,
I want **an encryption library for securely storing API keys**,
So that **PayMongo credentials are encrypted at rest using AES-256-GCM**.

**Acceptance Criteria:**

**Given** the system needs to encrypt PayMongo API keys
**When** I create `convex/lib/encryption.ts`
**Then** it exports `encryptApiKey(plaintext, key)` returning `{ encrypted, iv }`
**And** it exports `decryptApiKey(encrypted, iv, key)` returning plaintext
**And** encryption uses AES-256-GCM algorithm
**And** IV is randomly generated (16 bytes) for each encryption
**And** the encryption key is read from `PAYMONGO_ENCRYPTION_KEY` environment variable
**And** decryption correctly recovers the original plaintext

**FRs:** FR23 (encrypted API key storage)
**NFRs:** NFR5 (AES-256)

---

### Story 1.3: Build PayMongo Configuration Service

As a **branch admin**,
I want **backend services to save and retrieve PayMongo configuration**,
So that **I can configure payment settings and the system can securely access them**.

**Acceptance Criteria:**

**Given** a branch admin wants to save PayMongo configuration
**When** they call the `savePaymentConfig` mutation
**Then** the system encrypts the API keys using the encryption library
**And** stores the encrypted credentials in `branchPaymentConfig`
**And** validates that the branch_id matches the admin's branch (FR25, FR26)
**And** returns success confirmation

**Given** the system needs to retrieve payment configuration
**When** a query `getPaymentConfig` is called with branch_id
**Then** it returns the config for that branch only (branch isolation - FR25)
**And** encrypted fields are NOT decrypted in queries (server-side only - NFR6)

**Given** an action needs the decrypted API keys
**When** `getDecryptedConfig` action is called
**Then** it decrypts the keys server-side
**And** never exposes plaintext keys to frontend

**FRs:** FR8, FR23, FR25, FR26
**NFRs:** NFR5, NFR6, NFR10

---

### Story 1.4: Build Payment Settings UI

As a **branch admin**,
I want **a Payment Settings page to configure PayMongo for my branch**,
So that **I can enter API keys, set fees, and enable online payments**.

**Acceptance Criteria:**

**Given** I am logged in as a branch_admin or super_admin
**When** I navigate to the Payment Settings page
**Then** I see a form with fields for:
- PayMongo Public Key (text input)
- PayMongo Secret Key (password input)
- Webhook Secret (password input)
- Convenience Fee Amount (number input, ₱50-100 range) - FR9
- **Payment Options Section:**
  - Pay Now Enabled (toggle switch) - Full payment via PayMongo
  - Pay Later Enabled (toggle switch) - FR10 - Convenience fee now, balance at branch
  - Pay at Shop Enabled (toggle switch) - No online payment, pay at branch

**Given** I have no PayMongo API keys configured
**When** I view the Payment Options section
**Then** Pay Now and Pay Later toggles are disabled (grayed out)
**And** only Pay at Shop can be enabled
**And** I see a message "Configure PayMongo API keys to enable online payments"

**Given** I have valid PayMongo API keys configured
**When** I view the Payment Options section
**Then** all three toggles are available
**And** at least one payment option must be enabled (validation)

**Given** I enter valid PayMongo API keys and click Save
**When** the system validates the keys with PayMongo API - FR12
**Then** I see a success message "Payment configuration saved"
**And** I see a confirmation that config is active - FR11

**Given** I enter invalid API keys
**When** I click Save
**Then** I see an error message explaining the validation failure - FR12

**Given** I am not a branch_admin or super_admin
**When** I try to access Payment Settings
**Then** I am denied access (RBAC - FR26)

**FRs:** FR8, FR9, FR10, FR11, FR12, FR26

---

## Epic 2: Customer Online Payment Flow

**Goal:** Customers can complete online payments when booking services via Pay Now, Pay Later, or Pay at Shop options.

### Story 2.1: Create Payment Audit Log Schema & Booking Extensions

As a **system administrator**,
I want **the database schema extended for payment tracking**,
So that **payment events can be logged and bookings can track payment state**.

**Acceptance Criteria:**

**Given** the system needs to log payment events
**When** I add the `paymentAuditLog` table to schema.ts
**Then** the table includes fields for:
- `branch_id`, `booking_id`, `transaction_id` (references)
- `paymongo_payment_id`, `paymongo_link_id` (strings)
- `event_type` (union of link_created, payment_initiated, payment_completed, payment_failed, payment_refunded, webhook_received, webhook_verified, webhook_failed)
- `amount`, `payment_method`, `raw_payload`, `error_message`, `ip_address`
- `created_at` (timestamp)
**And** indexes: `by_branch`, `by_booking`, `by_paymongo_payment`, `by_created_at`

**Given** bookings need to track payment state
**When** I extend the `bookings` table
**Then** it includes new fields:
- `paymongo_link_id` (optional string)
- `paymongo_payment_id` (optional string)
- `convenience_fee_paid` (optional number)
**And** `payment_status` includes new value `"partial"`

**FRs:** Foundation for FR27-29 (audit logging)

---

### Story 2.2: Build Payment Link Creation Service

As a **customer**,
I want **the system to create secure payment links or allow booking without payment**,
So that **I can complete my booking with my preferred payment method**.

**Acceptance Criteria:**

**Given** a customer is completing a booking with Pay Now or Pay Later selected
**When** the `createPaymentLink` action is called with booking details
**Then** the system retrieves the branch's decrypted PayMongo keys
**And** calls PayMongo API to create a payment link
**And** converts amount from pesos to centavos for PayMongo
**And** logs a `link_created` audit event (FR27)
**And** updates the booking with `paymongo_link_id`
**And** returns the `checkout_url` for customer redirect

**Given** a customer selects "Pay at Shop"
**When** the booking is submitted
**Then** the system creates the booking with `payment_status: "unpaid"`
**And** NO PayMongo link is created
**And** booking confirmation shows "Pay at branch upon arrival"

**Given** the branch has no PayMongo configuration
**When** the payment options are loaded
**Then** only "Pay at Shop" option is available (graceful fallback)

**Given** PayMongo API returns an error
**When** `createPaymentLink` is called
**Then** it throws `PAYMONGO_API_ERROR` with user-friendly message (FR22)
**And** customer is offered "Pay at Shop" as fallback option

**FRs:** FR18, FR21, FR22
**NFRs:** NFR1 (<3s), NFR15 (PayMongo API v1), NFR17 (graceful handling)

---

### Story 2.3: Build PayMongo Webhook Handler

As a **system**,
I want **to receive and process PayMongo webhook notifications**,
So that **booking payment status is updated automatically when customers pay**.

**Acceptance Criteria:**

**Given** PayMongo sends a webhook to `/webhooks/paymongo`
**When** the request is received
**Then** the system logs a `webhook_received` audit event (FR29)
**And** extracts the `Paymongo-Signature` header
**And** verifies the signature using HMAC-SHA256 (FR24)

**Given** webhook signature is valid
**When** the event is `payment.paid`
**Then** the system logs `webhook_verified` event
**And** updates the booking `payment_status` to `paid` or `partial` (FR20)
**And** stores `paymongo_payment_id` on the booking
**And** logs `payment_completed` audit event (FR28)
**And** returns HTTP 200

**Given** webhook signature is invalid
**When** verification fails
**Then** the system logs `webhook_failed` event
**And** returns HTTP 401 "Invalid signature"

**Given** a duplicate webhook is received (same payment_id)
**When** processing
**Then** the system skips duplicate processing (idempotent - NFR14)

**FRs:** FR19, FR20, FR21, FR24
**NFRs:** NFR2 (<5s), NFR7, NFR14, NFR16

---

### Story 2.4: Build Payment Options Modal

As a **customer**,
I want **to choose between Pay Now, Pay Later, or Pay at Shop**,
So that **I can select my preferred payment method based on my situation**.

**Acceptance Criteria:**

**Given** I have selected services and am at booking confirmation
**When** the PaymentOptionsModal is displayed
**Then** I see available payment options based on branch configuration:
- **Pay Now**: Full service amount via PayMongo (if enabled)
- **Pay Later**: Convenience fee now, service amount at branch (if enabled)
- **Pay at Shop**: No payment now, pay full amount at branch (if enabled)

**Given** I am viewing the payment options
**When** I look at the breakdown (FR4)
**Then** I see for each option:
| Option | Pay Now | Due at Branch |
|--------|---------|---------------|
| Pay Now | ₱XXX (full) | ₱0 |
| Pay Later | ₱XX (fee) | ₱XXX (service) |
| Pay at Shop | ₱0 | ₱XXX (full) |

**Given** the branch has Pay Now disabled
**When** the modal loads
**Then** Pay Now option is hidden

**Given** the branch has Pay Later disabled
**When** the modal loads
**Then** Pay Later option is hidden

**Given** the branch has Pay at Shop disabled
**When** the modal loads
**Then** Pay at Shop option is hidden

**Given** the branch has no PayMongo configuration
**When** the modal loads
**Then** only Pay at Shop option is available

**Given** I select a payment option requiring PayMongo
**When** I click "Proceed to Payment"
**Then** payment methods are shown: GCash, Maya, Card, GrabPay, Bank Transfer (FR3)

**Given** I select "Pay at Shop"
**When** I click "Confirm Booking"
**Then** booking is created without payment redirect
**And** I see confirmation with "Pay ₱XXX at the branch"

**FRs:** FR1, FR2, FR3, FR4

---

### Story 2.5: Integrate Payment Flow into Booking Components

As a **guest or authenticated customer**,
I want **to complete payment during the booking flow**,
So that **my appointment is secured with payment**.

**Acceptance Criteria:**

**Given** I am a guest on GuestServiceBooking (FR1)
**When** I complete the booking form and select a payment option
**Then** the system creates a payment link (if Pay Now/Pay Later)
**And** I am redirected to PayMongo checkout
**And** after successful payment, I am redirected back with confirmation

**Given** I am an authenticated user on ServiceBooking (FR2)
**When** I complete the booking and select a payment option
**Then** the same payment flow occurs
**And** the payment is linked to my user account

**Given** I select Pay Later
**When** payment completes
**Then** booking `payment_status` is set to `partial`
**And** `convenience_fee_paid` stores the amount paid

**Given** I select Pay Now
**When** payment completes
**Then** booking `payment_status` is set to `paid`

**Given** I select Pay at Shop
**When** booking is submitted
**Then** booking `payment_status` is set to `unpaid`
**And** I see confirmation with amount due at branch

**FRs:** FR1, FR2

---

### Story 2.6: Build Payment Confirmation & Status Display

As a **customer**,
I want **to see instant confirmation and receive a QR code after booking**,
So that **I know my appointment is secured and can check in easily**.

**Acceptance Criteria:**

**Given** my payment was successful (Pay Now or Pay Later)
**When** I am redirected back to the app (FR5)
**Then** I see a confirmation screen showing:
- "Payment Successful" message
- Booking details (date, time, service, barber)
- Amount paid
- QR code for branch check-in (FR6)

**Given** I selected Pay at Shop
**When** booking is confirmed
**Then** I see a confirmation screen showing:
- "Booking Confirmed" message
- Booking details (date, time, service, barber)
- Amount due at branch: ₱XXX
- QR code for branch check-in (FR6)

**Given** I want to view my booking later
**When** I access my booking details (FR7)
**Then** I see payment status:
- "Paid" (full amount paid via PayMongo)
- "Partially Paid - ₱XX convenience fee paid, ₱XXX due at branch"
- "Pay at Branch - ₱XXX due upon arrival"

**Given** my payment failed (FR22)
**When** I am redirected back
**Then** I see an error message explaining the failure
**And** I am offered options to retry or select "Pay at Shop"

**FRs:** FR5, FR6, FR7, FR22
**NFRs:** NFR17 (graceful error handling)

---

## Epic 3: POS Payment Collection

**Goal:** Staff can view and collect remaining balances for Pay Later and Pay at Shop bookings at the point of service.

### Story 3.1: Display Payment Status in POS Booking View

As a **staff member**,
I want **to see the payment status when viewing a customer's booking**,
So that **I know how much has been paid and what's remaining**.

**Acceptance Criteria:**

**Given** a customer arrives and shows their QR code
**When** I scan/enter the booking reference at POS (FR13)
**Then** I see the booking details with payment status:
- Customer name, service, barber, appointment time
- Payment status badge (Paid / Partially Paid / Pay at Branch)
- Amount already paid (if any)
- Remaining balance due (FR14)

**Given** the booking was Pay Now (fully paid)
**When** I view the booking
**Then** I see "PAID - ₱XXX via PayMongo"
**And** remaining balance shows ₱0

**Given** the booking was Pay Later (convenience fee paid)
**When** I view the booking
**Then** I see "PARTIALLY PAID - ₱XX convenience fee paid"
**And** remaining balance shows "₱XXX due now"

**Given** the booking was Pay at Shop (no payment)
**When** I view the booking
**Then** I see "PAY AT BRANCH"
**And** remaining balance shows "₱XXX due now"

**FRs:** FR13, FR14
**NFRs:** NFR3 (<2s lookup)

---

### Story 3.2: Record Cash Payment Collection

As a **staff member**,
I want **to record when a customer pays their remaining balance**,
So that **the booking is marked as fully paid and tracked for accounting**.

**Acceptance Criteria:**

**Given** I am viewing a booking with remaining balance
**When** I click "Collect Payment"
**Then** I see the amount due: ₱XXX
**And** I can select payment method: Cash, GCash (manual), Maya (manual), Card (manual)

**Given** the customer pays the remaining balance
**When** I select payment method and click "Confirm Payment" (FR15)
**Then** the system records the payment collection
**And** logs a payment event to audit log
**And** updates the booking `payment_status` to `paid`

**Given** partial payment is received (edge case)
**When** I need to record partial payment
**Then** I can enter a custom amount
**And** remaining balance is updated accordingly

**FRs:** FR15

---

### Story 3.3: Mark Booking as Completed

As a **staff member**,
I want **to mark a booking as fully paid and completed**,
So that **the service is finalized in the system**.

**Acceptance Criteria:**

**Given** the customer has paid the full amount
**When** I click "Mark Complete" (FR16)
**Then** the booking status changes to "completed"
**And** payment_status is "paid"
**And** the transaction is logged for branch accounting

**Given** the customer has NOT paid the remaining balance
**When** I try to mark as complete
**Then** I see a warning "Customer has unpaid balance of ₱XXX"
**And** I can choose to proceed (mark as complete anyway) or collect payment first

**FRs:** FR16

---

### Story 3.4: View Today's Bookings with Payment Status

As a **staff member**,
I want **to see a list of today's bookings with their payment statuses**,
So that **I can prepare for customers and know who has pre-paid**.

**Acceptance Criteria:**

**Given** I am on the POS or staff dashboard
**When** I view today's bookings list (FR17)
**Then** I see all bookings for today with columns:
- Time
- Customer name
- Service
- Barber
- Payment Status (Paid / Partial / Pay at Branch)
- Amount Due

**Given** I want to filter bookings
**When** I use filter options
**Then** I can filter by:
- Payment status (All / Paid / Unpaid)
- Barber
- Time range

**Given** I click on a booking in the list
**When** the booking details open
**Then** I can collect payment or mark complete from there

**FRs:** FR17

---

## Epic 4: Payment Audit & Reporting

**Goal:** Admins can view payment transaction history and audit logs for compliance and reconciliation.

### Story 4.1: Implement Payment Audit Logging Functions

As a **system**,
I want **centralized audit logging functions for payment events**,
So that **all payment operations are tracked consistently for compliance and debugging**.

**Acceptance Criteria:**

**Given** the system needs to log payment events
**When** `logPaymentEvent` function is called
**Then** it creates an entry in `paymentAuditLog` with:
- `branch_id`, `booking_id`, `transaction_id`
- `event_type` (link_created, payment_initiated, payment_completed, payment_failed, webhook_received, webhook_verified, webhook_failed)
- `amount`, `payment_method`
- `paymongo_payment_id`, `paymongo_link_id` (when available)
- `raw_payload` (for webhooks - FR29)
- `error_message` (for failures)
- `ip_address` (when available)
- `created_at` timestamp

**Given** a payment link is created (Story 2.2)
**When** `createPaymentLink` completes
**Then** a `link_created` event is logged with booking ID, amount, and link ID (FR27)

**Given** a webhook is received (Story 2.3)
**When** verification succeeds
**Then** `webhook_verified` event is logged with raw payload (FR29)

**Given** a payment completes successfully
**When** webhook processes `payment.paid`
**Then** `payment_completed` event is logged with PayMongo transaction ID (FR28)

**Given** a payment fails
**When** webhook processes `payment.failed`
**Then** `payment_failed` event is logged with error details (FR28)

**FRs:** FR27, FR28, FR29
**NFRs:** NFR13 (log all events)

---

### Story 4.2: Build Branch Admin Payment History View

As a **branch admin**,
I want **to view my branch's payment transaction history**,
So that **I can reconcile payments, handle disputes, and track daily revenue**.

**Acceptance Criteria:**

**Given** I am logged in as branch_admin
**When** I navigate to Payment History page (FR30)
**Then** I see a list of payment transactions for my branch only (FR25 isolation)

**Given** the transaction list is displayed
**When** I view each row
**Then** I see:
- Date/Time
- Customer name
- Booking reference
- Payment type (Pay Now / Pay Later / Cash Collection)
- Amount
- Payment method (GCash, Maya, Card, etc.)
- Status (Completed / Failed / Pending)
- PayMongo Reference ID

**Given** I want to filter transactions
**When** I use filter controls
**Then** I can filter by:
- Date range (default: today)
- Payment status (All / Completed / Failed)
- Payment type (All / Pay Now / Pay Later / Cash)

**Given** I want to search for a specific transaction
**When** I enter a booking reference or customer name
**Then** matching transactions are displayed

**Given** I click on a transaction row
**When** the detail modal opens
**Then** I see full audit trail for that booking:
- All events (link_created → payment_completed)
- Timestamps for each event
- PayMongo IDs for reference

**FRs:** FR30
**NFRs:** NFR10 (branch isolation)

---

### Story 4.3: Build Super Admin Payment History View

As a **super admin**,
I want **to view payment transaction history across all branches**,
So that **I can monitor platform-wide revenue and audit any branch**.

**Acceptance Criteria:**

**Given** I am logged in as super_admin
**When** I navigate to Payment History page (FR31)
**Then** I see a list of payment transactions across ALL branches

**Given** the transaction list is displayed
**When** I view each row
**Then** I see all fields from Story 4.2 PLUS:
- Branch name column

**Given** I want to filter by branch
**When** I use the branch dropdown filter
**Then** transactions are filtered to selected branch

**Given** I want to see platform-wide statistics
**When** I view the summary header
**Then** I see:
- Total transactions (today / this week / this month)
- Total revenue by payment type
- Success rate (%)
- Revenue by branch (top 5)

**Given** I want to export data
**When** I click "Export CSV"
**Then** filtered transactions are downloaded as CSV file

**Given** I want to audit a specific booking
**When** I search by booking reference
**Then** I see full audit trail across any branch

**FRs:** FR31
