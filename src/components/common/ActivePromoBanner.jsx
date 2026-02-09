/**
 * Active Promo Banner Component
 *
 * Displays active promotions available to the customer.
 * Shows promo details, time remaining, and eligibility.
 *
 * Story 20.3: Active Promo Display
 * @module src/components/common/ActivePromoBanner
 */

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Zap, Gift, Wallet, Clock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const TYPE_INFO = {
  bonus_points: {
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    gradient: 'from-yellow-500/20 to-orange-500/10',
  },
  flat_bonus: {
    icon: Gift,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    gradient: 'from-green-500/20 to-emerald-500/10',
  },
  wallet_bonus: {
    icon: Wallet,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
};

/**
 * Format time remaining for display
 */
const formatTimeRemaining = (hoursRemaining) => {
  if (hoursRemaining < 1) return 'Ending soon!';
  if (hoursRemaining < 24) return `${hoursRemaining}h left`;
  const days = Math.floor(hoursRemaining / 24);
  const hours = hoursRemaining % 24;
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
};

/**
 * Get benefit text for promo type
 */
const getBenefitText = (promo) => {
  if (promo.type === 'bonus_points') {
    return `Earn ${promo.multiplier}x points on purchases!`;
  }
  const amount = (promo.flat_amount || 0) / 100;
  if (promo.type === 'wallet_bonus') {
    return `Get +₱${amount} extra on wallet top-ups!`;
  }
  return `Earn +${amount} bonus points!`;
};

/**
 * Single Promo Card
 */
function PromoCard({ promo, isCompact = false }) {
  const typeInfo = TYPE_INFO[promo.type] || TYPE_INFO.bonus_points;
  const Icon = typeInfo.icon;

  if (isCompact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${typeInfo.gradient} border ${typeInfo.borderColor}`}>
        <div className={`w-8 h-8 rounded-lg ${typeInfo.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${typeInfo.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{promo.name}</div>
          <div className={`text-xs ${typeInfo.color}`}>{getBenefitText(promo)}</div>
        </div>
        {promo.isEndingSoon && (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex-shrink-0">
            Ending Soon!
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${typeInfo.gradient} border ${typeInfo.borderColor} p-5`}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${typeInfo.bgColor} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${typeInfo.color}`} />
            </div>
            <div>
              <div className="text-white font-bold text-lg">{promo.name}</div>
              <div className={`text-sm ${typeInfo.color}`}>{getBenefitText(promo)}</div>
            </div>
          </div>

          {promo.isEndingSoon && (
            <span className="px-3 py-1 bg-red-500/30 text-red-300 text-xs font-medium rounded-full animate-pulse">
              Ending Soon!
            </span>
          )}
        </div>

        {/* Description */}
        {promo.description && (
          <p className="text-gray-400 text-sm mb-4">{promo.description}</p>
        )}

        {/* Time Remaining */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>{formatTimeRemaining(promo.hoursRemaining)}</span>
          </div>

          {/* Eligibility Tags */}
          <div className="flex gap-2">
            {promo.tier_requirement && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                {promo.tier_requirement}+ tier
              </span>
            )}
            {promo.min_purchase && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                Min ₱{promo.min_purchase}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Active Promo Banner - Shows all active promotions
 */
export default function ActivePromoBanner({ userId, branchId, variant = 'full' }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activePromos = useQuery(
    api.services.promotions.getActivePromotions,
    userId ? { branchId, userId } : 'skip'
  );

  // Loading state
  if (activePromos === undefined) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-[#2A2A2A] rounded-2xl" />
      </div>
    );
  }

  // No active promos
  if (!activePromos || activePromos.length === 0) {
    return null; // Don't show anything if no promos
  }

  const isCompact = variant === 'compact';
  const hasMultiple = activePromos.length > 1;

  // Navigation for carousel
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? activePromos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === activePromos.length - 1 ? 0 : prev + 1));
  };

  // Compact variant - list all promos
  if (isCompact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">Active Promotions</span>
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
            {activePromos.length}
          </span>
        </div>
        {activePromos.map((promo) => (
          <PromoCard key={promo._id} promo={promo} isCompact />
        ))}
      </div>
    );
  }

  // Full variant - carousel for multiple, single card for one
  const currentPromo = activePromos[currentIndex];

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="font-semibold text-white">Active Promotions</span>
          {hasMultiple && (
            <span className="text-gray-500 text-sm">
              {currentIndex + 1} of {activePromos.length}
            </span>
          )}
        </div>

        {/* Navigation */}
        {hasMultiple && (
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Promo Card */}
      <PromoCard promo={currentPromo} />

      {/* Dots Indicator */}
      {hasMultiple && (
        <div className="flex justify-center gap-1.5 mt-4">
          {activePromos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-yellow-400' : 'bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mini promo indicator for headers/navbars
 */
export function PromoIndicator({ userId, branchId }) {
  const activePromos = useQuery(
    api.services.promotions.getActivePromotions,
    userId ? { branchId, userId } : 'skip'
  );

  if (!activePromos || activePromos.length === 0) return null;

  const hasEndingSoon = activePromos.some((p) => p.isEndingSoon);

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
      hasEndingSoon ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
    }`}>
      <Zap className="w-3 h-3" />
      <span>{activePromos.length} promo{activePromos.length > 1 ? 's' : ''}</span>
    </div>
  );
}
