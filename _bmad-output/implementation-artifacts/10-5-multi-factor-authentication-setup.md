# Story 10-5: Multi-Factor Authentication Setup

## Story
As a **user**,
I want to set up multi-factor authentication,
So that my account has an additional layer of security.

## Status: done

## Acceptance Criteria

### AC1: MFA Option Visible
- **Given** I am logged into my account
- **When** I navigate to account security settings
- **Then** I see an option to enable MFA

### AC2: QR Code Display
- **Given** I choose to enable MFA
- **When** I select authenticator app
- **Then** Clerk displays a QR code
- **And** I can scan it with my authenticator app

### AC3: MFA Verification
- **Given** I have scanned the QR code
- **When** I enter the verification code from my authenticator
- **Then** MFA is enabled on my account
- **And** I see confirmation that MFA is active

### AC4: MFA Requirement on Login
- **Given** I have MFA enabled
- **When** I log in with my email and password
- **Then** I am prompted for my MFA code
- **And** I can only access the app after entering the correct code

## Technical Implementation

### Tasks

1. **Create Account Security Settings Page**
   - New page at `/settings/security` or integrate with existing profile
   - Use Clerk's `<UserProfile />` component for MFA management
   - Or use `useUser()` hook with `user.createTotp()` for custom UI

2. **Configure Clerk MFA in Dashboard**
   - Enable MFA in Clerk Dashboard → User & Authentication → Multi-factor
   - Configure authenticator app as MFA method

3. **Add Route for Security Settings**
   - Add protected route for security settings page
   - Link from user profile/settings dropdown

4. **Style MFA Components**
   - Match dark theme styling
   - Consistent with existing Clerk login appearance

## Dev Notes

- Clerk handles all MFA logic (TOTP generation, verification, backup codes)
- Can use `<UserProfile />` component which has built-in MFA management
- Or use Clerk hooks for custom UI: `useUser()` → `user.createTotp()`
- MFA requirement is configured in Clerk Dashboard

## Files to Create/Modify
- `src/pages/settings/Security.jsx` - New security settings page
- `src/App.jsx` - Add route
- Components may use Clerk's `<UserProfile />` or custom MFA components

---
*Story created: 2026-01-29*
