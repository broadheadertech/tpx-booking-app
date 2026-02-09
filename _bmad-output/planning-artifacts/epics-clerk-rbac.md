---
stepsCompleted: [1, 2, 3, 4]
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

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Login via email/password |
| FR2 | Epic 1 | Login via Google SSO |
| FR3 | Epic 1 | MFA setup |
| FR4 | Epic 1 | Password reset self-service |
| FR5 | Epic 1 | Logout and session termination |
| FR6 | Epic 1 | JWT token verification |
| FR7 | Epic 3 | Super Admin create users |
| FR8 | Epic 3 | Super Admin delete users |
| FR9 | Epic 3 | Admin Staff create branch users |
| FR10 | Epic 3 | Branch Admin create Staff/Barber |
| FR11 | Epic 3 | Branch Admin configure page_access |
| FR12 | Epic 3 | Clerk invite emails |
| FR13 | Epic 3 | User lists filtered by branch |
| FR14 | Epic 2 | 6 distinct roles enforcement |
| FR15 | Epic 2 | Page access restrictions |
| FR16 | Epic 2 | Action restrictions per page |
| FR17 | Epic 2 | Navigation filtering |
| FR18 | Epic 2 | Graceful "No Access" messaging |
| FR19 | Epic 2 | Real-time permission updates |
| FR20 | Epic 4 | Super Admin create branches |
| FR21 | Epic 4 | Auto-create Clerk Organization |
| FR22 | Epic 4 | Assign users to branches |
| FR23 | Epic 4 | Admin Staff switch branch context |
| FR24 | Epic 4 | Branch Admin single branch view |
| FR25 | Epic 4 | Sync Clerk Org membership |
| FR26 | Epic 4 | Query filtering by branch_id |
| FR27 | Epic 4 | Barber own schedule/earnings only |
| FR28 | Epic 4 | Barber financial data isolation |
| FR29 | Epic 4 | Customer own bookings only |
| FR30 | Epic 4 | Customer cancel within time window |
| FR31 | Epic 4 | Customer reschedule within time window |
| FR32 | Epic 4 | Cancel/reschedule window messaging |
| FR33 | Epic 3 | Log permission changes |
| FR34 | Epic 3 | Track role assignments |
| FR35 | Epic 3 | Audit trail for Super Admin |
| FR36 | Epic 5 | Invite-based migration |
| FR37 | Epic 5 | Automatic bulk import |
| FR38 | Epic 5 | Role mapping to 6-role system |
| FR39 | Epic 5 | Preserve user data during migration |
| FR40 | Epic 1 | Webhook for user creation |
| FR41 | Epic 1 | Webhook for user updates |
| FR42 | Epic 1 | Webhook for user deletion |
| FR43 | Epic 1 | Webhook signature verification |
| FR44 | Epic 1 | Webhook failure retry logic |
| FR45 | Epic 4 | Barber view weekly schedule |
| FR46 | Epic 4 | Barber submit cash advance |
| FR47 | Epic 4 | Branch Admin approve/reject cash advance |
| FR48 | Epic 4 | Barber view cash advance status |

## Epic List

### Epic 1: Clerk Authentication Foundation
Users can securely log in using Clerk with modern authentication features (SSO, MFA, password reset) while the system maintains sync between Clerk and Convex.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR40, FR41, FR42, FR43, FR44

**User Value:** Users experience a modern, secure login with Google SSO, MFA setup, and self-service password reset - replacing the custom auth system.

---

### Epic 2: Role-Based Access Control
Staff users see only the navigation items and actions appropriate to their role, with graceful handling of access restrictions.

**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19

**User Value:** Clean, focused interface - staff don't see confusing irrelevant options. Permission changes take effect immediately without re-login.

---

### Epic 3: User Administration & Audit Trail
Admins can create users, assign roles, configure page-level permissions, and track all permission changes via an audit trail.

**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR33, FR34, FR35

**User Value:** Full control over team access with complete history. Super Admin has visibility into who changed what and when.

---

### Epic 4: Multi-Tenant Data Isolation
Branch data is properly isolated - staff see only their branch's data, barbers see only their own schedules and earnings, customers see only their bookings.

**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR45, FR46, FR47, FR48

**User Value:** Secure branch operations with proper data boundaries. Barbers have focused view of their schedules and cash advance requests.

---

### Epic 5: Seamless User Migration
Existing users are migrated to Clerk authentication without service disruption, with role mapping preserved.

**FRs covered:** FR36, FR37, FR38, FR39

**User Value:** Smooth transition for all existing staff and customers - no lost data, no re-registration required.

---

## Epic 1: Clerk Authentication Foundation

Users can securely log in using Clerk with modern authentication features (SSO, MFA, password reset) while the system maintains sync between Clerk and Convex via webhooks.

### Story 1.1: Schema Extension for Clerk Integration

As a **developer**,
I want to extend the database schema with Clerk-related fields,
So that the system can store Clerk user IDs, organization mappings, and permission configurations.

**Acceptance Criteria:**

**Given** the existing `users` table in `convex/schema.ts`
**When** I deploy the schema changes
**Then** the `users` table includes new fields:
- `clerk_user_id` (optional string) with index `by_clerk_user_id`
- `clerk_org_ids` (optional array of strings)
- `page_access` (optional object with 30 page permission objects) - migrating from current array-based structure
- `migration_status` (optional union: "pending" | "invited" | "completed")
- `legacy_password_hash` (optional string for rollback)
**And** the `role` field accepts: "super_admin", "admin_staff", "branch_admin", "staff", "customer", "barber"
**And** the page_access object includes all Staff Dashboard pages (24): overview, reports, bookings, custom_bookings, calendar, walkins, pos, barbers, users, services, customers, products, order_products, vouchers, payroll, cash_advances, royalty, pl, balance_sheet, payments, payment_history, attendance, events, notifications, email_marketing
**And** the page_access object includes Admin Dashboard pages (6 additional): branches, catalog, branding, emails, settings
**And** each page has 5 action permissions: view, create, edit, delete, approve
**And** always-accessible pages (overview, custom_bookings, walkins) bypass permission checks

**Given** the existing `branches` table
**When** I deploy the schema changes
**Then** the `branches` table includes:
- `clerk_org_id` (optional string) with index `by_clerk_org_id`

**Given** the schema changes are deployed
**When** I create a new `permissionAuditLog` table
**Then** the table includes fields:
- `user_id` (id to users)
- `changed_by` (id to users)
- `change_type` (union: role_changed, page_access_changed, branch_assigned, branch_removed, user_created, user_deleted)
- `previous_value` (optional string - JSON)
- `new_value` (string - JSON)
- `created_at` (number)
**And** indexes: `by_user`, `by_changed_by`, `by_created_at`

---

### Story 1.2: Clerk Provider and Auth Helpers Setup

As a **developer**,
I want to set up the Clerk SDK and authentication helpers,
So that the application can authenticate users via Clerk and verify JWT tokens server-side.

**Acceptance Criteria:**

**Given** the Clerk packages are not installed
**When** I install @clerk/clerk-react and svix packages
**Then** the packages are added to package.json dependencies

**Given** the frontend entry point `src/main.jsx`
**When** I wrap the application with ClerkProvider and ConvexProviderWithClerk
**Then** Clerk authentication context is available throughout the app
**And** the Clerk publishable key is loaded from `VITE_CLERK_PUBLISHABLE_KEY`

**Given** I need to verify Clerk JWTs server-side
**When** I create `convex/lib/clerkAuth.ts`
**Then** the file exports:
- `verifyClerkToken(ctx)` - returns Clerk user info or null
- `getCurrentUser(ctx)` - returns full user record from Convex DB
**And** uses `ctx.auth.getUserIdentity()` for token verification

**Given** environment variables are required
**When** I configure the Convex dashboard
**Then** `CLERK_SECRET_KEY` is set in Convex environment

---

### Story 1.3: Clerk Webhook Integration

As a **system administrator**,
I want the system to receive and process Clerk webhooks,
So that user changes in Clerk are automatically synced to the Convex database.

**Acceptance Criteria:**

**Given** Clerk sends webhook events for user changes
**When** I create the webhook handler in `convex/http.ts`
**Then** the endpoint `/webhooks/clerk` accepts POST requests
**And** extracts `svix-id`, `svix-timestamp`, `svix-signature` headers

**Given** a webhook request arrives
**When** the signature is invalid
**Then** return HTTP 401 "Invalid signature"
**And** log the verification failure

**Given** a webhook with valid signature
**When** the event type is `user.created`
**Then** call `clerkSync.handleUserCreated` mutation
**And** return HTTP 200

**Given** a webhook with valid signature
**When** the event type is `user.updated`
**Then** call `clerkSync.handleUserUpdated` mutation

**Given** a webhook with valid signature
**When** the event type is `user.deleted`
**Then** call `clerkSync.handleUserDeleted` mutation

**Given** I need to process webhook payloads
**When** I create `convex/services/clerkSync.ts`
**Then** the file exports mutations:
- `handleUserCreated` - creates/updates user with clerk_user_id
- `handleUserUpdated` - updates user email/name from Clerk
- `handleUserDeleted` - marks user as deleted (soft delete)
- `handleOrgCreated` - links Clerk org to branch
- `handleOrgMembershipChanged` - syncs org membership

**Given** webhook secret is required
**When** I configure Clerk dashboard webhook
**Then** `CLERK_WEBHOOK_SECRET` is set in Convex environment
**And** webhook is configured to send user.* and organization.* events

---

### Story 1.4: Complete Login Experience

As a **user**,
I want to log in using email/password or Google SSO,
So that I can access the booking application securely.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I enter my email and password
**Then** Clerk authenticates my credentials
**And** I am redirected to my role-appropriate dashboard
**And** my session is established

**Given** I am on the login page
**When** I click "Sign in with Google"
**Then** Clerk initiates Google OAuth flow
**And** I can authorize with my Google account
**And** I am redirected to my role-appropriate dashboard

**Given** I enter incorrect credentials
**When** I submit the login form
**Then** Clerk displays an error message
**And** I remain on the login page

**Given** I am a new Google SSO user
**When** I complete Google authentication
**Then** the webhook creates my user record in Convex
**And** I am assigned the "customer" role by default

**Given** I am logged in
**When** I navigate to any protected page
**Then** my Clerk session is validated
**And** I can access role-appropriate content

---

### Story 1.5: Multi-Factor Authentication Setup

As a **user**,
I want to set up multi-factor authentication,
So that my account has an additional layer of security.

**Acceptance Criteria:**

**Given** I am logged into my account
**When** I navigate to account security settings
**Then** I see an option to enable MFA

**Given** I choose to enable MFA
**When** I select authenticator app
**Then** Clerk displays a QR code
**And** I can scan it with my authenticator app

**Given** I have scanned the QR code
**When** I enter the verification code from my authenticator
**Then** MFA is enabled on my account
**And** I see confirmation that MFA is active

**Given** MFA is enabled on my account
**When** I log in with email/password
**Then** I am prompted for my MFA code
**And** I must enter the correct code to complete login

**Given** I want to disable MFA
**When** I navigate to security settings and disable MFA
**Then** I must verify my identity first
**And** MFA is removed from my account

---

### Story 1.6: Password Reset and Session Management

As a **user**,
I want to reset my password and manage my session,
So that I can recover access and securely end my session when needed.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I click "Forgot password"
**Then** I am prompted to enter my email address

**Given** I have entered my email for password reset
**When** I submit the form
**Then** Clerk sends a password reset email to my address
**And** I see confirmation that the email was sent

**Given** I received the password reset email
**When** I click the reset link
**Then** I am taken to a secure password reset page
**And** I can enter a new password

**Given** I have entered a new valid password
**When** I submit the new password
**Then** my password is updated in Clerk
**And** I am redirected to login with my new password

**Given** I am logged into the application
**When** I click "Log out"
**Then** my Clerk session is terminated
**And** I am redirected to the login page
**And** I cannot access protected pages without logging in again

**Given** I am logged in on multiple devices
**When** I log out from one device
**Then** only that device's session is terminated
**And** my other sessions remain active

---

## Epic 2: Role-Based Access Control

Staff users see only the navigation items and actions appropriate to their role, with graceful handling of access restrictions and real-time permission updates.

### Story 2.1: Role Hierarchy and Utility Functions

As a **developer**,
I want role hierarchy utilities that determine role capabilities,
So that permission checks are consistent throughout the application.

**Acceptance Criteria:**

**Given** I need to compare role levels
**When** I create `convex/lib/roleUtils.ts`
**Then** the file exports:
- `ROLE_HIERARCHY` object mapping roles to numeric levels (super_admin: 6, admin_staff: 5, branch_admin: 4, staff: 3, barber: 2, customer: 1)
- `hasRoleOrHigher(userRole, requiredRole)` - returns boolean
- `isBranchScoped(role)` - returns true for branch_admin, staff, barber

**Given** I check if a user has sufficient role level
**When** I call `hasRoleOrHigher("admin_staff", "branch_admin")`
**Then** the function returns `true`

**Given** I check if a role is branch-scoped
**When** I call `isBranchScoped("staff")`
**Then** the function returns `true`

**Given** I check if super_admin is branch-scoped
**When** I call `isBranchScoped("super_admin")`
**Then** the function returns `false`

---

### Story 2.2: RBAC Service with Permission Checking

As a **developer**,
I want a centralized RBAC service for permission validation,
So that all mutations can consistently check user permissions.

**Acceptance Criteria:**

**Given** I need to check permissions in mutations
**When** I create `convex/services/rbac.ts`
**Then** the file exports:
- `checkPermission(ctx, page, action)` - async function returning boolean
- `getUserPermissions` query - returns user's page_access and role
- `getAccessiblePages` query - returns list of pages user can view
- `canPerformAction` query - checks specific page/action permission

**Given** a super_admin user
**When** `checkPermission(ctx, "any_page", "any_action")` is called
**Then** the function returns `true` (super_admin bypasses all checks)

**Given** a staff user with `page_access.bookings.edit = true`
**When** `checkPermission(ctx, "bookings", "edit")` is called
**Then** the function returns `true`

**Given** a staff user with `page_access.bookings.delete = false`
**When** `checkPermission(ctx, "bookings", "delete")` is called
**Then** the function returns `false`

**Given** a user without page_access defined
**When** `checkPermission(ctx, "any_page", "any_action")` is called
**Then** the function returns `false` (deny by default)

**Given** a mutation needs to enforce permissions
**When** permission check fails
**Then** throw ConvexError with code "PERMISSION_DENIED"
**And** include message "You don't have permission to [action] [page]"

---

### Story 2.3: Permission-Aware UI Components

As a **developer**,
I want permission-aware wrapper components,
So that UI elements can conditionally render based on user permissions.

**Acceptance Criteria:**

**Given** I need to block pages for unauthenticated users
**When** I create `src/components/common/RequireAuth.jsx`
**Then** the component:
- Wraps children in auth check
- Redirects to login if not signed in
- Shows loading skeleton while checking auth

**Given** I need to check role level for a section
**When** I create `src/components/common/RequireRole.jsx`
**Then** the component:
- Accepts `role` prop (required role level)
- Uses `hasRoleOrHigher` to check
- Shows children if user has sufficient role
- Shows AccessDenied if insufficient

**Given** I need to check specific page/action permission
**When** I create `src/components/common/RequirePermission.jsx`
**Then** the component:
- Accepts `page` and `action` props
- Queries user's page_access
- Shows children if permission granted
- Shows fallback (default: AccessDenied) if denied

**Given** I need conditional rendering without blocking
**When** I create `src/components/common/PermissionGuard.jsx`
**Then** the component:
- Returns children if permission granted
- Returns fallback (default: null) if denied
- Does NOT throw or show error

---

### Story 2.4: Navigation Filtering by Permissions

As a **staff user**,
I want to see only navigation items I have access to,
So that I don't get confused by options I cannot use.

**Acceptance Criteria:**

**Given** I am logged in as a staff user
**When** I load the dashboard
**Then** the navigation menu queries `getAccessiblePages`
**And** only shows menu items for pages where `view: true`

**Given** I have `page_access.bookings.view = true` but `page_access.reports.view = false`
**When** I view the navigation menu
**Then** I see "Bookings" in the menu
**And** I do NOT see "Reports" in the menu

**Given** I am a super_admin
**When** I view the navigation menu
**Then** I see ALL navigation items

**Given** I am a barber
**When** I view my dashboard
**Then** I only see navigation items appropriate for barbers
**And** I do NOT see admin-only options

---

### Story 2.5: Access Denied Handling

As a **user**,
I want graceful messaging when I don't have permission,
So that I understand why I cannot access certain features.

**Acceptance Criteria:**

**Given** I need a consistent access denied message
**When** I create `src/components/common/AccessDenied.jsx`
**Then** the component displays:
- Clear heading "Access Denied"
- Message explaining the restriction
- Link/button to return to dashboard
- Styling consistent with app theme

**Given** I try to access a page I don't have view permission for
**When** RequirePermission blocks access
**Then** I see the AccessDenied component
**And** the message indicates I need permission to view this page

**Given** I try to perform an action I don't have permission for
**When** the server returns PERMISSION_DENIED error
**Then** I see a toast/alert with the error message
**And** the action is not completed

---

### Story 2.6: Real-Time Permission Updates

As an **admin**,
I want permission changes to take effect immediately,
So that users don't need to re-login after I update their access.

**Acceptance Criteria:**

**Given** a user's page_access is updated while they are logged in
**When** the Convex mutation completes
**Then** the user's UI re-renders via Convex subscription
**And** navigation items update to reflect new permissions
**And** no page refresh or re-login required

**Given** a user loses view permission for a page they are currently viewing
**When** the permission change takes effect
**Then** the page re-renders and shows AccessDenied
**And** navigation removes the menu item

**Given** a user gains new permission while on dashboard
**When** the permission change takes effect
**Then** new navigation items appear
**And** user can immediately access the new pages

---

## Epic 3: User Administration & Audit Trail

Admins can create users, assign roles, configure page-level permissions, and track all permission changes via an immutable audit trail.

### Story 3.1: Super Admin User Management

As a **Super Admin**,
I want to create and delete users with any role,
So that I have full control over the system's user base.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to User Management
**Then** I see a list of all users across all branches
**And** I see a "Create User" button

**Given** I click "Create User"
**When** I fill in user details (email, name, role, branch)
**Then** I can select any of the 6 roles
**And** I can assign the user to any branch
**And** clicking "Create" calls the create user mutation

**Given** I create a user with role "branch_admin"
**When** the mutation completes
**Then** the user is created in the database
**And** a Clerk invite is sent (if invite mode enabled)
**And** an audit log entry is created with change_type "user_created"

**Given** I want to delete a user
**When** I click "Delete" on a user row
**Then** I see a confirmation dialog
**And** confirming calls the delete mutation
**And** the user is soft-deleted (not hard deleted)
**And** an audit log entry is created with change_type "user_deleted"

---

### Story 3.2: Admin Staff User Management

As an **Admin Staff**,
I want to create users at branch level,
So that I can help branches onboard their teams.

**Acceptance Criteria:**

**Given** I am logged in as Admin Staff
**When** I navigate to User Management
**Then** I see a list of users across all branches
**And** I can filter by branch

**Given** I click "Create User"
**When** I fill in user details
**Then** I can select roles: staff, barber, customer
**And** I CANNOT select: super_admin, admin_staff, branch_admin
**And** I must assign a branch

**Given** I try to create a user with a restricted role
**When** I submit the form
**Then** the server rejects with PERMISSION_ROLE_INSUFFICIENT
**And** I see an error message

**Given** I want to edit a user's details
**When** I click "Edit" on a user
**Then** I can update their name and email
**And** I CANNOT change their role to super_admin or admin_staff

---

### Story 3.3: Branch Admin User Management

As a **Branch Admin**,
I want to create Staff and Barber users for my branch,
So that I can manage my team independently.

**Acceptance Criteria:**

**Given** I am logged in as Branch Admin
**When** I navigate to User Management
**Then** I see only users in my branch
**And** I cannot see users from other branches

**Given** I click "Create User"
**When** I fill in user details
**Then** I can only select roles: staff, barber
**And** the branch is automatically set to my branch (not changeable)

**Given** I want to configure a staff user's page_access
**When** I click "Configure Permissions" on a staff user
**Then** I see a permission matrix with all 30 pages (24 Staff Dashboard + 6 Admin)
**And** I can toggle view/create/edit/delete/approve for each page
**And** pages are grouped by category (Operations, Staff, Products, Finance, HR, Communications)

**Given** I save page_access changes
**When** the mutation completes
**Then** the user's permissions are updated
**And** an audit log entry is created with change_type "page_access_changed"
**And** the entry includes previous and new values

---

### Story 3.4: Clerk Invite Integration

As an **admin**,
I want new users to receive Clerk invite emails,
So that they can set up their own passwords securely.

**Acceptance Criteria:**

**Given** I create a new user
**When** the invite mode feature flag is enabled
**Then** a Clerk invite email is sent to the user's email
**And** the user's migration_status is set to "invited"

**Given** a user receives a Clerk invite
**When** they click the invite link
**Then** they are taken to Clerk's account setup page
**And** they can create their password
**And** upon completion, the webhook updates their clerk_user_id

**Given** the invite mode is disabled (auto-import mode)
**When** I create a new user
**Then** the user is created directly in Clerk
**And** a temporary password is generated
**And** the user is prompted to change password on first login

**Given** a user's invite is pending
**When** I view the user list
**Then** I see their migration_status as "invited"
**And** I can resend the invite if needed

---

### Story 3.5: User Listing with Branch Filter

As a **branch-scoped admin**,
I want to view user lists filtered by my branch,
So that I only see relevant team members.

**Acceptance Criteria:**

**Given** I am logged in as Branch Admin
**When** I navigate to User Management
**Then** the user list is automatically filtered to my branch
**And** I do NOT have a branch filter dropdown

**Given** I am logged in as Admin Staff
**When** I navigate to User Management
**Then** I see a branch filter dropdown
**And** I can select "All Branches" or a specific branch
**And** the user list filters accordingly

**Given** I am logged in as Super Admin
**When** I navigate to User Management
**Then** I see all users by default
**And** I can filter by branch, role, or search by name/email

**Given** I filter users by role "barber"
**When** the list updates
**Then** I only see users with role "barber"

---

### Story 3.6: Permission Change Audit Logging

As a **system**,
I want to log all permission changes automatically,
So that there is a complete audit trail.

**Acceptance Criteria:**

**Given** an admin changes a user's role
**When** the mutation completes
**Then** a permissionAuditLog entry is created with:
- user_id: the affected user
- changed_by: the admin making the change
- change_type: "role_changed"
- previous_value: JSON of old role
- new_value: JSON of new role
- created_at: current timestamp

**Given** an admin changes a user's page_access
**When** the mutation completes
**Then** a permissionAuditLog entry is created with:
- change_type: "page_access_changed"
- previous_value: JSON of old page_access
- new_value: JSON of new page_access

**Given** an admin assigns a user to a branch
**When** the mutation completes
**Then** a permissionAuditLog entry is created with:
- change_type: "branch_assigned"
- previous_value: JSON of old branch_id (or null)
- new_value: JSON of new branch_id

**Given** audit logging fails
**When** the audit insert throws an error
**Then** the main operation should still complete
**And** the error should be logged for investigation

---

### Story 3.7: Audit Trail Viewer for Super Admin

As a **Super Admin**,
I want to view the complete audit trail,
So that I can investigate permission changes and maintain compliance.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I navigate to Audit Trail
**Then** I see a list of all permission audit log entries
**And** entries are sorted by created_at descending (newest first)

**Given** I view the audit trail list
**When** I look at an entry
**Then** I see:
- Who was changed (user name/email)
- Who made the change (admin name/email)
- What changed (change_type)
- When it changed (formatted date/time)
- Previous and new values (expandable JSON)

**Given** I want to filter the audit trail
**When** I use the filter controls
**Then** I can filter by:
- User (who was affected)
- Admin (who made the change)
- Change type
- Date range

**Given** I click on an audit entry
**When** the detail view opens
**Then** I see full JSON of previous_value and new_value
**And** I can compare the before/after state

---

## Epic 4: Multi-Tenant Data Isolation

Branch data is properly isolated - staff see only their branch's data, barbers see only their own schedules and earnings, customers see only their bookings.

### Story 4.1: Branch Creation with Clerk Organization

As a **Super Admin**,
I want to create branches that automatically sync with Clerk Organizations,
So that multi-tenant isolation is enforced at the authentication layer.

**Acceptance Criteria:**

**Given** I am logged in as Super Admin
**When** I create a new branch
**Then** the branch is created in the database
**And** a corresponding Clerk Organization is created via Clerk API
**And** the branch's clerk_org_id is set to the Clerk Organization ID

**Given** a branch is created with Clerk Organization
**When** I view the branch details
**Then** I see the linked Clerk Organization ID
**And** I can verify the sync status

**Given** the Clerk API call fails during branch creation
**When** the error is caught
**Then** the branch creation is rolled back
**And** I see an error message explaining the failure

**Given** a Clerk Organization webhook arrives
**When** the event type is organization.created
**Then** the handler verifies if a matching branch exists
**And** links them if the organization was created externally

---

### Story 4.2: User Branch Assignment and Org Sync

As a **Super Admin**,
I want to assign users to branches with Clerk Organization membership sync,
So that branch isolation is enforced at both database and auth levels.

**Acceptance Criteria:**

**Given** I assign a user to a branch
**When** the mutation completes
**Then** the user's branch_id is updated
**And** the user is added to the branch's Clerk Organization
**And** the user's clerk_org_ids includes the new org ID
**And** an audit log entry is created with change_type "branch_assigned"

**Given** I remove a user from a branch
**When** the mutation completes
**Then** the user's branch_id is cleared
**And** the user is removed from the Clerk Organization
**And** the clerk_org_ids array is updated
**And** an audit log entry is created with change_type "branch_removed"

**Given** a Clerk organizationMembership webhook arrives
**When** the event type is organizationMembership.created
**Then** the handler updates the user's branch_id accordingly

**Given** a Clerk organizationMembership.deleted webhook arrives
**When** the handler processes it
**Then** the user's branch assignment is removed
**And** the system is in sync with Clerk

---

### Story 4.3: Admin Staff Branch Context Switching

As an **Admin Staff**,
I want to switch branch context to view any branch's data,
So that I can support multiple branches from a single interface.

**Acceptance Criteria:**

**Given** I am logged in as Admin Staff
**When** I view the dashboard header
**Then** I see a branch selector dropdown
**And** it lists all branches I have access to

**Given** I select a different branch from the dropdown
**When** the selection changes
**Then** all data on the page reloads for the selected branch
**And** bookings, staff, reports all filter to that branch
**And** the context switch completes in under 2 seconds

**Given** I am viewing a specific branch's data
**When** I create or edit records
**Then** the records are associated with the selected branch
**And** branch_id is automatically set

**Given** I switch branch context
**When** the switch completes
**Then** a visual indicator shows the current branch
**And** the indicator is prominent in the header

---

### Story 4.4: Branch Admin Single Branch Enforcement

As a **Branch Admin**,
I want to only see and manage my assigned branch,
So that I cannot accidentally access other branches' data.

**Acceptance Criteria:**

**Given** I am logged in as Branch Admin
**When** I view the dashboard
**Then** I do NOT see a branch selector dropdown
**And** my branch is displayed in the header (read-only)

**Given** I query any data (bookings, staff, reports)
**When** the query executes
**Then** it automatically filters by my branch_id
**And** I only see records for my branch

**Given** I try to access another branch's data via URL manipulation
**When** the query/mutation runs with a different branch_id
**Then** the server rejects with PERMISSION_BRANCH_MISMATCH
**And** I see an error message

**Given** I create new records (bookings, users, etc.)
**When** I submit the form
**Then** the branch_id is automatically set to my branch
**And** I cannot change the branch assignment

---

### Story 4.5: Query-Level Branch Filtering

As a **developer**,
I want all queries to automatically filter by branch_id,
So that branch isolation is enforced at the data layer.

**Acceptance Criteria:**

**Given** a branch-scoped user (branch_admin, staff, barber) queries data
**When** any query is executed (bookings, services, products, etc.)
**Then** the query automatically includes branch_id filter
**And** only records matching the user's branch are returned

**Given** a query helper function is needed
**When** I implement the branch filtering logic
**Then** it uses the by_branch index for efficient queries
**And** it throws PERMISSION_BRANCH_MISMATCH if branch mismatch detected

**Given** an admin_staff user with branch context set
**When** they query data
**Then** the query filters by the selected branch context
**And** not by their personal branch_id (since they can view all)

**Given** a super_admin queries data
**When** no branch filter is specified
**Then** they see data from all branches
**And** they can optionally filter by branch

---

### Story 4.6: Barber Personal Data Isolation

As a **Barber**,
I want to only see my own schedule and earnings,
So that my data is private and I'm not distracted by others' information.

**Acceptance Criteria:**

**Given** I am logged in as a Barber
**When** I view my schedule
**Then** I only see my own bookings and appointments
**And** I cannot see other barbers' schedules

**Given** I view my earnings
**When** the earnings data loads
**Then** I only see my own earnings and commissions
**And** I cannot see other barbers' financial data

**Given** I try to access another barber's data via API
**When** the query/mutation runs with another barber's ID
**Then** the server returns empty results or PERMISSION_DENIED
**And** I cannot view their personal information

**Given** I view the barber list in booking UI
**When** the list loads
**Then** I can see other barbers' names (for coordination)
**And** I CANNOT see their earnings, commissions, or schedules

---

### Story 4.7: Customer Booking Self-Service

As a **Customer**,
I want to view and manage only my own bookings,
So that my booking history is private and manageable.

**Acceptance Criteria:**

**Given** I am logged in as a Customer
**When** I view My Bookings
**Then** I only see bookings where I am the customer
**And** I cannot see other customers' bookings

**Given** I have an upcoming booking within 2 hours
**When** I try to cancel it
**Then** the cancellation succeeds
**And** I see confirmation of cancellation

**Given** I have a booking less than 2 hours away
**When** I try to cancel it
**Then** the cancellation is blocked
**And** I see a message: "Cancellations must be made at least 2 hours before your appointment"

**Given** I have an upcoming booking within the reschedule window
**When** I click "Reschedule"
**Then** I can select a new date/time
**And** the booking is updated

**Given** I have a booking outside the reschedule window
**When** I try to reschedule
**Then** I see a message explaining the time window has passed
**And** I'm directed to contact the branch

---

### Story 4.8: Barber Schedule and Cash Advance

As a **Barber**,
I want to view my weekly schedule and manage cash advance requests,
So that I can plan my work and access funds when needed.

**Acceptance Criteria:**

**Given** I am logged in as a Barber
**When** I view my Dashboard
**Then** I see my weekly schedule with all my appointments
**And** the schedule shows dates, times, and customer names

**Given** I need a cash advance
**When** I navigate to Cash Advance section
**Then** I see a form to request a cash advance
**And** I can enter the amount and reason

**Given** I submit a cash advance request
**When** the form is submitted
**Then** the request is created with status "pending"
**And** I see confirmation that my request is submitted
**And** the Branch Admin is notified

**Given** I have pending cash advance requests
**When** I view my cash advance history
**Then** I see all my requests with their current status
**And** status updates appear in real-time (via Convex subscription)

**Given** my cash advance is approved or rejected
**When** the Branch Admin makes the decision
**Then** I see the status change immediately
**And** I receive notification of the decision

---

### Story 4.9: Branch Admin Cash Advance Approval

As a **Branch Admin**,
I want to approve or reject cash advance requests,
So that I can manage branch finances responsibly.

**Acceptance Criteria:**

**Given** I am logged in as Branch Admin
**When** I navigate to Cash Advance Management
**Then** I see all pending requests from barbers in my branch
**And** requests are sorted by date (oldest first)

**Given** I view a cash advance request
**When** I click on it
**Then** I see the barber's name, requested amount, reason, and date
**And** I see buttons for "Approve" and "Reject"

**Given** I approve a cash advance request
**When** I click "Approve"
**Then** the request status changes to "approved"
**And** the barber is notified
**And** the cash advance is recorded for payroll integration

**Given** I reject a cash advance request
**When** I click "Reject"
**Then** I can optionally enter a rejection reason
**And** the request status changes to "rejected"
**And** the barber is notified with the reason

---

## Epic 5: Seamless User Migration

Existing users are migrated to Clerk authentication without service disruption, with role mapping preserved and data integrity maintained.

### Story 5.1: Migration Status Tracking

As a **system**,
I want to track each user's migration status,
So that we know which users have been migrated to Clerk.

**Acceptance Criteria:**

**Given** an existing user has not been migrated
**When** I view their user record
**Then** their migration_status is "pending" or null

**Given** a user has been sent a Clerk invite
**When** the invite is sent
**Then** their migration_status is updated to "invited"

**Given** a user completes their Clerk account setup
**When** the webhook confirms their clerk_user_id
**Then** their migration_status is updated to "completed"

**Given** I need to monitor migration progress
**When** I view the migration dashboard (Super Admin only)
**Then** I see counts of users by migration_status
**And** I can see lists of pending, invited, and completed users

---

### Story 5.2: Invite-Based User Migration

As a **Super Admin**,
I want to migrate users via Clerk invitations,
So that users can set up their own secure passwords.

**Acceptance Criteria:**

**Given** I want to migrate a single user
**When** I click "Send Migration Invite" on their profile
**Then** a Clerk invite is sent to their email
**And** their migration_status is set to "invited"

**Given** I want to bulk migrate users
**When** I select multiple users and click "Send Invites"
**Then** Clerk invites are sent to all selected users
**And** their migration_status is updated to "invited"

**Given** a user clicks their invite link
**When** they complete Clerk account setup
**Then** the webhook fires with their new clerk_user_id
**And** their Convex user record is updated
**And** migration_status becomes "completed"

**Given** an invite expires
**When** I view the user
**Then** I can resend the invite
**And** the previous invite is invalidated

---

### Story 5.3: Automatic Bulk Import Migration

As a **Super Admin**,
I want to automatically import users to Clerk in bulk,
So that migration can be completed quickly for large user bases.

**Acceptance Criteria:**

**Given** I want to bulk import users
**When** I trigger the bulk import action
**Then** users are created in Clerk with generated temporary passwords
**And** their clerk_user_id is immediately set

**Given** users are bulk imported
**When** they first log in
**Then** Clerk prompts them to change their password
**And** their migration_status remains "completed"

**Given** bulk import encounters an error for a specific user
**When** the error is caught
**Then** the error is logged
**And** other users continue to be processed
**And** a report shows which users failed

**Given** a user already has a clerk_user_id
**When** bulk import runs
**Then** that user is skipped (idempotent)

---

### Story 5.4: Role Mapping to 6-Role System

As a **system**,
I want to map existing roles to the new 6-role system,
So that users maintain appropriate access after migration.

**Acceptance Criteria:**

**Given** the existing system has different role names
**When** migration runs
**Then** roles are mapped according to the mapping table:
- "admin" → "super_admin"
- "manager" → "branch_admin"
- "staff" → "staff"
- "barber" → "barber"
- "customer" → "customer"
- New role "admin_staff" created for cross-branch ops

**Given** a user has a role not in the mapping
**When** migration processes them
**Then** they are assigned "customer" by default
**And** a warning is logged for manual review

**Given** role mapping completes
**When** the user logs in
**Then** their new role determines their access
**And** page_access defaults are applied based on role

---

### Story 5.5: Data Preservation During Migration

As a **system**,
I want to preserve all user data during migration,
So that no bookings, payments, or history is lost.

**Acceptance Criteria:**

**Given** a user has existing bookings
**When** they are migrated to Clerk
**Then** all booking relationships remain intact
**And** booking history is fully accessible

**Given** a user has payment history
**When** migration completes
**Then** all payment records remain linked to their user_id
**And** financial data is preserved

**Given** a user's password hash exists
**When** migration to Clerk begins
**Then** legacy_password_hash is preserved (for potential rollback)
**And** the field is not accessible via API

**Given** migration fails for a user
**When** rollback is needed
**Then** the user can still log in via legacy auth (if enabled)
**And** no data is lost

---

### Story 5.6: Page Access Structure Migration

As a **developer**,
I want to migrate the existing array-based page_access to object-based structure,
So that action-level permissions (view/create/edit/delete/approve) can be enforced.

**Acceptance Criteria:**

**Given** existing users have array-based page_access like `["bookings", "reports"]`
**When** the migration runs
**Then** the array is converted to object structure:
- Each array item becomes a page key with `{ view: true, create: true, edit: true, delete: true, approve: true }`
- Pages not in the array get `{ view: false, create: false, edit: false, delete: false, approve: false }`

**Given** the Staff Dashboard filters tabs using `user.page_access.includes(tabId)`
**When** migration completes
**Then** the filter logic is updated to use `user.page_access?.[tabId]?.view ?? false`
**And** always-accessible pages (overview, custom_bookings, walkins) bypass the check

**Given** a user has no page_access defined (null or undefined)
**When** the migration runs
**Then** a default page_access object is created based on their role:
- super_admin/admin_staff: all pages with all permissions true
- branch_admin: Staff Dashboard pages with all permissions true
- staff: empty object (requires explicit configuration)
- barber/customer: minimal permissions (overview only)

**Given** the migration is complete
**When** I verify the data
**Then** all users have object-based page_access
**And** no array-based page_access remains

---

### Story 5.7: Dual Auth System for Transition

As a **developer**,
I want to support both legacy and Clerk auth during transition,
So that users can migrate gradually without disruption.

**Acceptance Criteria:**

**Given** feature flag MIGRATION_MODE is enabled
**When** a user attempts to log in
**Then** the system checks if they have clerk_user_id
**And** routes them to Clerk auth if migrated
**And** routes them to legacy auth if not migrated

**Given** ENABLE_CLERK_AUTH is true and ENABLE_LEGACY_AUTH is true
**When** both auth systems are active
**Then** the login page shows both options
**And** users can choose their auth method

**Given** a user is partially migrated (invited but not completed)
**When** they try to log in via legacy auth
**Then** they can still use their old password
**And** they see a prompt to complete Clerk setup

**Given** migration is complete for all users
**When** ENABLE_LEGACY_AUTH is set to false
**Then** only Clerk auth is available
**And** legacy auth endpoints return 404

