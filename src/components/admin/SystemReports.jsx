import React, { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Download, Calendar, Building, Users, DollarSign, Activity, Filter, ArrowUp, ArrowDown, Zap, CheckCircle, AlertCircle, Package, Scissors, Award, Target, PieChart, Clock, Star, ShoppingBag, FileText, Trophy, Crown, Medal, Sparkles, Brain, Lightbulb, TrendingDown, Wallet, GitBranch, AlertTriangle, Rocket, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import AIAnalyticsDashboard from './AIAnalyticsDashboard'

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
          { id: 'ddpp', label: 'DDPP Analytics', icon: Brain },
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
      {activeTab === 'ddpp' && (
        <SADDPPAnalytics
          branches={branches}
          selectedPeriod={selectedPeriod}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
        />
      )}
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

// ============================================================================
// SUPER ADMIN DDPP ANALYTICS COMPONENT
// ============================================================================
// Descriptive, Diagnostic, Predictive, Prescriptive Analytics for SA
const SADDPPAnalytics = ({ branches, selectedPeriod, selectedBranch, setSelectedBranch }) => {
  const [activeTab, setActiveTab] = useState('descriptive')
  const [expandedSections, setExpandedSections] = useState({})

  // Calculate date range based on selected period
  const getDateRange = () => {
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (selectedPeriod) {
      case 'week':
        const dayOfWeek = now.getDay()
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const quarterStartMonth = currentQuarter * 3
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    return { startDate: startDate.getTime(), endDate: endDate.getTime() }
  }

  const { startDate, endDate } = getDateRange()

  // SA Analytics Queries
  const descriptiveData = useQuery(api.services.aiAnalytics.getSADescriptiveAnalytics, {
    start_date: startDate,
    end_date: endDate
  })

  const diagnosticData = useQuery(api.services.aiAnalytics.getSADiagnosticAnalytics, {
    start_date: startDate,
    end_date: endDate
  })

  const predictiveData = useQuery(api.services.aiAnalytics.getSAPredictiveAnalytics, {
    forecast_months: 3
  })

  const prescriptiveData = useQuery(api.services.aiAnalytics.getSAPrescriptiveAnalytics, {})

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const tabs = [
    { id: 'descriptive', label: 'Descriptive', icon: BarChart3, description: 'What is happening?' },
    { id: 'diagnostic', label: 'Diagnostic', icon: AlertTriangle, description: 'Why is it happening?' },
    { id: 'predictive', label: 'Predictive', icon: TrendingUp, description: 'What will happen?' },
    { id: 'prescriptive', label: 'Prescriptive', icon: Rocket, description: 'What should we do?' },
  ]

  // Descriptive Tab Content
  const renderDescriptive = () => {
    if (!descriptiveData) return <LoadingState />

    const { summary, branch_performance, insights } = descriptiveData

    return (
      <div className="space-y-6">
        {/* AI Insights Banner */}
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-semibold">AI Insights</span>
          </div>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <p key={idx} className="text-gray-300 text-sm">{insight}</p>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-5 border border-[#444]/50">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xs font-medium ${summary.revenue_growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {summary.revenue_growth >= 0 ? '+' : ''}{summary.revenue_growth.toFixed(1)}%
              </span>
            </div>
            <p className="text-gray-400 text-xs">System Revenue</p>
            <p className="text-xl font-bold text-white">₱{summary.total_revenue.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-5 border border-[#444]/50">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-yellow-400 font-medium">Royalties</span>
            </div>
            <p className="text-gray-400 text-xs">Total Royalties</p>
            <p className="text-xl font-bold text-white">₱{summary.total_royalties.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">₱{summary.pending_royalties.toLocaleString()} pending</p>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-5 border border-[#444]/50">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-blue-400 font-medium">{summary.topup_count} txns</span>
            </div>
            <p className="text-gray-400 text-xs">Wallet Top-ups</p>
            <p className="text-xl font-bold text-white">₱{summary.wallet_topups.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-5 border border-[#444]/50">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              {summary.new_branches > 0 && (
                <span className="text-xs text-green-400 font-medium">+{summary.new_branches} new</span>
              )}
            </div>
            <p className="text-gray-400 text-xs">Active Branches</p>
            <p className="text-xl font-bold text-white">{summary.active_branches}</p>
          </div>
        </div>

        {/* SA Product Sales Section */}
        {summary.sa_product_orders && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-5 border border-orange-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-orange-400 font-medium">{summary.sa_product_orders.completed_orders} orders</span>
              </div>
              <p className="text-gray-400 text-xs">SA Product Sales</p>
              <p className="text-xl font-bold text-white">₱{summary.sa_product_orders.total_revenue.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-5 border border-[#444]/50">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-green-400 font-medium">{summary.sa_product_orders.paid_orders} paid</span>
              </div>
              <p className="text-gray-400 text-xs">Paid Product Orders</p>
              <p className="text-xl font-bold text-white">₱{summary.sa_product_orders.paid_revenue.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-5 border border-[#444]/50">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-red-400 font-medium">{summary.sa_product_orders.unpaid_orders} unpaid</span>
              </div>
              <p className="text-gray-400 text-xs">Pending Payments</p>
              <p className="text-xl font-bold text-white">₱{summary.sa_product_orders.pending_payments.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-5 border border-[#444]/50">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                {summary.product_catalog?.low_stock_products > 0 && (
                  <span className="text-xs text-yellow-400 font-medium">{summary.product_catalog.low_stock_products} low stock</span>
                )}
              </div>
              <p className="text-gray-400 text-xs">Active Catalog Products</p>
              <p className="text-xl font-bold text-white">{summary.product_catalog?.active_products || 0}</p>
            </div>
          </div>
        )}

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              Revenue Breakdown
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-300 text-sm">Services</span>
                </div>
                <span className="text-white font-medium">₱{summary.service_revenue.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                  style={{ width: `${summary.total_revenue > 0 ? (summary.service_revenue / summary.total_revenue) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-gray-300 text-sm">Products</span>
                </div>
                <span className="text-white font-medium">₱{summary.product_revenue.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                  style={{ width: `${summary.total_revenue > 0 ? (summary.product_revenue / summary.total_revenue) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Top Branches */}
          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Top Performing Branches
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {branch_performance.slice(0, 5).map((branch, idx) => (
                <div key={branch.branch_id} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-[#333] text-gray-400'
                    }`}>{idx + 1}</span>
                    <span className="text-white text-sm">{branch.branch_name}</span>
                  </div>
                  <span className="text-green-400 font-medium text-sm">₱{branch.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Diagnostic Tab Content
  const renderDiagnostic = () => {
    if (!diagnosticData) return <LoadingState />

    const { royalty_analysis, product_analysis, sa_product_analysis, branch_performance, wallet_analysis, diagnostics } = diagnosticData

    return (
      <div className="space-y-6">
        {/* Issues Banner */}
        {diagnostics.length > 0 && (
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-semibold">Issues Detected ({diagnostics.length})</span>
            </div>
            <div className="space-y-3">
              {diagnostics.map((diag, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${
                  diag.severity === 'high' ? 'bg-red-500/10 border border-red-500/30' :
                  diag.severity === 'medium' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                  'bg-blue-500/10 border border-blue-500/30'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{diag.issue}</p>
                      <p className="text-gray-400 text-xs mt-1">{diag.analysis}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      diag.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                      diag.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{diag.severity}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-purple-400">
                    <Lightbulb className="w-3 h-3" />
                    {diag.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Royalty Analysis */}
        <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
          <button
            onClick={() => toggleSection('royalty')}
            className="w-full flex items-center justify-between"
          >
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              Royalty Collection Analysis
            </h4>
            {expandedSections.royalty ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.royalty !== false && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-[#1A1A1A] rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Overdue Payments</p>
                  <p className="text-xl font-bold text-red-400">{royalty_analysis.overdue_count}</p>
                </div>
                <div className="flex-1 bg-[#1A1A1A] rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Overdue Amount</p>
                  <p className="text-xl font-bold text-red-400">₱{royalty_analysis.overdue_amount.toLocaleString()}</p>
                </div>
              </div>
              {royalty_analysis.branches_with_issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Branches with Payment Issues:</p>
                  {royalty_analysis.branches_with_issues.slice(0, 5).map((branch, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg">
                      <span className="text-white text-sm">{branch.branch_name}</span>
                      <span className="text-red-400 text-sm">₱{branch.overdue_amount.toLocaleString()} ({branch.overdue_count} overdue)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product Analysis */}
        <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
          <button
            onClick={() => toggleSection('products')}
            className="w-full flex items-center justify-between"
          >
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              Product Sales Analysis
            </h4>
            {expandedSections.products ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.products !== false && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400 text-sm">Product Revenue Ratio:</span>
                <span className={`font-medium ${product_analysis.product_revenue_ratio < 15 ? 'text-red-400' : product_analysis.product_revenue_ratio < 20 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {product_analysis.product_revenue_ratio.toFixed(1)}%
                </span>
                <span className="text-gray-500 text-xs">(Target: 20-30%)</span>
              </div>
              <div className="space-y-2">
                {product_analysis.top_products.slice(0, 5).map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">#{idx + 1}</span>
                      <span className="text-white text-sm">{product.name}</span>
                      <span className="text-gray-500 text-xs">({product.branch_count} branches)</span>
                    </div>
                    <span className="text-green-400 text-sm">₱{product.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SA Product Order Analysis */}
        {sa_product_analysis && (
          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-orange-500/30">
            <button
              onClick={() => toggleSection('sa_products')}
              className="w-full flex items-center justify-between"
            >
              <h4 className="text-white font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400" />
                SA Product Orders Analysis
              </h4>
              {expandedSections.sa_products ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections.sa_products !== false && (
              <div className="mt-4 space-y-4">
                {/* Order Status & Unpaid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Fulfillment Rate</p>
                    <p className={`text-xl font-bold ${sa_product_analysis.fulfillment_rate >= 80 ? 'text-green-400' : sa_product_analysis.fulfillment_rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {sa_product_analysis.fulfillment_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Unpaid Orders</p>
                    <p className="text-xl font-bold text-red-400">{sa_product_analysis.unpaid_orders.count}</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Unpaid Amount</p>
                    <p className="text-xl font-bold text-red-400">₱{sa_product_analysis.unpaid_orders.amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Out of Stock</p>
                    <p className={`text-xl font-bold ${sa_product_analysis.inventory_health.out_of_stock > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {sa_product_analysis.inventory_health.out_of_stock}
                    </p>
                  </div>
                </div>

                {/* Top SA Products */}
                {sa_product_analysis.top_products?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Top Products (Central Warehouse Sales):</p>
                    <div className="space-y-2">
                      {sa_product_analysis.top_products.slice(0, 5).map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs">#{idx + 1}</span>
                            <span className="text-white text-sm">{product.name}</span>
                            <span className="text-gray-500 text-xs">({product.branch_count} branches, {product.quantity} units)</span>
                          </div>
                          <span className="text-orange-400 text-sm">₱{product.revenue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Branches with Unpaid Orders */}
                {sa_product_analysis.unpaid_orders.branches_with_unpaid?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Branches with Unpaid Product Orders:</p>
                    <div className="space-y-2">
                      {sa_product_analysis.unpaid_orders.branches_with_unpaid.slice(0, 5).map((branch, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg">
                          <span className="text-white text-sm">{branch.branch_name}</span>
                          <span className="text-red-400 text-sm">₱{branch.unpaid_amount.toLocaleString()} ({branch.unpaid_count} orders)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Low Stock Items */}
                {sa_product_analysis.inventory_health.low_stock_items?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Low Stock Alert ({sa_product_analysis.inventory_health.low_stock} items):</p>
                    <div className="flex flex-wrap gap-2">
                      {sa_product_analysis.inventory_health.low_stock_items.map((item, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                          {item.name} ({item.stock}/{item.minStock})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Branch Performance */}
        {branch_performance.declining_branches.length > 0 && (
          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Declining Branches ({branch_performance.declining_branches.length})
            </h4>
            <div className="space-y-2">
              {branch_performance.declining_branches.map((branch, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                  <div>
                    <p className="text-white font-medium">{branch.branch_name}</p>
                    <p className="text-gray-500 text-xs">Current: ₱{branch.current_revenue.toLocaleString()} | Previous: ₱{branch.previous_revenue.toLocaleString()}</p>
                  </div>
                  <span className="text-red-400 font-bold">{branch.change_percent.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wallet Analysis */}
        <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-400" />
            Wallet Top-up Distribution
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(wallet_analysis.topup_distribution).map(([bracket, count]) => (
              <div key={bracket} className="bg-[#1A1A1A] rounded-lg p-3 text-center">
                <p className="text-gray-400 text-xs">₱{bracket}</p>
                <p className="text-white font-bold text-lg">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Predictive Tab Content
  const renderPredictive = () => {
    if (!predictiveData) return <LoadingState />

    const { revenue_forecast, royalty_forecast, branch_growth_forecast, wallet_forecast, product_order_forecast, trend_analysis, historical_data, product_order_historical } = predictiveData

    return (
      <div className="space-y-6">
        {/* Trend Banner */}
        <div className={`rounded-xl p-4 border ${
          trend_analysis.overall_trend === 'upward' ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' :
          trend_analysis.overall_trend === 'downward' ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30' :
          'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-5 h-5 ${
              trend_analysis.overall_trend === 'upward' ? 'text-green-400' :
              trend_analysis.overall_trend === 'downward' ? 'text-red-400' :
              'text-blue-400'
            }`} />
            <span className={`font-semibold ${
              trend_analysis.overall_trend === 'upward' ? 'text-green-400' :
              trend_analysis.overall_trend === 'downward' ? 'text-red-400' :
              'text-blue-400'
            }`}>
              {trend_analysis.overall_trend.charAt(0).toUpperCase() + trend_analysis.overall_trend.slice(1)} Trend ({trend_analysis.trend_percent}%)
            </span>
          </div>
          <p className="text-gray-300 text-sm">Based on {trend_analysis.data_points} months of historical data</p>
        </div>

        {/* Forecast Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-gray-400 text-sm">Revenue (Next 3mo)</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ₱{revenue_forecast.reduce((sum, f) => sum + f.predicted_revenue, 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-400 text-sm">Royalties (Next Qtr)</span>
            </div>
            <p className="text-2xl font-bold text-white">₱{royalty_forecast.next_quarter.toLocaleString()}</p>
          </div>

          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
            <div className="flex items-center gap-2 mb-3">
              <Building className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 text-sm">New Branches (Next Qtr)</span>
            </div>
            <p className="text-2xl font-bold text-white">+{branch_growth_forecast.expected_next_quarter}</p>
            <p className="text-xs text-gray-500">Current: {branch_growth_forecast.current_total} branches</p>
          </div>

          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400 text-sm">Wallet Top-ups (Next Qtr)</span>
            </div>
            <p className="text-2xl font-bold text-white">₱{wallet_forecast.next_quarter.toLocaleString()}</p>
          </div>
        </div>

        {/* SA Product Order Forecast */}
        {product_order_forecast && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#2A2A2A] rounded-xl p-5 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-orange-400" />
                <span className="text-gray-400 text-sm">SA Product Sales (Next Qtr)</span>
              </div>
              <p className="text-2xl font-bold text-white">₱{product_order_forecast.next_quarter_revenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500">~{product_order_forecast.expected_monthly_orders} orders/month</p>
            </div>

            <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span className="text-gray-400 text-sm">Monthly Avg Revenue</span>
              </div>
              <p className="text-2xl font-bold text-white">₱{product_order_forecast.expected_monthly_revenue.toLocaleString()}</p>
            </div>

            <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50 col-span-1 sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <span className="text-gray-400 text-sm">SA Product Order Trend</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${
                  product_order_forecast.trend === 'upward' ? 'text-green-400' :
                  product_order_forecast.trend === 'downward' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  {product_order_forecast.trend.charAt(0).toUpperCase() + product_order_forecast.trend.slice(1)}
                </span>
                <span className="text-gray-500 text-sm">({product_order_forecast.data_points} months data)</span>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Forecast Detail */}
        <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Monthly Revenue Forecast
          </h4>
          <div className="space-y-3">
            {revenue_forecast.map((forecast, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                <div>
                  <p className="text-white font-medium">{forecast.month_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    forecast.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                    forecast.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {forecast.confidence} confidence
                  </span>
                </div>
                <span className="text-green-400 font-bold text-lg">₱{forecast.predicted_revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Trend */}
        <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#444]/50">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Historical Revenue (Last 6 Months)
          </h4>
          <div className="space-y-2">
            {historical_data.slice(-6).map((data, idx) => {
              const maxRev = Math.max(...historical_data.map(d => d.revenue))
              const width = maxRev > 0 ? (data.revenue / maxRev) * 100 : 0
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-20">{data.month}</span>
                  <div className="flex-1 h-6 bg-[#1A1A1A] rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-end pr-2"
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-white text-xs font-medium">₱{(data.revenue / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* SA Product Order Historical */}
        {product_order_historical && product_order_historical.length > 0 && (
          <div className="bg-[#2A2A2A] rounded-xl p-5 border border-orange-500/30">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-400" />
              SA Product Order History (Last 6 Months)
            </h4>
            <div className="space-y-2">
              {product_order_historical.slice(-6).map((data, idx) => {
                const maxRev = Math.max(...product_order_historical.map(d => d.revenue))
                const width = maxRev > 0 ? (data.revenue / maxRev) * 100 : 0
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-20">{data.month}</span>
                    <div className="flex-1 h-6 bg-[#1A1A1A] rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded flex items-center justify-end pr-2"
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-white text-xs font-medium">₱{(data.revenue / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                    <span className="text-gray-500 text-xs w-16 text-right">{data.order_count} orders</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Prescriptive Tab Content
  const renderPrescriptive = () => {
    if (!prescriptiveData) return <LoadingState />

    const { strategies, summary, kpis } = prescriptiveData

    return (
      <div className="space-y-6">
        {/* KPIs Overview */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-semibold">Key Performance Indicators</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-xs">Wallet Adoption</p>
              <p className="text-white font-bold">{kpis.wallet_adoption}</p>
            </div>
            <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-xs">Product Ratio</p>
              <p className="text-white font-bold">{kpis.product_ratio}</p>
            </div>
            <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-xs">Avg Branch Rev</p>
              <p className="text-white font-bold">{kpis.avg_branch_revenue}</p>
            </div>
            <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-xs">Overdue Royalties</p>
              <p className="text-red-400 font-bold">{kpis.overdue_royalties}</p>
            </div>
            <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-xs">Underperforming</p>
              <p className={`font-bold ${kpis.underperforming_branches > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {kpis.underperforming_branches} branches
              </p>
            </div>
          </div>

          {/* SA Product Order KPIs */}
          {kpis.sa_product_orders && (
            <div className="mt-4 pt-4 border-t border-[#444]/50">
              <p className="text-orange-400 text-xs font-medium mb-2">SA Product Orders</p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Orders</p>
                  <p className="text-white font-bold">{kpis.sa_product_orders.total_orders}</p>
                </div>
                <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Revenue</p>
                  <p className="text-orange-400 font-bold">{kpis.sa_product_orders.total_revenue}</p>
                </div>
                <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Unpaid</p>
                  <p className="text-red-400 font-bold">{kpis.sa_product_orders.unpaid_amount}</p>
                </div>
                <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Avg Order</p>
                  <p className="text-white font-bold">{kpis.sa_product_orders.avg_order_value}</p>
                </div>
                <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Out of Stock</p>
                  <p className={`font-bold ${kpis.sa_product_orders.out_of_stock > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {kpis.sa_product_orders.out_of_stock}
                  </p>
                </div>
                <div className="bg-[#1A1A1A]/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Low Stock</p>
                  <p className={`font-bold ${kpis.sa_product_orders.low_stock > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {kpis.sa_product_orders.low_stock}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Strategies */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Rocket className="w-4 h-4 text-purple-400" />
              Strategic Recommendations ({summary.total_strategies})
            </h4>
            <span className="text-xs text-red-400 font-medium">{summary.high_priority} high priority</span>
          </div>

          {strategies.map((strategy, idx) => (
            <div key={idx} className={`bg-[#2A2A2A] rounded-xl p-5 border ${
              strategy.priority === 'high' ? 'border-red-500/30' :
              strategy.priority === 'medium' ? 'border-yellow-500/30' :
              'border-blue-500/30'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      strategy.category === 'expansion' ? 'bg-green-500/20 text-green-400' :
                      strategy.category === 'finance' ? 'bg-yellow-500/20 text-yellow-400' :
                      strategy.category === 'digital' ? 'bg-blue-500/20 text-blue-400' :
                      strategy.category === 'revenue' ? 'bg-purple-500/20 text-purple-400' :
                      strategy.category === 'operations' ? 'bg-orange-500/20 text-orange-400' :
                      strategy.category === 'inventory' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-pink-500/20 text-pink-400'
                    }`}>{strategy.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      strategy.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      strategy.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{strategy.priority}</span>
                  </div>
                  <h5 className="text-white font-semibold text-lg">{strategy.title}</h5>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-3">{strategy.description}</p>

              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Impact: {strategy.impact}</span>
              </div>

              <div className="bg-[#1A1A1A] rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Action Items
                </p>
                <ul className="space-y-1">
                  {strategy.action_items.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* DDPP Tab Navigation */}
      <div className="grid grid-cols-4 gap-2 bg-[#1A1A1A] p-2 rounded-xl">
        {tabs.map(tab => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                  : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
              }`}
            >
              <IconComponent className="w-5 h-5 mb-1" />
              <span className="text-sm font-medium">{tab.label}</span>
              <span className="text-xs opacity-70 hidden sm:block">{tab.description}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'descriptive' && renderDescriptive()}
      {activeTab === 'diagnostic' && renderDiagnostic()}
      {activeTab === 'predictive' && renderPredictive()}
      {activeTab === 'prescriptive' && renderPrescriptive()}
    </div>
  )
}

// Loading State Component
const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    <span className="ml-3 text-gray-400">Loading analytics...</span>
  </div>
)

export default SystemReports