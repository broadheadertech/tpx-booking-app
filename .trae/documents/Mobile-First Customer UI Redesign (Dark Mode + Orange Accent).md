## Audit Summary
- Layout & IA: Mobile containers and screen grouping are sensible; hierarchy is noisy in booking steps and summary areas. Landing shows a menu icon without a functional drawer.
- Visual Hierarchy: Mixed strong colors within step flows reduce clarity; headings and subsection titles are inconsistent; inline hex creates inconsistent accent usage.
- Navigation & Flows: Customer flows (Dashboard → Booking → Payment → Wallet) are present but lack native affordances (drawer, bottom tab cues, step progress). Public landing lacks accessible mobile navigation.
- Accessibility: Inputs lack programmatic label association; modals lack dialog semantics and focus handling; toasts lack live-region roles; bottom navigation misses proper ARIA; focus states are faint in dark mode.
- Performance: Large images load without lazy/async decoding or dimensions; initial bundle imports all routes eagerly; hover JS mutations are not mobile-friendly.

## Redesign Goals
- Maintain premium dark mode aesthetic with cohesive orange accent across all UI.
- Achieve native look-and-feel aligned to iOS HIG and Material 3.
- Establish a consistent design system (tokens, components, patterns) for all screens.
- Improve accessibility to WCAG AA, add proper ARIA semantics and focus management.
- Enhance performance: lazy images, route-level code-splitting, reduced CLS, smooth perceived loading.

## Style Guide (Design System)
- Color Palette:
  - Base: `#0A0A0A`, `#141414`, neutrals `#1E1E1E`/`#2A2A2A`, text: `#FFFFFF`, secondary text: `#B3B3B3`.
  - Accent: Orange primary `#FF8C42`; darker accent `#FF7A2B`; success `#22C55E`; warning `#F59E0B`; error `#EF4444`.
  - Contrast: Minimum 4.5:1 for body text on dark surfaces; 3:1 for large text and icons.
- Typography:
  - iOS: SF Pro Text; Android: Roboto; Web fallback: Inter.
  - Scale: H1 24–28, H2 20–22, H3 18–20, Body 16, Meta 14; consistent weights.
- Spacing & Radius:
  - Spacing scale 4/8/12/16/24/32; radii 8/12/16; dark-mode elevations with subtle shadow + overlay.
- Iconography:
  - Use Lucide icons; no emojis; sizes 16/20/24; consistent stroke.
- States & Motion:
  - Focus rings `2px` in orange; hover/pressed with 8–12% light overlays; reduced motion support.

## Components & Patterns
- Buttons: Primary (solid orange), Secondary (outline orange), Tertiary (text); sizes (L/M/S); loading states; disabled contrast.
- Inputs: Labeled, helper text via `aria-describedby`, validation with inline icons and clear messaging.
- Cards: Uniform padding and radius; elevated vs flat variants.
- Modals/Sheets: Dialog semantics, labeled titles, ESC/gesture close, focus trap; bottom sheet for mobile.
- Toasts: Live-region roles; success/warn/error styles; staged dismissal.
- Navigation:
  - Landing: Accessible drawer with clear actions (Book, Sign In, Policies).
  - Customer: Bottom tab bar with 4–5 items, active indicator, `aria-current`.
- Progress: Step indicator for booking; linear progress bar with labeled steps.
- Lists & Items: Tap targets ≥44px; leading icons; trailing actions.

## Key Screen Redesigns
- Landing: Implement a functional mobile drawer; hero with optimized images; clear primary CTA; consistent orange accents.
- Customer Dashboard: Clean card layout, consistent section titles, refined meta text contrast; bottom tab navigation.
- Service Booking: Simplified step UI, Lucide icons replacing emojis; consistent summary card; clear Pay Now/Later buttons.
- Wallet: Strong focus states; labeled amount input; accessible top-up modal.
- Auth: Clear inputs with helper text; error messaging with icons; password visibility toggle.
- Payments: Success/failure screens with clear iconography and next steps; consistent visuals.
- Notifications: Accessible live regions and dialog roles; consistent visual rhythm.
- Kiosk: Large targets, minimal chrome, strong contrast for quick actions.

## Accessibility Implementation
- Inputs: Associate labels; ensure helper text; visible focus rings in orange; validation states meeting contrast.
- Modals: `role="dialog"`, `aria-modal`, labeled titles, ESC/gesture close, focus management.
- Toasts: `aria-live` with `role="status"`; `role="alert"` for errors; non-blocking.
- Navigation: `role="navigation"`, `aria-label`, active state with `aria-current`.
- Contrast: Audit all text/icons for AA; adjust gray usage in dark mode accordingly.

## Performance Improvements
- Images: Lazy-load non-critical imagery, `decoding="async"`, explicit `width/height` to reduce CLS; compress assets.
- Code Splitting: Lazy-load heavy routes; skeletons for perceived performance.
- Interaction: Remove JS hover style mutations; rely on CSS states; avoid heavy gradients.

## Prototype & Mockups
- High-fidelity mockups for all key screens in Figma (dark mode first).
- Interactive prototype demonstrating flows: Landing → Auth → Dashboard → Booking → Payment → Wallet.
- Platform variants: iOS-styled navigation/tab bars and Material 3 bottom app bar.

## Assets & Handoff
- Exported assets (SVG icons, raster images) optimized; icon set mapped.
- Component specs: spacing, sizes, variants, states; redlines included.
- Tokens: Color, spacing, radius, typography delivered; Tailwind theme mappings.
- Implementation-ready artifacts: TypeScript prop definitions and usage examples for common components; accessibility guidelines per component.

## Success Metrics & Measurement
- Usability: Task completion rate and time-on-task for booking and wallet top-up.
- Satisfaction: Post-task rating (1–5) and System Usability Scale.
- Performance: Lighthouse scores (Performance ≥90, Accessibility ≥95), reduced CLS and LCP times.
- Accessibility: WCAG AA conformance checks across screens.

## Delivery Plan & Timeline
- Phase 1 (Design System, 3–4 days): Finalize palette, tokens, components; update iconography.
- Phase 2 (Key Screens, 4–5 days): Landing, Dashboard, Service Booking, Wallet.
- Phase 3 (Secondary Screens, 3–4 days): Auth, Payments, Notifications, Kiosk.
- Phase 4 (Prototype & Handoff, 2–3 days): Interactive prototype, detailed specs, assets.

## Implementation Notes
- Keep dependencies minimal; use Lucide for icons; maintain Tailwind tokens; avoid inline hex.
- For web React implementation, apply `lazy()` + `Suspense` and image best practices; if/when moving to Next.js, use `next/image` and route-level optimizations.

## Approval
- On approval, we will produce the full style guide, high‑fidelity mockups, interactive prototype, design system documentation, and implementation-ready specs/assets aligned to this plan.