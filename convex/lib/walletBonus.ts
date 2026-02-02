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
