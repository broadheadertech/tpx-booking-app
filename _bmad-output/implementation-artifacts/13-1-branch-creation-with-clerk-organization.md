# Story 13-1: Branch Creation with Clerk Organization

## Status: Done

## Implementation Summary

Implemented automatic Clerk Organization creation when branches are created, enabling multi-tenant data isolation at the authentication layer.

## Changes Made

### 1. convex/services/branches.ts
- Added `createBranchInternal` internal mutation for core branch creation logic
- Added `createBranchWithClerkOrg` action that:
  - Calls Clerk API to create organization
  - Creates branch with `clerk_org_id`
  - Handles rollback if Clerk API fails
  - Updates Clerk org metadata with `branch_id`
- Added `linkBranchToClerkOrg` mutation for manual linking
- Added `generateSlug()` helper for URL-safe organization slugs

### 2. convex/services/clerkSync.ts
- Added organization webhook handlers:
  - `handleOrgCreated` - Links Clerk org to branch
  - `handleOrgUpdated` - Logs organization updates
  - `handleOrgDeleted` - Unlinks org from branch
  - `handleOrgMembershipCreated` - Assigns user to branch
  - `handleOrgMembershipDeleted` - Removes user from branch
- Added `ClerkOrgMembershipPayload` interface

### 3. convex/http.ts
- Updated Clerk webhook handler to route organization events:
  - `organization.created`
  - `organization.updated`
  - `organization.deleted`
  - `organizationMembership.created`
  - `organizationMembership.deleted`
- Updated `ClerkWebhookPayload` type to support organization fields

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| When creating a branch, a Clerk Organization is created | Done |
| Branch's `clerk_org_id` is set to the Clerk Organization ID | Done |
| Handle rollback if Clerk API fails | Done |
| Handle `organization.created` webhook to link externally created orgs | Done |

## Usage

### Creating a branch with Clerk Organization:
```typescript
// From frontend
const result = await createBranchWithClerkOrg({
  name: "Branch Name",
  address: "123 Main St",
  phone: "555-1234",
  email: "branch@example.com",
});
// Returns: { branchId: Id<"branches">, clerk_org_id: string }
```

### Manual linking (for existing branches):
```typescript
await linkBranchToClerkOrg({
  branchId: "...",
  clerk_org_id: "org_xxx",
});
```

## Webhook Configuration

Ensure these events are enabled in Clerk Dashboard > Webhooks:
- `organization.created`
- `organization.updated`
- `organization.deleted`
- `organizationMembership.created`
- `organizationMembership.deleted`

## Environment Variables Required

- `CLERK_SECRET_KEY` - For Clerk API calls (in Convex dashboard)
- `CLERK_WEBHOOK_SECRET` - For webhook verification (in Convex dashboard)
