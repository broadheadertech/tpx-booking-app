import React, { useState } from 'react'
import { Clock, User, Phone, MoreVertical, CheckCircle, Users } from 'lucide-react'

const QueueSection = () => {

  // Sample frontend data - will be replaced with real backend data later
  const [barbers] = useState([
    { id: 1, name: 'Marcus Johnson', avatar: 'MJ', color: 'bg-blue-500', status: 'available' },
    { id: 2, name: 'Sarah Williams', avatar: 'SW', color: 'bg-purple-500', status: 'busy' },
    { id: 3, name: 'David Chen', avatar: 'DC', color: 'bg-green-500', status: 'available' },
    { id: 4, name: 'Emma Davis', avatar: 'ED', color: 'bg-pink-500', status: 'busy' },
  ])

  // Sample frontend data - will be replaced with real backend data later
  // All customers (walk-ins and signed-in users) are shown in the Kanban board
  // Each barber has unique time slots for their customers
  const [walkIns] = useState([
    // Marcus Johnson's customers - mix of signed-in users (no badge) and walk-ins (badge shown)
    { id: 1, queueNumber: 1, name: 'John Smith', phone: '+1 234 567 8901', service: 'Haircut + Beard', startTime: '10:30 AM', waitTime: '15 min', status: 'active', barberId: 1, isWalkIn: false },
    { id: 2, queueNumber: 5, name: 'Mike Brown', phone: '+1 234 567 8902', service: 'Haircut', startTime: '11:00 AM', waitTime: '45 min', status: 'waiting', barberId: 1, isWalkIn: true },

    // Sarah Williams' customers - unique time slots
    { id: 3, queueNumber: 2, name: 'Lisa Anderson', phone: '+1 234 567 8903', service: 'Color Treatment', startTime: '10:45 AM', waitTime: '30 min', status: 'active', barberId: 2, isWalkIn: true },
    { id: 4, queueNumber: 8, name: 'Kate Wilson', phone: '+1 234 567 8904', service: 'Styling', startTime: '11:30 AM', waitTime: '1h 15min', status: 'waiting', barberId: 2, isWalkIn: false },

    // David Chen's customers
    { id: 5, queueNumber: 3, name: 'Tom Martinez', phone: '+1 234 567 8905', service: 'Haircut + Fade', startTime: '11:15 AM', waitTime: '1h', status: 'waiting', barberId: 3, isWalkIn: false },

    // Emma Davis' customers - unique time slots
    { id: 6, queueNumber: 4, name: 'Amy Taylor', phone: '+1 234 567 8906', service: 'Blow Dry', startTime: '11:15 AM', waitTime: '1h', status: 'waiting', barberId: 4, isWalkIn: true },
    { id: 7, queueNumber: 9, name: 'Rachel Green', phone: '+1 234 567 8907', service: 'Haircut', startTime: '12:00 PM', waitTime: '1h 45min', status: 'waiting', barberId: 4, isWalkIn: true },
  ])


  const getCustomersByBarber = (barberId) => {
    return walkIns.filter(w => w.barberId === barberId)
  }


  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-400 bg-blue-400/20">
          Active
        </span>
      case 'waiting':
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
    if (num <= 3) return 'bg-green-500'
    if (num <= 7) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getBarberName = (barberId) => {
    const barber = barbers.find(b => b.id === barberId)
    return barber?.name || 'Unassigned'
  }

  const getCustomerTypeLabel = (customer) => {
    if (customer.isWalkIn) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-orange-400 bg-orange-400/20 border border-orange-400/30">
        Walk-in
      </span>
    }
    return null
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
              <p className="text-2xl font-bold text-[var(--color-primary)]">{walkIns.length}</p>
            </div>
            <Users className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-blue-400">{walkIns.filter(w => w.status === 'active').length}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-blue-400 opacity-30" />
          </div>
        </div>
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Waiting</p>
              <p className="text-2xl font-bold text-yellow-400">{walkIns.filter(w => w.status === 'waiting').length}</p>
            </div>
            <Clock className="h-6 w-6 text-yellow-400 opacity-30" />
          </div>
        </div>
      </div>

      {/* Kanban Board - Barber Queues */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
        <div className="bg-[#0A0A0A] px-6 py-3 border-b border-[#444444]/30">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Barber Queues</h3>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
            {barbers.map((barber) => {
              const customers = getCustomersByBarber(barber.id)

              return (
                <div key={barber.id} className="flex-shrink-0 w-72">
                  {/* Barber Header */}
                  <div className={`${barber.color} rounded-t-lg px-4 py-3`}>
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
                      <span>{customers.length} customers</span>
                      <span>{customers.filter(c => c.status === 'active').length} active</span>
                    </div>
                  </div>

                  {/* Customer Cards */}
                  <div className="bg-[#252525] rounded-b-lg p-3 space-y-2 min-h-[180px]">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className="bg-[#1A1A1A] rounded-lg p-4 border border-[#444444]/30 hover:bg-[#333333]/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center ${getQueueNumberColor(customer.queueNumber).replace('bg-', 'bg-')}/20`}>
                              <span className="text-white font-bold text-sm">{customer.queueNumber}</span>
                            </div>
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
                            <span>{customer.startTime}</span>
                          </div>
                          {getStatusBadge(customer.status)}
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#444444]/30 flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <Phone className="h-4 w-4" />
                            <span>{customer.phone}</span>
                          </div>
                          <span className="text-yellow-400">{customer.waitTime}</span>
                        </div>
                      </div>
                    ))}

                    {customers.length === 0 && (
                      <div className="text-center py-10 text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No customers assigned</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}

export default QueueSection
