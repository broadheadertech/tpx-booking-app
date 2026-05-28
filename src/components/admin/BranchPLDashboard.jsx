import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Building,
  Wallet,
  Percent,
  Receipt,
  ShoppingBag,
  Scissors,
} from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const RANGES = [
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

const MetricCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    green: "text-green-400 bg-green-500/10",
    red: "text-red-400 bg-red-500/10",
    orange: "text-[var(--color-primary)] bg-[var(--color-primary)]/10",
    blue: "text-blue-400 bg-blue-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
  };
  return (
    <div className="bg-[#1A1A1A] rounded-xl p-4 sm:p-6 border border-[#333333] hover:border-[var(--color-primary)]/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.orange}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
        {formatCurrency(value)}
      </div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
};

const BranchPLDashboard = () => {
  const [selectedRange, setSelectedRange] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const branches = useQuery(api.services.branches.getAllBranches) || [];

  // Auto-select first active branch if none chosen
  React.useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      const firstActive = branches.find((b) => b.is_active) || branches[0];
      if (firstActive) setSelectedBranchId(firstActive._id);
    }
  }, [branches, selectedBranchId]);

  const dateRange = useMemo(() => {
    const now = new Date();
    let start, end;
    switch (selectedRange) {
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "this_quarter": {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
        break;
      }
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case "custom":
        start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
        end = customEnd ? new Date(customEnd + "T23:59:59.999") : new Date();
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
    }
    return {
      start_date: start.getTime(),
      end_date: end.getTime(),
      label: `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`,
    };
  }, [selectedRange, customStart, customEnd]);

  const pl = useQuery(
    api.services.branchPL.getBranchPLSummary,
    selectedBranchId
      ? {
          branch_id: selectedBranchId,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        }
      : "skip"
  );

  const comparison = useQuery(api.services.branchPL.compareAllBranches, {
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });

  const isLoading = pl === undefined && !!selectedBranchId;
  const maxBranchRevenue =
    comparison?.length > 0 ? Math.max(...comparison.map((b) => b.revenue)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-[var(--color-primary)]" />
            Branch P&L
          </h2>
          <p className="text-gray-400 text-sm">
            {pl?.branch_name ? `${pl.branch_name} • ` : ""}
            {dateRange.label}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch picker */}
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-lg text-white text-sm min-w-[180px]"
          >
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} {b.is_active ? "" : "(inactive)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Range picker */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRange(r.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedRange === r.id
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#333333]"
            }`}
          >
            {r.label}
          </button>
        ))}
        {selectedRange === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded-lg text-white text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded-lg text-white text-sm"
            />
          </div>
        )}
      </div>

      {!selectedBranchId && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-8 text-center text-gray-400">
          Pick a branch above to see its P&L.
        </div>
      )}

      {selectedBranchId && isLoading && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-8 text-center text-gray-400">
          Loading P&L…
        </div>
      )}

      {selectedBranchId && pl && (
        <>
          {/* Primary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Revenue"
              value={pl.total_revenue}
              icon={TrendingUp}
              color="green"
              subtitle={`${pl.counts.transactions} transactions`}
            />
            <MetricCard
              title="Total Expenses"
              value={pl.total_expenses}
              icon={TrendingDown}
              color="red"
              subtitle={`${pl.counts.expense_entries} entries`}
            />
            <MetricCard
              title="Commission to HQ"
              value={pl.commission.paid_to_hq}
              icon={Percent}
              color="yellow"
              subtitle={`${pl.commission.wallet_payment_count} wallet payments`}
            />
            <MetricCard
              title="Net Income"
              value={pl.net_income}
              icon={DollarSign}
              color={pl.net_income >= 0 ? "green" : "red"}
              subtitle={`${pl.net_margin.toFixed(1)}% net margin`}
            />
          </div>

          {/* Revenue breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="font-medium text-white">Revenue Breakdown</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                  <span className="flex items-center gap-2 text-gray-300 text-sm">
                    <Scissors className="w-4 h-4 text-blue-400" />
                    Services
                  </span>
                  <span className="text-white font-semibold">
                    {formatCurrency(pl.revenue_breakdown.service_revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                  <span className="flex items-center gap-2 text-gray-300 text-sm">
                    <ShoppingBag className="w-4 h-4 text-purple-400" />
                    Products
                  </span>
                  <span className="text-white font-semibold">
                    {formatCurrency(pl.revenue_breakdown.product_revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                  <span className="flex items-center gap-2 text-gray-300 text-sm">
                    <Wallet className="w-4 h-4 text-green-400" />
                    Other (manual)
                  </span>
                  <span className="text-white font-semibold">
                    {formatCurrency(pl.revenue_breakdown.other_revenue)}
                  </span>
                </div>
                {pl.revenue_breakdown.discount_total > 0 && (
                  <div className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                    <span className="text-gray-500 text-sm">Discounts applied</span>
                    <span className="text-yellow-400 font-medium">
                      −{formatCurrency(pl.revenue_breakdown.discount_total)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Expense breakdown */}
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-red-400" />
                <h3 className="font-medium text-white">Expense Breakdown</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                  <span className="text-gray-300 text-sm">Fixed expenses</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(pl.expense_breakdown.fixed_expenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                  <span className="text-gray-300 text-sm">Operating expenses</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(pl.expense_breakdown.operating_expenses)}
                  </span>
                </div>
                {pl.expense_breakdown.by_category.slice(0, 5).map((c) => (
                  <div
                    key={c.category}
                    className="flex items-center justify-between text-xs text-gray-400 pl-3"
                  >
                    <span className="capitalize">{c.category.replace(/_/g, " ")}</span>
                    <span>{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Net summary line */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl p-5 border border-[#333333]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400">Gross Margin</p>
                <p className="text-lg font-bold text-white">
                  {pl.gross_margin.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Net Margin</p>
                <p className="text-lg font-bold text-white">
                  {pl.net_margin.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Wallet Gross</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(pl.commission.wallet_gross)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Wallet Net (branch keeps)</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(pl.commission.wallet_net)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* All-branch comparison */}
      {comparison && comparison.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="font-medium text-white">All Branches — Same Period</h3>
          </div>
          <div className="space-y-2">
            {comparison.map((b) => {
              const pct = maxBranchRevenue > 0 ? (b.revenue / maxBranchRevenue) * 100 : 0;
              return (
                <div
                  key={b.branch_id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    b.branch_id === selectedBranchId
                      ? "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/40"
                      : "bg-[#252525] hover:bg-[#2A2A2A]"
                  }`}
                  onClick={() => setSelectedBranchId(b.branch_id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white text-sm font-medium">{b.branch_name}</p>
                      <p className="text-gray-500 text-xs">
                        {b.transaction_count} txns • commission {formatCurrency(b.commission_paid)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{formatCurrency(b.revenue)}</p>
                      <p
                        className={`text-xs ${
                          b.net_income >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        net {formatCurrency(b.net_income)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-[#333333] rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchPLDashboard;
