# Story 1.2: Points Display Helpers

Status: done

## Story

As a **developer**,
I want helper functions for points display conversions,
So that all components show consistent peso-equivalent formatting.

## Acceptance Criteria

1. **Given** integer ×100 storage (4575 = 45.75 points)
   **When** I call `formatPoints(4575)`
   **Then** it returns "45.75 pts"

2. **Given** points need peso conversion (1 point = ₱1)
   **When** I call `formatPointsAsPeso(4575)`
   **Then** it returns "₱45.75"

3. **Given** I need to store user input
   **When** I call `toStorageFormat(45.75)`
   **Then** it returns 4575 (integer)

4. **Given** helper file convex/lib/points.ts is created
   **When** I import helpers in any service or component
   **Then** they work correctly with TypeScript types

## Tasks / Subtasks

- [x] Task 1: Create convex/lib/points.ts helper file (AC: #1, #2, #3, #4)
  - [x] 1.1 Create convex/lib/ directory if needed
  - [x] 1.2 Implement formatPoints() - converts storage to display (4575 → "45.75 pts")
  - [x] 1.3 Implement formatPointsAsPeso() - converts to peso display (4575 → "₱45.75")
  - [x] 1.4 Implement toStorageFormat() - converts user input to storage (45.75 → 4575)
  - [x] 1.5 Add TypeScript types for all helper functions
  - [x] 1.6 Add JSDoc comments explaining the integer ×100 pattern

- [x] Task 2: Verify helpers work correctly (AC: #4)
  - [x] 2.1 Test with edge cases (0, whole numbers, decimals)
  - [x] 2.2 Verify TypeScript compilation with no errors

## Dev Notes

### Architecture Requirements (CRITICAL)

**Integer ×100 Storage Pattern** - [Source: architecture-customer-experience.md#Pattern 1]
- Store ALL points as integers multiplied by 100
- Example: 45.75 points → stored as 4575
- This avoids floating-point precision errors
- Display conversion: `storedValue / 100`

**Points-to-Peso Conversion:**
- 1 point = ₱1 (simple 1:1 ratio)
- Example: 45.75 points = ₱45.75

### Implementation Reference (from Architecture)

```typescript
// convex/lib/points.ts

/**
 * Points Display Helpers
 *
 * Storage Pattern: Integer ×100
 * - 4575 stored = 45.75 points displayed
 * - Avoids floating-point precision errors
 *
 * Peso Conversion: 1 point = ₱1
 */

/**
 * Convert stored value to display format
 * @param storedValue - Integer ×100 (e.g., 4575)
 * @returns Formatted string (e.g., "45.75 pts")
 */
export function formatPoints(storedValue: number): string {
  const actual = storedValue / 100;
  const formatted = actual % 1 === 0 ? actual.toFixed(0) : actual.toFixed(2);
  return `${formatted} pts`;
}

/**
 * Convert stored value to peso display
 * @param storedValue - Integer ×100 (e.g., 4575)
 * @returns Formatted peso string (e.g., "₱45.75")
 */
export function formatPointsAsPeso(storedValue: number): string {
  const actual = storedValue / 100;
  return `₱${actual.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Convert user input to storage format
 * @param displayValue - Decimal value (e.g., 45.75)
 * @returns Integer ×100 for storage (e.g., 4575)
 */
export function toStorageFormat(displayValue: number): number {
  return Math.round(displayValue * 100);
}

/**
 * Get raw points value (for calculations)
 * @param storedValue - Integer ×100 (e.g., 4575)
 * @returns Actual decimal value (e.g., 45.75)
 */
export function fromStorageFormat(storedValue: number): number {
  return storedValue / 100;
}
```

### Project Context Rules (MUST FOLLOW)

**File Placement** - [Source: project-context.md]
- Helper libs go in `convex/lib/`
- Use TypeScript for type safety
- Export pure functions (no side effects)

**Naming Conventions:**
- Functions: camelCase (✅ `formatPoints`, `toStorageFormat`)
- File: kebab-case or single word (✅ `points.ts`)

### Edge Cases to Handle

1. **Zero points:** `formatPoints(0)` → "0 pts"
2. **Whole numbers:** `formatPoints(10000)` → "100 pts" (not "100.00 pts")
3. **Decimals:** `formatPoints(4575)` → "45.75 pts"
4. **Large numbers:** `formatPoints(1500000)` → "15,000 pts" (with comma formatting)
5. **Negative values:** `formatPoints(-500)` → "-5 pts" (for adjustments/redemptions)

### References

- [Source: architecture-customer-experience.md#Pattern 1: Points Value Storage & Display]
- [Source: project-context.md#Language-Specific Rules]
- [Source: epics-customer-experience.md#Story 1.2: Points Display Helpers]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- `npx convex dev --once` completed successfully
- TypeScript compilation passed with no errors

### Completion Notes List

1. Created `convex/lib/points.ts` with 6 helper functions:
   - `formatPoints(storedValue)` - Returns "45.75 pts" format
   - `formatPointsAsPeso(storedValue)` - Returns "₱45.75" format
   - `toStorageFormat(displayValue)` - Converts user input to integer ×100
   - `fromStorageFormat(storedValue)` - Converts storage to decimal
   - `formatPointsWithPeso(storedValue)` - Combined format "45.75 pts (₱45.75)"
   - `isValidStoredPoints(storedValue)` - Validation helper

2. All functions include:
   - Full JSDoc documentation with examples
   - Proper TypeScript types (number → string/number/boolean)
   - Locale formatting with en-PH for peso display
   - Edge case handling (0, whole numbers, decimals, large numbers)

3. Verified compilation with `npx convex dev --once` - no TypeScript errors

### File List

- [x] convex/lib/points.ts (CREATE)
