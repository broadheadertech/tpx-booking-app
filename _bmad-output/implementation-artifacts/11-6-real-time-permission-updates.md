# Story 11-6: Real-Time Permission Updates

## Story
As an **admin**,
I want permission changes to take effect immediately,
So that users don't need to re-login after I update their access.

## Status: done

## Acceptance Criteria

### AC1: Permission Changes Reflect Immediately
- **Given** a user's page_access_v2 is updated while they are logged in
- **When** the Convex mutation completes
- **Then** the user's UI re-renders via Convex subscription
- **And** navigation items update to reflect new permissions

### AC2: No Re-login Required
- **Given** permissions are changed
- **When** the change takes effect
- **Then** no page refresh or re-login is required

### AC3: Navigation Updates on Permission Gain
- **Given** a user gains new permission
- **When** the permission change takes effect
- **Then** new navigation items appear immediately

## Technical Implementation

### How It Works
Real-time permission updates are achieved through Convex's built-in reactive subscriptions:

1. **useCurrentUser Hook**: Uses `useQuery` to fetch user data from Convex
   - Any mutation that changes `page_access_v2` triggers re-render
   - User object is always fresh from database

2. **Staff Dashboard**: Uses user object for tab filtering
   - `getFilteredTabs()` runs on every render
   - Tabs automatically update when user permissions change

3. **Permission Components**: Use `useQuery` for permission checks
   - `RequirePermission` queries `canPerformAction`
   - `PermissionGuard` queries `canPerformAction`
   - Both re-render when permissions change

4. **RBAC Service Mutations**: Trigger re-render
   - `updateUserPermissions` mutation updates `page_access_v2`
   - Convex subscription notifies all connected clients
   - UI re-renders with new permissions

### No Additional Code Needed
This feature is inherent to the Convex + React architecture:
- Convex queries are reactive subscriptions
- React components re-render when query data changes
- Permission changes propagate automatically

### Verification
To test real-time updates:
1. Open dashboard as a staff user
2. In another tab/window, update their permissions via admin
3. Staff user's navigation updates without refresh

---
*Story completed: 2026-01-29*
