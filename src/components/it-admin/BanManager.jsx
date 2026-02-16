import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  Ban,
  Search,
  Plus,
  X,
  UserX,
  Building,
  ShieldOff,
  ShieldCheck,
  AlertTriangle,
  User,
  Mail,
  Calendar,
} from 'lucide-react'

function BanManager() {
  const { user } = useCurrentUser()

  const bannedUsers = useQuery(api.services.itAdmin.getBannedUsers) || []
  const suspendedBranches = useQuery(api.services.itAdmin.getSuspendedBranches) || []
  const allUsers = useQuery(api.services.auth.getAllUsers) || []
  const allBranches = useQuery(api.services.branches.getAllBranches) || []

  const banUser = useMutation(api.services.itAdmin.banUser)
  const unbanUser = useMutation(api.services.itAdmin.unbanUser)
  const suspendBranch = useMutation(api.services.itAdmin.suspendBranch)
  const unsuspendBranch = useMutation(api.services.itAdmin.unsuspendBranch)

  const [activeTab, setActiveTab] = useState('users') // 'users' | 'branches'
  const [showBanModal, setShowBanModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(null) // { type, id, name }
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Ban user form
  const [banForm, setBanForm] = useState({
    userId: '',
    reason: '',
    userSearch: '',
  })

  // Suspend branch form
  const [suspendForm, setSuspendForm] = useState({
    branchId: '',
    reason: '',
    cancelSubscription: false,
  })

  // Filter users for search in ban modal
  const filteredUsersForSearch = useMemo(() => {
    if (!banForm.userSearch) return []
    const query = banForm.userSearch.toLowerCase()
    const bannedIds = new Set(bannedUsers.map((u) => u._id || u.userId))
    return allUsers
      .filter(
        (u) =>
          !bannedIds.has(u._id) &&
          ((u.username || u.nickname || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query))
      )
      .slice(0, 10)
  }, [allUsers, banForm.userSearch, bannedUsers])

  // Filter branches for suspend modal
  const availableBranches = useMemo(() => {
    const suspendedIds = new Set(suspendedBranches.map((b) => b._id || b.branchId))
    return allBranches.filter((b) => !suspendedIds.has(b._id))
  }, [allBranches, suspendedBranches])

  const handleBanUser = async () => {
    if (!banForm.userId || !banForm.reason.trim()) return
    setLoading(true)
    try {
      await banUser({
        userId: user?._id,
        targetUserId: banForm.userId,
        ban_reason: banForm.reason.trim(),
      })
      setShowBanModal(false)
      setBanForm({ userId: '', reason: '', userSearch: '' })
    } catch (err) {
      console.error('Failed to ban user:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnbanUser = async (userId) => {
    setLoading(true)
    try {
      await unbanUser({ userId: user?._id, targetUserId: userId })
      setShowConfirmDialog(null)
    } catch (err) {
      console.error('Failed to unban user:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendBranch = async () => {
    if (!suspendForm.branchId || !suspendForm.reason.trim()) return
    setLoading(true)
    try {
      await suspendBranch({
        userId: user?._id,
        branchId: suspendForm.branchId,
        suspension_reason: suspendForm.reason.trim(),
        cancelSubscription: suspendForm.cancelSubscription,
      })
      setShowSuspendModal(false)
      setSuspendForm({ branchId: '', reason: '', cancelSubscription: false })
    } catch (err) {
      console.error('Failed to suspend branch:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsuspendBranch = async (branchId) => {
    setLoading(true)
    try {
      await unsuspendBranch({ userId: user?._id, branchId })
      setShowConfirmDialog(null)
    } catch (err) {
      console.error('Failed to unsuspend branch:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectUserForBan = (selectedUser) => {
    setBanForm({
      ...banForm,
      userId: selectedUser._id,
      userSearch: selectedUser.username || selectedUser.nickname || selectedUser.email,
    })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '---'
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Ban className="w-6 h-6 text-red-400" />
        <h2 className="text-xl font-bold text-white">Ban Manager</h2>
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center space-x-2 bg-[#1A1A1A] p-1 rounded-xl border border-[#2A2A2A] w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#3A3A3A]'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Banned Users</span>
          {bannedUsers.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === 'users' ? 'bg-white/20' : 'bg-red-500/20 text-red-400'
            }`}>
              {bannedUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'branches'
              ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#3A3A3A]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Suspended Branches</span>
          {suspendedBranches.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === 'branches' ? 'bg-white/20' : 'bg-red-500/20 text-red-400'
            }`}>
              {suspendedBranches.length}
            </span>
          )}
        </button>
      </div>

      {/* Banned Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowBanModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium text-sm hover:bg-red-500/30 transition-colors"
            >
              <UserX className="w-4 h-4" />
              <span>Ban User</span>
            </button>
          </div>

          {bannedUsers.length === 0 ? (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-400">No banned users.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bannedUsers.map((banned) => (
                <div
                  key={banned._id || banned.userId}
                  className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 flex items-center justify-between hover:border-[#3A3A3A] transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <UserX className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{banned.username || '---'}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{banned.email || '---'}</span>
                        </span>
                        <span className="text-xs text-gray-500">{banned.role || '---'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-red-400">{banned.ban_reason || '---'}</p>
                      <p className="text-xs text-gray-500 flex items-center justify-end space-x-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(banned.banned_at || banned._creationTime)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setShowConfirmDialog({
                          type: 'unban',
                          id: banned._id || banned.userId,
                          name: banned.username || 'this user',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                    >
                      Unban
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suspended Branches Tab */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowSuspendModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium text-sm hover:bg-red-500/30 transition-colors"
            >
              <ShieldOff className="w-4 h-4" />
              <span>Suspend Branch</span>
            </button>
          </div>

          {suspendedBranches.length === 0 ? (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-400">No suspended branches.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suspendedBranches.map((branch) => (
                <div
                  key={branch._id || branch.branchId}
                  className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 flex items-center justify-between hover:border-[#3A3A3A] transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Building className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{branch.name || '---'}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-gray-500">Code: {branch.branch_code || '---'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-red-400">{branch.suspension_reason || '---'}</p>
                      <p className="text-xs text-gray-500 flex items-center justify-end space-x-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(branch.suspended_at || branch._creationTime)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setShowConfirmDialog({
                          type: 'unsuspend',
                          id: branch._id || branch.branchId,
                          name: branch.name || 'this branch',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                    >
                      Unsuspend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ban User Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white">Ban User</h3>
              <button
                onClick={() => { setShowBanModal(false); setBanForm({ userId: '', reason: '', userSearch: '' }) }}
                className="p-1.5 rounded-lg hover:bg-[#3A3A3A] text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-1">Search User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={banForm.userSearch}
                    onChange={(e) => setBanForm({ ...banForm, userSearch: e.target.value, userId: '' })}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                {/* Search Results Dropdown */}
                {banForm.userSearch && !banForm.userId && filteredUsersForSearch.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A] shadow-xl z-10 max-h-48 overflow-y-auto">
                    {filteredUsersForSearch.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => selectUserForBan(u)}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-[#3A3A3A] transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-white">{u.username || u.nickname || '---'}</p>
                          <p className="text-xs text-gray-500">{u.email || '---'} - {u.role || '---'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {banForm.userId && (
                  <p className="text-xs text-emerald-400 mt-1">User selected</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason for Ban</label>
                <textarea
                  value={banForm.reason}
                  onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                  placeholder="Enter reason for banning this user..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => { setShowBanModal(false); setBanForm({ userId: '', reason: '', userSearch: '' }) }}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#3A3A3A] text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBanUser}
                disabled={loading || !banForm.userId || !banForm.reason.trim()}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Banning...' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Branch Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white">Suspend Branch</h3>
              <button
                onClick={() => { setShowSuspendModal(false); setSuspendForm({ branchId: '', reason: '', cancelSubscription: false }) }}
                className="p-1.5 rounded-lg hover:bg-[#3A3A3A] text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Select Branch</label>
                <select
                  value={suspendForm.branchId}
                  onChange={(e) => setSuspendForm({ ...suspendForm, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="">Choose a branch...</option>
                  {availableBranches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} {b.code ? `(${b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason for Suspension</label>
                <textarea
                  value={suspendForm.reason}
                  onChange={(e) => setSuspendForm({ ...suspendForm, reason: e.target.value })}
                  placeholder="Enter reason for suspending this branch..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="cancelSub"
                  checked={suspendForm.cancelSubscription}
                  onChange={(e) => setSuspendForm({ ...suspendForm, cancelSubscription: e.target.checked })}
                  className="rounded border-[#3A3A3A] bg-[#3A3A3A] text-red-500 focus:ring-0"
                />
                <label htmlFor="cancelSub" className="text-sm text-gray-300">
                  Also cancel subscription for this branch
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => { setShowSuspendModal(false); setSuspendForm({ branchId: '', reason: '', cancelSubscription: false }) }}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#3A3A3A] text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendBranch}
                disabled={loading || !suspendForm.branchId || !suspendForm.reason.trim()}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Suspending...' : 'Suspend Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {showConfirmDialog.type === 'unban' ? 'Unban User' : 'Unsuspend Branch'}
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  Are you sure you want to {showConfirmDialog.type === 'unban' ? 'unban' : 'unsuspend'}{' '}
                  <span className="text-white font-medium">{showConfirmDialog.name}</span>?
                </p>
              </div>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#3A3A3A] text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showConfirmDialog.type === 'unban') {
                      handleUnbanUser(showConfirmDialog.id)
                    } else {
                      handleUnsuspendBranch(showConfirmDialog.id)
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BanManager
