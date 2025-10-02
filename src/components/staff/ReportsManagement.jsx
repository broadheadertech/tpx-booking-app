import React, { useState, useEffect, useMemo } from 'react'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Gift, Download, Filter, RefreshCw, Scissors, Package } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const ReportsManagement = ({ onRefresh, user }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedReport, setSelectedReport] = useState('revenue')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Convex queries for real-time data - use branch-scoped queries for staff
  const bookings = user?.role === 'super_admin' 
    ? useQuery(api.services.bookings.getAllBookings)
    : user?.branch_id 
      ? useQuery(api.services.bookings.getBookingsByBranch, { branch_id: user.branch_id })
      : []
      
  const services = user?.role === 'super_admin'
    ? useQuery(api.services.services.getAllServices)
    : user?.branch_id
      ? useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id })
      : []
      
  const products = useQuery(api.services.products.getAllProducts) // Products remain global for now
  
  const transactions = user?.role === 'super_admin'
    ? useQuery(api.services.transactions.getAllTransactions)
    : user?.branch_id
      ? useQuery(api.services.transactions.getTransactionsByBranch, { branch_id: user.branch_id })
      : []
      
  const vouchers = user?.role === 'super_admin'
    ? useQuery(api.services.vouchers.getAllVouchers)
    : user?.branch_id
      ? useQuery(api.services.vouchers.getVouchersByBranch, { branch_id: user.branch_id })
      : []

  // Calculate real-time data from Convex queries
  const reportData = useMemo(() => {
    if (!bookings || !services || !products || !transactions || !vouchers) {
      return null
    }

    try {
      const now = Date.now()
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000)

      // Filter data by period
      const currentPeriodBookings = bookings.filter(b => b.createdAt >= weekAgo)
      const previousPeriodBookings = bookings.filter(b => b.createdAt >= twoWeeksAgo && b.createdAt < weekAgo)
      
      const currentPeriodTransactions = transactions.filter(t => t.createdAt >= weekAgo)
      const previousPeriodTransactions = transactions.filter(t => t.createdAt >= twoWeeksAgo && t.createdAt < weekAgo)
      
      const currentPeriodVouchers = vouchers.filter(v => v.redeemed_at && v.redeemed_at >= weekAgo)
      const previousPeriodVouchers = vouchers.filter(v => v.redeemed_at && v.redeemed_at >= twoWeeksAgo && v.redeemed_at < weekAgo)

      // Calculate revenue
      const currentRevenue = currentPeriodTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
      const previousRevenue = previousPeriodTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
      const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

      // Calculate unique customers
      const currentCustomers = new Set(currentPeriodBookings.map(b => b.customer)).size
      const previousCustomers = new Set(previousPeriodBookings.map(b => b.customer)).size
      const customersChange = previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0

      // Calculate bookings
      const currentBookingsCount = currentPeriodBookings.length
      const previousBookingsCount = previousPeriodBookings.length
      const bookingsChange = previousBookingsCount > 0 ? ((currentBookingsCount - previousBookingsCount) / previousBookingsCount) * 100 : 0

      // Calculate vouchers
      const currentVouchersCount = currentPeriodVouchers.length
      const previousVouchersCount = previousPeriodVouchers.length
      const vouchersChange = previousVouchersCount > 0 ? ((currentVouchersCount - previousVouchersCount) / previousVouchersCount) * 100 : 0

      // Generate chart data for the week
      const generateChartData = (data, valueExtractor) => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return days.map((day, index) => {
          const dayStart = weekAgo + (index * 24 * 60 * 60 * 1000)
          const dayEnd = dayStart + (24 * 60 * 60 * 1000)
          const dayData = data.filter(item => item.createdAt >= dayStart && item.createdAt < dayEnd)
          return {
            period: day,
            value: valueExtractor(dayData)
          }
        })
      }

      return {
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          change: Math.abs(revenueChange),
          trend: revenueChange >= 0 ? 'up' : 'down',
          chartData: generateChartData(currentPeriodTransactions, (data) => 
            data.reduce((sum, t) => sum + (t.total_amount || 0), 0)
          )
        },
        customers: {
          current: currentCustomers,
          previous: previousCustomers,
          change: Math.abs(customersChange),
          trend: customersChange >= 0 ? 'up' : 'down',
          chartData: generateChartData(currentPeriodBookings, (data) => 
            new Set(data.map(b => b.customer)).size
          )
        },
        bookings: {
          current: currentBookingsCount,
          previous: previousBookingsCount,
          change: Math.abs(bookingsChange),
          trend: bookingsChange >= 0 ? 'up' : 'down',
          chartData: generateChartData(currentPeriodBookings, (data) => data.length)
        },
        vouchers: {
          current: currentVouchersCount,
          previous: previousVouchersCount,
          change: Math.abs(vouchersChange),
          trend: vouchersChange >= 0 ? 'up' : 'down',
          chartData: generateChartData(currentPeriodVouchers, (data) => data.length)
        },
        services: {
          current: services?.filter(s => s.is_active).length || 0,
          previous: services?.length || 0,
          change: 0,
          trend: 'up',
          chartData: services?.slice(0, 7).map((service, index) => ({
            period: service.name.substring(0, 8),
            value: service.price || 0
          })) || []
        },
        products: {
          current: products?.filter(p => p.status === 'active').length || 0,
          previous: products?.length || 0,
          change: 0,
          trend: 'up',
          chartData: products?.slice(0, 7).map((product, index) => ({
            period: product.name.substring(0, 8),
            value: product.price || 0
          })) || []
        }
      }
    } catch (err) {
      console.error('Error calculating report data:', err)
      setError('Failed to calculate report data')
      return null
    }
  }, [bookings, services, products, transactions, vouchers, selectedPeriod])

  // Auto-refresh effect
  useEffect(() => {
    if (reportData && onRefresh) {
      // Data is loaded and ready
      setLoading(false)
    }
  }, [reportData, onRefresh])

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true)
    setError(null)
    onRefresh?.()
  }

  const reportTypes = [
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'customers', label: 'Customers', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { id: 'bookings', label: 'Bookings', icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { id: 'vouchers', label: 'Vouchers', icon: Gift, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    { id: 'services', label: 'Services', icon: Scissors, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
    { id: 'products', label: 'Products', icon: Package, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' }
  ]

  const periods = [
    { id: 'day', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Handle loading and error states
  if (!reportData) {
    if (error) {
      return (
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <div className="text-center">
              <div className="text-red-400 mb-2">⚠️ Error Loading Data</div>
              <p className="text-gray-300">{error}</p>
              <button 
                onClick={() => { setError(null); onRefresh?.() }}
                className="mt-4 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="space-y-6">
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-3 border-[#FF8C42] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-300">Loading report data...</p>
          </div>
        </div>
      </div>
    )
  }

  const currentData = reportData[selectedReport]
  const maxValue = currentData?.chartData ? Math.max(...currentData.chartData.map(d => d.value)) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-white">Reports & Analytics</h2>
          <p className="text-gray-300 mt-1">Track your business performance and insights</p>
        </div>
        
        <div className="flex items-center space-x-3">
           <button
             onClick={handleRefresh}
             disabled={loading}
             className="flex items-center space-x-2 px-4 py-2 bg-[#1A1A1A] border border-[#444444] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
             <span>{loading ? 'Loading...' : 'Refresh'}</span>
           </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 text-sm">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Period:</span>
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
            >
              {periods.map(period => (
                <option key={period.id} value={period.id} className="bg-[#1A1A1A] text-white">{period.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Type Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {reportTypes.map((type) => {
          const IconComponent = type.icon
          const data = reportData[type.id]
          const isSelected = selectedReport === type.id
          
          return (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`p-6 rounded-lg border transition-all duration-200 text-left ${
                isSelected
                  ? `bg-[#1A1A1A] border-[#FF8C42] shadow-lg transform scale-105`
                  : 'bg-[#1A1A1A] border-[#2A2A2A]/50 hover:border-[#FF8C42]/50 hover:shadow-lg'
              }`}
            >
                <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${
                  isSelected ? 'bg-[#FF8C42]/20' : 'bg-[#1A1A1A]'
                }`}>
                  <IconComponent className={`h-6 w-6 ${
                    isSelected ? 'text-[#FF8C42]' : 'text-[#FF8C42] opacity-70'
                  }`} />
                </div>
                {data.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-300">{type.label}</p>
                <p className="text-2xl font-bold text-[#FF8C42]">
                  {type.id === 'revenue' ? formatCurrency(data.current) : formatNumber(data.current)}
                </p>
                <p className={`text-xs font-medium ${
                  data.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {data.trend === 'up' ? '+' : '-'}{data.change}% from last {selectedPeriod}
                </p>
              </div>
            </button>
          )
        })}
      </div>

        {/* Chart Section */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {reportTypes.find(t => t.id === selectedReport)?.label} Trend
            </h3>
            <p className="text-sm text-gray-300">Performance over the selected period</p>
          </div>
        </div>

        {/* Simple Bar Chart */}
         <div className="space-y-4">
           {currentData.chartData.map((item, index) => {
             const percentage = (item.value / maxValue) * 100
             const isServiceOrProduct = selectedReport === 'services' || selectedReport === 'products'
             return (
               <div key={index} className="flex items-center space-x-4">
                 <div className={`${isServiceOrProduct ? 'w-20' : 'w-12'} text-sm font-medium text-gray-300 truncate`} title={item.period}>
                   {item.period}
                 </div>
                 <div className="flex-1 bg-[#1A1A1A] rounded-full h-6 relative overflow-hidden">
                   <div
                     className="h-full bg-gradient-to-r from-[#FF8C42] to-[#FF8C42]/80 rounded-full transition-all duration-1000 ease-out"
                     style={{ width: `${percentage}%` }}
                   />
                   <div className="absolute inset-0 flex items-center justify-end pr-3">
                     <span className="text-xs font-medium text-white">
                       {(selectedReport === 'revenue' || isServiceOrProduct) ? formatCurrency(item.value) : formatNumber(item.value)}
                     </span>
                   </div>
                 </div>
               </div>
             )
           })}
         </div>
      </div>

       {/* Detailed Data Table */}
       <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
         <div className="flex items-center justify-between mb-6">
           <div>
             <h3 className="text-lg font-semibold text-white">
               {reportTypes.find(t => t.id === selectedReport)?.label} Detailed Data
             </h3>
             <p className="text-sm text-gray-300">Comprehensive breakdown of {selectedReport} metrics</p>
           </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#444444]/50">
                  <th className="text-left py-4 px-4 font-medium text-gray-300">
                    {selectedReport === 'services' || selectedReport === 'products' ? 'Item' : 'Period'}
                  </th>
                  <th className="text-right py-4 px-4 font-medium text-gray-300">
                    {selectedReport === 'revenue' || selectedReport === 'services' || selectedReport === 'products' ? 'Amount' : 'Count'}
                  </th>
                  <th className="text-center py-4 px-4 font-medium text-gray-300">Performance</th>
                </tr>
              </thead>
              <tbody>
                {currentData.chartData.map((item, index) => {
                  const percentage = (item.value / maxValue) * 100
                  const isTop = percentage > 80
                  const isGood = percentage > 50 && percentage <= 80
                  const isLow = percentage <= 50
                  
                  return (
                    <tr key={index} className="border-b border-[#444444]/20 hover:bg-[#1A1A1A]/30 transition-colors">
                      <td className="py-4 px-4 text-white font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{item.period}</span>
                          {isTop && <span className="text-xs text-green-400">🏆</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-[#FF8C42] font-bold text-lg">
                          {(selectedReport === 'revenue' || selectedReport === 'services' || selectedReport === 'products') 
                            ? formatCurrency(item.value) 
                            : formatNumber(item.value)
                          }
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className={`w-16 h-2 rounded-full ${
                            isTop ? 'bg-green-500' :
                            isGood ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} style={{ width: `${Math.max(percentage * 0.8, 20)}px` }}></div>
                          <span className="text-xs text-gray-400 min-w-[40px]">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

         {/* Key Insights */}
          <div className="mt-6 flex flex-wrap gap-6 justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <span className="text-xs text-gray-400">Best Performer</span>
                <p className="text-sm font-semibold text-white">
                  {(() => {
                    const highest = currentData.chartData.reduce((max, item) => item.value > max.value ? item : max)
                    return `${highest.period} (${(selectedReport === 'revenue' || selectedReport === 'services' || selectedReport === 'products') ? formatCurrency(highest.value) : formatNumber(highest.value)})`
                  })()} 
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-[#FF8C42] rounded-full"></div>
              <div>
                <span className="text-xs text-gray-400">Average</span>
                <p className="text-sm font-semibold text-white">
                  {(() => {
                    const average = currentData.chartData.reduce((sum, item) => sum + item.value, 0) / currentData.chartData.length
                    return (selectedReport === 'revenue' || selectedReport === 'services' || selectedReport === 'products') ? formatCurrency(average) : formatNumber(Math.round(average))
                  })()} 
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                currentData.trend === 'up' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <span className="text-xs text-gray-400">Trend</span>
                <p className="text-sm font-semibold text-white">
                  {currentData.trend === 'up' ? 'Growing' : 'Declining'} ({currentData.change.toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>
       </div>

       {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FF8C42]/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-[#FF8C42]" />
              </div>
              <h4 className="font-semibold text-white">Average Daily</h4>
            </div>
            <p className="text-2xl font-bold text-[#FF8C42]">
               {(selectedReport === 'revenue' || selectedReport === 'services' || selectedReport === 'products') 
                 ? formatCurrency(Math.round(currentData.current / 7))
                 : formatNumber(Math.round(currentData.current / 7))
               }
             </p>
             <p className="text-sm text-gray-300 mt-1">
               {selectedReport === 'services' || selectedReport === 'products' 
                 ? `Average price per ${selectedReport.slice(0, -1)}`
                 : `Per day this ${selectedPeriod}`
               }
             </p>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <h4 className="font-semibold text-white">Best Day</h4>
            </div>
            <p className="text-2xl font-bold text-[#FF8C42]">
               {(() => {
                 const bestDay = currentData.chartData.reduce((max, day) => 
                   day.value > max.value ? day : max
                 )
                 return (selectedReport === 'revenue' || selectedReport === 'services' || selectedReport === 'products') 
                   ? formatCurrency(bestDay.value)
                   : formatNumber(bestDay.value)
               })()} 
             </p>
             <p className="text-sm text-gray-300 mt-1">
               {selectedReport === 'services' || selectedReport === 'products'
                 ? 'Highest priced item'
                 : currentData.chartData.reduce((max, day) => 
                     day.value > max.value ? day : max
                   ).period
               }
             </p>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FF8C42]/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-[#FF8C42]" />
              </div>
              <h4 className="font-semibold text-white">Growth Rate</h4>
            </div>
            <p className="text-2xl font-bold text-[#FF8C42]">
              +{currentData.change}%
            </p>
            <p className="text-sm text-gray-300 mt-1">Compared to last {selectedPeriod}</p>
          </div>
        </div>
      </div>
  )
}

export default ReportsManagement