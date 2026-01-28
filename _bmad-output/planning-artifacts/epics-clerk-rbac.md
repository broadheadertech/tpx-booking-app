---
stepsCompleted: [1]
inputDocuments:
  - _bmad-output/planning-artifacts/prd-clerk-rbac.md
  - _bmad-output/planning-artifacts/architecture-clerk-rbac.md
feature_name: 'Clerk Authentication + RBAC'
---

# Clerk Authentication + RBAC - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Clerk Authentication + RBAC feature, decomposing the 48 functional requirements and 18 non-functional requirements from the PRD into implementable stories following the Architecture's 10-step implementation sequence.

## Requirements Inventory

### Functional Requirements

**Authentication & Session Management (FR1-6)**
- FR1: Users can log in via Clerk using email/password
- FR2: Users can log in via Clerk using Google SSO
- FR3: Users can set up multi-factor authentication (MFA)
- FR4: Users can reset their password via Clerk self-service
- FR5: Users can log out and terminate their session
- FR6: System can verify Clerk JWT tokens server-side before executing mutations

**User Management (FR7-13)**
- FR7: Super Admin can create users with any role
- FR8: Super Admin can delete users from the system
- FR9: Admin Staff can create users at branch level (Staff, Barber, Customer)
- FR10: Branch Admin can create Staff and Barber users for their branch
- FR11: Branch Admin can configure page_access permissions for Staff users
- FR12: Users can receive Clerk invite emails to set up their accounts
- FR13: System can display user lists filtered by branch for branch-scoped roles

**Role & Permission Management (FR14-19)**
- FR14: System can enforce 6 distinct roles: Super Admin, Admin Staff, Branch Admin, Staff, Customer, Barber
- FR15: System can restrict page access based on user's role and page_access configuration
- FR16: System can restrict actions (View/Create/Edit/Delete/Approve) per page per role
- FR17: Staff users can only see navigation items they have access to
- FR18: Users can see graceful "No Access" messaging when attempting restricted actions
- FR19: Permission changes can take effect in real-time without user re-login

**Branch/Organization Management (FR20-25)**
- FR20: Super Admin can create new branches in the system
- FR21: System can automatically create Clerk Organization when branch is created
- FR22: Super Admin can assign users to branches
- FR23: Admin Staff can switch branch context to view any branch's data
- FR24: Branch Admin can only see and manage their assigned branch
- FR25: System can sync Clerk Organization membership with branch assignments

**Data Access Control (FR26-32)**
- FR26: All queries can filter data by branch_id for branch-scoped roles
- FR27: Barbers can only view their own schedule and earnings
- FR28: Barbers cannot view other barbers' financial data
- FR29: Customers can only view and manage their own bookings
- FR30: Customers can cancel bookings within configurable time window (default 2 hours)
- FR31: Customers can reschedule bookings within configurable time window
- FR32: System can display clear messaging when cancel/reschedule window has passed

**Audit & Compliance (FR33-35)**
- FR33: System can log all permission changes with who, what, when, and previous value
- FR34: System can track user role assignments and changes
- FR35: System can maintain audit trail accessible to Super Admin

**Migration & Onboarding (FR36-39)**
- FR36: System can import existing users into Clerk via invite-based migration
- FR37: System can import existing users into Clerk via automatic bulk import
- FR38: System can map existing user roles to new 6-role system
- FR39: System can preserve existing user data during migration

**Webhook & Sync (FR40-44)**
- FR40: System can receive and process Clerk webhooks for user creation
- FR41: System can receive and process Clerk webhooks for user updates
- FR42: System can receive and process Clerk webhooks for user deletion
- FR43: System can verify webhook signatures for security
- FR44: System can handle webhook failures with retry logic

**Barber-Specific Capabilities (FR45-48)**
- FR45: Barbers can view their weekly schedule
- FR46: Barbers can submit cash advance requests
- FR47: Branch Admin can approve/reject cash advance requests
- FR48: Barbers can view cash advance request status in real-time

### Non-Functional Requirements

**Performance (NFR1-4)**
- NFR1: Permission check latency < 10 seconds
- NFR2: Navigation render after permission change < 2 seconds
- NFR3: Login/logout response time < 3 seconds
- NFR4: Branch context switch < 2 seconds

**Security (NFR5-10)**
- NFR5: Branch data isolation 100% enforced
- NFR6: Role escalation vulnerabilities zero
- NFR7: JWT token verification for all mutations
- NFR8: Webhook signature verification for all webhooks
- NFR9: Permission audit trail complete
- NFR10: Session security Clerk-managed with MFA support

**Integration (NFR11-14)**
- NFR11: Webhook delivery reliability 99.9%
- NFR12: Webhook retry on failure (3 retries with backoff)
- NFR13: Dead letter queue for all failed webhooks
- NFR14: Clerk API availability per standard Clerk SLA

**Reliability (NFR15-18)**
- NFR15: Auth system availability 99.9% (Clerk SLA)
- NFR16: Permission sync consistency < 5 seconds
- NFR17: Rollback capability within 1 hour
- NFR18: Migration data integrity zero data loss

### Additional Requirements (from Architecture)

**Brownfield Integration Requirements:**
- This is an extension of existing codebase, not a greenfield project
- Must preserve existing user relationships (bookings, payments, etc.)
- Dual auth system required during transition period
- Feature flags needed: ENABLE_CLERK_AUTH, ENABLE_LEGACY_AUTH, MIGRATION_MODE

**Technical Implementation Requirements:**
- Extend `users` table with: clerk_user_id, clerk_org_ids, page_access, migration_status
- Extend `branches` table with: clerk_org_id
- Create new `permissionAuditLog` table
- Create `convex/lib/clerkAuth.ts` and `convex/lib/roleUtils.ts` helpers
- Create `convex/services/rbac.ts` and `convex/services/clerkSync.ts` services
- Webhook handler in `convex/http.ts` with Svix signature verification
- 5 new permission UI components in `src/components/common/`

**Dependencies (from Architecture):**
```
Schema (1) → Webhook (3) → RBAC Service (4) → Auth Context (5) → UI Components (6) → Migration (7) → Cutover (8)
```

**Environment Variables Required:**
- VITE_CLERK_PUBLISHABLE_KEY (frontend)
- CLERK_SECRET_KEY (Convex dashboard)
- CLERK_WEBHOOK_SECRET (Convex dashboard)

### FR Coverage Map

{{requirements_coverage_map}}

## Epic List

{{epics_list}}

