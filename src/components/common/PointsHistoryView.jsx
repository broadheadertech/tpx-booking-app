import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Skeleton from "./Skeleton";
import { formatPoints, fromStorageFormat } from "../../../convex/lib/points";

/**
 * PointsHistoryView - Shows chronological list of points transactions
 *
 * Features:
 * - Real-time updates via Convex subscription
 * - Paginated loading with "Load more" button
 * - Color-coded amounts (green for earn, red for redeem)
 * - Source descriptions for each transaction
 *
 * @param {Object} props
 * @param {string} props.userId - The user's ID
 * @param {number} props.initialLimit - Initial number of transactions to show (default: 10)
 * @param {string} props.className - Additional CSS classes
 */
function PointsHistoryView({ userId, initialLimit = 10, className = "" }) {
  const [limit, setLimit] = useState(initialLimit);

  const transactions = useQuery(
    api.services.points.getPointsHistory,
    userId ? { userId, limit: limit + 1 } : "skip" // +1 to check if more exist
  );

  // Loading state
  if (transactions === undefined) {
    return <HistorySkeleton count={3} className={className} />;
  }

  // Check if there are more transactions
  const hasMore = transactions.length > limit;
  const displayedTransactions = hasMore
    ? transactions.slice(0, limit)
    : transactions;

  // Empty state
  if (displayedTransactions.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-400 mb-2">No points activity yet</p>
        <p className="text-sm text-gray-500">
          Complete a purchase to start earning points!
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {displayedTransactions.map((tx) => (
          <TransactionItem key={tx._id} transaction={tx} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setLimit((prev) => prev + initialLimit)}
          className="w-full mt-4 py-3 text-sm text-orange-400 hover:text-orange-300 border border-gray-700 rounded-xl hover:border-orange-500/50 transition-colors"
        >
          Load more transactions
        </button>
      )}
    </div>
  );
}

/**
 * Individual transaction item
 */
function TransactionItem({ transaction }) {
  const { type, amount, balance_after, source_type, notes, created_at } =
    transaction;

  const isPositive = amount >= 0;
  const formattedAmount = formatPoints(Math.abs(amount));
  const balanceAfter = formatPoints(balance_after);
  const date = new Date(created_at);

  // Check for tier promotion in notes
  const tierPromotion = parseTierPromotion(notes);

  // Format date
  const dateStr = date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
  const timeStr = date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Get icon and colors based on transaction type
  const { icon, bgColor, textColor, label } = getTypeStyles(type, source_type);

  // Get source description
  const description = getSourceDescription(source_type, notes);

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-white">{label}</p>
            <p className="text-sm text-gray-400 truncate">{description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`font-semibold ${textColor}`}>
              {isPositive ? "+" : "-"}
              {formattedAmount}
            </p>
            <p className="text-xs text-gray-500">Balance: {balanceAfter}</p>
          </div>
        </div>

        {/* Tier Promotion Badge */}
        {tierPromotion && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
            <span className="text-sm">🎉</span>
            <span className="text-xs font-medium text-amber-400">
              Promoted to {tierPromotion.newTier}!
            </span>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          {dateStr} at {timeStr}
        </p>
      </div>
    </div>
  );
}

/**
 * Get display styles based on transaction type
 */
function getTypeStyles(type, sourceType) {
  switch (type) {
    case "earn":
      return {
        icon: (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        bgColor: "bg-green-500/20",
        textColor: "text-green-400",
        label: sourceType === "wallet_payment" ? "Earned (1.5x Bonus)" : "Points Earned",
      };

    case "redeem":
      return {
        icon: (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
            <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
          </svg>
        ),
        bgColor: "bg-red-500/20",
        textColor: "text-red-400",
        label: "Points Redeemed",
      };

    case "expire":
      return {
        icon: (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
        bgColor: "bg-gray-500/20",
        textColor: "text-gray-400",
        label: "Points Expired",
      };

    case "adjust":
      return {
        icon: (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        ),
        bgColor: "bg-blue-500/20",
        textColor: "text-blue-400",
        label: "Adjustment",
      };

    default:
      return {
        icon: (
          <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z" />
          </svg>
        ),
        bgColor: "bg-orange-500/20",
        textColor: "text-orange-400",
        label: "Points Activity",
      };
  }
}

/**
 * Get source description based on source_type
 */
function getSourceDescription(sourceType, notes) {
  // Remove tier promotion tag from display notes
  const cleanNotes = notes?.replace(/\[TIER_PROMOTION:[^\]]+\]/, "").trim();

  switch (sourceType) {
    case "payment":
      return cleanNotes || "From service payment";
    case "wallet_payment":
      return cleanNotes || "From wallet payment (1.5x bonus)";
    case "redemption":
      return cleanNotes || "Redeemed for reward";
    case "top_up_bonus":
      return cleanNotes || "Bonus from wallet top-up";
    case "manual_adjustment":
      return cleanNotes || "Admin adjustment";
    case "expiry":
      return cleanNotes || "Inactive points expired";
    default:
      return cleanNotes || "Points activity";
  }
}

/**
 * Parse tier promotion info from transaction notes
 * Notes format: [TIER_PROMOTION:Bronze→Silver]
 * @returns {Object|null} { previousTier, newTier } or null
 */
function parseTierPromotion(notes) {
  if (!notes) return null;

  const match = notes.match(/\[TIER_PROMOTION:([^→]+)→([^\]]+)\]/);
  if (!match) return null;

  return {
    previousTier: match[1],
    newTier: match[2],
  };
}

/**
 * Skeleton loader for history
 */
function HistorySkeleton({ count = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-4 rounded-xl bg-gray-800/30"
        >
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="text-right">
                <Skeleton className="h-5 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-28 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default PointsHistoryView;
