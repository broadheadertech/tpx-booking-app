/**
 * Audit Trail Viewer
 * Story 12-7: Audit Trail Viewer for Super Admin
 *
 * Displays permission change audit logs for compliance and investigation.
 * Only accessible to super_admin role.
 */

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  History,
  User,
  Shield,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
} from "lucide-react";

/**
 * Change type labels and colors
 */
const CHANGE_TYPE_CONFIG = {
  role_changed: {
    label: "Role Changed",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  page_access_changed: {
    label: "Permissions Changed",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  branch_assigned: {
    label: "Branch Assigned",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  branch_removed: {
    label: "Branch Removed",
    color: "bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30",
  },
  user_created: {
    label: "User Created",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  user_deleted: {
    label: "User Deleted",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

/**
 * Format timestamp to readable date/time
 */
function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDateTime(timestamp);
}

/**
 * JSON Diff Viewer component
 */
function JsonDiffViewer({ previous, current, expanded }) {
  if (!expanded) return null;

  let prevObj, currObj;
  try {
    prevObj = previous ? JSON.parse(previous) : null;
    currObj = current ? JSON.parse(current) : null;
  } catch {
    return (
      <div className="mt-3 p-3 bg-[#0A0A0A] rounded-lg text-xs font-mono">
        <p className="text-gray-500">Unable to parse values</p>
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-4">
      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
        <p className="text-xs font-medium text-red-400 mb-2">Previous</p>
        <pre className="text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(prevObj, null, 2) || "null"}
        </pre>
      </div>
      <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
        <p className="text-xs font-medium text-green-400 mb-2">New</p>
        <pre className="text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(currObj, null, 2) || "null"}
        </pre>
      </div>
    </div>
  );
}

export default function AuditTrailViewer() {
  const { user } = useCurrentUser();
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Query audit trail
  const auditData = useQuery(api.services.rbac.getAuditTrail, {
    limit: pageSize,
    offset: page * pageSize,
    changeType: filterType !== "all" ? filterType : undefined,
  });

  // Query stats
  const stats = useQuery(api.services.rbac.getAuditTrailStats);

  // Check if user is super_admin
  if (user?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="w-12 h-12 text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
        <p className="text-sm text-gray-400">
          Only Super Admins can view the audit trail.
        </p>
      </div>
    );
  }

  const entries = auditData?.entries || [];
  const total = auditData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Filter entries by search term
  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.affected_user?.username?.toLowerCase().includes(search) ||
      entry.affected_user?.email?.toLowerCase().includes(search) ||
      entry.changed_by_user?.username?.toLowerCase().includes(search) ||
      entry.changed_by_user?.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
            <History className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Audit Trail</h2>
            <p className="text-sm text-gray-400">
              Track all permission and role changes
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <p className="text-xs text-gray-400 mb-1">Total Changes</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <p className="text-xs text-gray-400 mb-1">Last 24 Hours</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">
              {stats.last24Hours}
            </p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <p className="text-xs text-gray-400 mb-1">Last 7 Days</p>
            <p className="text-2xl font-bold text-blue-400">{stats.last7Days}</p>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <p className="text-xs text-gray-400 mb-1">Role Changes</p>
            <p className="text-2xl font-bold text-purple-400">
              {stats.byType?.role_changed || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Change Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(0);
              }}
              className="bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="all">All Changes</option>
              <option value="role_changed">Role Changes</option>
              <option value="page_access_changed">Permission Changes</option>
              <option value="branch_assigned">Branch Assignments</option>
              <option value="user_created">User Created</option>
              <option value="user_deleted">User Deleted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]/50 overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <History className="w-12 h-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No audit entries found
            </h3>
            <p className="text-sm text-gray-400">
              {filterType !== "all" || searchTerm
                ? "Try adjusting your filters"
                : "Permission changes will appear here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]/50">
            {filteredEntries.map((entry) => {
              const config =
                CHANGE_TYPE_CONFIG[entry.change_type] ||
                CHANGE_TYPE_CONFIG.role_changed;
              const isExpanded = expandedEntry === entry._id;

              return (
                <div
                  key={entry._id}
                  className="p-4 hover:bg-[#0A0A0A]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Change Type Badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}
                      >
                        {config.label}
                      </span>

                      {/* Description */}
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-gray-400">
                          <span className="text-white font-medium">
                            {entry.changed_by_user?.username || "Unknown"}
                          </span>{" "}
                          changed{" "}
                          <span className="text-white font-medium">
                            {entry.affected_user?.username || "Unknown"}
                          </span>
                        </span>
                      </div>

                      {/* Emails */}
                      <div className="mt-1 text-xs text-gray-500">
                        {entry.affected_user?.email} • by{" "}
                        {entry.changed_by_user?.email}
                      </div>

                      {/* Expandable Details */}
                      <JsonDiffViewer
                        previous={entry.previous_value}
                        current={entry.new_value}
                        expanded={isExpanded}
                      />
                    </div>

                    {/* Right Side: Time & Expand */}
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(entry.created_at)}
                      </span>
                      <button
                        onClick={() =>
                          setExpandedEntry(isExpanded ? null : entry._id)
                        }
                        className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            Details
                          </>
                        )}
                      </button>
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
              Showing {page * pageSize + 1}-
              {Math.min((page + 1) * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm bg-[#2A2A2A] text-white rounded hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
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
