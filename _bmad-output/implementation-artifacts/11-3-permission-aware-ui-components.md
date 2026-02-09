# Story 11-3: Permission-Aware UI Components

## Story
As a **developer**,
I want permission-aware wrapper components,
So that UI elements can conditionally render based on user permissions.

## Status: done

## Acceptance Criteria

### AC1: RequireRole Component
- **Given** a section needs role-level protection
- **When** I wrap it with `<RequireRole role="branch_admin">`
- **Then** content shows if user has sufficient role
- **And** shows AccessDenied if insufficient

### AC2: RequirePermission Component
- **Given** a section needs page/action permission check
- **When** I wrap it with `<RequirePermission page="bookings" action="edit">`
- **Then** content shows if permission granted
- **And** shows AccessDenied if denied

### AC3: PermissionGuard Component
- **Given** I need conditional rendering without blocking
- **When** I use `<PermissionGuard page="bookings" action="delete">`
- **Then** returns children if permission granted
- **And** returns null (not AccessDenied) if denied

## Technical Implementation

### Files Created
- `src/components/common/RequireRole.jsx`
- `src/components/common/RequirePermission.jsx`
- `src/components/common/PermissionGuard.jsx`

### RequireRole Props
- `children` - Content to render if authorized
- `role` - Minimum required role
- `fallback` - Optional custom fallback

### RequirePermission Props
- `children` - Content to render if authorized
- `page` - Page ID to check
- `action` - Action to check (default: "view")
- `fallback` - Optional custom fallback

### PermissionGuard Props
- `children` - Content to render if authorized
- `page` - Page ID to check
- `action` - Action to check (default: "view")
- `role` - Alternative role-based check
- `fallback` - Optional fallback (default: null)

---
*Story completed: 2026-01-29*
