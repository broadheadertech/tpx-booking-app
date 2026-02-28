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

export const APP_VERSION = '2.3.0';
export const LAST_DEPLOY = '2026-02-27';
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
