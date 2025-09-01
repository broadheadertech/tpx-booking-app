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
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-white">Income Dashboard</h1>
            <p className="text-gray-400 mt-1">Track your earnings and financial performance</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Period Filter */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-[#FF8C42]" />
              <span className="font-semibold text-white">Period:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {['week', 'month', 'year', 'custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white'
                      : 'bg-[#444444] text-gray-300 hover:bg-[#555555]'
                  }`}
                >
                  {period === 'custom' ? 'Custom' : period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            {selectedPeriod === 'custom' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
              />
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total Earnings</p>
                <p className="text-2xl font-bold text-[#FF8C42]">{formatCurrency(totalEarnings)}</p>
                <p className="text-xs text-gray-400 mt-1">{getPeriodLabel()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-[#FF8C42] opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total Bookings</p>
                <p className="text-2xl font-bold text-[#FF8C42]">{totalBookings}</p>
                <p className="text-xs text-gray-400 mt-1">{getPeriodLabel()}</p>
              </div>
              <Calendar className="w-8 h-8 text-[#FF8C42] opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Avg per Booking</p>
                <p className="text-2xl font-bold text-[#FF8C42]">{formatCurrency(averagePerBooking)}</p>
                <p className="text-xs text-gray-400 mt-1">{getPeriodLabel()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#FF8C42] opacity-30" />
            </div>
          </div>
        </div>

        {/* Top Services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Top Services</h3>
              <BarChart3 className="w-5 h-5 text-[#FF8C42]" />
            </div>
            
            <div className="space-y-3">
              {topServices.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No services data available</p>
              ) : (
                topServices.map(([service, earnings], index) => (
                  <div key={service} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B]' :
                        index === 1 ? 'bg-gray-500' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-white">{service}</span>
                    </div>
                    <span className="font-bold text-[#FF8C42]">{formatCurrency(earnings)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Daily Earnings Chart */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Daily Earnings</h3>
              <TrendingUp className="w-5 h-5 text-[#FF8C42]" />
            </div>
            
            <div className="space-y-2">
              {Object.keys(dailyEarnings).length === 0 ? (
                <p className="text-gray-400 text-center py-4">No earnings data available</p>
              ) : (
                Object.entries(dailyEarnings)
                  .sort(([a], [b]) => new Date(b) - new Date(a))
                  .slice(0, 7)
                  .map(([date, earnings]) => (
                    <div key={date} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                      <span className="text-sm font-medium text-gray-300">{formatDate(date)}</span>
                      <span className="font-bold text-[#FF8C42]">{formatCurrency(earnings)}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{showDetails ? 'Hide' : 'Show'} Details</span>
            </button>
          </div>

          {showDetails && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTransactions.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No transactions found</p>
              ) : (
                filteredTransactions
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 20)
                  .map((transaction) => (
                    <div key={transaction._id} className="p-4 bg-[#1A1A1A] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">
                          {transaction.customer_name || 'Walk-in Customer'}
                        </span>
                        <span className="font-bold text-[#FF8C42]">
                          {formatCurrency(transaction.total_amount)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        <p>Services: {transaction.services.map(s => s.service_name).join(', ')}</p>
                        <p>Date: {formatDate(transaction.createdAt)}</p>
                        <p>Payment: {transaction.payment_method.replace('_', ' ').toUpperCase()}</p>
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