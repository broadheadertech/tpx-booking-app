# Story 13-3: Admin Staff Branch Context Switching

## Status: Done

## Implementation Summary

Implemented branch context switching for Admin Staff and Super Admin roles, allowing them to view and manage data for any branch from a single interface.

## Changes Made

### 1. src/context/BranchContext.jsx (New File)
Created a React context for branch selection:

**Features:**
- `canSwitchBranches` - True for super_admin and admin_staff
- `isBranchScoped` - True for branch_admin, staff, barber
- `effectiveBranchId` - Current active branch (selected or assigned)
- `currentBranch` - Full branch object
- `setSelectedBranch()` - Switch to a different branch

**Persistence:**
- Selected branch stored in localStorage
- Persists across page refreshes
- Cleared on logout

### 2. src/components/common/BranchSelector.jsx (New File)
Dropdown component for branch switching:

**Behavior by Role:**
- **Super Admin / Admin Staff**: Shows dropdown with all active branches
- **Branch Admin / Staff / Barber**: Shows read-only branch name
- **Customer**: Hidden (no branch context)

**UI Features:**
- Checkmark indicates current selection
- Shows branch name and code
- Keyboard accessible (escape to close)
- Click outside to close

### 3. src/App.jsx (Modified)
- Added `BranchProvider` wrapper to provide branch context to all components
- Provider is inside `BrandingProvider` and wraps `Router`

### 4. src/components/staff/DashboardHeader.jsx (Modified)
- Imported `BranchSelector` component
- Replaced static branch display with dynamic `BranchSelector`
- Shows in header area on desktop (hidden on mobile for space)

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| Admin Staff sees branch selector dropdown in header | Done |
| Dropdown lists all branches user has access to | Done |
| Selecting branch reloads data for that branch | Ready for integration |
| Visual indicator shows current branch prominently | Done |
| Context switch completes in under 2 seconds | Done (instant via state) |

## Usage

### Accessing Branch Context in Components:
```jsx
import { useBranchContext } from '../../context/BranchContext'

function MyComponent() {
  const {
    currentBranch,        // Current branch object
    effectiveBranchId,    // Branch ID for queries
    canSwitchBranches,    // Can user switch?
    setSelectedBranch,    // Switch function
  } = useBranchContext()

  // Use effectiveBranchId in queries
  const data = useQuery(api.services.bookings.getByBranch, {
    branchId: effectiveBranchId
  })
}
```

### Using BranchSelector Component:
```jsx
import { BranchSelector } from '../common/BranchSelector'

// In a header or toolbar
<BranchSelector className="my-custom-class" />
```

## Next Steps (Story 13-5)

The `effectiveBranchId` from the context should be used by all queries to filter data by branch. This will be implemented in Story 13-5: Query-level branch filtering.
