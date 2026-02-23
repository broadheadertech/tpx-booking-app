/**
 * System Audit Log Viewer
 * Comprehensive audit log for every user action in the system.
 * SA view: Universal (all branches) + SA-level logs
 * BA view: Branch-exclusive logs only
 */

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  History,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  ShoppingCart,
  CreditCard,
  Package,
  Truck,
  Ticket,
  Settings,
  DollarSign,
  Megaphone,
  Shield,
  Activity,
  LogIn,
  X,
} from "lucide-react";

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORY_CONFIG = {
  auth: { label: "Auth", icon: LogIn, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  booking: { label: "Booking", icon: Calendar, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  transaction: { label: "Transaction", icon: CreditCard, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  payment: { label: "Payment", icon: DollarSign, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  product: { label: "Product", icon: Package, color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  inventory: { label: "Inventory", icon: Truck, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  voucher: { label: "Voucher", icon: Ticket, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  user: { label: "User", icon: User, color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  settings: { label: "Settings", icon: Settings, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  finance: { label: "Finance", icon: DollarSign, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  marketing: { label: "Marketing", icon: Megaphone, color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  system: { label: "System", icon: Shield, color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

const DEFAULT_CONFIG = { label: "Other", icon: Activity, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };

// ============================================================================
// HELPERS
// ============================================================================

function formatDateTime(ts) {
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTimeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDateTime(ts);
}

function toDateInputValue(ts) {
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}

function fromDateInputValue(val, endOfDay = false) {
  const d = new Date(val);
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.getTime();
}

// ============================================================================
// METADATA VIEWER
// ============================================================================

function MetadataViewer({ metadata, expanded }) {
  if (!expanded || !metadata) return null;

  return (
    <div className="mt-3 p-3 bg-[#0A0A0A] rounded-lg text-xs font-mono overflow-x-auto">
      <pre className="text-gray-400 whitespace-pre-wrap">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SystemAuditLog({ branchId, branchName }) {
  // State
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const pageSize = 100;

  // Build query args
  const queryArgs = useMemo(() => {
    const args = {
      limit: pageSize,
      offset: page * pageSize,
    };
    if (branchId) args.branch_id = branchId;
    if (category !== "all") args.category = category;
    if (search.trim()) args.search = search.trim();
    if (startDate) args.start_date = fromDateInputValue(startDate);
    if (endDate) args.end_date = fromDateInputValue(endDate, true);
    return args;
  }, [branchId, category, search, startDate, endDate, page]);

  // Queries
  const data = useQuery(api.services.auditLogs.getAuditLogs, queryArgs);
  const stats = useQuery(api.services.auditLogs.getAuditLogStats, branchId ? { branch_id: branchId } : {});

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const resetFilters = () => {
    setCategory("all");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  const hasActiveFilters = category !== "all" || search || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
            <History className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {branchId ? "Branch Activity Log" : "System Audit Log"}
            </h2>
            <p className="text-sm text-gray-400">
              {branchId
                ? `Activity log for ${branchName || "this branch"}`
                : "Track every action across the entire system"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <p className="text-xs text-gray-400 mb-1">Total Logs</p>
            <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <p className="text-xs text-gray-400 mb-1">Last 24 Hours</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.last24Hours}</p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <p className="text-xs text-gray-400 mb-1">Last 7 Days</p>
            <p className="text-2xl font-bold text-blue-400">{stats.last7Days}</p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <p className="text-xs text-gray-400 mb-1">Categories</p>
            <p className="text-2xl font-bold text-purple-400">
              {Object.keys(stats.byCategory || {}).length}
            </p>
          </div>
        </div>
      )}

      {/* Category Chips (from stats) */}
      {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCategory("all"); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              category === "all"
                ? "bg-white/10 text-white border-white/20"
                : "bg-[#1A1A1A] text-gray-400 border-[#2A2A2A] hover:border-[#3A3A3A]"
            }`}
          >
            All ({stats.total})
          </button>
          {Object.entries(stats.byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => {
              const cfg = CATEGORY_CONFIG[cat] || DEFAULT_CONFIG;
              return (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    category === cat
                      ? cfg.color
                      : "bg-[#1A1A1A] text-gray-400 border-[#2A2A2A] hover:border-[#3A3A3A]"
                  }`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by description, user, or action..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] text-sm"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              className="bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)]/50"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              className="bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)]/50"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-white bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Log Entries */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]/50 overflow-hidden">
        {!data ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <History className="w-12 h-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No audit logs found</h3>
            <p className="text-sm text-gray-400">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "Actions will appear here as they happen"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]/50">
            {entries.map((entry) => {
              const cfg = CATEGORY_CONFIG[entry.category] || DEFAULT_CONFIG;
              const Icon = cfg.icon;
              const isExpanded = expandedEntry === entry._id;

              return (
                <div
                  key={entry._id}
                  className="p-4 hover:bg-[#0A0A0A]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Top row: category badge + action */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {entry.action}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-1.5 text-sm text-gray-200">
                        {entry.description}
                      </p>

                      {/* User + Branch info */}
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        {entry.user_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {entry.user_name}
                            {entry.user_role && (
                              <span className="text-gray-600">({entry.user_role})</span>
                            )}
                          </span>
                        )}
                        {entry.branch_name && !branchId && (
                          <span className="text-gray-600">
                            @ {entry.branch_name}
                          </span>
                        )}
                      </div>

                      {/* Expanded metadata */}
                      <MetadataViewer metadata={entry.metadata} expanded={isExpanded} />
                    </div>

                    {/* Right side: time + expand */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-gray-500" title={formatDateTime(entry.created_at)}>
                        {formatTimeAgo(entry.created_at)}
                      </span>
                      {entry.metadata && (
                        <button
                          onClick={() => setExpandedEntry(isExpanded ? null : entry._id)}
                          className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" /> Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" /> Details
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2A2A2A]/50 bg-[#0A0A0A]">
            <p className="text-sm text-gray-400">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of{" "}
              {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm bg-[#2A2A2A] text-white rounded hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm bg-[#2A2A2A] text-white rounded hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
