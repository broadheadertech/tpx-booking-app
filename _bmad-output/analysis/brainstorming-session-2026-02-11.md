---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'First-time user walkthrough overlay tutorial for all roles'
session_goals: 'Tooltip-based step-by-step guided tour highlighting UI elements per role (super admin, branch admin, staff, barber, customer)'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'SCAMPER Method', 'Morphological Analysis']
ideas_generated: 32
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** MASTERPAINTER
**Date:** 2026-02-11

## Session Overview

**Topic:** First-time user walkthrough overlay tutorial system
**Goals:** Design a tooltip-based step-by-step walkthrough overlay that guides new users through their role-specific dashboards, features, and workflows

### Session Setup

- **Format:** Walkthrough overlay (tooltips pointing at UI elements)
- **Scope:** All user roles — super admin, branch admin, staff, barber, customer
- **App Type:** React + Vite web app with dark theme (#0A0A0A backgrounds)
- **Styling:** Tailwind CSS with CSS variables for brand colors

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Walkthrough overlay tutorial with focus on role-specific onboarding

**Recommended Techniques:**

- **Role Playing:** Embody each user role to discover onboarding pain points and priorities per persona
- **SCAMPER Method:** Systematically generate walkthrough ideas through 7 lenses (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse)
- **Morphological Analysis:** Map all walkthrough variables into a systematic grid for optimal combinations per role

**AI Rationale:** This sequence moves from empathy (understanding each role) to generation (creating walkthrough ideas) to refinement (finding optimal combinations) — perfectly suited for a multi-role UX design challenge.

---

## Technique Execution Results

### Phase 1: Role Playing — Per-Role Walkthrough Definitions

Embodied each of the 5 user roles to map their first-time experience step by step.

#### Customer Role (~8 steps)
1. **Branch Discovery** — "See nearby branches" tooltip on the branch list/map area
2. **Select a Branch** — Highlight a branch card, "Tap to view services & barbers"
3. **Browse Services** — Point at service categories, "Pick your haircut"
4. **Choose a Barber** — Spotlight barber cards, "Select your preferred barber"
5. **Pick Date & Time** — Calendar/time slot highlight, "Choose when you want to visit"
6. **Confirm Booking** — Confirm button tooltip, "Review and book!"
7. **Wallet & Shop Awareness** — Bottom nav "Pay" tab, "Load your wallet for cashless payments"
8. **Account Setup** — Bottom nav "Account" tab, "Set up your profile and preferences"

#### Staff Role (~12 steps — Sidebar Tab Sweep)
1. **Dashboard Overview** — "Welcome! This is your command center"
2. **Bookings Tab** — "View and manage all branch bookings here"
3. **Walk-ins Tab** — "Register walk-in customers quickly"
4. **Queue Tab** — "Monitor the live barber queue"
5. **POS Tab** — "Process payments for services and products"
6. **Services Tab** — "Manage your branch's service menu and pricing"
7. **Products Tab** — "Track inventory and product catalog"
8. **Customers Tab** — "View customer profiles and history"
9. **Barbers Tab** — "Manage barber schedules and assignments"
10. **Expenses Tab** — "Log and track branch expenses"
11. **Email Marketing Tab** — "Send targeted campaigns to customers"
12. **Reports Tab** — "View performance analytics and summaries"

#### Branch Admin Role (~10 steps — Tab Sweep + Admin Emphasis)
1. **Dashboard Overview** — "Your branch at a glance — key metrics live here"
2. **Bookings Management** — "Full control over all bookings"
3. **Walk-ins & Queue** — "Handle walk-ins and monitor the live queue"
4. **POS & Payments** — "Process transactions and view payment history"
5. **Services & Products** — "Configure your branch's offerings"
6. **Staff & Barbers** — "Manage your team, schedules, and roles"
7. **Financial Dashboard** — "Balance sheet, P&L, and expense tracking"
8. **Customer Management** — "View and manage your customer base"
9. **Email & Marketing** — "Run email campaigns and promotions"
10. **Branch Settings CTA** — "Set up your branch profile, branding, and hours"

#### Barber Role (~6 steps — Simplest Tour)
1. **My Dashboard** — "Your daily schedule and upcoming bookings"
2. **My Bookings** — "See who's coming in today"
3. **My Queue** — "Track your current and next clients"
4. **My Profile** — "Update your skills, bio, and availability"
5. **Time-Off** — "Request days off or block time slots"
6. **My Posts** — "Share updates with your branch community"

#### Super Admin Role (~10 steps — Global Control Center)
1. **Global Dashboard** — "Overview of all branches, revenue, and activity"
2. **Branch Management** — "Add, configure, and monitor all branches"
3. **User Management** — "Control roles, permissions, and user accounts"
4. **Service Catalog** — "Define default services across all branches"
5. **Product Catalog** — "Manage the global product inventory"
6. **Financial Overview** — "Cross-branch P&L, balance sheets, and royalties"
7. **Promotions & Loyalty** — "Configure tier systems, points, and vouchers"
8. **Email & Marketing** — "Run system-wide campaigns"
9. **Content Moderation** — "Review and moderate community posts"
10. **System Settings** — "App-wide configuration, branding, and defaults"

---

### Phase 2: SCAMPER Method — 12 Implementation Ideas

**[SCAMPER #1]: Micro-Animations**
_Concept:_ Replace static tooltips with subtle entrance animations — fade-in with a gentle scale or slide. The spotlight overlay dims everything except the highlighted element with a smooth CSS transition.
_Novelty:_ Keeps the dark theme immersive; feels like a premium app, not a generic tutorial popup.

**[SCAMPER #2]: Smart Detection (Combine)**
_Concept:_ Combine tutorial trigger with user behavior detection — if the user already tapped "Book" before the tutorial step fires, skip that step automatically. Track which features have been organically discovered.
_Novelty:_ Adaptive tutorials that don't waste time showing what the user already found on their own.

**[SCAMPER #3]: Gamification + Loyalty Points (Adapt)**
_Concept:_ Award 5-10 loyalty points for completing the full walkthrough. Ties into the existing wallet/points system. "Complete the tour and earn 10 TPX Points!"
_Novelty:_ Transforms onboarding from a chore into a reward — leverages the existing points_ledger infrastructure.

**[SCAMPER #4]: Progress Bar (Modify)**
_Concept:_ Add a slim progress indicator at the top of the overlay showing "Step 3 of 8" with a fill bar matching `var(--color-primary)`. Gives users a sense of completion momentum.
_Novelty:_ Reduces tutorial abandonment by showing how close the user is to finishing.

**[SCAMPER #5]: Bite-Size Lessons (Modify)**
_Concept:_ Each tooltip is max 2 lines of text. No walls of text. Just the essentials: what this element does + one action verb. "Tap here to book your next haircut."
_Novelty:_ Respects mobile attention spans; faster completion means higher completion rates.

**[SCAMPER #6]: Skip + Remind Later (Put to Other Uses)**
_Concept:_ Two buttons on every step: "Next" and "Skip Tour". If skipped, show a subtle reminder badge on the "?" button that persists until the tour is completed.
_Novelty:_ Respects user autonomy while keeping the tutorial discoverable for later.

**[SCAMPER #7]: Role-Specific Tone (Modify)**
_Concept:_ Customer tour uses casual, friendly language ("Hey! Let's find your perfect barber"). Staff/admin tours use professional language ("This dashboard shows your branch performance metrics"). Barber tour is conversational ("Here's where you'll see who's up next").
_Novelty:_ Tone matching builds trust — professionals feel respected, customers feel welcomed.

**[SCAMPER #8]: Dark Theme Spotlight Effect**
_Concept:_ Use a semi-transparent dark overlay (#0A0A0A at 85% opacity) with a "cutout" around the target element. The cutout has a subtle glow border using `var(--color-primary)` with 30% opacity.
_Novelty:_ Leverages the existing dark theme as the spotlight backdrop — the highlighted element literally glows against the dark.

**[SCAMPER #9]: Feature Announcement Reuse (Put to Other Uses)**
_Concept:_ Reuse the walkthrough overlay system for new feature announcements. When a new feature ships, trigger a mini 2-3 step tour highlighting just the new elements for existing users.
_Novelty:_ The tutorial infrastructure becomes a permanent product communication channel, not a one-time onboarding tool.

**[SCAMPER #10]: Staff Training Mode (Put to Other Uses)**
_Concept:_ Branch admins can trigger the tutorial for any staff member from the user management screen. "Send Training Tour" button resets the tutorial flag for that user.
_Novelty:_ Turns the tutorial into a training tool — useful when onboarding new hires to an existing branch.

**[SCAMPER #11]: Eliminate Welcome Screens (Eliminate)**
_Concept:_ No separate "Welcome to TPX!" splash screen or intro modal. The walkthrough starts immediately on the dashboard, pointing directly at real UI elements. Zero preamble.
_Novelty:_ Faster time-to-value; users interact with real features from second one instead of reading about them.

**[SCAMPER #12]: User-Driven "?" Help Button (Reverse)**
_Concept:_ A persistent floating "?" button (bottom-right, above the bottom nav for customers) that lets users re-trigger the tutorial at any time. Also provides contextual help — if pressed on the POS page, shows POS-specific tips.
_Novelty:_ Flips the tutorial from push (forced on first load) to pull (available on demand) — empowers users to learn at their own pace.

---

### Phase 3: Morphological Analysis — Per-Role Blueprints

#### Variable Grid

| Variable | Customer | Staff | Branch Admin | Barber | Super Admin |
|----------|----------|-------|--------------|--------|-------------|
| **Trigger** | First login (no `has_seen_tutorial`) | First login | First login | First login | First login |
| **Visual Style** | Dark spotlight + primary glow | Dark spotlight + primary glow | Dark spotlight + primary glow | Dark spotlight + primary glow | Dark spotlight + primary glow |
| **Step Format** | Tooltip card (2 lines max) | Tooltip card (2 lines max) | Tooltip card (2 lines max) | Tooltip card (2 lines max) | Tooltip card (2 lines max) |
| **Tone** | Casual & friendly | Professional & efficient | Authoritative & guiding | Conversational & direct | Executive & comprehensive |
| **Skip Behavior** | "Skip Tour" → badge on "?" | "Skip Tour" → badge on "?" | "Skip Tour" → badge on "?" | "Skip Tour" → badge on "?" | "Skip Tour" → badge on "?" |
| **Persistence** | Convex DB `has_seen_tutorial` | Convex DB `has_seen_tutorial` | Convex DB `has_seen_tutorial` | Convex DB `has_seen_tutorial` | Convex DB `has_seen_tutorial` |
| **Re-access** | Floating "?" button | Sidebar "?" or help link | Sidebar "?" or help link | Dashboard "?" button | Sidebar "?" or help link |
| **Step Count** | ~8 steps | ~12 steps | ~10 steps | ~6 steps | ~10 steps |

#### Architecture Ideas

**[Architecture #1]: Single Reusable Component**
_Concept:_ One `<WalkthroughOverlay />` component that accepts a `steps` config array and renders the spotlight + tooltip dynamically. Each role passes its own step configuration. Component lives in `src/components/common/`.
_Novelty:_ Zero code duplication across 5 roles — one component, five configurations.

**[Architecture #2]: Convex Persistence with `has_seen_tutorial`**
_Concept:_ Add `has_seen_tutorial: v.optional(v.boolean())` to the users table in Convex schema. Query on mount: if `false` or undefined, trigger walkthrough. On completion or skip, mutate to `true`. Branch admins can reset it for staff training.
_Novelty:_ Server-side persistence means the tutorial state follows the user across devices and sessions.

**[Architecture #3]: Step Config Structure**
_Concept:_ Each step is a plain object: `{ target: '#booking-tab', title: 'Book a Haircut', message: 'Tap here to browse services and pick your barber', position: 'bottom' }`. The target is a CSS selector or ref. Position controls tooltip placement relative to the highlighted element.
_Novelty:_ Declarative config makes it easy to add/remove/reorder steps without touching component logic. New feature announcements can be authored as JSON.

---

## Idea Organization and Prioritization

### Theme 1: Role-Specific Walkthrough Content
_Focus: What each role sees during their first-time tutorial_

- **5 complete role walkthroughs** (Customer 8 steps, Staff 12 steps, Branch Admin 10 steps, Barber 6 steps, Super Admin 10 steps)
- **Role-specific tone** (casual for customers, professional for staff, authoritative for admins, conversational for barbers, executive for super admins)
- **Tab-sweep pattern** shared by Staff, Branch Admin, and Super Admin roles
- **Booking-flow walkthrough** unique to Customer role

_Pattern Insight:_ Every role has a natural "orientation sweep" of their main navigation — the core tutorial pattern is consistent, only the content and tone change.

### Theme 2: Visual Design & Dark Theme Integration
_Focus: How the overlay looks and feels within the dark-themed app_

- **Dark spotlight effect** — semi-transparent #0A0A0A overlay at 85% with cutout + primary glow border
- **Micro-animations** — fade-in/scale transitions for tooltip entrance
- **Progress bar** — slim `var(--color-primary)` fill bar showing step X of Y
- **Bite-size tooltips** — max 2 lines, action verbs, no walls of text
- **No welcome screens** — tutorial starts immediately on real UI elements

_Pattern Insight:_ The dark theme is an asset, not a constraint — the spotlight effect naturally draws attention by making the target element glow against the dark backdrop.

### Theme 3: Smart Behavior & User Autonomy
_Focus: How the tutorial adapts to user behavior and respects their control_

- **Smart detection** — skip steps for features the user already discovered organically
- **Skip + Remind Later** — "Skip Tour" button with persistent badge on "?" for later
- **User-driven "?" button** — floating help button for on-demand re-triggering and contextual help
- **Convex persistence** — `has_seen_tutorial` field survives across devices and sessions

_Pattern Insight:_ The best tutorial is one that gets out of the way when the user doesn't need it, but is always available when they do.

### Theme 4: Architecture & Reusability
_Focus: Technical implementation approach for maintainability and future use_

- **Single `<WalkthroughOverlay />` component** — one component, five role configurations
- **Declarative step config** — `{ target, title, message, position }` objects authored as JSON-like arrays
- **Convex DB `has_seen_tutorial`** — server-side persistence with admin-resettable flag
- **Feature announcement reuse** — same overlay system for shipping new feature tours to existing users
- **Staff training mode** — branch admins can trigger tutorial reset for new hires

_Pattern Insight:_ Building the tutorial as a generic, config-driven overlay component means it becomes permanent infrastructure — not just an onboarding tool but a product communication channel.

### Theme 5: Engagement & Motivation
_Focus: How to motivate users to complete the tutorial_

- **Gamification + loyalty points** — earn 10 TPX Points for completing the tour (uses existing points_ledger)
- **Progress bar momentum** — "Step 3 of 8" creates completion drive
- **Bite-size lessons** — fast completion = higher completion rates

_Pattern Insight:_ The existing loyalty/points system provides a natural incentive mechanism at zero additional infrastructure cost.

---

### Prioritization Results

#### Top Priority (Build First)
1. **Single `<WalkthroughOverlay />` Component** — The foundation; everything depends on this
2. **Customer Walkthrough (8 steps)** — Largest user base, most immediate impact
3. **Dark Spotlight Effect** — Core visual identity of the tutorial experience
4. **Convex `has_seen_tutorial` Persistence** — Required for all roles to function correctly
5. **Skip + "?" Button** — User autonomy is non-negotiable for a good experience

#### Quick Wins (Easy to Add After Core)
6. **Progress Bar** — Slim UI addition, big impact on completion rates
7. **Bite-Size Tooltips** — Content constraint, not a code feature
8. **Micro-Animations** — CSS transitions on the existing overlay component
9. **Role-Specific Tone** — Copy change only, no code impact

#### Phase 2 Features (Post-Launch)
10. **Staff/Admin/Barber/Super Admin Walkthroughs** — Same component, different configs
11. **Gamification Points Reward** — One mutation call on tour completion
12. **Smart Detection** — Behavior tracking to skip discovered features
13. **Feature Announcement Reuse** — Extend the system for new feature tours
14. **Staff Training Mode** — Admin ability to reset tutorial for team members

---

### Action Plan

#### Immediate Implementation Steps

**Step 1: Schema Update**
- Add `has_seen_tutorial: v.optional(v.boolean())` to users table in `convex/schema.ts`
- Add `tutorial_completed_at: v.optional(v.number())` for analytics
- Create `markTutorialComplete` mutation in `convex/services/auth.ts`

**Step 2: Walkthrough Component**
- Create `src/components/common/WalkthroughOverlay.jsx`
- Props: `steps[]`, `onComplete`, `onSkip`
- Internal state: `currentStep`, `isVisible`
- Renders: dark overlay (fixed, z-9999), cutout spotlight, tooltip card, Next/Skip buttons, progress bar
- Uses `createPortal` for proper z-index stacking

**Step 3: Step Configurations**
- Create step config arrays per role in `src/config/walkthroughSteps.js`
- Customer steps target: bottom nav items, branch cards, booking flow elements
- Staff/Admin steps target: sidebar nav items
- Each step: `{ target: '#css-selector', title: 'string', message: 'string', position: 'top|bottom|left|right' }`

**Step 4: Integration**
- In each role's main dashboard/layout component, query `has_seen_tutorial`
- If `false`/`undefined`, render `<WalkthroughOverlay steps={roleSteps} />`
- On complete/skip, call `markTutorialComplete` mutation
- Add floating "?" button to re-trigger

**Step 5: Polish**
- Add CSS transitions (fade-in, scale) for tooltip entrance
- Implement progress bar with `var(--color-primary)` fill
- Test on mobile viewports (Capacitor/Android)
- Add gamification points on completion (optional)

#### Resources Needed
- Convex schema update (1 field)
- 1 new React component (`WalkthroughOverlay.jsx`)
- 1 config file (`walkthroughSteps.js`)
- CSS additions for overlay, spotlight, and tooltip styles
- Integration into 5 role dashboard/layout files

#### Success Indicators
- First-time users complete the walkthrough (>70% completion rate target)
- Reduced support questions about "where is X" features
- Tutorial completion tracked via `tutorial_completed_at` timestamp
- Re-access via "?" button shows continued utility

---

## Session Summary and Insights

### Key Achievements
- **32 ideas** generated across 3 creative techniques (Role Playing, SCAMPER, Morphological Analysis)
- **5 complete role-specific walkthrough scripts** with step-by-step content
- **5 organized themes** covering content, visual design, smart behavior, architecture, and engagement
- **Clear implementation roadmap** with prioritized phases and action steps
- **Reusable architecture** — the tutorial system doubles as a feature announcement and training platform

### Creative Breakthroughs
1. **The "?" button as a pull-based learning channel** — reversing the typical push-only tutorial model
2. **Feature announcement reuse** — turning one-time onboarding into permanent product infrastructure
3. **Staff training mode** — branch admins resetting tutorials transforms onboarding into ongoing team training
4. **Gamification with existing points system** — zero new infrastructure, just one mutation call

### Session Reflections
The Role Playing technique was the most productive — embodying each role naturally revealed the walkthrough content. SCAMPER then generated 12 implementation ideas that went beyond "what to show" into "how to show it." Morphological Analysis tied everything together with a systematic variable grid that ensures consistency across all 5 roles while preserving role-specific customization.

### Creative Facilitation Narrative
The session began by walking in the shoes of each user role — starting with the customer (the most common persona) and working up through staff, branch admin, barber, and super admin. A key insight emerged early: **all roles share a "tab sweep" orientation pattern**, differing only in which tabs they see and the tone of the messaging. This pattern became the architectural foundation.

The SCAMPER phase pushed beyond content into interaction design — smart detection, gamification, and the "reverse" idea of a user-driven "?" button were the standout moments. The Morphological Analysis then grounded everything in a variable grid that made the architecture obvious: one component, five configs, one database field.

**Session Highlights:**
- **User Creative Strengths:** Strong systems thinking — consistently identified reuse patterns and cross-role consistency
- **AI Facilitation Approach:** Moved from empathy (Role Playing) → generation (SCAMPER) → synthesis (Morphological Analysis)
- **Breakthrough Moments:** The "?" button concept and the staff training reuse idea
- **Energy Flow:** High engagement throughout; the tab-sweep pattern discovery energized the entire session
