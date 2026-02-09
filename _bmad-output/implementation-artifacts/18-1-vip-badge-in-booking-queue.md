# Story 18.1: VIP Badge in Booking Queue

Status: done

## Story

As a **staff member**,
I want to see customer VIP tier badges before service begins,
So that I can provide appropriate recognition and service level.

## Acceptance Criteria

1. **Given** a customer checks in for their appointment
   **When** I view the queue or appointment list
   **Then** I see their tier badge next to their name (Bronze/Silver/Gold/Platinum)
   **And** the badge is color-coded for quick recognition

2. **Given** a Gold or Platinum customer is in the queue
   **When** I view the list
   **Then** their entry is visually highlighted
   **And** I can easily identify VIP customers at a glance

3. **Given** I click on a customer in the queue
   **When** their details expand
   **Then** I see their full tier name and member-since date
   **And** I see their lifetime points earned

4. **Given** a customer has no loyalty account yet
   **When** I view their entry
   **Then** I see "New" badge instead of a tier badge
   **And** walk-in customers without accounts show as new

## Tasks / Subtasks

- [x] Task 1: Extend mainQueue service with tier data (AC: #1, #3)
  - [x] 1.1 Add customer tier lookup for bookings (has customer field)
  - [x] 1.2 Include tier name, icon, color in customer data
  - [x] 1.3 Include lifetime points and memberSince for signed-in customers

- [x] Task 2: Add VIP badge to QueueSection (AC: #1, #2, #4)
  - [x] 2.1 Create getVipBadge helper function for badge rendering
  - [x] 2.2 Display badge next to customer name in queue cards
  - [x] 2.3 Highlight Gold/Platinum customers with amber border and glow
  - [x] 2.4 Add isVipCustomer helper for VIP detection

- [x] Task 3: Deploy and verify (AC: #1-4)
  - [x] 3.1 Build passes successfully (9.03s)
  - [x] 3.2 Queue displays tier badges for customers

## Dev Notes

### Data Flow

For signed-in customers (bookings):
1. Booking has `customer` field linking to users table
2. Users table has `current_tier_id` field (may be null for new users)
3. Lookup tier details from tiers table
4. Lookup lifetime_earned from points_ledger

For walk-ins:
- Walk-ins typically don't have user accounts
- Show "New" badge with gray styling

### Tier Badge Styling

Each tier has distinct styling:
- **Bronze**: `#CD7F32` - brown/copper background
- **Silver**: `#C0C0C0` - gray background
- **Gold**: `#FFD700` - gold with glow effect + ring
- **Platinum**: `#E5E4E2` - platinum with glow effect + ring
- **New**: Gray badge for customers without accounts

### VIP Highlighting

Gold and Platinum customers get special card styling:
- Amber border (`border-amber-500/40`)
- Ring effect (`ring-1 ring-amber-500/20`)
- Gradient background (`bg-gradient-to-br from-amber-500/5`)

### References

- [Source: epics-customer-experience.md#Epic 4]
- [Source: convex/services/tiers.ts]
- [Source: src/components/staff/QueueSection.jsx]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npm run build` - Build completed successfully in 9.03s

### Completion Notes List

1. Extended `convex/services/mainQueue.ts`:
   - Imported DEFAULT_TIERS from tiers service
   - Added tier info lookup for bookings with customer field
   - Returns tierInfo (name, icon, color, display_order), lifetimePoints, memberSince
   - Walk-ins return tierInfo: null

2. Updated `src/components/staff/QueueSection.jsx`:
   - Added `getVipBadge(customer)` helper function
   - Added `isVipCustomer(customer)` helper function
   - VIP badge shows tier icon + name with tier color
   - Gold/Platinum badges have ring and glow effects
   - "New" badge for customers without accounts

3. VIP card highlighting:
   - Gold/Platinum customer cards have amber border
   - Subtle glow ring around VIP cards
   - Gradient background for VIP cards

### File List

- [x] convex/services/mainQueue.ts (MODIFY) - Add tier data to customer objects
- [x] src/components/staff/QueueSection.jsx (MODIFY) - Add VIP badge display
