# Story 18.2: Customer Profile VIP Display

Status: done

## Story

As a **customer**,
I want to view my own VIP achievements and status,
So that I feel recognized and can track my loyalty journey.

## Acceptance Criteria

1. **Given** I am logged in as a customer
   **When** I navigate to my VIP/Loyalty status page
   **Then** I see my tier badge prominently displayed with tier name
   **And** I see "Member since [Date]" showing my loyalty tenure

2. **Given** I view my VIP status
   **When** the page loads
   **Then** I see my total lifetime points earned
   **And** I see my total visits across all branches

3. **Given** I have achieved milestones
   **When** I view my achievements section
   **Then** I see badges for milestones (e.g., "First Visit", "5 Visits", "1000 Points")
   **And** locked milestones show what I need to unlock them

4. **Given** I view my status page
   **When** data loads
   **Then** I see my current points balance
   **And** I see quick links to "My Wallet", "Points History"

## Tasks / Subtasks

- [x] Task 1: Create getCustomerVipStats query (AC: #1, #2)
  - [x] 1.1 Add query to tiers.ts service
  - [x] 1.2 Return tierInfo, lifetimePoints, currentPoints, completedVisits, memberSince

- [x] Task 2: Create VipProfileStats component (AC: #1-4)
  - [x] 2.1 Create src/components/common/VipProfileStats.jsx
  - [x] 2.2 Loyalty Stats grid (member since, visits, points)
  - [x] 2.3 Quick Links section (Wallet, History)
  - [x] 2.4 Achievements badges section

- [x] Task 3: Integrate into Profile page (AC: #1-4)
  - [x] 3.1 Import VipProfileStats in Profile.jsx
  - [x] 3.2 Replace Account Summary with VipProfileStats
  - [x] 3.3 Keep TierStatusCard for tier badge/benefits

- [x] Task 4: Deploy and verify (AC: #1-4)
  - [x] 4.1 Build passes successfully (9.51s)
  - [x] 4.2 Profile shows VIP stats and achievements

## Dev Notes

### Backend Query

`getCustomerVipStats` in `convex/services/tiers.ts`:
- Returns tier info (name, icon, color)
- Lifetime points (÷100 for display)
- Current points balance (÷100 for display)
- Completed visits count (from bookings)
- Member since timestamp

### VipProfileStats Component Features

1. **Loyalty Stats Grid**:
   - Member Since (formatted date)
   - Total Visits (completed bookings count)
   - Lifetime Points (with tier color)
   - Point Balance (current redeemable)

2. **Quick Links**:
   - My Wallet link
   - Points History link
   - Each with icon and description

3. **Achievements Section**:
   - First Visit (1+ visits)
   - 5 Visits
   - 10 Visits
   - 25 Visits
   - 1K Points
   - 5K Points
   - Locked badges show gray with lock icon

### Profile Page Structure

1. Profile Header Card
2. TierStatusCard (tier badge, benefits, progress)
3. VipProfileStats (stats, quick links, achievements)
4. Personal Information
5. Edit/Save buttons
6. Version display

### References

- [Source: epics-customer-experience.md#Story 4.4]
- [Source: convex/services/tiers.ts]
- [Source: src/components/common/VipProfileStats.jsx]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npm run build` - Build completed successfully in 9.51s

### Completion Notes List

1. Added `getCustomerVipStats` query to `convex/services/tiers.ts`:
   - Fetches user tier info (with Bronze default)
   - Gets lifetime/current points from points_ledger
   - Counts completed bookings for visit count
   - Returns formatted display values

2. Created `src/components/common/VipProfileStats.jsx`:
   - Loyalty Stats grid with 4 stat cards
   - Quick Links to Wallet and Points History
   - Achievement badges (First Visit, 5/10/25 Visits, 1K/5K Points)
   - Locked achievements shown with grayscale + lock icon

3. Updated `src/pages/customer/Profile.jsx`:
   - Added VipProfileStats import
   - Replaced Account Summary section with VipProfileStats
   - TierStatusCard remains for tier badge display

### File List

- [x] convex/services/tiers.ts (MODIFY) - Add getCustomerVipStats query
- [x] src/components/common/VipProfileStats.jsx (CREATE) - VIP stats component
- [x] src/pages/customer/Profile.jsx (MODIFY) - Integrate VipProfileStats
