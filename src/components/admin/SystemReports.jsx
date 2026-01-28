import React, { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Download, Calendar, Building, Users, DollarSign, Activity, Filter, ArrowUp, ArrowDown, Zap, CheckCircle, AlertCircle, Package, Scissors, Award, Target, PieChart, Clock, Star, ShoppingBag, FileText, Trophy, Crown, Medal, Sparkles } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const SystemReports = ({ onRefresh }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')
  // Branch Summary state
  const [summaryBranchId, setSummaryBranchId] = useState('')
  const [summaryMonth, setSummaryMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  // Top Performers state
  const [recognitionYear, setRecognitionYear] = useState(() => new Date().getFullYear())

  // Query all data - with pagination limits to avoid byte limit errors
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const bookingsData = useQuery(api.services.bookings.getAllBookings, { limit: 200 })
  const bookings = bookingsData?.bookings || []
  const transactionsData = useQuery(api.services.transactions.getAllTransactions, { limit: 200 })
  const transactions = transactionsData?.transactions || []
  const users = useQuery(api.services.auth.getAllUsers) || []
  const barbers = useQuery(api.services.barbers.getAllBarbers) || []
  const services = useQuery(api.services.services.getAllServices) || []

  // Calculate date range - using proper calendar periods
  const getDateRange = () => {
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (selectedPeriod) {
      case 'week':
        // Current week (Monday to Sunday)
        const dayOfWeek = now.getDay()
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday = 0
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        // Current calendar month (1st to last day)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      case 'quarter':
        // Current quarter (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const quarterStartMonth = currentQuarter * 3
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999)
        break
      case 'year':
        // Current calendar year (Jan 1 to Dec 31)
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    return { startDate, endDate }
  }

  const { startDate, endDate } = getDateRange()

  // Filter data based on branch and date
  const filterByBranchAndDate = (items) => {
    return items.filter(item => {
      const itemDate = new Date(item.createdAt || item.date || item.started_at)
      const isBranchMatch = selectedBranch === 'all' || item.branch_id === selectedBranch
      const isDateMatch = itemDate >= startDate && itemDate <= endDate
      return isBranchMatch && isDateMatch
    })
  }

  const filteredBookings = filterByBranchAndDate(bookings)
  const filteredTransactions = filterByBranchAndDate(transactions)

  // Calculate statistics
  const stats = useMemo(() => {
    const completedBookings = filteredBookings.filter(b => b.status === 'completed').length
    const completedTransactions = filteredTransactions.filter(t => t.payment_status === 'completed')
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.total_amount, 0)
    const totalBookingRevenue = filteredBookings
      .filter(b => b.status === 'completed' && b.payment_status === 'paid')
      .reduce((sum, b) => sum + (b.price || 0), 0)
    const averageTransactionValue = completedTransactions.length > 0 ? totalRevenue / completedTransactions.length : 0
    const pendingBookings = filteredBookings.filter(b => b.status === 'pending' || b.status === 'booked').length
    const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length

    // Get active staff and barbers
    const activeBranches = selectedBranch === 'all' 
      ? branches.filter(b => b.is_active)
      : branches.filter(b => b._id === selectedBranch && b.is_active)

    const activeStaff = users.filter(u => 
      u.is_active && 
      u.role === 'staff' &&
      (selectedBranch === 'all' || u.branch_id === selectedBranch)
    ).length

    const activeBarbers = barbers.filter(b => 
      b.is_active && 
      (selectedBranch === 'all' || b.branch_id === selectedBranch)
    ).length

    return {
      totalRevenue,
      totalBookingRevenue,
      completedBookings,
      completedTransactions: completedTransactions.length,
      averageTransactionValue,
      pendingBookings,
      cancelledBookings,
      activeBranches: activeBranches.length,
      activeStaff,
      activeBarbers
    }
  }, [filteredBookings, filteredTransactions, selectedBranch, branches, users, barbers])

  // Top performing barbers
  const topBarbers = useMemo(() => {
    const barberStats = {}
    
    filteredTransactions.forEach(t => {
      if (t.barber) {
        if (!barberStats[t.barber]) {
          barberStats[t.barber] = { revenue: 0, transactions: 0 }
        }
        barberStats[t.barber].revenue += t.total_amount
        barberStats[t.barber].transactions += 1
      }
    })

    filteredBookings.forEach(b => {
      if (b.barber && b.status === 'completed') {
        if (!barberStats[b.barber]) {
          barberStats[b.barber] = { revenue: 0, transactions: 0 }
        }
        barberStats[b.barber].revenue += b.price || 0
        barberStats[b.barber].transactions += 1
      }
    })

    return Object.entries(barberStats)
      .map(([bId, stats]) => ({
        barberId: bId,
        barber: barbers.find(b => b._id === bId),
        ...stats
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [filteredTransactions, filteredBookings, barbers])

  // Top performing services
  const topServices = useMemo(() => {
    const serviceStats = {}

    filteredBookings.forEach(b => {
      if (b.service && b.status === 'completed') {
        if (!serviceStats[b.service]) {
          serviceStats[b.service] = { count: 0, revenue: 0 }
        }
        serviceStats[b.service].count += 1
        serviceStats[b.service].revenue += b.price || 0
      }
    })

    return Object.entries(serviceStats)
      .map(([sId, stats]) => ({
        serviceId: sId,
        service: services.find(s => s._id === sId),
        ...stats
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [filteredBookings, services])

  // Export data as CSV
  const handleExport = () => {
    const data = {
      period: selectedPeriod,
      branch: selectedBranch === 'all' ? 'All Branches' : branches.find(b => b._id === selectedBranch)?.name,
      generatedAt: new Date().toISOString(),
      stats,
      topBarbers: topBarbers.map(b => ({
        barber: b.barber?.full_name,
        revenue: b.revenue,
        transactions: b.transactions
      })),
      topServices: topServices.map(s => ({
        service: s.service?.name,
        count: s.count,
        revenue: s.revenue
      }))
    }

    const csv = JSON.stringify(data, null, 2)
    const blob = new Blob([csv], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barbershop-reports-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const renderOverview = () => (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₱${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="from-green-500 to-green-600"
          change="+12%"
          positive
        />
        <StatCard
          title="Total Bookings"
          value={stats.completedBookings}
          icon={CheckCircle}
          color="from-blue-500 to-blue-600"
          change={`${stats.pendingBookings} pending`}
          positive
        />
        <StatCard
          title="Transactions"
          value={stats.completedTransactions}
          icon={Activity}
          color="from-purple-500 to-purple-600"
          change={`₱${stats.averageTransactionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} avg`}
          positive
        />
        <StatCard
          title="Active Barbers"
          value={stats.activeBarbers}
          icon={Users}
          color="from-orange-500 to-orange-600"
          change={`${stats.activeStaff} staff`}
          positive
        />
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span>Top Performing Barbers</span>
          </h3>
          <div className="space-y-3">
            {topBarbers.length > 0 ? (
              topBarbers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                  <div>
                    <p className="text-white font-medium">{item.barber?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-400">{item.transactions} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">₱{item.revenue.toLocaleString()}</p>
                    <p className="text-sm text-green-400">#{idx + 1}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span>Top Services</span>
          </h3>
          <div className="space-y-3">
            {topServices.length > 0 ? (
              topServices.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                  <div>
                    <p className="text-white font-medium">{item.service?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-400">{item.count} bookings</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">₱{item.revenue.toLocaleString()}</p>
                    <p className="text-sm text-blue-400">#{idx + 1}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span>System Reports</span>
          </h2>
          <p className="text-gray-400 mt-1">Comprehensive analytics across all branches</p>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-3">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-[#333333] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>

          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[#333333] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 transition-all duration-200 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-[#333333] overflow-x-auto scrollbar-hide">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'summary', label: 'Branch Summary', icon: FileText },
          { id: 'performers', label: 'Top Performers', icon: Trophy }
        ].map(tab => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'summary' && <BranchSummary
        branches={branches}
        transactions={transactions}
        bookings={bookings}
        barbers={barbers}
        services={services}
        summaryBranchId={summaryBranchId}
        setSummaryBranchId={setSummaryBranchId}
        summaryMonth={summaryMonth}
        setSummaryMonth={setSummaryMonth}
      />}
      {activeTab === 'performers' && <TopPerformers
        branches={branches}
        transactions={transactions}
        bookings={bookings}
        barbers={barbers}
        users={users}
        recognitionYear={recognitionYear}
        setRecognitionYear={setRecognitionYear}
      />}
    </div>
  )
}

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, change, positive }) => (
  <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50 hover:border-[var(--color-primary)]/50 transition-all duration-300 group">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change && (
        <div className={`flex items-center space-x-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          <span className="text-xs font-semibold">{change}</span>
        </div>
      )}
    </div>

    <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
)

// Branch Summary Component
const BranchSummary = ({ branches, transactions, bookings, barbers, services, summaryBranchId, setSummaryBranchId, summaryMonth, setSummaryMonth }) => {
  // Parse selected month into date range
  const monthRange = useMemo(() => {
    const [year, month] = summaryMonth.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month
    return { startDate, endDate, year, month }
  }, [summaryMonth])

  // Get the selected branch
  const selectedBranch = useMemo(() => {
    return branches.find(b => b._id === summaryBranchId)
  }, [branches, summaryBranchId])

  // Filter transactions and bookings for selected branch and month
  const filteredData = useMemo(() => {
    if (!summaryBranchId) return { transactions: [], bookings: [] }

    const filteredTx = transactions.filter(t => {
      const txDate = new Date(t.createdAt)
      return t.branch_id === summaryBranchId &&
        txDate >= monthRange.startDate &&
        txDate <= monthRange.endDate
    })

    const filteredBk = bookings.filter(b => {
      const bkDate = new Date(b.createdAt || b.date)
      return b.branch_id === summaryBranchId &&
        bkDate >= monthRange.startDate &&
        bkDate <= monthRange.endDate
    })

    return { transactions: filteredTx, bookings: filteredBk }
  }, [summaryBranchId, transactions, bookings, monthRange])

  // Calculate income summary
  const incomeSummary = useMemo(() => {
    const completedTx = filteredData.transactions.filter(t => t.payment_status === 'completed')

    // Total gross income
    const grossIncome = completedTx.reduce((sum, t) => sum + t.total_amount, 0)

    // Service income
    const serviceIncome = completedTx.reduce((sum, t) => {
      const servicesTotal = (t.services || []).reduce((s, svc) => s + (svc.price * svc.quantity), 0)
      return sum + servicesTotal
    }, 0)

    // Product income
    const productIncome = completedTx.reduce((sum, t) => {
      const productsTotal = (t.products || []).reduce((p, prod) => p + (prod.price * prod.quantity), 0)
      return sum + productsTotal
    }, 0)

    // Discount given
    const totalDiscount = completedTx.reduce((sum, t) => sum + (t.discount_amount || 0), 0)

    // Taxes
    const totalTax = completedTx.reduce((sum, t) => sum + (t.tax_amount || 0), 0)

    // Transaction count
    const transactionCount = completedTx.length

    // Average transaction
    const avgTransaction = transactionCount > 0 ? grossIncome / transactionCount : 0

    return {
      grossIncome,
      serviceIncome,
      productIncome,
      totalDiscount,
      totalTax,
      transactionCount,
      avgTransaction
    }
  }, [filteredData.transactions])

  // Barber performance
  const barberPerformance = useMemo(() => {
    const completedTx = filteredData.transactions.filter(t => t.payment_status === 'completed')
    const barberStats = {}

    completedTx.forEach(t => {
      if (t.barber) {
        if (!barberStats[t.barber]) {
          barberStats[t.barber] = {
            revenue: 0,
            transactions: 0,
            services: 0,
            products: 0,
            avgTicket: 0
          }
        }
        barberStats[t.barber].revenue += t.total_amount
        barberStats[t.barber].transactions += 1
        barberStats[t.barber].services += (t.services || []).length
        barberStats[t.barber].products += (t.products || []).reduce((sum, p) => sum + p.quantity, 0)
      }
    })

    // Calculate average ticket for each barber
    Object.keys(barberStats).forEach(barberId => {
      const stats = barberStats[barberId]
      stats.avgTicket = stats.transactions > 0 ? stats.revenue / stats.transactions : 0
    })

    return Object.entries(barberStats)
      .map(([barberId, stats]) => ({
        barberId,
        barber: barbers.find(b => b._id === barberId),
        ...stats
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredData.transactions, barbers])

  // Product sales
  const productSales = useMemo(() => {
    const completedTx = filteredData.transactions.filter(t => t.payment_status === 'completed')
    const productStats = {}

    completedTx.forEach(t => {
      (t.products || []).forEach(p => {
        if (!productStats[p.product_id]) {
          productStats[p.product_id] = {
            productId: p.product_id,
            name: p.product_name,
            quantity: 0,
            revenue: 0
          }
        }
        productStats[p.product_id].quantity += p.quantity
        productStats[p.product_id].revenue += p.price * p.quantity
      })
    })

    return Object.values(productStats).sort((a, b) => b.revenue - a.revenue)
  }, [filteredData.transactions])

  // Service performance
  const servicePerformance = useMemo(() => {
    const completedTx = filteredData.transactions.filter(t => t.payment_status === 'completed')
    const serviceStats = {}

    completedTx.forEach(t => {
      (t.services || []).forEach(s => {
        if (!serviceStats[s.service_id]) {
          serviceStats[s.service_id] = {
            serviceId: s.service_id,
            name: s.service_name,
            count: 0,
            revenue: 0
          }
        }
        serviceStats[s.service_id].count += s.quantity
        serviceStats[s.service_id].revenue += s.price * s.quantity
      })
    })

    return Object.values(serviceStats).sort((a, b) => b.revenue - a.revenue)
  }, [filteredData.transactions])

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }, [])

  // Export branch summary as CSV
  const handleExportSummary = () => {
    if (!selectedBranch) return

    const monthLabel = new Date(monthRange.year, monthRange.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Create CSV content
    let csv = `Branch Summary Report - ${selectedBranch.name}\n`
    csv += `Period: ${monthLabel}\n`
    csv += `Generated: ${new Date().toLocaleString()}\n\n`

    // Income Summary
    csv += `INCOME SUMMARY\n`
    csv += `Gross Income,₱${incomeSummary.grossIncome.toLocaleString()}\n`
    csv += `Service Income,₱${incomeSummary.serviceIncome.toLocaleString()}\n`
    csv += `Product Income,₱${incomeSummary.productIncome.toLocaleString()}\n`
    csv += `Total Discounts,₱${incomeSummary.totalDiscount.toLocaleString()}\n`
    csv += `Total Tax,₱${incomeSummary.totalTax.toLocaleString()}\n`
    csv += `Transactions,${incomeSummary.transactionCount}\n`
    csv += `Avg Transaction,₱${incomeSummary.avgTransaction.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n\n`

    // Barber Performance
    csv += `BARBER PERFORMANCE\n`
    csv += `Name,Revenue,Transactions,Services,Products,Avg Ticket\n`
    barberPerformance.forEach(bp => {
      csv += `${bp.barber?.full_name || 'Unknown'},₱${bp.revenue.toLocaleString()},${bp.transactions},${bp.services},${bp.products},₱${bp.avgTicket.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`
    })
    csv += '\n'

    // Product Sales
    csv += `PRODUCT SALES\n`
    csv += `Product,Quantity Sold,Revenue\n`
    productSales.forEach(p => {
      csv += `${p.name},${p.quantity},₱${p.revenue.toLocaleString()}\n`
    })
    csv += '\n'

    // Service Performance
    csv += `SERVICE PERFORMANCE\n`
    csv += `Service,Count,Revenue\n`
    servicePerformance.forEach(s => {
      csv += `${s.name},${s.count},₱${s.revenue.toLocaleString()}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `branch-summary-${selectedBranch.branch_code}-${summaryMonth}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      {/* Branch & Month Selection */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Target className="w-6 h-6 text-[var(--color-primary)]" />
              <span>Branch Performance Summary</span>
            </h3>
            <p className="text-gray-400 text-sm mt-1">Select a branch and month to view detailed performance</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={summaryBranchId}
              onChange={(e) => setSummaryBranchId(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent min-w-[180px]"
            >
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            <select
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {summaryBranchId && (
              <button
                onClick={handleExportSummary}
                className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:brightness-110 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {!summaryBranchId ? (
        <div className="text-center py-16 text-gray-400">
          <Building className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a branch to view its summary</p>
          <p className="text-sm mt-2">Choose a branch and month from the dropdowns above</p>
        </div>
      ) : (
        <>
          {/* Branch Header */}
          <div className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 rounded-2xl p-6 border border-[var(--color-primary)]/30">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-2xl font-bold text-white">{selectedBranch?.name}</h4>
                <p className="text-gray-400 mt-1">
                  {selectedBranch?.address} • Code: {selectedBranch?.branch_code}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Period</p>
                <p className="text-lg font-semibold text-[var(--color-primary)]">
                  {monthOptions.find(o => o.value === summaryMonth)?.label}
                </p>
              </div>
            </div>
          </div>

          {/* Income Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-gray-400 text-sm">Gross Income</p>
              <p className="text-2xl font-bold text-white">₱{incomeSummary.grossIncome.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-blue-400 font-medium">
                  {incomeSummary.grossIncome > 0
                    ? `${((incomeSummary.serviceIncome / incomeSummary.grossIncome) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Service Income</p>
              <p className="text-2xl font-bold text-white">₱{incomeSummary.serviceIncome.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-purple-400 font-medium">
                  {incomeSummary.grossIncome > 0
                    ? `${((incomeSummary.productIncome / incomeSummary.grossIncome) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Product Sales</p>
              <p className="text-2xl font-bold text-white">₱{incomeSummary.productIncome.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-orange-400 font-medium">
                  {incomeSummary.transactionCount} txn
                </span>
              </div>
              <p className="text-gray-400 text-sm">Avg Transaction</p>
              <p className="text-2xl font-bold text-white">₱{incomeSummary.avgTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Total Discounts</p>
                  <p className="text-lg font-bold text-red-400">-₱{incomeSummary.totalDiscount.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Total Tax Collected</p>
                  <p className="text-lg font-bold text-yellow-400">₱{incomeSummary.totalTax.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Total Transactions</p>
                  <p className="text-lg font-bold text-cyan-400">{incomeSummary.transactionCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barber Performance */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <span>Barber Performance</span>
              <span className="text-sm font-normal text-gray-400">({barberPerformance.length} barbers)</span>
            </h3>

            {barberPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-[#444]">
                      <th className="pb-3 font-medium">#</th>
                      <th className="pb-3 font-medium">Barber</th>
                      <th className="pb-3 font-medium text-right">Revenue</th>
                      <th className="pb-3 font-medium text-right">Transactions</th>
                      <th className="pb-3 font-medium text-right">Services</th>
                      <th className="pb-3 font-medium text-right">Products</th>
                      <th className="pb-3 font-medium text-right">Avg Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333]">
                    {barberPerformance.map((bp, idx) => (
                      <tr key={bp.barberId} className="hover:bg-[#333]/50 transition-colors">
                        <td className="py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                            idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-[#444] text-gray-400'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {(bp.barber?.full_name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-white font-medium">{bp.barber?.full_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-green-400 font-bold">₱{bp.revenue.toLocaleString()}</td>
                        <td className="py-3 text-right text-gray-300">{bp.transactions}</td>
                        <td className="py-3 text-right text-blue-400">{bp.services}</td>
                        <td className="py-3 text-right text-purple-400">{bp.products}</td>
                        <td className="py-3 text-right text-orange-400">₱{bp.avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No barber data for this period</p>
            )}
          </div>

          {/* Product Sales & Service Performance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Sales */}
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Package className="w-5 h-5 text-purple-400" />
                <span>Product Sales</span>
              </h3>

              {productSales.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {productSales.map((p, idx) => {
                    const maxRevenue = productSales[0]?.revenue || 1
                    const percentage = (p.revenue / maxRevenue) * 100
                    return (
                      <div key={p.productId} className="bg-[#1A1A1A] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                            <span className="text-white font-medium">{p.name}</span>
                          </div>
                          <span className="text-green-400 font-bold">₱{p.revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#333] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400 whitespace-nowrap">{p.quantity} sold</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No product sales this month</p>
                </div>
              )}
            </div>

            {/* Service Performance */}
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Scissors className="w-5 h-5 text-blue-400" />
                <span>Service Performance</span>
              </h3>

              {servicePerformance.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {servicePerformance.map((s, idx) => {
                    const maxRevenue = servicePerformance[0]?.revenue || 1
                    const percentage = (s.revenue / maxRevenue) * 100
                    return (
                      <div key={s.serviceId} className="bg-[#1A1A1A] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                            <span className="text-white font-medium">{s.name}</span>
                          </div>
                          <span className="text-green-400 font-bold">₱{s.revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#333] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400 whitespace-nowrap">{s.count} times</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Scissors className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No service data this month</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Top Performers Component (Annual Recognition)
const TopPerformers = ({ branches, transactions, bookings, barbers, users, recognitionYear, setRecognitionYear }) => {
  // Generate year options (last 5 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i)
    }
    return years
  }, [])

  // Filter data for selected year
  const yearData = useMemo(() => {
    const startDate = new Date(recognitionYear, 0, 1)
    const endDate = new Date(recognitionYear, 11, 31, 23, 59, 59, 999)

    const filteredTx = transactions.filter(t => {
      const txDate = new Date(t.createdAt)
      return txDate >= startDate && txDate <= endDate && t.payment_status === 'completed'
    })

    const filteredBk = bookings.filter(b => {
      const bkDate = new Date(b.createdAt || b.date)
      return bkDate >= startDate && bkDate <= endDate && b.status === 'completed'
    })

    return { transactions: filteredTx, bookings: filteredBk }
  }, [recognitionYear, transactions, bookings])

  // Calculate top barbers for the year
  const topYearlyBarbers = useMemo(() => {
    const barberStats = {}

    yearData.transactions.forEach(t => {
      if (t.barber) {
        if (!barberStats[t.barber]) {
          barberStats[t.barber] = {
            revenue: 0,
            transactions: 0,
            services: 0,
            products: 0,
            customers: new Set()
          }
        }
        barberStats[t.barber].revenue += t.total_amount
        barberStats[t.barber].transactions += 1
        barberStats[t.barber].services += (t.services || []).length
        barberStats[t.barber].products += (t.products || []).reduce((sum, p) => sum + p.quantity, 0)
        if (t.customer_id) barberStats[t.barber].customers.add(t.customer_id)
      }
    })

    return Object.entries(barberStats)
      .map(([barberId, stats]) => {
        const barber = barbers.find(b => b._id === barberId)
        const branch = branches.find(br => br._id === barber?.branch_id)
        return {
          barberId,
          barber,
          branch,
          revenue: stats.revenue,
          transactions: stats.transactions,
          services: stats.services,
          products: stats.products,
          customers: stats.customers.size
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [yearData.transactions, barbers, branches])

  // Calculate top branches for the year
  const topYearlyBranches = useMemo(() => {
    const branchStats = {}

    yearData.transactions.forEach(t => {
      if (t.branch_id) {
        if (!branchStats[t.branch_id]) {
          branchStats[t.branch_id] = {
            revenue: 0,
            transactions: 0,
            customers: new Set(),
            barbers: new Set()
          }
        }
        branchStats[t.branch_id].revenue += t.total_amount
        branchStats[t.branch_id].transactions += 1
        if (t.customer_id) branchStats[t.branch_id].customers.add(t.customer_id)
        if (t.barber) branchStats[t.branch_id].barbers.add(t.barber)
      }
    })

    return Object.entries(branchStats)
      .map(([branchId, stats]) => {
        const branch = branches.find(b => b._id === branchId)
        const branchBarbers = barbers.filter(b => b.branch_id === branchId && b.is_active).length
        const branchStaff = users.filter(u => u.branch_id === branchId && u.is_active && u.role === 'staff').length
        return {
          branchId,
          branch,
          revenue: stats.revenue,
          transactions: stats.transactions,
          customers: stats.customers.size,
          activeBarbers: branchBarbers,
          activeStaff: branchStaff,
          avgTransaction: stats.transactions > 0 ? stats.revenue / stats.transactions : 0
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [yearData.transactions, branches, barbers, users])

  // Total stats for the year
  const yearStats = useMemo(() => {
    const totalRevenue = yearData.transactions.reduce((sum, t) => sum + t.total_amount, 0)
    const totalTransactions = yearData.transactions.length
    const uniqueCustomers = new Set(yearData.transactions.filter(t => t.customer_id).map(t => t.customer_id)).size
    return { totalRevenue, totalTransactions, uniqueCustomers }
  }, [yearData.transactions])

  // Rank badge helper
  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: Crown, color: 'from-yellow-400 to-yellow-600', bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '1st Place' }
    if (rank === 2) return { icon: Medal, color: 'from-gray-300 to-gray-500', bg: 'bg-gray-400/20', text: 'text-gray-300', label: '2nd Place' }
    if (rank === 3) return { icon: Medal, color: 'from-orange-400 to-orange-600', bg: 'bg-orange-500/20', text: 'text-orange-400', label: '3rd Place' }
    return { icon: Award, color: 'from-[var(--color-primary)] to-[var(--color-accent)]', bg: 'bg-[var(--color-primary)]/20', text: 'text-[var(--color-primary)]', label: `#${rank}` }
  }

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span>Annual Recognition</span>
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            </h3>
            <p className="text-gray-400 text-sm mt-1">Celebrating our top performers and branches</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={recognitionYear}
              onChange={(e) => setRecognitionYear(Number(e.target.value))}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Year Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-5 border border-green-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Revenue ({recognitionYear})</p>
              <p className="text-2xl font-bold text-green-400">₱{yearStats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-5 border border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-400">{yearStats.totalTransactions.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-5 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Unique Customers</p>
              <p className="text-2xl font-bold text-purple-400">{yearStats.uniqueCustomers.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Barbers Section */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          <span>Top Performing Barbers</span>
          <span className="text-sm font-normal text-gray-400">({recognitionYear})</span>
        </h3>

        {topYearlyBarbers.length > 0 ? (
          <div className="space-y-4">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {topYearlyBarbers.slice(0, 3).map((item, idx) => {
                const rank = getRankBadge(idx + 1)
                const RankIcon = rank.icon
                return (
                  <div key={item.barberId} className={`relative bg-gradient-to-br ${rank.bg} rounded-2xl p-6 border border-[#444]/50 ${idx === 0 ? 'md:order-2 md:-mt-4 md:mb-4' : idx === 1 ? 'md:order-1' : 'md:order-3'}`}>
                    {/* Rank Badge */}
                    <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gradient-to-r ${rank.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <RankIcon className="w-5 h-5 text-white" />
                    </div>

                    <div className="text-center pt-4">
                      {/* Avatar */}
                      <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${rank.color} rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg`}>
                        {(item.barber?.full_name || 'U')[0].toUpperCase()}
                      </div>

                      <h4 className="text-white font-bold text-lg">{item.barber?.full_name || 'Unknown'}</h4>
                      <p className="text-gray-400 text-sm mb-3">{item.branch?.name || 'Unknown Branch'}</p>

                      <div className={`text-2xl font-bold ${rank.text}`}>₱{item.revenue.toLocaleString()}</div>
                      <p className="text-gray-500 text-xs mt-1">{item.transactions} transactions</p>

                      <div className="flex justify-center gap-4 mt-4 text-xs">
                        <div>
                          <p className="text-blue-400 font-semibold">{item.services}</p>
                          <p className="text-gray-500">Services</p>
                        </div>
                        <div>
                          <p className="text-purple-400 font-semibold">{item.products}</p>
                          <p className="text-gray-500">Products</p>
                        </div>
                        <div>
                          <p className="text-green-400 font-semibold">{item.customers}</p>
                          <p className="text-gray-500">Customers</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Remaining Top Barbers (4-10) */}
            {topYearlyBarbers.length > 3 && (
              <div className="space-y-2">
                {topYearlyBarbers.slice(3).map((item, idx) => {
                  const rank = getRankBadge(idx + 4)
                  return (
                    <div key={item.barberId} className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#222] transition-colors">
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full ${rank.bg} flex items-center justify-center text-sm font-bold ${rank.text}`}>
                          {idx + 4}
                        </span>
                        <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-full flex items-center justify-center text-white font-bold">
                          {(item.barber?.full_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{item.barber?.full_name || 'Unknown'}</p>
                          <p className="text-gray-500 text-sm">{item.branch?.name || 'Unknown Branch'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">₱{item.revenue.toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">{item.transactions} txn</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No barber data for {recognitionYear}</p>
          </div>
        )}
      </div>

      {/* Top Branches Section */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
          <Building className="w-5 h-5 text-blue-400" />
          <span>Top Performing Branches</span>
          <span className="text-sm font-normal text-gray-400">({recognitionYear})</span>
        </h3>

        {topYearlyBranches.length > 0 ? (
          <div className="space-y-4">
            {/* Top 3 Branch Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {topYearlyBranches.slice(0, 3).map((item, idx) => {
                const rank = getRankBadge(idx + 1)
                const RankIcon = rank.icon
                return (
                  <div key={item.branchId} className={`relative bg-gradient-to-br ${rank.bg} rounded-2xl p-6 border border-[#444]/50 ${idx === 0 ? 'md:order-2 md:-mt-4 md:mb-4' : idx === 1 ? 'md:order-1' : 'md:order-3'}`}>
                    {/* Rank Badge */}
                    <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gradient-to-r ${rank.color} rounded-full flex items-center justify-center shadow-lg`}>
                      <RankIcon className="w-5 h-5 text-white" />
                    </div>

                    <div className="text-center pt-4">
                      {/* Branch Icon */}
                      <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${rank.color} rounded-2xl flex items-center justify-center mb-3 shadow-lg`}>
                        <Building className="w-8 h-8 text-white" />
                      </div>

                      <h4 className="text-white font-bold text-lg">{item.branch?.name || 'Unknown'}</h4>
                      <p className="text-gray-400 text-sm mb-3">{item.branch?.branch_code || 'N/A'}</p>

                      <div className={`text-2xl font-bold ${rank.text}`}>₱{item.revenue.toLocaleString()}</div>
                      <p className="text-gray-500 text-xs mt-1">{item.transactions} transactions</p>

                      <div className="flex justify-center gap-4 mt-4 text-xs">
                        <div>
                          <p className="text-orange-400 font-semibold">{item.activeBarbers}</p>
                          <p className="text-gray-500">Barbers</p>
                        </div>
                        <div>
                          <p className="text-cyan-400 font-semibold">{item.activeStaff}</p>
                          <p className="text-gray-500">Staff</p>
                        </div>
                        <div>
                          <p className="text-green-400 font-semibold">{item.customers}</p>
                          <p className="text-gray-500">Customers</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Remaining Top Branches (4-10) */}
            {topYearlyBranches.length > 3 && (
              <div className="space-y-2">
                {topYearlyBranches.slice(3).map((item, idx) => {
                  const rank = getRankBadge(idx + 4)
                  return (
                    <div key={item.branchId} className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#222] transition-colors">
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full ${rank.bg} flex items-center justify-center text-sm font-bold ${rank.text}`}>
                          {idx + 4}
                        </span>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                          <Building className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{item.branch?.name || 'Unknown'}</p>
                          <p className="text-gray-500 text-sm">{item.branch?.branch_code || 'N/A'} • {item.activeBarbers} barbers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">₱{item.revenue.toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">{item.transactions} txn • ₱{item.avgTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })} avg</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Building className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No branch data for {recognitionYear}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SystemReports