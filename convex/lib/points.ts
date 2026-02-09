/**
 * Points Display Helpers
 *
 * Storage Pattern: Integer ×100
 * - 4575 stored = 45.75 points displayed
 * - Avoids floating-point precision errors
 *
 * Peso Conversion: 1 point = ₱1
 *
 * @module convex/lib/points
 */

/**
 * Convert stored value to display format with "pts" suffix
 * @param storedValue - Integer ×100 (e.g., 4575 = 45.75 points)
 * @returns Formatted string (e.g., "45.75 pts" or "100 pts" for whole numbers)
 * @example
 * formatPoints(4575) // "45.75 pts"
 * formatPoints(10000) // "100 pts"
 * formatPoints(0) // "0 pts"
 */
export function formatPoints(storedValue: number): string {
  const actual = storedValue / 100;
  // Use whole number format if no decimal, otherwise show 2 decimal places
  const formatted =
    actual % 1 === 0
      ? actual.toLocaleString("en-PH")
      : actual.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return `${formatted} pts`;
}

/**
 * Convert stored value to peso display (1 point = ₱1)
 * @param storedValue - Integer ×100 (e.g., 4575 = ₱45.75)
 * @returns Formatted peso string with ₱ symbol (e.g., "₱45.75")
 * @example
 * formatPointsAsPeso(4575) // "₱45.75"
 * formatPointsAsPeso(150000) // "₱1,500.00"
 * formatPointsAsPeso(0) // "₱0.00"
 */
export function formatPointsAsPeso(storedValue: number): string {
  const actual = storedValue / 100;
  return `₱${actual.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Convert user input (decimal) to storage format (integer ×100)
 * Uses Math.round to handle floating-point precision issues
 * @param displayValue - Decimal value from user input (e.g., 45.75)
 * @returns Integer ×100 for database storage (e.g., 4575)
 * @example
 * toStorageFormat(45.75) // 4575
 * toStorageFormat(100) // 10000
 * toStorageFormat(0.01) // 1
 */
export function toStorageFormat(displayValue: number): number {
  return Math.round(displayValue * 100);
}

/**
 * Convert stored value to raw decimal (for calculations)
 * @param storedValue - Integer ×100 from database (e.g., 4575)
 * @returns Actual decimal value (e.g., 45.75)
 * @example
 * fromStorageFormat(4575) // 45.75
 * fromStorageFormat(10000) // 100
 */
export function fromStorageFormat(storedValue: number): number {
  return storedValue / 100;
}

/**
 * Format points with both points and peso display
 * Useful for customer-facing displays that show both values
 * @param storedValue - Integer ×100 (e.g., 4575)
 * @returns Combined string (e.g., "45.75 pts (₱45.75)")
 * @example
 * formatPointsWithPeso(4575) // "45.75 pts (₱45.75)"
 * formatPointsWithPeso(150000) // "1,500 pts (₱1,500.00)"
 */
export function formatPointsWithPeso(storedValue: number): string {
  const actual = storedValue / 100;
  const pointsFormatted =
    actual % 1 === 0
      ? actual.toLocaleString("en-PH")
      : actual.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const pesoFormatted = actual.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${pointsFormatted} pts (₱${pesoFormatted})`;
}

/**
 * Check if stored value represents a valid points amount
 * @param storedValue - Value to validate
 * @returns True if valid (non-negative integer)
 */
export function isValidStoredPoints(storedValue: number): boolean {
  return Number.isInteger(storedValue) && storedValue >= 0;
}
