# Story 6.4: Build Payment Settings UI

Status: done

## Story

As a **branch admin**,
I want **a Payment Settings page to configure PayMongo for my branch**,
So that **I can enter API keys, set fees, and enable online payments**.

## Acceptance Criteria

1. **Given** I am logged in as a branch_admin or super_admin
   **When** I navigate to the Payment Settings page
   **Then** I see a form with fields for:
   - PayMongo Public Key (text input)
   - PayMongo Secret Key (password input)
   - Webhook Secret (password input)
   - Convenience Fee Percent (number input, 0-100 range)
   - Payment Options: Pay Now, Pay Later, Pay at Shop (toggle switches)

2. **Given** I have no PayMongo API keys configured
   **When** I view the Payment Options section
   **Then** Pay Now and Pay Later toggles are disabled (grayed out)
   **And** only Pay at Shop can be enabled
   **And** I see a message "Configure PayMongo API keys to enable online payments"

3. **Given** I have valid PayMongo API keys configured
   **When** I view the Payment Options section
   **Then** all three toggles are available
   **And** at least one payment option must be enabled (validation)

4. **Given** I enter valid PayMongo API keys and click Save
   **When** the system saves the configuration
   **Then** I see a success message "Payment configuration saved"
   **And** I see a confirmation that config is active

5. **Given** I am not a branch_admin or super_admin
   **When** I try to access Payment Settings
   **Then** I am denied access (RBAC - FR26)

## Tasks / Subtasks

- [x] Task 1: Create PaymentSettings.jsx component
  - [x] 1.1 Create form with API key inputs
  - [x] 1.2 Add payment option toggles
  - [x] 1.3 Add convenience fee input
  - [x] 1.4 Implement save functionality
  - [x] 1.5 Add loading and error states
- [x] Task 2: Add to Staff TabNavigation
  - [x] 2.1 Add "Payments" tab
  - [x] 2.2 Route to PaymentSettings component
- [x] Task 3: Implement RBAC
  - [x] 3.1 Check user role before rendering
  - [x] 3.2 Show access denied for non-admins
- [x] Task 4: Test and verify
  - [x] 4.1 Build passed successfully
  - [x] 4.2 Component renders correctly

## Dev Notes

### Component Location

`src/components/staff/PaymentSettings.jsx`

### UI Requirements

| Field | Type | Validation |
|-------|------|------------|
| Public Key | text | Required when saving online payments |
| Secret Key | password | Required when saving online payments |
| Webhook Secret | password | Required when saving online payments |
| Convenience Fee % | number | 0-100 range |
| Pay Now | toggle | Requires API keys |
| Pay Later | toggle | Requires API keys |
| Pay at Shop | toggle | Always available |

### Convex Functions Used

- `api.services.paymongo.getPaymentConfig` - Load existing config
- `api.services.paymongo.savePaymentConfig` - Save config

### References

- [Source: architecture-paymongo.md#payment-settings-ui]
- [Source: prd-paymongo.md#FR8-12] - Configuration requirements
- [Source: prd-paymongo.md#FR26] - RBAC

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None - clean implementation_

### Completion Notes List

1. Created PaymentSettings.jsx with full form UI
2. API key inputs with password visibility toggle
3. Payment option toggles (Pay Now, Pay Later, Pay at Shop)
4. Convenience fee percentage input (0-100 range)
5. RBAC check - only branch_admin/super_admin can access
6. Loading states and error handling
7. Success/error messages for save operations
8. Added "payments" icon mapping to TabNavigation
9. Added "payments" tab to baseTabs in Dashboard.jsx
10. Added PaymentSettings case in renderContent switch
11. Build verified successful

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | PaymentSettings.jsx component |
| 2026-01-27 | Modified | TabNavigation.jsx - added payments icon |
| 2026-01-27 | Modified | Dashboard.jsx - added import, tab, and case |
| 2026-01-27 | Verified | Build passed successfully |

### File List

- `src/components/staff/PaymentSettings.jsx` (new)
- `src/components/staff/TabNavigation.jsx` (modified)
- `src/pages/staff/Dashboard.jsx` (modified)
