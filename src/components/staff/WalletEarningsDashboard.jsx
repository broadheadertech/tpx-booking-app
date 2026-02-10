/**
 * Wallet Earnings Dashboard - Story 22.2, 22.3, 25.1, 25.5
 *
 * Displays branch wallet earnings summary with real-time updates.
 * Branch Managers can see gross, commission, and net pending earnings.
 * Includes transaction list with date filtering (Story 22.3).
 * Includes settlement request button (Story 25.1).
 * Includes settlement history view (Story 25.5).
 *
 * ACs: #1 (pending earnings displayed), #2 (breakdown shown), #3 (real-time),
 *      #4 (skeleton loaders), #5 (branch isolation)
 * Story 25.1: #1 (settlement button), #5 (disable if pending)
 * Story 25.5: Settlement history with filters and receipt download
 */
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertCircle,
  BanknoteIcon,
  Clock,
  FileText,
} from "lucide-react";
import { EarningsTransactionList } from "./EarningsTransactionList";
import { SettlementRequestForm } from "./SettlementRequestForm";
import { SettlementHistoryList } from "./SettlementHistoryList";

/**
 * Format currency as Philippine Peso
 * @param {number} amount - Amount in whole pesos
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "₱0.00";
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Summary Card Component
 * Displays a single metric with icon and styling
 */
function SummaryCard({ title, value, subtitle, icon: Icon, variant = "default" }) {
  const variantStyles = {
    default: {
      border: "border-gray-700",
      iconBg: "bg-gray-700",
      iconColor: "text-gray-300",
      valueColor: "text-white",
    },
    success: {
      border: "border-green-700",
      iconBg: "bg-green-900/50",
      iconColor: "text-green-400",
      valueColor: "text-green-400",
    },
    warning: {
      border: "border-[var(--color-primary)]",
      iconBg: "bg-[var(--color-primary)]/15",
      iconColor: "text-[var(--color-primary)]",
      valueColor: "text-[var(--color-primary)]",
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={`bg-[#1A1A1A] rounded-xl p-4 sm:p-6 border ${styles.border} hover:border-opacity-80 transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 font-medium mb-1">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${styles.valueColor}`}>
            {formatCurrency(value)}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${styles.iconBg}`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${styles.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for dashboard (AC #4)
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-700 rounded" />
        <div className="h-6 w-32 bg-gray-700 rounded" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[#1A1A1A] rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-700 rounded mb-2" />
                <div className="h-8 w-32 bg-gray-700 rounded mb-1" />
                <div className="h-3 w-20 bg-gray-700 rounded" />
              </div>
              <div className="h-10 w-10 bg-gray-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Info section skeleton */}
      <div className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-700">
        <div className="h-4 w-full bg-gray-700 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

/**
 * Empty state when no earnings
 */
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <Wallet className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        No Wallet Earnings Yet
      </h3>
      <p className="text-gray-400 text-sm max-w-sm mx-auto">
        When customers pay with their wallet at your branch, earnings will appear here.
        Earnings update in real-time as payments are processed.
      </p>
    </div>
  );
}

/**
 * Error state for branch issues
 */
function ErrorState({ message }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Unable to Load Earnings
      </h3>
      <p className="text-gray-400 text-sm max-w-sm mx-auto">
        {message || "Please ensure you have a branch assigned to view earnings."}
      </p>
    </div>
  );
}

/**
 * Tab Button Component for Earnings/History toggle
 */
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all min-h-[44px] ${
        active
          ? "bg-[var(--color-primary)] text-white"
          : "bg-[#1A1A1A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

/**
 * Main WalletEarningsDashboard Component
 *
 * @param {Object} props
 * @param {string} props.branchId - Optional branch ID override (uses user's branch if not provided)
 */
export function WalletEarningsDashboard({ branchId: propBranchId }) {
  const { user } = useCurrentUser();
  const branchId = propBranchId || user?.branch_id;

  // Story 25.1: Settlement request modal state
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Story 25.5: Tab state for Earnings vs Settlement History
  const [activeTab, setActiveTab] = useState("earnings");

  // AC #5: Role validation - only branch_admin, admin_staff, or super_admin can access
  const allowedRoles = ["branch_admin", "admin_staff", "super_admin"];
  const hasAccess = user && allowedRoles.includes(user.role);

  if (user && !hasAccess) {
    return (
      <ErrorState message="You don't have permission to view wallet earnings. This feature is available to Branch Managers only." />
    );
  }

  // AC #3 & #5: Real-time query with branch isolation via Convex subscription
  const pendingTotal = useQuery(
    api.services.branchEarnings.getBranchPendingTotal,
    branchId ? { branch_id: branchId } : "skip"
  );

  // Fetch branch data for name (used in CSV export filename)
  const branch = useQuery(
    api.services.branches.getBranchById,
    branchId ? { id: branchId } : "skip"
  );

  // Story 25.1: Check for pending settlement
  const pendingSettlement = useQuery(
    api.services.settlements.hasPendingSettlement,
    branchId ? { branch_id: branchId } : "skip"
  );

  // Story 25.1: Get settlement params for minimum amount (no role check needed)
  const settlementParams = useQuery(api.services.walletConfig.getSettlementParams);

  // AC #4: Show skeleton while loading (data === undefined)
  if (pendingTotal === undefined && branchId) {
    return <DashboardSkeleton />;
  }

  // Handle no branch assigned
  if (!branchId) {
    return <ErrorState message="No branch assigned. Please contact your administrator." />;
  }

  // Handle empty state (no pending earnings)
  const hasEarnings = pendingTotal && pendingTotal.count > 0;

  // Calculate commission percentage for display
  // Use the actual commission from records, or default to showing if we can calculate it
  let commissionPercent = "5%"; // Default
  if (hasEarnings && pendingTotal.totalGross > 0) {
    const calculatedPercent = Math.round(
      (pendingTotal.totalCommission / pendingTotal.totalGross) * 100
    );
    commissionPercent = `${calculatedPercent}%`;
  }

  return (
    <div className="space-y-6">
      {/* Header - AC #1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[var(--color-primary)]" />
            Wallet Earnings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Track your pending wallet payment earnings in real-time
          </p>
        </div>
        {hasEarnings && activeTab === "earnings" && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Receipt className="w-4 h-4" />
            <span>{pendingTotal.count} pending transactions</span>
          </div>
        )}
      </div>

      {/* Story 25.5: Tab Navigation */}
      <div className="flex gap-2">
        <TabButton
          active={activeTab === "earnings"}
          onClick={() => setActiveTab("earnings")}
          icon={Wallet}
          label="Earnings"
        />
        <TabButton
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          icon={FileText}
          label="Settlement History"
        />
      </div>

      {/* Tab Content */}
      {activeTab === "earnings" ? (
        // Earnings Tab Content
        hasEarnings ? (
          <>
            {/* Summary Cards - AC #2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard
                title="Gross Earnings"
                value={pendingTotal.totalGross}
                subtitle={`${pendingTotal.count} transactions`}
                icon={TrendingUp}
                variant="default"
              />
              <SummaryCard
                title={`Commission (${commissionPercent})`}
                value={pendingTotal.totalCommission}
                subtitle="Super Admin fee"
                icon={TrendingDown}
                variant="warning"
              />
              <SummaryCard
                title="Net Earnings"
                value={pendingTotal.totalNet}
                subtitle="What you'll receive"
                icon={Wallet}
                variant="success"
              />
            </div>

            {/* Story 25.1: Settlement Request Section */}
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-900/50 rounded-lg">
                    <BanknoteIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">
                      Ready for Settlement
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Commission ({commissionPercent}) deducted • Net: {formatCurrency(pendingTotal.totalNet)}
                    </p>
                  </div>
                </div>

                {/* Settlement Button - AC #1, #5 */}
                {pendingSettlement?.hasPending ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]/10 border border-[var(--color-primary)] rounded-xl">
                    <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-primary)]">
                      Settlement {pendingSettlement.settlement?.status}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSettlementModalOpen(true)}
                    disabled={
                      pendingTotal.totalNet < (settlementParams?.min_settlement_amount ?? 500)
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors min-h-[44px] ${
                      pendingTotal.totalNet >= (settlementParams?.min_settlement_amount ?? 500)
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                    aria-label="Request settlement of pending earnings"
                  >
                    <BanknoteIcon className="w-4 h-4" />
                    Request Settlement
                  </button>
                )}
              </div>

              {/* Minimum amount notice */}
              {pendingTotal.totalNet < (settlementParams?.min_settlement_amount ?? 500) && (
                <p className="text-xs text-gray-500 mt-3">
                  Minimum settlement amount: {formatCurrency(settlementParams?.min_settlement_amount ?? 500)}
                </p>
              )}
            </div>

            {/* Transaction History - Story 22.3 */}
            <div className="pt-4">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-400" />
                Transaction History
              </h2>
              <EarningsTransactionList branchId={branchId} branchName={branch?.name} />
            </div>
          </>
        ) : (
          <EmptyState />
        )
      ) : (
        // Story 25.5: Settlement History Tab Content
        <SettlementHistoryList branchId={branchId} branchName={branch?.name} />
      )}

      {/* Story 25.1: Settlement Request Modal */}
      <SettlementRequestForm
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        branchId={branchId}
        userId={user?._id}
        pendingTotal={pendingTotal}
        onSuccess={() => {
          // Modal handles success display internally
          setIsSettlementModalOpen(false);
        }}
      />
    </div>
  );
}

export default WalletEarningsDashboard;
