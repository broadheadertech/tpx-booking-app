# Story 11-1: Role Hierarchy and Utility Functions

## Story
As a **developer**,
I want role hierarchy utilities that determine role capabilities,
So that permission checks are consistent throughout the application.

## Status: done

## Acceptance Criteria

### AC1: Role Hierarchy Object
- **Given** I need to compare role levels
- **When** I use `ROLE_HIERARCHY`
- **Then** roles are mapped: super_admin: 6, admin_staff: 5, branch_admin: 4, staff: 3, barber: 2, customer: 1

### AC2: hasRoleOrHigher Function
- **Given** I call `hasRoleOrHigher("admin_staff", "branch_admin")`
- **When** the function executes
- **Then** it returns `true`

### AC3: isBranchScoped Function
- **Given** I call `isBranchScoped("staff")`
- **When** the function executes
- **Then** it returns `true`
- **And** `isBranchScoped("super_admin")` returns `false`

## Technical Implementation

### File Created
- `convex/lib/roleUtils.ts`

### Exports
- `ROLE_HIERARCHY` - Role to numeric level mapping
- `hasRoleOrHigher(userRole, requiredRole)` - Compare role levels
- `isBranchScoped(role)` - Check if role is branch-limited
- `canViewAllBranches(role)` - Check if role can view all branches
- `isAdminRole(role)` - Check for admin-level roles
- `canCreateUserWithRole(creatorRole, targetRole)` - Check user creation permissions
- `isAlwaysAccessible(pageId)` - Check if page bypasses permissions
- `getDefaultPageAccess(role)` - Get default permissions for role
- `hasPagePermission(user, pageId, action)` - Check specific permission
- `getAccessiblePages(user)` - Get list of viewable pages
- `getAssignableRoles(userRole)` - Get roles user can assign

### Constants
- `ALWAYS_ACCESSIBLE_PAGES` - Pages that bypass permission checks
- `ALL_PAGES` - All page IDs grouped by dashboard
- `ACTIONS` - Available actions (view, create, edit, delete, approve)

---
*Story completed: 2026-01-29*
