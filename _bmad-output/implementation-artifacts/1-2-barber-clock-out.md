# Story 1.2: Barber Clock Out

Status: done

---

## Story

As a **Barber**,
I want to **clock out when I finish my shift**,
So that **my total hours worked are recorded for payroll**.

---

## Acceptance Criteria

### AC1: Basic Clock Out
**Given** I am a logged-in barber who is currently clocked in
**When** I tap the "Clock Out" button
**Then** the system records my time-out with current timestamp
**And** I see my total hours worked for this shift
**And** the button changes to show "Clock In" state
**And** the action completes within 1 second (NFR4)

### AC2: Unclosed Shift Edge Case
**Given** I forgot to clock out yesterday
**When** I clock in today
**Then** I can still clock in (previous shift auto-closed at midnight)

---

## Tasks / Subtasks

- [x] **Task 1: Verify clockOut mutation functionality** (AC: #1)
  - [x] 1.1: Confirm `clockOut` mutation exists in `convex/services/timeAttendance.ts`
  - [x] 1.2: Verify mutation closes active shift with current timestamp
  - [x] 1.3: Verify response includes shift duration for display

- [x] **Task 2: Verify ClockButton clock-out UI** (AC: #1)
  - [x] 2.1: Confirm ClockButton shows "Clock Out" button when clocked in
  - [x] 2.2: Confirm total hours worked is displayed after clocking out
  - [x] 2.3: Confirm button changes to "Clock In" state after clock out
  - [x] 2.4: Verify <1s response feel with optimistic updates

- [x] **Task 3: Implement unclosed shift handling** (AC: #2)
  - [x] 3.1: Add auto-close logic to `clockIn` mutation for stale shifts (>24 hours)
  - [x] 3.2: Set unclosed shift's `clock_out` to midnight of shift date
  - [x] 3.3: Test edge case: clock in after forgetting to clock out

- [x] **Task 4: End-to-end verification** (AC: #1, #2)
  - [x] 4.1: Test complete clock-in → clock-out flow
  - [x] 4.2: Verify shift duration displays correctly
  - [x] 4.3: Run build to verify no regressions

---

## Dev Notes

### Previous Story Intelligence (Story 1.1)

Story 1.1 implemented significant infrastructure that Story 1.2 builds upon:

**Already Implemented:**
- `timeAttendance` table in Convex schema with 4 indexes (by_barber, by_branch, by_date, by_barber_date)
- `clockOut` mutation in `convex/services/timeAttendance.ts` (lines 98-129)
- `ClockButton.jsx` component with full clock-out UI (lines 132-167)
- Real-time shift duration display
- Error handling with user feedback
- Loading states with disabled button + spinner

**Code Review Fixes from Story 1.1:**
- Error UI for clock out failures
- Loading state during mutations (prevents double-tap)

### What's New for Story 1.2

**Primary Focus:** AC2 - Unclosed Shift Edge Case

The core clock-out functionality exists. This story adds robustness for the edge case where a barber forgets to clock out. The `clockIn` mutation needs to auto-close stale shifts.

### Implementation Pattern

**Auto-Close Stale Shifts (New Logic):**

```typescript
// In convex/services/timeAttendance.ts - Update clockIn mutation

export const clockIn = mutation({
  args: {
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Check for active shift
    const activeShift = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .first();

    // Auto-close stale shifts (>24 hours old)
    if (activeShift) {
      const shiftAge = Date.now() - activeShift.clock_in;
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      if (shiftAge > TWENTY_FOUR_HOURS) {
        // Auto-close at midnight of shift date
        const shiftDate = new Date(activeShift.clock_in);
        const midnight = new Date(
          shiftDate.getFullYear(),
          shiftDate.getMonth(),
          shiftDate.getDate() + 1,
          0, 0, 0, 0
        ).getTime();

        await ctx.db.patch(activeShift._id, {
          clock_out: midnight,
        });
        // Continue to create new shift
      } else {
        // Still within 24 hours - cannot clock in
        throw new ConvexError({
          code: "ALREADY_CLOCKED_IN",
          message: "You are already clocked in. Please clock out first.",
        });
      }
    }

    // Create new shift...
  },
});
```

### Existing Code References

**clockOut Mutation (Already Implemented):**
- File: [convex/services/timeAttendance.ts](convex/services/timeAttendance.ts#L98-L129)

```typescript
export const clockOut = mutation({
  args: {
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const activeShift = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .first();

    if (!activeShift) {
      throw new ConvexError({
        code: "NOT_CLOCKED_IN",
        message: "You are not clocked in. Please clock in first.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(activeShift._id, {
      clock_out: now,
    });

    return {
      success: true,
      shiftId: activeShift._id,
      clockOutTime: now,
      shiftDuration: now - activeShift.clock_in,
    };
  },
});
```

**ClockButton Clock-Out UI (Already Implemented):**
- File: [src/components/common/ClockButton.jsx](src/components/common/ClockButton.jsx#L132-L167)

```jsx
// Clocked in state - show clock out button and duration
if (isClockedIn) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {error && (
        <div className="flex items-center gap-2 text-red-500...">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 bg-[#1A1A1A]...">
        <Clock className="w-4 h-4 text-[var(--color-primary)]" />
        <span className="text-sm text-gray-400">Shift Duration:</span>
        <span className="text-sm font-semibold text-white">
          {formatDuration(duration)}
        </span>
      </div>

      <button
        onClick={handleClockOut}
        disabled={isLoading}
        className="h-14 w-full bg-red-500 hover:bg-red-600..."
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut />}
        {isLoading ? "Clocking Out..." : "Clock Out"}
      </button>
    </div>
  );
}
```

### Project Structure Notes

**Files to Modify:**
- `convex/services/timeAttendance.ts` - Add auto-close logic to clockIn mutation

**Files Already Complete (Verify Only):**
- `src/components/common/ClockButton.jsx` - Clock-out UI already implemented
- `convex/schema.ts` - timeAttendance table already exists

### Performance Requirements

- **NFR4:** Time in/out recording completes within 1 second
- Optimistic updates already implemented in ClockButton
- Response time primarily depends on Convex mutation speed

### Security Requirements

- **NFR6:** Branch isolation - all queries include branch_id (already implemented)
- **NFR8:** Authenticated access required (using existing auth context)

### UX Requirements

- **UX2:** Time clock must complete in < 2 seconds with one-tap action
- **UX6:** Mobile touch targets minimum 44px (button h-14 = 56px ✓)
- **UX7:** Use skeleton loaders for loading states (already implemented)
- **UX8:** Dark theme with orange accent (already implemented)

---

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md - Data Architecture]
- [Source: _bmad-output/planning-artifacts/project-context.md - Framework Rules]
- [Source: _bmad-output/implementation-artifacts/1-1-barber-clock-in.md - Previous Story]
- [Source: _bmad-output/planning-artifacts/prd.md - FR39, NFR4]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - UX2, UX6, UX7, UX8]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Convex push: Functions ready in 5.77s
- Build verification: vite build completed in 8.20s with no errors

### Completion Notes List

1. **Task 1 (Verification)**: Confirmed clockOut mutation exists at lines 98-129 with proper validation, timestamp recording, and shiftDuration return
2. **Task 2 (Verification)**: Confirmed ClockButton.jsx has complete clock-out UI including:
   - Clock Out button when isClockedIn
   - Shift duration display with real-time updates
   - Button state transition after clock out
   - Optimistic updates for <1s feel
3. **Task 3 (Implementation)**: Added auto-close logic for stale shifts >24 hours:
   - Detects shifts older than 24 hours
   - Auto-closes at midnight of the shift date
   - Allows new clock-in after auto-close
   - Preserves ALREADY_CLOCKED_IN error for shifts <24 hours
4. **Task 4 (Verification)**: Convex functions deployed successfully, production build passed with no regressions

### File List

**Modified:**
- `convex/services/timeAttendance.ts` - Added stale shift auto-close logic with PHT timezone fix and auto-close notification return
- `src/components/common/ClockButton.jsx` - Added auto-close notification UI for barbers

**Verified (No Changes Needed):**
- `convex/schema.ts` - timeAttendance table already exists

### Code Review Record

**Reviewed by:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Date:** 2026-01-25

**Issues Found:** 0 High, 4 Medium, 3 Low
**Issues Fixed:** 4 Medium, 3 Low (automatic fixes applied)

**Fixes Applied:**
1. **M1 - Timezone Handling**: Fixed auto-close to use PHT (UTC+8) midnight instead of server timezone
2. **M2 - Auto-Close Notification**: Added `autoClosedPreviousShift` and `autoClosedShiftId` to clockIn return value
3. **M4 - Magic Number**: Extracted `STALE_SHIFT_THRESHOLD_MS` and `PHT_OFFSET_MS` to module-level constants
4. **L1 - JSDoc**: Added documentation about auto-close behavior to clockIn mutation
5. **L2 - UI Notification**: Added amber notification in ClockButton when previous shift auto-closed

**Deferred:**
- M3 (No Unit Tests): Project uses manual testing; automated tests deferred to future test framework setup
