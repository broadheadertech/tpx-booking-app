import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { User, UserPlus, Edit, Trash2, Shield, Building, Users, Search, Filter, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react'
import UserFormModal from './UserFormModal'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { userManagementSteps } from '../../config/walkthroughSteps'
import { useCurrentUser } from '../../hooks/useCurrentUser'

export default function UserManagement() {
  const { user: currentUser } = useCurrentUser()
  const isItAdmin = currentUser?.role === 'it_admin'

  // IT Admin can only manage IT Admins; others get the default set
  const availableRoles = isItAdmin
    ? [{ value: 'it_admin', label: 'IT Administrator' }]
    : [
        { value: 'branch_admin', label: 'Branch Admin' },
        { value: 'staff', label: 'Staff' },
        { value: 'super_admin', label: 'Super Admin' },
      ]
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterBranch, setFilterBranch] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    mobile_number: '',
    address: '',
    role: isItAdmin ? 'it_admin' : 'branch_admin',
    branch_id: '',
    page_access: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)

  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])

  // Queries
  const users = useQuery(api.services.auth.getAllUsers, {
    limit: 1000,
    roles: isItAdmin
      ? ['it_admin']
      : ['super_admin', 'admin', 'branch_admin', 'staff']
  }) || []
  const branches = useQuery(api.services.branches.getActiveBranches) || []

  // Mutations
  const createUser = useAction(api.services.auth.createUserWithClerk)
  const updateUser = useMutation(api.services.auth.updateUser)

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin':
        return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' }
      case 'admin':
        return { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' }
      case 'branch_admin':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' }
      case 'staff':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
      case 'barber':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' }
      case 'customer':
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
    }
  }

  // Filter out customers and barbers from users for admin management - only show staff and admin roles
  const adminUsers = users.filter(u => u.role !== 'customer' && u.role !== 'barber')

  const filteredUsers = adminUsers
    .filter(user => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesBranch = filterBranch === 'all' || user.branch_id === filterBranch
      return matchesSearch && matchesRole && matchesBranch
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const stats = {
    total: adminUsers.length,
    superAdmins: adminUsers.filter(u => u.role === 'super_admin').length,
    admins: adminUsers.filter(u => u.role === 'admin').length,
    branchAdmins: adminUsers.filter(u => u.role === 'branch_admin').length,
    staff: adminUsers.filter(u => u.role === 'staff').length
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      mobile_number: '',
      address: '',
      role: isItAdmin ? 'it_admin' : 'branch_admin',
      branch_id: '',
      page_access: []
    })
    setError('')
    setSuccessMessage('')
  }

  const handleCreate = () => {
    resetForm()
    setSelectedUser(null)
    setShowCreateModal(true)
  }

  // Role-based page access defaults (mirrors UserFormModal's ROLE_PAGE_DEFAULTS / PAGE_CATEGORIES)
  const ROLE_PAGE_DEFAULTS = {
    branch_admin: [
      // Standalone
      'overview','reports','pos','settings',
      // Bookings hub + sub-sections
      'bookings','custom_bookings','calendar','walkins','queue',
      // Team hub + sub-sections
      'team','barbers','users','attendance',
      // Customers hub + sub-sections
      'customers','customer_analytics',
      // Products hub + sub-sections
      'products','services','vouchers','order_products',
      // Finance hub + sub-sections
      'finance','accounting','balance_sheet','payroll','cash_advances','royalty','payments','payment_history','branch_wallet','wallet_earnings',
      // Marketing hub + sub-sections
      'marketing','email_marketing','post_moderation','events','notifications',
    ],
    staff: [
      'overview','bookings','pos','customers','products',
      'services','barbers','calendar','notifications',
      'queue','walkins','payments','payment_history','attendance',
    ],
  }

  const handleEdit = (user) => {
    setSelectedUser(user)

    // Resolve existing page access: page_access_v2 > page_access > role defaults
    let resolvedPageAccess = []
    if (user.page_access_v2 && Object.keys(user.page_access_v2).length > 0) {
      resolvedPageAccess = Object.keys(user.page_access_v2).filter(k => user.page_access_v2[k]?.view)
    } else if (user.page_access && user.page_access.length > 0) {
      resolvedPageAccess = [...user.page_access]
    } else if (ROLE_PAGE_DEFAULTS[user.role]) {
      // No explicit permissions set — use role defaults so checkboxes reflect actual access
      resolvedPageAccess = ROLE_PAGE_DEFAULTS[user.role]
    }

    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't populate password for security
      mobile_number: user.mobile_number || '',
      address: user.address || '',
      role: user.role,
      branch_id: user.branch_id || '',
      page_access: resolvedPageAccess
    })
    setShowEditModal(true)
  }

  const handleSubmitCreate = async (e) => {
    e.preventDefault()
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Username, email, and password are required')
      return
    }

    if (formData.role !== 'super_admin' && !formData.branch_id) {
      setError('Branch is required for all users except super admin')
      return
    }

    setLoading(true)
    try {
      await createUser({
        ...formData,
        branch_id: formData.role === 'super_admin' ? undefined : formData.branch_id
      })
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating user:', error)
      // Extract user-friendly error message
      const errorMessage = error?.message || 'Failed to create user'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return

    // Clear previous errors
    setError('')

    // Basic validation
    if (!formData.username.trim() || !formData.email.trim()) {
      setError('Username and email are required')
      return
    }

    if (formData.role !== 'super_admin' && !formData.branch_id) {
      setError('Branch is required for all users except super admin')
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    // Username validation
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long')
      return
    }

    // Password validation (if provided)
    if (formData.password.trim()) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long')
        return
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        setError('Password must contain at least one uppercase letter, one lowercase letter, and one number')
        return
      }
    }

    // Prepare update data for confirmation
    const updateData = {
      userId: selectedUser._id,
      username: formData.username.trim(),
      email: formData.email.trim().toLowerCase(),
      mobile_number: formData.mobile_number?.trim() || '',
      address: formData.address?.trim() || '',
      role: formData.role,
      branch_id: formData.role === 'super_admin' ? undefined : formData.branch_id,
      page_access: formData.page_access
    }

    // Only include password if it was provided
    if (formData.password.trim()) {
      updateData.password = formData.password
    }

    // Show confirmation dialog
    setPendingUpdate(updateData)
    setShowConfirmDialog(true)
  }

  const confirmUpdate = async () => {
    if (!pendingUpdate) return

    setLoading(true)
    setShowConfirmDialog(false)

    try {
      const result = await updateUser(pendingUpdate)

      if (result) {
        // Success - close modal and reset form
        setShowEditModal(false)
        setSelectedUser(null)
        resetForm()
        setSuccessMessage('User updated successfully!')

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('')
        }, 3000)
      }
    } catch (error) {
      console.error('Error updating user:', error)

      // Extract user-friendly error message directly from the error
      const errorMessage = error?.message || 'Failed to update user. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
      setPendingUpdate(null)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const getBranchName = (branchId) => {
    const branch = branches.find(b => b._id === branchId)
    return branch ? branch.name : 'N/A'
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }


  if (!users) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        <span className="ml-2 text-gray-400">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">User Management</h2>
        <button
          onClick={() => setShowTutorial(true)}
          className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all"
          title="Show tutorial"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-400/20 border border-green-400/30 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div data-tour="admin-users-stats" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">{stats.total}</p>
            </div>
            <Users className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Super Admin</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">{stats.superAdmins}</p>
            </div>
            <Shield className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Admin</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">{stats.admins}</p>
            </div>
            <Shield className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Branch Admin</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">{stats.branchAdmins}</p>
            </div>
            <Building className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Staff</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">{stats.staff}</p>
            </div>
            <User className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>


      </div>

      {/* Controls */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative" data-tour="admin-users-search">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-2" data-tour="admin-users-role-filter">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="branch_admin">Branch Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            >
              <option value="all">All Branches</option>
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <button
            data-tour="admin-users-create-btn"
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>New User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div data-tour="admin-users-table" className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#444444]/30">
            <thead className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Role & Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Page Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] divide-y divide-[#444444]/30">
              {filteredUsers.map((user) => {
                const roleConfig = getRoleColor(user.role)

                return (
                  <tr key={user._id} className="hover:bg-[#333333]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-[var(--color-primary)]" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConfig.bg} ${roleConfig.text}`}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </span>
                        {user.branch_id && (
                          <div className="text-xs text-gray-400">
                            {getBranchName(user.branch_id)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {user.mobile_number || 'N/A'}
                      </div>
                      {user.address && (
                        <div className="text-sm text-gray-400 truncate max-w-xs">
                          {user.address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === 'super_admin' ? (
                        <span className="text-xs text-emerald-400 font-medium">Full Access</span>
                      ) : (() => {
                        const count = user.page_access_v2
                          ? Object.keys(user.page_access_v2).filter(k => user.page_access_v2[k]?.view).length
                          : (user.page_access?.length || 0)
                        return count > 0
                          ? <span className="text-xs text-gray-300">{count} pages</span>
                          : <span className="text-xs text-yellow-400">Not set</span>
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
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
              {searchTerm || filterRole !== 'all' || filterBranch !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new user.'
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
          setSelectedUser(null)
          resetForm()
        }}
        title="Create New User"
        buttonText="Create User"
        loadingText="Creating..."
        onSubmit={handleSubmitCreate}
        formData={formData}
        onInputChange={handleInputChange}
        error={error}
        loading={loading}
        branches={branches}
        isEditMode={false}
        availableRoles={availableRoles}
      />

      {/* Edit User Modal */}
      <UserFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedUser(null)
          resetForm()
        }}
        title="Edit User"
        buttonText="Update User"
        loadingText="Updating..."
        onSubmit={handleSubmitEdit}
        formData={formData}
        onInputChange={handleInputChange}
        error={error}
        loading={loading}
        branches={branches}
        isEditMode={true}
        availableRoles={availableRoles}
      />

      {/* User Management Tutorial */}
      <WalkthroughOverlay
        steps={userManagementSteps}
        isVisible={showTutorial}
        onComplete={handleTutorialDone}
        onSkip={handleTutorialDone}
      />

      {/* Confirmation Dialog */}
      {showConfirmDialog && createPortal(
        <div className="fixed inset-0 z-[10001] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowConfirmDialog(false)}
            />
            <div className="relative w-full max-w-md transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] shadow-2xl transition-all z-[10002] border border-[#444444]/50">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Confirm User Update</h3>
                </div>

                <p className="text-gray-300 mb-6">
                  Are you sure you want to update this user? This action will modify the user's information and cannot be undone.
                </p>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmUpdate}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors"
                  >
                    Confirm Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}