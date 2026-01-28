---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-01-27'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-paymongo.md
  - _bmad-output/planning-artifacts/project-context.md
  - docs/CONVEX_DATABASE_SCHEMA.md
workflowType: 'architecture'
project_name: 'tpx-booking-app'
feature_name: 'PayMongo Payment Integration'
user_name: 'MASTERPAINTER'
date: '2026-01-27'
---

# Architecture Decision Document - PayMongo Payment Integration

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
31 FRs across 6 capability areas for PayMongo payment integration:

| Capability Area | FRs | Core Architectural Need |
|-----------------|-----|------------------------|
| Customer Payment | FR1-7 | Payment flow in existing booking components |
| Branch Configuration | FR8-12 | New config table with encrypted fields |
| POS Operations | FR13-17 | Extend existing POS with payment collection |
| Payment Processing | FR18-22 | PayMongo service + webhook handler |
| Security & Compliance | FR23-26 | Encryption, signature verification, RBAC |
| Audit & Tracking | FR27-31 | New audit log table + queries |

**Non-Functional Requirements:**
18 NFRs shaping architectural decisions:

| Category | Key Requirements |
|----------|------------------|
| Performance | Payment init <3s, Webhook processing <5s, POS lookup <2s |
| Security | AES-256 encryption, server-side only keys, signature verification |
| Reliability | 99.9% webhook availability, idempotent updates, retry logic |
| Integration | PayMongo API v1, specific webhook events |

**Scale & Complexity:**

- Primary domain: Full-stack brownfield integration (React + Convex)
- Complexity level: Medium
- New components: 2 tables, 1 service, 1 HTTP endpoint, 3 UI updates

### Technical Constraints & Dependencies

**Brownfield Constraints:**
- Must integrate with existing booking flow (GuestServiceBooking, ServiceBooking)
- Must use existing branch isolation pattern (branch_id filtering)
- Must follow established Convex patterns (queries, mutations, actions)
- UI must follow existing patterns (dark theme, shadcn/ui)

**Infrastructure Dependencies:**
- Convex actions for PayMongo API calls (external HTTP)
- Convex HTTP endpoints for webhook handler
- Existing bookings table (extend payment_status)
- Existing branch settings pattern

**Technical Stack (Locked):**
- Frontend: React 19 + Vite 7 + TailwindCSS 4
- Backend: Convex 1.26.1
- External: PayMongo API v1

### Cross-Cutting Concerns Identified

| Concern | Affected Components | Implementation Approach |
|---------|---------------------|------------------------|
| Branch Isolation | Payment config, audit log, transactions | branch_id filtering on all queries |
| API Key Security | Config storage, PayMongo calls | Server-side encryption, actions only |
| Audit Trail | All payment events | Immutable paymentAuditLog table |
| Real-time Updates | Booking payment status | Convex subscriptions (automatic) |
| Webhook Security | HTTP endpoint | Signature verification before processing |
| Error Handling | Payment failures, API errors | ConvexError with codes, user messages |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack hybrid (React + Convex + Capacitor) - **Established brownfield project**

### Existing Foundation (Not Evaluating New Starters)

This is a brownfield enhancement project. The technical foundation is already established and validated in production.

**Rationale:** New features (PayMongo Payment Integration) must integrate with the existing codebase rather than establish new patterns.

### Architectural Decisions Already Established

**Language & Runtime:**
- TypeScript 5.8.3 with strict typing
- Convex validators (`v.` from `convex/values`)
- Currency as whole pesos (v.number), timestamps as milliseconds

**Styling Solution:**
- TailwindCSS 4.1.11 with `@theme` directive
- Dark theme (#0A0A0A) with orange accent (#FF8C42)
- shadcn/ui components (do not create custom replacements)

**Build Tooling:**
- Vite 7.0.6 for development and production builds
- Convex dev server for backend

**Code Organization:**
- Services: `convex/services/[feature].ts`
- Components: `src/components/[role]/[Component].jsx`
- Branch isolation via `branch_id` on all queries

**Development Experience:**
- Convex real-time subscriptions (automatic, no polling)
- Loading states: check `data === undefined`
- Skeleton loaders preferred over spinners

### PayMongo-Specific New Components

| Component | Pattern | Location |
|-----------|---------|----------|
| `branchPaymentConfig` table | New Convex table | `convex/schema.ts` |
| `paymentAuditLog` table | New Convex table | `convex/schema.ts` |
| PayMongo service | New service file | `convex/services/paymongo.ts` |
| Webhook HTTP handler | Convex HTTP action | `convex/http.ts` |
| Payment Settings UI | Branch admin component | `src/components/staff/PaymentSettings.jsx` |

**Note:** No project initialization needed - this extends existing codebase.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- `branchPaymentConfig` table schema with encrypted credential fields
- `paymentAuditLog` table schema for immutable audit trail
- API key encryption strategy (AES-256-GCM)
- Webhook signature verification approach
- PayMongo service architecture (Convex actions for external calls)

**Important Decisions (Shape Architecture):**
- Extend `bookings` table with payment fields
- Access control matrix for payment operations
- Idempotency strategy for webhooks
- Error handling codes for PayMongo operations

**Deferred Decisions (Post-MVP):**
- Multi-provider support (only PayMongo for MVP)
- Advanced refund workflows
- Payment analytics dashboard

### Data Architecture

#### `branchPaymentConfig` Table

```typescript
branchPaymentConfig: defineTable({
  branch_id: v.id("branches"),
  provider: v.literal("paymongo"),            // Future-proof for other providers
  is_enabled: v.boolean(),

  // Encrypted credentials (AES-256-GCM)
  public_key_encrypted: v.string(),           // pk_live_xxx (encrypted)
  secret_key_encrypted: v.string(),           // sk_live_xxx (encrypted)
  webhook_secret_encrypted: v.string(),       // whsec_xxx (encrypted)
  encryption_iv: v.string(),                  // IV for decryption

  // Payment policies
  pay_later_enabled: v.boolean(),             // Allow Pay Later option
  convenience_fee_percent: v.number(),        // Fee for Pay Later (e.g., 5 = 5%)

  // Timestamps
  created_at: v.number(),
  updated_at: v.number(),
  updated_by: v.id("users"),
})
  .index("by_branch", ["branch_id"])
```

**Rationale:** Single config per branch with encrypted PayMongo credentials. Encryption IV stored alongside for decryption. Pay Later policy configurable per branch.

#### `paymentAuditLog` Table

```typescript
paymentAuditLog: defineTable({
  branch_id: v.id("branches"),
  booking_id: v.optional(v.id("bookings")),   // null for non-booking payments
  transaction_id: v.optional(v.id("transactions")), // For POS payments

  // PayMongo reference
  paymongo_payment_id: v.optional(v.string()), // pay_xxx
  paymongo_link_id: v.optional(v.string()),    // link_xxx

  // Event details
  event_type: v.union(
    v.literal("link_created"),
    v.literal("payment_initiated"),
    v.literal("payment_completed"),
    v.literal("payment_failed"),
    v.literal("payment_refunded"),
    v.literal("webhook_received"),
    v.literal("webhook_verified"),
    v.literal("webhook_failed")
  ),

  amount: v.number(),                          // Whole pesos
  payment_method: v.optional(v.string()),      // "gcash", "card", etc.

  // Audit metadata
  raw_payload: v.optional(v.string()),         // JSON stringified webhook payload
  error_message: v.optional(v.string()),
  ip_address: v.optional(v.string()),

  created_at: v.number(),
})
  .index("by_branch", ["branch_id"])
  .index("by_booking", ["booking_id"])
  .index("by_paymongo_payment", ["paymongo_payment_id"])
  .index("by_created_at", ["created_at"])
```

**Rationale:** Immutable audit log for all payment events. Indexes support branch filtering, booking lookup, and PayMongo ID lookup for idempotency checks.

#### `bookings` Table Extensions

Add new payment status:
```typescript
payment_status: v.union(
  v.literal("unpaid"),
  v.literal("partial"),    // NEW: Convenience fee paid, full amount pending
  v.literal("paid"),
  v.literal("refunded")
)
```

Add new fields:
```typescript
paymongo_link_id: v.optional(v.string()),      // Reference to payment link
paymongo_payment_id: v.optional(v.string()),   // Reference to completed payment
convenience_fee_paid: v.optional(v.number()),  // Amount paid upfront (Pay Later)
```

**Rationale:** Extends existing bookings table to track PayMongo payment state without breaking existing functionality.

### Authentication & Security

#### API Key Encryption Strategy

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Algorithm | AES-256-GCM | Industry standard, authenticated encryption |
| Key Storage | `PAYMONGO_ENCRYPTION_KEY` env var | Convex-managed, server-only access |
| IV Generation | Random 16 bytes per encryption | Unique IV per credential |
| Key Rotation | Manual via admin UI | Branch admin re-enters keys |

#### Webhook Security

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Signature Algorithm | HMAC-SHA256 | PayMongo standard |
| Header | `Paymongo-Signature` | PayMongo webhook format |
| Validation | Before any DB operations | Reject invalid signatures immediately |
| Logging | Log all attempts (valid + invalid) | Security audit trail |

#### Access Control Matrix

| Operation | customer | barber | staff | branch_admin | super_admin |
|-----------|----------|--------|-------|--------------|-------------|
| View payment link | ✅ (own) | ❌ | ❌ | ✅ (branch) | ✅ (all) |
| Pay via link | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| Configure PayMongo | ❌ | ❌ | ❌ | ✅ (branch) | ✅ (all) |
| View audit logs | ❌ | ❌ | ✅ (branch) | ✅ (branch) | ✅ (all) |
| Collect POS payment | ❌ | ❌ | ✅ | ✅ | ❌ |
| Process refund | ❌ | ❌ | ❌ | ✅ | ✅ |

### API & Communication Patterns

#### PayMongo Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐      │
│  │ Booking     │  │ POS Payment │  │ Payment Settings    │      │
│  │ Flow        │  │ Flow        │  │ (Branch Admin)      │      │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘      │
└─────────┼────────────────┼────────────────────┼─────────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Convex Backend                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ convex/services/paymongo.ts                                 ││
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ ││
│  │ │ Queries     │ │ Mutations   │ │ Actions (HTTP calls)    │ ││
│  │ │ - getConfig │ │ - saveConfig│ │ - createPaymentLink     │ ││
│  │ │ - getStatus │ │ - updateStat│ │ - verifyPayment         │ ││
│  │ │ - getAudit  │ │ - logEvent  │ │ - processRefund         │ ││
│  │ └─────────────┘ └─────────────┘ └─────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ convex/http.ts - Webhook Handler                            ││
│  │ POST /webhooks/paymongo → verify signature → process event  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
          │                                    ▲
          ▼                                    │
┌─────────────────────────────────────────────────────────────────┐
│  PayMongo API v1                                                 │
│  - POST /links (create payment link)                            │
│  - GET /payments/{id} (verify payment)                          │
│  - POST /refunds (process refund)                               │
│  - Webhook events → payment.paid, payment.failed                │
└─────────────────────────────────────────────────────────────────┘
```

#### Idempotency Strategy

| Scenario | Approach |
|----------|----------|
| Payment link creation | Check if booking already has `paymongo_link_id` before creating |
| Webhook processing | Check `paymongo_payment_id` in audit log before processing |
| Status updates | Use `ctx.db.patch()` with conditional check |

#### Error Handling Codes

```typescript
// PayMongo-specific error codes
"PAYMONGO_NOT_CONFIGURED"     // Payment gateway not configured for branch
"PAYMONGO_API_ERROR"          // Payment service temporarily unavailable
"PAYMONGO_INVALID_SIGNATURE"  // Webhook signature verification failed
"PAYMENT_ALREADY_PROCESSED"   // Duplicate webhook/payment attempt
"PAYMENT_LINK_EXPIRED"        // Payment link has expired
"REFUND_NOT_ALLOWED"          // Business rule prevents refund
```

### Frontend Architecture

#### Payment Flow Integration Points

| Existing Component | PayMongo Addition |
|--------------------|-------------------|
| `GuestServiceBooking.jsx` | Add payment option after booking confirmation |
| `ServiceBooking.jsx` | Add payment option after booking confirmation |
| `POSCheckout.jsx` | Add PayMongo payment method option |

#### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PaymentSettings.jsx` | `src/components/staff/` | Branch admin PayMongo configuration |
| `PaymentStatusBadge.jsx` | `src/components/common/` | Reusable payment status display |
| `PaymentOptionsModal.jsx` | `src/components/common/` | Pay Now vs Pay Later selection |

#### State Management

| Data | Query | Real-time |
|------|-------|-----------|
| Payment config | `api.services.paymongo.getConfig` | ✅ Convex subscription |
| Payment status | `api.services.paymongo.getPaymentStatus` | ✅ Auto-updates on webhook |
| Audit logs | `api.services.paymongo.getAuditLog` | ✅ |

### Infrastructure & Deployment

#### Webhook Endpoint

| Aspect | Decision |
|--------|----------|
| URL Pattern | `https://{convex-deployment}/webhooks/paymongo` |
| Registration | Manual in PayMongo dashboard per branch |
| Events | `payment.paid`, `payment.failed`, `payment.refunded` |

#### Environment Variables

| Variable | Purpose | Location |
|----------|---------|----------|
| `PAYMONGO_ENCRYPTION_KEY` | Encrypt/decrypt API keys | Convex dashboard |

#### Monitoring

| Metric | Implementation |
|--------|----------------|
| Payment success rate | Query `paymentAuditLog` event_type counts |
| Webhook latency | Timestamp difference in audit log |
| Error tracking | ConvexError codes + audit log |

### Decision Impact Analysis

**Implementation Sequence:**
1. Schema changes (tables + indexes)
2. PayMongo service (actions for API calls)
3. HTTP webhook handler
4. Payment Settings UI (branch admin)
5. Booking flow integration
6. POS flow integration

**Cross-Component Dependencies:**
```
Schema (1) → Service (2) → Webhook (3) → Settings UI (4) → Booking UI (5) → POS UI (6)
                │                              │
                └──────────────────────────────┘
                (Service used by both UI flows)
```

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 7 areas where AI agents could make different choices without explicit patterns.

**Already Established (from project-context.md):**

| Category | Pattern | Example |
|----------|---------|---------|
| Tables | camelCase | `branchPaymentConfig`, `paymentAuditLog` |
| Fields | snake_case | `branch_id`, `created_at`, `is_enabled` |
| Indexes | by_fieldname | `by_branch`, `by_booking`, `by_paymongo_payment` |
| Queries | get* prefix | `getPaymentConfig`, `getAuditLog` |
| Mutations | verb + noun | `saveConfig`, `createPaymentLink` |
| Actions | verb + noun | `createPaymentLink`, `verifyPayment` |
| Components | PascalCase.jsx | `PaymentSettings.jsx` |
| Hooks | useCamelCase | `usePaymentConfig` |

### PayMongo-Specific Naming Patterns

#### External ID Field Naming

**Pattern:** Prefix PayMongo external IDs with `paymongo_`

| Field | Pattern | Example Value |
|-------|---------|---------------|
| Payment Link ID | `paymongo_link_id` | `"link_xxx"` |
| Payment ID | `paymongo_payment_id` | `"pay_xxx"` |
| Refund ID | `paymongo_refund_id` | `"ref_xxx"` |

**Rationale:** Distinguishes external PayMongo IDs from internal Convex IDs.

### Encryption/Decryption Patterns

**Pattern:** All encryption operations use helper functions with consistent naming.

```typescript
// convex/lib/encryption.ts
export function encryptApiKey(plaintext: string, encryptionKey: string): { encrypted: string; iv: string }
export function decryptApiKey(encrypted: string, iv: string, encryptionKey: string): string
```

**Usage Pattern:**
```typescript
// Encrypt on save
const { encrypted, iv } = encryptApiKey(args.secret_key, process.env.PAYMONGO_ENCRYPTION_KEY!);

// Decrypt on use (actions only)
const secretKey = decryptApiKey(config.secret_key_encrypted, config.encryption_iv, process.env.PAYMONGO_ENCRYPTION_KEY!);
```

**Enforcement:**
- Encryption helpers in `convex/lib/encryption.ts`
- Never store plaintext API keys
- Decryption ONLY in actions (server-side)

### Audit Log Event Patterns

**Pattern:** Event types follow `resource_action` format (snake_case).

| Event Type | When Used |
|------------|-----------|
| `link_created` | PayMongo payment link created |
| `payment_initiated` | Customer started payment |
| `payment_completed` | Payment succeeded |
| `payment_failed` | Payment failed |
| `payment_refunded` | Refund processed |
| `webhook_received` | Raw webhook received |
| `webhook_verified` | Signature verified |
| `webhook_failed` | Signature verification failed |

**Audit Log Entry Pattern:**
```typescript
await ctx.db.insert("paymentAuditLog", {
  branch_id: args.branch_id,
  booking_id: args.booking_id,
  paymongo_payment_id: paymentId,
  event_type: "payment_completed",
  amount: amountInPesos,
  payment_method: "gcash",
  raw_payload: JSON.stringify(webhookPayload),
  created_at: Date.now(),
});
```

### Webhook Handler Pattern

**Pattern:** Webhook handlers follow verify-then-process flow.

```typescript
// convex/http.ts
http.route({
  path: "/webhooks/paymongo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Extract signature
    const signature = request.headers.get("Paymongo-Signature");

    // 2. Log receipt (before verification)
    await ctx.runMutation(api.services.paymongo.logWebhookReceived, { ... });

    // 3. Verify signature
    const isValid = verifyPaymongoSignature(body, signature, webhookSecret);
    if (!isValid) {
      await ctx.runMutation(api.services.paymongo.logWebhookFailed, { ... });
      return new Response("Invalid signature", { status: 401 });
    }

    // 4. Log verification success
    await ctx.runMutation(api.services.paymongo.logWebhookVerified, { ... });

    // 5. Process based on event type
    const eventType = payload.data.attributes.type;
    switch (eventType) {
      case "payment.paid":
        await ctx.runMutation(api.services.paymongo.handlePaymentCompleted, { ... });
        break;
    }

    // 6. Return 200 (acknowledge receipt)
    return new Response("OK", { status: 200 });
  }),
});
```

### PayMongo API Call Pattern

**Pattern:** All PayMongo API calls use actions with consistent error handling.

```typescript
export const createPaymentLink = action({
  args: {
    branch_id: v.id("branches"),
    booking_id: v.id("bookings"),
    amount: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get decrypted config
    const config = await ctx.runQuery(api.services.paymongo.getDecryptedConfig, {
      branch_id: args.branch_id
    });

    if (!config) {
      throw new ConvexError({
        code: "PAYMONGO_NOT_CONFIGURED",
        message: "Payment gateway not configured for this branch"
      });
    }

    // 2. Call PayMongo API
    try {
      const response = await fetch("https://api.paymongo.com/v1/links", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(config.secret_key + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: args.amount * 100, // PayMongo uses centavos
              description: args.description,
            }
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ConvexError({
          code: "PAYMONGO_API_ERROR",
          message: error.errors?.[0]?.detail || "Payment service error"
        });
      }

      const data = await response.json();

      // 3. Log audit event
      await ctx.runMutation(api.services.paymongo.logAuditEvent, { ... });

      // 4. Update booking with link ID
      await ctx.runMutation(api.services.paymongo.updateBookingPaymentLink, { ... });

      return {
        link_id: data.data.id,
        checkout_url: data.data.attributes.checkout_url,
      };

    } catch (error) {
      if (error instanceof ConvexError) throw error;
      throw new ConvexError({
        code: "PAYMONGO_API_ERROR",
        message: "Payment service temporarily unavailable"
      });
    }
  },
});
```

### Payment Amount Patterns

**Pattern:** Amounts follow existing project currency rules.

| Context | Format | Example |
|---------|--------|---------|
| Database storage | Whole pesos (integer) | `5000` = ₱5,000 |
| PayMongo API | Centavos (integer) | `500000` = ₱5,000 |
| UI Display | Formatted string | `"₱5,000.00"` |

**Conversion Pattern:**
```typescript
// To PayMongo (centavos)
const paymongoAmount = amountInPesos * 100;

// From PayMongo (to pesos)
const amountInPesos = paymongoAmount / 100;
```

### Error Code Patterns

**Pattern:** PayMongo error codes follow `PAYMONGO_*` prefix.

| Code | When |
|------|------|
| `PAYMONGO_NOT_CONFIGURED` | Branch has no PayMongo setup |
| `PAYMONGO_API_ERROR` | PayMongo service unavailable |
| `PAYMONGO_INVALID_SIGNATURE` | Webhook signature failed |
| `PAYMENT_ALREADY_PROCESSED` | Duplicate payment attempt |
| `PAYMENT_LINK_EXPIRED` | Link no longer valid |
| `REFUND_NOT_ALLOWED` | Business rule prevents refund |

### Enforcement Guidelines

**All AI Agents MUST:**
1. Use `paymongo_` prefix for all external PayMongo ID fields
2. Never store plaintext API keys - always encrypt
3. Log ALL payment events to `paymentAuditLog` before and after processing
4. Convert peso amounts to centavos when calling PayMongo API
5. Use ConvexError with defined error codes for all failure cases
6. Verify webhook signatures before processing any webhook data

**Pattern Verification:**
- Schema review: Check all PayMongo tables follow naming conventions
- Service review: Verify all actions have audit logging
- Security review: Confirm no plaintext key storage

### Pattern Examples

**Good Example - Creating Payment Link:**
```typescript
// ✅ CORRECT: Follows all patterns
export const createPaymentLink = action({
  args: {
    branch_id: v.id("branches"),
    booking_id: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    // Get config (decryption happens server-side)
    const config = await ctx.runQuery(api.services.paymongo.getConfig, { branch_id: args.branch_id });

    // Amount in centavos for PayMongo
    const paymongoAmount = booking.total_amount * 100;

    // Call API and log
    // ... (full pattern above)
  },
});
```

**Anti-Patterns to Avoid:**
```typescript
// ❌ WRONG: Plaintext key storage
secret_key: v.string(),  // Should be secret_key_encrypted

// ❌ WRONG: Missing branch isolation
const allConfigs = await ctx.db.query("branchPaymentConfig").collect();

// ❌ WRONG: No audit logging
await updatePaymentStatus(bookingId, "paid");  // Missing audit log

// ❌ WRONG: Wrong amount unit
amount: 5000,  // Is this pesos or centavos? Ambiguous!

// ❌ WRONG: Generic error
throw new Error("Payment failed");  // Should use ConvexError with code
```

## Project Structure & Boundaries

### PayMongo Integration Additions to Existing Structure

```
tpx-booking-app/
├── convex/
│   ├── lib/                       # NEW DIRECTORY
│   │   └── encryption.ts          # NEW: AES-256-GCM helpers
│   ├── services/
│   │   └── paymongo.ts            # NEW: PayMongo service
│   ├── schema.ts                  # MODIFY: Add 2 tables
│   └── http.ts                    # MODIFY: Add webhook handler
└── src/
    └── components/
        ├── staff/
        │   ├── PaymentSettings.jsx           # NEW: Branch admin config
        │   └── TabNavigation.jsx             # MODIFY: Add tab
        ├── common/
        │   ├── PaymentStatusBadge.jsx        # NEW: Payment status display
        │   └── PaymentOptionsModal.jsx       # NEW: Pay Now/Later modal
        └── booking/
            ├── GuestServiceBooking.jsx       # MODIFY: Add payment flow
            └── ServiceBooking.jsx            # MODIFY: Add payment flow
```

### Complete File Inventory

#### New Files (5 files)

| File | Purpose | PRD Reference |
|------|---------|---------------|
| `convex/lib/encryption.ts` | AES-256-GCM encryption/decryption helpers | FR23-26 (Security) |
| `convex/services/paymongo.ts` | All PayMongo queries, mutations, actions | FR8-22 |
| `src/components/staff/PaymentSettings.jsx` | Branch admin PayMongo configuration | FR8-12 |
| `src/components/common/PaymentStatusBadge.jsx` | Reusable payment status indicator | FR27-31 |
| `src/components/common/PaymentOptionsModal.jsx` | Pay Now vs Pay Later selection | FR1-7 |

#### Modified Files (5 files)

| File | Modification | PRD Reference |
|------|--------------|---------------|
| `convex/schema.ts` | Add `branchPaymentConfig` and `paymentAuditLog` tables | Data Architecture |
| `convex/http.ts` | Add `/webhooks/paymongo` route handler | FR18-22 |
| `src/components/staff/TabNavigation.jsx` | Add "Payments" tab | FR8-12 |
| `src/components/booking/GuestServiceBooking.jsx` | Integrate payment flow after booking | FR1-7 |
| `src/components/booking/ServiceBooking.jsx` | Integrate payment flow after booking | FR1-7 |

### Architectural Boundaries

#### API Boundaries

| Boundary | Entry Point | Scope |
|----------|-------------|-------|
| PayMongo API | `convex/services/paymongo.ts` actions | External HTTP calls |
| Webhook Ingress | `convex/http.ts /webhooks/paymongo` | PayMongo → Convex |
| Frontend API | `api.services.paymongo.*` | React → Convex |

#### Component Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CUSTOMER BOUNDARY                                                        │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                │
│ │ GuestServiceBooking.jsx │  │ ServiceBooking.jsx      │                │
│ │ - Show payment options  │  │ - Show payment options  │                │
│ │ - Redirect to PayMongo  │  │ - Redirect to PayMongo  │                │
│ └────────────┬────────────┘  └────────────┬────────────┘                │
│              │                            │                             │
│              └────────────┬───────────────┘                             │
│                           ▼                                              │
│              ┌─────────────────────────────┐                            │
│              │ PaymentOptionsModal.jsx     │                            │
│              │ - Pay Now / Pay Later       │                            │
│              │ - Amount breakdown          │                            │
│              └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BRANCH ADMIN BOUNDARY                                                    │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                │
│ │ PaymentSettings.jsx     │  │ PaymentStatusBadge.jsx  │                │
│ │ - API key config        │  │ - Status indicator      │                │
│ │ - Payment policies      │  │ - Used across views     │                │
│ │ - Test mode toggle      │  │                         │                │
│ └─────────────────────────┘  └─────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BACKEND BOUNDARY (Server-Side Only)                                      │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                │
│ │ paymongo.ts (Service)   │  │ encryption.ts (Lib)     │                │
│ │ - Queries (read)        │  │ - encryptApiKey()       │                │
│ │ - Mutations (write)     │  │ - decryptApiKey()       │                │
│ │ - Actions (API calls)   │  │ - verifySignature()     │                │
│ └─────────────────────────┘  └─────────────────────────┘                │
│                                                                          │
│ ┌─────────────────────────┐                                             │
│ │ http.ts (Webhook)       │                                             │
│ │ - /webhooks/paymongo    │                                             │
│ │ - Signature verify      │                                             │
│ │ - Event dispatch        │                                             │
│ └─────────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Data Boundaries

| Table | Access Pattern | Branch Isolation |
|-------|---------------|------------------|
| `branchPaymentConfig` | by_branch index | ✅ Required |
| `paymentAuditLog` | by_branch, by_booking indexes | ✅ Required |
| `bookings` (extended) | Existing patterns | ✅ Already enforced |

### Requirements to Structure Mapping

#### FR Category → File Mapping

| FR Category | Primary File(s) |
|-------------|-----------------|
| FR1-7 (Customer Payment) | `PaymentOptionsModal.jsx`, `GuestServiceBooking.jsx`, `ServiceBooking.jsx` |
| FR8-12 (Branch Config) | `PaymentSettings.jsx`, `paymongo.ts` (mutations) |
| FR13-17 (POS Operations) | `POSCheckout.jsx` (existing), `paymongo.ts` (actions) |
| FR18-22 (Payment Processing) | `paymongo.ts` (actions), `http.ts` (webhook) |
| FR23-26 (Security) | `encryption.ts`, `paymongo.ts` (validation) |
| FR27-31 (Audit) | `paymentAuditLog` table, `paymongo.ts` (queries) |

#### Cross-Cutting Concerns → Location

| Concern | Location |
|---------|----------|
| Branch Isolation | Every query in `paymongo.ts` uses `by_branch` index |
| Encryption | `convex/lib/encryption.ts` used by `paymongo.ts` mutations/actions |
| Audit Logging | `logAuditEvent` mutation called from all payment operations |
| Error Handling | ConvexError with codes defined in `paymongo.ts` |
| Real-time Updates | Automatic via Convex subscriptions (no additional code) |

### Integration Points

#### Internal Communication

| From | To | Pattern |
|------|-----|---------|
| Booking components | PayMongo service | `useAction(api.services.paymongo.createPaymentLink)` |
| Webhook handler | PayMongo mutations | `ctx.runMutation(api.services.paymongo.handlePaymentCompleted)` |
| Settings UI | PayMongo mutations | `useMutation(api.services.paymongo.saveConfig)` |
| All components | Audit log | `ctx.runMutation(api.services.paymongo.logAuditEvent)` |

#### External Integrations

| Integration | Entry Point | Direction |
|-------------|-------------|-----------|
| PayMongo API | `paymongo.ts` actions | Outbound (fetch) |
| PayMongo Webhooks | `http.ts /webhooks/paymongo` | Inbound (POST) |

### Data Flow

```
Customer Books Service
         │
         ▼
┌─────────────────────────────────┐
│ Booking Component               │
│ Shows PaymentOptionsModal       │
│ User selects Pay Now/Pay Later  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ paymongo.createPaymentLink      │
│ (Convex Action)                 │
│ - Decrypt API keys              │
│ - Call PayMongo API             │
│ - Log "link_created"            │
│ - Update booking with link_id   │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Customer Redirected to PayMongo │
│ Pays via GCash/Card/etc         │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ PayMongo Webhook                │
│ POST /webhooks/paymongo         │
│ - Verify signature              │
│ - Log "webhook_verified"        │
│ - Process payment.paid event    │
│ - Update booking status         │
│ - Log "payment_completed"       │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Real-time UI Update             │
│ (Convex subscription)           │
│ Booking shows "Paid" status     │
└─────────────────────────────────┘
```

### Service File Structure

**`convex/services/paymongo.ts` Organization:**

```typescript
// ==================== QUERIES (read-only) ====================
export const getConfig = query({ ... });
export const getPaymentStatus = query({ ... });
export const getAuditLog = query({ ... });

// ==================== MUTATIONS (write) ====================
export const saveConfig = mutation({ ... });
export const updateBookingPaymentStatus = mutation({ ... });
export const logAuditEvent = mutation({ ... });

// Internal mutations (called by webhook/actions)
export const handlePaymentCompleted = mutation({ ... });
export const handlePaymentFailed = mutation({ ... });

// ==================== ACTIONS (external API calls) ====================
export const createPaymentLink = action({ ... });
export const verifyPayment = action({ ... });
export const processRefund = action({ ... });
```

### Component File Structure

**`src/components/staff/PaymentSettings.jsx` Pattern:**

```jsx
// Imports
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Main component
export function PaymentSettings({ branchId }) {
  // Data fetching
  const config = useQuery(api.services.paymongo.getConfig, { branch_id: branchId });
  const saveConfig = useMutation(api.services.paymongo.saveConfig);

  // Loading state
  if (config === undefined) return <Skeleton />;

  // Render
  return ( ... );
}
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
| Check | Status | Notes |
|-------|--------|-------|
| Convex + PayMongo API | ✅ Pass | Actions pattern correctly used for external HTTP |
| AES-256-GCM + Convex env vars | ✅ Pass | Encryption key in server-only environment variable |
| React 19 + Convex subscriptions | ✅ Pass | Real-time updates via existing patterns |
| TailwindCSS 4 + shadcn/ui | ✅ Pass | Component styling follows existing patterns |

**Pattern Consistency:**
| Check | Status | Notes |
|-------|--------|-------|
| Naming conventions | ✅ Pass | Tables (camelCase), fields (snake_case), indexes (by_*) |
| Error handling | ✅ Pass | ConvexError with PAYMONGO_* codes |
| Branch isolation | ✅ Pass | All queries use by_branch index |
| Audit logging | ✅ Pass | All events logged to paymentAuditLog |

**Structure Alignment:**
| Check | Status | Notes |
|-------|--------|-------|
| Service location | ✅ Pass | `convex/services/paymongo.ts` follows pattern |
| Component locations | ✅ Pass | Staff, common directories per role |
| HTTP endpoints | ✅ Pass | Webhook in `convex/http.ts` |

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (31 FRs):**

| FR Category | FRs | Architecture Support | Status |
|-------------|-----|---------------------|--------|
| Customer Payment | FR1-7 | PaymentOptionsModal, booking integration | ✅ Covered |
| Branch Config | FR8-12 | PaymentSettings.jsx, saveConfig mutation | ✅ Covered |
| POS Operations | FR13-17 | POSCheckout.jsx extension, paymongo actions | ✅ Covered |
| Payment Processing | FR18-22 | paymongo.ts actions, http.ts webhook | ✅ Covered |
| Security | FR23-26 | encryption.ts, signature verification | ✅ Covered |
| Audit & Tracking | FR27-31 | paymentAuditLog table, getAuditLog query | ✅ Covered |

**Non-Functional Requirements Coverage (18 NFRs):**

| NFR Category | Requirement | Architecture Support | Status |
|--------------|-------------|---------------------|--------|
| Performance | Payment init <3s | Convex actions with async processing | ✅ Covered |
| Performance | Webhook <5s | Immediate signature verify, async mutations | ✅ Covered |
| Security | AES-256 encryption | encryption.ts with GCM mode | ✅ Covered |
| Security | Server-only keys | Actions access env vars, not queries | ✅ Covered |
| Reliability | 99.9% webhook | Convex managed infrastructure | ✅ Covered |
| Reliability | Idempotency | paymongo_payment_id check before processing | ✅ Covered |

### Implementation Readiness Validation ✅

**Decision Completeness:**
| Element | Status | Notes |
|---------|--------|-------|
| Table schemas | ✅ Complete | Full TypeScript with validators |
| Service functions | ✅ Complete | Queries, mutations, actions defined |
| Error codes | ✅ Complete | 6 PayMongo-specific codes |
| Access control | ✅ Complete | 6-role matrix documented |

**Structure Completeness:**
| Element | Status | Notes |
|---------|--------|-------|
| New files (5) | ✅ Listed | Purpose and PRD reference for each |
| Modified files (5) | ✅ Listed | Specific changes documented |
| Data flow | ✅ Documented | End-to-end customer payment flow |
| Component boundaries | ✅ Defined | Customer, Branch Admin, Backend |

**Pattern Completeness:**
| Element | Status | Notes |
|---------|--------|-------|
| Naming patterns | ✅ Complete | paymongo_* prefix for external IDs |
| Encryption pattern | ✅ Complete | encrypt/decrypt helper signatures |
| Audit log pattern | ✅ Complete | 8 event types, entry structure |
| Webhook pattern | ✅ Complete | Verify-then-process flow |
| API call pattern | ✅ Complete | Full action template with error handling |
| Amount conversion | ✅ Complete | Peso ↔ centavo rules |

### Gap Analysis Results

**Critical Gaps:** None identified ✅

**Important Gaps:**
| Gap | Impact | Recommendation |
|-----|--------|----------------|
| Test file structure | Medium | Add `__tests__/paymongo.test.ts` to file inventory during Epics |

**Nice-to-Have Gaps:**
| Gap | Impact | When to Address |
|-----|--------|-----------------|
| Payment analytics dashboard | Low | Post-MVP (deferred decision) |
| Multi-provider support | Low | Post-MVP (deferred decision) |

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (31 FRs, 18 NFRs)
- [x] Scale and complexity assessed (Medium - brownfield integration)
- [x] Technical constraints identified (Convex patterns, branch isolation)
- [x] Cross-cutting concerns mapped (6 concerns with implementation approach)

**✅ Architectural Decisions**
- [x] Critical decisions documented (5 critical, 4 important)
- [x] Technology stack fully specified (locked per project-context.md)
- [x] Integration patterns defined (PayMongo API via actions, webhooks via HTTP)
- [x] Security considerations addressed (encryption, signatures, RBAC)

**✅ Implementation Patterns**
- [x] Naming conventions established (7 patterns aligned with project-context)
- [x] PayMongo-specific patterns defined (6 new patterns)
- [x] Communication patterns specified (internal + external integrations)
- [x] Process patterns documented (webhook flow, API calls, error handling)

**✅ Project Structure**
- [x] Complete file inventory defined (5 new, 5 modified)
- [x] Component boundaries established (3 boundaries)
- [x] Integration points mapped (4 internal, 2 external)
- [x] FR to file mapping complete (6 categories → specific files)

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY FOR IMPLEMENTATION**

**Confidence Level:** HIGH

**Key Strengths:**
1. Full alignment with existing project-context.md patterns
2. Comprehensive security architecture (encryption + signatures + RBAC)
3. Clear data flow from booking → payment → webhook → status update
4. Immutable audit trail for all payment events
5. Brownfield-appropriate scope (minimal new components)

**Areas for Future Enhancement:**
1. Multi-provider payment gateway support (post-MVP)
2. Advanced refund workflows with partial amounts
3. Payment analytics and reporting dashboard

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Use `convex/lib/encryption.ts` for ALL credential encryption
- Log ALL payment events to `paymentAuditLog` before processing
- Verify webhook signatures BEFORE any database operations

**First Implementation Priority:**
1. Add `branchPaymentConfig` and `paymentAuditLog` tables to `convex/schema.ts`
2. Create `convex/lib/encryption.ts` with AES-256-GCM helpers
3. Create `convex/services/paymongo.ts` with core queries/mutations/actions
4. Add webhook route to `convex/http.ts`

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-27
**Document Location:** `_bmad-output/planning-artifacts/architecture-paymongo.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**
- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**
- 9 critical/important architectural decisions made
- 7 implementation patterns defined
- 10 files specified (5 new, 5 modified)
- 31 FRs + 18 NFRs fully supported

**📚 AI Agent Implementation Guide**
- Technology stack with verified versions (locked per project-context.md)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Development Sequence

1. **Schema Changes** - Add `branchPaymentConfig` and `paymentAuditLog` tables
2. **Encryption Library** - Create `convex/lib/encryption.ts`
3. **PayMongo Service** - Create `convex/services/paymongo.ts`
4. **Webhook Handler** - Extend `convex/http.ts`
5. **Payment Settings UI** - Create `PaymentSettings.jsx` for branch admin
6. **Booking Integration** - Extend booking components with payment flow
7. **POS Integration** - Add PayMongo to POS checkout

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All 31 functional requirements are supported
- [x] All 18 non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

---

**Architecture Status:** ✅ READY FOR IMPLEMENTATION

**Next Phase:** Create Epics & Stories using this architecture as input

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation

