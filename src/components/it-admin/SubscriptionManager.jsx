import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  RefreshCw,
  X,
  ChevronDown,
  TrendingUp,
  Clock,
  AlertTriangle,
  DollarSign,
  RotateCcw,
  Ban,
} from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  past_due: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  trial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const PLANS = ['free', 'basic', 'pro', 'enterprise']
const STATUSES = ['active', 'past_due', 'suspended', 'cancelled', 'trial']
const BILLING_CYCLES = ['monthly', 'quarterly', 'annual']

function SubscriptionManager() {
  const { user } = useCurrentUser()
  const subscriptions = useQuery(api.services.subscriptions.getAllSubscriptions) || []
  const stats = useQuery(api.services.subscriptions.getSubscriptionStats) || null
  const branches = useQuery(api.services.branches.getAllBranches) || []

  const createSubscription = useMutation(api.services.subscriptions.createSubscription)
  const updateSubscription = useMutation(api.services.subscriptions.updateSubscription)
  const cancelSubscription = useMutation(api.services.subscriptions.cancelSubscription)
  const renewSubscription = useMutation(api.services.subscriptions.renewSubscription)

  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'renew' | 'cancel', subscriptionId, branchName }
  const [loading, setLoading] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    branchId: '',
    plan: 'basic',
    billingCycle: 'monthly',
    amount: '',
    startDate: '',
    endDate: '',
  })

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesSearch =
        !searchQuery ||
        (sub.branch_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPlan = planFilter === 'all' || sub.plan === planFilter
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [subscriptions, searchQuery, planFilter, statusFilter])

  const handleCreate = async () => {
    if (!createForm.branchId || !createForm.amount) return
    setLoading(true)
    try {
      await createSubscription({
        userId: user?._id,
        branch_id: createForm.branchId,
        plan: createForm.plan,
        status: 'active',
        billing_cycle: createForm.billingCycle,
        amount: parseFloat(createForm.amount),
        start_date: new Date(createForm.startDate).getTime(),
        end_date: createForm.endDate ? new Date(createForm.endDate).getTime() : undefined,
        next_renewal: new Date(createForm.startDate).getTime() + (createForm.billingCycle === 'monthly' ? 30 : createForm.billingCycle === 'quarterly' ? 90 : 365) * 24 * 60 * 60 * 1000,
        payment_status: 'pending',
        auto_renew: true,
      })
      setShowCreateModal(false)
      setCreateForm({ branchId: '', plan: 'basic', billingCycle: 'monthly', amount: '', startDate: '', endDate: '' })
    } catch (err) {
      console.error('Failed to create subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setLoading(true)
    try {
      if (confirmAction.type === 'renew') {
        await renewSubscription({ subscriptionId: confirmAction.subscriptionId, userId: user?._id })
      } else if (confirmAction.type === 'cancel') {
        await cancelSubscription({ subscriptionId: confirmAction.subscriptionId, userId: user?._id })
      }
      setConfirmAction(null)
    } catch (err) {
      console.error(`Failed to ${confirmAction.type} subscription:`, err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '---'
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount) => {
    if (amount == null) return '---'
    return `₱${Number(amount).toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CreditCard className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Subscription Manager</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>Create Subscription</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-gray-500">Active Subscriptions</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats?.active ?? 0}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <p className="text-xs text-gray-500">Past Due</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats?.past_due ?? 0}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-gray-500">Suspended</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats?.suspended ?? 0}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-gray-500">MRR</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats?.mrr)}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="all">All Plans</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Branch</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Billing Cycle</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Amount</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Next Renewal</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Payment</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscriptions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No subscriptions found.
                </td>
              </tr>
            ) : (
              filteredSubscriptions.map((sub) => (
                <tr key={sub._id} className="border-b border-[#2A2A2A] hover:bg-[#222222] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{sub.branch_name || '---'}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-gray-300">{sub.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[sub.status] || STATUS_COLORS.cancelled}`}>
                      {(sub.status || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 capitalize">{sub.billing_cycle}</td>
                  <td className="px-4 py-3 text-gray-300">{formatCurrency(sub.amount)}</td>
                  <td className="px-4 py-3 text-gray-300">{formatDate(sub.next_renewal || sub.end_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                      sub.payment_status === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : sub.payment_status === 'overdue'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                      {sub.payment_status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {sub.status !== 'cancelled' && (
                        <>
                          <button
                            onClick={() => setConfirmAction({ type: 'renew', subscriptionId: sub._id, branchName: sub.branch_name })}
                            className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                            title="Renew"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'cancel', subscriptionId: sub._id, branchName: sub.branch_name })}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Cancel"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center space-y-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                confirmAction.type === 'cancel'
                  ? 'bg-red-500/10'
                  : 'bg-blue-500/10'
              }`}>
                {confirmAction.type === 'cancel' ? (
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                ) : (
                  <RotateCcw className="w-7 h-7 text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {confirmAction.type === 'cancel' ? 'Cancel Subscription' : 'Renew Subscription'}
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  {confirmAction.type === 'cancel'
                    ? <>Are you sure you want to cancel the subscription for <span className="text-white font-medium">{confirmAction.branchName || 'this branch'}</span>? This will immediately restrict branch access after the grace period.</>
                    : <>Are you sure you want to renew the subscription for <span className="text-white font-medium">{confirmAction.branchName || 'this branch'}</span>? This will extend the billing period and set payment status to paid.</>
                  }
                </p>
              </div>
              <div className="flex space-x-3 justify-center pt-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#3A3A3A] text-sm transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${
                    confirmAction.type === 'cancel'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:opacity-90'
                  }`}
                >
                  {loading
                    ? (confirmAction.type === 'cancel' ? 'Cancelling...' : 'Renewing...')
                    : (confirmAction.type === 'cancel' ? 'Yes, Cancel Subscription' : 'Yes, Renew Subscription')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white">Create Subscription</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#3A3A3A] text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Branch</label>
                <select
                  value={createForm.branchId}
                  onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="">Select a branch...</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} {b.branch_code ? `(${b.branch_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Plan</label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Billing Cycle</label>
                  <select
                    value={createForm.billingCycle}
                    onChange={(e) => setCreateForm({ ...createForm, billingCycle: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    {BILLING_CYCLES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (PHP)</label>
                <input
                  type="number"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#3A3A3A] text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !createForm.branchId || !createForm.amount}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionManager
