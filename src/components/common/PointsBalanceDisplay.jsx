import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Skeleton from "./Skeleton";
import { formatPointsWithPeso, fromStorageFormat } from "../../../convex/lib/points";

/**
 * PointsBalanceDisplay - Shows user's loyalty points balance with peso equivalent
 *
 * Features:
 * - Real-time balance updates via Convex subscription
 * - Peso equivalent display (1 point = ₱1)
 * - Friendly message for 0 points
 * - Skeleton loading state
 *
 * @param {Object} props
 * @param {string} props.userId - The user's ID
 * @param {string} props.variant - Display variant: "card" | "inline" | "compact"
 * @param {string} props.className - Additional CSS classes
 */
function PointsBalanceDisplay({ userId, variant = "card", className = "" }) {
  const ledger = useQuery(
    api.services.points.getPointsLedger,
    userId ? { userId } : "skip"
  );

  // Check for expiring points (Story 19.5)
  const expiringPoints = useQuery(
    api.services.points.getUserExpiringPoints,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (ledger === undefined) {
    return <PointsBalanceSkeleton variant={variant} className={className} />;
  }

  // No ledger yet (new user) - treat as 0 points
  const balance = ledger?.current_balance ?? 0;
  const hasPoints = balance > 0;

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <span className="text-orange-400 font-medium">
          {formatPointsWithPeso(balance)}
        </span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-orange-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-gray-400">Points Balance</p>
          <p className="text-lg font-semibold text-white">
            {formatPointsWithPeso(balance)}
          </p>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">
            Loyalty Points
          </h3>
          <p className="text-3xl font-bold text-white">
            {formatPointsWithPeso(balance)}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-orange-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z" />
          </svg>
        </div>
      </div>

      {!hasPoints && (
        <div className="mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <p className="text-sm text-gray-400">
            Start earning points with every purchase! 1 point = ₱1 value.
          </p>
        </div>
      )}

      {/* Points Expiry Warning (Story 19.5) */}
      {hasPoints && expiringPoints?.showWarning && (
        <div className="mt-4 p-3 rounded-lg bg-orange-500/20 border border-orange-500/40">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-orange-300">
                {fromStorageFormat(expiringPoints.pointsExpiring).toLocaleString()} points expiring
              </p>
              <p className="text-xs text-orange-400/80">
                Use your points within {expiringPoints.daysUntilExpiry} days to avoid losing them
              </p>
            </div>
          </div>
        </div>
      )}

      {hasPoints && ledger && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Lifetime Earned</p>
            <p className="text-gray-300 font-medium">
              {fromStorageFormat(ledger.lifetime_earned).toLocaleString()} pts
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total Redeemed</p>
            <p className="text-gray-300 font-medium">
              {fromStorageFormat(ledger.lifetime_redeemed).toLocaleString()} pts
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for PointsBalanceDisplay
 */
function PointsBalanceSkeleton({ variant, className = "" }) {
  if (variant === "compact") {
    return <Skeleton className={`h-5 w-24 ${className}`} />;
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="w-8 h-8 rounded-full" />
        <div>
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
      <Skeleton className="h-16 w-full mt-4 rounded-lg" />
    </div>
  );
}

export default PointsBalanceDisplay;
