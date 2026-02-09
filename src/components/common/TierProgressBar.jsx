import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Skeleton from "./Skeleton";

/**
 * TierProgressBar - Shows progress toward next VIP tier
 *
 * Features:
 * - Animated progress bar with gradient fill
 * - Points progress (current/threshold)
 * - "Almost there" highlight when >80%
 * - Max tier celebration message
 * - Real-time updates via Convex subscription
 *
 * @param {Object} props
 * @param {string} props.userId - The user's ID
 * @param {string} props.variant - Display variant: "full" | "compact" | "mini"
 * @param {string} props.className - Additional CSS classes
 */
function TierProgressBar({ userId, variant = "full", className = "" }) {
  const tierProgress = useQuery(
    api.services.tiers.getTierProgress,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (tierProgress === undefined) {
    return <TierProgressSkeleton variant={variant} className={className} />;
  }

  // No progress data
  if (!tierProgress || !tierProgress.currentTier) {
    return null;
  }

  const {
    currentTier,
    nextTier,
    lifetimePoints,
    pointsToNextTier,
    progressPercent,
    isMaxTier,
  } = tierProgress;

  // Convert from ×100 format for display
  const displayLifetimePoints = Math.floor(lifetimePoints / 100);
  const displayPointsToNext = Math.floor(pointsToNextTier / 100);
  const nextThreshold = nextTier ? Math.floor(nextTier.threshold / 100) : 0;

  // Almost there threshold (>80%)
  const isAlmostThere = progressPercent >= 80 && !isMaxTier;

  if (variant === "mini") {
    if (isMaxTier) {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          <span className="text-lg">{currentTier.icon}</span>
          <span className="text-xs text-gray-400">Max Tier</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: currentTier.color,
            }}
          />
        </div>
        <span className="text-xs text-gray-400">{progressPercent}%</span>
      </div>
    );
  }

  if (variant === "compact") {
    if (isMaxTier) {
      return (
        <div className={`flex items-center gap-3 ${className}`}>
          <span className="text-2xl">{currentTier.icon}</span>
          <div>
            <p className="text-sm font-medium text-gray-300">
              {currentTier.name} - Highest Tier
            </p>
            <p className="text-xs text-gray-500">
              {displayLifetimePoints.toLocaleString()} lifetime points
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentTier.icon}</span>
            <span className="text-sm font-medium text-gray-300">
              {currentTier.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">
              {nextTier?.name}
            </span>
            <span className="text-lg">{nextTier?.icon}</span>
          </div>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: isAlmostThere
                ? `linear-gradient(90deg, ${currentTier.color}, ${nextTier?.color || currentTier.color})`
                : currentTier.color,
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {displayPointsToNext.toLocaleString()} pts to {nextTier?.name}
        </p>
      </div>
    );
  }

  // Full variant (default)
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{
        background: `linear-gradient(to bottom right, ${currentTier.color}10, transparent)`,
        borderColor: `${currentTier.color}30`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-400">Tier Progress</h4>
        {isAlmostThere && (
          <span
            className="px-2 py-0.5 text-xs font-semibold rounded-full animate-pulse"
            style={{
              backgroundColor: `${nextTier?.color || currentTier.color}20`,
              color: nextTier?.color || currentTier.color,
            }}
          >
            Almost there!
          </span>
        )}
      </div>

      {isMaxTier ? (
        // Max tier celebration
        <div className="text-center py-4">
          <span className="text-4xl mb-3 block">{currentTier.icon}</span>
          <p
            className="text-lg font-bold mb-1"
            style={{ color: currentTier.color }}
          >
            You've reached {currentTier.name}!
          </p>
          <p className="text-sm text-gray-400">
            The highest tier - enjoy all your exclusive benefits
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {displayLifetimePoints.toLocaleString()} lifetime points earned
          </p>
        </div>
      ) : (
        <>
          {/* Tier indicators */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentTier.icon}</span>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: currentTier.color }}
                >
                  {currentTier.name}
                </p>
                <p className="text-xs text-gray-500">Current</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p
                  className="text-sm font-semibold"
                  style={{ color: nextTier?.color }}
                >
                  {nextTier?.name}
                </p>
                <p className="text-xs text-gray-500">Next</p>
              </div>
              <span className="text-2xl opacity-50">{nextTier?.icon}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden mb-3">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: isAlmostThere
                  ? `linear-gradient(90deg, ${currentTier.color}, ${nextTier?.color})`
                  : currentTier.color,
              }}
            />
            {/* Glow effect for almost there */}
            {isAlmostThere && (
              <div
                className="absolute inset-y-0 rounded-full blur-sm animate-pulse"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${currentTier.color}50, ${nextTier?.color}50)`,
                }}
              />
            )}
          </div>

          {/* Points info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {displayLifetimePoints.toLocaleString()} / {nextThreshold.toLocaleString()} pts
            </span>
            <span
              className="font-medium"
              style={{ color: isAlmostThere ? nextTier?.color : "inherit" }}
            >
              {isAlmostThere
                ? `Only ${displayPointsToNext.toLocaleString()} to go!`
                : `${displayPointsToNext.toLocaleString()} pts to ${nextTier?.name}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Skeleton loader for TierProgressBar
 */
function TierProgressSkeleton({ variant, className = "" }) {
  if (variant === "mini") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="flex-1 h-1.5 rounded-full" />
        <Skeleton className="h-4 w-8" />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={className}>
        <div className="flex justify-between mb-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-32 mt-1" />
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={`rounded-2xl bg-gray-800/30 border border-gray-700/50 p-5 ${className}`}
    >
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-3 w-full rounded-full mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export default TierProgressBar;
