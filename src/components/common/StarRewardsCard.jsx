import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Star, Sparkles, CreditCard, ChevronRight, Shield } from "lucide-react";
import { useState } from "react";

/**
 * StarRewardsCard - Membership card hero display
 *
 * If user has an active card: shows tier badge, multiplier, XP progress, expiry
 * If no card: shows "Get Your Virtual Card" CTA
 */
function StarRewardsCard({ userId, className = "", onGetCard }) {
  const ledger = useQuery(
    api.services.points.getPointsLedger,
    userId ? { userId } : "skip"
  );

  const activeCard = useQuery(
    api.services.membershipCards.getActiveCard,
    userId ? { userId } : "skip"
  );

  const tierProgress = useQuery(
    api.services.tiers.getTierProgress,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (ledger === undefined || activeCard === undefined || tierProgress === undefined) {
    return (
      <div className={`rounded-[28px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-white/20 rounded mb-4" />
          <div className="h-12 w-32 bg-white/20 rounded mb-2" />
          <div className="h-3 w-20 bg-white/20 rounded" />
        </div>
      </div>
    );
  }

  // Points display
  const currentBalance = ledger?.current_balance ? ledger.current_balance / 100 : 0;

  // ─── NO CARD — CTA ───────────────────────────────────────────────
  if (!activeCard) {
    return (
      <div className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border border-[#3A3A3A] ${className}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-primary)]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-[var(--color-accent)]/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 p-6">
          {/* Points balance row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#CBA258] fill-[#CBA258]" />
              <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Stars</span>
            </div>
            <span className="text-2xl font-black text-white">{currentBalance.toLocaleString()}</span>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 rounded-2xl p-4 border border-[var(--color-primary)]/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/30 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Get Your Virtual Card</h3>
                <p className="text-white/50 text-xs">Unlock up to 3x points on every purchase</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              {['1.5x Silver', '2x Gold', '3x Platinum'].map((label) => (
                <span key={label} className="text-[10px] font-semibold text-white/70 bg-white/10 rounded-full px-2 py-0.5">
                  {label}
                </span>
              ))}
            </div>

            <button
              onClick={onGetCard}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
            >
              <Shield className="w-4 h-4" />
              Get Card
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── HAS CARD — TIER DISPLAY ─────────────────────────────────────
  const { tier_name, points_multiplier, xpProgress, daysToExpiry, isMaxTier, nextTierName, status } = activeCard;

  // Tier gradient backgrounds
  const tierGradients = {
    Silver: "from-[#8E8E8E] to-[#C0C0C0]",
    Gold: "from-[#B8860B] to-[#FFD700]",
    Platinum: "from-[#6B6B6B] to-[#E5E4E2]",
  };

  const tierIcons = {
    Silver: "🥈",
    Gold: "🥇",
    Platinum: "💎",
  };

  const progressPercent = tierProgress?.progressPercent || xpProgress || 0;
  const pointsToNext = tierProgress?.pointsToNextTier ? tierProgress.pointsToNextTier / 100 : 0;

  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${tierGradients[tier_name] || tierGradients.Silver} ${className}`}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-4 right-4 text-6xl opacity-10">{tierIcons[tier_name]}</div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-white/80" />
            <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Membership Card
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 rounded-full backdrop-blur-sm">
            <span className="text-lg">{tierIcons[tier_name]}</span>
            <span className="text-sm font-bold text-white">{tier_name}</span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex items-center justify-between">
          {/* Points + Multiplier */}
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <Star className="w-7 h-7 text-[#CBA258] fill-[#CBA258]" />
              <span className="text-4xl font-black text-white">
                {currentBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70 font-medium">Stars Available</span>
              <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                {points_multiplier}x
              </span>
            </div>
          </div>

          {/* XP Progress Ring */}
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40" cy="40" r="35"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="6"
              />
              <circle
                cx="40" cy="40" r="35"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 35}`}
                strokeDashoffset={`${2 * Math.PI * 35 * (1 - progressPercent / 100)}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-white">{Math.round(progressPercent)}%</span>
              <span className="text-[9px] text-white/60 font-medium">XP</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between">
          {isMaxTier ? (
            <div className="flex items-center gap-2">
              <span className="text-xl">💎</span>
              <span className="text-sm font-medium text-white/90">Max Tier Reached!</span>
            </div>
          ) : nextTierName ? (
            <div className="flex items-center gap-2">
              <span className="text-base">{tierIcons[nextTierName]}</span>
              <span className="text-sm text-white/80">
                <span className="font-bold text-white">{pointsToNext.toLocaleString()}</span> XP to {nextTierName}
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-1">
            {status === "grace_period" ? (
              <span className="text-xs font-semibold text-yellow-200 bg-yellow-500/20 px-2 py-1 rounded-full">
                Grace Period
              </span>
            ) : (
              <span className="text-xs text-white/60">
                {daysToExpiry > 0 ? `${daysToExpiry}d left` : "Expiring"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StarRewardsCard;
