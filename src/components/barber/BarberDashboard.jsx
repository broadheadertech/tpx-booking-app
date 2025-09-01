import React, { useState, useRef, useEffect } from 'react'
import { Calendar, DollarSign, TrendingUp, Users, Star, Clock, Award, BarChart3, MoreHorizontal, ChevronUp } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import BarberBookings from './BarberBookings'
import BarberIncome from './BarberIncome'
import BarberAnalytics from './BarberAnalytics'
import BarberProfile from './BarberProfile'
import BarberSchedule from './BarberSchedule'
import BarberServices from './BarberServices'

const BarberDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)
  const moreDropdownRef = useRef(null)

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

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setShowMoreDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'income', label: 'Income', icon: DollarSign }
  ]

  const moreTabs = [
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'services', label: 'Services', icon: Award },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: Users }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'income', label: 'Income', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'services', label: 'Services', icon: Award },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'profile', label: 'Profile', icon: Users }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'bookings':
        return <BarberBookings />
      case 'income':
        return <BarberIncome />
      case 'analytics':
        return <BarberAnalytics />
      case 'profile':
        return <BarberProfile />
      case 'schedule':
        return <BarberSchedule />
      case 'services':
        return <BarberServices />
      default:
        return (
          <div className="min-h-screen">
            {/* Mobile Welcome Section */}
            <div className="px-4 py-4 md:hidden">
              <div className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-2xl p-4 text-white">
                <h2 className="text-lg font-bold mb-1">Welcome back!</h2>
                <p className="text-sm opacity-90">Ready to make today amazing?</p>
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
              {/* Quick Stats - Mobile Optimized */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 active:scale-95 transition-transform">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-2 md:mb-0">
                      <p className="text-xs md:text-sm font-medium text-gray-300">Today's Bookings</p>
                      <p className="text-xl md:text-2xl font-bold text-[#FF8C42]">{todayBookings.length}</p>
                    </div>
                    <Calendar className="w-6 h-6 md:w-8 md:h-8 text-[#FF8C42] opacity-30 self-end md:self-auto" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 active:scale-95 transition-transform">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-2 md:mb-0">
                      <p className="text-xs md:text-sm font-medium text-gray-300">Today's Revenue</p>
                      <p className="text-lg md:text-2xl font-bold text-[#FF8C42]">{formatCurrency(todayRevenue)}</p>
                    </div>
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-[#FF8C42] opacity-30 self-end md:self-auto" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 active:scale-95 transition-transform">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-2 md:mb-0">
                      <p className="text-xs md:text-sm font-medium text-gray-300">Monthly</p>
                      <p className="text-xl md:text-2xl font-bold text-[#FF8C42]">{monthlyBookings.length}</p>
                    </div>
                    <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-[#FF8C42] opacity-30 self-end md:self-auto" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 active:scale-95 transition-transform">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-2 md:mb-0">
                      <p className="text-xs md:text-sm font-medium text-gray-300">Rating</p>
                      <p className="text-xl md:text-2xl font-bold text-[#FF8C42]">{currentBarber?.rating || 0}/5</p>
                    </div>
                    <Star className="w-6 h-6 md:w-8 md:h-8 text-[#FF8C42] opacity-30 self-end md:self-auto" />
                  </div>
                </div>
              </div>

              {/* Today's Appointments - Mobile First */}
              <div className="space-y-4 md:space-y-6">
                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base md:text-lg font-bold text-white">Today's Appointments</h3>
                    <Calendar className="w-5 h-5 text-[#FF8C42]" />
                  </div>
                  
                  <div className="space-y-2 md:space-y-3">
                    {todayBookings.length === 0 ? (
                      <div className="text-center py-6">
                        <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No appointments today</p>
                        <p className="text-gray-500 text-xs mt-1">Enjoy your free time!</p>
                      </div>
                    ) : (
                      todayBookings.slice(0, 3).map((booking) => (
                        <div key={booking._id} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg active:bg-[#222222] transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{booking.customer_name}</p>
                            <p className="text-sm text-gray-400 truncate">{booking.service_name}</p>
                          </div>
                          <div className="text-right ml-3">
                            <p className="font-medium text-white">{booking.time}</p>
                            <p className="text-sm text-[#FF8C42]">₱{booking.price}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {todayBookings.length > 3 && (
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="w-full mt-4 py-3 text-[#FF8C42] hover:bg-[#FF8C42]/10 rounded-lg transition-colors font-medium active:scale-95"
                    >
                      View All {todayBookings.length} Appointments
                    </button>
                  )}
                </div>

                {/* Quick Actions - Mobile Optimized */}
                <div className="grid grid-cols-2 gap-3 md:hidden">
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white p-4 rounded-xl font-medium active:scale-95 transition-transform"
                  >
                    <Calendar className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">Bookings</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('income')}
                    className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 text-white p-4 rounded-xl font-medium active:scale-95 transition-transform"
                  >
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-[#FF8C42]" />
                    <span className="text-sm">Income</span>
                  </button>
                </div>

                {/* Performance Summary - Desktop Only */}
                <div className="hidden md:block bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Monthly Performance</h3>
                    <TrendingUp className="w-5 h-5 text-[#FF8C42]" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total Bookings</span>
                        <span className="font-bold text-white">{monthlyBookings.length}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total Revenue</span>
                        <span className="font-bold text-[#FF8C42]">{formatCurrency(monthlyRevenue)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Avg per Booking</span>
                        <span className="font-bold text-[#FF8C42]">
                          {formatCurrency(monthlyBookings.length > 0 ? monthlyRevenue / monthlyBookings.length : 0)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Rating</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-[#FF8C42]" />
                          <span className="font-bold text-[#FF8C42]">{currentBarber?.rating || 0}/5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors font-medium"
                  >
                    View Detailed Analytics
                  </button>
                </div>
              </div>
            </div>
          </div>
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
      
      {/* Mobile Header */}
      <div className="relative z-10 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <img 
              src="/img/tipuno_x_logo_white.avif" 
              alt="TPX Barbershop Logo" 
              className="w-16 h-16 object-contain"
            />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Dashboard</h1>
              <p className="text-sm text-gray-400 truncate">{currentBarber.full_name}</p>
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-t border-[#444444]/30">
        <div className="grid grid-cols-4 gap-1 p-2">
          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setShowMoreDropdown(false)
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <IconComponent className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium truncate">{tab.label}</span>
              </button>
            )
          })}
          
          {/* More Dropdown */}
          <div className="relative" ref={moreDropdownRef}>
            <button
              onClick={() => setShowMoreDropdown(!showMoreDropdown)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 w-full ${
                moreTabs.some(tab => tab.id === activeTab)
                  ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">More</span>
              {showMoreDropdown && (
                <ChevronUp className="w-3 h-3 absolute -top-1 right-1" />
              )}
            </button>
            
            {/* Dropdown Menu */}
            {showMoreDropdown && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl shadow-xl border border-[#444444]/50 py-2 backdrop-blur-xl">
                {moreTabs.map((tab) => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setShowMoreDropdown(false)
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
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