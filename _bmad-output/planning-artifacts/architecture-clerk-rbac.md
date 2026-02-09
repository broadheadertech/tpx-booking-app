---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
startedAt: '2026-01-28'
completedAt: '2026-01-28'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-clerk-rbac.md
  - _bmad-output/planning-artifacts/project-context.md
  - docs/index.md
workflowType: 'architecture'
project_name: 'tpx-booking-app'
feature_name: 'Clerk Authentication + RBAC'
user_name: 'MASTERPAINTER'
date: '2026-01-28'
---

# Architecture Decision Document - Clerk Authentication + RBAC

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
48 FRs across 9 capability areas for Clerk Authentication + RBAC integration:

| Capability Area | FRs | Core Architectural Need |
|-----------------|-----|------------------------|
| Authentication & Session | FR1-6 | Clerk SDK integration, JWT verification |
| User Management | FR7-13 | User CRUD with role constraints, Clerk invites |
| Role & Permission | FR14-19 | RBAC engine, page_access config, real-time updates |
| Branch/Organization | FR20-25 | Clerk Organizations ↔ Branches sync |
| Data Access Control | FR26-32 | Branch scoping at query level, window-based restrictions |
| Audit & Compliance | FR33-35 | Permission change logging |
| Migration | FR36-39 | Dual strategy: invite + auto-import |
| Webhook & Sync | FR40-44 | Clerk → Convex webhooks with signature verification |
| Barber-Specific | FR45-48 | Personal data isolation, cash advance workflow |

**Non-Functional Requirements:**
18 NFRs shaping architectural decisions:

| Category | Key Requirements |
|----------|------------------|
| Performance | Permission check <10s, nav render <2s, login <3s, context switch <2s |
| Security | 100% branch isolation, zero escalation vulnerabilities, JWT verification, webhook signatures |
| Integration | 99.9% webhook reliability, 3 retries with backoff, dead letter queue |
| Reliability | 99.9% auth availability, <5s permission sync, 1hr rollback, zero migration data loss |

**Scale & Complexity:**

- Primary domain: Full-stack brownfield integration (React + Convex + Clerk)
- Complexity level: Medium-High
- New components: ~10 files (schema changes, 2 services, 1 HTTP endpoint, 4+ UI updates)
- User roles: 6 distinct roles with permission matrix

### Technical Constraints & Dependencies

**Brownfield Constraints:**
- Must integrate with existing auth context (`AuthContext.jsx`) during transition
- Must preserve existing user data (no data loss during migration)
- Must follow established Convex patterns (queries, mutations, actions)
- UI must follow existing patterns (dark theme, shadcn/ui, role-based component directories)
- All queries must maintain existing branch_id filtering pattern

**Infrastructure Dependencies:**
- Clerk (external): Authentication provider, Organizations API, Webhooks
- Convex HTTP endpoints for webhook handlers
- Existing users table (extend for Clerk ID mapping)
- Existing branches table (extend for Clerk Organization ID)
- Environment variables for Clerk keys and webhook secrets

**Technical Stack (Locked):**
- Frontend: React 19 + Vite 7 + TailwindCSS 4
- Backend: Convex 1.26.1
- Mobile: Capacitor 7.4.3
- External: Clerk SDK (React + Backend)

**Migration Complexity:**
- Existing users must be migrated to Clerk without service disruption
- Dual auth system during transition period
- Feature flags for gradual cutover
- Rollback capability within 1 hour

### Cross-Cutting Concerns Identified

| Concern | Affected Components | Implementation Approach |
|---------|---------------------|------------------------|
| Branch Isolation | All queries, user management, audit | branch_id filtering + Clerk Org membership |
| JWT Verification | All mutations | Server-side Clerk token verification |
| Role Enforcement | Navigation, page access, action buttons | RBAC middleware + UI conditional rendering |
| Audit Trail | Permission changes, role assignments | Immutable permissionAuditLog table |
| Webhook Security | HTTP endpoints | Signature verification before processing |
| Real-time Updates | Permission changes, navigation | Convex subscriptions (automatic) |
| Error Handling | Auth failures, permission denials | Graceful messaging, no stack traces |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack hybrid (React + Convex + Capacitor) - **Established brownfield project**

### Existing Foundation (Not Evaluating New Starters)

This is a brownfield enhancement project. The technical foundation is already established and validated in production.

**Rationale:** Clerk Authentication + RBAC features must integrate with the existing codebase rather than establish new patterns.

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

### Clerk-Specific New Components

| Component | Pattern | Location |
|-----------|---------|----------|
| Clerk Provider | React context wrapper | `src/main.jsx` |
| Users table extension | Schema migration | `convex/schema.ts` |
| RBAC service | New service file | `convex/services/rbac.ts` |
| Clerk webhook handler | Convex HTTP action | `convex/http.ts` |
| Permission components | UI wrappers | `src/components/common/` |

**Note:** No project initialization needed - this extends existing codebase.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Users table schema extension for Clerk ID and role mapping
- RBAC permission model (role + page_access hybrid)
- Clerk Organizations ↔ Branches mapping strategy
- Webhook authentication and signature verification
- JWT verification for all mutations

**Important Decisions (Shape Architecture):**
- Permission audit log table design
- Migration strategy (invite + auto-import)
- Real-time permission update mechanism
- Access control middleware pattern
- Error handling for auth failures

**Deferred Decisions (Post-MVP):**
- Permission templates ("Cashier", "Manager", etc.)
- Time-based access restrictions
- Impersonation feature
- Activity dashboard for compliance

### Data Architecture

#### Users Table Extension

**Decision:** Extend existing `users` table rather than creating new table

```typescript
// Add to existing users table in convex/schema.ts
users: defineTable({
  // Existing fields preserved
  email: v.string(),
  name: v.string(),
  role: v.union(
    v.literal("super_admin"),
    v.literal("admin_staff"),      // NEW: cross-branch ops
    v.literal("branch_admin"),
    v.literal("staff"),
    v.literal("customer"),
    v.literal("barber")
  ),
  branch_id: v.optional(v.id("branches")),

  // NEW Clerk fields
  clerk_user_id: v.optional(v.string()),      // Clerk's user ID (user_xxx)
  clerk_org_ids: v.optional(v.array(v.string())), // Clerk Organization IDs

  // NEW RBAC fields - replaces existing array-based page_access
  // NOTE: Current implementation uses array: user.page_access.includes(tabId)
  // Migration to object-based structure enables action-level permissions
  page_access: v.optional(v.object({
    // Staff Dashboard Pages (24 pages)
    overview: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    reports: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    bookings: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    custom_bookings: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    calendar: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    walkins: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    pos: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    barbers: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    users: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    services: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    customers: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    products: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    order_products: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    vouchers: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    payroll: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    cash_advances: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    royalty: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    pl: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    balance_sheet: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    payments: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    payment_history: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    attendance: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    events: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    notifications: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    email_marketing: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    // Admin Dashboard Additional Pages
    branches: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    catalog: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    branding: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    emails: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    settings: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
  })),
  // ALWAYS ACCESSIBLE pages (regardless of page_access): overview, custom_bookings, walkins

  // Migration tracking
  migration_status: v.optional(v.union(
    v.literal("pending"),      // Not yet migrated
    v.literal("invited"),      // Clerk invite sent
    v.literal("completed")     // Fully migrated
  )),
  legacy_password_hash: v.optional(v.string()), // Preserved for rollback
})
  .index("by_clerk_user_id", ["clerk_user_id"])
  .index("by_branch", ["branch_id"])
  .index("by_role", ["role"])
  .index("by_migration_status", ["migration_status"])
```

**Rationale:** Extending existing table preserves all user relationships (bookings, payments, etc.) and enables gradual migration without data loss.

#### Branches Table Extension

```typescript
// Add to existing branches table
branches: defineTable({
  // Existing fields preserved
  name: v.string(),
  // ... other existing fields

  // NEW Clerk Organization mapping
  clerk_org_id: v.optional(v.string()),  // Clerk Organization ID (org_xxx)
})
  .index("by_clerk_org_id", ["clerk_org_id"])
```

**Rationale:** One-to-one mapping between Branches and Clerk Organizations for multi-tenant isolation.

#### Permission Audit Log Table

```typescript
permissionAuditLog: defineTable({
  user_id: v.id("users"),              // Who was changed
  changed_by: v.id("users"),           // Who made the change
  change_type: v.union(
    v.literal("role_changed"),
    v.literal("page_access_changed"),
    v.literal("branch_assigned"),
    v.literal("branch_removed"),
    v.literal("user_created"),
    v.literal("user_deleted")
  ),
  previous_value: v.optional(v.string()),  // JSON stringified
  new_value: v.string(),                   // JSON stringified
  created_at: v.number(),
})
  .index("by_user", ["user_id"])
  .index("by_changed_by", ["changed_by"])
  .index("by_created_at", ["created_at"])
```

**Rationale:** Immutable audit trail for all permission changes, supporting compliance and debugging.

### Authentication & Security

#### Clerk Integration Strategy

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Provider | Clerk (managed auth) | Enterprise-grade, handles MFA, SSO, session management |
| SDK | @clerk/clerk-react + @clerk/clerk-sdk-node | Official SDKs with Convex compatibility |
| Session | Clerk-managed JWT | Server-side verification on all mutations |
| Organizations | Map to Branches | Multi-tenant isolation via Clerk Organizations |

#### JWT Verification Pattern

```typescript
// convex/lib/clerkAuth.ts
import { Webhook } from "svix";

// Verify Clerk JWT in mutations
export async function verifyClerkToken(ctx: MutationCtx): Promise<ClerkUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return {
    clerk_user_id: identity.subject,
    email: identity.email,
    name: identity.name,
  };
}
```

**Enforcement:**
- All mutations MUST call `verifyClerkToken()` before any database operations
- Queries can be unauthenticated for public data (service catalog, etc.)
- Actions use Clerk Backend SDK for Clerk API calls

#### Webhook Signature Verification

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Library | Svix (Clerk's webhook library) | Official, handles signature verification |
| Secret | `CLERK_WEBHOOK_SECRET` env var | Stored in Convex dashboard |
| Validation | Before ANY database operations | Reject invalid signatures immediately |
| Logging | All attempts logged | Security audit trail |

#### Access Control Matrix

| Role | Scope | User CRUD | Branch Access | Special Permissions |
|------|-------|-----------|---------------|---------------------|
| super_admin | All | Create/Delete any | All branches | Settings, Branch creation |
| admin_staff | All | Create branch-level | All branches (view/edit) | No user deletion |
| branch_admin | Own branch | Create Staff/Barber | Own branch only | page_access config |
| staff | Own branch | None | Own branch only | As per page_access |
| customer | Self | None | N/A | Own bookings only |
| barber | Self | None | Own branch | Own schedule/earnings |

### API & Communication Patterns

#### Clerk Webhook Handler

```
┌─────────────────────────────────────────────────────────────────┐
│  Clerk (External)                                                │
│  Sends webhooks for: user.created, user.updated, user.deleted   │
│                      organization.created, organization.updated │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  convex/http.ts - Webhook Handler                                │
│  POST /webhooks/clerk → verify signature → process event        │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  convex/services/clerkSync.ts                                    │
│  - handleUserCreated(payload)                                    │
│  - handleUserUpdated(payload)                                    │
│  - handleUserDeleted(payload)                                    │
│  - handleOrgCreated(payload)                                     │
│  - handleOrgMembershipChanged(payload)                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Clerk Backend API Calls

| Operation | Convex Pattern | Clerk API |
|-----------|----------------|-----------|
| Create user | Action | `clerk.users.createUser()` |
| Invite user | Action | `clerk.invitations.createInvitation()` |
| Create organization | Action | `clerk.organizations.createOrganization()` |
| Add org member | Action | `clerk.organizations.addMember()` |

**Pattern:** All Clerk API calls use Convex Actions (not mutations) since they involve external HTTP.

#### Idempotency Strategy

| Scenario | Approach |
|----------|----------|
| User webhook | Check if `clerk_user_id` already exists before creating |
| Org webhook | Check if `clerk_org_id` already exists before creating |
| Permission changes | Use optimistic concurrency with audit log |

### Frontend Architecture

#### Clerk Provider Integration

```jsx
// src/main.jsx
import { ClerkProvider } from '@clerk/clerk-react';

root.render(
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>
);
```

#### Permission-Aware Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `<RequireAuth>` | Wrap pages requiring login | `src/components/common/RequireAuth.jsx` |
| `<RequireRole>` | Check user role | `src/components/common/RequireRole.jsx` |
| `<RequirePermission>` | Check page_access permission | `src/components/common/RequirePermission.jsx` |
| `<PermissionGuard>` | Conditional render based on permission | `src/components/common/PermissionGuard.jsx` |

#### Real-time Permission Updates

**Mechanism:** Convex subscriptions automatically update UI when permissions change.

```jsx
// Permission changes propagate automatically
const user = useQuery(api.services.auth.getCurrentUser);
// When page_access is updated via mutation, UI re-renders
```

#### Navigation Filtering

```jsx
// Navigation items filtered by user's page_access
const navItems = useQuery(api.services.rbac.getAccessiblePages, { user_id });
// Returns only pages user has view: true permission
```

### Infrastructure & Deployment

#### Environment Variables

| Variable | Purpose | Location |
|----------|---------|----------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend Clerk SDK | `.env.local` |
| `CLERK_SECRET_KEY` | Backend Clerk API | Convex dashboard |
| `CLERK_WEBHOOK_SECRET` | Webhook signature | Convex dashboard |

#### Webhook Endpoint

| Aspect | Decision |
|--------|----------|
| URL Pattern | `https://{convex-deployment}/webhooks/clerk` |
| Events | `user.created`, `user.updated`, `user.deleted`, `organization.*` |
| Registration | Clerk Dashboard → Webhooks |

#### Feature Flags for Migration

| Flag | Purpose |
|------|---------|
| `ENABLE_CLERK_AUTH` | Toggle new auth system |
| `ENABLE_LEGACY_AUTH` | Keep old auth during transition |
| `MIGRATION_MODE` | Enable dual auth system |

### Decision Impact Analysis

**Implementation Sequence:**
1. Schema changes (users extension, audit log table)
2. Clerk SDK installation and ClerkProvider setup
3. Webhook handler in http.ts
4. RBAC service with permission checks
5. Auth context migration (wrap existing with Clerk)
6. Permission-aware UI components
7. User migration (invite + import)
8. Legacy auth removal (cutover)

**Cross-Component Dependencies:**
```
Schema (1) → Webhook (3) → RBAC Service (4) → Auth Context (5) → UI Components (6) → Migration (7) → Cutover (8)
     │                            │
     └────────────────────────────┘
     (RBAC service reads from schema)
```

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 8 areas where AI agents could make different choices without explicit patterns.

**Already Established (from project-context.md):**

| Category | Pattern | Example |
|----------|---------|---------|
| Tables | camelCase | `users`, `permissionAuditLog` |
| Fields | snake_case | `clerk_user_id`, `page_access` |
| Indexes | by_fieldname | `by_clerk_user_id`, `by_branch` |
| Queries | get* prefix | `getCurrentUser`, `getUserPermissions` |
| Mutations | verb + noun | `updateUserRole`, `createInvite` |
| Actions | verb + noun | `sendClerkInvite`, `syncClerkUser` |
| Components | PascalCase.jsx | `RequireAuth.jsx`, `PermissionGuard.jsx` |
| Hooks | useCamelCase | `usePermissions`, `useCurrentUser` |

### Clerk-Specific Naming Patterns

#### External ID Field Naming

**Pattern:** Prefix Clerk external IDs with `clerk_`

| Field | Pattern | Example Value |
|-------|---------|---------------|
| User ID | `clerk_user_id` | `"user_2abc123def"` |
| Organization ID | `clerk_org_id` | `"org_xyz789ghi"` |
| Organization IDs (array) | `clerk_org_ids` | `["org_xxx", "org_yyy"]` |

**Rationale:** Distinguishes external Clerk IDs from internal Convex IDs.

### Permission Patterns

#### page_access Object Structure

**Pattern:** All pages use consistent permission object structure.

```typescript
page_access: {
  [page_name]: {
    view: boolean,    // Can see the page
    create: boolean,  // Can create new items
    edit: boolean,    // Can edit existing items
    delete: boolean,  // Can delete items
    approve: boolean  // Can approve actions (cash advance, refunds)
  }
}
```

**Page Names (30 total from actual codebase):**
```typescript
// Staff Dashboard Pages (24)
type StaffPageName =
  | "overview" | "reports" | "bookings" | "custom_bookings"
  | "calendar" | "walkins" | "pos" | "barbers"
  | "users" | "services" | "customers" | "products"
  | "order_products" | "vouchers" | "payroll" | "cash_advances"
  | "royalty" | "pl" | "balance_sheet" | "payments"
  | "payment_history" | "attendance" | "events" | "notifications"
  | "email_marketing";

// Admin Dashboard Additional Pages (6)
type AdminPageName =
  | "branches" | "catalog" | "branding" | "emails" | "settings";

type PageName = StaffPageName | AdminPageName;

// Always accessible (bypass permission check):
const ALWAYS_ACCESSIBLE = ["overview", "custom_bookings", "walkins"] as const;
```

**Usage Pattern:**
```typescript
// Check permission
const canEditBookings = user.page_access?.bookings?.edit ?? false;

// Grant permission
await ctx.db.patch(userId, {
  page_access: {
    ...user.page_access,
    bookings: { view: true, create: true, edit: true, delete: false, approve: false }
  }
});
```

### Role Hierarchy Patterns

#### Role Check Pattern

**Pattern:** Role checks use explicit hierarchy, NOT string comparison.

```typescript
// convex/lib/roleUtils.ts
export const ROLE_HIERARCHY = {
  super_admin: 6,
  admin_staff: 5,
  branch_admin: 4,
  staff: 3,
  barber: 2,
  customer: 1
};

export function hasRoleOrHigher(userRole: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isBranchScoped(role: string): boolean {
  return ["branch_admin", "staff", "barber"].includes(role);
}
```

**Usage:**
```typescript
// ✅ CORRECT
if (hasRoleOrHigher(user.role, "branch_admin")) { ... }

// ❌ WRONG - string comparison
if (user.role === "super_admin" || user.role === "admin_staff") { ... }
```

### Webhook Handler Pattern

**Pattern:** Webhook handlers follow verify-then-process flow with logging.

```typescript
// convex/http.ts
http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Extract signature header
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    // 2. Get raw body
    const body = await request.text();

    // 3. Verify signature using Svix
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    let payload;
    try {
      payload = wh.verify(body, {
        "svix-id": svix_id!,
        "svix-timestamp": svix_timestamp!,
        "svix-signature": svix_signature!,
      });
    } catch (err) {
      console.error("Webhook signature verification failed");
      return new Response("Invalid signature", { status: 401 });
    }

    // 4. Process based on event type
    const eventType = payload.type;
    switch (eventType) {
      case "user.created":
        await ctx.runMutation(api.services.clerkSync.handleUserCreated, { payload });
        break;
      case "user.updated":
        await ctx.runMutation(api.services.clerkSync.handleUserUpdated, { payload });
        break;
      case "user.deleted":
        await ctx.runMutation(api.services.clerkSync.handleUserDeleted, { payload });
        break;
      case "organization.created":
        await ctx.runMutation(api.services.clerkSync.handleOrgCreated, { payload });
        break;
      case "organizationMembership.created":
      case "organizationMembership.deleted":
        await ctx.runMutation(api.services.clerkSync.handleOrgMembershipChanged, { payload });
        break;
    }

    // 5. Return 200
    return new Response("OK", { status: 200 });
  }),
});
```

### Permission Check Patterns

#### Server-Side Permission Check

**Pattern:** All mutations verify permissions before any database operations.

```typescript
// convex/services/rbac.ts
export async function checkPermission(
  ctx: MutationCtx,
  page: PageName,
  action: "view" | "create" | "edit" | "delete" | "approve"
): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", q => q.eq("clerk_user_id", identity.subject))
    .unique();

  if (!user) return false;

  // Super admin has all permissions
  if (user.role === "super_admin") return true;

  // Check page_access
  return user.page_access?.[page]?.[action] ?? false;
}
```

**Usage in mutations:**
```typescript
export const updateBooking = mutation({
  args: { booking_id: v.id("bookings"), ... },
  handler: async (ctx, args) => {
    // Check permission FIRST
    const canEdit = await checkPermission(ctx, "bookings", "edit");
    if (!canEdit) {
      throw new ConvexError({
        code: "PERMISSION_DENIED",
        message: "You don't have permission to edit bookings"
      });
    }
    // Then proceed with mutation
    await ctx.db.patch(args.booking_id, { ... });
  }
});
```

### Audit Log Patterns

**Pattern:** Permission changes MUST be logged with before/after values.

```typescript
// Log permission change
await ctx.db.insert("permissionAuditLog", {
  user_id: targetUserId,
  changed_by: currentUserId,
  change_type: "page_access_changed",
  previous_value: JSON.stringify(user.page_access),
  new_value: JSON.stringify(newPageAccess),
  created_at: Date.now(),
});
```

### Frontend Component Patterns

#### Permission-Aware Components

**Pattern:** Use wrapper components for permission checks.

```jsx
// RequireAuth - blocks entire page
<RequireAuth>
  <DashboardPage />
</RequireAuth>

// RequireRole - checks role level
<RequireRole role="branch_admin">
  <UserManagementSection />
</RequireRole>

// RequirePermission - checks specific page_access
<RequirePermission page="bookings" action="edit">
  <EditBookingButton />
</RequirePermission>

// PermissionGuard - conditional render (doesn't throw)
<PermissionGuard page="reports" action="view" fallback={null}>
  <ReportsLink />
</PermissionGuard>
```

**Implementation:**
```jsx
// src/components/common/RequirePermission.jsx
export function RequirePermission({ page, action, children, fallback = <AccessDenied /> }) {
  const { user } = useAuth();
  const hasPermission = user?.page_access?.[page]?.[action] ?? false;

  if (user?.role === "super_admin") return children;
  if (!hasPermission) return fallback;
  return children;
}
```

### Error Code Patterns

**Pattern:** Auth/RBAC error codes follow `AUTH_*` or `PERMISSION_*` prefix.

| Code | When |
|------|------|
| `AUTH_REQUIRED` | No valid session/token |
| `AUTH_INVALID_TOKEN` | JWT verification failed |
| `AUTH_USER_NOT_FOUND` | Clerk user ID not in Convex |
| `PERMISSION_DENIED` | User lacks required permission |
| `PERMISSION_BRANCH_MISMATCH` | Trying to access another branch's data |
| `PERMISSION_ROLE_INSUFFICIENT` | Role not high enough for action |

### Migration Patterns

#### Dual Auth During Transition

**Pattern:** Feature flag controls which auth system is active.

```typescript
// Check feature flag
const useClerkAuth = await ctx.runQuery(api.services.config.getFeatureFlag, {
  flag: "ENABLE_CLERK_AUTH"
});

if (useClerkAuth) {
  // Use Clerk authentication
  const identity = await ctx.auth.getUserIdentity();
  ...
} else {
  // Use legacy auth
  const session = await ctx.runQuery(api.services.auth.getSession, { sessionId });
  ...
}
```

#### User Migration Status

**Pattern:** Track migration status per user.

```typescript
// Check if user needs migration
if (user.migration_status === "pending") {
  // Show migration prompt
}

// After successful Clerk login
await ctx.db.patch(user._id, {
  clerk_user_id: clerkUserId,
  migration_status: "completed"
});
```

### Enforcement Guidelines

**All AI Agents MUST:**
1. Use `clerk_` prefix for all external Clerk ID fields
2. Use `checkPermission()` helper in ALL mutations that modify data
3. Log ALL permission changes to `permissionAuditLog`
4. Use role hierarchy helpers, NOT string comparisons
5. Verify webhook signatures BEFORE processing any webhook
6. Use ConvexError with defined error codes for all auth/permission failures
7. Apply branch_id filtering for branch-scoped roles in ALL queries

**Pattern Verification:**
- Schema review: Check all Clerk fields follow naming conventions
- Service review: Verify all mutations have permission checks
- Security review: Confirm webhook signature verification
- Audit review: Verify all permission changes are logged

### Pattern Examples

**Good Example - Creating User:**
```typescript
// ✅ CORRECT: Follows all patterns
export const createUser = mutation({
  args: { email: v.string(), role: v.string(), branch_id: v.optional(v.id("branches")) },
  handler: async (ctx, args) => {
    // 1. Check permission
    const canCreate = await checkPermission(ctx, "users", "create");
    if (!canCreate) throw new ConvexError({ code: "PERMISSION_DENIED", message: "..." });

    // 2. Verify role constraints
    const currentUser = await getCurrentUser(ctx);
    if (currentUser.role === "branch_admin" && !["staff", "barber"].includes(args.role)) {
      throw new ConvexError({ code: "PERMISSION_ROLE_INSUFFICIENT", message: "..." });
    }

    // 3. Create user
    const userId = await ctx.db.insert("users", { ... });

    // 4. Log audit
    await ctx.db.insert("permissionAuditLog", {
      user_id: userId,
      changed_by: currentUser._id,
      change_type: "user_created",
      previous_value: null,
      new_value: JSON.stringify({ email: args.email, role: args.role }),
      created_at: Date.now(),
    });

    return userId;
  },
});
```

**Anti-Patterns to Avoid:**
```typescript
// ❌ WRONG: No permission check
export const deleteUser = mutation({
  handler: async (ctx, args) => {
    await ctx.db.delete(args.userId);  // Missing permission check!
  }
});

// ❌ WRONG: String comparison for roles
if (user.role === "super_admin" || user.role === "admin_staff") { ... }

// ❌ WRONG: No audit logging
await ctx.db.patch(user._id, { role: "branch_admin" });  // Missing audit log!

// ❌ WRONG: No branch filtering for branch-scoped query
const bookings = await ctx.db.query("bookings").collect();  // Missing branch_id filter!

// ❌ WRONG: Processing webhook before signature verification
const payload = JSON.parse(body);
await handleEvent(payload);  // Verify signature FIRST!
```

## Project Structure & Boundaries

### Clerk + RBAC Integration Additions to Existing Structure

```
tpx-booking-app/
├── convex/
│   ├── lib/                              # NEW DIRECTORY
│   │   ├── clerkAuth.ts                  # NEW: Clerk JWT verification helpers
│   │   └── roleUtils.ts                  # NEW: Role hierarchy helpers
│   ├── services/
│   │   ├── auth.ts                       # MODIFY: Add Clerk integration
│   │   ├── clerkSync.ts                  # NEW: Webhook handlers
│   │   └── rbac.ts                       # NEW: Permission checks
│   ├── schema.ts                         # MODIFY: Add users extension, audit log
│   └── http.ts                           # MODIFY: Add Clerk webhook route
└── src/
    ├── main.jsx                          # MODIFY: Add ClerkProvider
    ├── context/
    │   └── AuthContext.jsx               # MODIFY: Wrap with Clerk
    └── components/
        └── common/
            ├── RequireAuth.jsx           # NEW: Auth wrapper
            ├── RequireRole.jsx           # NEW: Role check wrapper
            ├── RequirePermission.jsx     # NEW: Permission check wrapper
            ├── PermissionGuard.jsx       # NEW: Conditional render
            └── AccessDenied.jsx          # NEW: No access message
```

### Complete File Inventory

#### New Files (9 files)

| File | Purpose | PRD Reference |
|------|---------|---------------|
| `convex/lib/clerkAuth.ts` | JWT verification, user identity helpers | FR6 |
| `convex/lib/roleUtils.ts` | Role hierarchy, scope checks | FR14-16 |
| `convex/services/clerkSync.ts` | Webhook handlers for Clerk events | FR40-44 |
| `convex/services/rbac.ts` | Permission check queries and mutations | FR14-19, FR33-35 |
| `src/components/common/RequireAuth.jsx` | Block page if not authenticated | FR1-5 |
| `src/components/common/RequireRole.jsx` | Block page if role insufficient | FR14 |
| `src/components/common/RequirePermission.jsx` | Block action if no permission | FR15-16 |
| `src/components/common/PermissionGuard.jsx` | Conditional render for permissions | FR17 |
| `src/components/common/AccessDenied.jsx` | Graceful "No Access" message | FR18 |

#### Modified Files (5 files)

| File | Modification | PRD Reference |
|------|--------------|---------------|
| `convex/schema.ts` | Extend `users` table, add `permissionAuditLog` | Data Architecture |
| `convex/http.ts` | Add `/webhooks/clerk` route handler | FR40-44 |
| `convex/services/auth.ts` | Integrate Clerk, add migration helpers | FR1-6, FR36-39 |
| `src/main.jsx` | Wrap app with `ClerkProvider` + `ConvexProviderWithClerk` | Frontend Architecture |
| `src/context/AuthContext.jsx` | Replace custom auth with Clerk hooks | FR1-5 |

### Architectural Boundaries

#### API Boundaries

| Boundary | Entry Point | Scope |
|----------|-------------|-------|
| Clerk Webhooks | `convex/http.ts /webhooks/clerk` | Clerk → Convex sync |
| Clerk Backend API | `convex/services/clerkSync.ts` actions | Convex → Clerk (invites, org creation) |
| Frontend Auth | Clerk React SDK | Login, logout, session |
| Frontend → Convex | `api.services.rbac.*` | Permission queries |

#### Component Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION BOUNDARY (Clerk-managed)                                  │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                │
│ │ ClerkProvider           │  │ SignIn/SignOut          │                │
│ │ - Session management    │  │ - Clerk components      │                │
│ │ - JWT token handling    │  │ - MFA setup             │                │
│ └─────────────────────────┘  └─────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ AUTHORIZATION BOUNDARY (App-managed)                                     │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                │
│ │ RequireAuth.jsx         │  │ RequireRole.jsx         │                │
│ │ - Blocks unauthenticated│  │ - Checks role level     │                │
│ │ - Redirects to login    │  │ - Uses role hierarchy   │                │
│ └─────────────────────────┘  └─────────────────────────┘                │
│                                                                          │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                │
│ │ RequirePermission.jsx   │  │ PermissionGuard.jsx     │                │
│ │ - Checks page_access    │  │ - Conditional render    │                │
│ │ - Shows AccessDenied    │  │ - Hides if no access    │                │
│ └─────────────────────────┘  └─────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BACKEND BOUNDARY (Server-side only)                                      │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                │
│ │ rbac.ts (Service)       │  │ clerkAuth.ts (Lib)      │                │
│ │ - checkPermission()     │  │ - verifyClerkToken()    │                │
│ │ - getUserPermissions()  │  │ - getCurrentUser()      │                │
│ │ - updatePageAccess()    │  │                         │                │
│ └─────────────────────────┘  └─────────────────────────┘                │
│                                                                          │
│ ┌─────────────────────────┐  ┌─────────────────────────┐                │
│ │ clerkSync.ts (Service)  │  │ roleUtils.ts (Lib)      │                │
│ │ - handleUserCreated()   │  │ - hasRoleOrHigher()     │                │
│ │ - handleOrgCreated()    │  │ - isBranchScoped()      │                │
│ │ - sendClerkInvite()     │  │ - ROLE_HIERARCHY        │                │
│ └─────────────────────────┘  └─────────────────────────┘                │
│                                                                          │
│ ┌─────────────────────────┐                                             │
│ │ http.ts (Webhook)       │                                             │
│ │ - /webhooks/clerk       │                                             │
│ │ - Signature verify      │                                             │
│ │ - Event dispatch        │                                             │
│ └─────────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Data Boundaries

| Table | Access Pattern | Branch Isolation |
|-------|---------------|------------------|
| `users` (extended) | by_clerk_user_id, by_branch | ✅ Required for branch-scoped roles |
| `permissionAuditLog` | by_user, by_changed_by | ✅ Filtered by accessible users |
| `branches` (extended) | by_clerk_org_id | N/A (system-level) |

### Requirements to Structure Mapping

#### FR Category → File Mapping

| FR Category | Primary File(s) |
|-------------|-----------------|
| FR1-6 (Authentication) | `clerkAuth.ts`, `auth.ts`, `AuthContext.jsx` |
| FR7-13 (User Management) | `auth.ts`, `clerkSync.ts` (invites) |
| FR14-19 (Role & Permission) | `rbac.ts`, `roleUtils.ts`, `Require*.jsx` |
| FR20-25 (Branch/Org) | `clerkSync.ts`, `schema.ts` (branches extension) |
| FR26-32 (Data Access) | All queries (branch_id filtering) |
| FR33-35 (Audit) | `rbac.ts`, `permissionAuditLog` table |
| FR36-39 (Migration) | `auth.ts` (migration helpers) |
| FR40-44 (Webhook) | `http.ts`, `clerkSync.ts` |
| FR45-48 (Barber) | Existing services (no changes) |

#### Cross-Cutting Concerns → Location

| Concern | Location |
|---------|----------|
| Branch Isolation | Every query in services uses `by_branch` index |
| JWT Verification | `clerkAuth.ts` used by all mutations |
| Permission Checks | `rbac.ts checkPermission()` called by all mutations |
| Audit Logging | `rbac.ts` logs to `permissionAuditLog` |
| Error Handling | ConvexError with codes defined in each service |
| Real-time Updates | Automatic via Convex subscriptions |

### Integration Points

#### Internal Communication

| From | To | Pattern |
|------|-----|---------|
| UI components | Auth context | `useAuth()` hook from Clerk |
| UI components | Permission check | `useQuery(api.services.rbac.getUserPermissions)` |
| Mutations | Permission verify | `checkPermission(ctx, page, action)` |
| Webhook handler | Sync service | `ctx.runMutation(api.services.clerkSync.handle*)` |
| Auth service | Clerk SDK | Actions for external API calls |

#### External Integrations

| Integration | Entry Point | Direction |
|-------------|-------------|-----------|
| Clerk Auth API | `clerkSync.ts` actions | Outbound (fetch) |
| Clerk Webhooks | `http.ts /webhooks/clerk` | Inbound (POST) |
| Clerk React SDK | `ClerkProvider` in `main.jsx` | Client-side |

### Data Flow

```
User Logs In
     │
     ▼
┌─────────────────────────────────┐
│ Clerk Handles Authentication     │
│ - Email/password or SSO         │
│ - MFA verification              │
│ - Session token created         │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ ClerkProvider                    │
│ - JWT available in React        │
│ - Pass to ConvexProviderWithClerk│
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Convex Query/Mutation            │
│ - ctx.auth.getUserIdentity()    │
│ - Get clerk_user_id from token  │
│ - Lookup user in Convex DB      │
│ - Check role and page_access    │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ Execute Operation               │
│ - Apply branch_id filter        │
│ - Return data to frontend       │
│ - Real-time subscription active │
└─────────────────────────────────┘
```

### Service File Structure

**`convex/services/rbac.ts` Organization:**

```typescript
// ==================== QUERIES (read-only) ====================
export const getUserPermissions = query({ ... });  // Get current user's permissions
export const getAccessiblePages = query({ ... });   // Get pages user can access
export const canPerformAction = query({ ... });     // Check specific permission

// ==================== MUTATIONS (write) ====================
export const updatePageAccess = mutation({ ... });  // Update user's page_access
export const assignRole = mutation({ ... });        // Change user's role
export const logPermissionChange = mutation({ ... }); // Internal audit log

// ==================== HELPERS (internal) ====================
export async function checkPermission(ctx, page, action): Promise<boolean>;
export async function getCurrentUser(ctx): Promise<User | null>;
```

**`convex/services/clerkSync.ts` Organization:**

```typescript
// ==================== WEBHOOK HANDLERS (mutations) ====================
export const handleUserCreated = mutation({ ... });
export const handleUserUpdated = mutation({ ... });
export const handleUserDeleted = mutation({ ... });
export const handleOrgCreated = mutation({ ... });
export const handleOrgMembershipChanged = mutation({ ... });

// ==================== OUTBOUND ACTIONS (Clerk API calls) ====================
export const sendInvite = action({ ... });        // Send Clerk invitation
export const createOrganization = action({ ... }); // Create Clerk org for branch
export const addOrgMember = action({ ... });      // Add user to Clerk org
```

### Component File Structure

**`src/components/common/RequirePermission.jsx` Pattern:**

```jsx
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AccessDenied from "./AccessDenied";

export function RequirePermission({ page, action, children, fallback = <AccessDenied /> }) {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useQuery(api.services.rbac.getUserPermissions);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/login" />;
  if (user === undefined) return <Skeleton />;

  // Super admin bypasses all checks
  if (user.role === "super_admin") return children;

  // Check specific permission
  const hasPermission = user.page_access?.[page]?.[action] ?? false;
  if (!hasPermission) return fallback;

  return children;
}
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
| Check | Status | Notes |
|-------|--------|-------|
| Convex + Clerk SDK | ✅ Pass | Official ConvexProviderWithClerk pattern supported |
| TypeScript + Clerk types | ✅ Pass | @clerk/types provides TypeScript definitions |
| React 19 + Clerk React | ✅ Pass | Clerk React SDK compatible with React 19 |
| TailwindCSS 4 + shadcn/ui | ✅ Pass | Existing UI patterns unchanged |

**Pattern Consistency:**
| Check | Status | Notes |
|-------|--------|-------|
| Naming conventions | ✅ Pass | `clerk_` prefix for external IDs follows existing patterns |
| Error handling | ✅ Pass | ConvexError with codes matches existing pattern |
| Branch isolation | ✅ Pass | All queries use by_branch index |
| Audit logging | ✅ Pass | permissionAuditLog follows existing table patterns |

**Structure Alignment:**
| Check | Status | Notes |
|-------|--------|-------|
| Service location | ✅ Pass | `convex/services/rbac.ts` follows pattern |
| Component locations | ✅ Pass | Common components in `src/components/common/` |
| HTTP endpoints | ✅ Pass | Webhook in `convex/http.ts` follows PayMongo pattern |
| Lib helpers | ✅ Pass | `convex/lib/` for shared utilities |

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (48 FRs):**

| FR Category | FRs | Architecture Support | Status |
|-------------|-----|---------------------|--------|
| Authentication & Session | FR1-6 | Clerk SDK, JWT verification | ✅ Covered |
| User Management | FR7-13 | auth.ts, clerkSync.ts (invites) | ✅ Covered |
| Role & Permission | FR14-19 | rbac.ts, roleUtils.ts, UI components | ✅ Covered |
| Branch/Organization | FR20-25 | Clerk Organizations ↔ Branches sync | ✅ Covered |
| Data Access Control | FR26-32 | branch_id filtering, role checks | ✅ Covered |
| Audit & Compliance | FR33-35 | permissionAuditLog table | ✅ Covered |
| Migration | FR36-39 | Dual strategy (invite + auto-import) | ✅ Covered |
| Webhook & Sync | FR40-44 | http.ts webhook handler, clerkSync.ts | ✅ Covered |
| Barber-Specific | FR45-48 | Existing services (no changes needed) | ✅ Covered |

**Non-Functional Requirements Coverage (18 NFRs):**

| NFR Category | Requirement | Architecture Support | Status |
|--------------|-------------|---------------------|--------|
| Performance | Permission check <10s | Convex indexes, in-memory checks | ✅ Covered |
| Performance | Nav render <2s | Convex subscriptions | ✅ Covered |
| Security | 100% branch isolation | branch_id on all queries | ✅ Covered |
| Security | Zero escalation | Server-side role validation | ✅ Covered |
| Security | JWT verification | verifyClerkToken() on mutations | ✅ Covered |
| Security | Webhook signatures | Svix verification | ✅ Covered |
| Integration | 99.9% webhook | Clerk managed infrastructure | ✅ Covered |
| Integration | Retry logic | Clerk handles retries | ✅ Covered |
| Reliability | 99.9% auth | Clerk SLA | ✅ Covered |
| Reliability | <5s sync | Webhook + Convex real-time | ✅ Covered |
| Reliability | 1hr rollback | Feature flags for cutover | ✅ Covered |
| Reliability | Zero data loss | Preserve legacy fields during migration | ✅ Covered |

### Implementation Readiness Validation ✅

**Decision Completeness:**
| Element | Status | Notes |
|---------|--------|-------|
| Table schemas | ✅ Complete | Full TypeScript with validators |
| Service functions | ✅ Complete | Queries, mutations, actions defined |
| Error codes | ✅ Complete | AUTH_*, PERMISSION_* codes defined |
| Access control | ✅ Complete | 6-role matrix documented |

**Structure Completeness:**
| Element | Status | Notes |
|---------|--------|-------|
| New files (9) | ✅ Listed | Purpose and PRD reference for each |
| Modified files (5) | ✅ Listed | Specific changes documented |
| Data flow | ✅ Documented | End-to-end auth flow |
| Component boundaries | ✅ Defined | Auth, Authorization, Backend boundaries |

**Pattern Completeness:**
| Element | Status | Notes |
|---------|--------|-------|
| Naming patterns | ✅ Complete | clerk_* prefix for external IDs |
| Permission patterns | ✅ Complete | checkPermission() helper |
| Audit log pattern | ✅ Complete | Before/after logging |
| Webhook pattern | ✅ Complete | Verify-then-process flow |
| Role hierarchy | ✅ Complete | Helper functions, not string comparisons |
| UI components | ✅ Complete | RequireAuth, RequireRole, RequirePermission |

### Gap Analysis Results

**Critical Gaps:** None identified ✅

**Important Gaps:**
| Gap | Impact | Recommendation |
|-----|--------|----------------|
| Test file structure | Medium | Add `__tests__/rbac.test.ts` to file inventory during Epics |
| Migration rollback | Medium | Document specific rollback procedures |

**Nice-to-Have Gaps:**
| Gap | Impact | When to Address |
|-----|--------|-----------------|
| Permission templates | Low | Post-MVP (Phase 2) |
| Activity dashboard | Low | Post-MVP (Phase 3) |
| Impersonation feature | Low | Post-MVP (Phase 3) |

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (48 FRs, 18 NFRs)
- [x] Scale and complexity assessed (Medium-High)
- [x] Technical constraints identified (brownfield integration)
- [x] Cross-cutting concerns mapped (7 concerns)

**✅ Architectural Decisions**
- [x] Critical decisions documented with specific versions
- [x] Technology stack fully specified (locked per project-context.md)
- [x] Integration patterns defined (Clerk SDK, webhooks, Convex)
- [x] Security considerations addressed (JWT, signatures, RBAC)

**✅ Implementation Patterns**
- [x] Naming conventions established (8 patterns aligned with project-context)
- [x] Clerk-specific patterns defined (5 new patterns)
- [x] Communication patterns specified (internal + external integrations)
- [x] Process patterns documented (webhook flow, permission checks, error handling)

**✅ Project Structure**
- [x] Complete file inventory defined (9 new, 5 modified)
- [x] Component boundaries established (3 boundaries)
- [x] Integration points mapped (4 internal, 2 external)
- [x] FR to file mapping complete (9 categories → specific files)

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY FOR IMPLEMENTATION**

**Confidence Level:** HIGH

**Key Strengths:**
1. Full alignment with existing project-context.md patterns
2. Comprehensive security architecture (JWT + signatures + RBAC)
3. Clear data flow from login → permission check → action
4. Immutable audit trail for all permission changes
5. Brownfield-appropriate scope (minimal new components, extend existing)
6. Dual migration strategy provides flexibility

**Areas for Future Enhancement:**
1. Permission templates for quick role assignment (Phase 2)
2. Time-based access restrictions (Phase 2)
3. Impersonation for support (Phase 3)
4. Activity dashboard for compliance (Phase 3)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Use `convex/lib/clerkAuth.ts` for ALL JWT verification
- Use `convex/lib/roleUtils.ts` for ALL role comparisons
- Log ALL permission changes to `permissionAuditLog`
- Verify webhook signatures BEFORE any database operations

**Implementation Priority:**
1. Add Clerk fields to `users` table and add `permissionAuditLog` table in `convex/schema.ts`
2. Create `convex/lib/clerkAuth.ts` and `convex/lib/roleUtils.ts` helpers
3. Create `convex/services/rbac.ts` with permission check queries/mutations
4. Add webhook route to `convex/http.ts`
5. Create `convex/services/clerkSync.ts` for webhook handlers
6. Update `src/main.jsx` with ClerkProvider
7. Create permission-aware UI components
8. Integrate with existing auth context for migration
9. User migration (invite + import)
10. Legacy auth removal (cutover)

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-28
**Document Location:** `_bmad-output/planning-artifacts/architecture-clerk-rbac.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**
- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**
- 15+ critical/important architectural decisions made
- 8 implementation patterns defined
- 14 files specified (9 new, 5 modified)
- 48 FRs + 18 NFRs fully supported

**📚 AI Agent Implementation Guide**
- Technology stack with verified versions (locked per project-context.md)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Development Sequence

1. **Schema Changes** - Extend `users` table, add `permissionAuditLog` table
2. **Clerk Helpers** - Create `convex/lib/clerkAuth.ts` and `roleUtils.ts`
3. **RBAC Service** - Create `convex/services/rbac.ts`
4. **Webhook Handler** - Add `/webhooks/clerk` to `convex/http.ts`
5. **Clerk Sync Service** - Create `convex/services/clerkSync.ts`
6. **Frontend Provider** - Update `src/main.jsx` with ClerkProvider
7. **Permission Components** - Create RequireAuth, RequireRole, RequirePermission
8. **Auth Context Migration** - Integrate Clerk with existing AuthContext
9. **User Migration** - Execute dual strategy (invite + auto-import)
10. **Legacy Removal** - Remove old auth system (cutover)

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All 48 functional requirements are supported
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

