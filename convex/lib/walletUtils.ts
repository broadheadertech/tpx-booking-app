/**
 * Wallet Utility Functions
 *
 * Shared helper functions for wallet operations including commission calculation.
 * Used by branchEarnings and other wallet-related services.
 *
 * Story 22.1: Create Wallet Earning Records
 * @module convex/lib/walletUtils
 */

/**
 * Commission calculation result
 */
export interface CommissionResult {
  commissionAmount: number; // SA commission in whole pesos
  netAmount: number; // Branch earnings after commission
}

/**
 * Calculate commission from a gross amount
 *
 * MANDATORY PATTERN: All commission calculations MUST use this function
 * to ensure consistency across the system.
 *
 * Currency is stored as whole pesos (integers):
 * - 500 = ₱500
 * - Uses Math.round() to avoid floating point issues
 *
 * @param grossAmount - Full payment amount in whole pesos (integer)
 * @param commissionPercent - Commission rate as percentage (e.g., 5 = 5%)
 * @returns CommissionResult with commissionAmount and netAmount
 *
 * @example
 * // 5% commission on ₱1000
 * calculateCommission(1000, 5)
 * // Returns: { commissionAmount: 50, netAmount: 950 }
 *
 * @example
 * // 0% commission (no commission)
 * calculateCommission(1000, 0)
 * // Returns: { commissionAmount: 0, netAmount: 1000 }
 *
 * @example
 * // Handles rounding correctly
 * calculateCommission(333, 5)
 * // Returns: { commissionAmount: 17, netAmount: 316 } (rounds 16.65 to 17)
 */
export function calculateCommission(
  grossAmount: number,
  commissionPercent: number
): CommissionResult {
  // Validate inputs
  if (grossAmount < 0) {
    throw new Error("Gross amount cannot be negative");
  }
  if (commissionPercent < 0 || commissionPercent > 100) {
    throw new Error("Commission percent must be between 0 and 100");
  }

  // Calculate commission using Math.round() for whole pesos
  const commissionAmount = Math.round(grossAmount * (commissionPercent / 100));
  const netAmount = grossAmount - commissionAmount;

  return {
    commissionAmount,
    netAmount,
  };
}

/**
 * Default commission rate if no configuration exists
 * Used as fallback when walletConfig and branchWalletSettings are missing
 */
export const DEFAULT_COMMISSION_PERCENT = 5;

/**
 * Valid earning statuses for branchWalletEarnings
 */
export const EARNING_STATUS = {
  PENDING: "pending",
  SETTLED: "settled",
} as const;

export type EarningStatus = (typeof EARNING_STATUS)[keyof typeof EARNING_STATUS];

/**
 * Valid settlement statuses for branchSettlements
 * Story 25.1: Branch Requests Settlement
 *
 * Status transitions (from architecture-multi-branch-wallet.md):
 * - pending → approved (SA approves)
 * - pending → rejected (SA rejects)
 * - approved → processing (SA initiates transfer)
 * - approved → rejected (SA cancels)
 * - processing → completed (Transfer confirmed)
 * - processing → rejected (Transfer failed)
 */
export const SETTLEMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;

export type SettlementStatus =
  (typeof SETTLEMENT_STATUS)[keyof typeof SETTLEMENT_STATUS];

/**
 * Valid settlement status transitions
 * Used for state machine validation
 */
export const SETTLEMENT_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["processing", "rejected"],
  processing: ["completed", "rejected"],
  completed: [],
  rejected: [],
} as const;
