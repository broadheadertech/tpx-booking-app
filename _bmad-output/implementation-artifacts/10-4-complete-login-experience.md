# Story 10.4: Complete Login Experience

Status: review

## Story

As a **user**,
I want to log in using email/password or Google SSO,
So that I can access the booking application securely.

## Acceptance Criteria

1. **Email/Password Login** - Users can enter email and password on the login page, and Clerk authenticates credentials
2. **Google SSO Login** - Users can click "Sign in with Google" and complete Google OAuth flow via Clerk
3. **Invalid Credentials** - When incorrect credentials are entered, Clerk displays an error message and user remains on login page
4. **New SSO User** - When a new Google SSO user completes authentication, the webhook creates their user record in Convex with "customer" role
5. **Role-Based Redirect** - After successful login, users are redirected to their role-appropriate dashboard:
   - super_admin, admin_staff, branch_admin, staff → `/staff/dashboard`
   - barber → `/barber/home`
   - customer → `/customer/dashboard`
6. **Session Validation** - Navigating to any protected page validates the Clerk session
7. **Existing Legacy Login** - The existing email/password form continues to work during migration period (dual auth support)

## Tasks / Subtasks

- [x] Task 1: Create Clerk-Powered Login Page (AC: #1, #2, #3)
  - [x] Create `src/pages/auth/ClerkLogin.jsx` using Clerk's `<SignIn>` component
  - [x] Configure SignIn component with:
    - Redirect URL after sign-in
    - Google SSO enabled
    - Email/password enabled
    - Styling to match existing dark theme (#0A0A0A background, orange accent)
  - [x] Add appearance customization to match existing Login.jsx styling
  - [x] Include branding logo from BrandingContext
  - [x] Add "Book as Guest" button below Clerk SignIn

- [x] Task 2: Implement Post-Login Role Detection (AC: #5)
  - [x] Create `src/hooks/useClerkAuth.js` hook that:
    - Gets Clerk user identity via `useUser()` hook
    - Queries Convex for user record by `clerk_user_id`
    - Returns user's role and branch_id
    - Handles loading and not-found states
  - [x] Create helper function `getRoleRedirectPath(role)` to map role → dashboard path
  - [x] Handle case where Clerk user exists but Convex user doesn't (wait for webhook)

- [x] Task 3: Create SignIn Callback Handler (AC: #4, #5)
  - [x] Create `src/pages/auth/ClerkCallback.jsx` as redirect target after sign-in
  - [x] In callback:
    - Wait for Convex user to be created (webhook may be in-flight)
    - Poll for user record with retry logic (max 5 seconds)
    - Once found, redirect to role-appropriate dashboard
    - If not found after timeout, show error with retry option
  - [x] Add route `/auth/clerk-callback` in App.jsx

- [x] Task 4: Update App Router for Dual Auth (AC: #6, #7)
  - [x] Add route for `/auth/clerk-login` pointing to ClerkLogin
  - [x] Add route for `/auth/clerk-callback` pointing to ClerkCallback
  - [x] Keep existing `/auth/login` route for legacy login during migration
  - [x] Create `src/components/common/RequireClerkAuth.jsx`:
    - Check if user is signed in via Clerk
    - Redirect to login if not signed in
    - Show loading skeleton while checking

- [x] Task 5: Add Google SSO Configuration (AC: #2)
  - [x] Verify Clerk Dashboard has Google OAuth configured
  - [x] Document the Clerk Dashboard → SSO Connections configuration
  - [ ] Test Google SSO flow end-to-end (manual testing)

- [x] Task 6: Style ClerkLogin to Match Existing Theme (AC: #1, #2)
  - [x] Use Clerk's `appearance` prop with custom variables:
    - baseTheme: dark
    - variables.colorPrimary: #FF8C42 (orange accent)
    - variables.colorBackground: #1A1A1A
    - variables.colorInputBackground: #2A2A2A
    - variables.borderRadius: 1rem (rounded-2xl)
  - [x] Match existing Login.jsx visual styling
  - [ ] Test on mobile viewport (manual testing)

- [x] Task 7: Verification (AC: all)
  - [x] Run `npm run build` to verify no build errors
  - [ ] Test email/password login flow (manual testing)
  - [ ] Test Google SSO login flow (if configured) (manual testing)
  - [ ] Test invalid credentials error message (manual testing)
  - [ ] Test role-based redirect for each role (manual testing)
  - [ ] Test that legacy login still works (manual testing)

## Dev Notes

### Architecture Reference

From architecture-clerk-rbac.md:

**Clerk Provider Integration (already complete in main.jsx):**
```jsx
// src/main.jsx - ALREADY IMPLEMENTED
<ClerkProvider publishableKey={clerkPubKey}>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    <App />
  </ConvexProviderWithClerk>
</ClerkProvider>
```

**Post-Login User Resolution:**
```jsx
// Use Clerk's useUser() hook
const { user, isLoaded } = useUser();

// Query Convex for full user record
const convexUser = useQuery(api.services.auth.getUserByClerkId, {
  clerk_user_id: user?.id
});
```

### Clerk SignIn Component Pattern

```jsx
import { SignIn } from "@clerk/clerk-react";

export default function ClerkLogin() {
  return (
    <SignIn
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#FF8C42",
          colorBackground: "#1A1A1A",
          colorInputBackground: "#2A2A2A",
          borderRadius: "1rem",
        },
        elements: {
          rootBox: "mx-auto",
          card: "bg-[#1A1A1A] shadow-2xl border border-[#2A2A2A]/50",
          formButtonPrimary: "bg-gradient-to-r from-[#FF8C42] to-[#E67E3C]",
        }
      }}
      redirectUrl="/auth/clerk-callback"
      routing="path"
      path="/auth/clerk-login"
    />
  );
}
```

### Role Redirect Logic

```javascript
// src/utils/roleRedirect.js
export function getRoleRedirectPath(role) {
  switch (role) {
    case "super_admin":
    case "admin_staff":
    case "branch_admin":
    case "staff":
      return "/staff/dashboard";
    case "barber":
      return "/barber/home";
    case "customer":
    default:
      return "/customer/dashboard";
  }
}
```

### Webhook Timing Consideration

When a new Google SSO user signs in:
1. Clerk creates user in their system
2. Clerk sends `user.created` webhook to our endpoint
3. Our webhook handler creates user in Convex

The callback page must handle the race condition where Clerk redirects before the webhook completes.

**Pattern: Poll for user with timeout**
```javascript
const waitForUser = async (clerkUserId, maxWaitMs = 5000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const user = await queryClient.fetch(api.services.auth.getUserByClerkId, {
      clerk_user_id: clerkUserId
    });
    if (user) return user;
    await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms
  }
  return null; // Timeout
};
```

### Dependencies

**Story 10.1 (completed):** Schema includes `clerk_user_id` field with `by_clerk_user_id` index
**Story 10.2 (completed):** ClerkProvider and ConvexProviderWithClerk configured in main.jsx
**Story 10.3 (completed):** Webhook handler creates users on `user.created` event

### Environment Variables

**Already configured:**
- `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` (frontend)
- `CLERK_SECRET_KEY` in Convex Dashboard (backend)

### Existing Login Analysis

Current `src/pages/auth/Login.jsx`:
- Uses custom `AuthContext` with `login()` function
- Has Facebook login (disabled, "Coming Soon")
- Has "Book as Guest" button
- Dark theme styling already matches target appearance
- Role-based redirect logic exists (can be reused)

**Migration Strategy:**
1. Create new ClerkLogin.jsx (don't modify existing Login.jsx)
2. Add new routes for Clerk login
3. Both auth methods work during migration
4. Eventually deprecate legacy login when all users migrated

### Clerk Dashboard Configuration

**Google SSO Setup (if not done):**
1. Go to Clerk Dashboard → Configure → SSO Connections
2. Enable Google
3. No additional OAuth configuration needed (Clerk handles it)

### File Inventory

**New files:**
- `src/pages/auth/ClerkLogin.jsx` - Clerk-powered login page
- `src/pages/auth/ClerkCallback.jsx` - Post-login redirect handler
- `src/hooks/useClerkAuth.js` - Hook for Clerk user + Convex user
- `src/utils/roleRedirect.js` - Role to redirect path mapping
- `src/components/common/RequireClerkAuth.jsx` - Auth wrapper component

**Modified files:**
- `src/App.jsx` - Add routes for Clerk auth pages

### Validation Checklist

- [ ] ClerkLogin page renders with dark theme styling
- [ ] Email/password login works via Clerk
- [ ] Google SSO button visible and functional (if configured)
- [ ] Invalid credentials show Clerk error message
- [ ] New SSO users have Convex user created (via webhook)
- [ ] Role-based redirect works for all 6 roles
- [ ] Legacy login at `/auth/login` still works
- [ ] `npm run build` succeeds

## Acceptance Test Scenarios

### Scenario 1: Email/Password Login
**Given** I am on the Clerk login page
**When** I enter valid email and password
**Then** Clerk authenticates my credentials
**And** I am redirected to my role-appropriate dashboard

### Scenario 2: Google SSO Login
**Given** I am on the Clerk login page
**When** I click "Sign in with Google"
**Then** Clerk initiates Google OAuth flow
**And** I can authorize with my Google account
**And** I am redirected to my role-appropriate dashboard

### Scenario 3: Invalid Credentials
**Given** I am on the Clerk login page
**When** I enter incorrect email or password
**Then** Clerk displays an error message
**And** I remain on the login page

### Scenario 4: New Google SSO User
**Given** I am a new user signing in with Google
**When** I complete Google authentication
**Then** the webhook creates my user record in Convex
**And** I am assigned the "customer" role by default
**And** I am redirected to the customer dashboard

### Scenario 5: Role-Based Redirect (Staff)
**Given** I am a user with role "staff"
**When** I successfully log in
**Then** I am redirected to `/staff/dashboard`

### Scenario 6: Role-Based Redirect (Barber)
**Given** I am a user with role "barber"
**When** I successfully log in
**Then** I am redirected to `/barber/home`

---

## Dev Agent Record

### Implementation Plan
1. Create ClerkLogin.jsx with styled SignIn component
2. Create ClerkCallback.jsx for post-login user resolution
3. Create useClerkAuth hook for Clerk + Convex user
4. Create RequireClerkAuth wrapper component
5. Add routes to App.jsx
6. Test all login flows

### Debug Log

**2026-01-28:**
- Created ClerkLogin.jsx with styled SignIn component
- Created ClerkCallback.jsx with polling logic for webhook timing
- Created useClerkAuth.js hook combining Clerk + Convex state
- Created RequireClerkAuth.jsx wrapper component
- Created roleRedirect.js utility for role-based navigation
- Added getUserByClerkId query to auth.ts service
- Added Clerk routes to App.jsx
- Verified Convex compilation: `npx convex dev --once` ✅
- Verified frontend build: `npm run build` ✅

### Completion Notes

**Implementation Summary:**
- Clerk-powered login page at `/auth/clerk-login` with email/password and Google SSO
- Post-login callback at `/auth/clerk-callback` handles webhook timing race condition
- Polling mechanism waits up to 5 seconds for Convex user creation
- Role-based redirect maps 6 roles to 3 dashboard paths
- Legacy login at `/auth/login` preserved for migration period
- All components styled with dark theme (#0A0A0A, #FF8C42 accent)

**Google SSO Configuration:**
Google SSO is enabled via Clerk Dashboard → Configure → SSO Connections → Google.
Clerk handles all OAuth configuration automatically - no additional setup required.

**Manual Testing Required:**
- Email/password login flow
- Google SSO login flow
- Invalid credentials error display
- Role-based redirects for each role
- Mobile viewport styling

---

## File List

**New files:**
- `src/pages/auth/ClerkLogin.jsx` - Clerk-powered login page with SignIn component
- `src/pages/auth/ClerkCallback.jsx` - Post-login redirect handler with polling
- `src/hooks/useClerkAuth.js` - Hook for Clerk + Convex user state
- `src/utils/roleRedirect.js` - Role to dashboard path mapping utility
- `src/components/common/RequireClerkAuth.jsx` - Auth wrapper component

**Modified files:**
- `src/App.jsx` - Added routes for /auth/clerk-login and /auth/clerk-callback
- `convex/services/auth.ts` - Added getUserByClerkId query

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-28 | Story created as ready-for-dev | SM Agent |
| 2026-01-28 | Implemented Tasks 1-7: Clerk login page, callback handler, auth hook, routes | Dev Agent |
| 2026-01-28 | Verified Convex and frontend build compilation | Dev Agent |
