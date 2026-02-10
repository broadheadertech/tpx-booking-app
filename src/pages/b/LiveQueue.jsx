import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Clock, Users, User, Scissors, ArrowLeft } from 'lucide-react'

const formatTime = (timeString) => {
  if (!timeString) return null
  try {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return timeString
  }
}

function LiveQueue() {
  const { slug } = useParams()

  // Resolve slug → branch
  const branch = useQuery(api.services.branchProfile.getBySlug, slug ? { slug } : 'skip')

  // Fetch public queue data
  const queueData = useQuery(
    api.services.mainQueue.getPublicQueue,
    branch?._id ? { branch_id: branch._id } : 'skip'
  )

  // Loading
  if (branch === undefined || queueData === undefined) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mx-auto" />
          <p className="mt-3 text-gray-400">Loading queue...</p>
        </div>
      </div>
    )
  }

  // Branch not found
  if (!branch) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Scissors className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Branch Not Found</h1>
          <p className="text-gray-400 mb-4">This branch doesn't exist or is currently inactive.</p>
          <Link to="/" className="text-[var(--color-primary)] hover:underline text-sm">
            Go to homepage
          </Link>
        </div>
      </div>
    )
  }

  const stats = queueData?.stats || { totalCustomers: 0, active: 0, waiting: 0, totalBarbers: 0 }
  const barberQueues = queueData?.queueByBarber || []

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={`/b/${slug}`}
                className="p-2 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">{queueData?.branch_name || branch.name}</h1>
                <p className="text-sm text-gray-400">Live Queue</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-full">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.totalCustomers}</p>
            <p className="text-xs text-gray-400 mt-1">In Queue</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
            <p className="text-xs text-gray-400 mt-1">Being Served</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.waiting}</p>
            <p className="text-xs text-gray-400 mt-1">Waiting</p>
          </div>
        </div>

        {/* Queue by Barber */}
        {barberQueues.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8 text-center">
            <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No barbers available right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barberQueues.map((bq) => (
              <div
                key={bq.barberId}
                className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden"
              >
                {/* Barber Header */}
                <div className={`${bq.barberColor} px-4 py-3`}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                      {bq.barberAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">{bq.barberName}</h3>
                      <p className="text-white/70 text-xs">
                        {bq.stats.active > 0
                          ? `Serving ${bq.stats.active} customer`
                          : bq.stats.waiting > 0
                          ? `${bq.stats.waiting} waiting`
                          : 'Available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer List */}
                <div className="p-3 space-y-2 min-h-[100px]">
                  {bq.customers.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <User className="h-6 w-6 mx-auto mb-1 opacity-40" />
                      <p className="text-xs">No customers in queue</p>
                    </div>
                  ) : (
                    bq.customers.map((customer) => {
                      const isActive =
                        customer.status === 'active' ||
                        customer.status === 'confirmed' ||
                        customer.status === 'booked'

                      return (
                        <div
                          key={customer.id}
                          className={`rounded-lg p-3 border ${
                            isActive
                              ? 'bg-blue-500/10 border-blue-500/30'
                              : 'bg-[#0A0A0A] border-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center text-xs font-bold text-gray-300">
                                {customer.position}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {customer.firstName}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{customer.service}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {customer.startTime && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {customer.startTime}
                                </span>
                              )}
                              {isActive ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-400">
                                  Serving
                                </span>
                              ) : customer.isWalkIn ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-400/20 text-orange-400">
                                  Walk-in
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-400/20 text-green-400">
                                  Booked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 border-t border-[#2A2A2A]">
          <p className="text-gray-500 text-sm">
            Queue updates automatically in real-time
          </p>
          <Link
            to={`/b/${slug}`}
            className="inline-block mt-2 text-[var(--color-primary)] hover:underline text-sm font-medium"
          >
            Book online or visit our branch page
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LiveQueue
