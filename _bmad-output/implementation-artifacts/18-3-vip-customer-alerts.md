# Story 18.3: VIP Customer Alerts (Welcome Back Screen)

Status: done

## Story

As a **staff member**,
I want to see a "welcome back" screen for returning customers,
So that I can greet them personally and make them feel valued.

## Acceptance Criteria

1. **Given** a returning customer checks in
   **When** I open their profile or they're selected for service
   **Then** I see a "Welcome back, [First Name]!" header
   **And** I see their visit count (e.g., "12th visit")

2. **Given** the customer is a frequent visitor (5+ visits)
   **When** the welcome screen appears
   **Then** I see their loyalty milestone (e.g., "Loyal customer since January 2025")
   **And** special messaging for long-term customers

3. **Given** the customer has a preferred barber
   **When** the welcome screen appears
   **Then** I see "Usually served by [Barber Name]"

4. **Given** it's been more than 30 days since their last visit
   **When** the welcome screen appears
   **Then** I see "We missed you! Last visit: [Date]"
   **And** messaging encourages staff to mention we're glad they're back

## Tasks / Subtasks

- [x] Task 1: Create getCustomerWelcomeInfo query (AC: #1-4)
  - [x] 1.1 Add query to tiers.ts service
  - [x] 1.2 Return visit count, last visit date, preferred barber, member since
  - [x] 1.3 Calculate daysSinceLastVisit and missedCustomer flag
  - [x] 1.4 Find preferred barber from booking history

- [x] Task 2: Create WelcomeBackCard component (AC: #1-4)
  - [x] 2.1 Create src/components/staff/WelcomeBackCard.jsx
  - [x] 2.2 Show "Welcome back, [Name]!" header with tier badge
  - [x] 2.3 Display visit count with ordinal (1st, 2nd, etc.)
  - [x] 2.4 Show preferred barber if visited 2+ times
  - [x] 2.5 Show "We missed you!" alert for 30+ day absence
  - [x] 2.6 Compact mode for inline display

- [x] Task 3: Integrate into queue workflow (AC: #1-4)
  - [x] 3.1 Add selectedCustomer state to QueueSection
  - [x] 3.2 Make customer cards clickable (for signed-in customers)
  - [x] 3.3 Add customer details modal with WelcomeBackCard
  - [x] 3.4 Include userId in mainQueue customer data

- [x] Task 4: Deploy and verify (AC: #1-4)
  - [x] 4.1 Build passes successfully (10.13s)
  - [x] 4.2 Staff can click customer in queue to see welcome info

## Dev Notes

### Query: getCustomerWelcomeInfo

Added to `convex/services/tiers.ts`:
- Returns firstName, displayName, tierInfo
- visitCount (completed bookings)
- lastVisitDate, daysSinceLastVisit
- missedCustomer (true if 30+ days)
- frequentCustomer (true if 5+ visits)
- preferredBarber (name, avatar, visitCount) - only if served 2+ times
- memberSince, memberSinceFormatted

### WelcomeBackCard Component

Two display modes:
1. **Full mode**: Shows complete welcome screen with header, stats, alerts
2. **Compact mode**: Shows just visit count and days since last visit

Features:
- Tier-colored header with gradient
- Visit count with ordinal suffix
- "We missed you!" yellow alert for 30+ day absence
- Preferred barber with avatar initials
- Member since milestone
- "New Customer" state for first-time visitors

### QueueSection Integration

- Added selectedCustomer state
- Customer cards clickable (if hasAccount)
- Modal shows:
  - Customer name and avatar initials
  - VIP badge, type badge, status badge
  - WelcomeBackCard (if signed-in customer)
  - Contact info (phone)
  - Appointment time
  - Service price

### Data Flow Update

Modified `convex/services/mainQueue.ts`:
- Added userId to booking return object
- Included userId in allCustomers mapping

### References

- [Source: epics-customer-experience.md#Story 4.3]
- [Source: convex/services/tiers.ts]
- [Source: src/components/staff/WelcomeBackCard.jsx]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npm run build` - Build completed successfully in 10.13s

### Completion Notes List

1. Added `getCustomerWelcomeInfo` query to `convex/services/tiers.ts`:
   - Calculates visit count from completed bookings
   - Finds last visit date and days since
   - Determines preferred barber (most frequent)
   - Returns formatted member since date

2. Created `src/components/staff/WelcomeBackCard.jsx`:
   - Full and compact display modes
   - Tier-colored welcome header
   - Visit milestone with ordinal suffix
   - "We missed you!" alert for 30+ day absence
   - Preferred barber display with avatar
   - "New Customer" state for walk-ins

3. Updated `convex/services/mainQueue.ts`:
   - Added userId to bookingsWithServices return
   - Included userId in allCustomers mapping

4. Updated `src/components/staff/QueueSection.jsx`:
   - Added selectedCustomer state
   - Imported WelcomeBackCard and X icon
   - Made customer cards clickable
   - Added customer details modal
   - Modal shows WelcomeBackCard for signed-in customers

### File List

- [x] convex/services/tiers.ts (MODIFY) - Add getCustomerWelcomeInfo query
- [x] convex/services/mainQueue.ts (MODIFY) - Add userId to customer data
- [x] src/components/staff/WelcomeBackCard.jsx (CREATE) - Welcome back component
- [x] src/components/staff/QueueSection.jsx (MODIFY) - Add customer modal
