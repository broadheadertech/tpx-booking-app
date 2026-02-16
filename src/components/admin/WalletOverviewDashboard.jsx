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
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  ChevronUp,
  Gift,
  HelpCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDownLeft,
  ArrowUpLeft,
} from "lucide-react";
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { walletAnalyticsSteps } from '../../config/walkthroughSteps'

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
 * Sort icon for sortable table columns
 */
function SortIcon({ column, sortColumn, sortDirection }) {
  if (sortColumn !== column) {
    return <ArrowUpDown className="w-3.5 h-3.5 text-gray-600" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
  ) : (
    <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
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
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])
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

  const [showCustomerWallets, setShowCustomerWallets] = useState(true);
  const [customerWalletSearch, setCustomerWalletSearch] = useState("");
  const [walletSortColumn, setWalletSortColumn] = useState("totalBalance");
  const [walletSortDirection, setWalletSortDirection] = useState("desc");

  const handleWalletSort = useCallback((column) => {
    if (walletSortColumn === column) {
      setWalletSortDirection(walletSortDirection === "asc" ? "desc" : "asc");
    } else {
      setWalletSortColumn(column);
      setWalletSortDirection("desc");
    }
  }, [walletSortColumn, walletSortDirection]);

  // AC #4: Real-time data via Convex subscriptions
  const overview = useQuery(api.services.walletAnalytics.getWalletOverview);
  const monthlyMetrics = useQuery(api.services.walletAnalytics.getMonthlyMetrics, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const quickStats = useQuery(api.services.walletAnalytics.getQuickStats);

  // Cash flow summary (uses same date range as monthly metrics)
  const cashFlow = useQuery(api.services.walletAnalytics.getCashFlowSummary, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Customer wallets for the wallet table
  const allCustomerWallets = useQuery(api.services.wallet.getAllCustomerWallets, { limit: 500 });

  const filteredCustomerWallets = useMemo(() => {
    if (!allCustomerWallets) return [];
    let wallets = [...allCustomerWallets];
    if (customerWalletSearch.trim()) {
      const q = customerWalletSearch.toLowerCase();
      wallets = wallets.filter(
        (w) => w.userName?.toLowerCase().includes(q) || w.userEmail?.toLowerCase().includes(q) || w.primaryBranchName?.toLowerCase().includes(q)
      );
    }
    wallets.sort((a, b) => {
      let aVal = a[walletSortColumn];
      let bVal = b[walletSortColumn];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return walletSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return walletSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return wallets;
  }, [allCustomerWallets, customerWalletSearch, walletSortColumn, walletSortDirection]);

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
      <div data-tour="wallet-analytics-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-500" />
              Wallet System Overview
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Monitor wallet float, branch earnings, and system health
            </p>
          </div>
          <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
            <HelpCircle className="w-4 h-4" />
          </button>
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
        <div data-tour="wallet-analytics-quick" className="flex flex-wrap gap-2">
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

      {/* AC #1: Primary metrics - Total Float, Customer, Branch, Outstanding, Available */}
      <div data-tour="wallet-analytics-metrics" className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        ) : (
          <>
            {/* Total System Float - Hero card */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-6 border border-blue-700/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total System Float</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency((overview?.totalFloat || 0) + (overview?.branchWalletBalance || 0) + (overview?.bookingFloat || 0) + (overview?.commissionEarned || 0))}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <span className="text-xs text-gray-500">Customer: {formatCurrency(overview?.totalFloat || 0)}</span>
                    <span className="text-xs text-gray-500">Branch: {formatCurrency(overview?.branchWalletBalance || 0)}</span>
                    {(overview?.bookingFloat || 0) > 0 && (
                      <span className="text-xs text-green-400/80">Booking Float: {formatCurrency(overview?.bookingFloat || 0)} ({overview?.bookingFloatCount || 0} pending)</span>
                    )}
                    {(overview?.commissionEarned || 0) > 0 && (
                      <span className="text-xs text-yellow-400/80">Commission: {formatCurrency(overview?.commissionEarned || 0)} ({overview?.commissionEarnedCount || 0} settlements)</span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <DollarSign className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Detail cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PrimaryMetricCard
                title="Customer Wallet Float"
                value={overview?.totalFloat || 0}
                subtitle={`${overview?.walletCount || 0} customer wallets`}
                icon={Wallet}
                variant="primary"
              />
              <PrimaryMetricCard
                title="Branch Wallet Capital"
                value={overview?.branchWalletBalance || 0}
                subtitle={`${overview?.branchWalletCount || 0} branch wallets • ${formatCurrency(overview?.branchWalletHeld || 0)} held`}
                icon={Building2}
                variant="default"
              />
              <PrimaryMetricCard
                title="Outstanding to Branches"
                value={overview?.outstandingToBranches || 0}
                subtitle={`${overview?.pendingEarningsCount || 0} pending earnings`}
                icon={BanknoteIcon}
                variant="warning"
              />
              <PrimaryMetricCard
                title="Available for Operations"
                value={overview?.availableForOps || 0}
                subtitle="All float minus outstanding"
                icon={TrendingUp}
                variant="success"
              />
            </div>
          </>
        )}
      </div>

      {/* AC #2: Monthly activity metrics */}
      <div data-tour="wallet-analytics-monthly" className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gray-400" />
          {currentPeriodLabel} Activity
        </h2>

        {isLoading ? (
          <MonthlyMetricsSkeleton />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MonthlyMetricCard
              title="All Wallet Top-ups"
              value={monthlyMetrics?.totalTopUps || 0}
              count={monthlyMetrics?.topUpCount}
              icon={ArrowUpRight}
              color="green"
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-500">All Top-ups Today</p>
              <p className="text-lg font-semibold text-green-400">
                {formatCurrency(quickStats.todayTopUps)}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Customer: {formatCurrency(quickStats.todayCustomerTopUps || 0)} • Branch: {formatCurrency(quickStats.todayBranchTopUps || 0)}
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
            <div>
              <p className="text-xs text-gray-500">Branch Wallets</p>
              <p className="text-lg font-semibold text-blue-400">
                {quickStats.branchWalletCount || 0}
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
                  ? `${(((overview.totalFloat + (overview.bookingFloat || 0) + (overview.commissionEarned || 0)) / overview.outstandingToBranches) * 100).toFixed(0)}%`
                  : "∞"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Statement */}
      {cashFlow && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <div className="p-5 border-b border-[#2A2A2A]">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Cash Flow
              <span className="text-sm font-normal text-gray-500">({currentPeriodLabel})</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">Actual money movement in the wallet system</p>
          </div>

          {/* Net Cash Flow Hero */}
          <div className="p-5 border-b border-[#2A2A2A]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Net Cash Flow</p>
                <p className={`text-3xl font-bold mt-1 ${cashFlow.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {cashFlow.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlow.netCashFlow)}
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Inflows</p>
                  <p className="text-lg font-semibold text-green-400">+{formatCurrency(cashFlow.inflows.total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Outflows</p>
                  <p className="text-lg font-semibold text-red-400">-{formatCurrency(cashFlow.outflows.total)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Inflows & Outflows Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#2A2A2A]">
            {/* Inflows */}
            <div className="p-5">
              <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-4">
                <ArrowUpLeft className="w-4 h-4" />
                Inflows (Money In)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-sm text-gray-300">Customer Wallet Top-ups</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(cashFlow.inflows.customerTopUps)}</p>
                    <p className="text-[10px] text-gray-600">{cashFlow.inflows.customerTopUpCount} transactions</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-sm text-gray-300">Branch Wallet Top-ups</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(cashFlow.inflows.branchTopUps)}</p>
                    <p className="text-[10px] text-gray-600">{cashFlow.inflows.branchTopUpCount} transactions</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm text-gray-300">Online Booking Payments</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(cashFlow.inflows.bookingPayments || 0)}</p>
                    <p className="text-[10px] text-gray-600">{cashFlow.inflows.bookingPaymentCount || 0} bookings</p>
                  </div>
                </div>
                {/* Inflow total bar */}
                <div className="pt-2 border-t border-[#2A2A2A]">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Total Inflows</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(cashFlow.inflows.total)}</span>
                  </div>
                  {cashFlow.inflows.total > 0 && (
                    <div className="flex gap-1 mt-2 h-2 rounded-full overflow-hidden bg-[#0A0A0A]">
                      <div
                        className="bg-blue-500 rounded-l-full"
                        style={{ width: `${(cashFlow.inflows.customerTopUps / cashFlow.inflows.total) * 100}%` }}
                      />
                      <div
                        className="bg-purple-500"
                        style={{ width: `${(cashFlow.inflows.branchTopUps / cashFlow.inflows.total) * 100}%` }}
                      />
                      <div
                        className="bg-green-500 rounded-r-full"
                        style={{ width: `${((cashFlow.inflows.bookingPayments || 0) / cashFlow.inflows.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Outflows */}
            <div className="p-5">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-4">
                <ArrowDownLeft className="w-4 h-4" />
                Outflows (Money Out)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-sm text-gray-300">Settlements to Branches</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(cashFlow.outflows.settlementsPaid)}</p>
                    <p className="text-[10px] text-gray-600">{cashFlow.outflows.settlementsCount} settlements</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm text-gray-300">Refunds</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(cashFlow.outflows.refunds)}</p>
                    <p className="text-[10px] text-gray-600">{cashFlow.outflows.refundCount} refunds</p>
                  </div>
                </div>
                {cashFlow.outflows.branchCredits > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-sm text-gray-300">Branch Credits/Adjustments</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatCurrency(cashFlow.outflows.branchCredits)}</p>
                      <p className="text-[10px] text-gray-600">{cashFlow.outflows.branchCreditCount} credits</p>
                    </div>
                  </div>
                )}
                {/* Outflow total bar */}
                <div className="pt-2 border-t border-[#2A2A2A]">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Total Outflows</span>
                    <span className="text-red-400 font-semibold">{formatCurrency(cashFlow.outflows.total)}</span>
                  </div>
                  {cashFlow.outflows.total > 0 && (
                    <div className="flex gap-1 mt-2 h-2 rounded-full overflow-hidden bg-[#0A0A0A]">
                      <div
                        className="bg-orange-500 rounded-l-full"
                        style={{ width: `${(cashFlow.outflows.settlementsPaid / cashFlow.outflows.total) * 100}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${(cashFlow.outflows.refunds / cashFlow.outflows.total) * 100}%` }}
                      />
                      {cashFlow.outflows.branchCredits > 0 && (
                        <div
                          className="bg-yellow-500 rounded-r-full"
                          style={{ width: `${(cashFlow.outflows.branchCredits / cashFlow.outflows.total) * 100}%` }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Wallets Table */}
      {allCustomerWallets && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-blue-700/30 overflow-hidden">
          <button
            onClick={() => setShowCustomerWallets(!showCustomerWallets)}
            className="w-full flex items-center justify-between p-5 hover:bg-[#252525] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-900/50">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">
                  Customer Wallets
                  <span className="text-blue-400 ml-2">({allCustomerWallets.length})</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Total Float: {formatCurrency((overview?.totalFloat || 0))}
                </p>
              </div>
            </div>
            {showCustomerWallets ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showCustomerWallets && (
            <div className="border-t border-[#2A2A2A]">
              <div className="p-3 border-b border-[#2A2A2A]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or branch..."
                    value={customerWalletSearch}
                    onChange={(e) => setCustomerWalletSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-[#0A0A0A] sticky top-0">
                    <tr>
                      <th onClick={() => handleWalletSort("userName")} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white select-none">
                        <span className="flex items-center gap-1">Customer <SortIcon column="userName" sortColumn={walletSortColumn} sortDirection={walletSortDirection} /></span>
                      </th>
                      <th onClick={() => handleWalletSort("primaryBranchName")} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white select-none">
                        <span className="flex items-center gap-1">Branch <SortIcon column="primaryBranchName" sortColumn={walletSortColumn} sortDirection={walletSortDirection} /></span>
                      </th>
                      <th onClick={() => handleWalletSort("balance")} className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white select-none">
                        <span className="flex items-center gap-1 justify-end">Balance <SortIcon column="balance" sortColumn={walletSortColumn} sortDirection={walletSortDirection} /></span>
                      </th>
                      <th onClick={() => handleWalletSort("bonusBalance")} className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white select-none">
                        <span className="flex items-center gap-1 justify-end">Bonus <SortIcon column="bonusBalance" sortColumn={walletSortColumn} sortDirection={walletSortDirection} /></span>
                      </th>
                      <th onClick={() => handleWalletSort("totalBalance")} className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white select-none">
                        <span className="flex items-center gap-1 justify-end">Total <SortIcon column="totalBalance" sortColumn={walletSortColumn} sortDirection={walletSortDirection} /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {filteredCustomerWallets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500 text-sm">
                          {customerWalletSearch ? 'No customers match your search' : 'No customer wallets found'}
                        </td>
                      </tr>
                    ) : (
                      filteredCustomerWallets.map((w) => (
                        <tr key={w.walletId} className="hover:bg-[#252525]/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="text-blue-400 font-semibold text-sm">
                                  {w.userName?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{w.userName || 'Unknown'}</p>
                                <p className="text-gray-500 text-xs">{w.userEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-gray-500" />
                              <span className="text-gray-300 text-sm">{w.primaryBranchName || '—'}</span>
                              {w.branchCount > 1 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">+{w.branchCount - 1}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-medium ${w.balance > 0 ? 'text-white' : 'text-gray-500'}`}>
                              {formatCurrency(w.balance / 100)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm ${w.bonusBalance > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
                              {formatCurrency(w.bonusBalance / 100)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-bold ${w.totalBalance > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                              {formatCurrency(w.totalBalance / 100)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Story 26.2: Branch Wallet Performance Table */}
      <BranchBreakdownTable />

      {showTutorial && (
        <WalkthroughOverlay steps={walletAnalyticsSteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
      )}
    </div>
  );
}

export default WalletOverviewDashboard;
