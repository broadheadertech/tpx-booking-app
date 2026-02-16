import React, { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { User, UserPlus, Edit, Trash2, Building, Users, Search, Filter, X, AlertCircle, Shield, HelpCircle, Scan, RefreshCw, CheckCircle } from 'lucide-react'
import UserFormModal from '../admin/UserFormModal'
import PermissionConfigModal from '../admin/PermissionConfigModal'
import FaceEnrollment from './FaceEnrollment'
import { createPortal } from 'react-dom'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { branchUserSteps } from '../../config/walkthroughSteps'

// Delete User Modal Component
const DeleteUserModal = React.memo(({ isOpen, onClose, onConfirm, user, loading, error }) => {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] shadow-2xl transition-all z-[10000] border border-[#2A2A2A]/50">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#444444]/30">
            <h3 className="text-xl font-bold text-white">Delete User</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-400/20 border border-red-400/30 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-red-400" />
              </div>

              <h4 className="text-lg font-semibold text-white mb-2">Confirm Deletion</h4>
              <p className="text-gray-400 mb-4">
                Are you sure you want to delete <strong>{user?.username}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. The user will be permanently removed from the system.
              </p>

              <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3 mb-6 text-left">
                <p className="text-sm text-gray-400">
                  <strong>User Details:</strong><br />
                  Username: {user?.username}<br />
                  Email: {user?.email}<br />
                  Role: {user?.role?.replace('_', ' ').toUpperCase()}
                </p>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete User</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
})

export default function BranchUserManagement() {
  const { user } = useCurrentUser()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [enrollUser, setEnrollUser] = useState(null)

  // Face enrollment status
  const enrollments = user?.branch_id
    ? useQuery(api.services.faceAttendance.getEnrollmentsByBranch, { branch_id: user.branch_id })
    : null
  const enrolledUserIds = new Set(enrollments?.filter(e => e.user_id).map(e => e.user_id) || [])

  const initialFormData = {
    username: '',
    email: '',
    password: '',
    mobile_number: '',
    address: '',
    role: 'staff',
    page_access: [],
    branch_id: user?.branch_id || ''
  }

  const [formData, setFormData] = useState(initialFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Queries - only get users from current branch
  const branchUsers = user?.branch_id
    ? useQuery(api.services.auth.getUsersByBranch, { branch_id: user.branch_id }) || []
    : []

  const branches = useQuery(api.services.branches.getAllBranches) || []
  const currentBranch = branches.find(b => b._id === user?.branch_id)

  // Mutations
  const createUser = useAction(api.services.auth.createUserWithClerk)
  const updateUser = useMutation(api.services.auth.updateUser)
  const deleteUser = useMutation(api.services.auth.deleteUser)
  const syncToClerk = useAction(api.services.auth.syncUserToClerk)

  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncTargetUser, setSyncTargetUser] = useState(null)
  const [syncPassword, setSyncPassword] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')

  // Filter to only show staff (not customers, admins, or barbers)
  const staffOnly = branchUsers.filter(u => u.role === 'staff')

  const getRoleColor = (role) => {
    switch (role) {
      case 'staff':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
      case 'barber':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
    }
  }

  const filteredUsers = staffOnly
    .filter(user => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = filterRole === 'all' || user.role === filterRole
      return matchesSearch && matchesRole
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const stats = {
    total: staffOnly.length,
    staff: staffOnly.filter(u => u.role === 'staff').length,
    barbers: 0 // Barbers are hidden
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setError('')
  }

  const handleCreate = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleSubmitCreate = async (e) => {
    e.preventDefault()
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Username, email, and password are required')
      return
    }

    if (!user?.branch_id) {
      setError('Branch information is missing')
      return
    }

    setLoading(true)
    try {
      await createUser({
        ...formData,
        branch_id: user.branch_id
      })
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating user:', error)
      setError(error.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEdit = (user) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't pre-fill password for security
      mobile_number: user.mobile_number || '',
      address: user.address || '',
      role: user.role,
      page_access: user.page_access || [],
      branch_id: user.branch_id || ''
    })
    setError('')
    setShowEditModal(true)
  }

  const handleDelete = (user) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const handleConfigurePermissions = (user) => {
    setSelectedUserForPermissions(user)
    setShowPermissionsModal(true)
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if (!formData.username.trim() || !formData.email.trim()) {
      setError('Username and email are required')
      return
    }

    if (!selectedUser?._id) {
      setError('User ID is missing')
      return
    }

    setLoading(true)
    try {
      const updateData = {
        userId: selectedUser._id,
        username: formData.username,
        email: formData.email,
        mobile_number: formData.mobile_number,
        address: formData.address,
        role: formData.role,
        page_access: formData.page_access
      }

      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password
      }

      await updateUser(updateData)
      setShowEditModal(false)
      resetForm()
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating user:', error)
      setError(error.message || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser?._id) {
      setError('User ID is missing')
      return
    }

    setLoading(true)
    try {
      await deleteUser({ userId: selectedUser._id })
      setShowDeleteModal(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      setError(error.message || 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncToClerk = async (e) => {
    e.preventDefault()
    if (!syncPassword.trim()) {
      setSyncError('Password is required to create Clerk account')
      return
    }
    setSyncing(true)
    setSyncError('')
    try {
      await syncToClerk({ userId: syncTargetUser._id, password: syncPassword })
      setShowSyncModal(false)
      setSyncTargetUser(null)
      setSyncPassword('')
    } catch (err) {
      console.error('Clerk sync error:', err)
      setSyncError(err.message || 'Failed to sync user to Clerk')
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }



  if (!currentBranch) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        <span className="ml-2 text-gray-400">Loading branch users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Branch Info Header */}
      <div data-tour="bu-header" className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex items-center space-x-3">
          <Building className="h-6 w-6 text-[var(--color-primary)]" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{currentBranch.name}</h3>
            <p className="text-sm text-gray-400">Branch Code: {currentBranch.branch_code} • Managing branch staff</p>
          </div>
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center px-2 py-2 text-gray-500 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
            title="Show tutorial"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div data-tour="bu-stats" className="grid grid-cols-2 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Staff</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</p>
            </div>
            <Users className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.staff}</p>
            </div>
            <User className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div data-tour="bu-controls" className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div data-tour="bu-table" className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#444444]/30">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#1A1A1A] divide-y divide-[#444444]/30">
              {filteredUsers.map((branchUser) => {
                const roleConfig = getRoleColor(branchUser.role)

                return (
                  <tr key={branchUser._id} className="hover:bg-[#333333]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-[var(--color-primary)]" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white flex items-center gap-1.5">
                            {branchUser.username}
                            {branchUser.clerk_user_id ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-400" title="Clerk synced" />
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded" title="Not synced to Clerk - cannot use Clerk login">
                                No Clerk
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {branchUser.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConfig.bg} ${roleConfig.text}`}>
                        {branchUser.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {branchUser.mobile_number || 'N/A'}
                      </div>
                      {branchUser.address && (
                        <div className="text-sm text-gray-400 truncate max-w-xs">
                          {branchUser.address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {formatDate(branchUser.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Clerk Sync */}
                        {!branchUser.clerk_user_id && (
                          <button
                            onClick={() => { setSyncTargetUser(branchUser); setSyncPassword(''); setSyncError(''); setShowSyncModal(true) }}
                            className="text-amber-400 hover:text-amber-300 transition-colors"
                            title="Sync to Clerk (enable login)"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        {/* Face Enrollment */}
                        <button
                          onClick={() => setEnrollUser(branchUser)}
                          className={`transition-colors ${enrolledUserIds.has(branchUser._id) ? 'text-green-400 hover:text-green-300' : 'text-amber-400 hover:text-amber-300'}`}
                          title={enrolledUserIds.has(branchUser._id) ? 'Re-enroll face' : 'Enroll face'}
                        >
                          <Scan className="h-4 w-4" />
                        </button>
                        {/* Configure Permissions - Story 12-3 */}
                        {branchUser.role === 'staff' && (user?.role === 'branch_admin' || user?.role === 'super_admin' || user?.role === 'admin_staff') && (
                          <button
                            onClick={() => handleConfigurePermissions(branchUser)}
                            className="text-[#FF8C42] hover:text-[#E67E3C] transition-colors"
                            title="Configure permissions"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(branchUser)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {(user?.role === 'branch_admin' || user?.role === 'super_admin') && (
                          <button
                            onClick={() => handleDelete(branchUser)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-white">No users found</h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchTerm || filterRole !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding staff or barbers to this branch.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <UserFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Add User to Branch"
        onSubmit={handleSubmitCreate}
        formData={formData}
        onInputChange={handleInputChange}
        loading={loading}
        error={error}
        branches={[currentBranch]}
        availableRoles={[
          { value: 'staff', label: 'Staff' }
        ]}
        isEditMode={false}
      />

      {/* Edit User Modal */}
      <UserFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          resetForm()
          setSelectedUser(null)
        }}
        title="Edit User"
        buttonText="Update User"
        loadingText="Updating..."
        onSubmit={handleSubmitEdit}
        formData={formData}
        onInputChange={handleInputChange}
        loading={loading}
        error={error}
        branches={[currentBranch]}
        availableRoles={[
          { value: 'staff', label: 'Staff' }
        ]}
        isEditMode={true}
      />

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedUser(null)
          setError('')
        }}
        onConfirm={handleConfirmDelete}
        user={selectedUser}
        loading={loading}
        error={error}
      />

      {/* Permission Configuration Modal - Story 12-3 */}
      <PermissionConfigModal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false)
          setSelectedUserForPermissions(null)
        }}
        user={selectedUserForPermissions}
        onSuccess={() => {
          // Permissions updated successfully
          setShowPermissionsModal(false)
          setSelectedUserForPermissions(null)
        }}
      />

      {/* Face Enrollment Modal */}
      <FaceEnrollment
        isOpen={!!enrollUser}
        onClose={() => setEnrollUser(null)}
        userId={enrollUser?._id}
        barberName={enrollUser?.nickname || enrollUser?.username || 'Staff'}
        branchId={user?.branch_id}
      />

      {/* Clerk Sync Modal */}
      {showSyncModal && syncTargetUser && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSyncModal(false)} />
            <div className="relative w-full max-w-md rounded-2xl bg-[#1A1A1A] shadow-2xl z-[10000] border border-[#2A2A2A]/50">
              <div className="flex items-center justify-between p-6 border-b border-[#444444]/30">
                <h3 className="text-lg font-bold text-white">Sync to Clerk</h3>
                <button onClick={() => setShowSyncModal(false)} className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSyncToClerk} className="p-6 space-y-4">
                {syncError && (
                  <div className="p-3 bg-red-400/20 border border-red-400/30 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{syncError}</p>
                  </div>
                )}
                <p className="text-sm text-gray-300">
                  Create a Clerk account for <span className="font-semibold text-white">{syncTargetUser.username}</span> ({syncTargetUser.email}) so they can log in.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Password for Clerk account</label>
                  <input
                    type="password"
                    value={syncPassword}
                    onChange={(e) => setSyncPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">This will be the password for the staff member's login.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowSyncModal(false)} className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg text-sm hover:bg-[#3A3A3A]">
                    Cancel
                  </button>
                  <button type="submit" disabled={syncing} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-accent)] disabled:opacity-50 flex items-center gap-1">
                    {syncing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Syncing...</> : <><RefreshCw className="h-4 w-4" /> Sync to Clerk</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      <WalkthroughOverlay steps={branchUserSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />
    </div>
  )
}