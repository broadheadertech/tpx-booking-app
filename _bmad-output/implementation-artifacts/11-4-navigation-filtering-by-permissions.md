# Story 11-4: Navigation Filtering by Permissions

## Story
As a **staff user**,
I want to see only navigation items I have access to,
So that I don't get confused by options I cannot use.

## Status: done

## Acceptance Criteria

### AC1: Navigation Shows Only Accessible Pages
- **Given** I am logged in as a staff user
- **When** I load the dashboard
- **Then** I only see menu items for pages where I have view permission

### AC2: Super Admin Full Access
- **Given** I am a super_admin
- **When** I view the navigation menu
- **Then** I see ALL navigation items

### AC3: Branch Admin Full Staff Dashboard Access
- **Given** I am a branch_admin
- **When** I view the navigation menu
- **Then** I see all Staff Dashboard navigation items

### AC4: Redirect on Invalid Tab
- **Given** I have limited page access
- **When** I try to access a tab not in my permissions
- **Then** I am redirected to the overview tab

## Technical Implementation

### File Modified
- `src/pages/staff/Dashboard.jsx`

### Changes Made
1. Updated `getFilteredTabs()` function to check:
   - `page_access_v2` (new RBAC system) first
   - Fallback to `page_access` (legacy array)
   - Role-based defaults (super_admin, admin_staff, branch_admin)

2. Added `alwaysAccessiblePages` constant for pages that bypass checks:
   - overview, custom_bookings, walkins, queue

3. Updated `renderTabContent()` to check permissions before rendering

4. Updated redirect effect to use alwaysAccessiblePages constant

### Permission Priority
1. `super_admin` / `admin_staff` → All tabs
2. `branch_admin` → All staff dashboard tabs
3. `page_access_v2[tab].view` → New RBAC system
4. `page_access.includes(tab)` → Legacy array
5. Default → All tabs (for backwards compatibility)

---
*Story completed: 2026-01-29*
