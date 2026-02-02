# Story 20.2: Create Flash Promotion

Status: ready-for-dev

## Story

As a **Branch Admin or Super Admin**,
I want to create time-limited flash promotions,
So that I can drive traffic and reward customers during specific periods.

## Acceptance Criteria

1. **Given** I am logged in as Branch Admin or Super Admin
   **When** I navigate to Promotions section
   **Then** I see a list of my promotions and a "Create Promotion" button

2. **Given** I click "Create Promotion"
   **When** I fill in the promotion form
   **Then** I can specify: name, type, value, dates, and eligibility rules

3. **Given** I create a bonus_points promo
   **When** I set multiplier to 2.0
   **Then** customers will earn 2x points during the promotion

4. **Given** I create a branch-scoped promotion (as Branch Admin)
   **When** I save the promotion
   **Then** it only applies to my branch

5. **Given** I create a system-wide promotion (as Super Admin)
   **When** I leave branch_id empty
   **Then** it applies to all branches

6. **Given** I view my promotions list
   **When** I check the status column
   **Then** I see: draft, scheduled, active, ended, or cancelled

7. **Given** I want to end a promotion early
   **When** I click "End Now" on an active promotion
   **Then** the promotion ends immediately

## Tasks / Subtasks

- [ ] Task 1: Create FlashPromotionsPage (AC: #1, #6)
  - [ ] 1.1 Create src/pages/admin/FlashPromotionsPage.jsx
  - [ ] 1.2 List promotions with status badges
  - [ ] 1.3 Filter by status
  - [ ] 1.4 Add "Create Promotion" button

- [ ] Task 2: Create PromotionForm component (AC: #2, #3, #4, #5)
  - [ ] 2.1 Create src/components/admin/PromotionForm.jsx
  - [ ] 2.2 Form fields for promo details
  - [ ] 2.3 Type selector (bonus_points, flat_bonus, wallet_bonus)
  - [ ] 2.4 Date/time pickers for start/end
  - [ ] 2.5 Eligibility rule configuration

- [ ] Task 3: Create PromotionCard component (AC: #6, #7)
  - [ ] 3.1 Create src/components/admin/PromotionCard.jsx
  - [ ] 3.2 Display promo details and status
  - [ ] 3.3 Action buttons (Edit, End, View Stats)
  - [ ] 3.4 Time remaining indicator

- [ ] Task 4: Add route and navigation (AC: #1)
  - [ ] 4.1 Add route to App.jsx
  - [ ] 4.2 Add to admin navigation

- [ ] Task 5: Deploy and verify (AC: #1-7)
  - [ ] 5.1 Build passes successfully
  - [ ] 5.2 Create/edit/end promotions work

## Dev Notes

### Component Structure

```
src/
├── pages/admin/
│   └── FlashPromotionsPage.jsx (NEW)
└── components/admin/
    ├── PromotionForm.jsx (NEW)
    └── PromotionCard.jsx (NEW)
```

### Promo Types

1. **bonus_points**: Multiplier (e.g., 2x = double points)
2. **flat_bonus**: Fixed amount added (e.g., +100 points)
3. **wallet_bonus**: Extra credit on top-up

### Status Badge Colors

- draft: gray
- scheduled: blue
- active: green
- ended: gray/muted
- cancelled: red

### UI Pattern

Follow existing admin panel patterns:
- Dark theme (#1A1A1A, #2A2A2A)
- Card grid for promotions list
- Modal form for create/edit
- Status badges with colors

### References

- [Source: convex/services/promotions.ts] - Promotions service
- [Source: src/components/admin/PointsConfigPanel.jsx] - UI pattern reference

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- [ ] src/pages/admin/FlashPromotionsPage.jsx (CREATE) - Main page
- [ ] src/components/admin/PromotionForm.jsx (CREATE) - Create/edit form
- [ ] src/components/admin/PromotionCard.jsx (CREATE) - Promo card display
- [ ] src/App.jsx (MODIFY) - Add route
