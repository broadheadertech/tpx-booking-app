# Story 11-5: Access Denied Handling

## Story
As a **user**,
I want graceful messaging when I don't have permission,
So that I understand why I cannot access certain features.

## Status: done

## Acceptance Criteria

### AC1: AccessDenied Component
- **Given** I don't have permission to access content
- **When** RequirePermission blocks access
- **Then** I see clear "Access Denied" heading
- **And** message explaining the restriction
- **And** link/button to return to dashboard

### AC2: Consistent Styling
- **Given** AccessDenied is displayed
- **When** I view the component
- **Then** styling matches app theme (dark mode)
- **And** uses appropriate error coloring

### AC3: Compact Mode
- **Given** AccessDenied is used inline
- **When** `compact` prop is true
- **Then** shows smaller version suitable for inline use

## Technical Implementation

### File Created
- `src/components/common/AccessDenied.jsx`

### Props
- `message` - Custom message to display
- `showBackButton` - Show back button (default: true)
- `showHomeButton` - Show dashboard button (default: true)
- `compact` - Use compact styling (default: false)

### Features
- Full page version with large icon
- Compact version for inline use
- Role-aware dashboard redirect
- Back navigation support
- Help text for contacting admin

---
*Story completed: 2026-01-29*
