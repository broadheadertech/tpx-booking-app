# Story 20.3: Active Promo Display

Status: ready-for-dev

## Story

As a **customer**,
I want to see active promotions available to me,
So that I can take advantage of special offers when making purchases.

## Acceptance Criteria

1. **Given** I am logged in as a customer
   **When** I view my dashboard or loyalty section
   **Then** I see active promotions I'm eligible for

2. **Given** there's an active "Double Points" promo
   **When** I view the promo details
   **Then** I see: name, benefit description, time remaining, and eligibility info

3. **Given** a promo is ending soon (within 24 hours)
   **When** I view promotions
   **Then** I see an "Ending Soon!" badge highlighted

4. **Given** I'm about to make a payment
   **When** there's an active promo that applies
   **Then** I see a promo banner showing the benefit I'll receive

5. **Given** I don't meet a promo's eligibility (tier, min purchase)
   **When** I view promotions
   **Then** I either don't see it, or see it grayed out with explanation

## Tasks / Subtasks

- [ ] Task 1: Create ActivePromoBanner component (AC: #1, #2, #3)
  - [ ] 1.1 Create src/components/common/ActivePromoBanner.jsx
  - [ ] 1.2 Display promo name, benefit, time remaining
  - [ ] 1.3 Add "Ending Soon" badge for <24h
  - [ ] 1.4 Handle multiple active promos (carousel or list)

- [ ] Task 2: Create PromoPreviewCard component (AC: #4)
  - [ ] 2.1 Create src/components/common/PromoPreviewCard.jsx
  - [ ] 2.2 Show benefit preview during checkout
  - [ ] 2.3 Calculate bonus based on cart amount

- [ ] Task 3: Integrate into Customer Dashboard (AC: #1, #2, #3)
  - [ ] 3.1 Add ActivePromoBanner to customer loyalty section
  - [ ] 3.2 Show in customer dashboard

- [ ] Task 4: Deploy and verify (AC: #1-5)
  - [ ] 4.1 Build passes successfully
  - [ ] 4.2 Promos display correctly for eligible users

## Dev Notes

### Component Structure

```
src/components/common/
├── ActivePromoBanner.jsx (NEW) - Shows active promos
└── PromoPreviewCard.jsx (NEW) - Checkout preview
```

### Using getActivePromotions Query

The promotions service already has `getActivePromotions` query:

```typescript
const activePromos = useQuery(api.services.promotions.getActivePromotions, {
  branchId: userBranchId, // Optional
  userId: currentUserId,   // For eligibility filtering
});
```

### Display Patterns

1. **Dashboard Banner**: Carousel of active promos
2. **Checkout Preview**: "You'll earn X pts (includes 2x promo!)"
3. **Ending Soon Badge**: Red/orange badge for <24h

### References

- [Source: convex/services/promotions.ts] - getActivePromotions query
- [Source: src/components/common/PointsBalanceDisplay.jsx] - UI pattern

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- [ ] src/components/common/ActivePromoBanner.jsx (CREATE)
- [ ] src/components/common/PromoPreviewCard.jsx (CREATE)
- [ ] src/pages/customer/Dashboard.jsx (MODIFY) - Add promo display
