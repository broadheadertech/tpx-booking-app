import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router-dom";
import { History, Wallet, Star, Calendar } from "lucide-react";
import Skeleton from "./Skeleton";

/**
 * VipProfileStats - Shows VIP stats and quick links for customer profile
 *
 * Features:
 * - Member since date
 * - Total visits (completed bookings)
 * - Lifetime points earned
 * - Quick links to Wallet, Points History, etc.
 *
 * @param {Object} props
 * @param {string} props.userId - The user's ID
 * @param {string} props.className - Additional CSS classes
 */
function VipProfileStats({ userId, className = "" }) {
  const stats = useQuery(
    api.services.tiers.getCustomerVipStats,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (stats === undefined) {
    return <VipStatsSkeleton className={className} />;
  }

  // No data
  if (!stats) {
    return null;
  }

  const {
    tierInfo,
    displayLifetimePoints,
    displayCurrentPoints,
    completedVisits,
    memberSince,
  } = stats;

  // Format member since date
  const memberSinceDate = memberSince
    ? new Date(memberSince).toLocaleDateString("en-PH", {
        month: "long",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stats Grid */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">
          Loyalty Stats
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Member Since */}
          <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Member Since</span>
            </div>
            <p className="text-sm font-semibold text-white">{memberSinceDate}</p>
          </div>

          {/* Total Visits */}
          <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Total Visits</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {completedVisits.toLocaleString()}
            </p>
          </div>

          {/* Lifetime Points */}
          <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{tierInfo.icon}</span>
              <span className="text-xs text-gray-500">Lifetime Points</span>
            </div>
            <p
              className="text-sm font-semibold"
              style={{ color: tierInfo.color }}
            >
              {displayLifetimePoints.toLocaleString()} pts
            </p>
          </div>

          {/* Current Balance */}
          <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Point Balance</span>
            </div>
            <p className="text-sm font-semibold text-[var(--color-primary)]">
              {displayCurrentPoints.toLocaleString()} pts
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Quick Links</h3>

        <div className="grid grid-cols-2 gap-3">
          <QuickLinkButton
            to="/customer/wallet"
            icon={<Wallet className="w-5 h-5" />}
            label="My Wallet"
            description="Top up & pay"
          />
          <QuickLinkButton
            to="/customer/wallet"
            icon={<History className="w-5 h-5" />}
            label="Points History"
            description="View activity"
            state={{ scrollToHistory: true }}
          />
        </div>
      </div>

      {/* Achievements Preview */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Achievements</h3>

        <div className="flex flex-wrap gap-2">
          {/* First Visit Achievement */}
          {completedVisits >= 1 && (
            <AchievementBadge
              icon="🎉"
              label="First Visit"
              unlocked
            />
          )}

          {/* 5 Visits */}
          <AchievementBadge
            icon="⭐"
            label="5 Visits"
            unlocked={completedVisits >= 5}
          />

          {/* 10 Visits */}
          <AchievementBadge
            icon="🌟"
            label="10 Visits"
            unlocked={completedVisits >= 10}
          />

          {/* 25 Visits */}
          <AchievementBadge
            icon="👑"
            label="25 Visits"
            unlocked={completedVisits >= 25}
          />

          {/* Points Milestones */}
          <AchievementBadge
            icon="💎"
            label="1K Points"
            unlocked={displayLifetimePoints >= 1000}
          />

          <AchievementBadge
            icon="🏆"
            label="5K Points"
            unlocked={displayLifetimePoints >= 5000}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Link Button
 */
function QuickLinkButton({ to, icon, label, description, state }) {
  return (
    <Link
      to={to}
      state={state}
      className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-all group"
    >
      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/30 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

/**
 * Achievement Badge
 */
function AchievementBadge({ icon, label, unlocked }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        unlocked
          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          : "bg-gray-800/50 text-gray-600 border border-gray-700/30 opacity-60"
      }`}
    >
      <span className={unlocked ? "" : "grayscale"}>{icon}</span>
      <span>{label}</span>
      {!unlocked && <span className="text-gray-600">🔒</span>}
    </div>
  );
}

/**
 * Skeleton loader
 */
function VipStatsSkeleton({ className = "" }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]"
            >
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VipProfileStats;
