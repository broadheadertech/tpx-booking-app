# Story 3.1: VIP Tier Schema and Thresholds

Status: done

## Story

As a **developer**,
I want the tier system database tables created with seed data,
So that I can build tier progression features on a solid foundation.

## Acceptance Criteria

1. **Given** the Convex schema file exists
   **When** I add the tiers table with fields (name, threshold, display_order, icon, color)
   **Then** the table is created with proper indexes

2. **Given** the tiers table exists
   **When** I seed the default tiers
   **Then** Bronze (0 pts), Silver (5000 pts), Gold (15000 pts), Platinum (50000 pts) are created
   **And** each tier has distinct icon and color values

3. **Given** the tier_benefits table is created with fields (tier_id, benefit_type, benefit_value, description)
   **When** I seed benefits per tier
   **Then** each tier has its associated perks documented

4. **Given** the users table exists
   **When** I add current_tier_id field
   **Then** all existing users default to Bronze tier
   **And** the field references the tiers table

5. **Given** schema changes are deployed
   **When** I run `npx convex dev`
   **Then** all tables and relationships work correctly

## Tasks / Subtasks

- [x] Task 1: Create tiers table in schema (AC: #1, #2)
  - [x] 1.1 Add tiers table with name, threshold, display_order, icon, color
  - [x] 1.2 Add indexes for by_threshold, by_name, by_display_order

- [x] Task 2: Create tier_benefits table in schema (AC: #3)
  - [x] 2.1 Add tier_benefits table with tier_id, benefit_type, benefit_value, description
  - [x] 2.2 Add indexes for by_tier and by_type

- [x] Task 3: Add current_tier_id to users table (AC: #4)
  - [x] 3.1 Add optional current_tier_id field to users table
  - [x] 3.2 New users default to Bronze (null = Bronze)

- [x] Task 4: Create tiers service with seed functions (AC: #2, #3)
  - [x] 4.1 Create convex/services/tiers.ts
  - [x] 4.2 Add seedTiers mutation with default tiers and benefits
  - [x] 4.3 Add queries: getTiers, getTierById, getTierByName, getUserTier
  - [x] 4.4 Add getTierProgress query for progress visualization
  - [x] 4.5 Add updateUserTier mutation for tier promotion
  - [x] 4.6 Add getUserTierMultiplier query for tier-based point bonuses

- [x] Task 5: Deploy and verify (AC: #5)
  - [x] 5.1 Deploy schema changes - all tables and indexes created
  - [x] 5.2 Tiers service exported from services index

## Dev Notes

### Default Tier Configuration

| Tier     | Threshold (×100) | Display | Icon   | Color     |
|----------|------------------|---------|--------|-----------|
| Bronze   | 0                | 1       | 🥉     | #CD7F32   |
| Silver   | 500000 (5000)    | 2       | 🥈     | #C0C0C0   |
| Gold     | 1500000 (15000)  | 3       | 🥇     | #FFD700   |
| Platinum | 5000000 (50000)  | 4       | 💎     | #E5E4E2   |

### Tier Benefits by Level

**Bronze (0 pts):**
- Standard point earning (1:1)

**Silver (5000 pts):**
- 5% bonus points on purchases (1.05x multiplier)
- Early access to flash sales

**Gold (15000 pts):**
- 10% bonus points on purchases (1.1x multiplier)
- Priority booking slots
- Free birthday service
- Early access to flash sales

**Platinum (50000 pts):**
- 15% bonus points on purchases (1.15x multiplier)
- Dedicated VIP line
- Complimentary premium services monthly
- Exclusive member events
- Priority booking
- Early access to flash sales

### References

- [Source: epics-customer-experience.md#Story 3.1]
- [Source: convex/schema.ts] - Tier schema definition

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` - Added table indexes for tiers and tier_benefits

### Completion Notes List

1. Added `tiers` table to schema with:
   - Fields: name, threshold, display_order, icon, color, is_active, created_at, updated_at
   - Indexes: by_threshold, by_name, by_display_order

2. Added `tier_benefits` table to schema with:
   - Fields: tier_id, benefit_type, benefit_value, description, is_active, created_at
   - benefit_type enum: points_multiplier, priority_booking, free_service, discount, early_access, vip_line, exclusive_event
   - Indexes: by_tier, by_type

3. Added `current_tier_id` to users table:
   - Optional field referencing tiers table
   - null = Bronze (default for all users)

4. Created comprehensive tiers service (`convex/services/tiers.ts`):
   - DEFAULT_TIERS config with Bronze/Silver/Gold/Platinum
   - DEFAULT_BENEFITS config per tier
   - Queries: getTiers, getTierById, getTierByName, getUserTier, getTierBenefits, calculateTierForPoints, getTierProgress, getUserTierMultiplier
   - Mutations: seedTiers (creates tiers and benefits), updateUserTier (promotes user)

5. Added exports to services/index.ts for points, wallet, and tiers

### File List

- [x] convex/schema.ts (MODIFY) - Add tiers, tier_benefits tables, current_tier_id to users
- [x] convex/services/tiers.ts (CREATE) - Full tier service
- [x] convex/services/index.ts (MODIFY) - Export points, wallet, tiers
