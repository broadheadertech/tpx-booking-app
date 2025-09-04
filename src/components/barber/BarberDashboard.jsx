import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Calendar, Users, BarChart3, DollarSign, TrendingUp, Star } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import BarberBookings from './BarberBookings'
import BarberProfile from './BarberProfile'

const BarberDashboard = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')

  // Check if we're on the barber dashboard route (main dashboard only)
  const isOnBarberDashboard = location.pathname === '/barber/dashboard'

  // Early return if not on barber dashboard - prevents navigation conflicts
  if (!isOnBarberDashboard) {
    return null
  }

  // Get barber data
  const barbers = useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)
  
  // Mutation to create barber profile
  const createBarberProfile = useMutation(api.services.barbers.createBarberProfile)
  
  // Auto-create barber profile if user has barber role but no profile
  React.useEffect(() => {
    if (user?.role === 'barber' && barbers && !currentBarber && user._id) {
      createBarberProfile({ userId: user._id })
        .then(() => {
          // Profile created, data will refresh automatically
        })
        .catch((error) => {
          console.error('Failed to create barber profile:', error)
        })
    }
  }, [user, barbers, currentBarber, createBarberProfile])

  // Get bookings and transactions for overview
  const allBookings = useQuery(api.services.bookings.getAllBookings)
  const allTransactions = useQuery(api.services.transactions.getAllTransactions)

  const barberBookings = allBookings?.filter(booking => booking.barber === currentBarber?._id) || []
  const barberTransactions = allTransactions?.filter(transaction => 
    transaction.barber === currentBarber?._id && transaction.payment_status === 'completed'
  ) || []

  // Calculate today's stats
  const today = new Date().toISOString().split('T')[0]
  const todayBookings = barberBookings.filter(booking => booking.date === today)
  const todayRevenue = barberTransactions
    .filter(transaction => {
      const transactionDate = new Date(transaction.createdAt).toISOString().split('T')[0]
      return transactionDate === today
    })
    .reduce((sum, transaction) => sum + transaction.total_amount, 0)

  // Calculate this month's stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyBookings = barberBookings.filter(booking => booking.date.startsWith(thisMonth))
  const monthlyRevenue = barberTransactions
    .filter(transaction => {
      const transactionDate = new Date(transaction.createdAt).toISOString().slice(0, 7)
      return transactionDate === thisMonth
    })
    .reduce((sum, transaction) => sum + transaction.total_amount, 0)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }



  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: Users }
  ]

  const moreTabs = []

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: Users }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'bookings':
        return <BarberBookings />
      case 'profile':
        return <BarberProfile />
      default:
        return (
          <>
            {/* Mobile Welcome Section */}
            <div className="px-4 py-3 md:hidden">
              <div className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-xl p-3 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold">Welcome back!</h2>
                    <p className="text-xs opacity-90">Ready to make today amazing?</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-80">Today</div>
                    <div className="text-sm font-semibold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Header - Hidden on Mobile */}
            <div className="hidden md:block relative z-10 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-6">
                  <h1 className="text-2xl font-bold text-white">
                    Welcome back, {currentBarber?.full_name || user?.username}!
                  </h1>
                  <p className="text-gray-400 mt-1">Here's your performance overview</p>
                </div>
              </div>
            </div>

            <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8 py-4 md:py-6">


                              {/* Today's Appointments - Compact Design */}
                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Today's Appointments</h3>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-[#FF8C42]" />
                      <span className="text-xs text-[#FF8C42] font-medium">{todayBookings.length}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {todayBookings.length === 0 ? (
                      <div className="text-center py-4">
                        <Calendar className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-xs">No appointments today</p>
                        <p className="text-gray-500 text-xs">Enjoy your free time! 🎉</p>
                      </div>
                    ) : (
                      <>
                        {todayBookings.slice(0, 3).map((booking) => (
                          <div key={booking._id} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-md hover:bg-[#222222] transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-sm truncate">{booking.customer_name}</p>
                              <p className="text-xs text-gray-400 truncate">{booking.service_name}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="font-medium text-white text-xs">{booking.time}</p>
                              <p className="text-xs text-[#FF8C42]">₱{booking.price}</p>
                            </div>
                          </div>
                        ))}

                        {todayBookings.length > 3 && (
                          <button
                            onClick={() => setActiveTab('bookings')}
                            className="w-full mt-3 py-2 bg-[#FF8C42]/10 hover:bg-[#FF8C42]/20 text-[#FF8C42] rounded-lg transition-colors font-medium text-xs active:scale-95"
                          >
                            View All {todayBookings.length} Appointments →
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>




            </div>
          </>
        )
    }
  }

  if (!currentBarber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Barber Profile Not Found</h2>
          <p className="text-gray-400">Please contact admin to set up your barber profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] pb-20 md:pb-0">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(/img/pnglog.png)`,
            filter: 'brightness(0.3)'
          }}
        ></div>
      </div>
      
      {/* Mobile Header - Compact Design */}
      <div className="relative z-10 bg-gradient-to-r from-[#1A1A1A]/95 to-[#2A2A2A]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/img/tipuno_x_logo_white.avif"
                alt="TPX Barbershop Logo"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-sm font-bold text-white">Dashboard</h1>
                <p className="text-xs text-gray-400 truncate max-w-[120px]">{currentBarber?.full_name}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Today</div>
              <div className="text-sm font-semibold text-[#FF8C42]">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tab Navigation - Hidden on Mobile */}
      <div className="hidden md:block relative z-10 bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl border-b border-[#555555]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-3">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Compact Design */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#1A1A1A]/95 to-[#2A2A2A]/95 backdrop-blur-xl border-t border-[#444444]/30">
        <div className="grid grid-cols-3 gap-1 p-2">
          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg scale-95'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5 active:scale-95'
                }`}
              >
                <div className={`p-1 rounded-md ${activeTab === tab.id ? 'bg-white/20' : 'bg-transparent'}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium mt-1 truncate">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {renderContent()}
      </div>
    </div>
  )
}

export default BarberDashboard