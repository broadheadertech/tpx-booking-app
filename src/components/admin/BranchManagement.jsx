import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Building, MapPin, Phone, Mail, CheckCircle, XCircle, AlertCircle, Search, Filter, Plus, Edit, Trash2, RotateCcw, Eye, Users, Calendar, Wallet, DollarSign, TrendingUp } from 'lucide-react'
import BranchFormModal from './BranchFormModal'
import { formatErrorForDisplay } from '../../utils/errorHandler'

export default function BranchManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    booking_start_hour: 10,
    booking_end_hour: 20
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Queries
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const branchFinancials = useQuery(api.services.branchWallet.getAllBranchFinancials) || {}

  // Mutations
  const createBranch = useMutation(api.services.branches.createBranch)
  const updateBranch = useMutation(api.services.branches.updateBranch)
  const toggleBranchStatus = useMutation(api.services.branches.toggleBranchStatus)

  const getStatusConfig = (isActive) => {
    return isActive ? {
      label: 'Active',
      icon: CheckCircle,
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      iconColor: 'text-green-500'
    } : {
      label: 'Inactive',
      icon: XCircle,
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      iconColor: 'text-red-500'
    }
  }

  const filteredBranches = branches
    .filter(branch => {
      const matchesSearch = 
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.branch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.address.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === 'all' || 
        (filterStatus === 'active' && branch.is_active) ||
        (filterStatus === 'inactive' && !branch.is_active)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'code') return a.branch_code.localeCompare(b.branch_code)
      if (sortBy === 'status') return b.is_active - a.is_active
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  const stats = {
    total: branches.length,
    active: branches.filter(b => b.is_active).length,
    inactive: branches.filter(b => !b.is_active).length,
    recent: branches.filter(b => {
      const createdDate = new Date(b.createdAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return createdDate >= weekAgo
    }).length,
    totalRevenue: Object.values(branchFinancials).reduce((sum, f) => sum + (f?.totalRevenue || 0), 0),
    totalWalletBalance: Object.values(branchFinancials).reduce((sum, f) => sum + (f?.walletBalance || 0), 0),
    totalTransactions: Object.values(branchFinancials).reduce((sum, f) => sum + (f?.transactionCount || 0), 0),
  }

  const formatPeso = (amount) => `₱${(amount || 0).toLocaleString()}`

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      booking_start_hour: 10,
      booking_end_hour: 20
    })
    setError('')
  }

  const handleCreate = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleEdit = (branch) => {
    setSelectedBranch(branch)
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      booking_start_hour: branch.booking_start_hour ?? 10,
      booking_end_hour: branch.booking_end_hour ?? 20
    })
    setShowEditModal(true)
  }

  const handleSubmitCreate = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setError('All fields are required')
      return
    }

    setLoading(true)
    setError('')
    try {
      await createBranch(formData)
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating branch:', error)
      const formattedError = formatErrorForDisplay(error)
      setError(formattedError.details || formattedError.message || 'Failed to create branch')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setError('All fields are required')
      return
    }

    setLoading(true)
    setError('')
    try {
      await updateBranch({
        id: selectedBranch._id,
        ...formData
      })
      setShowEditModal(false)
      setSelectedBranch(null)
      resetForm()
    } catch (error) {
      console.error('Error updating branch:', error)
      const formattedError = formatErrorForDisplay(error)
      setError(formattedError.details || formattedError.message || 'Failed to update branch')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (branchId) => {
    setLoading(true)
    setError('')
    try {
      await toggleBranchStatus({ id: branchId })
    } catch (error) {
      console.error('Error toggling branch status:', error)
      const formattedError = formatErrorForDisplay(error)
      setError(formattedError.details || formattedError.message || 'Failed to update branch status')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    // Convert numeric fields to numbers (HTML inputs return strings)
    const numericFields = ['booking_start_hour', 'booking_end_hour']
    const finalValue = numericFields.includes(name) ? Number(value) : value
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }))
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }


  if (!branches) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        <span className="ml-2 text-gray-400">Loading branches...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Branches</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</p>
            </div>
            <Building className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Inactive</p>
              <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Revenue</p>
              <p className="text-xl font-bold text-green-400">{formatPeso(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Transactions</p>
              <p className="text-2xl font-bold text-blue-400">{stats.totalTransactions.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-blue-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Wallet Balance</p>
              <p className="text-xl font-bold text-blue-400">{formatPeso(stats.totalWalletBalance)}</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-400 opacity-30" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search branches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="code">Sort by Code</option>
              <option value="status">Sort by Status</option>
              <option value="date">Sort by Date</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Branch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Branches Table */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#444444]/30">
            <thead className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] divide-y divide-[#444444]/30">
              {filteredBranches.map((branch) => {
                const statusConfig = getStatusConfig(branch.is_active)
                const StatusIcon = statusConfig.icon
                const fin = branchFinancials[branch._id]

                return (
                  <tr key={branch._id} className="hover:bg-[#333333]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
                            <Building className="h-5 w-5 text-[var(--color-primary)]" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {branch.name}
                          </div>
                          <div className="text-sm font-mono text-gray-400">
                            #{branch.branch_code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-white">
                          <MapPin className="h-3 w-3 text-gray-500 mr-2 flex-shrink-0" />
                          <span className="truncate">{branch.address}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                          <Phone className="h-3 w-3 text-gray-500 mr-2 flex-shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                          <Mail className="h-3 w-3 text-gray-500 mr-2 flex-shrink-0" />
                          <span>{branch.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className={`-ml-0.5 mr-1.5 h-3 w-3 ${statusConfig.iconColor}`} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-400">
                        {formatPeso(fin?.totalRevenue || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {fin?.completedTransactions || 0} completed
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-white">
                        {(fin?.transactionCount || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-bold ${(fin?.walletBalance || 0) > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                        {formatPeso(fin?.walletBalance || 0)}
                      </div>
                      {(fin?.walletHeldBalance || 0) > 0 && (
                        <div className="text-xs text-yellow-400">
                          {formatPeso(fin.walletHeldBalance)} held
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleStatus(branch._id)}
                          className={`inline-flex items-center px-2.5 py-1.5 border text-xs font-medium rounded transition-colors ${
                            branch.is_active
                              ? 'border-red-500/30 text-red-400 bg-red-400/20 hover:bg-red-400/30'
                              : 'border-green-500/30 text-green-400 bg-green-400/20 hover:bg-green-400/30'
                          }`}
                          disabled={loading}
                        >
                          {branch.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEdit(branch)}
                          className="text-blue-400 hover:text-blue-300"
                          disabled={loading}
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

        {filteredBranches.length === 0 && (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-white">No branches found</h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new branch.'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  New Branch
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Branch Modal */}
      <BranchFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Create New Branch"
        onSubmit={handleSubmitCreate}
        formData={formData}
        onInputChange={handleInputChange}
        error={error}
        loading={loading}
      />

      {/* Edit Branch Modal */}
      <BranchFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedBranch(null)
          resetForm()
        }}
        title="Edit Branch"
        onSubmit={handleSubmitEdit}
        formData={formData}
        onInputChange={handleInputChange}
        error={error}
        loading={loading}
        isEdit={true}
      />
    </div>
  )
}