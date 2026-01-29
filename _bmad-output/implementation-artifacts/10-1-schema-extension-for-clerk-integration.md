# Story 10.1: Schema Extension for Clerk Integration

Status: done

## Story

As a **developer**,
I want to extend the database schema with Clerk-related fields,
So that the system can store Clerk user IDs, organization mappings, and permission configurations.

## Acceptance Criteria

1. **Users Table Extension** - Add Clerk and RBAC fields to existing users table
2. **Branches Table Extension** - Add Clerk Organization ID field
3. **Permission Audit Log Table** - Create new table for tracking permission changes
4. **Role Enum Update** - Add "admin_staff" role to the role union
5. **Page Access Migration** - Prepare for array-to-object structure migration
6. **Index Creation** - Add required indexes for Clerk-related queries

## Tasks / Subtasks

- [x] Task 1: Extend users table schema (AC: #1, #4, #5)
  - [x] Add `clerk_user_id` field (optional string)
  - [x] Add `clerk_org_ids` field (optional array of strings)
  - [x] Add `migration_status` field (optional union: "pending" | "invited" | "completed")
  - [x] Add `legacy_password_hash` field (optional string)
  - [x] Add "admin_staff" to role union
  - [x] Add index `by_clerk_user_id` on `clerk_user_id`
  - [x] Add index `by_migration_status` on `migration_status`

- [x] Task 2: Create page_access object schema (AC: #5)
  - [x] Define PagePermission object type with 5 actions (view, create, edit, delete, approve)
  - [x] Add all 25 Staff Dashboard pages (actual count from spec)
  - [x] Add all 5 Admin Dashboard pages (branches, catalog, branding, emails, settings)
  - [x] Document always-accessible pages: overview, custom_bookings, walkins

- [x] Task 3: Extend branches table schema (AC: #2)
  - [x] Add `clerk_org_id` field (optional string)
  - [x] Add index `by_clerk_org_id` on `clerk_org_id`

- [x] Task 4: Create permissionAuditLog table (AC: #3, #6)
  - [x] Define table with user_id, changed_by, change_type, previous_value, new_value, created_at
  - [x] Add change_type union with 6 values
  - [x] Add indexes: by_user, by_changed_by, by_created_at

- [x] Task 5: Deploy and verify schema (AC: all)
  - [x] Run `npx convex dev` to push schema changes
  - [x] Verify all tables created without errors
  - [x] Confirm indexes are active

## Dev Notes

### Current State Analysis

**Existing `users` table schema (lines 101-135 in convex/schema.ts):**
```typescript
users: defineTable({
  username: v.string(),
  email: v.string(),
  password: v.string(),
  // ... other fields
  role: v.union(
    v.literal("staff"),
    v.literal("customer"),
    v.literal("admin"),
    v.literal("barber"),
    v.literal("super_admin"),
    v.literal("branch_admin")
  ),
  branch_id: v.optional(v.id("branches")),
  page_access: v.optional(v.array(v.string())), // CURRENT: Array-based
  // ... other fields
})
  .index("by_email", ["email"])
  .index("by_username", ["username"])
  .index("by_branch", ["branch_id"])
  .index("by_role", ["role"])
  .index("by_branch_role", ["branch_id", "role"]),
```

**Missing Role:** "admin_staff" - needs to be added to the role union

**page_access Current:** `v.optional(v.array(v.string()))` - array-based
**page_access Target:** Object-based with 30 pages, 5 actions each

### Architecture Decisions

**Decision: Keep array-based page_access during schema migration**

Since this is Story 10.1 (schema extension only), we will:
1. Keep the existing `page_access: v.optional(v.array(v.string()))` field
2. Add a NEW `page_access_v2: v.optional(v.object({...}))` field for the object-based structure
3. Story 14.6 (Page Access Structure Migration) will handle the actual data migration and cutover

This ensures backward compatibility during the transition.

### Schema Changes Summary

```typescript
// Add to users table after existing fields:
clerk_user_id: v.optional(v.string()),
clerk_org_ids: v.optional(v.array(v.string())),
migration_status: v.optional(v.union(
  v.literal("pending"),
  v.literal("invited"),
  v.literal("completed")
)),
legacy_password_hash: v.optional(v.string()),

// NEW page_access structure (add alongside existing array-based field)
page_access_v2: v.optional(v.object({
  // 24 Staff Dashboard pages + 6 Admin pages = 30 total
  // Each page has: { view, create, edit, delete, approve } booleans
})),

// Add to indexes:
.index("by_clerk_user_id", ["clerk_user_id"])
.index("by_migration_status", ["migration_status"])
```

### 30 Pages for page_access_v2

**Staff Dashboard Pages (24):**
1. overview, 2. reports, 3. bookings, 4. custom_bookings, 5. calendar
6. walkins, 7. pos, 8. barbers, 9. users, 10. services
11. customers, 12. products, 13. order_products, 14. vouchers, 15. payroll
16. cash_advances, 17. royalty, 18. pl, 19. balance_sheet, 20. payments
21. payment_history, 22. attendance, 23. events, 24. notifications
25. email_marketing

**Admin Dashboard Additional Pages (6):**
26. branches, 27. catalog, 28. branding, 29. emails, 30. settings

**Always Accessible (bypass permission check):**
- overview, custom_bookings, walkins

### permissionAuditLog Table Schema

```typescript
permissionAuditLog: defineTable({
  user_id: v.id("users"),
  changed_by: v.id("users"),
  change_type: v.union(
    v.literal("role_changed"),
    v.literal("page_access_changed"),
    v.literal("branch_assigned"),
    v.literal("branch_removed"),
    v.literal("user_created"),
    v.literal("user_deleted")
  ),
  previous_value: v.optional(v.string()), // JSON stringified
  new_value: v.string(), // JSON stringified
  created_at: v.number(),
})
  .index("by_user", ["user_id"])
  .index("by_changed_by", ["changed_by"])
  .index("by_created_at", ["created_at"])
```

### Project Structure Notes

**File to modify:** `convex/schema.ts`

**No new files needed** - this story only modifies the schema file.

**Alignment with existing patterns:**
- Tables use camelCase: `permissionAuditLog`
- Fields use snake_case: `clerk_user_id`, `migration_status`
- Indexes use by_fieldname pattern: `by_clerk_user_id`
- Foreign keys use `v.id("tableName")`: `v.id("users")`

### References

- [Source: _bmad-output/planning-artifacts/architecture-clerk-rbac.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/epics-clerk-rbac.md#Story 1.1]
- [Source: _bmad-output/planning-artifacts/project-context.md#Naming Conventions]
- [Source: convex/schema.ts#users table (lines 101-135)]

### Critical Implementation Notes

1. **Schema Version:** Update the schema version comment at the top of schema.ts
2. **Backward Compatibility:** All new fields MUST be optional to avoid breaking existing data
3. **Index First:** Indexes must be declared in schema before any queries use `.withIndex()`
4. **No Data Migration:** This story only extends schema - data migration is Story 14.6
5. **Role Addition:** Add "admin_staff" to the role union for cross-branch operations support

### Convex Schema Change Workflow

1. Edit `convex/schema.ts` with all changes
2. Run `npx convex dev` to push changes
3. Convex will validate schema and create tables/indexes
4. Verify in Convex dashboard that all tables/indexes exist

### Validation Checklist

- [x] `users` table has `clerk_user_id` field
- [x] `users` table has `clerk_org_ids` field
- [x] `users` table has `migration_status` field
- [x] `users` table has `legacy_password_hash` field
- [x] `users` table role union includes "admin_staff"
- [x] `users` table has index `by_clerk_user_id`
- [x] `users` table has index `by_migration_status`
- [x] `branches` table has `clerk_org_id` field
- [x] `branches` table has index `by_clerk_org_id`
- [x] `permissionAuditLog` table exists with all fields
- [x] `permissionAuditLog` has all 3 indexes
- [x] `npx convex dev` succeeds without errors

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Convex deployment output confirmed 6 new indexes created successfully

### Completion Notes List

1. **Schema version updated** to 2026-01-28v1 with descriptive comment
2. **Users table extended** with 4 Clerk fields + page_access_v2 object (30 pages × 5 actions)
3. **Role union updated** with "admin_staff" for cross-branch operations support
4. **Branches table extended** with clerk_org_id field for Clerk Organization mapping
5. **permissionAuditLog table created** with 6 change types and 3 indexes
6. **All indexes verified active** via `npx convex dev --once` output
7. **Backward compatibility maintained** - existing page_access array field preserved alongside new page_access_v2 object

### Implementation Notes

- page_access_v2 includes 30 pages total (25 Staff Dashboard + 5 Admin Dashboard)
- Always-accessible pages documented in schema comments: overview, custom_bookings, walkins
- All new fields are optional (v.optional) to avoid breaking existing data
- permissionAuditLog uses JSON stringified values for previous_value/new_value to support any data structure

### File List

- convex/schema.ts (modified)
