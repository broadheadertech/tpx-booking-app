## Objective
Implement a single, system-wide whitelabel branding managed from Admin, with a management experience parallel to Branch/User Management. Apply theme globally via CSS variables, migrate prominent components off hardcoded colors, and add client-side caching with invalidation.

## Data Model & Server APIs
- Add `branding_global` table in Convex with fields:
  - `display_name`, `primary_color`, `accent_color`, `bg_color`, `text_color`, `muted_color`
  - `logo_light_url`, `logo_dark_url`, `favicon_url`, `banner_url`
  - `feature_toggles` (kiosk, wallet, vouchers, referrals)
  - `updated_by`, `updated_at`, `createdAt`, `updatedAt`
- Services in `convex/services/branding.ts`:
  - `getGlobalBranding()` → returns singleton branding (create on first save if missing)
  - `upsertGlobalBranding(sessionToken, payload)` → super_admin-only; records audit fields
- Keep existing branch APIs temporarily (no usage) to avoid breaking changes

## Client Theme System
- Update `BrandingProvider` to load global branding only:
  - Apply CSS variables to `document.documentElement`: `--color-primary`, `--color-accent`, `--color-bg`, `--color-text`, `--color-muted`
  - Update favicon if set
  - Remove branch-code logic; everything uses global values

## Admin UI (Branding Management)
- Add new Admin tab and page `BrandingManagement` (mirrors Branch/User Management style):
  - Header with actions: Edit Branding, Preview, Reset Defaults
  - Summary cards: display name, color swatches, logos, favicon, feature toggles, audit info
  - Edit form: color pickers, URL inputs for logos/favicon/banner, toggles; live preview panel
  - Access control: only visible & editable to `super_admin` (others read-only optional)
  - Save calls `upsertGlobalBranding`; show success/error

## Token Migration (Batch 1)
- Replace hardcoded hex colors with CSS variables:
  - `text-[#FF8C42]` → `text-[var(--color-primary)]`
  - `bg-[#0A0A0A]` → `bg-[var(--color-bg)]`
  - `from-[#FF8C42]` → `from-[var(--color-primary)]`
  - `to-[#FF7A2B]` → `to-[var(--color-accent)]`
  - `border-[#FF8C42]` → `border-[var(--color-primary)]`
- Target files:
  - Admin: `src/pages/admin/Dashboard.jsx`, `src/components/admin/GlobalSettings.jsx`, `src/components/admin/TabNavigation.jsx`, new `BrandingManagement.jsx`
  - Staff: `src/components/staff/DashboardHeader.jsx`
  - Customer: `src/pages/customer/Dashboard.jsx`
  - Common: `src/components/common/Button.jsx`, `src/components/common/Card.jsx`
- Validate visuals after each change; expand to secondary views in batch 2

## Branding Cache & Invalidation
- `BrandingProvider` caching:
  - Read initial branding from `sessionStorage` (`branding_global_cache`) for fast first paint
  - Subscribe via Convex; when `updatedAt` increases, update cache and reapply variables
  - Expose `refresh()` to force reload after admin save (optional)

## Migration Notes
- Global branding overrides any existing branch branding usage
- Kiosk and all routes read global branding; no query params required

## QA Checklist
- Super admin edits global branding; changes apply across Admin/Staff/Barber/Customer/Kiosk
- Branding Management presents parity with Branch/User Management UX
- Prominent components reflect tokens instead of hardcoded colors
- Cache ensures quick load; updates reflect after save

Once approved, I will implement the global table/services, Admin BrandingManagement UI, token migration in targeted components, and caching/invalidation in the provider.