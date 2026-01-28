import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../context/AuthContext';
import {
  Building,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Receipt,
  TrendingUp,
  Filter,
  Download,
  Eye,
  X,
} from 'lucide-react';

export default function BranchRoyaltyHistory() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Get royalty payments for user's branch
  const royaltyPayments = useQuery(
    api.services.royalty.getRoyaltyPaymentsByBranch,
    user?.branch_id ? { branch_id: user.branch_id } : 'skip'
  ) || [];

  // Get royalty config for user's branch
  const royaltyConfig = useQuery(
    api.services.royalty.getRoyaltyConfig,
    user?.branch_id ? { branch_id: user.branch_id } : 'skip'
  );

  // Get branch details
  const branch = useQuery(
    api.services.branches.getBranchById,
    user?.branch_id ? { id: user.branch_id } : 'skip'
  );

  // Filter payments by status
  const filteredPayments = statusFilter === 'all'
    ? royaltyPayments
    : royaltyPayments.filter(p => p.status === statusFilter);

  // Calculate stats
  const stats = {
    totalPayments: royaltyPayments.length,
    duePayments: royaltyPayments.filter(p => p.status === 'due').length,
    overduePayments: royaltyPayments.filter(p => p.status === 'overdue').length,
    paidPayments: royaltyPayments.filter(p => p.status === 'paid').length,
    currentDue: royaltyPayments
      .filter(p => p.status === 'due' || p.status === 'overdue')
      .reduce((sum, p) => sum + p.total_due, 0),
    totalPaid: royaltyPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.paid_amount || p.amount), 0),
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3" /> Paid
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3" /> Due
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </span>
        );
      case 'waived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            <XCircle className="w-3 h-3" /> Waived
          </span>
        );
      default:
        return null;
    }
  };

  // Check if user has access
  if (!user?.branch_id) {
    return (
      <div className="text-center py-12">
        <Building className="w-12 h-12 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400">You are not assigned to a branch.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Royalty Payments</h2>
          <p className="text-gray-400 mt-1">
            View your franchise royalty obligations and payment history
          </p>
        </div>
        {branch && (
          <div className="text-right">
            <p className="text-sm text-gray-400">Branch</p>
            <p className="text-white font-medium">{branch.name}</p>
          </div>
        )}
      </div>

      {/* Current Configuration Card */}
      {royaltyConfig && (
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-6 border border-orange-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Current Royalty Terms</h3>
              <p className="text-sm text-gray-400">Your franchise agreement terms</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Type</p>
              <p className="text-white font-medium capitalize">{royaltyConfig.royalty_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Rate</p>
              <p className="text-white font-medium">
                {royaltyConfig.royalty_type === 'percentage'
                  ? `${royaltyConfig.rate}%`
                  : formatCurrency(royaltyConfig.rate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Billing Cycle</p>
              <p className="text-white font-medium capitalize">{royaltyConfig.billing_cycle}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Grace Period</p>
              <p className="text-white font-medium">{royaltyConfig.grace_period_days || 7} days</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Current Due</p>
              <p className="text-xl font-bold text-orange-400">{formatCurrency(stats.currentDue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total Paid</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(stats.totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Pending</p>
              <p className="text-xl font-bold text-yellow-400">{stats.duePayments}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Overdue</p>
              <p className="text-xl font-bold text-red-400">{stats.overduePayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Due Alert */}
      {stats.currentDue > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-orange-300 font-medium">
                You have {formatCurrency(stats.currentDue)} in pending royalty payments.
              </p>
              <p className="text-orange-400/70 text-sm mt-1">
                Please coordinate with the Super Admin for payment instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl border border-[#333]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm">Filter:</span>
        </div>
        <div className="flex gap-1">
          {['all', 'due', 'overdue', 'paid', 'waived'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#333] text-gray-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl border border-[#333] overflow-hidden">
        <div className="p-4 border-b border-[#333]">
          <h3 className="text-lg font-semibold text-white">Payment History</h3>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No royalty payments found</p>
            {statusFilter !== 'all' && (
              <p className="text-sm mt-1">Try a different filter</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#333]">
            {filteredPayments.map((payment) => (
              <div
                key={payment._id}
                className={`p-4 hover:bg-[#333]/30 transition-colors ${
                  payment.status === 'overdue' ? 'bg-red-500/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-white">
                        {payment.period_label}
                      </span>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Due: {formatDate(payment.due_date)}</span>
                      {payment.paid_at && (
                        <>
                          <span>•</span>
                          <span className="text-green-400">
                            Paid: {formatDate(payment.paid_at)}
                          </span>
                        </>
                      )}
                      {payment.late_fee > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-400">
                            +{formatCurrency(payment.late_fee)} late fee
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-lg font-bold ${
                      payment.status === 'paid' ? 'text-green-400' : 'text-white'
                    }`}>
                      {formatCurrency(payment.status === 'paid' ? (payment.paid_amount || payment.amount) : payment.total_due)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {payment.royalty_type === 'percentage'
                        ? `${payment.rate}% of ${formatCurrency(payment.gross_revenue)}`
                        : 'Fixed amount'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {payment.status === 'paid' && payment.receipt_id && (
                      <button
                        onClick={() => setSelectedReceipt(payment)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors border border-green-500/30"
                        title="View Receipt"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline text-sm">Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          payment={selectedReceipt}
          branchName={branch?.name}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}

// Receipt Modal Component
function ReceiptModal({ payment, branchName, onClose }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get receipt details
  const receipt = useQuery(
    api.services.royalty.getOfficialReceipt,
    payment.receipt_id ? { receipt_id: payment.receipt_id } : 'skip'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333] w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333] sticky top-0 bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Receipt className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Official Receipt</h3>
              <p className="text-sm text-gray-400">
                {receipt?.receipt_number || 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#333] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6">
          {/* Paid Badge */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full font-bold">
              <CheckCircle className="w-5 h-5" />
              PAID
            </span>
          </div>

          {/* Amount Box */}
          <div className="bg-green-500/10 border-2 border-green-500/50 rounded-xl p-6 text-center mb-6">
            <p className="text-green-400 text-sm mb-2">Amount Received</p>
            <p className="text-4xl font-bold text-green-400">
              {formatCurrency(payment.paid_amount || payment.amount)}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-[#333]">
              <span className="text-gray-400">Branch</span>
              <span className="text-white font-medium">{branchName}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-[#333]">
              <span className="text-gray-400">Period</span>
              <span className="text-white font-medium">{payment.period_label}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-[#333]">
              <span className="text-gray-400">Branch Revenue</span>
              <span className="text-white font-medium">{formatCurrency(payment.gross_revenue)}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-[#333]">
              <span className="text-gray-400">Royalty Rate</span>
              <span className="text-white font-medium">
                {payment.royalty_type === 'percentage'
                  ? `${payment.rate}%`
                  : 'Fixed'}
              </span>
            </div>
            {receipt?.payment_method && (
              <div className="flex justify-between py-3 border-b border-[#333]">
                <span className="text-gray-400">Payment Method</span>
                <span className="text-white font-medium capitalize">
                  {receipt.payment_method.replace('_', ' ')}
                </span>
              </div>
            )}
            {receipt?.payment_reference && (
              <div className="flex justify-between py-3 border-b border-[#333]">
                <span className="text-gray-400">Reference</span>
                <span className="text-white font-medium">{receipt.payment_reference}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-b border-[#333]">
              <span className="text-gray-400">Payment Date</span>
              <span className="text-white font-medium">{formatDate(payment.paid_at)}</span>
            </div>
          </div>

          {/* Thank You */}
          <div className="text-center mt-6 pt-4 border-t border-[#333]">
            <p className="text-orange-400 font-medium">Thank you for your payment!</p>
            <p className="text-gray-500 text-sm mt-2">
              Keep this receipt for your records.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#333]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
