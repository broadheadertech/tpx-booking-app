/**
 * Promo Preview Card Component
 *
 * Shows promo benefit preview during checkout/payment.
 * Calculates and displays bonus points/credit the customer will receive.
 *
 * Story 20.3: Active Promo Display
 * @module src/components/common/PromoPreviewCard
 */

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Zap, Gift, Sparkles, Check } from 'lucide-react';

/**
 * Calculate promo benefit for an amount
 */
const calculatePromoBenefit = (promo, baseAmount) => {
  if (!promo) return { bonus: 0, total: baseAmount, description: '' };

  if (promo.type === 'bonus_points') {
    // Base points = amount (1:1 ratio)
    const basePoints = baseAmount;
    const totalPoints = Math.round(basePoints * promo.multiplier);
    const bonusPoints = totalPoints - basePoints;
    return {
      bonus: bonusPoints,
      total: totalPoints,
      description: `${promo.multiplier}x points from ${promo.name}`,
    };
  }

  if (promo.type === 'flat_bonus') {
    const bonusPoints = (promo.flat_amount || 0) / 100;
    return {
      bonus: bonusPoints,
      total: baseAmount + bonusPoints,
      description: `+${bonusPoints} pts from ${promo.name}`,
    };
  }

  // wallet_bonus handled separately
  return { bonus: 0, total: baseAmount, description: '' };
};

/**
 * Promo Preview for Payment/Checkout
 * Shows how much the customer will earn with active promo
 */
export default function PromoPreviewCard({
  userId,
  branchId,
  amount, // Payment amount in pesos
  variant = 'default', // 'default' | 'compact' | 'inline'
}) {
  const activePromos = useQuery(
    api.services.promotions.getActivePromotions,
    userId && amount ? { branchId, userId } : 'skip'
  );

  // Filter to promos that apply (points-based, meet min purchase)
  const applicablePromos = activePromos?.filter((p) => {
    if (p.type === 'wallet_bonus') return false; // Wallet bonus only for top-ups
    if (p.min_purchase && amount < p.min_purchase) return false;
    return true;
  }) || [];

  // Get the best promo (highest benefit)
  const bestPromo = applicablePromos.length > 0
    ? applicablePromos.reduce((best, current) => {
        const bestBenefit = calculatePromoBenefit(best, amount);
        const currentBenefit = calculatePromoBenefit(current, amount);
        return currentBenefit.bonus > bestBenefit.bonus ? current : best;
      })
    : null;

  const benefit = calculatePromoBenefit(bestPromo, amount);
  const basePoints = amount; // 1:1 base earning

  // No applicable promo
  if (!bestPromo) {
    if (variant === 'inline') {
      return (
        <span className="text-gray-400 text-sm">
          Earn {basePoints.toLocaleString()} pts
        </span>
      );
    }
    return null;
  }

  // Inline variant - just text
  if (variant === 'inline') {
    return (
      <span className="text-yellow-400 text-sm font-medium">
        Earn {benefit.total.toLocaleString()} pts ({benefit.description})
      </span>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <Zap className="w-4 h-4 text-yellow-400" />
        <div className="text-sm">
          <span className="text-white font-medium">{benefit.total.toLocaleString()} pts</span>
          <span className="text-yellow-400 ml-1">(+{benefit.bonus.toLocaleString()} bonus)</span>
        </div>
      </div>
    );
  }

  // Default variant - full card
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/30 p-4">
      {/* Sparkle decoration */}
      <Sparkles className="absolute top-2 right-2 w-5 h-5 text-yellow-500/30" />

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-yellow-400" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
              Promo Active
            </span>
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1">
              <Check className="w-3 h-3" />
              Applied
            </span>
          </div>

          <div className="text-white font-semibold mb-1">{bestPromo.name}</div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-yellow-400">
              {benefit.total.toLocaleString()}
            </span>
            <span className="text-gray-400">pts</span>
          </div>

          <div className="text-xs text-gray-500 mt-1">
            Base: {basePoints.toLocaleString()} pts + Bonus: {benefit.bonus.toLocaleString()} pts
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wallet Top-up Promo Preview
 * Shows wallet bonus promo for top-up flow
 */
export function WalletPromoPreview({ userId, branchId, topUpAmount }) {
  const activePromos = useQuery(
    api.services.promotions.getActivePromotions,
    userId && topUpAmount ? { branchId, userId } : 'skip'
  );

  // Find wallet bonus promo
  const walletPromo = activePromos?.find((p) => {
    if (p.type !== 'wallet_bonus') return false;
    if (p.min_purchase && topUpAmount < p.min_purchase) return false;
    return true;
  });

  if (!walletPromo) return null;

  const bonusAmount = (walletPromo.flat_amount || 0) / 100;
  const totalCredit = topUpAmount + bonusAmount;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
      <Gift className="w-5 h-5 text-blue-400" />
      <div>
        <div className="text-sm font-medium text-white">
          {walletPromo.name}
        </div>
        <div className="text-xs text-blue-400">
          Top up ₱{topUpAmount} → Get ₱{totalCredit} (+₱{bonusAmount} promo bonus!)
        </div>
      </div>
    </div>
  );
}

/**
 * Points Earn Preview with Promo
 * Simple component showing points to earn with optional promo
 */
export function PointsEarnWithPromo({ userId, branchId, amount }) {
  const activePromos = useQuery(
    api.services.promotions.getActivePromotions,
    userId && amount ? { branchId, userId } : 'skip'
  );

  const applicablePromo = activePromos?.find((p) => {
    if (p.type === 'wallet_bonus') return false;
    if (p.min_purchase && amount < p.min_purchase) return false;
    return true;
  });

  const benefit = calculatePromoBenefit(applicablePromo, amount);
  const hasPromo = applicablePromo && benefit.bonus > 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-sm">You'll earn:</span>
      <span className={`font-semibold ${hasPromo ? 'text-yellow-400' : 'text-white'}`}>
        {benefit.total.toLocaleString()} pts
      </span>
      {hasPromo && (
        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {applicablePromo.multiplier ? `${applicablePromo.multiplier}x` : `+${benefit.bonus}`}
        </span>
      )}
    </div>
  );
}
