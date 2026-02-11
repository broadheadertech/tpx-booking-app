---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments:
  - _bmad-output/analysis/brainstorming-session-2026-01-28.md
  - _bmad-output/planning-artifacts/project-context.md
  - docs/index.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 2
classification:
  projectType: saas_b2b_webapp
  domain: smb_retail_service
  complexity: medium-high
  projectContext: brownfield
---

# Product Requirements Document - Clerk Authentication + RBAC

**Author:** MASTERPAINTER
**Date:** 2026-01-28

## Executive Summary

TipunoX Booking App requires a security upgrade to replace custom authentication with Clerk and implement comprehensive Role-Based Access Control (RBAC) for 6 user types across a multi-branch franchise network.

**Product Differentiator:** Unlike simple auth integrations, this implementation uses Clerk Organizations to map directly to franchise branches, enabling true multi-tenant data isolation with granular page-level and action-level permissions.

**MVP Scope:** Complete auth migration and RBAC implementation:
1. **Clerk Integration** - Replace custom auth with Clerk
2. **Organization Mapping** - Clerk Organizations ↔ Branches
3. **6-Role RBAC** - Complete permission matrix
4. **Branch Scoping** - Data isolation at query level
5. **Audit Trail** - Permission change logging

**Target Users:** Super Admin, Admin Staff, Branch Admin, Staff, Customer, Barber

---

## Success Criteria

### User Success

| Role | Success Moment | Measurable Outcome |
|------|----------------|-------------------|
| **Super Admin** | Can manage all branches and users from one dashboard | Access to 100% of system features, can switch branch context instantly |
| **Admin Staff** | Performs cross-branch operations without escalation | No "access denied" errors for permitted actions |
| **Branch Admin** | Sees ONLY their branch data on first login | Zero data leakage from other branches in any view |
| **Staff** | Clear understanding of their permissions | Navigation shows only accessible pages, graceful messaging for restricted actions |
| **Customer** | Can reschedule/cancel within allowed window | Clear countdown timer, successful self-service changes |
| **Barber** | Views schedule and requests cash advance | All personal data accessible, no visibility into other barbers |

### Business Success

| Metric | Target | Timeline |
|--------|--------|----------|
| Auth-related support tickets | 50% reduction | 3 months post-launch |
| Password reset self-service | 90%+ handled by Clerk | Immediate |
| New branch onboarding | < 1 hour setup time | Post-launch |
| Security audit readiness | Pass internal audit | Before production |

### Technical Success

| Requirement | Target |
|-------------|--------|
| Permission check latency | < 10 seconds |
| Branch data isolation | 100% enforced at query level |
| Role escalation vulnerabilities | Zero |
| Webhook sync reliability | 99.9% |
| Permission change audit log | Complete trail of all changes |
| Server-side token verification | All mutations validated |

### Measurable Outcomes

1. **Zero branch data leaks** - No user ever sees another branch's data
2. **Audit trail complete** - Every permission change logged with who/what/when
3. **Self-service auth** - Password resets, MFA setup handled by Clerk
4. **Permission clarity** - Users never confused about what they can/can't do

---

## Product Scope

### MVP - Minimum Viable Product

| Feature | Description |
|---------|-------------|
| Clerk Integration | Replace custom auth with Clerk |
| Clerk Organizations | Map to existing branches |
| 6-Role RBAC | Super Admin, Admin Staff, Branch Admin, Staff, Customer, Barber |
| Page-Level Permissions | 17 pages with configurable access |
| Action-Level Permissions | View/Create/Edit/Delete/Approve per page |
| Branch Scoping | Data isolation at Convex query level |
| Permission Audit Log | Track all permission changes |
| Webhook Sync | Clerk → Convex user sync |

### Growth Features (Post-MVP)

| Feature | Description |
|---------|-------------|
| Permission Templates | Pre-built configs ("Cashier", "Manager", "Trainee") |
| Time-based Access | Staff access only during shift hours |
| Permission Requests | Staff can request access, admin approves |

### Vision (Future)

| Feature | Description |
|---------|-------------|
| Impersonation | Super Admin can "view as" other roles for support |
| Activity Dashboard | Who accessed what, when (for compliance) |
| Delegation | Temporary permission grants |

---

## User Journeys

### Journey 1: Maria - Super Admin Onboards a New Branch

**Who:** Maria, TipunoX franchise owner, manages 5 branches across Metro Manila

**Opening Scene:** Maria just signed a new franchisee in Cebu. She needs to set up their branch, create their admin account, and ensure they can only see Cebu data.

**The Journey:**
1. Maria logs in via Clerk (SSO with her Google account)
2. Creates new Branch "TipunoX Cebu" in the system
3. System automatically creates matching Clerk Organization
4. Creates "Juan" as Branch Admin, assigns to TipunoX Cebu
5. Juan receives Clerk invite email, sets up password + MFA
6. Juan logs in - sees ONLY Cebu branch in his dashboard

**Climax:** Maria checks Juan's view and confirms he cannot see Manila branches

**Resolution:** New branch operational in under 1 hour, zero data leakage risk

---

### Journey 2: Lisa - Admin Staff Handles Cross-Branch Support

**Who:** Lisa, operations manager at TipunoX head office, supports all branches

**Opening Scene:** Lisa receives a call from Juan (Cebu Branch Admin) who can't figure out why a barber's payroll looks wrong.

**The Journey:**
1. Lisa logs in via Clerk at head office
2. Dashboard shows branch selector - she can see ALL branches
3. Switches to "TipunoX Cebu" view to investigate
4. Navigates to Payroll, reviews Ben's records
5. Finds the issue, edits the payroll record to fix it
6. Tries to delete Juan's user account → "Access Denied" (only Super Admin can delete users)
7. Escalates to Maria (Super Admin) for the deletion

**Climax:** Lisa resolved the payroll issue without needing Super Admin access, but correctly escalated what she couldn't do

**Resolution:** Clear boundaries - Lisa helps across branches but can't do destructive actions

---

### Journey 3: Juan - Branch Admin's First Day

**Who:** Juan, new franchisee, first time using TipunoX system

**Opening Scene:** Juan received his Clerk invite. He's nervous about managing the system.

**The Journey:**
1. Clicks Clerk invite link, sets password, enables MFA
2. First login - dashboard shows "Welcome to TipunoX Cebu"
3. Navigation shows: Overview, Bookings, Barbers, Payroll, Reports...
4. Notices NO "Branches" or "Settings" tabs (those are Super Admin only)
5. Goes to Users tab, can create Staff and assign page_access
6. Creates "Ana" as Staff with limited POS + Bookings access

**Climax:** Juan realizes he has full control of his branch without any clutter from other branches

**Resolution:** Juan feels empowered - he owns his branch, no confusion about what he can/can't do

---

### Journey 4: Ana - Staff With Limited Permissions

**Who:** Ana, cashier at TipunoX Cebu, tech-savvy but new to TipunoX

**Opening Scene:** Ana was just hired. Juan gave her a Clerk invite.

**The Journey:**
1. Sets up account via Clerk (password + optional MFA)
2. First login - sees clean dashboard with only: Overview, Bookings, POS, Customers
3. Tries to access Reports URL directly → graceful "No Access" message with "Contact your admin"
4. Goes to POS, processes customer payment successfully
5. Wants to add a new service → Service tab not visible
6. Asks Juan, who grants "Services" access via page_access checkbox

**Climax:** Ana's nav updates in real-time with new "Services" tab

**Resolution:** Ana understands her boundaries and how to request more access

---

### Journey 5: Carlo - Customer Cancels Booking

**Who:** Carlo, regular customer at TipunoX Cebu

**Opening Scene:** Carlo booked a haircut for tomorrow but just got called into an emergency meeting

**The Journey:**
1. Opens TipunoX app, logs in via Clerk (saved session)
2. Goes to "My Bookings", sees tomorrow's appointment
3. Clicks "Cancel" → System checks: is it 2+ hours before? ✓
4. Confirmation modal shows branch's cancel policy
5. Confirms cancellation, receives email confirmation
6. Later tries to cancel a booking 30 mins before → "Cannot cancel within 2 hours"

**Climax:** Carlo appreciates the clear policy and self-service capability

**Resolution:** No support call needed, Carlo feels in control of his bookings

---

### Journey 6: Ben - Barber Views Schedule & Requests Cash Advance

**Who:** Ben, senior barber at TipunoX Cebu, been with franchise 2 years

**Opening Scene:** Ben needs to check his schedule and request a cash advance for an emergency

**The Journey:**
1. Logs in via Clerk on his phone
2. Dashboard shows: My Schedule, My Earnings, Cash Advance
3. Sees his bookings for the week - ONLY his appointments, not other barbers'
4. Goes to Cash Advance, submits request for ₱5,000
5. Juan (Branch Admin) receives notification, approves
6. Ben sees approval status update in real-time

**Climax:** Ben got his advance approved without visiting the office

**Resolution:** Ben appreciates the privacy (other barbers can't see his financials) and the quick process

---

### Journey Requirements Summary

| Journey | Capabilities Required |
|---------|----------------------|
| Maria (Super Admin) | Branch creation, Clerk Org sync, user creation/deletion, role assignment |
| Lisa (Admin Staff) | Cross-branch view, edit capabilities, graceful denial for delete actions |
| Juan (Branch Admin) | Branch-scoped dashboard, user management, page_access configuration |
| Ana (Staff) | Limited nav, graceful access denial, real-time permission updates |
| Carlo (Customer) | Self-service booking management, cancel window enforcement |
| Ben (Barber) | Personal data isolation, cash advance workflow, real-time updates |

---

## Domain-Specific Requirements

### Security & Access Control

| Concern | Requirement |
|---------|-------------|
| Branch Data Isolation | Every Convex query MUST filter by `branch_id` for branch-scoped roles |
| Role Escalation Prevention | Server-side validation of all role changes; no client-side role checks |
| Permission Caching | Clerk metadata synced to Convex for fast permission checks |
| Audit Trail | All permission changes logged with: who, what, when, previous value |
| Token Verification | All mutations verify Clerk JWT server-side before executing |

### Technical Constraints

| Constraint | Implementation |
|------------|----------------|
| Clerk ↔ Convex Sync | Webhooks for user creation, updates, deletion; Convex as source of truth |
| Real-time Permission Updates | Navigation and UI update immediately when permissions change |
| Clerk Downtime Handling | No special handling required; standard Clerk reliability |
| Migration Complexity | Existing users must be migrated without data loss |

### User Migration Strategy

| Approach | Description |
|----------|-------------|
| Invite-Based Migration | Send Clerk invite emails to existing users; they set up new credentials |
| Automatic Import | Import existing user data into Clerk with temporary passwords |
| Dual Strategy | Support BOTH approaches - invite for active users, auto-import for bulk migration |

### Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Branch Data Leak | Every query enforces `branch_id` filtering at the database level |
| Role Escalation | Server-side role validation; client never trusted for role checks |
| Stale Permissions | Webhook sync with retry logic; permission cache invalidation |
| Super Admin Lockout | Recovery mechanism TBD (Clerk dashboard or emergency access) |
| Webhook Failures | Dead letter queue for failed webhooks; manual reconciliation dashboard |

---

## SaaS B2B Specific Requirements

### Multi-Tenancy Model (Clerk Organizations)

| Aspect | Implementation |
|--------|---------------|
| Tenant Unit | Branch = Clerk Organization |
| Tenant Isolation | Data filtered by `branch_id` at query level |
| Cross-Tenant Access | Super Admin and Admin Staff can switch branch context |
| Tenant Creation | Branch creation triggers Clerk Organization creation |
| Tenant Membership | Users assigned to Organizations via Clerk |

### RBAC Permission Matrix

| Role | Scope | User Creation | Data Access | Special Permissions |
|------|-------|---------------|-------------|---------------------|
| Super Admin | All branches | All roles | All data | Branch creation, user deletion, settings |
| Admin Staff | All branches | Branch-level only | All data | Cross-branch support, no delete users |
| Branch Admin | Own branch | Staff, Barber | Branch data only | page_access configuration |
| Staff | Own branch | None | As configured via page_access | Service/voucher/event creation |
| Customer | Self only | None | Own bookings | Cancel/reschedule within window |
| Barber | Self only | None | Own schedule/earnings | Cash advance requests |

### Integration Architecture

| Integration | Purpose | Auth Method |
|-------------|---------|-------------|
| Clerk → Convex | User sync, org sync | Webhooks with signature verification |
| Convex → Clerk | User creation, org creation | Clerk Backend API with secret key |
| Frontend → Clerk | Login, signup, session | Clerk React SDK |
| Frontend → Convex | Data queries/mutations | Clerk JWT passed to Convex |

### Compliance & Audit

| Requirement | Implementation |
|-------------|----------------|
| Permission Audit Log | Table tracking all permission changes with timestamps |
| Session Management | Clerk handles session tokens, revocation |
| Data Access Logging | Future consideration (not MVP) |

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP - Replace fragile custom auth with production-ready Clerk while maintaining all existing functionality

**Primary Risk:** Breaking existing functionality during migration

**Mitigation Strategy:** Parallel auth system during transition, feature flags, comprehensive testing before cutover

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- All 6 journeys (Maria, Lisa, Juan, Ana, Carlo, Ben) must work on day 1
- No feature regression from current system

**Must-Have Capabilities:**

| Category | Features |
|----------|----------|
| Authentication | Clerk integration, login/logout, session management |
| Organizations | Clerk Organizations ↔ Branches sync |
| RBAC Core | 6 roles with defined permissions |
| Page Access | 17 pages with View/Create/Edit/Delete/Approve controls |
| Branch Scoping | All queries filter by branch_id for scoped roles |
| User Migration | Dual strategy (invite + auto-import) for existing users |
| Webhooks | Clerk → Convex sync for user/org changes |
| Audit Log | Permission change tracking |

**MVP Success Gate:** All existing functionality works with Clerk auth; no user reports "I can't do what I used to do"

### Post-MVP Features

**Phase 2 (Growth):**

| Feature | Value |
|---------|-------|
| Permission Templates | Pre-built configs ("Cashier", "Manager", "Trainee") |
| Time-based Access | Staff access only during shift hours |
| Permission Requests | Staff can request access, admin approves |

**Phase 3 (Vision):**

| Feature | Value |
|---------|-------|
| Impersonation | Super Admin "view as" for support |
| Activity Dashboard | Who accessed what, when (compliance) |
| Delegation | Temporary permission grants |

### Risk Mitigation Strategy

| Risk | Mitigation |
|------|------------|
| **Breaking Existing Functionality** | Parallel auth during transition; feature flags; rollback plan; staged rollout by branch |
| **User Migration Failures** | Dual migration strategy; manual fallback; data validation before cutover |
| **Webhook Sync Issues** | Retry logic; dead letter queue; manual reconciliation dashboard |
| **Permission Gaps** | Map all existing user permissions before migration; audit after migration |

### Implementation Approach

| Phase | Focus | Success Criteria |
|-------|-------|------------------|
| 1a - Foundation | Clerk setup, webhooks, basic auth | Can login via Clerk |
| 1b - RBAC | Role system, page_access, branch scoping | Permissions enforced correctly |
| 1c - Migration | User import, organization sync | All users can access system |
| 1d - Cutover | Remove old auth, go live | Zero functionality regression |

---

## Functional Requirements

### Authentication & Session Management

- **FR1:** Users can log in via Clerk using email/password
- **FR2:** Users can log in via Clerk using Google SSO
- **FR3:** Users can set up multi-factor authentication (MFA)
- **FR4:** Users can reset their password via Clerk self-service
- **FR5:** Users can log out and terminate their session
- **FR6:** System can verify Clerk JWT tokens server-side before executing mutations

### User Management

- **FR7:** Super Admin can create users with any role
- **FR8:** Super Admin can delete users from the system
- **FR9:** Admin Staff can create users at branch level (Staff, Barber, Customer)
- **FR10:** Branch Admin can create Staff and Barber users for their branch
- **FR11:** Branch Admin can configure page_access permissions for Staff users
- **FR12:** Users can receive Clerk invite emails to set up their accounts
- **FR13:** System can display user lists filtered by branch for branch-scoped roles

### Role & Permission Management

- **FR14:** System can enforce 6 distinct roles: Super Admin, Admin Staff, Branch Admin, Staff, Customer, Barber
- **FR15:** System can restrict page access based on user's role and page_access configuration
- **FR16:** System can restrict actions (View/Create/Edit/Delete/Approve) per page per role
- **FR17:** Staff users can only see navigation items they have access to
- **FR18:** Users can see graceful "No Access" messaging when attempting restricted actions
- **FR19:** Permission changes can take effect in real-time without user re-login

### Branch/Organization Management

- **FR20:** Super Admin can create new branches in the system
- **FR21:** System can automatically create Clerk Organization when branch is created
- **FR22:** Super Admin can assign users to branches
- **FR23:** Admin Staff can switch branch context to view any branch's data
- **FR24:** Branch Admin can only see and manage their assigned branch
- **FR25:** System can sync Clerk Organization membership with branch assignments

### Data Access Control

- **FR26:** All queries can filter data by branch_id for branch-scoped roles
- **FR27:** Barbers can only view their own schedule and earnings
- **FR28:** Barbers cannot view other barbers' financial data
- **FR29:** Customers can only view and manage their own bookings
- **FR30:** Customers can cancel bookings within configurable time window (default 2 hours)
- **FR31:** Customers can reschedule bookings within configurable time window
- **FR32:** System can display clear messaging when cancel/reschedule window has passed

### Audit & Compliance

- **FR33:** System can log all permission changes with who, what, when, and previous value
- **FR34:** System can track user role assignments and changes
- **FR35:** System can maintain audit trail accessible to Super Admin

### Migration & Onboarding

- **FR36:** System can import existing users into Clerk via invite-based migration
- **FR37:** System can import existing users into Clerk via automatic bulk import
- **FR38:** System can map existing user roles to new 6-role system
- **FR39:** System can preserve existing user data during migration

### Webhook & Sync

- **FR40:** System can receive and process Clerk webhooks for user creation
- **FR41:** System can receive and process Clerk webhooks for user updates
- **FR42:** System can receive and process Clerk webhooks for user deletion
- **FR43:** System can verify webhook signatures for security
- **FR44:** System can handle webhook failures with retry logic

### Barber-Specific Capabilities

- **FR45:** Barbers can view their weekly schedule
- **FR46:** Barbers can submit cash advance requests
- **FR47:** Branch Admin can approve/reject cash advance requests
- **FR48:** Barbers can view cash advance request status in real-time

---

## Non-Functional Requirements

### Performance

| Requirement | Target | Context |
|-------------|--------|---------|
| **NFR1:** Permission check latency | < 10 seconds | As specified in Success Criteria |
| **NFR2:** Navigation render after permission change | < 2 seconds | Real-time UX requirement |
| **NFR3:** Login/logout response time | < 3 seconds | Standard auth UX |
| **NFR4:** Branch context switch | < 2 seconds | Admin Staff workflow |

### Security

| Requirement | Target | Context |
|-------------|--------|---------|
| **NFR5:** Branch data isolation | 100% enforced | Zero cross-branch data leakage |
| **NFR6:** Role escalation vulnerabilities | Zero | Server-side validation mandatory |
| **NFR7:** JWT token verification | All mutations | No client-side trust |
| **NFR8:** Webhook signature verification | All webhooks | Prevent spoofing |
| **NFR9:** Permission audit trail | Complete | Every change logged |
| **NFR10:** Session security | Clerk-managed | MFA support, secure cookies |

### Integration

| Requirement | Target | Context |
|-------------|--------|---------|
| **NFR11:** Webhook delivery reliability | 99.9% | Clerk → Convex sync |
| **NFR12:** Webhook retry on failure | 3 retries with backoff | Handle transient failures |
| **NFR13:** Dead letter queue | All failed webhooks captured | Manual recovery possible |
| **NFR14:** Clerk API availability | Standard Clerk SLA | No special handling required |

### Reliability

| Requirement | Target | Context |
|-------------|--------|---------|
| **NFR15:** Auth system availability | 99.9% (Clerk SLA) | Business-critical function |
| **NFR16:** Permission sync consistency | Eventual consistency < 5 seconds | Webhook-based updates |
| **NFR17:** Rollback capability | Within 1 hour | Feature flags for cutover |
| **NFR18:** Migration data integrity | Zero data loss | User migration requirement |

---

