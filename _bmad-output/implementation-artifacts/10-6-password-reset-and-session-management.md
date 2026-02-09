# Story 10-6: Password Reset and Session Management

## Story
As a **user**,
I want to reset my password and manage my session,
So that I can recover access and securely end my session when needed.

## Status: done

## Acceptance Criteria

### AC1: Forgot Password Link
- **Given** I am on the login page
- **When** I click "Forgot password"
- **Then** I am prompted to enter my email address

### AC2: Password Reset Email
- **Given** I have entered my email for password reset
- **When** I submit the form
- **Then** Clerk sends a password reset email to my address
- **And** I see confirmation that the email was sent

### AC3: Password Reset Flow
- **Given** I received the password reset email
- **When** I click the reset link
- **Then** I am taken to a secure password reset page
- **And** I can enter a new password

### AC4: Password Update Confirmation
- **Given** I have entered a new valid password
- **When** I submit the new password
- **Then** my password is updated in Clerk
- **And** I am redirected to login with my new password

### AC5: Logout Functionality
- **Given** I am logged into the application
- **When** I click "Log out"
- **Then** my Clerk session is terminated
- **And** I am redirected to the login page
- **And** I cannot access protected pages without logging in again

### AC6: Multi-Device Session Management
- **Given** I am logged in on multiple devices
- **When** I log out from one device
- **Then** only that device's session is terminated
- **And** my other sessions remain active

## Technical Implementation

### Tasks

1. **Clerk SignIn Component Already Handles Forgot Password**
   - Clerk's `<SignIn />` component has built-in forgot password flow
   - Users click "Forgot password?" link on login form
   - Clerk handles email sending and password reset

2. **Implement Proper Clerk Logout**
   - Use `useClerk()` hook with `signOut()` method
   - Update logout handlers in dashboards
   - Clear any local state on logout

3. **Update useCurrentUser Hook**
   - Add Clerk signOut to the logout function
   - Handle both legacy and Clerk logout

4. **Session Management**
   - Sessions managed by Clerk automatically
   - Active sessions viewable in Security Settings (UserProfile)

## Dev Notes

- Clerk's SignIn component handles forgot password natively
- No custom password reset page needed - Clerk hosts it
- Logout must call `clerk.signOut()` for Clerk users
- Security Settings page already shows active sessions

## Files to Modify
- `src/hooks/useCurrentUser.js` - Add Clerk signOut
- `src/components/staff/LogoutConfirmModal.jsx` - Handle Clerk logout
- `src/components/admin/DashboardHeader.jsx` - Handle Clerk logout
- Dashboard headers that have logout functionality

---
*Story created: 2026-01-29*
