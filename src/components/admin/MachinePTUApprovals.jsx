import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useAppModal } from '../../context/AppModalContext'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Building2,
  RefreshCw,
} from 'lucide-react'

/**
 * Universal Machine PTU approval queue (super_admin / it_admin).
 * Lists every branch's POS machine registration and lets approvers
 * approve / reject / revoke. A branch is BIR-accredited only once approved.
 */
const STATUS_STYLES = {
  draft: 'bg-gray-500/15 text-gray-400 border-gray-500/40',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/40',
  revoked: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
}

const MachinePTUApprovals = () => {
  const { user } = useCurrentUser()
  const { showAlert, showPrompt } = useAppModal()
  const [statusFilter, setStatusFilter] = useState('pending')

  const canApprove = user?.role === 'super_admin' || user?.role === 'it_admin'

  const machines = useQuery(
    api.services.machinePTU.listMachinePTUs,
    statusFilter === 'all' ? {} : { status: statusFilter }
  )

  const approve = useMutation(api.services.machinePTU.approveMachinePTU)
  const reject = useMutation(api.services.machinePTU.rejectMachinePTU)
  const revoke = useMutation(api.services.machinePTU.revokeMachinePTU)

  const handleApprove = async (m) => {
    try {
      await approve({ machine_ptu_id: m._id, actor_id: user._id })
      showAlert({ title: 'Approved', message: `${m.branch_name} is now BIR-accredited.`, type: 'success' })
    } catch (e) {
      showAlert({ title: 'Approve failed', message: e?.message || 'Error', type: 'error' })
    }
  }

  const handleReject = async (m) => {
    const reason = typeof showPrompt === 'function'
      ? await showPrompt({ title: 'Reject Machine PTU', message: `Reason for rejecting ${m.branch_name}'s machine PTU:` })
      : window.prompt(`Reason for rejecting ${m.branch_name}'s machine PTU:`)
    if (!reason) return
    try {
      await reject({ machine_ptu_id: m._id, actor_id: user._id, reason })
      showAlert({ title: 'Rejected', message: 'The branch has been notified.', type: 'success' })
    } catch (e) {
      showAlert({ title: 'Reject failed', message: e?.message || 'Error', type: 'error' })
    }
  }

  const handleRevoke = async (m) => {
    const reason = typeof showPrompt === 'function'
      ? await showPrompt({ title: 'Revoke Accreditation', message: `Reason for revoking ${m.branch_name}'s accreditation:` })
      : window.prompt(`Reason for revoking ${m.branch_name}'s accreditation:`)
    if (!reason) return
    try {
      await revoke({ machine_ptu_id: m._id, actor_id: user._id, reason })
      showAlert({ title: 'Revoked', message: 'Accreditation pulled. Receipts will print as non-accredited.', type: 'success' })
    } catch (e) {
      showAlert({ title: 'Revoke failed', message: e?.message || 'Error', type: 'error' })
    }
  }

  const filters = ['pending', 'approved', 'rejected', 'revoked', 'all']
  const pendingCount = (machines || []).filter((m) => m.status === 'pending').length

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[var(--color-primary)]" />
          Machine PTU Approvals
        </h2>
        <p className="text-gray-400 text-sm">
          Approve each branch's POS machine (Permit to Use). A branch prints a valid BIR INVOICE only once approved.
        </p>
      </div>

      {!canApprove && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-sm">
          Only super admin or IT admin can approve, reject, or revoke. You can view the queue below.
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize border transition-colors ${
              statusFilter === f
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[#1A1A1A] text-gray-400 border-[#333] hover:text-white'
            }`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px]">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-xl overflow-hidden">
        {machines === undefined ? (
          <div className="p-10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
          </div>
        ) : machines.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-600" />
            No machine PTUs {statusFilter === 'all' ? 'registered' : `with status "${statusFilter}"`} yet.
          </div>
        ) : (
          <div className="divide-y divide-[#333]">
            {machines.map((m) => (
              <div key={m._id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-white font-semibold">{m.branch_name}</p>
                    <span className="text-xs text-gray-500">{m.branch_code}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[m.status] || STATUS_STYLES.draft}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                    <div><span className="text-gray-500">MIN:</span> <span className="text-gray-300">{m.min || '—'}</span></div>
                    <div><span className="text-gray-500">Serial:</span> <span className="text-gray-300">{m.serial_number || '—'}</span></div>
                    <div><span className="text-gray-500">PTU:</span> <span className="text-gray-300">{m.ptu_number || '—'}{m.ptu_date ? ` (${m.ptu_date})` : ''}</span></div>
                    <div><span className="text-gray-500">Accred:</span> <span className="text-gray-300">{m.accreditation_number || '—'}</span></div>
                  </div>
                  {m.status === 'rejected' && m.rejection_reason && (
                    <p className="text-xs text-red-400 mt-1">Rejected: {m.rejection_reason}</p>
                  )}
                  {m.status === 'revoked' && m.revoke_reason && (
                    <p className="text-xs text-orange-400 mt-1">Revoked: {m.revoke_reason}</p>
                  )}
                </div>

                {canApprove && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(m)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-600/30 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => handleReject(m)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 border border-red-600/40 hover:bg-red-600/30 text-sm font-medium">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                    {m.status === 'approved' && (
                      <button onClick={() => handleRevoke(m)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/20 text-orange-300 border border-orange-600/40 hover:bg-orange-600/30 text-sm font-medium">
                        <Ban className="w-4 h-4" /> Revoke
                      </button>
                    )}
                    {(m.status === 'draft') && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500"><Clock className="w-4 h-4" /> Awaiting branch submission</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MachinePTUApprovals
