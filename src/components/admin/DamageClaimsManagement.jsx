import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAppModal } from '../../context/AppModalContext'

const STATUS_CONFIG = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending' },
  approved: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Approved' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Rejected' },
}

const REASON_LABELS = {
  packaging: 'Packaging',
  defect: 'Defect',
  shipping: 'Shipping',
  expired: 'Expired',
  wrong_item: 'Wrong Item',
  other: 'Other',
}

const DamageClaimsManagement = ({ user }) => {
  const { showAlert, showConfirm } = useAppModal()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [expandedClaim, setExpandedClaim] = useState(null)
  const [processingClaim, setProcessingClaim] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const claims = useQuery(api.services.damageClaims.getAllClaims, {
    status: statusFilter === 'all' ? undefined : statusFilter,
  }) || []

  const pendingCount = useQuery(api.services.damageClaims.getPendingClaimsCount) ?? 0

  const approveClaim = useMutation(api.services.damageClaims.approveDamageClaim)
  const rejectClaim = useMutation(api.services.damageClaims.rejectDamageClaim)

  const handleApprove = async (claim) => {
    const confirmed = await showConfirm({
      title: 'Approve Damage Claim',
      message: `Approve claim for order ${claim.order_number}? ₱${claim.total_damage_amount.toLocaleString()} will be credited to the branch wallet.`,
      type: 'warning',
    })
    if (!confirmed) return

    setProcessingClaim(claim._id)
    try {
      await approveClaim({
        claim_id: claim._id,
        approved_by: user._id,
      })
      showAlert('Claim Approved', `₱${claim.total_damage_amount.toLocaleString()} credited to branch wallet.`)
    } catch (error) {
      showAlert('Error', error.message || 'Failed to approve claim.')
    } finally {
      setProcessingClaim(null)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showAlert('Reason Required', 'Please provide a reason for rejection.')
      return
    }

    const claim = showRejectModal
    setProcessingClaim(claim._id)
    try {
      await rejectClaim({
        claim_id: claim._id,
        rejected_by: user._id,
        rejection_reason: rejectionReason.trim(),
      })
      setShowRejectModal(null)
      setRejectionReason('')
    } catch (error) {
      showAlert('Error', error.message || 'Failed to reject claim.')
    } finally {
      setProcessingClaim(null)
    }
  }

  const formatDate = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === status
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#333]'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Claims List */}
      {claims.length === 0 ? (
        <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-300">No damage claims</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter !== 'all' ? `No ${statusFilter} claims found.` : 'No claims filed yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const config = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending
            const StatusIcon = config.icon
            const isExpanded = expandedClaim === claim._id

            return (
              <div
                key={claim._id}
                className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden"
              >
                {/* Claim Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#222] transition-colors"
                  onClick={() => setExpandedClaim(isExpanded ? null : claim._id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <AlertTriangle className={`w-4 h-4 ${config.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-primary)] font-mono font-semibold text-sm">
                          {claim.order_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {claim.branch_name} • {formatDate(claim.submitted_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-red-400 font-bold text-sm">
                        ₱{claim.total_damage_amount.toLocaleString()}
                      </div>
                      <div className="text-gray-500 text-[10px]">
                        {claim.items.length} item{claim.items.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#2A2A2A] p-4 space-y-4">
                    {/* Description */}
                    <div>
                      <h4 className="text-gray-400 text-xs font-medium mb-1">Description</h4>
                      <p className="text-white text-sm bg-[#0A0A0A] rounded-lg p-3">
                        {claim.description}
                      </p>
                    </div>

                    {/* Damaged Items */}
                    <div>
                      <h4 className="text-gray-400 text-xs font-medium mb-2">Damaged Items</h4>
                      <div className="space-y-2">
                        {claim.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-[#0A0A0A] rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-500" />
                              <div>
                                <span className="text-white text-sm">{item.product_name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-red-400 text-xs">
                                    x{item.quantity_damaged} damaged
                                  </span>
                                  <span className="text-gray-500 text-xs">
                                    • {REASON_LABELS[item.damage_reason] || item.damage_reason}
                                  </span>
                                </div>
                                {item.reason_note && (
                                  <p className="text-gray-500 text-xs mt-0.5">{item.reason_note}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-red-400 text-sm font-semibold">
                              ₱{(item.quantity_damaged * item.unit_price).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submitted By */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Filed by: {claim.submitted_by_name}</span>
                      {claim.reviewed_by_name && (
                        <span>Reviewed by: {claim.reviewed_by_name}</span>
                      )}
                    </div>

                    {/* Credit Info (approved) */}
                    {claim.status === 'approved' && claim.credit_amount && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <span className="text-green-400 text-xs">Wallet Credit Issued</span>
                        <div className="text-green-400 text-lg font-bold">
                          ₱{claim.credit_amount.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {claim.status === 'rejected' && claim.rejection_reason && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <span className="text-red-400 text-xs">Rejection Reason</span>
                        <p className="text-red-300 text-sm mt-0.5">{claim.rejection_reason}</p>
                      </div>
                    )}

                    {/* Actions (pending only) */}
                    {claim.status === 'pending' && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleApprove(claim)}
                          disabled={processingClaim === claim._id}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all disabled:opacity-50"
                        >
                          {processingClaim === claim._id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve & Credit
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectModal(claim)
                            setRejectionReason('')
                          }}
                          disabled={processingClaim === claim._id}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-semibold transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Reject Claim</h3>
              <button
                onClick={() => setShowRejectModal(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Rejecting claim for order{' '}
              <span className="text-[var(--color-primary)] font-mono">
                {showRejectModal.order_number}
              </span>
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              className="w-full px-4 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#2A2A2A] text-gray-300 text-sm font-semibold hover:bg-[#333]"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingClaim}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {processingClaim ? (
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Reject Claim'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DamageClaimsManagement
