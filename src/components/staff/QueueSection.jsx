import React, { useState } from 'react'
import { Clock, User, Phone, MoreVertical, CheckCircle, Users } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const QueueSection = () => {
  const { user } = useAuth()
  const branchId = user?.branch_id

  // Fetch main queue data from backend
  const mainQueueData = useQuery(
    api.services.mainQueue.getMainQueue,
    branchId ? { branch_id: branchId } : 'skip'
  )

  // Loading state
  const isLoading = mainQueueData === undefined

  // Sample barbers data for fallback (when no data or for development)
  const sampleBarbers = [
    { id: 1, name: 'Marcus Johnson', avatar: 'MJ', color: 'bg-blue-500', status: 'available' },
    { id: 2, name: 'Sarah Williams', avatar: 'SW', color: 'bg-purple-500', status: 'busy' },
    { id: 3, name: 'David Chen', avatar: 'DC', color: 'bg-green-500', status: 'available' },
    { id: 4, name: 'Emma Davis', avatar: 'ED', color: 'bg-pink-500', status: 'busy' },
  ]

  // Use real data if available, otherwise use sample data
  const barbers = mainQueueData?.queueByBarber?.map(bq => ({
    id: bq.barberId,
    name: bq.barberName,
    avatar: bq.barberAvatar,
    color: bq.barberColor,
    status: bq.barberStatus,
  })) || sampleBarbers

  const allCustomers = mainQueueData?.allCustomers || []
  const stats = mainQueueData?.stats || {
    totalCustomers: 0,
    totalSignedIn: 0,
    totalWalkIns: 0,
    active: 0,
    waiting: 0,
    totalBarbers: 0,
    availableBarbers: 0,
  }

  const getCustomersByBarber = (barberId) => {
    if (mainQueueData?.queueByBarber) {
      const barberQueue = mainQueueData.queueByBarber.find(bq => bq.barberId === barberId)
      return barberQueue?.customers || []
    }
    return []
  }

  const getBarberStats = (barberId) => {
    if (mainQueueData?.queueByBarber) {
      const barberQueue = mainQueueData.queueByBarber.find(bq => bq.barberId === barberId)
      return barberQueue?.stats || { total: 0, active: 0, waiting: 0, signedIn: 0, walkIns: 0 }
    }
    return { total: 0, active: 0, waiting: 0, signedIn: 0, walkIns: 0 }
  }

  const getBarberConflicts = (barberId) => {
    if (mainQueueData?.queueByBarber) {
      const barberQueue = mainQueueData.queueByBarber.find(bq => bq.barberId === barberId)
      return barberQueue?.conflicts || []
    }
    return []
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
      case 'confirmed':
      case 'booked':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-400 bg-blue-400/20">
          Active
        </span>
      case 'waiting':
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-yellow-400 bg-yellow-400/20">
          Waiting
        </span>
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-400 bg-green-400/20">
          Completed
        </span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-400 bg-gray-400/20">
          {status}
        </span>
    }
  }

  const getQueueNumberColor = (num) => {
    if (num === null || num === undefined) return 'bg-gray-500'
    if (num <= 3) return 'bg-green-500'
    if (num <= 7) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getCustomerTypeLabel = (customer) => {
    if (customer.isWalkIn) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-orange-400 bg-orange-400/20 border border-orange-400/30">
        Walk-in
      </span>
    }
    return null
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return timeString
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading queue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
              <User className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Live Queue</h3>
              <p className="text-sm text-gray-400">Real-time queue management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-blue-400/20 border border-blue-400/30 px-3 py-1.5 rounded-lg">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-blue-400 text-sm font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Queue</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.totalCustomers}</p>
            </div>
            <Users className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-blue-400 opacity-30" />
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
      </div>

      {/* Kanban Board - Barber Queues */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
        <div className="bg-[#0A0A0A] px-6 py-3 border-b border-[#444444]/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Barber Queues</h3>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-400">Signed-in: {stats.totalSignedIn}</span>
            <span className="text-gray-400">Walk-ins: {stats.totalWalkIns}</span>
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
            {barbers.map((barber) => {
              const customers = getCustomersByBarber(barber.id)
              const barberStats = getBarberStats(barber.id)
              const conflicts = getBarberConflicts(barber.id)

              return (
                <div key={barber.id} className="flex-shrink-0 w-72">
                  {/* Barber Header */}
                  <div className={`${barber.color} rounded-t-lg px-4 py-3 relative`}>
                    {conflicts.length > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                        {barber.avatar}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{barber.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`h-2 w-2 rounded-full ${barber.status === 'available' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                          <span className="text-white/90 text-xs capitalize">{barber.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-white/90 text-xs">
                      <span>{barberStats.total} customers</span>
                      <span>{barberStats.active} active</span>
                    </div>
                    {(barberStats.signedIn > 0 || barberStats.walkIns > 0) && (
                      <div className="mt-2 flex items-center space-x-3 text-xs text-white/80">
                        {barberStats.signedIn > 0 && <span>♦ {barberStats.signedIn} signed-in</span>}
                        {barberStats.walkIns > 0 && <span>• {barberStats.walkIns} walk-ins</span>}
                      </div>
                    )}
                  </div>

                  {/* Customer Cards */}
                  <div className="bg-[#252525] rounded-b-lg p-3 space-y-2 min-h-[180px]">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`bg-[#1A1A1A] rounded-lg p-4 border ${customer.hasTimeConflict ? 'border-red-500/50' : 'border-[#444444]/30'} hover:bg-[#333333]/50 transition-all`}
                      >
                        {customer.hasTimeConflict && (
                          <div className="mb-2 text-xs text-red-400 font-medium">
                            ⚠️ Time conflict: {formatTime(customer.time)}
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {customer.queueNumber && (
                              <div className={`flex-shrink-0 h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center ${getQueueNumberColor(customer.queueNumber).replace('bg-', 'bg-')}/20`}>
                                <span className="text-white font-bold text-sm">{customer.queueNumber}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-sm font-medium text-white truncate">{customer.name}</h5>
                                {getCustomerTypeLabel(customer)}
                              </div>
                              <p className="text-sm text-gray-400 truncate">{customer.service}</p>
                            </div>
                          </div>
                          <button className="text-gray-400 hover:text-white flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>{customer.startTime || 'Waiting'}</span>
                          </div>
                          {getStatusBadge(customer.status)}
                        </div>

                        {customer.phone && (
                          <div className="mt-2 pt-2 border-t border-[#444444]/30 flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2 text-gray-400">
                              <Phone className="h-4 w-4" />
                              <span>{customer.phone}</span>
                            </div>
                            {customer.waitTime && <span className="text-yellow-400">{customer.waitTime}</span>}
                          </div>
                        )}

                        {customer.servicePrice > 0 && (
                          <div className="mt-2 text-sm text-gray-400">
                            Price: ₱{customer.servicePrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}

                    {customers.length === 0 && (
                      <div className="text-center py-10 text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No customers assigned</p>
                      </div>
                    )}

                    {conflicts.length > 0 && (
                      <div className="mt-2 p-2 bg-red-400/10 border border-red-400/30 rounded text-xs text-red-400">
                        <div className="font-medium mb-1">Time Conflicts:</div>
                        {conflicts.map((conflict, idx) => (
                          <div key={idx} className="text-gray-400">
                            {conflict.time}: {conflict.count} customers
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {!branchId && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-center">
          <p className="text-yellow-400">No branch assigned. Please assign a branch to view the queue.</p>
        </div>
      )}
    </div>
  )
}

export default QueueSection
