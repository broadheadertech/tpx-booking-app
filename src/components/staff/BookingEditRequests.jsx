import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CheckCircle, XCircle, Clock, AlertCircle, ArrowRight, User, Calendar, Scissors, MessageSquare } from 'lucide-react'
import { createPortal } from 'react-dom'

const BookingEditRequests = ({ user }) => {
  const [filterStatus, setFilterStatus] = useState('pending')
  const [rejectModal, setRejectModal] = useState(null) // { requestId, bookingCode }
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(null) // requestId being processed

  const editRequests = useQuery(
    api.services.bookingEditRequests.getEditRequestsByBranch,
    user?.branch_id ? { branch_id: user.branch_id, status: filterStatus || undefined } : 'skip'
  )

  const approveRequest = useMutation(api.services.bookingEditRequests.approveEditRequest)
  const rejectRequest = useMutation(api.services.bookingEditRequests.rejectEditRequest)

  const handleApprove = async (requestId) => {
    setLoading(requestId)
    try {
      await approveRequest({ edit_request_id: requestId, approved_by: user._id })
    } catch (err) {
      console.error('Failed to approve:', err)
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim() || !rejectModal) return
    setLoading(rejectModal.requestId)
    try {
      await rejectRequest({
        edit_request_id: rejectModal.requestId,
        rejected_by: user._id,
        rejection_reason: rejectionReason.trim(),
      })
      setRejectModal(null)
      setRejectionReason('')
    } catch (err) {
      console.error('Failed to reject:', err)
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Approved' },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Rejected' },
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {['pending', 'approved', 'rejected'].map(status => {
          const config = statusConfig[status]
          const Icon = config.icon
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === status
                  ? `${config.bg} ${config.color} ${config.border} border`
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="capitalize">{config.label}</span>
            </button>
          )
        })}
      </div>

      {/* Request Cards */}
      {!editRequests ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : editRequests.length === 0 ? (
        <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
          <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No {filterStatus} edit requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {editRequests.map(req => {
            const config = statusConfig[req.status]
            const StatusIcon = config.icon
            return (
              <div key={req._id} className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}>
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </div>
                    <span className="text-white font-medium text-sm">#{req.booking_code}</span>
                    {req.customer_name && (
                      <span className="text-gray-400 text-xs">• {req.customer_name}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(req.requested_at)}</span>
                </div>

                {/* Requester */}
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                  <User className="w-3.5 h-3.5" />
                  <span>Requested by <span className="text-gray-300 font-medium">{req.requester_name}</span></span>
                </div>

                {/* Changes Diff */}
                <div className="bg-[#0A0A0A] rounded-lg p-3 mb-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Changes: {req.change_summary}</p>

                  {req.changes.service && (
                    <div className="flex items-center gap-2 text-sm">
                      <Scissors className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-500 w-14">Service:</span>
                      <span className="text-red-400 line-through">{req.old_service_name}</span>
                      <ArrowRight className="w-3 h-3 text-gray-600" />
                      <span className="text-green-400">{req.new_service_name}</span>
                    </div>
                  )}

                  {req.changes.barber && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-500 w-14">Barber:</span>
                      <span className="text-red-400 line-through">{req.old_barber_name}</span>
                      <ArrowRight className="w-3 h-3 text-gray-600" />
                      <span className="text-green-400">{req.new_barber_name}</span>
                    </div>
                  )}

                  {req.changes.date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-500 w-14">Date:</span>
                      <span className="text-red-400 line-through">{req.changes.date.old}</span>
                      <ArrowRight className="w-3 h-3 text-gray-600" />
                      <span className="text-green-400">{req.changes.date.new}</span>
                    </div>
                  )}

                  {req.changes.time && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-500 w-14">Time:</span>
                      <span className="text-red-400 line-through">{req.changes.time.old}</span>
                      <ArrowRight className="w-3 h-3 text-gray-600" />
                      <span className="text-green-400">{req.changes.time.new}</span>
                    </div>
                  )}

                  {req.changes.notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-500 w-14">Notes:</span>
                      <div className="flex-1">
                        {req.changes.notes.old && <p className="text-red-400 line-through text-xs">{req.changes.notes.old}</p>}
                        {req.changes.notes.new && <p className="text-green-400 text-xs">{req.changes.notes.new}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="mb-3 p-2 bg-[#2A2A2A]/50 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Reason</p>
                  <p className="text-sm text-gray-300">{req.reason}</p>
                </div>

                {/* Rejection reason (if rejected) */}
                {req.status === 'rejected' && req.rejection_reason && (
                  <div className="mb-3 p-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-300">{req.rejection_reason}</p>
                    {req.reviewer_name && (
                      <p className="text-xs text-gray-500 mt-1">Rejected by {req.reviewer_name} • {formatDate(req.reviewed_at)}</p>
                    )}
                  </div>
                )}

                {/* Approved info */}
                {req.status === 'approved' && req.reviewer_name && (
                  <div className="mb-3 p-2 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-300">Approved by {req.reviewer_name} • {formatDate(req.reviewed_at)}</p>
                  </div>
                )}

                {/* Action Buttons (only for pending) */}
                {req.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-[#2A2A2A]">
                    <button
                      onClick={() => { setRejectModal({ requestId: req._id, bookingCode: req.booking_code }); setRejectionReason('') }}
                      disabled={loading === req._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(req._id)}
                      disabled={loading === req._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    >
                      {loading === req._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Approve
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative w-full max-w-md bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] shadow-2xl p-6 z-[10000]">
            <h3 className="text-lg font-semibold text-white mb-1">Reject Edit Request</h3>
            <p className="text-sm text-gray-400 mb-4">Booking #{rejectModal.bookingCode}</p>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this edit request is being rejected..."
                rows={3}
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none placeholder-gray-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject Request
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default BookingEditRequests
