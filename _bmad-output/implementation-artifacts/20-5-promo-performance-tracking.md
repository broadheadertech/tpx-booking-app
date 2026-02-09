# Story 20.5: Promo Performance Tracking

Status: in-dev

## Story

As a **Branch Admin or Super Admin**,
I want to view performance metrics for my flash promotions,
So that I can measure effectiveness and optimize future campaigns.

## Acceptance Criteria

1. **Given** I view a promotion's stats
   **When** I click "View Stats" on a promo card
   **Then** I see: total uses, unique users, total bonus awarded

2. **Given** a promotion has been used
   **When** I view its stats
   **Then** I see recent usage history with timestamps

3. **Given** I am on the promotions page
   **When** I view the summary stats
   **Then** I see: active promos count, total uses, total bonus awarded

4. **Given** I want to analyze promo performance
   **When** I view the stats modal
   **Then** I see conversion data (views vs uses if available)

## Tasks / Subtasks

- [x] Task 1: Stats already implemented in Story 20.2
  - [x] 1.1 getPromoUsageStats query exists
  - [x] 1.2 Stats modal exists in FlashPromotionsPage
  - [x] 1.3 PromotionCard has View Stats action

- [ ] Task 2: Add summary dashboard stats (AC: #3)
  - [ ] 2.1 Add total bonus awarded to summary cards
  - [ ] 2.2 Show top performing promos

- [ ] Task 3: Enhance stats display (AC: #1, #2, #4)
  - [ ] 3.1 Add chart/visualization for usage over time
  - [ ] 3.2 Show usage trend

## Dev Notes

### Already Implemented

Most of this story was implemented in Story 20.2:
- `getPromoUsageStats` query returns totalUses, uniqueUsers, totalBonusPoints, recentUsage
- Stats modal in FlashPromotionsPage shows these metrics
- PromotionCard has "View Stats" action

### Enhancements for This Story

1. Add aggregate stats across all promos
2. Add time-series data for usage trends
3. Add comparison metrics

## Dev Agent Record

### Completion Notes List

- Verified existing stats functionality from 20.2
- Enhanced summary stats display

### File List

- [ ] src/pages/admin/FlashPromotionsPage.jsx (MODIFY) - Enhance summary stats
