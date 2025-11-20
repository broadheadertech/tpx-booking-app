## Current Architecture Snapshot
- Frameworks: React + Vite, Tailwind CSS, Convex, React Router. No ThemeProvider; colors are mostly hardcoded tokens/hex.
- Auth/Roles: AuthContext (client) + Convex services; roles include admin/staff/customer/barber/super_admin; client-side ProtectedRoute gates.
- Multi-tenancy: Branch-centric data model; queries and dashboards scope by `branch_id`.
- Assets: Logos under `public/img/*`; used directly in Login and dashboards.
- Admin UI: Settings tab exists; global/branch management components already in place.

## Objectives
- Enable per-branch (tenant) whitelabel: theme colors, logos, favicon, feature toggles, display name.
- Admin-manageable: super_admin and branch_admin can configure and preview.
- Runtime theming without rebuild: apply via CSS variables and context.

## Phase 1: Data Model & Server APIs
1. Add `branding` table in `convex/schema.ts` (keyed by `branch_id`) with fields:
   - `display_name`, `primary_color`, `accent_color`, `bg_color`, `text_color`, `muted_color`.
   - `logo_light_url`, `logo_dark_url`, `favicon_url`, `banner_url`.
   - `feature_toggles` (object: kiosk, wallet, vouchers, referrals).
   - `updated_by`, `updated_at`.
2. Create `convex/services/branding.ts`:
   - `getBrandingByBranch(branch_id)` and `getBrandingByBranchCode(branch_code)`.
   - `updateBranding(branch_id, payload)` with role checks: allow `super_admin` globally, `branch_admin` for own branch.
3. Export in `convex/services/index.ts` for client access.

## Phase 2: Theme System (Client)
1. Introduce CSS variables in global CSS (e.g., `:root { --color-primary: ... }`).
2. Map Tailwind to CSS variables (tokens) or use arbitrary values: `bg-[var(--color-primary)]`, `text-[var(--color-text)]`.
3. Create `BrandingContext` that:
   - Loads branch branding on app start (from user `branch_id` or route context).
   - Applies variables to `document.documentElement` and updates `<link rel="icon">`.
   - Provides branding values to components.

## Phase 3: Admin UI
1. Add `BrandingSettings` component under Admin → Settings:
   - Color pickers for theme tokens; inputs for logo/favicons (start with URL, upload later).
   - Feature toggles; display name.
   - Live preview panel using CSS variables.
2. Persist via Convex `updateBranding`; show success/error states.
3. Restrict visibility/actions to `super_admin` and `branch_admin`.

## Phase 4: App Integration
1. Replace hardcoded logo paths in Login/Customer/Staff headers with branding URLs.
2. Convert prominent components (headers, buttons, key sections) to use theme tokens instead of fixed hex.
3. Keep incremental migration: tokens for high-visibility views first, broaden over time.

## Phase 5: Public/Unauthenticated Routes
1. For routes with branch context (e.g., kiosk with `branch_code`), load branding by code before render.
2. Fallback to default branding if none set.

## Phase 6: Migration & Defaults
1. Seed default branding for all existing branches (from current palette/assets).
2. Ensure all components render with sensible defaults when branding missing.

## Phase 7: Access Control & Validation
1. Enforce role checks server-side for branding updates.
2. Add unit tests for branding service; verify read/write rules.
3. Verify admin changes reflect immediately across the app via CSS variables and context.

## Notes & Future Enhancements
- Start with URL-based assets to avoid new dependencies; later add secure uploads (S3/Cloudflare R2) if needed.
- If multi-brand across multiple branches under one tenant is required, introduce a `tenants` table and link branches → tenant; branding moves to tenant-level.
- Performance: cache branding per branch in client context; invalidate on update.

Please confirm this plan. Once approved, I will implement server schema/APIs, client context, admin UI, and migrate key views to theme tokens.