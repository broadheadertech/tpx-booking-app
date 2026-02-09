---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - _bmad-output/analysis/brainstorming-session-2026-01-27.md
  - _bmad-output/planning-artifacts/project-context.md
  - src/pages/customer/GuestServiceBooking.jsx
  - src/pages/customer/Booking.jsx
  - src/components/customer/ServiceBooking.jsx
  - src/pages/staff/POS.jsx
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 5
classification:
  projectType: saas_b2b_webapp
  domain: smb_retail_service
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - PayMongo Payment Integration

**Author:** MASTERPAINTER
**Date:** 2026-01-27

## Executive Summary

TPX Booking integrates PayMongo to enable automated online payments for barbershop appointments across multiple branches. This integration addresses two critical problems: **no-shows** that waste barber time, and **manual payment friction** that limits online booking adoption.

**Key Differentiators:**
- **Automated End-to-End**: Unlike competitors using manual bank transfers, TPX offers instant payment confirmation with no human intervention
- **Commitment-Based No-Show Prevention**: Convenience fee (₱50-100) acts as psychological commitment, not just revenue
- **Branch Autonomy**: Each branch controls their own PayMongo account, fees, and payment policies
- **Multi-Tenant Isolation**: Full data separation between branches with shared infrastructure efficiency

**MVP Scope:** Pay Now (full payment) and Pay Later (convenience fee upfront) flows for pilot branch deployment, with POS integration for balance collection.

## Success Criteria

### User Success

- **Seamless Payment Flow**: Payment completes within 30 seconds from initiation to confirmation
- **Instant Confirmation**: Customer receives immediate visual confirmation that their appointment slot is secured
- **Clear Payment Options**: Pay Now vs Pay Later choice is presented clearly with transparent fee information
- **Trust Signal**: Payment processed through recognized PayMongo gateway with familiar payment methods (GCash, Maya, Cards, GrabPay)

### Business Success

- **No-Show Reduction**: Measurable decrease in no-shows after implementing convenience fee commitment
- **Convenience Fee Revenue**: Additional revenue stream from Pay Later option (₱50-100 per booking, branch-configurable)
- **Branch Autonomy**: Each branch controls their own PayMongo account and payment policies
- **Payment Tracking**: Clear visibility into online payment transactions per branch

### Technical Success

- **Webhook Reliability**: 99.9% successful webhook processing for payment status updates
- **Branch Self-Service**: Branch admins can independently:
  - Configure their PayMongo API keys
  - Set convenience fee amount (₱50-100 range)
  - Enable/disable Pay Later option
  - Configure reschedule penalty fees
- **Real-time Sync**: Payment status reflects immediately in booking records

### Measurable Outcomes

| Metric | Target |
|--------|--------|
| Payment completion rate | >95% of initiated payments |
| Webhook success rate | 99.9% |
| No-show rate | Reduction from baseline (to be measured) |
| Branch onboarding time | <10 minutes to configure payments |

## Product Scope

This section provides a high-level overview. See [Project Scoping & Phased Development](#project-scoping--phased-development) for detailed feature breakdown and rollout strategy.

| Phase | Focus | Key Capabilities |
|-------|-------|------------------|
| **Phase 1 (MVP)** | Core Payment | Pay Now, Pay Later, Branch Config, POS Collection |
| **Phase 2 (Growth)** | Enhanced Features | Reschedule with fee, Analytics, Payment History |
| **Phase 3 (Expansion)** | Platform Scale | Multi-branch Reports, Refund Workflows, Loyalty Integration |

**Integration Points:** GuestServiceBooking, ServiceBooking (authenticated), POS (remaining balance collection)

## User Journeys

### Journey 1: Maria - The Busy Professional (Guest, Pay Now)

**Persona:** Maria, 28, marketing manager in Makati. Values efficiency and reliability. Comfortable with digital payments.

**Situation:** It's 10 PM and Maria realizes her hair needs attention before tomorrow's important client meeting. Salons are closed and she can't call to reserve.

**Opening Scene:** Maria searches online and discovers TPX Booking. She's skeptical about booking online with an unknown shop but needs a solution fast.

**Rising Action:**
1. She selects the Makati branch (closest to her office)
2. Browses barbers and picks James based on his profile and ratings
3. Selects "Executive Haircut" at ₱350
4. Finds a 9:00 AM slot - perfect timing before her 11 AM meeting
5. Enters her name, email, and phone number

**Climax:** At the payment confirmation screen, Maria sees two options:
- **Pay Now** - ₱350 via GCash (full amount)
- **Pay Later** - ₱75 convenience fee now, ₱350 at branch

She chooses Pay Now. GCash opens, she confirms, and within seconds sees: *"Your 9:00 AM slot is secured. Show this QR code at the branch."*

**Resolution:** Maria arrives at 8:55 AM, shows her QR code to the receptionist, and is served immediately without waiting. She makes her meeting looking professional. She bookmarks TPX Booking for future appointments.

**Requirements Revealed:**
- GCash/Maya payment integration
- Real-time booking confirmation
- QR code generation for check-in
- Email confirmation with booking details

---

### Journey 2: Carlo - The Budget-Conscious Student (Guest, Pay Later)

**Persona:** Carlo, 21, college student in Quezon City. Limited budget, careful with spending. Has Maya wallet but low balance until allowance day.

**Situation:** Carlo needs a haircut for his graduation photo shoot next Saturday. He wants to book early before slots fill up, but his Maya wallet won't have funds until Friday.

**Opening Scene:** Carlo browses TPX Booking looking for affordable options. He finds the Basic Haircut at ₱150 at the QC branch.

**Rising Action:**
1. Selects QC branch and a barber with available Saturday slots
2. Books the ₱150 Basic Haircut for Saturday 2:00 PM
3. Enters his contact information

**Climax:** At payment, Carlo sees:
- **Pay Now** - ₱150 via Maya
- **Pay Later** - ₱75 convenience fee now, pay ₱150 at branch

He hesitates - ₱75 extra feels steep. But he realizes: graduation week means high demand, and ₱75 secures his slot without needing the full amount now. He pays the ₱75 convenience fee via Maya.

Confirmation shows: *"Appointment secured! Pay ₱150 at the branch after your service."*

**Resolution:** Saturday arrives. Carlo shows his QR code at the branch. The receptionist sees "₱75 paid, ₱150 remaining." After his haircut, he pays ₱150 cash. His booking is marked complete. He looks great for his graduation photo.

**Requirements Revealed:**
- Pay Later option with convenience fee
- Clear display of what's paid vs. remaining balance
- Cash payment acceptance at POS
- Booking status tracking (partial paid → fully paid)

---

### Journey 3: Jasmine - Branch Staff Collecting Payment (POS)

**Persona:** Jasmine, 24, receptionist at TPX Makati branch. Handles walk-ins and online bookings daily.

**Situation:** A customer arrives and shows a QR code on their phone. Jasmine needs to check them in and collect any remaining payment.

**Opening Scene:** Jasmine is at the POS terminal. Carlo walks in and says "I have a booking" while showing his phone screen.

**Rising Action:**
1. Jasmine scans the QR code using the POS scanner
2. The system displays: "Carlo - Basic Haircut - Convenience Fee ₱75 PAID, Service ₱150 PENDING"
3. She confirms the appointment and directs Carlo to the waiting area

**Climax:** After Carlo's haircut is complete, he returns to the counter. Jasmine pulls up his booking and clicks "Collect Payment." Carlo pays ₱150 in cash. She marks the payment as received.

**Resolution:** The booking status updates to "Completed - Fully Paid." Carlo receives a text confirmation. Jasmine moves on to the next customer. The transaction is logged for branch accounting.

**Requirements Revealed:**
- QR code scanning at POS
- Clear display of paid vs. pending amounts
- Cash payment recording
- Booking completion workflow
- Transaction logging for accounting

---

### Journey 4: Dennis - Branch Admin Setting Up PayMongo

**Persona:** Dennis, 35, manager of a newly opened TPX branch. Responsible for branch operations and finances.

**Situation:** Super Admin tells Dennis he needs to set up his own PayMongo account so his branch can accept online payments. He's never configured payment systems before.

**Opening Scene:** Dennis logs into the TPX admin panel and navigates to Branch Settings. He sees a "Payment Configuration" section that's currently empty.

**Rising Action:**
1. He creates a PayMongo account at paymongo.com and completes their verification
2. Back in TPX, he enters his PayMongo Public Key and Secret Key
3. He sets the convenience fee to ₱100 (his branch's preference)
4. He enables the "Pay Later" option
5. He sets a reschedule penalty of ₱50

**Climax:** Dennis clicks "Save Configuration." The system validates his API keys and shows "Payment Configuration Active." He asks a friend to make a test booking with Pay Now.

**Resolution:** The test payment goes through. Dennis checks his PayMongo dashboard and sees the transaction. His branch is now ready to accept online payments. He didn't need IT support - the self-service setup worked.

**Requirements Revealed:**
- Branch-level PayMongo API key configuration
- Convenience fee amount setting (branch-specific)
- Pay Later toggle (enable/disable)
- Reschedule penalty configuration
- API key validation on save
- Self-service setup (no IT intervention)

---

### Journey 5: Sofia - Authenticated Customer Rebooking (Edge Case)

**Persona:** Sofia, 30, loyal TPX customer with an account. Has a booking history and saved preferences.

**Situation:** Sofia booked and paid in full (Pay Now) for Saturday 10 AM. But her work schedule changed - she needs to move it to Sunday.

**Opening Scene:** Sofia opens the TPX app and goes to "My Bookings." She sees her Saturday appointment marked "Paid - ₱450."

**Rising Action:**
1. She taps "Reschedule" on her booking
2. The system shows: "This branch allows rebooking. Your payment will transfer to the new date. A ₱50 rebooking fee applies."
3. She selects Sunday 11 AM
4. The system prompts her to pay the ₱50 rebooking fee via GCash

**Climax:** Sofia pays the ₱50 fee. Her booking updates: "Sunday 11 AM - Paid ₱450 + ₱50 rebooking fee."

**Resolution:** Sofia attends on Sunday, shows her QR code, and is served. No additional payment needed at the branch. She's relieved she could change without losing her money.

**Requirements Revealed:**
- Reschedule functionality for paid bookings
- Payment transfer to new booking date
- Branch-configurable rebooking fee
- Clear communication of reschedule policy
- Booking history for authenticated users

---

### Journey Requirements Summary

| Capability | Revealed By Journey |
|------------|---------------------|
| PayMongo payment integration (GCash, Maya, Cards) | Maria, Carlo |
| Pay Now (full amount) flow | Maria |
| Pay Later (convenience fee) flow | Carlo |
| QR code generation & scanning | Maria, Carlo, Jasmine |
| Branch-level PayMongo configuration | Dennis |
| Convenience fee setting (per branch) | Dennis, Carlo |
| POS remaining balance collection | Jasmine |
| Payment status tracking (partial/full) | Jasmine, Carlo |
| Reschedule with fee | Sofia |
| Self-service branch setup | Dennis |
| Webhook payment status sync | All journeys |

## Domain-Specific Requirements

### Compliance & Regulatory

- **PCI-DSS Compliance**: PayMongo handles all card data - we never store or process card numbers
- **BSP Licensing**: PayMongo is the licensed payment processor; TPX operates as merchant
- **Data Privacy Act (Philippines)**: Customer payment data handled per DPA requirements

### Technical Constraints

#### API Key Security
- Branch PayMongo API keys (public + secret) must be **encrypted at rest** in Convex
- Secret keys never exposed to frontend - all API calls via Convex actions
- Keys decrypted only at runtime for PayMongo API calls

#### Webhook Security
- Implement **PayMongo webhook signature verification** on all incoming webhooks
- Verify `Paymongo-Signature` header using branch's webhook secret
- Reject webhooks that fail signature validation
- Log all webhook attempts (valid and invalid) for security monitoring

#### Audit Logging
- Full audit trail for all payment events:
  - Payment initiated (amount, method, booking ID, timestamp)
  - Payment completed/failed (PayMongo transaction ID, status)
  - Webhook received (event type, payload hash, verification result)
  - Refund/reschedule fee transactions
- Audit logs immutable and timestamped
- Retained for accounting and dispute resolution

### Integration Requirements

- **PayMongo API v1**: Payment Links, Sources, Webhooks
- **Supported Payment Methods**: GCash, Maya, Cards (Visa/MC), GrabPay, Bank Transfer
- **Webhook Events**: `payment.paid`, `payment.failed`, `source.chargeable`

### Risk Mitigations

| Risk | Mitigation |
|------|------------|
| API key exposure | Encrypted storage, server-side only |
| Webhook spoofing | Signature verification required |
| Payment disputes | Full audit trail with timestamps |
| Branch misconfiguration | API key validation on save |
| Double-charge | Idempotency keys on payment creation |

## Innovation & Novel Patterns

### Detected Innovation Areas

#### 1. Market Innovation: Automated Payment Integration
- **Current State**: Philippine barbershops with online payments use **manual processes** (chat, manual bank transfer verification)
- **TPX Innovation**: Fully automated end-to-end payment flow with real-time confirmation
- **Differentiation**: No human intervention needed between customer payment and booking confirmation

#### 2. Behavioral Design: Commitment-Based No-Show Prevention
- **Problem**: No-shows waste barber time and block slots for paying customers
- **Innovation**: Convenience fee as a **psychological commitment mechanism**
  - Not just a fee - it's a behavioral nudge that makes customers "invested" in showing up
  - Asymmetric design: Pay Now customers can reschedule freely; Pay Later customers forfeit the fee
- **Expected Outcome**: Measurable reduction in no-show rates

#### 3. Operational Innovation: Service Provider Time Protection
- **Traditional Model**: Barbershop absorbs 100% of no-show cost (barber's wasted time)
- **TPX Model**: Financial commitment from customer protects barber's time value
- **Branch Autonomy**: Each branch sets their own fee based on local no-show rates and market conditions

### Market Context & Competitive Landscape

| Feature | Traditional PH Barbershops | TPX with PayMongo |
|---------|---------------------------|-------------------|
| Online Booking | Some offer | Yes |
| Online Payment | Manual (bank transfer) | Automated (GCash/Maya/Cards) |
| No-Show Protection | None | Convenience fee commitment |
| Real-time Confirmation | No | Yes |
| Time Slot Guarantee | No | Yes (15-min window) |

### Validation Approach

1. **A/B Testing**: Compare no-show rates between Pay Now vs Pay Later vs legacy (no payment)
2. **Customer Feedback**: Survey convenience fee acceptance and perceived value
3. **Branch Metrics**: Track no-show rate changes per branch after implementation

### Risk Mitigation

| Innovation Risk | Mitigation |
|-----------------|------------|
| Customers reject convenience fee | Make it branch-configurable; branches can start low |
| Manual payment competitors undercut on fees | Emphasize time guarantee and instant confirmation value |
| Behavioral nudge doesn't reduce no-shows | Track metrics; adjust fee or messaging based on data |

## SaaS B2B Specific Requirements

### Project-Type Overview

TPX Booking is a **multi-tenant SaaS platform** serving barbershop/salon businesses across multiple branches. The PayMongo integration extends the platform's B2B capabilities by enabling per-branch payment processing with full tenant isolation.

### Multi-Tenant Payment Architecture

#### Tenant Model
- **Tenant Boundary**: Branch level (each branch = independent payment tenant)
- **Data Isolation**: Branch A cannot see Branch B's payment transactions
- **Configuration Isolation**: Each branch has its own PayMongo API keys, fee settings, and policies
- **Shared Infrastructure**: Single Convex backend, webhooks route to correct branch by payment metadata

#### Branch Payment Configuration Schema
```
branch_payment_config {
  branch_id: reference
  paymongo_public_key: encrypted_string
  paymongo_secret_key: encrypted_string
  webhook_secret: encrypted_string
  convenience_fee_amount: number (50-100)
  pay_later_enabled: boolean
  reschedule_fee_amount: number
  is_active: boolean
}
```

### RBAC Permission Matrix

| Action | customer | barber | staff | branch_admin | super_admin |
|--------|:--------:|:------:|:-----:|:------------:|:-----------:|
| Pay for booking | ✅ | - | - | - | - |
| View own payment history | ✅ | - | - | - | - |
| Collect payment at POS | - | - | ✅ | ✅ | - |
| Configure PayMongo keys | - | - | - | ✅ | ✅ |
| View branch transactions | - | - | ✅ | ✅ | - |
| View all branches' transactions | - | - | - | - | ✅ |
| Set convenience fee | - | - | - | ✅ | ✅ |
| Process refunds | - | - | - | ✅ | ✅ |
| Enable/disable Pay Later | - | - | - | ✅ | ✅ |

### Integration Architecture

#### PayMongo Integration Points

| Component | Integration Type | Description |
|-----------|-----------------|-------------|
| GuestServiceBooking | Frontend → Convex Action | Initiates payment via `createPaymentRequest` |
| ServiceBooking | Frontend → Convex Action | Same flow for authenticated users |
| POS | Frontend → Convex Mutation | Records remaining balance collection |
| Webhook Handler | HTTP Endpoint → Convex | Receives payment status updates |
| Branch Settings | Frontend → Convex Mutation | Saves encrypted API keys |

#### Data Flow
```
Customer Payment:
1. Customer selects Pay Now/Pay Later
2. Frontend calls Convex action with branch_id
3. Convex decrypts branch's PayMongo keys
4. Convex creates PayMongo payment link
5. Customer redirected to PayMongo
6. PayMongo sends webhook on completion
7. Webhook handler updates booking status
8. Customer sees confirmation
```

### Implementation Considerations

#### Existing Infrastructure Leverage
- **Booking System**: Already has `createPaymentRequest` action stub
- **Branch Config**: Extend existing branch settings schema
- **POS**: Already handles booking attachment, add payment collection

#### New Components Required
- `branch_payment_config` table in Convex schema
- Webhook HTTP endpoint for PayMongo callbacks
- Payment transaction audit log table
- Branch admin payment settings UI

#### Migration Strategy
- Non-breaking: Branches without config continue as-is (no online payment)
- Opt-in: Branch admins enable when ready
- No data migration needed - new tables only

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Focus on solving the core problem: no-shows and manual payment friction
- Validate that automated payments + convenience fee reduces no-shows
- Single pilot branch to de-risk before wider rollout

**Rollout Strategy:** Pilot Branch First
- Deploy to one branch for validation
- Gather real usage data and feedback
- Fix issues before multi-branch rollout

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

| Journey | Supported in MVP |
|---------|-----------------|
| Maria - Pay Now (Guest) | ✅ |
| Carlo - Pay Later (Guest) | ✅ |
| Jasmine - POS Collection | ✅ |
| Dennis - Branch Setup | ✅ |
| Sofia - Reschedule | ❌ Phase 2 |

**Must-Have Capabilities:**

1. **Customer Payment Flow**
   - Pay Now: Full payment at booking via PayMongo
   - Pay Later: Convenience fee payment, balance at branch
   - All PayMongo methods: GCash, Maya, Cards, GrabPay

2. **Branch Configuration**
   - PayMongo API key setup (encrypted storage)
   - Convenience fee amount setting (₱50-100)
   - Pay Later enable/disable toggle

3. **POS Integration**
   - View booking payment status
   - Collect remaining balance for Pay Later bookings
   - Mark booking as fully paid

4. **Backend Infrastructure**
   - Webhook endpoint for payment status updates
   - Payment transaction logging
   - Branch-level data isolation

### Post-MVP Features

**Phase 2 (Growth):**
- Reschedule with rebooking fee (Sofia journey)
- Payment analytics dashboard per branch
- Customer payment history view
- Multi-branch rollout

**Phase 3 (Expansion):**
- Automated refund workflows
- Super Admin consolidated payment reporting
- Bulk payment reconciliation
- Loyalty points integration

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Mitigation |
|------|------------|
| PayMongo API issues | Test thoroughly with sandbox; have manual fallback process |
| Webhook failures | Implement retry logic; audit log for debugging |
| Encryption complexity | Use Convex's built-in security; keep keys server-side only |

**Market Risks:**

| Risk | Mitigation |
|------|------------|
| Customers reject convenience fee | Start with low fee (₱50); make it branch-configurable |
| Low adoption of online payment | Keep Pay Later option; don't force Pay Now |

**Resource Risks:**

| Risk | Mitigation |
|------|------------|
| Limited dev capacity | Pilot branch reduces scope; validate before scaling |
| Support burden | Self-service branch setup; clear error messages |

## Functional Requirements

### Customer Payment

- **FR1**: Guest customer can choose between Pay Now (full amount) or Pay Later (convenience fee) at booking confirmation
- **FR2**: Authenticated customer can choose between Pay Now or Pay Later at booking confirmation
- **FR3**: Customer can complete payment using GCash, Maya, Credit/Debit Card, GrabPay, or Bank Transfer
- **FR4**: Customer can see a clear breakdown of service cost, convenience fee (if Pay Later), and total amount before payment
- **FR5**: Customer receives instant visual confirmation when payment succeeds
- **FR6**: Customer receives a QR code for branch check-in after successful booking with payment
- **FR7**: Customer can see their booking payment status (paid, partially paid, pending)

### Branch Configuration

- **FR8**: Branch admin can enter and save PayMongo API keys (public and secret) for their branch
- **FR9**: Branch admin can set the convenience fee amount (₱50-100) for Pay Later option
- **FR10**: Branch admin can enable or disable the Pay Later option for their branch
- **FR11**: Branch admin can view a confirmation that payment configuration is active and working
- **FR12**: System validates PayMongo API keys when branch admin saves configuration

### POS Operations

- **FR13**: Staff can view a customer's booking payment status when scanning their QR code
- **FR14**: Staff can see the amount already paid and remaining balance for a booking
- **FR15**: Staff can record cash payment collection for remaining balance
- **FR16**: Staff can mark a booking as fully paid after collecting remaining balance
- **FR17**: Staff can view list of today's bookings with their payment statuses

### Payment Processing

- **FR18**: System can create PayMongo payment links using branch-specific API keys
- **FR19**: System can receive and process PayMongo webhook notifications for payment events
- **FR20**: System can update booking payment status based on webhook notifications
- **FR21**: System can route payment operations to correct branch based on booking data
- **FR22**: System can handle payment failures and display appropriate error messages to customer

### Security & Compliance

- **FR23**: System stores branch PayMongo API keys in encrypted form
- **FR24**: System verifies PayMongo webhook signatures before processing payment updates
- **FR25**: System ensures branch A cannot access branch B's payment configuration or transactions
- **FR26**: System restricts payment configuration access to branch_admin and super_admin roles only

### Audit & Tracking

- **FR27**: System logs all payment initiation events with booking ID, amount, method, and timestamp
- **FR28**: System logs all payment completion/failure events with PayMongo transaction ID
- **FR29**: System logs all webhook events with verification status
- **FR30**: Branch admin can view payment transaction history for their branch
- **FR31**: Super admin can view payment transaction history across all branches

## Non-Functional Requirements

### Performance

- **NFR1**: Payment initiation (from "Pay" click to PayMongo redirect) completes within **3 seconds**
- **NFR2**: Webhook processing updates booking status within **5 seconds** of receipt
- **NFR3**: POS booking lookup (QR scan to display) completes within **2 seconds**
- **NFR4**: Branch payment configuration save completes within **3 seconds**

### Security

- **NFR5**: PayMongo API keys are encrypted at rest using AES-256 or equivalent
- **NFR6**: Secret keys are never transmitted to or accessible from frontend code
- **NFR7**: Webhook endpoints verify PayMongo signature before processing any payment update
- **NFR8**: All payment-related API calls use HTTPS/TLS 1.2+
- **NFR9**: Failed authentication attempts are logged and rate-limited
- **NFR10**: Branch payment data is isolated; queries enforce branch_id filtering

### Reliability

- **NFR11**: Webhook endpoint achieves **99.9% availability**
- **NFR12**: Failed webhook deliveries are retried with exponential backoff
- **NFR13**: System logs all payment events for audit and debugging
- **NFR14**: Payment status updates are idempotent (duplicate webhooks don't cause issues)

### Integration

- **NFR15**: System supports PayMongo API v1 for payment link creation
- **NFR16**: System handles PayMongo webhook events: `payment.paid`, `payment.failed`, `source.chargeable`
- **NFR17**: System gracefully handles PayMongo API downtime with user-friendly error messages
- **NFR18**: API key validation provides clear feedback on configuration errors

