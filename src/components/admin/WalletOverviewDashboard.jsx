/**
 * Wallet Overview Dashboard - Story 26.1
 *
 * Super Admin dashboard for monitoring wallet system health.
 * Displays Total Float, Outstanding to Branches, Available for Operations.
 * Shows monthly metrics with date range filtering.
 *
 * ACs: #1 (key metrics), #2 (monthly metrics), #3 (date filter),
 *      #4 (real-time), #5 (skeleton loaders)
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AlertCircle } from "lucide-react";
import BranchBreakdownTable from "./BranchBreakdownTable";
import {
  Wallet,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Receipt,
  DollarSign,
  BanknoteIcon,
  Users,
  Activity,
  ChevronDown,
  Gift,
} from "lucide-react";

/**
 * Format currency as Philippine Peso
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "₱0.00";
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Period options for date filtering
 */
const PERIOD_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_year", label: "This Year" },
];

/**
 * Calculate date range from period option
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case "this_month": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
      break;
    }
    case "last_month": {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "last_7_days": {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    }
    case "last_30_days": {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    }
    case "this_year": {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
      break;
    }
    default: {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
    }
  }

  return {
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  };
};

/**
 * Skeleton loader for metric card (AC #5)
 */
function MetricCardSkeleton() {
  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-700 rounded mb-3" />
          <div className="h-8 w-32 bg-gray-700 rounded mb-2" />
          <div className="h-3 w-20 bg-gray-700 rounded" />
        </div>
        <div className="h-12 w-12 bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for monthly metrics section
 */
function MonthlyMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]"
        >
          <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
          <div className="h-7 w-24 bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Primary metric card (Float, Outstanding, Available)
 */
function PrimaryMetricCard({ title, value, subtitle, icon: Icon, variant = "default", trend }) {
  const variantStyles = {
    default: {
      border: "border-gray-700",
      iconBg: "bg-gray-800",
      iconColor: "text-gray-400",
      valueColor: "text-white",
    },
    primary: {
      border: "border-blue-700",
      iconBg: "bg-blue-900/50",
      iconColor: "text-blue-400",
      valueColor: "text-blue-400",
    },
    warning: {
      border: "border-[var(--color-primary)]",
      iconBg: "bg-[var(--color-primary)]/15",
      iconColor: "text-[var(--color-primary)]",
      valueColor: "text-[var(--color-primary)]",
    },
    success: {
      border: "border-green-700",
      iconBg: "bg-green-900/50",
      iconColor: "text-green-400",
      valueColor: "text-green-400",
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={`bg-[#1A1A1A] rounded-2xl p-6 border ${styles.border} hover:border-opacity-80 transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 font-medium mb-1">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${styles.valueColor}`}>
            {formatCurrency(value)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            {trend !== undefined && trend !== 0 && (
              <span
                className={`flex items-center text-xs ${
                  trend > 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {trend > 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${styles.iconBg}`}>
          <Icon className={`w-6 h-6 ${styles.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

/**
 * Monthly metric card (smaller, simpler)
 */
function MonthlyMetricCard({ title, value, count, icon: Icon, color }) {
  const colorClasses = {
    yellow: "text-yellow-400",
    green: "text-green-400",
    blue: "text-blue-400",
    red: "text-red-400",
    default: "text-white",
  };
  const valueColor = colorClasses[color] || colorClasses.default;

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color ? colorClasses[color] : 'text-gray-500'}`} />
        <p className="text-xs text-gray-400 font-medium">{title}</p>
      </div>
      <p className={`text-xl font-bold ${valueColor}`}>{formatCurrency(value)}</p>
      {count !== undefined && (
        <p className="text-xs text-gray-500 mt-1">{count} transactions</p>
      )}
    </div>
  );
}

/**
 * Quick stat badge
 */
function QuickStatBadge({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#252525] rounded-lg">
      <Icon className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-400">{label}:</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Unable to Load Analytics
      </h3>
      <p className="text-gray-400 text-sm max-w-sm mx-auto">
        {message || "There was an error loading the wallet analytics data. Please try refreshing the page."}
      </p>
    </div>
  );
}

/**
 * Main WalletOverviewDashboard Component
 */
export function WalletOverviewDashboard() {
  // AC #3: Period selection state
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Click-outside handler for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Calculate date range based on selected period
  const dateRange = useMemo(
    () => getDateRange(selectedPeriod),
    [selectedPeriod]
  );

  // AC #4: Real-time data via Convex subscriptions
  const overview = useQuery(api.services.walletAnalytics.getWalletOverview);
  const monthlyMetrics = useQuery(api.services.walletAnalytics.getMonthlyMetrics, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const quickStats = useQuery(api.services.walletAnalytics.getQuickStats);

  // AC #5: Loading state
  const isLoading =
    overview === undefined ||
    monthlyMetrics === undefined ||
    quickStats === undefined;

  // Error state: if queries return null (error case), show error
  const hasError = overview === null || monthlyMetrics === null || quickStats === null;

  // Get current period label
  const currentPeriodLabel =
    PERIOD_OPTIONS.find((p) => p.value === selectedPeriod)?.label || "This Month";

  // Show error state if queries failed
  if (hasError) {
    return <ErrorState />;
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-500" />
            Wallet System Overview
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Monitor wallet float, branch earnings, and system health
          </p>
        </div>

        {/* AC #3: Period selector dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white hover:bg-[#252525] transition-colors min-h-[44px]"
            aria-label="Select time period for analytics"
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
          >
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{currentPeriodLabel}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-xl z-10 overflow-hidden">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedPeriod(option.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    selectedPeriod === option.value
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-gray-300 hover:bg-[#252525]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick stats badges */}
      {quickStats && (
        <div className="flex flex-wrap gap-2">
          <QuickStatBadge
            label="Active Wallets"
            value={quickStats.activeWallets}
            icon={Users}
          />
          <QuickStatBadge
            label="Branches w/ Pending"
            value={quickStats.branchesWithPending}
            icon={Building2}
          />
          <QuickStatBadge
            label="Pending Settlements"
            value={quickStats.pendingSettlements}
            icon={BanknoteIcon}
          />
          <QuickStatBadge
            label="Today's Activity"
            value={quickStats.todayTransactionCount}
            icon={Activity}
          />
        </div>
      )}

      {/* AC #1: Primary metrics - Float, Outstanding, Available */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <PrimaryMetricCard
              title="Total Float"
              value={overview?.totalFloat || 0}
              subtitle={`${overview?.walletCount || 0} customer wallets`}
              icon={Wallet}
              variant="primary"
            />
            <PrimaryMetricCard
              title="Outstanding to Branches"
              value={overview?.outstandingToBranches || 0}
              subtitle={`${overview?.pendingEarningsCount || 0} pending earnings`}
              icon={Building2}
              variant="warning"
            />
            <PrimaryMetricCard
              title="Available for Operations"
              value={overview?.availableForOps || 0}
              subtitle="Float minus outstanding"
              icon={TrendingUp}
              variant="success"
            />
          </>
        )}
      </div>

      {/* AC #2: Monthly activity metrics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gray-400" />
          {currentPeriodLabel} Activity
        </h2>

        {isLoading ? (
          <MonthlyMetricsSkeleton />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MonthlyMetricCard
              title="Top-ups"
              value={monthlyMetrics?.totalTopUps || 0}
              count={monthlyMetrics?.topUpCount}
              icon={ArrowUpRight}
            />
            <MonthlyMetricCard
              title="Bonuses Given"
              value={monthlyMetrics?.totalBonusGiven || 0}
              count={monthlyMetrics?.bonusTransactionCount}
              icon={Gift}
              color="yellow"
            />
            <MonthlyMetricCard
              title="Wallet Payments"
              value={monthlyMetrics?.totalPayments || 0}
              count={monthlyMetrics?.paymentCount}
              icon={ArrowDownRight}
            />
            <MonthlyMetricCard
              title="Commission Earned"
              value={monthlyMetrics?.commissionEarned || 0}
              icon={DollarSign}
            />
            <MonthlyMetricCard
              title="Settlements Paid"
              value={monthlyMetrics?.settlementsPaid || 0}
              count={monthlyMetrics?.settlementsCount}
              icon={BanknoteIcon}
            />
          </div>
        )}
      </div>

      {/* Today's activity summary */}
      {quickStats && (
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Today's Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Top-ups Today</p>
              <p className="text-lg font-semibold text-green-400">
                {formatCurrency(quickStats.todayTopUps)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payments Today</p>
              <p className="text-lg font-semibold text-blue-400">
                {formatCurrency(quickStats.todayPayments)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Net Flow</p>
              <p
                className={`text-lg font-semibold ${
                  quickStats.todayTopUps - quickStats.todayPayments >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {formatCurrency(quickStats.todayTopUps - quickStats.todayPayments)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Transactions</p>
              <p className="text-lg font-semibold text-white">
                {quickStats.todayTransactionCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Financial health indicator */}
      {overview && (
        <div className="bg-gradient-to-r from-blue-900/20 to-green-900/20 rounded-xl p-4 border border-blue-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">System Health</p>
              <p className="text-lg font-semibold text-white">
                {overview.availableForOps >= 0 ? "Healthy" : "Attention Needed"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Coverage Ratio</p>
              <p className="text-lg font-semibold text-green-400">
                {overview.outstandingToBranches > 0
                  ? `${((overview.totalFloat / overview.outstandingToBranches) * 100).toFixed(0)}%`
                  : "∞"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Story 26.2: Branch Wallet Performance Table */}
      <BranchBreakdownTable />
    </div>
  );
}

export default WalletOverviewDashboard;
