/**
 * Wallet Top-Up Bonus Calculator
 *
 * Calculates bonus amounts for wallet top-ups based on tier thresholds.
 *
 * Default Tiers:
 * - ₱500 → ₱50 bonus (10%)
 * - ₱1000 → ₱150 bonus (15%)
 *
 * @module convex/lib/walletBonus
 */

/**
 * Bonus tier configuration
 * Each tier has a minimum amount and the bonus received
 */
export interface BonusTier {
  minAmount: number;
  bonus: number;
}

/**
 * Default bonus tiers (can be overridden by config in future)
 * Sorted by minAmount descending for proper matching
 */
export const DEFAULT_BONUS_TIERS: BonusTier[] = [
  { minAmount: 1000, bonus: 150 }, // ₱1000 → ₱150 bonus (15%)
  { minAmount: 500, bonus: 50 }, // ₱500 → ₱50 bonus (10%)
];

/**
 * Calculate the bonus for a given top-up amount
 *
 * @param amount - The top-up amount in pesos
 * @param tiers - Optional custom tiers (defaults to DEFAULT_BONUS_TIERS)
 * @returns The bonus amount to be added
 *
 * @example
 * calculateTopUpBonus(500)  // Returns 50
 * calculateTopUpBonus(1000) // Returns 150
 * calculateTopUpBonus(300)  // Returns 0
 * calculateTopUpBonus(750)  // Returns 50 (matches ₱500 tier)
 */
export function calculateTopUpBonus(
  amount: number,
  tiers: BonusTier[] = DEFAULT_BONUS_TIERS
): number {
  // Sort tiers by minAmount descending to match highest tier first
  const sortedTiers = [...tiers].sort((a, b) => b.minAmount - a.minAmount);

  for (const tier of sortedTiers) {
    if (amount >= tier.minAmount) {
      return tier.bonus;
    }
  }

  return 0; // No bonus for amounts below all tiers
}

/**
 * Get tier info for display purposes
 *
 * @param amount - The top-up amount
 * @param tiers - Optional custom tiers
 * @returns Tier info including bonus and total
 */
export function getTopUpBonusInfo(
  amount: number,
  tiers: BonusTier[] = DEFAULT_BONUS_TIERS
): {
  bonus: number;
  total: number;
  bonusRate: number;
  tierMatched: boolean;
} {
  const bonus = calculateTopUpBonus(amount, tiers);
  return {
    bonus,
    total: amount + bonus,
    bonusRate: bonus > 0 ? (bonus / amount) * 100 : 0,
    tierMatched: bonus > 0,
  };
}

/**
 * Format bonus tier for display
 *
 * @param tier - The bonus tier
 * @returns Formatted string like "₱500 → ₱50 bonus"
 */
export function formatBonusTier(tier: BonusTier): string {
  return `₱${tier.minAmount.toLocaleString()} → ₱${tier.bonus.toLocaleString()} bonus`;
}

/**
 * Get all available bonus tiers formatted for display
 *
 * @param tiers - Optional custom tiers
 * @returns Array of formatted tier strings
 */
export function getFormattedBonusTiers(
  tiers: BonusTier[] = DEFAULT_BONUS_TIERS
): string[] {
  return tiers.map(formatBonusTier);
}

/**
 * Story 23.4: Calculate bonus with monthly cap consideration
 *
 * This function calculates the bonus for a top-up considering:
 * 1. The full bonus based on the top-up amount
 * 2. Cap the bonus at the remaining monthly allowance
 *
 * IMPORTANT: The monthly cap limits the BONUS AMOUNT given, not the top-up amount.
 * Example: If cap is ₱380 and user tops up ₱1000:
 * - Full bonus would be ₱150 (from ₱1000 tier)
 * - If ₱0 used so far, they get the full ₱150
 * - Remaining cap becomes ₱380 - ₱150 = ₱230
 *
 * @param topUpAmount - The full top-up amount in pesos
 * @param monthlyBonusCap - The monthly bonus cap (0 = unlimited) - max bonus that can be given per month
 * @param bonusGivenThisMonth - Total bonus already given this month
 * @param tiers - Bonus tiers to apply
 * @returns Object with bonus calculation details
 */
export function calculateBonusWithCap(
  topUpAmount: number,
  monthlyBonusCap: number,
  bonusGivenThisMonth: number,
  tiers: BonusTier[] = DEFAULT_BONUS_TIERS
): {
  bonus: number;
  fullBonus: number;
  newBonusGivenThisMonth: number;
  wasLimited: boolean;
} {
  // Calculate the full bonus based on the top-up amount (ignoring cap)
  const fullBonus = calculateTopUpBonus(topUpAmount, tiers);

  // If no cap (0 = unlimited), give full bonus
  if (monthlyBonusCap === 0) {
    return {
      bonus: fullBonus,
      fullBonus,
      newBonusGivenThisMonth: bonusGivenThisMonth + fullBonus,
      wasLimited: false,
    };
  }

  // Calculate remaining bonus allowance
  const remainingBonusAllowance = Math.max(0, monthlyBonusCap - bonusGivenThisMonth);

  // If no remaining allowance, no bonus
  if (remainingBonusAllowance <= 0) {
    return {
      bonus: 0,
      fullBonus,
      newBonusGivenThisMonth: bonusGivenThisMonth,
      wasLimited: true,
    };
  }

  // Cap the bonus at the remaining allowance
  const bonus = Math.min(fullBonus, remainingBonusAllowance);
  const wasLimited = bonus < fullBonus;

  return {
    bonus,
    fullBonus,
    newBonusGivenThisMonth: bonusGivenThisMonth + bonus,
    wasLimited,
  };
}

/**
 * Helper to check if current month has started (for resetting monthly tracking)
 * Returns timestamp of the start of current month
 */
export function getMonthStartTimestamp(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/**
 * Check if we need to reset the monthly bonus tracking
 *
 * @param lastMonthStart - Timestamp of when the last bonus month started
 * @returns true if we're in a new month and should reset
 */
export function shouldResetMonthlyBonus(lastMonthStart: number | undefined): boolean {
  if (!lastMonthStart) return true;
  const currentMonthStart = getMonthStartTimestamp();
  return lastMonthStart < currentMonthStart;
}
