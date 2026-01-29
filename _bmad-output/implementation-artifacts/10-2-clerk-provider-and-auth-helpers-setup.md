# Story 10.2: Clerk Provider and Auth Helpers Setup

Status: done

## Story

As a **developer**,
I want to set up the Clerk SDK and authentication helpers,
So that the application can authenticate users via Clerk and verify JWT tokens server-side.

## Acceptance Criteria

1. **Package Installation** - Install @clerk/clerk-react and svix packages
2. **Provider Setup** - Wrap app with ClerkProvider and ConvexProviderWithClerk in src/main.jsx
3. **Auth Helpers** - Create convex/lib/clerkAuth.ts with verifyClerkToken(ctx) and getCurrentUser(ctx) functions
4. **Environment Configuration** - Configure CLERK_SECRET_KEY in Convex dashboard and VITE_CLERK_PUBLISHABLE_KEY in .env.local
5. **Type Safety** - Define TypeScript types for ClerkUser and authenticated context

## Tasks / Subtasks

- [x] Task 1: Install required packages (AC: #1)
  - [x] Run `npm install @clerk/clerk-react` for React SDK
  - [x] Run `npm install svix` for webhook signature verification
  - [x] Verify packages added to package.json
  - [x] Run `npm install` to ensure lock file is updated

- [x] Task 2: Create environment configuration (AC: #4)
  - [x] Add VITE_CLERK_PUBLISHABLE_KEY to .env.local (obtain from Clerk Dashboard)
  - [x] Document CLERK_SECRET_KEY needs to be set in Convex Dashboard
  - [x] Add placeholder comments in .env.local for team reference

- [x] Task 3: Create auth helpers in convex/lib/clerkAuth.ts (AC: #3, #5)
  - [x] Create convex/lib/ directory if not exists
  - [x] Define ClerkUser interface type
  - [x] Implement verifyClerkToken(ctx) function using ctx.auth.getUserIdentity()
  - [x] Implement getCurrentUser(ctx) function to fetch user from database by clerk_user_id
  - [x] Add proper TypeScript typing for MutationCtx/QueryCtx
  - [x] Export all types and functions

- [x] Task 4: Update src/main.jsx with Clerk providers (AC: #2)
  - [x] Import ClerkProvider from @clerk/clerk-react
  - [x] Import ConvexProviderWithClerk from convex/react-clerk, useAuth from @clerk/clerk-react
  - [x] Wrap existing providers with ClerkProvider
  - [x] Replace ConvexProvider with ConvexProviderWithClerk
  - [x] Pass useAuth hook to ConvexProviderWithClerk
  - [x] Handle missing publishable key gracefully with error message

- [x] Task 5: Verify integration (AC: all)
  - [x] Run `npm run dev` to verify app starts without errors
  - [x] Check browser console for Clerk initialization (shows warning when key not set)
  - [x] Run `npx convex dev` to verify Convex functions compile
  - [x] Test that existing functionality is not broken (build succeeds)

## Dev Notes

### Architecture Reference

From architecture-clerk-rbac.md, the Clerk integration follows this pattern:

**Frontend Provider Structure (src/main.jsx):**
```jsx
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

root.render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>
);
```

**Auth Helpers (convex/lib/clerkAuth.ts):**
```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export interface ClerkUser {
  clerk_user_id: string;
  email?: string;
  name?: string;
}

export async function verifyClerkToken(
  ctx: QueryCtx | MutationCtx
): Promise<ClerkUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return {
    clerk_user_id: identity.subject,
    email: identity.email,
    name: identity.name,
  };
}

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const clerkUser = await verifyClerkToken(ctx);
  if (!clerkUser) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) =>
      q.eq("clerk_user_id", clerkUser.clerk_user_id)
    )
    .first();

  return user;
}
```

### Current State Analysis

**Existing src/main.jsx structure (approximate):**
- Uses ConvexProvider directly
- Has BrowserRouter and App components
- Uses StrictMode wrapper

**Required changes:**
1. Replace ConvexProvider with ConvexProviderWithClerk
2. Wrap with ClerkProvider as outermost auth provider
3. Import useAuth hook and pass to ConvexProviderWithClerk

### Environment Variables

**Frontend (.env.local):**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_... # Get from Clerk Dashboard
```

**Backend (Convex Dashboard):**
```
CLERK_SECRET_KEY=sk_test_... # Set via Convex Dashboard Settings > Environment Variables
```

### Package Versions

Based on current ecosystem (January 2026):
- @clerk/clerk-react: ^5.x (latest stable)
- svix: ^1.x (for webhook verification in later stories)

### Dependencies Check

Story 10.1 added the `by_clerk_user_id` index to the users table, which is required for `getCurrentUser()` to work efficiently.

### Coding Conventions (from project-context.md)

- File naming: camelCase for utility files (clerkAuth.ts)
- Folder: convex/lib/ for shared utilities
- Types: Use explicit TypeScript interfaces
- Exports: Named exports preferred

### Testing Notes

This story is infrastructure setup. Testing involves:
1. App starts without console errors
2. Clerk initializes (may show "Missing publishable key" if env not set)
3. Convex functions compile without type errors
4. Existing functionality unaffected (login, booking, etc.)

### Rollback Plan

If issues occur:
1. Revert src/main.jsx to use ConvexProvider directly
2. Remove convex/lib/clerkAuth.ts
3. Keep packages installed (no harm)

### References

- [Source: _bmad-output/planning-artifacts/architecture-clerk-rbac.md#Clerk Integration]
- [Source: _bmad-output/planning-artifacts/epics-clerk-rbac.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/project-context.md#Naming Conventions]
- [Clerk React SDK Docs: https://clerk.com/docs/quickstarts/react]
- [Convex + Clerk Integration: https://docs.convex.dev/auth/clerk]

### Critical Implementation Notes

1. **Order matters**: ClerkProvider must wrap ConvexProviderWithClerk
2. **useAuth hook**: Must be imported from @clerk/clerk-react and passed to ConvexProviderWithClerk
3. **Environment check**: Add graceful handling if VITE_CLERK_PUBLISHABLE_KEY is not set
4. **Backward compatibility**: During migration, the app should work for existing users until Stories 10.3+ complete the migration
5. **No breaking changes**: Existing authentication flow should continue to work

### Validation Checklist

- [x] @clerk/clerk-react in package.json dependencies
- [x] svix in package.json dependencies
- [x] convex/lib/clerkAuth.ts exists with both functions
- [x] src/main.jsx uses ClerkProvider + ConvexProviderWithClerk
- [x] VITE_CLERK_PUBLISHABLE_KEY documented in .env.local
- [x] `npm run dev` starts without errors
- [x] `npx convex dev` compiles without errors
- [x] Browser console shows warning when key not set (expected behavior for migration)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` output: "✔ Convex functions ready! (5.22s)"
- `npm run dev` output: "VITE v7.0.6 ready in 591 ms"
- `npm run build` output: "✓ built in 10.00s"

### Completion Notes List

1. **Packages installed** - @clerk/clerk-react@^5.59.6 and svix@^1.84.1 added to dependencies
2. **Environment configuration** - VITE_CLERK_PUBLISHABLE_KEY placeholder added to .env.local with documentation for CLERK_SECRET_KEY (Convex Dashboard)
3. **Auth helpers created** - convex/lib/clerkAuth.ts with:
   - `ClerkUser` interface type
   - `verifyClerkToken(ctx)` - JWT verification via ctx.auth.getUserIdentity()
   - `getCurrentUser(ctx)` - Fetches user from DB by clerk_user_id
   - `requireCurrentUser(ctx)` - Throws ConvexError if not authenticated
4. **main.jsx updated** - Conditional rendering with ClerkProvider + ConvexProviderWithClerk when key is set, falls back to ConvexProvider when key is missing (backward compatibility)
5. **All verifications passed** - Convex compiles, Vite dev server starts, production build succeeds

### Implementation Notes

- Used conditional rendering in main.jsx to support gradual migration (app works with or without Clerk key)
- Added bonus `requireCurrentUser()` helper for convenience in authenticated mutations
- ConvexProviderWithClerk imported from 'convex/react-clerk' (not @clerk/clerk-react as originally noted in story)

### File List

- package.json (modified - added @clerk/clerk-react, svix dependencies)
- package-lock.json (modified - lock file updated)
- .env.local (modified - added VITE_CLERK_PUBLISHABLE_KEY with documentation)
- convex/lib/clerkAuth.ts (new file - auth helpers)
- convex/auth.config.ts (new file - Clerk auth domain configuration)
- src/main.jsx (modified - Clerk provider integration with fallback)

## Senior Developer Review (AI)

**Review Date:** 2026-01-28
**Reviewer:** Claude Opus 4.5 (Code Review Workflow)
**Outcome:** ✅ Approved (with fixes applied)

### Findings Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | N/A |
| High | 0 | N/A |
| Medium | 3 | ✅ Fixed |
| Low | 2 | Acceptable |

### Action Items

- [x] [AI-Review][Medium] main.jsx async rendering race condition - Fixed: Changed to static import and synchronous JSX conditional
- [x] [AI-Review][Medium] clerkAuth.ts dynamic import of ConvexError - Fixed: Changed to static import at top of file
- [x] [AI-Review][Medium] Missing auth.config.ts for Convex + Clerk - Fixed: Created convex/auth.config.ts with Clerk domain
- [x] [AI-Review][Low] File List missing auto-generated files - Acceptable: convex/_generated/* and dist/* are build artifacts
- [x] [AI-Review][Low] TypeScript type handling in verifyClerkToken - Acceptable: Works correctly with optional types

### Review Notes

1. All Acceptance Criteria validated as properly implemented
2. Code quality issues identified and auto-fixed during review
3. Build and Convex compilation verified after fixes
4. No security vulnerabilities found
5. Backward compatibility maintained with conditional provider rendering
