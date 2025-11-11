import React, { useState, useMemo } from 'react'
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Calendar, 
  Download, RefreshCw, Scissors, Clock, Award, AlertCircle,
  ChevronRight, Star, Package, CreditCard, ArrowUp, ArrowDown
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const ReportsManagementNew = ({ onRefresh, user }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [loading, setLoading] = useState(false)

  // Fetch data
  const bookings = user?.role === 'super_admin' 
    ? useQuery(api.services.bookings.getAllBookings)
    : user?.branch_id 
      ? useQuery(api.services.bookings.getBookingsByBranch, { branch_id: user.branch_id })
      : []
      
  const transactions = user?.role === 'super_admin'
    ? useQuery(api.services.transactions.getAllTransactions)
    : user?.branch_id
      ? useQuery(api.services.transactions.getTransactionsByBranch, { branch_id: user.branch_id })
      : []
      
  const barbers = user?.role === 'super_admin'
    ? useQuery(api.services.barbers.getAllBarbers)
    : user?.branch_id
      ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
      : []

  const services = user?.role === 'super_admin'
    ? useQuery(api.services.services.getAllServices)
    : user?.branch_id
      ? useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id })
      : []

  const products = useQuery(api.services.products.getAllProducts)

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!bookings || !transactions || !barbers || !services) return null

    const now = Date.now()
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const weekStart = now - (7 * 24 * 60 * 60 * 1000)
    const monthStart = now - (30 * 24 * 60 * 60 * 1000)
    
    // Get period data
    let periodStart = todayStart
    if (selectedPeriod === 'week') periodStart = weekStart
    if (selectedPeriod === 'month') periodStart = monthStart

    const periodTransactions = transactions.filter(t => t.createdAt >= periodStart && t.payment_status === 'completed')
    const periodBookings = bookings.filter(b => b.createdAt >= periodStart)

    // Previous period for comparison
    const prevPeriodStart = selectedPeriod === 'today' 
      ? todayStart - (24 * 60 * 60 * 1000)
      : selectedPeriod === 'week'
        ? weekStart - (7 * 24 * 60 * 60 * 1000)
        : monthStart - (30 * 24 * 60 * 60 * 1000)
    const prevPeriodEnd = periodStart
    const prevTransactions = transactions.filter(t => 
      t.createdAt >= prevPeriodStart && t.createdAt < prevPeriodEnd && t.payment_status === 'completed'
    )

    // Revenue
    const totalRevenue = periodTransactions.reduce((sum, t) => sum + t.total_amount, 0)
    const prevRevenue = prevTransactions.reduce((sum, t) => sum + t.total_amount, 0)
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

    // Services revenue
    const servicesRevenue = periodTransactions.reduce((sum, t) => {
      return sum + t.services.reduce((s, svc) => s + (svc.price * svc.quantity), 0)
    }, 0)

    // Products revenue
    const productsRevenue = periodTransactions.reduce((sum, t) => {
      return sum + (t.products || []).reduce((s, p) => s + (p.price * p.quantity), 0)
    }, 0)

    // Customers
    const uniqueCustomers = new Set(periodTransactions.map(t => t.customer || t.customer_name)).size
    const prevCustomers = new Set(prevTransactions.map(t => t.customer || t.customer_name)).size
    const customerChange = prevCustomers > 0 ? ((uniqueCustomers - prevCustomers) / prevCustomers) * 100 : 0

    // Transactions
    const transactionCount = periodTransactions.length
    const avgTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0

    // Bookings
    const completedBookings = periodBookings.filter(b => b.status === 'completed').length
    const completionRate = periodBookings.length > 0 
      ? (completedBookings / periodBookings.length) * 100 
      : 0

    // Barber Performance
    const barberStats = barbers.map(barber => {
      const barberTransactions = periodTransactions.filter(t => t.barber === barber._id)
      const barberRevenue = barberTransactions.reduce((sum, t) => sum + t.total_amount, 0)
      const barberBookings = periodBookings.filter(b => b.barber === barber._id).length
      
      return {
        id: barber._id,
        name: barber.full_name,
        revenue: barberRevenue,
        transactions: barberTransactions.length,
        bookings: barberBookings,
        avgTransaction: barberTransactions.length > 0 ? barberRevenue / barberTransactions.length : 0
      }
    }).sort((a, b) => b.revenue - a.revenue)

    // Popular Services
    const serviceStats = {}
    periodTransactions.forEach(t => {
      t.services.forEach(s => {
        if (!serviceStats[s.service_id]) {
          serviceStats[s.service_id] = {
            id: s.service_id,
            name: s.service_name,
            count: 0,
            revenue: 0
          }
        }
        serviceStats[s.service_id].count += s.quantity
        serviceStats[s.service_id].revenue += s.price * s.quantity
      })
    })
    const popularServices = Object.values(serviceStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Peak Hours
    const hourStats = {}
    periodTransactions.forEach(t => {
      const hour = new Date(t.createdAt).getHours()
      if (!hourStats[hour]) hourStats[hour] = 0
      hourStats[hour]++
    })
    const peakHour = Object.entries(hourStats)
      .sort(([,a], [,b]) => b - a)[0]

    // Payment Methods
    const paymentMethods = {}
    periodTransactions.forEach(t => {
      if (!paymentMethods[t.payment_method]) paymentMethods[t.payment_method] = 0
      paymentMethods[t.payment_method]++
    })

    // Product Performance
    const productStats = {}
    periodTransactions.forEach(t => {
      (t.products || []).forEach(p => {
        if (!productStats[p.product_id]) {
          productStats[p.product_id] = {
            name: p.product_name,
            count: 0,
            revenue: 0
          }
        }
        productStats[p.product_id].count += p.quantity
        productStats[p.product_id].revenue += p.price * p.quantity
      })
    })
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      revenue: {
        total: totalRevenue,
        change: revenueChange,
        services: servicesRevenue,
        products: productsRevenue
      },
      customers: {
        unique: uniqueCustomers,
        change: customerChange
      },
      transactions: {
        count: transactionCount,
        average: avgTransaction
      },
      bookings: {
        total: periodBookings.length,
        completed: completedBookings,
        completionRate
      },
      barbers: barberStats,
      services: popularServices,
      peakHour: peakHour ? {
        hour: parseInt(peakHour[0]),
        count: peakHour[1]
      } : null,
      paymentMethods,
      products: topProducts
    }
  }, [bookings, transactions, barbers, services, selectedPeriod])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatTime = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:00 ${period}`
  }

  const handleExport = () => {
    if (!analytics) return
    
    const timestamp = new Date().toISOString().split('T')[0]
    let csv = `Business Report - ${selectedPeriod}\n`
    csv += `Generated: ${new Date().toLocaleString()}\n\n`
    
    csv += `Revenue Summary\n`
    csv += `Total Revenue,${formatCurrency(analytics.revenue.total)}\n`
    csv += `Services Revenue,${formatCurrency(analytics.revenue.services)}\n`
    csv += `Products Revenue,${formatCurrency(analytics.revenue.products)}\n`
    csv += `Change vs Previous Period,${analytics.revenue.change.toFixed(1)}%\n\n`
    
    csv += `Barber Performance\n`
    csv += `Barber,Revenue,Transactions,Average\n`
    analytics.barbers.forEach(b => {
      csv += `"${b.name}",${formatCurrency(b.revenue)},${b.transactions},${formatCurrency(b.avgTransaction)}\n`
    })
    
    csv += `\nTop Services\n`
    csv += `Service,Count,Revenue\n`
    analytics.services.forEach(s => {
      csv += `"${s.name}",${s.count},${formatCurrency(s.revenue)}\n`
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report-${selectedPeriod}-${timestamp}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#FF8C42] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Business Dashboard</h2>
          <p className="text-sm text-gray-400">Real-time performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[#1A1A1A] border border-[#444444] text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <button
            onClick={() => { setLoading(true); onRefresh?.(); setTimeout(() => setLoading(false), 1000) }}
            className="p-2 bg-[#1A1A1A] border border-[#444444] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-3 py-2 bg-[#FF8C42] text-white text-sm rounded-lg hover:bg-[#FF8C42]/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics - Compact Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-[#FF8C42]" />
            {analytics.revenue.change >= 0 ? (
              <div className="flex items-center text-green-400 text-xs">
                <ArrowUp className="h-3 w-3" />
                <span>{Math.abs(analytics.revenue.change).toFixed(1)}%</span>
              </div>
            ) : (
              <div className="flex items-center text-red-400 text-xs">
                <ArrowDown className="h-3 w-3" />
                <span>{Math.abs(analytics.revenue.change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {formatCurrency(analytics.revenue.total)}
          </p>
          <p className="text-xs text-gray-400">Total Revenue</p>
        </div>

        {/* Customers */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-400" />
            {analytics.customers.change >= 0 ? (
              <div className="flex items-center text-green-400 text-xs">
                <ArrowUp className="h-3 w-3" />
                <span>{Math.abs(analytics.customers.change).toFixed(1)}%</span>
              </div>
            ) : (
              <div className="flex items-center text-red-400 text-xs">
                <ArrowDown className="h-3 w-3" />
                <span>{Math.abs(analytics.customers.change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-white mb-1">{analytics.customers.unique}</p>
          <p className="text-xs text-gray-400">Customers</p>
        </div>

        {/* Transactions */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="h-5 w-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">{analytics.transactions.count}</p>
          <p className="text-xs text-gray-400">
            Avg: {formatCurrency(analytics.transactions.average)}
          </p>
        </div>

        {/* Completion Rate */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {analytics.bookings.completionRate.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400">
            {analytics.bookings.completed}/{analytics.bookings.total} Completed
          </p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#444444]/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
            <Scissors className="h-4 w-4 text-[#FF8C42] mr-2" />
            Revenue Breakdown
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Services</span>
                <span className="text-white font-semibold">{formatCurrency(analytics.revenue.services)}</span>
              </div>
              <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(analytics.revenue.services / analytics.revenue.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Products</span>
                <span className="text-white font-semibold">{formatCurrency(analytics.revenue.products)}</span>
              </div>
              <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(analytics.revenue.products / analytics.revenue.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Peak Hour */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#444444]/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
            <Clock className="h-4 w-4 text-[#FF8C42] mr-2" />
            Peak Performance
          </h3>
          {analytics.peakHour ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Busiest Hour</span>
                <span className="text-white font-semibold">{formatTime(analytics.peakHour.hour)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Transactions</span>
                <span className="text-[#FF8C42] font-bold text-xl">{analytics.peakHour.count}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                💡 Schedule more staff during peak hours
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>
      </div>

      {/* Barber Performance - Horizontal Cards */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#444444]/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center">
            <Award className="h-4 w-4 text-[#FF8C42] mr-2" />
            Barber Performance
          </h3>
        </div>
        <div className="space-y-2">
          {analytics.barbers.slice(0, 5).map((barber, index) => (
            <div 
              key={barber.id}
              className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg hover:bg-[#333333] transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  index === 1 ? 'bg-gray-400/20 text-gray-300' :
                  index === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-[#444444]/20 text-gray-400'
                }`}>
                  <span className="text-sm font-bold">{index + 1}</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{barber.name}</p>
                  <p className="text-gray-400 text-xs">{barber.transactions} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#FF8C42] font-bold">{formatCurrency(barber.revenue)}</p>
                <p className="text-gray-400 text-xs">Avg: {formatCurrency(barber.avgTransaction)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services & Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Services */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#444444]/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
            <Scissors className="h-4 w-4 text-[#FF8C42] mr-2" />
            Top Services
          </h3>
          <div className="space-y-2">
            {analytics.services.slice(0, 5).map((service, index) => {
              const maxRevenue = analytics.services[0]?.revenue || 1
              const percentage = (service.revenue / maxRevenue) * 100
              
              return (
                <div key={service.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-300 truncate">{service.name}</span>
                    <span className="text-white font-semibold ml-2">{formatCurrency(service.revenue)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-[#2A2A2A] rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{service.count}x</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#444444]/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
            <Package className="h-4 w-4 text-[#FF8C42] mr-2" />
            Top Products
          </h3>
          {analytics.products.length > 0 ? (
            <div className="space-y-2">
              {analytics.products.map((product, index) => {
                const maxRevenue = analytics.products[0]?.revenue || 1
                const percentage = (product.revenue / maxRevenue) * 100
                
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-300 truncate">{product.name}</span>
                      <span className="text-white font-semibold ml-2">{formatCurrency(product.revenue)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-[#2A2A2A] rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{product.count}x</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No product sales this period</p>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#444444]/50 p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
          <CreditCard className="h-4 w-4 text-[#FF8C42] mr-2" />
          Payment Methods
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(analytics.paymentMethods).map(([method, count]) => (
            <div key={method} className="bg-[#2A2A2A] rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white mb-1">{count}</p>
              <p className="text-xs text-gray-400 capitalize">
                {method.replace('_', ' ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-gradient-to-br from-[#FF8C42]/10 to-[#FF7A2B]/5 border border-[#FF8C42]/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-[#FF8C42] mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-2">Business Insights</h4>
            <div className="space-y-1 text-sm text-gray-300">
              {analytics.revenue.change > 10 && (
                <p>🎉 Revenue is up {analytics.revenue.change.toFixed(1)}% - Great performance!</p>
              )}
              {analytics.revenue.change < -10 && (
                <p>⚠️ Revenue down {Math.abs(analytics.revenue.change).toFixed(1)}% - Consider promotions</p>
              )}
              {analytics.barbers[0] && (
                <p>🏆 Top performer: {analytics.barbers[0].name} with {formatCurrency(analytics.barbers[0].revenue)}</p>
              )}
              {analytics.bookings.completionRate < 70 && (
                <p>📊 Completion rate is {analytics.bookings.completionRate.toFixed(0)}% - Send more reminders</p>
              )}
              {analytics.peakHour && (
                <p>⏰ Peak hour at {formatTime(analytics.peakHour.hour)} - Optimize staffing</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsManagementNew
