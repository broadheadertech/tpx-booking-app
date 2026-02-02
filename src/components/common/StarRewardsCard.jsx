import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Star, Sparkles } from "lucide-react";

/**
 * StarRewardsCard - Starbucks-style hero rewards display
 *
 * Features:
 * - Prominent star/points balance
 * - Circular progress ring showing tier progress
 * - Current tier badge
 * - Points to next tier indicator
 */
function StarRewardsCard({ userId, className = "" }) {
  const ledger = useQuery(
    api.services.points.getPointsLedger,
    userId ? { userId } : "skip"
  );

  const tierProgress = useQuery(
    api.services.tiers.getTierProgress,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (ledger === undefined || tierProgress === undefined) {
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

  // Calculate display values
  const currentBalance = ledger?.current_balance ? ledger.current_balance / 100 : 0;
  const lifetimePoints = ledger?.lifetime_earned ? ledger.lifetime_earned / 100 : 0;
  const currentTier = tierProgress?.currentTier;
  const nextTier = tierProgress?.nextTier;
  const progressPercent = tierProgress?.progressPercent || 0;
  const pointsToNext = tierProgress?.pointsToNextTier ? tierProgress.pointsToNextTier / 100 : 0;
  const isMaxTier = tierProgress?.isMaxTier || false;

  // Tier icon mapping
  const getTierIcon = (tierName) => {
    const icons = {
      'Bronze': '🥉',
      'Silver': '🥈',
      'Gold': '🥇',
      'Platinum': '👑'
    };
    return icons[tierName] || '⭐';
  };

  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] ${className}`}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white/80" />
            <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Star Rewards
            </span>
          </div>
          {currentTier && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-sm">
              <span className="text-lg">{getTierIcon(currentTier.name)}</span>
              <span className="text-sm font-bold text-white">{currentTier.name}</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-between">
          {/* Points Display */}
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <Star className="w-8 h-8 text-[#CBA258] fill-[#CBA258]" />
              <span className="text-5xl font-black text-white">
                {currentBalance.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-white/70 font-medium">Stars Available</p>
          </div>

          {/* Progress Ring */}
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="6"
              />
              {/* Progress circle */}
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 35}`}
                strokeDashoffset={`${2 * Math.PI * 35 * (1 - progressPercent / 100)}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>

        {/* Footer - Next tier info */}
        <div className="mt-6 pt-4 border-t border-white/20">
          {isMaxTier ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl">👑</span>
              <span className="text-sm font-medium text-white/90">
                You've reached the highest tier!
              </span>
            </div>
          ) : nextTier ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getTierIcon(nextTier.name)}</span>
                <span className="text-sm text-white/80">
                  <span className="font-bold text-white">{pointsToNext.toLocaleString()}</span> stars to {nextTier.name}
                </span>
              </div>
              <button className="text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2">
                View Benefits
              </button>
            </div>
          ) : (
            <p className="text-sm text-white/70">Start earning stars with every booking!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StarRewardsCard;
