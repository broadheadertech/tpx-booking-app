import React, { useState } from 'react'
import { Calendar, DollarSign, TrendingUp, Users, Star, Clock, Award, BarChart3 } from 'lucide-react'
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
          <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {currentBarber?.full_name || user?.username}!
                  </h1>
                  <p className="text-gray-600 mt-1">Here's your performance overview</p>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today's Bookings</p>
                      <p className="text-2xl font-bold text-blue-600">{todayBookings.length}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(todayRevenue)}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Bookings</p>
                      <p className="text-2xl font-bold text-purple-600">{monthlyBookings.length}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rating</p>
                      <p className="text-2xl font-bold text-yellow-600">{currentBarber?.rating || 0}/5</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Star className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Today's Appointments</h3>
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  
                  <div className="space-y-3">
                    {todayBookings.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No appointments today</p>
                    ) : (
                      todayBookings.slice(0, 5).map((booking) => (
                        <div key={booking._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{booking.customer_name}</p>
                            <p className="text-sm text-gray-600">{booking.service_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{booking.time}</p>
                            <p className="text-sm text-green-600">₱{booking.price}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {todayBookings.length > 5 && (
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="w-full mt-3 py-2 text-[#FF8C42] hover:bg-[#FF8C42]/10 rounded-lg transition-colors"
                    >
                      View All Appointments
                    </button>
                  )}
                </div>

                {/* Performance Summary */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Monthly Performance</h3>
                    <TrendingUp className="w-5 h-5 text-gray-600" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Bookings</span>
                      <span className="font-bold text-gray-900">{monthlyBookings.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Revenue</span>
                      <span className="font-bold text-green-600">{formatCurrency(monthlyRevenue)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Average per Booking</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(monthlyBookings.length > 0 ? monthlyRevenue / monthlyBookings.length : 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Customer Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-yellow-600">{currentBarber?.rating || 0}/5</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full mt-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Barber Profile Not Found</h2>
          <p className="text-gray-600">Please contact admin to set up your barber profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#FF8C42] rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Barber Dashboard</h1>
                <p className="text-sm text-gray-600">{currentBarber.full_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#FF8C42] text-white'
                      : 'text-gray-600 hover:text-[#FF8C42] hover:bg-[#FF8C42]/10'
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

      {/* Content */}
      {renderContent()}
    </div>
  )
}

export default BarberDashboard