# Story 11-2: RBAC Service with Permission Checking

## Story
As a **developer**,
I want a centralized RBAC service for permission validation,
So that all mutations can consistently check user permissions.

## Status: done

## Acceptance Criteria

### AC1: checkPermission Function
- **Given** a mutation needs to check permissions
- **When** `checkPermission(ctx, "bookings", "edit")` is called
- **Then** returns true if user has permission
- **And** throws ConvexError with PERMISSION_DENIED if not

### AC2: Super Admin Bypass
- **Given** a super_admin user
- **When** `checkPermission(ctx, "any_page", "any_action")` is called
- **Then** returns true (bypasses all checks)

### AC3: getUserPermissions Query
- **Given** a user is authenticated
- **When** `getUserPermissions` query is called
- **Then** returns role, page_access, and page_access_v2

### AC4: canPerformAction Query
- **Given** a user with specific permissions
- **When** `canPerformAction({ page, action })` is called
- **Then** returns boolean indicating permission status

## Technical Implementation

### File Created
- `convex/services/rbac.ts`

### Helper Functions (not exported to API)
- `checkPermission(ctx, page, action)` - Check page/action permission
- `checkRole(ctx, requiredRole)` - Check minimum role level
- `checkBranchAccess(ctx, branchId)` - Check branch access
- `getBranchFilter(ctx)` - Get branch ID for query filtering

### Queries
- `getUserPermissions` - Get current user's permission data
- `getAccessiblePagesQuery` - Get list of viewable pages
- `canPerformAction` - Check specific page/action permission
- `getAssignableRolesQuery` - Get roles user can assign
- `hasRole` - Check if user has at least specified role
- `getUserPermissionSummary` - Get another user's permissions (admin only)

### Mutations
- `updateUserPermissions` - Update user's page_access_v2
- `updateUserRole` - Change user's role (with audit logging)

### Error Codes
- `PERMISSION_DENIED` - Action not permitted
- `PERMISSION_ROLE_INSUFFICIENT` - Role level too low
- `PERMISSION_BRANCH_MISMATCH` - Wrong branch access
- `UNAUTHENTICATED` - Not logged in

---
*Story completed: 2026-01-29*
