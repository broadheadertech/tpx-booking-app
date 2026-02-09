# Story 13-2: User Branch Assignment and Org Sync

## Status: Done

## Implementation Summary

Implemented user branch assignment with automatic Clerk Organization membership sync, ensuring branch isolation is enforced at both database and authentication levels.

## Changes Made

### 1. convex/services/branchUsers.ts (New File)
Created a dedicated service for branch user management with Clerk sync:

**Queries:**
- `getUsersByBranch` - Get users assigned to a specific branch with optional role filter
- `getUnassignedUsers` - Get branch-scoped users without a branch assignment

**Actions:**
- `assignUserToBranch` - Assigns user to branch with Clerk Organization membership:
  1. Validates user and branch exist
  2. If both have Clerk IDs, adds user to Clerk Organization as member
  3. Updates user's `branch_id` and `clerk_org_ids`
  4. Creates audit log entry

- `removeUserFromBranch` - Removes user from branch with Clerk Organization sync:
  1. Validates user has a branch assignment
  2. If both have Clerk IDs, removes user from Clerk Organization
  3. Clears user's `branch_id` and updates `clerk_org_ids`
  4. Creates audit log entry

**Internal Functions:**
- `updateUserBranchInternal` - Internal mutation for database updates
- `createBranchAssignmentAuditLog` - Creates audit log with correct changed_by
- `getUserById` / `getBranchById` - Internal queries for action use

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| When assigning user to branch, user's branch_id is updated | Done |
| User is added to the branch's Clerk Organization | Done |
| User's clerk_org_ids includes the new org ID | Done |
| Audit log entry created with change_type "branch_assigned" | Done |
| When removing user from branch, branch_id is cleared | Done |
| User is removed from Clerk Organization | Done |
| clerk_org_ids array is updated | Done |
| Audit log entry created with change_type "branch_removed" | Done |
| organizationMembership.created webhook updates branch_id | Done (Story 13-1) |
| organizationMembership.deleted webhook removes branch | Done (Story 13-1) |

## Usage

### Assigning a user to a branch:
```typescript
await assignUserToBranch({
  userId: "user_id",
  branchId: "branch_id",
  adminUserId: "admin_user_id", // Optional - for audit trail
});
// Returns: { success: true, userId, branchId, clerkOrgId, clerkSynced }
```

### Removing a user from a branch:
```typescript
await removeUserFromBranch({
  userId: "user_id",
  adminUserId: "admin_user_id", // Optional - for audit trail
});
// Returns: { success: true, userId, previousBranchId, clerkSynced }
```

### Querying users by branch:
```typescript
const users = await getUsersByBranch({
  branchId: "branch_id",
  roleFilter: "staff", // Optional: "staff" | "barber" | "branch_admin" | "all"
});
```

## Notes

- Clerk API calls are non-blocking - if Clerk fails, the local database update still proceeds
- The webhook handlers from Story 13-1 ensure sync in the opposite direction (Clerk -> Convex)
- Audit logs are stored in the `permissionAuditLog` table
