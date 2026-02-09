---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'Clerk Authentication + RBAC Implementation'
session_goals: 'Robust security with Page Access Permissions for 6 user types'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'Morphological Analysis', 'Six Thinking Hats']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** MASTERPAINTER
**Date:** 2026-01-28

## Session Overview

**Topic:** Clerk Authentication + RBAC Implementation for TPX Booking App
**Goals:** Implement robust security with Page Access Permissions for 6 user types

### Session Context

- **Current Auth:** Custom authentication system
- **User Roles:** Super Admin, Admin Staff, Branch Admin, Staff, Customer, Barber
- **User Creation Rights:** Super Admin, Staff Admin, Branch Admin
- **Clerk Scope:** Full user management
- **Permission Model:** Role-based + Feature-based + Branch-scoped

### Session Setup

The user wants to add Clerk authentication to the platform with comprehensive RBAC:
- 6 main user types with different access levels
- Page Access Permissions for all roles
- Branch-scoped permissions for branch-level users
- More robust security architecture

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Clerk + RBAC with focus on comprehensive page-level permissions

**Recommended Techniques:**

1. **Role Playing:** Explore each of the 6 user types' perspectives, needs, and constraints to build comprehensive permission understanding
2. **Morphological Analysis:** Systematically map all combinations of Roles × Pages × Features × Branches for complete permission matrix
3. **Six Thinking Hats:** Validate security design from multiple angles - facts, UX, risks, benefits, creative solutions, implementation

**AI Rationale:** Multi-tier RBAC with branch scoping requires understanding each stakeholder, systematic combination exploration, and balanced security/usability analysis.

---

## Phase 1: Role Playing - User Perspective Exploration

### Technique Execution

#### Role 1: Super Admin
- **Pages:** All pages
- **Exclusive Actions:** Create Branches, Delete Users
- **Data Access:** All Branches, Overall Sales
- **Restrictions:** None

#### Role 2: Admin Staff
- **Pages:** All admin pages EXCEPT branch creation
- **Actions:** Create users at branch level only (Branch Admin, Staff)
- **Scope:** Cross-branch visibility (main office role)
- **Cannot:** Create/delete branches, delete users, access system settings

#### Role 3: Branch Admin
- **Scope:** Own branch only
- **Can Create:** Branch Admin + Staff for their branch
- **Payroll:** Can delete only if unpaid
- **Reports:** Own branch data only, no cross-branch comparison

#### Role 4: Staff
- **Scope:** Own branch only
- **Can:** Create services, vouchers, events, bookings, customers
- **Cannot:** Delete bookings, access payroll, delete anything
- **Note:** Permissions configurable via page_access by Branch Admin

#### Role 5: Customer
- **Scope:** Self only
- **Edit/Cancel Booking:** If within branch-configurable time window (default 2 hours)
- **Delete Account:** Upon request only

#### Role 6: Barber
- **Scope:** Self + own bookings only
- **View Only:** Dashboard, bookings, schedule, earnings
- **Can Request:** Cash advance
- **Cannot:** Mark bookings complete, see other barbers, edit schedule

---

## Phase 2: Morphological Analysis - Permission Matrix

### Complete Permission Matrix

#### Super Admin (Scope: ALL Branches)
| Page | View | Create | Edit | Delete | Approve |
|------|:----:|:------:|:----:|:------:|:-------:|
| Overview | ✅ | - | - | - | - |
| Bookings | ✅ | ✅ | ✅ | ✅ | - |
| Calendar | ✅ | ✅ | ✅ | ✅ | - |
| Services | ✅ | ✅ | ✅ | ✅ | - |
| Vouchers | ✅ | ✅ | ✅ | ✅ | - |
| Barbers | ✅ | ✅ | ✅ | ✅ | - |
| Users | ✅ | ✅ | ✅ | ✅ | - |
| Customers | ✅ | ✅ | ✅ | ✅ | - |
| Events | ✅ | ✅ | ✅ | ✅ | - |
| Reports | ✅ | - | - | - | - |
| Payroll | ✅ | ✅ | ✅ | ✅ | ✅ |
| Products | ✅ | ✅ | ✅ | ✅ | - |
| Notifications | ✅ | ✅ | ✅ | ✅ | - |
| Email Marketing | ✅ | ✅ | ✅ | ✅ | - |
| POS | ✅ | ✅ | ✅ | ✅ | - |
| Branches | ✅ | ✅ | ✅ | ✅ | - |
| Settings | ✅ | - | ✅ | - | - |

#### Admin Staff (Scope: ALL Branches)
| Page | View | Create | Edit | Delete | Approve |
|------|:----:|:------:|:----:|:------:|:-------:|
| Overview | ✅ | - | - | - | - |
| Bookings | ✅ | ✅ | ✅ | ✅ | - |
| Calendar | ✅ | ✅ | ✅ | ✅ | - |
| Services | ✅ | ✅ | ✅ | ✅ | - |
| Vouchers | ✅ | ✅ | ✅ | ✅ | - |
| Barbers | ✅ | ✅ | ✅ | ✅ | - |
| Users | ✅ | ✅ | ✅ | ❌ | - |
| Customers | ✅ | ✅ | ✅ | ✅ | - |
| Events | ✅ | ✅ | ✅ | ✅ | - |
| Reports | ✅ | - | - | - | - |
| Payroll | ✅ | ✅ | ✅ | ✅ | ✅ |
| Products | ✅ | ✅ | ✅ | ✅ | - |
| Notifications | ✅ | ✅ | ✅ | ✅ | - |
| Email Marketing | ✅ | ✅ | ✅ | ✅ | - |
| POS | ✅ | ✅ | ✅ | ✅ | - |
| Branches | ✅ | ❌ | ✅ | ❌ | - |
| Settings | ❌ | - | ❌ | - | - |

#### Branch Admin (Scope: OWN BRANCH ONLY)
| Page | View | Create | Edit | Delete | Approve | Notes |
|------|:----:|:------:|:----:|:------:|:-------:|-------|
| Overview | ✅ | - | - | - | - | Own branch stats |
| Bookings | ✅ | ✅ | ✅ | ✅ | - | |
| Calendar | ✅ | ✅ | ✅ | ✅ | - | |
| Services | ✅ | ✅ | ✅ | ✅ | - | |
| Vouchers | ✅ | ✅ | ✅ | ✅ | - | |
| Barbers | ✅ | ✅ | ✅ | ✅ | - | |
| Users | ✅ | ✅ | ✅ | ✅ | - | Can create Branch Admin + Staff |
| Customers | ✅ | ✅ | ✅ | ✅ | - | |
| Events | ✅ | ✅ | ✅ | ✅ | - | |
| Reports | ✅ | - | - | - | - | Own branch only |
| Payroll | ✅ | ✅ | ✅ | ⚠️ | ✅ | Delete only if unpaid |
| Products | ✅ | ✅ | ✅ | ✅ | - | |
| Notifications | ✅ | ✅ | ✅ | ✅ | - | |
| Email Marketing | ✅ | ✅ | ✅ | ✅ | - | |
| POS | ✅ | ✅ | ✅ | ✅ | - | |
| Branches | ❌ | ❌ | ❌ | ❌ | - | No access |
| Settings | ❌ | - | ❌ | - | - | No access |

#### Staff (Scope: OWN BRANCH ONLY - Configurable)
| Page | View | Create | Edit | Delete | Approve |
|------|:----:|:------:|:----:|:------:|:-------:|
| Overview | ✅ | - | - | - | - |
| Bookings | ✅ | ✅ | ✅ | ❌ | - |
| Calendar | ✅ | ✅ | ✅ | ❌ | - |
| Services | ✅ | ✅ | ✅ | ❌ | - |
| Vouchers | ✅ | ✅ | ✅ | ❌ | - |
| Barbers | ✅ | ❌ | ❌ | ❌ | - |
| Users | ❌ | ❌ | ❌ | ❌ | - |
| Customers | ✅ | ✅ | ✅ | ❌ | - |
| Events | ✅ | ✅ | ✅ | ❌ | - |
| Reports | ✅ | - | - | - | - |
| Payroll | ❌ | ❌ | ❌ | ❌ | ❌ |
| Products | ✅ | ❌ | ❌ | ❌ | - |
| Notifications | ✅ | ✅ | ❌ | ❌ | - |
| Email Marketing | ❌ | ❌ | ❌ | ❌ | - |
| POS | ✅ | ✅ | ✅ | ❌ | - |

#### Customer (Scope: SELF ONLY)
| Page/Feature | View | Create | Edit | Delete | Notes |
|--------------|:----:|:------:|:----:|:------:|-------|
| My Profile | ✅ | - | ✅ | ⚠️ | Delete = request only |
| My Bookings | ✅ | ✅ | ⚠️ | - | Edit if within time window |
| Cancel Booking | - | - | - | ⚠️ | If within branch-set window |
| Book Service | ✅ | ✅ | - | - | |
| My Vouchers | ✅ | - | - | - | |
| Branch List | ✅ | - | - | - | |
| Services List | ✅ | - | - | - | |
| Barbers List | ✅ | - | - | - | |

**Business Rule:** `cancel_window_minutes` - Branch-configurable (default: 120 mins)

#### Barber (Scope: SELF + OWN BOOKINGS ONLY)
| Page/Feature | View | Create | Edit | Delete | Notes |
|--------------|:----:|:------:|:----:|:------:|-------|
| My Dashboard | ✅ | - | - | - | Own stats only |
| My Profile | ✅ | - | ✅ | - | |
| My Bookings | ✅ | - | ❌ | - | View only |
| My Schedule | ✅ | - | ❌ | - | Cannot edit |
| My Earnings | ✅ | - | - | - | |
| Cash Advance | ✅ | ✅ | - | - | Can request |

---

## Phase 3: Six Thinking Hats - Design Validation

### 🎩 White Hat: Facts
- Clerk provides: User Metadata, Organizations, Roles & Permissions, Session Claims, Webhooks, MFA
- Decision: **Use Clerk Organizations for Branches** (for security)
- Current: 6 roles, 15+ pages, branch-scoped isolation needed

### ❤️ Red Hat: UX Considerations
- Hide nav items user can't access (don't just disable)
- Show clear "You're managing: [Branch Name]" for branch-scoped users
- Graceful "No Access" messages with contact admin option
- Clear countdown timer for booking cancellation window

### ⚫ Black Hat: Risks Identified
| Risk | Severity | Mitigation |
|------|----------|------------|
| Branch data leak | 🔴 High | Enforce branch_id filtering at Convex query level |
| Role escalation | 🔴 High | Only Super Admin can change roles to admin+ |
| Stale permissions | 🟡 Medium | Webhook sync Clerk → Convex on user update |
| Token manipulation | 🔴 High | Verify claims server-side, not just client |
| Super Admin lockout | 🔴 High | Recovery process TBD |

### 🟡 Yellow Hat: Benefits
- Clerk handles auth complexity (no password storage, MFA free)
- Granular control via page_access
- Scalable multi-branch architecture
- Audit-ready permission trail
- Reduced support burden (self-service password reset)

### 🟢 Green Hat: Future Ideas (Not in v1)
- Permission Templates ("Cashier", "Manager", "Trainee")
- Time-based access (shift hours only)
- Delegation / Impersonation for support
- Permission request workflow
- Activity dashboard for compliance

### 🔵 Blue Hat: Implementation Order
1. Clerk Setup - Install, configure providers
2. Schema Update - Add clerk_id, update role enum
3. Auth Migration - Replace AuthContext with Clerk hooks
4. Permission Middleware - Create check utilities
5. UI Updates - Conditional rendering
6. Testing - All role combinations

---

## Key Decisions Made

| Decision | Choice |
|----------|--------|
| Branch Management | Use Clerk Organizations for security |
| Permission Storage | Clerk metadata + Convex as source of truth |
| Cancel/Reschedule Window | Branch-configurable (default 2 hours) |
| Super Admin Recovery | TBD - needs planning |
| v1 Scope | Core RBAC only, no fancy features |

---

## New Schema Fields Identified

### branches table
```javascript
cancel_reschedule_window_minutes: v.optional(v.number()), // default 120
```

### users table
```javascript
clerk_id: v.optional(v.string()),
// Existing: role, branch_id, page_access
```

---

## Next Steps

1. **Create PRD** for Clerk + RBAC implementation
2. **Plan Super Admin recovery** process
3. **Design Clerk Organization ↔ Branch mapping**
4. **Update schema** with new fields
5. **Begin implementation** following Blue Hat phases

