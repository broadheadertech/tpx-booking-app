import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Clock, Heart, Calendar, User } from "lucide-react";

/**
 * WelcomeBackCard - Staff view showing "Welcome Back" info for returning customers
 *
 * Features:
 * - "Welcome back, [Name]!" greeting
 * - Visit count badge
 * - Preferred barber display
 * - "We missed you!" alert for 30+ day absence
 * - Member since milestone
 *
 * @param {Object} props
 * @param {string} props.userId - The customer's user ID
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.compact - Compact display mode
 */
function WelcomeBackCard({ userId, className = "", compact = false }) {
  const welcomeInfo = useQuery(
    api.services.tiers.getCustomerWelcomeInfo,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (welcomeInfo === undefined) {
    return <WelcomeBackSkeleton compact={compact} className={className} />;
  }

  // No data or new customer
  if (!welcomeInfo || welcomeInfo.visitCount === 0) {
    return (
      <div className={`rounded-xl bg-blue-500/10 border border-blue-500/30 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              New Customer
            </p>
            <p className="text-xs text-gray-400">
              First visit - make them feel welcome!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    firstName,
    tierInfo,
    visitCount,
    daysSinceLastVisit,
    missedCustomer,
    frequentCustomer,
    preferredBarber,
    memberSinceFormatted,
  } = welcomeInfo;

  // Compact mode for queue list
  if (compact) {
    return (
      <div
        className={`rounded-lg p-3 border ${className}`}
        style={{
          backgroundColor: missedCustomer
            ? "rgba(234, 179, 8, 0.1)"
            : `${tierInfo.color}10`,
          borderColor: missedCustomer
            ? "rgba(234, 179, 8, 0.3)"
            : `${tierInfo.color}30`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{tierInfo.icon}</span>
            <span className="text-sm font-medium text-white">
              {visitCount}{visitCount === 1 ? "st" : visitCount === 2 ? "nd" : visitCount === 3 ? "rd" : "th"} visit
            </span>
          </div>
          {missedCustomer && (
            <span className="text-xs text-yellow-400">
              {daysSinceLastVisit} days ago
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full card mode
  return (
    <div
      className={`rounded-xl overflow-hidden border ${className}`}
      style={{
        borderColor: tierInfo.color + "40",
      }}
    >
      {/* Welcome Header */}
      <div
        className="px-4 py-4"
        style={{
          background: missedCustomer
            ? "linear-gradient(to right, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.1))"
            : `linear-gradient(to right, ${tierInfo.color}20, ${tierInfo.color}10)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: tierInfo.color + "30" }}
          >
            <span className="text-2xl">{tierInfo.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Welcome back, {firstName}!
            </h3>
            <p className="text-sm" style={{ color: tierInfo.color }}>
              {tierInfo.name} Member
              {frequentCustomer && " • Loyal Customer"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-[#1A1A1A] px-4 py-3 space-y-3">
        {/* Visit Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Heart className="w-4 h-4" />
            <span className="text-sm">Visit Number</span>
          </div>
          <span className="text-sm font-semibold text-white">
            {visitCount}{getOrdinalSuffix(visitCount)} visit
            {frequentCustomer && " 🎉"}
          </span>
        </div>

        {/* Missed Customer Alert */}
        {missedCustomer && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Clock className="w-4 h-4 text-yellow-400" />
            <div>
              <p className="text-sm text-yellow-400 font-medium">
                We missed you!
              </p>
              <p className="text-xs text-gray-400">
                Last visit was {daysSinceLastVisit} days ago
              </p>
            </div>
          </div>
        )}

        {/* Preferred Barber */}
        {preferredBarber && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <User className="w-4 h-4" />
              <span className="text-sm">Usually served by</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-xs font-medium text-[var(--color-primary)]">
                {preferredBarber.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <span className="text-sm font-medium text-white">
                {preferredBarber.name}
              </span>
            </div>
          </div>
        )}

        {/* Member Since */}
        {memberSinceFormatted && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Member since</span>
            </div>
            <span className="text-sm text-white">
              {memberSinceFormatted}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Skeleton loader
 */
function WelcomeBackSkeleton({ compact, className = "" }) {
  if (compact) {
    return (
      <div className={`rounded-lg p-3 bg-gray-800/50 border border-gray-700 ${className}`}>
        <div className="h-5 w-24 bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-700 ${className}`}>
      <div className="px-4 py-4 bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
          <div>
            <div className="h-5 w-40 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-[#1A1A1A] px-4 py-3 space-y-3">
        <div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default WelcomeBackCard;
