import React, { useState, useMemo } from 'react'
import { UserPlus, Search, Filter, Plus, Clock, User, Phone, Calendar, CheckCircle, XCircle, Trash2, Play } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import AddWalkInModal from './AddWalkInModal'

export default function WalkInSection() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [dateFilter, setDateFilter] = useState('today')
  const [customDate, setCustomDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cleaningUp, setCleaningUp] = useState(false)

  // Get walk-ins data from API with filters
  const allWalkIns = useQuery(
    api.services.walkIn.getAllWalkIns,
    statusFilter === 'all' ? {} : { status: statusFilter }
  ) || []

  // Mutations
  const startWalkIn = useMutation(api.services.walkIn.startWalkIn)
  const completeWalkIn = useMutation(api.services.walkIn.completeWalkIn)
  const cancelWalkIn = useMutation(api.services.walkIn.cancelWalkIn)
  const manualCleanup = useMutation(api.services.walkIn.manualCleanupOldWalkIns)

  // Filter by date on client side
  const filteredByDate = useMemo(() => {
    let startDate, endDate

    if (dateFilter === 'today') {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      startDate = todayStart.getTime()
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)
      endDate = todayEnd.getTime()
    } else if (dateFilter === 'tomorrow') {
      const tomorrowStart = new Date()
      tomorrowStart.setDate(tomorrowStart.getDate() + 1)
      tomorrowStart.setHours(0, 0, 0, 0)
      startDate = tomorrowStart.getTime()
      const tomorrowEnd = new Date()
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
      tomorrowEnd.setHours(23, 59, 59, 999)
      endDate = tomorrowEnd.getTime()
    } else if (dateFilter === 'custom' && customDate) {
      const start = new Date(customDate)
      start.setHours(0, 0, 0, 0)
      startDate = start.getTime()
      const end = new Date(customDate)
      end.setHours(23, 59, 59, 999)
      endDate = end.getTime()
    } else {
      // Default to today if no valid date selected
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      startDate = todayStart.getTime()
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)
      endDate = todayEnd.getTime()
    }

    // Filter by date range
    return allWalkIns.filter((walkIn) => {
      return walkIn.createdAt >= startDate && walkIn.createdAt <= endDate
    })
  }, [allWalkIns, dateFilter, customDate])

  const filteredWalkIns = filteredByDate
    .filter(walkIn => {
      const matchesSearch =
        walkIn.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        walkIn.number?.includes(searchTerm) ||
        walkIn.assignedBarber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        walkIn.barber_name?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      // FIFO: Sort by queue number ascending (lower numbers = earlier in queue)
      // For same queue number, sort by createdAt ascending
      if (a.queueNumber !== b.queueNumber) {
        return a.queueNumber - b.queueNumber
      }
      return a.createdAt - b.createdAt
    })

  const stats = {
    total: filteredWalkIns.length,
    waiting: filteredWalkIns.filter(w => w.status === 'waiting').length,
    active: filteredWalkIns.filter(w => w.status === 'active').length,
    completed: filteredWalkIns.filter(w => w.status === 'completed').length,
    cancelled: filteredWalkIns.filter(w => w.status === 'cancelled').length
  }

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleStartService = async (walkInId) => {
    if (!confirm('Start serving this walk-in customer?')) return
    try {
      await startWalkIn({ walkInId })
    } catch (error) {
      alert(error.message || 'Failed to start service')
    }
  }

  const handleComplete = async (walkInId) => {
    if (!confirm('Mark this walk-in as completed?')) return
    try {
      await completeWalkIn({ walkInId })
    } catch (error) {
      alert(error.message || 'Failed to complete walk-in')
    }
  }

  const handleCancel = async (walkInId) => {
    if (!confirm('Cancel this walk-in?')) return
    try {
      await cancelWalkIn({ walkInId })
    } catch (error) {
      alert(error.message || 'Failed to cancel walk-in')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      waiting: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30',
      active: 'bg-blue-400/20 text-blue-400 border-blue-400/30',
      completed: 'bg-green-400/20 text-green-400 border-green-400/30',
      cancelled: 'bg-red-400/20 text-red-400 border-red-400/30'
    }
    return badges[status] || badges.waiting
  }

  const handleManualCleanup = async () => {
    if (!confirm('This will permanently delete all walk-ins from yesterday and older. Continue?')) return
    setCleaningUp(true)
    try {
      const result = await manualCleanup({})
      alert(result.message || 'Cleanup completed successfully')
    } catch (error) {
      alert(error.message || 'Failed to cleanup old walk-ins')
    } finally {
      setCleaningUp(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex items-center space-x-3">
          <UserPlus className="h-6 w-6 text-[var(--color-primary)]" />
          <div>
            <h3 className="text-lg font-semibold text-white">Walk-ins</h3>
            <p className="text-sm text-gray-400">Manage walk-in customers</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</p>
            </div>
            <UserPlus className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Waiting</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.waiting}</p>
            </div>
            <Clock className="h-6 w-6 text-yellow-400 opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
            </div>
            <Play className="h-6 w-6 text-blue-400 opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Completed</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-400 opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Cancelled</p>
              <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
            </div>
            <XCircle className="h-6 w-6 text-red-400 opacity-30" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex flex-col space-y-4">
          {/* Search and Add Button Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-3">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search walk-ins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleManualCleanup}
                disabled={cleaningUp}
                className="flex items-center space-x-2 px-4 py-2 bg-red-400/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                title="Delete walk-ins from yesterday and older"
              >
                <Trash2 className="h-4 w-4" />
                <span>{cleaningUp ? 'Cleaning...' : 'Cleanup Old'}</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Walk-in</span>
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              >
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>

            {/* Custom Date Picker */}
            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* Walk-ins Table */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#444444]/30">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Queue #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Assigned Barber
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#1A1A1A] divide-y divide-[#444444]/30">
              {filteredWalkIns.map((walkIn) => (
                <tr key={walkIn._id} className="hover:bg-[#333333]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {walkIn.queueNumber || '#'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {walkIn.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-white">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      {walkIn.number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {walkIn.barber_name || walkIn.assignedBarber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-white">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {formatDateTime(walkIn.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(walkIn.status)}`}>
                      {walkIn.status.charAt(0).toUpperCase() + walkIn.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {walkIn.status === 'waiting' && (
                        <>
                          <button
                            onClick={() => handleStartService(walkIn._id)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-400/20 text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-400/30 transition-colors"
                            title="Start serving this customer"
                          >
                            <Play className="h-4 w-4" />
                            <span>Start</span>
                          </button>
                          <button
                            onClick={() => handleCancel(walkIn._id)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-red-400/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/30 transition-colors"
                            title="Cancel walk-in"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                      {walkIn.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleComplete(walkIn._id)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-green-400/20 text-green-400 border border-green-400/30 rounded-lg hover:bg-green-400/30 transition-colors"
                            title="Mark as completed"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Complete</span>
                          </button>
                          <button
                            onClick={() => handleCancel(walkIn._id)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-red-400/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/30 transition-colors"
                            title="Cancel walk-in"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                      {walkIn.status === 'completed' && (
                        <span className="text-green-400 text-xs font-medium">Completed</span>
                      )}
                      {walkIn.status === 'cancelled' && (
                        <span className="text-red-400 text-xs font-medium">Cancelled</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredWalkIns.length === 0 && (
          <div className="text-center py-12">
            <UserPlus className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-white">No walk-ins found</h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding a walk-in customer.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add Walk-in Modal */}
      <AddWalkInModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  )
}
