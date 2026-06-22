/**
 * Version Configuration
 * This file is automatically updated by deploy.js
 * Do not manually edit the version number
 *
 * Semantic Versioning Guide:
 *   MAJOR (x.0.0) — Breaking changes, major system overhauls, new platforms
 *   MINOR (0.x.0) — New features, new pages/modules, significant additions
 *   PATCH (0.0.x) — Bug fixes, UI tweaks, small improvements, text changes
 *
 * When adding a changelog entry, use these tags:
 *   "feature"  — New functionality (bumps MINOR)
 *   "fix"      — Bug fix (bumps PATCH)
 *   "improve"  — Enhancement to existing feature (bumps PATCH or MINOR)
 *   "breaking" — Breaking/major change (bumps MAJOR)
 */

export const APP_VERSION = '2.28.0';
export const LAST_DEPLOY = '2026-06-20';
export const VERSION_INFO = {
  version: APP_VERSION,
  lastDeploy: LAST_DEPLOY,
  environment: import.meta.env.MODE || 'development'
};

/**
 * Changelog — newest entries first.
 * Each entry: { version, date, changes: [{ tag, text }] }
 */
export const CHANGELOG = [
  {
    version: '2.28.0',
    date: '2026-06-20',
    changes: [
      { tag: 'fix', text: 'Service saving "Invalid category" error — the backend only accepted 5 hard-coded categories while the form offered different ones (Haircut/Package/Other Services), so saving any service failed. Categories are now a configurable list, seeded from your existing service categories, so all current services save correctly.' },
      { tag: 'feature', text: 'Service Categories settings — super/IT admin can manage the service category list (add, hide, remove) via a new "Categories" button in Services management. The service form\'s category dropdown is driven by this list. Validation stays lenient: a service can always keep its current category, and nothing is blocked before the list is configured.' },
    ],
  },
  {
    version: '2.27.1',
    date: '2026-06-20',
    changes: [
      { tag: 'fix', text: 'Barber editing crash + codebase-wide Rules of Hooks sweep — many views called useQuery conditionally (inside a ternary on the logged-in user), which crashed the whole view with no visible error once the user loaded. This caused the silent barber-editing failure. Swept and fixed every occurrence (Barbers, staff Dashboard, POS, Reports, Bookings, Custom Bookings, Events, Branch Users, Recent Activity, My Bookings, Vouchers, barber dashboards) to call queries unconditionally with "skip".' },
    ],
  },
  {
    version: '2.27.0',
    date: '2026-06-11',
    changes: [
      { tag: 'feature', text: 'Past Z-Readings — new option in POS Readings to browse previous Z closes (Z#, date, txns, cashier, gross) and reprint any one exactly as recorded. Reprint uses the stored snapshot, so historical Z-Readings stay accurate.' },
    ],
  },
  {
    version: '2.26.0',
    date: '2026-06-11',
    changes: [
      { tag: 'feature', text: 'Date-Range Sales Report — new option in POS Readings to generate a Z-style sales summary for any custom period (From/To dates) without closing or resetting. Same BIR breakdown (gross, VAT, discounts, net, tender, transaction details) for the chosen range, printable on the 58mm slip. Omits Z-counter/accumulated totals since it is not a close.' },
    ],
  },
  {
    version: '2.25.0',
    date: '2026-06-11',
    changes: [
      { tag: 'feature', text: 'Void transaction — staff can void a completed sale from the Reprint list (with a reason). The sale is excluded from X/Z sales totals, branch-product stock is restored, it shows a VOIDED badge, and it counts under "Cancelled Transaction Count" on the reading. Audited.' },
      { tag: 'feature', text: 'No Sale — new "No Sale" button in POS opens the drawer without a sale and records a No-Sale event, surfaced in the X/Z reading\'s "No Sales Transaction" count.' },
    ],
  },
  {
    version: '2.24.0',
    date: '2026-06-11',
    changes: [
      { tag: 'feature', text: 'Real X/Z reading transaction-detail counts — POS now logs line voids (item removed from cart) and receipt reprints as pos_events, tallied into each reading\'s period. The Z/X reading\'s Line Voids and Transaction Reprint counts are now actual numbers instead of 0. Infrastructure (pos_events) is in place to add cancelled-transaction, no-sale, and price-override counts when those flows exist.' },
    ],
  },
  {
    version: '2.23.1',
    date: '2026-06-11',
    changes: [
      { tag: 'improve', text: 'X/Z Reading now matches the standard BIR End-of-Day layout: header with SN/MIN, Reset Counter (Non-Resettable), Z-Counter, Store Code, Terminal No., System Log + Computer Date/Time, Beginning/Ending SI; Transaction Summary (Gross, Returns, Sub-Total, SC/PWD/Others/VAT-Adjustment discounts, Net Sales); Tender Summary; Transaction Details counts (items sold, voids, SC/PWD counts, etc.); and VAT Computations.' },
    ],
  },
  {
    version: '2.23.0',
    date: '2026-06-11',
    changes: [
      { tag: 'feature', text: 'BIR X / Z Readings — new "Readings" button in POS opens X-Reading (interim running sales, no reset) and Z-Reading (end-of-day close). Z permanently records the period in a z_readings table, increments the per-branch Z-counter, and rolls into the accumulated grand total. Both print a 58mm thermal slip with gross/VAT/exempt/zero-rated, SC/PWD discounts, net sales, payment breakdown, beginning/ending OR, and accumulated grand totals. Per branch.' },
    ],
  },
  {
    version: '2.22.0',
    date: '2026-06-10',
    changes: [
      { tag: 'feature', text: 'Login As (role impersonation) — super/IT admin can now act as a Super Admin, Branch Admin, Staff, or Barber (role + branch) from the "Login As" tab, not just mirror a branch. The app renders that role\'s view, a persistent banner shows who you\'re acting as, and every action stays audited under your real identity. Generalizes the old Branch Mirror.' },
    ],
  },
  {
    version: '2.21.0',
    date: '2026-06-09',
    changes: [
      { tag: 'feature', text: 'POS graceful offline — POS now detects loss of connectivity (browser offline + Convex websocket) and shows a persistent offline banner. The checkout button is disabled and both payment entry points are hard-blocked while offline, with a clear "the sale was NOT recorded" message, so a cashier never mistakes a failed sale for a completed one. Re-enables automatically on reconnect.' },
    ],
  },
  {
    version: '2.20.0',
    date: '2026-06-03',
    changes: [
      { tag: 'feature', text: 'BIR Machine PTU + accreditation — new per-branch "POS Machine PTU" setup (MIN, serial, PTU, accreditation, software provider) in BIR Compliance settings, with Submit-for-Approval. New universal "Machine PTU" approval queue for super/IT admin to approve, reject, or revoke. A branch is BIR-accredited only once approved.' },
      { tag: 'feature', text: 'BIR-standard receipt — receipts now print as "INVOICE" (RR 7-2024 / EOPT standard). Accredited branches print the full machine block (MIN, Serial, PTU + date, Accreditation + date, software provider); non-accredited branches print "NOT BIR ACCREDITED — NOT VALID FOR CLAIM OF INPUT TAX". Accreditation status is snapshotted on each transaction so reprints stay accurate.' },
    ],
  },
  {
    version: '2.19.0',
    date: '2026-06-03',
    changes: [
      { tag: 'feature', text: 'Branch types (TipunoX / TipunoX Plus) — branches now have a Brand type set in the branch form. Client subscription tiers are tagged to a brand, so each brand offers its own membership plans.' },
      { tag: 'feature', text: 'Brand-scoped memberships — a client can hold one active membership per brand (up to two), and a membership can only be redeemed at branches of the matching brand. POS shows/redeems only the membership for the current branch\'s brand; Memberships tiers carry a brand badge and selector.' },
    ],
  },
  {
    version: '2.18.0',
    date: '2026-06-03',
    changes: [
      { tag: 'feature', text: 'Client Subscriptions — POS redemption: when a customer with an active membership is selected, POS shows a membership banner with remaining free services/products and a "Redeem free" chip on each cart line (sets it to ₱0, guarded by per-item value caps and remaining allocations). Redemptions are recorded against the subscription and linked to the transaction at checkout.' },
      { tag: 'feature', text: 'Client Subscriptions — super-admin analytics: the Memberships tab now leads with an overview (active members, MRR/ARR, 30-day redemptions & value, renewals due in 7 days, 30-day churn) plus an active-members-by-tier breakdown, backed by a new getSubscriptionAnalytics query.' },
    ],
  },
  {
    version: '2.17.0',
    date: '2026-06-02',
    changes: [
      { tag: 'feature', text: 'Reprint receipts — new "Reprint" button in the POS header (mobile + desktop) opens a searchable list of recent branch transactions; tap any to re-open and print its receipt. Reprints keep the original date/time and cashier. Makes testing the thermal printer easy without ringing up a new sale.' },
    ],
  },
  {
    version: '2.16.1',
    date: '2026-06-02',
    changes: [
      { tag: 'fix', text: '58mm thermal receipt printing — receipt was printing at 58mm/80mm width and getting clipped on the right and pushed off-center. Constrained the printed receipt to the ~48mm printable area, centered it on the paper, added word-wrapping, and right-sized the TOTAL DUE line so nothing is cut off.' },
    ],
  },
  {
    version: '2.16.0',
    date: '2026-06-02',
    changes: [
      { tag: 'feature', text: 'YTD Visit Ranking — Customer Analytics now ranks clients by number of completed visits this year (bookings + walk-ins), merged by phone number (with email as fallback when no number is on file), with a year selector, visit-count badges, and contact shortcuts, to identify who to reward with year-end vouchers.' },
      { tag: 'fix', text: 'Customer Analytics at-risk list no longer crashes — the Clock icon used in the "Last Visit" column was referenced but never imported.' },
    ],
  },
  {
    version: '2.15.1',
    date: '2026-05-29',
    changes: [
      { tag: 'feature', text: 'Branch Admin BIR settings — new "BIR Compliance" sub-tab under Settings in the staff dashboard so BAs can manage their own branch\'s TIN, PTU, MIN, accreditation, and software-provider details without needing super-admin access.' },
      { tag: 'fix', text: 'updateBranch now enforces a role guard — super_admin / it_admin can edit any branch, branch_admin can only edit their own. Closes a gap where any authenticated user could PATCH any branch.' },
    ],
  },
  {
    version: '2.15.0',
    date: '2026-05-28',
    changes: [
      { tag: 'feature', text: 'BIR-compliant Official Receipt for POS — sequential per-branch OR numbering (format OR-<BRANCH>-YYYY-NNNNNN, yearly reset), business/PTU/MIN/POS-serial/accreditation header & footer, software-provider block, and the required "valid for 5 years from PTU" + "not valid for input tax" clauses (NON-VAT branches).' },
      { tag: 'feature', text: 'Per-branch BIR settings (admin → Branches → BIR tab) — TIN, VAT-registered toggle, PTU, MIN, POS serial, accreditation, software provider details, OR branch code. All snapshot onto each transaction so receipts survive future edits.' },
      { tag: 'feature', text: 'VAT breakdown on receipts — VATable Sales / VAT-Exempt / Zero-Rated / VAT (12%) computed at issuance for VAT-registered branches; SC/PWD purchases automatically routed to VAT-Exempt.' },
      { tag: 'feature', text: 'Senior Citizen / PWD discount flow (RA 9994 / RA 10754) — POS captures SC/PWD ID + name, strips 12% VAT before the 20% discount when applicable, and prints the SC/PWD block with a signature line.' },
    ],
  },
  {
    version: '2.14.0',
    date: '2026-05-11',
    changes: [
      { tag: 'feature', text: 'Admin "Branch Bookings" tab — branch-first overview that fetches NOTHING until a branch is picked, avoiding system-wide query bottlenecks. Shows date-windowed summary cards (total / today / week / revenue / paid online / cash) + clickable status pills + paginated filterable table' },
      { tag: 'feature', text: 'Customers · Visits toggle — same tab also shows the branch\'s customer base sorted by visit count (using the existing customer_branch_activity table). Includes total visits, total spend, repeat-customer %, avg visits per customer, last/first visit dates, and engagement status. Loyalty stars at 10+ visits.' },
    ],
  },
  {
    version: '2.13.0',
    date: '2026-05-11',
    changes: [
      { tag: 'feature', text: 'Customer Subscriptions (Memberships) — admin can now define tiered membership plans (e.g., Bronze / Silver / Gold), each with configurable free-service + free-product allocations per period (monthly / quarterly / annual)' },
      { tag: 'feature', text: 'Admin assigns subscriptions to customers (with auto-activate + payment capture) or accepts pending applications; daily cron handles period rollover (refresh allocations) + expiry' },
      { tag: 'feature', text: 'Redemption helper (redeemEntitlement mutation) decrements remaining allocations and logs every redemption with branch + staff context — ready for POS integration' },
      { tag: 'feature', text: 'New "Memberships" tab in admin + IT-admin Marketing category with Tiers/Subscriptions toggle, status filters, and per-customer assign flow' },
    ],
  },
  {
    version: '2.12.0',
    date: '2026-05-11',
    changes: [
      { tag: 'feature', text: 'Subscription term discounts — packages can define commitment-tier discounts (e.g., 6 months 10% off, 12 months 20% off). IT admin picks the term in Branch Features and sees live pricing (monthly, total, savings) before committing. All pricing is admin-side billing only — branches never see the numbers.' },
      { tag: 'feature', text: 'Branch Features now shows the active term commitment (months, discount, monthly/total, end date) alongside an option to override the negotiated base price per-branch' },
    ],
  },
  {
    version: '2.11.0',
    date: '2026-05-11',
    changes: [
      { tag: 'feature', text: 'Subscription packages — IT admin can now define feature-bundle packages (e.g., Starter, Pro, Enterprise) and assign them to branches. Each package toggles feature flags from a 20-item catalog covering AI Mirror, Avexa, loyalty, wallet, kiosk, analytics, etc.' },
      { tag: 'feature', text: 'Per-branch feature overrides — IT admin can override individual features on a per-branch basis on top of the assigned package (with optional reason, fully audit-logged)' },
      { tag: 'feature', text: 'useBranchFeatures() hook + getEffectiveFeatures query — single source of truth for feature gating; respects active impersonation so admin mirror reflects the target branch\'s feature set' },
      { tag: 'feature', text: 'New IT admin tabs: Packages (CRUD) and Branch Features (assign + override)' },
    ],
  },
  {
    version: '2.10.0',
    date: '2026-05-11',
    changes: [
      { tag: 'feature', text: 'No-show + transfer fee for paid online bookings — staff can mark a paid PayMongo/wallet booking as no-show, then transfer (reschedule) it to a new date; per-branch transfer fee applies automatically, with a one-click waiver (required reason) when the fault is on the shop\'s end. All actions audit-logged.' },
      { tag: 'feature', text: 'Booking Settings — new "Transfer Fee (No-Show)" toggle: fixed amount or percent of price; cash bookings exempt by design' },
    ],
  },
  {
    version: '2.9.0',
    date: '2026-05-11',
    changes: [
      { tag: 'feature', text: 'Royalty automation — monthly cron now auto-generates royalty payments on the 1st at 8 AM PHT, emails each branch their detailed statement, and sends super_admin a consolidated summary; "Run Automation Now" button added for manual triggering' },
    ],
  },
  {
    version: '2.8.0',
    date: '2026-05-11',
    changes: [
      { tag: 'feature', text: 'Branch P&L tab — admin can now track per-branch revenue, expenses, commission paid to HQ, and net income with a date-range picker and side-by-side branch comparison' },
      { tag: 'feature', text: 'Branch Mirror — admin / super_admin / it_admin can step into any branch’s view (POS, queue, dashboard) as if they were the branch admin; persistent amber banner shows mirror mode at all times' },
      { tag: 'feature', text: 'Transparency: every audit log written during mirror mode is auto-tagged with the real user’s ID + role + target branch, and start/stop events are recorded as auth-category audit logs' },
    ],
  },
  {
    version: '2.7.0',
    date: '2026-04-29',
    changes: [
      { tag: 'feature', text: 'Desktop notifications for staff — incoming bookings now trigger a native browser notification when the tab is unfocused, so staff never miss a booking; permission auto-requested once per device' },
    ],
  },
  {
    version: '2.6.6',
    date: '2026-04-29',
    changes: [
      { tag: 'fix', text: 'Attendance List/Grid view toggle — replaced confusing Table/LayoutList icons with proper List/LayoutGrid icons; Grid view now renders responsive card grid instead of a flat list' },
    ],
  },
  {
    version: '2.6.5',
    date: '2026-04-29',
    changes: [
      { tag: 'fix', text: 'Kiosk Mode "Back to Login" button led to a black screen — was linking to non-existent /login; now goes to /auth/login (Notifications page fixed too)' },
    ],
  },
  {
    version: '2.6.4',
    date: '2026-04-29',
    changes: [
      { tag: 'improve', text: 'Attendance Config — Per-Staff FR settings now only lists staff (and barbers in their own section), excluding branch_admin and admin_staff' },
    ],
  },
  {
    version: '2.6.3',
    date: '2026-04-29',
    changes: [
      { tag: 'improve', text: 'Wallet Overview analytics — removed redundant "Last Month" option from period dropdown' },
    ],
  },
  {
    version: '2.6.2',
    date: '2026-04-28',
    changes: [
      { tag: 'fix', text: 'Order Products page rendered a black screen — branch orders query was passing undefined instead of using the "skip" pattern' },
    ],
  },
  {
    version: '2.6.1',
    date: '2026-04-28',
    changes: [
      { tag: 'fix', text: 'Signed-out users could briefly see protected pages via browser Back button — now defeats bfcache and replaces history on logout' },
    ],
  },
  {
    version: '2.6.0',
    date: '2026-02-28',
    changes: [
      { tag: 'feature', text: 'Avexa Save as Template — save AI-generated emails as reusable templates for future campaigns' },
      { tag: 'feature', text: 'Avexa Save for Later — one-click save as draft campaign for scheduled sending' },
      { tag: 'feature', text: 'Saved AI Templates grid in Email Marketing — load, preview, and delete saved templates' },
    ],
  },
  {
    version: '2.5.0',
    date: '2026-02-28',
    changes: [
      { tag: 'feature', text: 'Avexa model toggle — switch between free Gemini models (2.5 Flash, 2.5 Lite, 3 Flash)' },
      { tag: 'feature', text: 'Avexa voucher creation — create vouchers inline after generating email and insert code into HTML' },
      { tag: 'feature', text: 'Avexa direct send — send emails by audience or specific recipients with campaign tracking' },
    ],
  },
  {
    version: '2.4.0',
    date: '2026-02-28',
    changes: [
      { tag: 'feature', text: 'Avexa AI Email Composer — generate complete marketing emails from natural language prompts using Google Gemini' },
      { tag: 'feature', text: 'Avexa inline in campaign creator — collapsible "Ask Avexa" section auto-fills subject and body' },
      { tag: 'feature', text: 'Avexa standalone tab in Email Marketing AI — dedicated AI compose experience with tone selection' },
    ],
  },
  {
    version: '2.3.0',
    date: '2026-02-27',
    changes: [
      { tag: 'feature', text: 'Face Recognition Attendance Kiosk — standalone tablet-based FR clock-in/out at /kiosk/attendance' },
      { tag: 'feature', text: 'Device registration enforcement — kiosk only works on registered devices per branch' },
      { tag: 'feature', text: 'Auto-detect face scan with liveness check, cooldown, and confidence-based approval' },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-02-23',
    changes: [
      { tag: 'feature', text: 'AI Mirror — virtual hairstyle try-on with live camera face detection and real-time overlay' },
      { tag: 'feature', text: 'Face shape classification — detects oval, round, square, heart, diamond, oblong from facial geometry' },
      { tag: 'feature', text: 'Hairstyle catalog with face shape compatibility scoring (0-100 per shape)' },
      { tag: 'feature', text: 'Save looks — capture composite screenshots and save to personal lookbook' },
      { tag: 'feature', text: 'Admin hairstyle catalog manager — upload overlay PNGs, set face shape scores, manage styles' },
      { tag: 'feature', text: 'AI Mirror CTA on customer home feed with route /customer/ai-mirror' },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-02-23',
    changes: [
      { tag: 'feature', text: 'System Audit Log — comprehensive action tracking for every user operation across the system' },
      { tag: 'feature', text: 'SA "System Logs" tab — universal view of all logs with category filters, date range, and search' },
      { tag: 'feature', text: 'BA "Activity Log" tab — branch-scoped activity feed for branch admins' },
      { tag: 'feature', text: '40+ backend mutations instrumented — bookings, transactions, auth, vouchers, products, inventory, settings' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-02-23',
    changes: [
      { tag: 'feature', text: 'Voucher system overhaul — backend validation, POS hardening, one-per-transaction enforcement' },
      { tag: 'feature', text: 'Flier/batch voucher creation with custom name prefix (e.g., PROMO-XXXXXXXX)' },
      { tag: 'feature', text: 'POS voucher picker — manual code entry + available vouchers list' },
      { tag: 'feature', text: 'Create-then-Send voucher flow with email distribution' },
      { tag: 'feature', text: 'Unique per-user assignment codes for digital voucher distribution' },
      { tag: 'feature', text: 'Payment success page with booking guidance for guests and logged-in users' },
      { tag: 'fix', text: 'Voucher reuse prevention — vouchers now properly marked as redeemed after payment' },
      { tag: 'fix', text: 'Voucher infinite loop — walk-in can no longer claim pre-assigned voucher slots' },
      { tag: 'fix', text: 'Email sending — fixed invalid "from" field causing Resend API errors' },
      { tag: 'fix', text: 'Clerk auth — fixed factor-two redirect loop during sign-up/sign-in verification' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-21',
    changes: [
      { tag: 'feature', text: 'Product tagging and batch tracking (FIFO inventory management)' },
      { tag: 'feature', text: 'HQ-level product expiry dates — flows automatically to branches on receive' },
      { tag: 'feature', text: 'FIFO batch picking guide for HQ shipping' },
      { tag: 'feature', text: 'POS batch indicator — shows oldest batch and expiry for each product' },
      { tag: 'feature', text: 'Branch payment option toggles — set Pay Now / Pay Later / Pay at Shop even with HQ PayMongo' },
      { tag: 'feature', text: 'System versioning with changelog' },
      { tag: 'improve', text: 'Barcode receive modal — auto-uses HQ expiry date when available' },
      { tag: 'improve', text: 'Reconcile receipt modal — shows HQ expiry as read-only reference' },
      { tag: 'fix', text: 'Cart bug in Branch Product Ordering — stale closure causing items to not appear' },
      { tag: 'fix', text: 'Generate initial batches for existing products that predate the batch system' },
    ],
  },
  {
    version: '1.0.27',
    date: '2025-11-26',
    changes: [
      { tag: 'feature', text: 'Loyalty cards system' },
    ],
  },
  {
    version: '1.0.26',
    date: '2025-11-25',
    changes: [
      { tag: 'fix', text: 'IT admin adding fixes' },
    ],
  },
  {
    version: '1.0.25',
    date: '2025-11-24',
    changes: [
      { tag: 'fix', text: 'Payment issues on editing and IT admin feature fixes' },
    ],
  },
];

export default APP_VERSION;
