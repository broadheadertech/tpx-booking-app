import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  X,
  Building,
  Wallet,
  User,
  CreditCard,
  Landmark,
  Smartphone,
  FileText,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Receipt,
  AlertTriangle,
  PlayCircle,
  Send
} from 'lucide-react';

/**
 * Complete Settlement Dialog Component
 * Extracted to prevent re-creation on parent re-render (fixes focus loss)
 */
function CompleteSettlementDialog({
  settlement,
  transferReference,
  setTransferReference,
  isSubmitting,
  error,
  onClose,
  onComplete,
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl max-w-md w-full border border-[#333333] shadow-2xl">
        <div className="p-5 border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Send className="w-5 h-5 text-green-400" />
            </div>
            <h4 className="text-lg font-bold text-white">Complete Settlement</h4>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-gray-300">
            Confirm completion of the{' '}
            <span className="text-green-400 font-bold">₱{settlement?.amount?.toLocaleString()}</span>{' '}
            transfer to <span className="text-white font-medium">{settlement?.branch_name}</span>.
          </p>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Transfer Reference Number <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={transferReference}
              onChange={(e) => setTransferReference(e.target.value)}
              placeholder="e.g., TRF-2026-0001 or bank ref number"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
              disabled={isSubmitting}
              required
              autoFocus
            />
            <p className="text-gray-500 text-xs mt-1">
              Enter the bank transfer reference or receipt number for tracking.
            </p>
          </div>

          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm">
              This will mark {settlement?.earnings?.length || 0} earnings as settled and notify the branch.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#333333] flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            disabled={isSubmitting || !transferReference.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isSubmitting ? 'Completing...' : 'Complete Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * SettlementDetailModal Component (Story 25.2 + 25.3 + 25.4)
 * Modal showing full settlement details with linked transactions
 * Story 25.2 AC #3: Branch details, payout info, transaction list, breakdown
 * Story 25.3: Approve/Reject functionality with confirmation dialogs
 * Story 25.4: Mark as Processing and Complete Settlement functionality
 */

const getPayoutMethodIcon = (method) => {
  switch (method) {
    case 'bank':
      return <Landmark className="w-5 h-5" />;
    case 'gcash':
    case 'maya':
      return <Smartphone className="w-5 h-5" />;
    default:
      return <CreditCard className="w-5 h-5" />;
  }
};

const getPayoutMethodLabel = (method) => {
  const labels = {
    bank: 'Bank Transfer',
    gcash: 'GCash',
    maya: 'Maya',
  };
  return labels[method] || method;
};

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
      return <Clock className="w-4 h-4" />;
    case 'approved':
      return <CheckCircle className="w-4 h-4" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'rejected':
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export default function SettlementDetailModal({ settlementId, onClose }) {
  const { user } = useCurrentUser();

  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Query settlement with linked earnings
  const settlement = useQuery(api.services.settlements.getSettlementWithEarnings, {
    settlement_id: settlementId,
  });

  // Mutations
  const approveSettlement = useMutation(api.services.settlements.approveSettlement);
  const rejectSettlement = useMutation(api.services.settlements.rejectSettlement);
  const markAsProcessing = useMutation(api.services.settlements.markAsProcessing);
  const completeSettlement = useMutation(api.services.settlements.completeSettlement);

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async () => {
    if (!user?._id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await approveSettlement({
        settlement_id: settlementId,
        approved_by: user._id,
        notes: approvalNotes.trim() || undefined,
      });

      setSuccessMessage('Settlement approved successfully!');
      setShowApproveDialog(false);

      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to approve settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!user?._id) return;

    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await rejectSettlement({
        settlement_id: settlementId,
        rejected_by: user._id,
        rejection_reason: rejectionReason.trim(),
      });

      setSuccessMessage('Settlement rejected. Earnings have been released.');
      setShowRejectDialog(false);

      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to reject settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsProcessing = async () => {
    if (!user?._id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await markAsProcessing({
        settlement_id: settlementId,
        processed_by: user._id,
      });

      setSuccessMessage('Settlement marked as processing!');
      setShowProcessingDialog(false);

      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to mark as processing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!user?._id) return;

    if (!transferReference.trim()) {
      setError('Transfer reference is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await completeSettlement({
        settlement_id: settlementId,
        completed_by: user._id,
        transfer_reference: transferReference.trim(),
      });

      setSuccessMessage('Settlement completed successfully!');
      setShowCompleteDialog(false);

      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to complete settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = settlement === undefined;

  // Approval Confirmation Dialog
  const ApproveDialog = () => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl max-w-md w-full border border-[#333333] shadow-2xl">
        <div className="p-5 border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h4 className="text-lg font-bold text-white">Approve Settlement</h4>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-gray-300">
            Are you sure you want to approve this settlement of{' '}
            <span className="text-green-400 font-bold">₱{settlement?.amount?.toLocaleString()}</span>{' '}
            for <span className="text-white font-medium">{settlement?.branch_name}</span>?
          </p>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add any notes for this approval..."
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#333333] flex gap-3">
          <button
            onClick={() => {
              setShowApproveDialog(false);
              setApprovalNotes('');
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {isSubmitting ? 'Approving...' : 'Confirm Approval'}
          </button>
        </div>
      </div>
    </div>
  );

  // Rejection Dialog
  const RejectDialog = () => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl max-w-md w-full border border-[#333333] shadow-2xl">
        <div className="p-5 border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <h4 className="text-lg font-bold text-white">Reject Settlement</h4>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-gray-300">
            Are you sure you want to reject this settlement request from{' '}
            <span className="text-white font-medium">{settlement?.branch_name}</span>?
          </p>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              The {settlement?.earnings?.length || 0} linked earnings will be released and can be included in a future settlement request.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#333333] flex gap-3">
          <button
            onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason('');
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting || !rejectionReason.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );

  // Mark as Processing Dialog (Story 25.4)
  const ProcessingDialog = () => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl max-w-md w-full border border-[#333333] shadow-2xl">
        <div className="p-5 border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <PlayCircle className="w-5 h-5 text-purple-400" />
            </div>
            <h4 className="text-lg font-bold text-white">Mark as Processing</h4>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-gray-300">
            Are you ready to initiate the bank transfer for{' '}
            <span className="text-green-400 font-bold">₱{settlement?.amount?.toLocaleString()}</span>{' '}
            to <span className="text-white font-medium">{settlement?.branch_name}</span>?
          </p>

          <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#333333]">
            <p className="text-gray-400 text-sm mb-2">Transfer To:</p>
            <p className="text-white font-medium">{settlement?.payout_details?.account_name}</p>
            <p className="text-gray-400 text-sm font-mono">{settlement?.payout_details?.account_number}</p>
            {settlement?.payout_details?.bank_name && (
              <p className="text-gray-400 text-sm">{settlement?.payout_details?.bank_name}</p>
            )}
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              After marking as processing, proceed to complete the bank transfer manually. You'll be able to mark it as completed once the transfer is done.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#333333] flex gap-3">
          <button
            onClick={() => {
              setShowProcessingDialog(false);
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={handleMarkAsProcessing}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[48px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <PlayCircle className="w-5 h-5" />
            )}
            {isSubmitting ? 'Processing...' : 'Start Processing'}
          </button>
        </div>
      </div>
    </div>
  );

  // Close handler for CompleteSettlementDialog
  const handleCloseCompleteDialog = useCallback(() => {
    setShowCompleteDialog(false);
    setTransferReference('');
    setError(null);
  }, []);

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
    >
      <div
        className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-[#333333] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Wallet className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-white">
                Settlement Details
              </h3>
              {settlement && (
                <p className="text-gray-400 text-sm">
                  {settlement.branch_name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-[#333333] rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-5 mt-5 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {isLoading ? (
            // Skeleton loading state
            <div className="p-5 space-y-6">
              <div className="space-y-3">
                <div className="h-5 bg-[#333333] rounded animate-pulse w-24" />
                <div className="h-8 bg-[#333333] rounded animate-pulse w-48" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-[#333333] rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-[#333333] rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : settlement === null ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">Settlement not found</p>
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {/* Status and Amount Header */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusBadgeClasses(settlement.status)}`}>
                  {getStatusIcon(settlement.status)}
                  <span className="capitalize">{settlement.status}</span>
                </span>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Net Amount</p>
                  <p className="text-green-400 font-bold text-2xl">
                    ₱{settlement.amount?.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Branch & Request Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#333333]">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-400 text-sm">Branch</p>
                  </div>
                  <p className="text-white font-medium">{settlement.branch_name}</p>
                  {settlement.branch_address && (
                    <p className="text-gray-500 text-sm mt-1">{settlement.branch_address}</p>
                  )}
                </div>

                <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#333333]">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-400 text-sm">Requested By</p>
                  </div>
                  <p className="text-white font-medium">{settlement.requester_name}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {formatDateTime(settlement.created_at)}
                  </p>
                </div>
              </div>

              {/* Payout Details */}
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#333333]">
                <div className="flex items-center gap-2 mb-4">
                  {getPayoutMethodIcon(settlement.payout_details?.method)}
                  <p className="text-white font-medium">
                    {getPayoutMethodLabel(settlement.payout_details?.method)}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Account Name</p>
                    <p className="text-white font-medium">{settlement.payout_details?.account_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Account Number</p>
                    <p className="text-white font-medium font-mono">{settlement.payout_details?.account_number}</p>
                  </div>
                  {settlement.payout_details?.bank_name && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-400">Bank</p>
                      <p className="text-white font-medium">{settlement.payout_details.bank_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#333333]">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                  <p className="text-white font-medium">Earnings Breakdown</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Gross Earnings</span>
                    <span className="text-white font-medium">
                      ₱{settlement.breakdown?.gross?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Commission Deducted</span>
                    <span className="text-red-400 font-medium">
                      -₱{settlement.breakdown?.commission?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-[#333333] flex justify-between">
                    <span className="text-gray-300 font-medium">Net Amount</span>
                    <span className="text-green-400 font-bold text-lg">
                      ₱{settlement.breakdown?.net?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linked Transactions */}
              <div className="bg-[#0A0A0A] rounded-xl border border-[#333333] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#333333]">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-gray-400" />
                    <p className="text-white font-medium">Included Transactions</p>
                  </div>
                  <span className="px-2 py-1 bg-[#333333] rounded-lg text-xs text-gray-300">
                    {settlement.earnings?.length || 0} items
                  </span>
                </div>

                {settlement.earnings?.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No transactions linked</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-[#1A1A1A] sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">
                            Service
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">
                            Customer
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#333333]">
                        {settlement.earnings?.map((earning) => (
                          <tr key={earning._id} className="hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-white text-sm">{earning.service_name}</p>
                              <p className="text-gray-500 text-xs">
                                {formatDateTime(earning.created_at)}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-white text-sm">{earning.customer_name}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <p className="text-green-400 font-medium">
                                ₱{earning.net_amount?.toLocaleString()}
                              </p>
                              <p className="text-gray-500 text-xs">
                                Gross: ₱{earning.gross_amount?.toLocaleString()}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Rejection Reason (if rejected) */}
              {settlement.status === 'rejected' && settlement.rejection_reason && (
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <p className="text-red-400 font-medium">Rejection Reason</p>
                  </div>
                  <p className="text-white text-sm">{settlement.rejection_reason}</p>
                </div>
              )}

              {/* Approval Notes (if approved with notes) */}
              {(settlement.status === 'approved' || settlement.status === 'processing' || settlement.status === 'completed') && settlement.notes && (
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-blue-400" />
                    <p className="text-blue-400 font-medium">Approval Notes</p>
                  </div>
                  <p className="text-white text-sm">{settlement.notes}</p>
                  {settlement.approved_at && (
                    <p className="text-gray-400 text-xs mt-2">
                      Approved on {formatDateTime(settlement.approved_at)}
                    </p>
                  )}
                </div>
              )}

              {/* Transfer Reference (if completed) */}
              {settlement.status === 'completed' && settlement.transfer_reference && (
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <p className="text-green-400 font-medium">Transfer Completed</p>
                  </div>
                  <p className="text-white text-sm">
                    Reference: <span className="font-mono">{settlement.transfer_reference}</span>
                  </p>
                  {settlement.completed_at && (
                    <p className="text-gray-400 text-xs mt-1">
                      Completed on {formatDateTime(settlement.completed_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer - Action Buttons */}
        <div className="p-5 border-t border-[#333333] bg-[#0A0A0A]">
          {isLoading || !settlement ? (
            <div className="flex gap-3">
              <div className="flex-1 h-12 bg-[#333333] rounded-xl animate-pulse" />
              <div className="flex-1 h-12 bg-[#333333] rounded-xl animate-pulse" />
            </div>
          ) : successMessage ? (
            // Show close button after successful action
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-xl transition-colors min-h-[48px]"
            >
              Close
            </button>
          ) : settlement.status === 'pending' ? (
            // Pending: Approve / Reject
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[48px]"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
              <button
                onClick={() => setShowApproveDialog(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[48px]"
              >
                <CheckCircle className="w-5 h-5" />
                Approve
              </button>
            </div>
          ) : settlement.status === 'approved' ? (
            // Approved: Mark as Processing / Reject
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[48px]"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
              <button
                onClick={() => setShowProcessingDialog(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[48px]"
              >
                <PlayCircle className="w-5 h-5" />
                Mark as Processing
              </button>
            </div>
          ) : settlement.status === 'processing' ? (
            // Processing: Mark as Completed / Reject
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[48px]"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
              <button
                onClick={() => setShowCompleteDialog(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[48px]"
              >
                <Send className="w-5 h-5" />
                Mark as Completed
              </button>
            </div>
          ) : (
            // Completed/Rejected: Close only
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-xl transition-colors min-h-[48px]"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      {showApproveDialog && <ApproveDialog />}
      {showRejectDialog && <RejectDialog />}
      {showProcessingDialog && <ProcessingDialog />}
      {showCompleteDialog && (
        <CompleteSettlementDialog
          settlement={settlement}
          transferReference={transferReference}
          setTransferReference={setTransferReference}
          isSubmitting={isSubmitting}
          error={error}
          onClose={handleCloseCompleteDialog}
          onComplete={handleComplete}
        />
      )}
    </div>
  );

  // Render using portal for proper z-index management
  return createPortal(modalContent, document.body);
}
