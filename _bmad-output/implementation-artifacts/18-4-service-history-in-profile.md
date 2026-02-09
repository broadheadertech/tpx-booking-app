# Story 18.4: Service History in Profile

Status: done

## Story

As a **staff member**,
I want to see customer service history and preferences,
So that I can personalize their experience and anticipate their needs.

## Acceptance Criteria

1. **Given** I select a customer from the queue
   **When** I view their profile panel
   **Then** I see their last 5 services with dates and barbers
   **And** I see their most frequently booked services

2. **Given** the customer has purchased services before
   **When** I view their history
   **Then** I see their service history in chronological order
   **And** each entry shows service name, date, and barber

3. **Given** I'm preparing for the customer's service
   **When** I view their profile
   **Then** I see "Usual service: [Service name]" prominently displayed
   **And** I can quickly identify their typical preferences

## Tasks / Subtasks

- [x] Task 1: Create getCustomerServiceHistory query (AC: #1-3)
  - [x] 1.1 Add query to tiers.ts service
  - [x] 1.2 Return last 5 completed services with service/barber details
  - [x] 1.3 Calculate most frequent service ("usual service")

- [x] Task 2: Create ServiceHistoryCard component (AC: #1-3)
  - [x] 2.1 Create src/components/staff/ServiceHistoryCard.jsx
  - [x] 2.2 Show "Usual service" prominently in header
  - [x] 2.3 List recent services with date/barber/price

- [x] Task 3: Integrate into customer modal (AC: #1)
  - [x] 3.1 Add ServiceHistoryCard to QueueSection modal
  - [x] 3.2 Show after WelcomeBackCard for signed-in customers

- [x] Task 4: Deploy and verify (AC: #1-3)
  - [x] 4.1 Build passes successfully (12.37s)
  - [x] 4.2 Staff can see service history in customer modal

## Dev Notes

### Query: getCustomerServiceHistory

Added to `convex/services/tiers.ts`:
- Fetches completed bookings for user
- Returns last 5 services with:
  - serviceName, date, barberName, price, id
- Calculates "usual service" (most frequent)
- Returns totalServices count

### ServiceHistoryCard Component

Features:
- **Usual Service** header with service name and booking count
- **Recent Services** list showing last 5 bookings
- Each entry shows: service name, date (formatted), barber name, price
- Numbered entries (1-5) for easy reference
- Loading skeleton for async data
- "No Service History" state for first-time customers

### Integration

Added to QueueSection.jsx customer details modal:
- Shows ServiceHistoryCard below WelcomeBackCard
- Only for signed-in customers with userId
- Passed userId from selectedCustomer

### References

- [Source: epics-customer-experience.md#Story 4.2]
- [Source: src/components/staff/QueueSection.jsx]
- [Source: convex/services/tiers.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npm run build` - Build completed successfully in 12.37s

### Completion Notes List

1. Created `getCustomerServiceHistory` query in `convex/services/tiers.ts`:
   - Fetches completed bookings by userId
   - Returns last 5 services sorted by date descending
   - Calculates most frequent service with count
   - Includes service name, date, barber name, price

2. Created `src/components/staff/ServiceHistoryCard.jsx`:
   - Displays "Usual Service" prominently in header
   - Lists recent services with date/barber/price
   - Includes loading skeleton and empty state
   - Uses formatDate helper for date display

3. Integrated into `src/components/staff/QueueSection.jsx`:
   - Added ServiceHistoryCard import
   - Shows in customer details modal after WelcomeBackCard
   - Conditional render for signed-in customers only

### File List

- [x] convex/services/tiers.ts (MODIFY) - Add getCustomerServiceHistory query
- [x] src/components/staff/ServiceHistoryCard.jsx (CREATE) - Service history component
- [x] src/components/staff/QueueSection.jsx (MODIFY) - Add ServiceHistoryCard to modal
