import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Calendar, BarChart3, Download, Filter, Eye } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const BarberIncome = () => {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showDetails, setShowDetails] = useState(false)

  // Get barber data
  const barbers = useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)

  // Get transactions for this barber
  const allTransactions = useQuery(api.services.transactions.getAllTransactions)
  const barberTransactions = allTransactions?.filter(transaction => 
    transaction.barber === currentBarber?._id && transaction.payment_status === 'completed'
  ) || []

  // Calculate date ranges
  const today = new Date()
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfYear = new Date(today.getFullYear(), 0, 1)

  // Filter transactions by period
  const getFilteredTransactions = () => {
    const now = new Date()
    return barberTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt)
      
      switch (selectedPeriod) {
        case 'week':
          return transactionDate >= startOfWeek
        case 'month':
          return transactionDate >= startOfMonth
        case 'year':
          return transactionDate >= startOfYear
        case 'custom':
          const [year, month] = selectedMonth.split('-')
          return transactionDate.getFullYear() === parseInt(year) && 
                 transactionDate.getMonth() === parseInt(month) - 1
        default:
          return true
      }
    })
  }

  const filteredTransactions = getFilteredTransactions()

  // Calculate earnings
  const totalEarnings = filteredTransactions.reduce((sum, transaction) => sum + transaction.total_amount, 0)
  const totalBookings = filteredTransactions.length
  const averagePerBooking = totalBookings > 0 ? totalEarnings / totalBookings : 0

  // Calculate daily earnings for the period
  const dailyEarnings = {}
  filteredTransactions.forEach(transaction => {
    const date = new Date(transaction.createdAt).toISOString().split('T')[0]
    dailyEarnings[date] = (dailyEarnings[date] || 0) + transaction.total_amount
  })

  // Get top services
  const serviceEarnings = {}
  filteredTransactions.forEach(transaction => {
    transaction.services.forEach(service => {
      const serviceName = service.service_name
      serviceEarnings[serviceName] = (serviceEarnings[serviceName] || 0) + (service.price * service.quantity)
    })
  })

  const topServices = Object.entries(serviceEarnings)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'year': return 'This Year'
      case 'custom': return `${new Date(selectedMonth + '-01').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}`
      default: return 'All Time'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
      </div>
      
      {/* Header - Ultra Compact Mobile Design */}
      <div className="relative z-10 bg-gradient-to-r from-[#1A1A1A]/95 to-[#2A2A2A]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-white">Income</h1>
              <p className="text-xs text-gray-400">Track earnings</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Total</div>
              <div className="text-sm font-semibold text-[#FF8C42]">{formatCurrency(totalEarnings)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 py-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8 md:py-6">
        {/* Ultra Compact Period Filter */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-3 mb-4">
          <div className="flex flex-col space-y-3">
            {/* Period Label and Current Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-[#FF8C42]" />
                <span className="font-semibold text-white text-sm">Period:</span>
              </div>
              <span className="text-[#FF8C42] text-sm font-medium px-2 py-1 bg-[#FF8C42]/10 rounded">{getPeriodLabel()}</span>
            </div>

            {/* Quick Period Buttons */}
            <div className="flex flex-wrap gap-2">
              {['week', 'month', 'year', 'custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-2 rounded-lg font-medium text-xs transition-all duration-200 active:scale-95 ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-md'
                      : 'bg-[#1A1A1A] border border-[#444444] text-gray-300 hover:bg-[#333333] hover:border-[#555555]'
                  }`}
                >
                  {period === 'custom' ? 'Custom' : period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            {/* Custom Month Picker */}
            {selectedPeriod === 'custom' && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Ultra Compact Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Total Earnings */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-3 active:scale-[0.98] transition-all duration-200 hover:border-[#FF8C42]/50 hover:shadow-lg">
            <div className="text-center">
              <div className="bg-[#FF8C42]/10 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-4 h-4 text-[#FF8C42]" />
              </div>
              <p className="text-xs font-medium text-gray-400 mb-1">Earnings</p>
              <p className="text-sm font-bold text-[#FF8C42] leading-tight">{formatCurrency(totalEarnings)}</p>
              <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
            </div>
          </div>

          {/* Total Bookings */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-3 active:scale-[0.98] transition-all duration-200 hover:border-[#FF8C42]/50 hover:shadow-lg">
            <div className="text-center">
              <div className="bg-[#FF8C42]/10 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-4 h-4 text-[#FF8C42]" />
              </div>
              <p className="text-xs font-medium text-gray-400 mb-1">Bookings</p>
              <p className="text-lg font-bold text-[#FF8C42] leading-tight">{totalBookings}</p>
              <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
            </div>
          </div>

          {/* Average per Booking */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-3 active:scale-[0.98] transition-all duration-200 hover:border-[#FF8C42]/50 hover:shadow-lg">
            <div className="text-center">
              <div className="bg-[#FF8C42]/10 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-4 h-4 text-[#FF8C42]" />
              </div>
              <p className="text-xs font-medium text-gray-400 mb-1">Avg/Booking</p>
              <p className="text-sm font-bold text-[#FF8C42] leading-tight">{formatCurrency(averagePerBooking)}</p>
              <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
            </div>
          </div>
        </div>

        {/* Ultra Compact Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Top Services - Ultra Compact */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Top Services</h3>
              <div className="bg-[#FF8C42]/10 p-1.5 rounded-lg">
                <BarChart3 className="w-4 h-4 text-[#FF8C42]" />
              </div>
            </div>

            <div className="space-y-2">
              {topServices.length === 0 ? (
                <div className="text-center py-6">
                  <BarChart3 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">No services data</p>
                </div>
              ) : (
                topServices.slice(0, 3).map(([service, earnings], index) => (
                  <div key={service} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-md hover:bg-[#222222] transition-colors">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                        index === 0 ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B]' :
                        index === 1 ? 'bg-gray-500' :
                        'bg-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-white text-xs truncate">{service}</span>
                    </div>
                    <span className="font-bold text-[#FF8C42] text-xs ml-2">{formatCurrency(earnings)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Daily Earnings - Ultra Compact */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Daily Earnings</h3>
              <div className="bg-[#FF8C42]/10 p-1.5 rounded-lg">
                <TrendingUp className="w-4 h-4 text-[#FF8C42]" />
              </div>
            </div>

            <div className="space-y-2">
              {Object.keys(dailyEarnings).length === 0 ? (
                <div className="text-center py-6">
                  <TrendingUp className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">No earnings data</p>
                </div>
              ) : (
                Object.entries(dailyEarnings)
                  .sort(([a], [b]) => new Date(b) - new Date(a))
                  .slice(0, 4)
                  .map(([date, earnings]) => (
                    <div key={date} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-md hover:bg-[#222222] transition-colors">
                      <span className="text-xs font-medium text-gray-300 truncate">{formatDate(date)}</span>
                      <span className="font-bold text-[#FF8C42] text-xs ml-2">{formatCurrency(earnings)}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Ultra Compact Transactions */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-1 px-2 py-1.5 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors active:scale-95 text-xs"
            >
              <Eye className="w-3 h-3" />
              <span>{showDetails ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          {showDetails && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-6">
                  <Receipt className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">No transactions found</p>
                </div>
              ) : (
                filteredTransactions
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 8)
                  .map((transaction) => (
                    <div key={transaction._id} className="p-2 bg-[#1A1A1A] rounded-md hover:bg-[#222222] transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white text-xs truncate">
                          {transaction.customer_name || 'Walk-in Customer'}
                        </span>
                        <span className="font-bold text-[#FF8C42] text-xs ml-2">
                          {formatCurrency(transaction.total_amount)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        <p className="truncate">Services: {transaction.services.map(s => s.service_name).join(', ')}</p>
                        <p>{formatDate(transaction.createdAt)} • {transaction.payment_method.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BarberIncome