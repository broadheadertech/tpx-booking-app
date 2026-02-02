import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Skeleton from "./Skeleton";

/**
 * WalletBalanceDisplay - Shows user's e-wallet balance with real-time updates
 *
 * Features:
 * - Real-time balance updates via Convex subscription
 * - Separate display of main balance and bonus balance
 * - Prompt to top up when balance is 0
 * - Multiple display variants
 *
 * @param {Object} props
 * @param {string} props.userId - The user's ID
 * @param {string} props.variant - Display variant: "card" | "inline" | "compact"
 * @param {boolean} props.showTopUpButton - Show top-up button (default: true)
 * @param {function} props.onTopUp - Callback when top-up button clicked
 * @param {string} props.className - Additional CSS classes
 */
function WalletBalanceDisplay({
  userId,
  variant = "card",
  showTopUpButton = true,
  onTopUp,
  className = "",
}) {
  const wallet = useQuery(
    api.services.wallet.getWallet,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (wallet === undefined) {
    return <WalletSkeleton variant={variant} className={className} />;
  }

  // No wallet yet - treat as 0 balance
  const mainBalance = wallet?.balance ?? 0;
  const bonusBalance = wallet?.bonus_balance ?? 0;
  const totalBalance = mainBalance + bonusBalance;
  const hasBalance = totalBalance > 0;
  const hasBonus = bonusBalance > 0;

  // Format currency
  const formatPeso = (amount) =>
    `₱${amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <span className="text-green-400 font-medium">
          {formatPeso(totalBalance)}
        </span>
        {hasBonus && (
          <span className="text-xs text-green-300/70">
            (+{formatPeso(bonusBalance)} bonus)
          </span>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
            <path
              fillRule="evenodd"
              d="M6 10a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm2 1a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm5 0a1 1 0 011-1h.01a1 1 0 110 2H14a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm text-gray-400">Wallet Balance</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-semibold text-white">
              {formatPeso(mainBalance)}
            </p>
            {hasBonus && (
              <span className="text-sm text-green-400">
                + {formatPeso(bonusBalance)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">
            E-Wallet Balance
          </h3>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-white">
              {formatPeso(mainBalance)}
            </p>
            {hasBonus && (
              <span className="text-lg text-green-400 font-medium">
                + {formatPeso(bonusBalance)}
              </span>
            )}
          </div>
          {hasBonus && (
            <p className="text-sm text-gray-500 mt-1">
              Total: {formatPeso(totalBalance)}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
            <path
              fillRule="evenodd"
              d="M6 10a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm2 1a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm5 0a1 1 0 011-1h.01a1 1 0 110 2H14a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {!hasBalance && (
        <div className="mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <p className="text-sm text-gray-400">
            Your wallet is empty. Top up to enjoy faster payments and earn bonus
            points!
          </p>
        </div>
      )}

      {showTopUpButton && (
        <button
          onClick={onTopUp}
          className="w-full mt-4 py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Top Up Wallet
        </button>
      )}

      {hasBonus && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Bonus balance is used first when paying
        </p>
      )}
    </div>
  );
}

/**
 * Skeleton loader for WalletBalanceDisplay
 */
function WalletSkeleton({ variant, className = "" }) {
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
      className={`rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full mt-4 rounded-xl" />
    </div>
  );
}

export default WalletBalanceDisplay;
