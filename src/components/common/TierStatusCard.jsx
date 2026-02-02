import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Skeleton from "./Skeleton";

/**
 * TierStatusCard - Shows user's VIP tier status with benefits
 *
 * Features:
 * - Real-time tier updates via Convex subscription
 * - Tier badge with icon and color
 * - Benefits list for current tier
 * - Progress bar toward next tier
 * - Encouraging message for Bronze tier
 * - Skeleton loading state
 *
 * @param {Object} props
 * @param {string} props.userId - The user's ID
 * @param {string} props.variant - Display variant: "card" | "compact" | "badge"
 * @param {boolean} props.showBenefits - Whether to show benefits list
 * @param {boolean} props.showProgress - Whether to show progress bar
 * @param {string} props.className - Additional CSS classes
 */
function TierStatusCard({
  userId,
  variant = "card",
  showBenefits = true,
  showProgress = true,
  className = "",
}) {
  const userTier = useQuery(
    api.services.tiers.getUserTier,
    userId ? { userId } : "skip"
  );

  const tierProgress = useQuery(
    api.services.tiers.getTierProgress,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (userTier === undefined || tierProgress === undefined) {
    return <TierStatusSkeleton variant={variant} className={className} />;
  }

  // No tier data
  if (!userTier?.tier) {
    return (
      <div className={`rounded-2xl bg-gray-800/50 border border-gray-700 p-6 ${className}`}>
        <p className="text-gray-400 text-sm">Tier information unavailable</p>
      </div>
    );
  }

  const { tier, benefits, isDefault } = userTier;
  const isBronze = tier.name === "Bronze";
  const isMaxTier = tierProgress?.isMaxTier;

  if (variant === "badge") {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${className}`}
        style={{ backgroundColor: `${tier.color}20`, borderColor: `${tier.color}50` }}
      >
        <span className="text-lg">{tier.icon}</span>
        <span className="text-sm font-semibold" style={{ color: tier.color }}>
          {tier.name}
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${tier.color}20` }}
        >
          <span className="text-xl">{tier.icon}</span>
        </div>
        <div>
          <p className="text-sm text-gray-400">VIP Status</p>
          <p className="font-semibold text-white" style={{ color: tier.color }}>
            {tier.name} Member
          </p>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      className={`rounded-2xl border p-6 ${className}`}
      style={{
        background: `linear-gradient(to bottom right, ${tier.color}15, ${tier.color}05)`,
        borderColor: `${tier.color}40`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">VIP Status</h3>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{tier.icon}</span>
            <p
              className="text-2xl font-bold"
              style={{ color: tier.color }}
            >
              {tier.name}
            </p>
          </div>
        </div>
        <TierBadge tier={tier} />
      </div>

      {/* Benefits */}
      {showBenefits && benefits && benefits.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Your Benefits</h4>
          <TierBenefitsList benefits={benefits} tierColor={tier.color} />
        </div>
      )}

      {/* Progress Bar */}
      {showProgress && tierProgress && !isMaxTier && (
        <TierProgressSection
          tierProgress={tierProgress}
          currentTier={tier}
        />
      )}

      {/* Bronze encouragement */}
      {isBronze && !showProgress && (
        <div className="mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <p className="text-sm text-gray-400">
            Keep earning points to unlock Silver tier perks!
          </p>
          {tierProgress && !isMaxTier && (
            <p className="text-xs text-gray-500 mt-1">
              {Math.floor(tierProgress.pointsToNextTier / 100).toLocaleString()} more points to Silver
            </p>
          )}
        </div>
      )}

      {/* Max tier celebration */}
      {isMaxTier && tier.name !== "Bronze" && (
        <div
          className="mt-4 p-3 rounded-lg border"
          style={{
            backgroundColor: `${tier.color}10`,
            borderColor: `${tier.color}30`,
          }}
        >
          <p className="text-sm" style={{ color: tier.color }}>
            You've reached the highest tier! Enjoy all your exclusive benefits.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * TierProgressSection - Inline progress bar for TierStatusCard
 */
function TierProgressSection({ tierProgress, currentTier }) {
  const { nextTier, lifetimePoints, pointsToNextTier, progressPercent } =
    tierProgress;

  // Convert from ×100 format for display
  const displayLifetimePoints = Math.floor(lifetimePoints / 100);
  const displayPointsToNext = Math.floor(pointsToNextTier / 100);
  const nextThreshold = nextTier ? Math.floor(nextTier.threshold / 100) : 0;

  // Almost there threshold (>80%)
  const isAlmostThere = progressPercent >= 80;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">Progress to {nextTier?.name}</span>
        {isAlmostThere && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full animate-pulse"
            style={{
              backgroundColor: `${nextTier?.color || currentTier.color}20`,
              color: nextTier?.color || currentTier.color,
            }}
          >
            Almost there!
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progressPercent}%`,
            background: isAlmostThere
              ? `linear-gradient(90deg, ${currentTier.color}, ${nextTier?.color})`
              : currentTier.color,
          }}
        />
      </div>

      {/* Points info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
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
    </div>
  );
}

/**
 * TierBadge - Circular badge showing tier icon
 */
function TierBadge({ tier }) {
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center"
      style={{
        background: `linear-gradient(to bottom right, ${tier.color}30, ${tier.color}10)`,
        border: `2px solid ${tier.color}50`,
      }}
    >
      <span className="text-2xl">{tier.icon}</span>
    </div>
  );
}

/**
 * TierBenefitsList - Shows list of benefits with icons
 */
function TierBenefitsList({ benefits, tierColor }) {
  // Map benefit types to icons and display names
  const benefitConfig = {
    points_multiplier: { icon: "✨", label: "Bonus Points" },
    priority_booking: { icon: "📅", label: "Priority Booking" },
    free_service: { icon: "🎁", label: "Free Services" },
    discount: { icon: "💰", label: "Discounts" },
    early_access: { icon: "⚡", label: "Early Access" },
    vip_line: { icon: "👑", label: "VIP Line" },
    exclusive_event: { icon: "🎉", label: "Exclusive Events" },
  };

  return (
    <ul className="space-y-2">
      {benefits
        .filter((b) => b.is_active !== false)
        .map((benefit, index) => {
          const config = benefitConfig[benefit.benefit_type] || {
            icon: "•",
            label: benefit.benefit_type,
          };
          return (
            <li
              key={benefit._id || index}
              className="flex items-start gap-3 text-sm"
            >
              <span className="text-base flex-shrink-0">{config.icon}</span>
              <span className="text-gray-300">{benefit.description}</span>
            </li>
          );
        })}
    </ul>
  );
}

/**
 * Skeleton loader for TierStatusCard
 */
function TierStatusSkeleton({ variant, className = "" }) {
  if (variant === "badge") {
    return <Skeleton className={`h-8 w-24 rounded-full ${className}`} />;
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Skeleton className="w-10 h-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/50 p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="w-14 h-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mb-3" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-5/6" />
      </div>
    </div>
  );
}

export default TierStatusCard;
export { TierBadge, TierBenefitsList };
