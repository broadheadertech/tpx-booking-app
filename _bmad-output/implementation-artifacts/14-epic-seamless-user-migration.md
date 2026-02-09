# Epic 14: Seamless User Migration

## Status: Done

## Implementation Summary

Implemented comprehensive user migration system from legacy authentication to Clerk, with role mapping, page access migration, and dual-auth support during transition.

---

## Story 14-1: Migration Status Tracking

### Changes Made

**convex/services/clerkMigration.ts** - Enhanced queries:

- `getMigrationStats` - Enhanced to track invited status and byStatus breakdown
- `getUsersByMigrationStatus` - New query to filter users by status (pending, invited, completed, failed)

### Usage

```typescript
// Get migration statistics
const stats = await getMigrationStats({});
// Returns: { total, migrated, pending, invited, failed, byRole, byStatus }

// Get users by status
const pendingUsers = await getUsersByMigrationStatus({ status: "pending", limit: 50 });
const invitedUsers = await getUsersByMigrationStatus({ status: "invited" });
```

---

## Story 14-2: Invite-Based User Migration

### Changes Made

**convex/services/clerkMigration.ts** - New actions:

- `markUserInvited` - Internal mutation to mark user as invited
- `sendMigrationInvite` - Action to send Clerk invitation email
- `sendBulkMigrationInvites` - Action to send invites to multiple users

### Usage

```typescript
// Send single invite
await sendMigrationInvite({
  userId: "user_id",
  email: "user@example.com",
  redirectUrl: "https://app.com/auth/clerk-callback"
});

// Send bulk invites
await sendBulkMigrationInvites({
  userIds: ["user_1", "user_2", "user_3"],
  redirectUrl: "https://app.com/auth/clerk-callback"
});
```

---

## Story 14-3: Automatic Bulk Import Migration

### Status: Already Implemented

Existing `migrateAllUsers` and `createClerkUser` actions handle bulk import with:
- Dry run support
- Error handling per user
- Idempotent (skips already migrated users)
- Success/failure reporting

---

## Story 14-4: Role Mapping to 6-Role System

### Changes Made

**convex/services/clerkMigration.ts** - New mutation:

- `mapUserRole` - Maps legacy roles to new 6-role system

### Role Mapping Table

| Legacy Role | New Role |
|-------------|----------|
| admin | super_admin |
| manager | branch_admin |
| staff | staff |
| barber | barber |
| customer | customer |
| (unknown) | customer (default) |

### Usage

```typescript
await mapUserRole({ userId: "user_id" });
// Returns: { success, previousRole, newRole, changed }
```

---

## Story 14-5: Data Preservation During Migration

### Changes Made

**convex/services/clerkMigration.ts** - New mutation:

- `preserveLegacyPassword` - Stores password in `legacy_password_hash` field before migration

### Notes

- Legacy password is preserved for potential rollback
- Field is not exposed via public API
- All user data (bookings, payments) remains linked to user_id

---

## Story 14-6: Page Access Structure Migration

### Changes Made

**convex/services/clerkMigration.ts** - New mutation:

- `migratePageAccess` - Converts array-based `page_access` to object-based `page_access_v2`

### Migration Logic

| Role | Page Access |
|------|-------------|
| super_admin, admin_staff | All 30 pages with full permissions |
| branch_admin | All 25 staff pages with full permissions |
| staff | Legacy array items converted + overview |
| barber, customer | Overview (view only) |

### Usage

```typescript
await migratePageAccess({ userId: "user_id" });
// Returns: { success, pagesSet, skipped?, reason? }
```

---

## Story 14-7: Dual Auth System for Transition

### Changes Made

**src/pages/auth/UnifiedLogin.jsx** - New component:

- Supports both Clerk and legacy authentication
- Tab-based UI when both auth methods enabled
- Feature flags control available auth methods
- Migration prompt for invited users

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_CLERK_PUBLISHABLE_KEY | (required) | Enables Clerk auth if set |
| VITE_ENABLE_LEGACY_AUTH | "true" | Set to "false" to disable legacy auth |

### Behavior

1. **Clerk only**: Shows Clerk SignIn component
2. **Legacy only**: Shows email/password form
3. **Both enabled**: Shows tabs to switch between methods
4. **Invited users**: Can use legacy auth with migration prompt

---

## Complete Migration Actions

### Full User Migration

```typescript
// Run complete migration for single user
await runCompleteMigration({ userId: "user_id" });
// - Preserves legacy password
// - Maps role to 6-role system
// - Migrates page_access to v2

// Run batch migration for all users
await runBatchCompleteMigration({ dryRun: false, limit: 100 });
```

---

## Files Changed

| File | Changes |
|------|---------|
| convex/services/clerkMigration.ts | Added getUsersByMigrationStatus, markUserInvited, preserveLegacyPassword, mapUserRole, migratePageAccess, sendMigrationInvite, sendBulkMigrationInvites, runCompleteMigration, runBatchCompleteMigration |
| src/pages/auth/UnifiedLogin.jsx | New dual-auth login page |
| _bmad-output/implementation-artifacts/sprint-status.yaml | Epic 14 marked as done |

---

## Acceptance Criteria Status

### Story 14-1: Migration Status Tracking
| Criteria | Status |
|----------|--------|
| View migration_status on user record | Done |
| migration_status updated to "invited" | Done |
| migration_status updated to "completed" | Done |
| Migration dashboard shows counts by status | Done |

### Story 14-2: Invite-Based User Migration
| Criteria | Status |
|----------|--------|
| Send single migration invite | Done |
| Bulk send migration invites | Done |
| Resend invite functionality | Done |
| User completes Clerk setup via webhook | Done (Story 10-3) |

### Story 14-3: Automatic Bulk Import
| Criteria | Status |
|----------|--------|
| Bulk import users to Clerk | Done |
| Error handling per user | Done |
| Idempotent (skip migrated) | Done |
| Report of failed users | Done |

### Story 14-4: Role Mapping
| Criteria | Status |
|----------|--------|
| admin → super_admin | Done |
| manager → branch_admin | Done |
| Unknown role → customer with warning | Done |

### Story 14-5: Data Preservation
| Criteria | Status |
|----------|--------|
| Bookings remain linked | Done |
| Payments remain linked | Done |
| Legacy password preserved | Done |

### Story 14-6: Page Access Migration
| Criteria | Status |
|----------|--------|
| Array converted to object | Done |
| Default page_access by role | Done |
| No array-based page_access remains | Done |

### Story 14-7: Dual Auth System
| Criteria | Status |
|----------|--------|
| Route to Clerk if migrated | Done |
| Route to legacy if not migrated | Done |
| Show both options during migration | Done |
| Disable legacy when migration complete | Done |
