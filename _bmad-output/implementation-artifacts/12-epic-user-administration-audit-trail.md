# Epic 12: User Administration & Audit Trail

## Status: done

## Overview
Admins can create users, assign roles, configure page-level permissions, and track all permission changes via an audit trail.

## Stories Completed

### Story 12-1: Super Admin User Management
- **Status**: Done
- Super Admin can create and delete users with any role
- Existing `UserManagement.jsx` in admin folder handles this
- Supports all 6 roles and branch assignment

### Story 12-2: Admin Staff User Management
- **Status**: Done
- Admin Staff can create branch-level users (staff, barber, customer)
- Cannot create super_admin, admin_staff, or branch_admin
- Uses existing `UserManagement.jsx` with role restrictions

### Story 12-3: Branch Admin User Management
- **Status**: Done
- Branch Admin can create staff and barber users for their branch
- Can configure page_access_v2 permissions via `PermissionConfigModal`
- Permission matrix shows 30 pages x 5 actions
- **New Component**: `src/components/admin/PermissionConfigModal.jsx`
- Updated `BranchUserManagement.jsx` with Shield icon for permissions

### Story 12-4: Clerk Invite Integration
- **Status**: Done (Partial - uses existing Clerk flow)
- New users created in Convex with migration_status tracking
- Clerk webhook handles user creation sync
- Full invite flow available via Clerk Dashboard

### Story 12-5: User Listing with Branch Filter
- **Status**: Done
- Branch Admin: Auto-filtered to their branch
- Admin Staff/Super Admin: Can filter by branch
- Existing implementations handle this in both UserManagement components

### Story 12-6: Permission Change Audit Logging
- **Status**: Done
- `permissionAuditLog` table created in Story 10.1
- `updateUserPermissions` mutation logs page_access changes
- `updateUserRole` mutation logs role changes
- Audit entries include: user_id, changed_by, change_type, previous_value, new_value, created_at

### Story 12-7: Audit Trail Viewer for Super Admin
- **Status**: Done
- **New Component**: `src/components/admin/AuditTrailViewer.jsx`
- **New Queries**: `getAuditTrail`, `getAuditTrailStats` in `rbac.ts`
- Features:
  - Stats cards (total, last 24h, last 7 days, role changes)
  - Filter by change type
  - Search by user
  - Pagination
  - Expandable JSON diff viewer
  - Time-ago formatting

## Key Files Created/Modified

### New Components
- `src/components/admin/PermissionConfigModal.jsx` - Permission configuration UI
- `src/components/admin/AuditTrailViewer.jsx` - Audit trail viewer

### Modified Components
- `src/components/staff/BranchUserManagement.jsx` - Added permissions button

### Backend
- `convex/services/rbac.ts` - Added audit trail queries

---
*Epic completed: 2026-01-29*
