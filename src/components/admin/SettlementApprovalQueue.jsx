import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Wallet,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  FileText,
  RefreshCw
} from 'lucide-react';
import SettlementDetailModal from './SettlementDetailModal';

/**
 * SettlementApprovalQueue Component (Story 25.2)
 * Super Admin view of all settlement requests across branches
 * AC #1: List pending settlements with branch name, amount, transactions, date, Review button
 * AC #2: Tabs for different statuses
 * AC #4: Real-time updates via Convex useQuery
 */

const SETTLEMENT_TABS = [
  { key: 'pending', label: 'Pending', color: 'orange', icon: Clock },
  { key: 'approved', label: 'Approved', color: 'blue', icon: CheckCircle },
  { key: 'processing', label: 'Processing', color: 'purple', icon: Loader2 },
  { key: 'completed', label: 'Completed', color: 'green', icon: CheckCircle },
  { key: 'rejected', label: 'Rejected', color: 'red', icon: XCircle },
];

const getStatusBadgeClasses = (status) => {
  const classes = {
    pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    processing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return classes[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-3.5 h-3.5" />;
    case 'approved':
      return <CheckCircle className="w-3.5 h-3.5" />;
    case 'processing':
      return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    case 'completed':
      return <CheckCircle className="w-3.5 h-3.5" />;
    case 'rejected':
      return <XCircle className="w-3.5 h-3.5" />;
    default:
      return <AlertCircle className="w-3.5 h-3.5" />;
  }
};

export default function SettlementApprovalQueue() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedSettlementId, setSelectedSettlementId] = useState(null);

  // Query settlements by status (real-time via Convex)
  const settlements = useQuery(api.services.settlements.getAllSettlements, {
    status: activeTab,
    limit: 100,
  });

  // Query settlement summary for badge counts
  const summary = useQuery(api.services.settlements.getSettlementSummary);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTabCount = (tabKey) => {
    if (!summary) return 0;
    return summary[tabKey] || 0;
  };

  const isLoading = settlements === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Wallet className="w-6 h-6 text-green-400" />
            </div>
            Settlement Queue
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Review and process branch settlement requests
          </p>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2">
              <span className="text-gray-400">Pending:</span>
              <span className="ml-2 text-orange-400 font-semibold">
                ₱{summary.totalPendingAmount?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl border border-[#333333] p-1">
        <div className="flex flex-wrap gap-1">
          {SETTLEMENT_TABS.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                  isActive
                    ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30`
                    : 'text-gray-400 hover:text-white hover:bg-[#333333]'
                }`}
                style={isActive ? {
                  backgroundColor: `var(--${tab.color}-bg, rgba(251, 146, 60, 0.2))`,
                  color: `var(--${tab.color}-text, #fb923c)`,
                } : {}}
              >
                <TabIcon className={`w-4 h-4 ${tab.key === 'processing' && isActive ? 'animate-spin' : ''}`} />
                <span className="capitalize">{tab.label}</span>
                {count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white/20' : 'bg-[#333333]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settlement List */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl border border-[#333333] overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {isLoading ? (
                // Skeleton loading rows
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4">
                      <div className="h-5 bg-[#333333] rounded animate-pulse w-32" />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="h-5 bg-[#333333] rounded animate-pulse w-20 ml-auto" />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="h-5 bg-[#333333] rounded animate-pulse w-10 mx-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-5 bg-[#333333] rounded animate-pulse w-24" />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="h-6 bg-[#333333] rounded-full animate-pulse w-20 mx-auto" />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="h-8 bg-[#333333] rounded animate-pulse w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : settlements?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-[#333333] rounded-full">
                        <FileText className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-gray-400 font-medium">No {activeTab} settlements</p>
                      <p className="text-gray-500 text-sm">
                        {activeTab === 'pending'
                          ? 'New settlement requests will appear here'
                          : `No settlements with status "${activeTab}"`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                settlements?.map((settlement) => (
                  <tr
                    key={settlement._id}
                    className="hover:bg-[#252525] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#333333] rounded-lg">
                          <Building className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{settlement.branch_name}</p>
                          <p className="text-gray-500 text-xs">by {settlement.requester_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-green-400 font-bold text-lg">
                        ₱{settlement.amount?.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-[#333333] rounded-lg text-white font-medium">
                        {settlement.earnings_count}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white text-sm">{formatDate(settlement.created_at)}</p>
                      <p className="text-gray-500 text-xs">{formatTime(settlement.created_at)}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(settlement.status)}`}>
                        {getStatusIcon(settlement.status)}
                        <span className="capitalize">{settlement.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => setSelectedSettlementId(settlement._id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
                      >
                        Review
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden divide-y divide-[#333333]">
          {isLoading ? (
            // Skeleton loading cards
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-[#333333] rounded animate-pulse w-32" />
                  <div className="h-5 bg-[#333333] rounded animate-pulse w-24" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-[#333333] rounded animate-pulse w-20" />
                  <div className="h-4 bg-[#333333] rounded animate-pulse w-16" />
                </div>
                <div className="h-10 bg-[#333333] rounded animate-pulse w-full" />
              </div>
            ))
          ) : settlements?.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-[#333333] rounded-full">
                  <FileText className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400 font-medium">No {activeTab} settlements</p>
                <p className="text-gray-500 text-sm">
                  {activeTab === 'pending'
                    ? 'New settlement requests will appear here'
                    : `No settlements with status "${activeTab}"`}
                </p>
              </div>
            </div>
          ) : (
            settlements?.map((settlement) => (
              <div
                key={settlement._id}
                className="p-4 hover:bg-[#252525] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#333333] rounded-lg">
                      <Building className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{settlement.branch_name}</p>
                      <p className="text-gray-500 text-xs">by {settlement.requester_name}</p>
                    </div>
                  </div>
                  <p className="text-green-400 font-bold text-lg">
                    ₱{settlement.amount?.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400">
                      {settlement.earnings_count} transactions
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-500">
                      {formatDate(settlement.created_at)}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(settlement.status)}`}>
                    {getStatusIcon(settlement.status)}
                    <span className="capitalize">{settlement.status}</span>
                  </span>
                </div>

                <button
                  onClick={() => setSelectedSettlementId(settlement._id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white font-medium rounded-lg transition-colors min-h-[44px]"
                >
                  Review Settlement
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Settlement Detail Modal */}
      {selectedSettlementId && (
        <SettlementDetailModal
          settlementId={selectedSettlementId}
          onClose={() => setSelectedSettlementId(null)}
        />
      )}
    </div>
  );
}
