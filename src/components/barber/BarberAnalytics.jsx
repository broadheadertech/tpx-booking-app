import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Star, Calendar, Clock, Target, Award } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const BarberAnalytics = () => {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  // Get barber data
  const barbers = useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)

  // Get all data
  const allBookings = useQuery(api.services.bookings.getAllBookings)
  const allTransactions = useQuery(api.services.transactions.getAllTransactions)
  const allServices = useQuery(api.services.services.getAllServices)

  // Filter data for this barber
  const barberBookings = allBookings?.filter(booking => booking.barber === currentBarber?._id) || []
  const barberTransactions = allTransactions?.filter(transaction => 
    transaction.barber === currentBarber?._id && transaction.payment_status === 'completed'
  ) || []

  // Calculate date ranges
  const now = new Date()
  const getDateRange = () => {
    switch (selectedPeriod) {
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        return startOfWeek
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'year':
        return new Date(now.getFullYear(), 0, 1)
      default:
        return new Date(0) // All time
    }
  }

  const startDate = getDateRange()
  const filteredBookings = barberBookings.filter(booking => 
    new Date(booking.createdAt) >= startDate
  )
  const filteredTransactions = barberTransactions.filter(transaction => 
    new Date(transaction.createdAt) >= startDate
  )

  // Calculate metrics
  const totalBookings = filteredBookings.length
  const completedBookings = filteredBookings.filter(b => b.status === 'completed').length
  const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length
  const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0
  const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0)
  const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0

  // Service performance
  const serviceStats = {}
  filteredTransactions.forEach(transaction => {
    transaction.services.forEach(service => {
      const serviceName = service.service_name
      if (!serviceStats[serviceName]) {
        serviceStats[serviceName] = {
          count: 0,
          revenue: 0,
          name: serviceName
        }
      }
      serviceStats[serviceName].count += service.quantity
      serviceStats[serviceName].revenue += service.price * service.quantity
    })
  })

  const topServices = Object.values(serviceStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Customer retention (repeat customers)
  const customerFrequency = {}
  filteredTransactions.forEach(transaction => {
    if (transaction.customer) {
      const customerId = transaction.customer
      customerFrequency[customerId] = (customerFrequency[customerId] || 0) + 1
    }
  })

  const repeatCustomers = Object.values(customerFrequency).filter(count => count > 1).length
  const totalUniqueCustomers = Object.keys(customerFrequency).length
  const retentionRate = totalUniqueCustomers > 0 ? (repeatCustomers / totalUniqueCustomers) * 100 : 0

  // Peak hours analysis
  const hourlyBookings = {}
  filteredBookings.forEach(booking => {
    const hour = booking.time.split(':')[0]
    hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1
  })

  const peakHour = Object.entries(hourlyBookings)
    .sort(([,a], [,b]) => b - a)[0]

  // Weekly performance
  const weeklyStats = {}
  filteredBookings.forEach(booking => {
    const date = new Date(booking.createdAt)
    const weekDay = date.toLocaleDateString('en-US', { weekday: 'long' })
    weeklyStats[weekDay] = (weeklyStats[weekDay] || 0) + 1
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return 'text-green-400'
    if (percentage >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getPerformanceIcon = (percentage) => {
    if (percentage >= 80) return <TrendingUp className="w-5 h-5" />
    if (percentage >= 60) return <Target className="w-5 h-5" />
    return <BarChart3 className="w-5 h-5" />
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
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
          <div className="py-4 md:py-6">
            <h1 className="text-xl md:text-2xl font-bold text-white">Performance Analytics</h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">Track your performance metrics and insights</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8 py-4 md:py-6">
        {/* Period Filter */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 mb-4 md:mb-6">
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            {['week', 'month', 'year', 'all'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 md:px-4 py-2 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base active:scale-95 ${
                  selectedPeriod === period
                    ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                    : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#333333] border border-[#555555]'
                }`}
              >
                {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Completion Rate</p>
                <p className={`text-xl md:text-2xl font-bold ${getPerformanceColor(completionRate)}`}>
                  {completionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">{completedBookings}/{totalBookings} bookings</p>
              </div>
              <div className={`p-2 md:p-3 rounded-full ${
                completionRate >= 80 ? 'bg-green-600/20 border border-green-500/30' :
                completionRate >= 60 ? 'bg-yellow-600/20 border border-yellow-500/30' : 'bg-red-600/20 border border-red-500/30'
              }`}>
                <div className={getPerformanceColor(completionRate)}>
                  {getPerformanceIcon(completionRate)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Booking Value</p>
                <p className="text-xl md:text-2xl font-bold text-green-400">{formatCurrency(averageBookingValue)}</p>
                <p className="text-xs text-gray-500 mt-1">Per completed booking</p>
              </div>
              <div className="p-2 md:p-3 bg-green-600/20 border border-green-500/30 rounded-full">
                <Target className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Customer Retention</p>
                <p className={`text-xl md:text-2xl font-bold ${getPerformanceColor(retentionRate)}`}>
                  {retentionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">{repeatCustomers} repeat customers</p>
              </div>
              <div className="p-2 md:p-3 bg-blue-600/20 border border-blue-500/30 rounded-full">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Rating</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-400">{currentBarber?.rating || 0}/5</p>
                <p className="text-xs text-gray-500 mt-1">Customer rating</p>
              </div>
              <div className="p-2 md:p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-full">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Service Performance */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-bold text-white">Top Performing Services</h3>
              <Award className="w-5 h-5 text-[#FF8C42]" />
            </div>
            
            <div className="space-y-3">
              {topServices.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No service data available</p>
              ) : (
                topServices.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-[#444444]/30">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-500' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm md:text-base">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.count} bookings</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-400 text-sm md:text-base">{formatCurrency(service.revenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-bold text-white">Weekly Performance</h3>
              <Calendar className="w-5 h-5 text-[#FF8C42]" />
            </div>
            
            <div className="space-y-3">
              {Object.keys(weeklyStats).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No weekly data available</p>
              ) : (
                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const count = weeklyStats[day] || 0
                  const maxCount = Math.max(...Object.values(weeklyStats))
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
                  
                  return (
                    <div key={day} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-[#444444]/30">
                      <span className="font-medium text-white text-sm md:text-base">{day}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 md:w-24 bg-[#444444] rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-white w-8 text-right text-sm md:text-base">{count}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Peak Hours */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-bold text-white">Peak Hours</h3>
              <Clock className="w-5 h-5 text-[#FF8C42]" />
            </div>
            
            {peakHour ? (
              <div className="text-center py-4">
                <div className="text-2xl md:text-3xl font-bold text-[#FF8C42] mb-2">
                  {peakHour[0]}:00
                </div>
                <p className="text-gray-400">Most busy hour</p>
                <p className="text-sm text-gray-500 mt-1">{peakHour[1]} bookings</p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No peak hour data available</p>
            )}
          </div>

          {/* Performance Summary */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-bold text-white">Performance Summary</h3>
              <BarChart3 className="w-5 h-5 text-[#FF8C42]" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm md:text-base">Total Bookings</span>
                <span className="font-bold text-white text-sm md:text-base">{totalBookings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm md:text-base">Completed</span>
                <span className="font-bold text-green-400 text-sm md:text-base">{completedBookings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm md:text-base">Cancelled</span>
                <span className="font-bold text-red-400 text-sm md:text-base">{cancelledBookings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm md:text-base">Cancellation Rate</span>
                <span className={`font-bold text-sm md:text-base ${getPerformanceColor(100 - cancellationRate)}`}>
                  {cancellationRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm md:text-base">Total Revenue</span>
                <span className="font-bold text-green-400 text-sm md:text-base">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarberAnalytics