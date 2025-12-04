import React, { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Download, Calendar, Building, Users, DollarSign, Activity, Filter, ArrowUp, ArrowDown, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const SystemReports = ({ onRefresh }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  // Query all data - with pagination limits to avoid byte limit errors
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const bookingsData = useQuery(api.services.bookings.getAllBookings, { limit: 200 })
  const bookings = bookingsData?.bookings || []
  const transactionsData = useQuery(api.services.transactions.getAllTransactions, { limit: 200 })
  const transactions = transactionsData?.transactions || []
  const users = useQuery(api.services.auth.getAllUsers) || []
  const barbers = useQuery(api.services.barbers.getAllBarbers) || []
  const services = useQuery(api.services.services.getAllServices) || []

  // Calculate date range
  const getDateRange = () => {
    const now = new Date()
    let startDate = new Date()

    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 1)
    }

    return { startDate, endDate: now }
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

  // Branch performance
  const branchPerformance = useMemo(() => {
    const branchStats = {}

    branches.forEach(branch => {
      branchStats[branch._id] = {
        branch,
        bookings: 0,
        revenue: 0,
        transactions: 0,
        activeStaff: 0,
        activeBarbers: 0
      }
    })

    filteredBookings.forEach(b => {
      if (branchStats[b.branch_id]) {
        branchStats[b.branch_id].bookings += 1
        if (b.status === 'completed') {
          branchStats[b.branch_id].revenue += b.price || 0
        }
      }
    })

    filteredTransactions.forEach(t => {
      if (branchStats[t.branch_id]) {
        branchStats[t.branch_id].transactions += 1
        branchStats[t.branch_id].revenue += t.total_amount
      }
    })

    // Count active staff per branch
    users.forEach(u => {
      if (u.is_active && (u.role === 'staff' || u.role === 'branch_admin') && u.branch_id && branchStats[u.branch_id]) {
        branchStats[u.branch_id].activeStaff += 1
      }
    })

    barbers.forEach(b => {
      if (b.is_active && branchStats[b.branch_id]) {
        branchStats[b.branch_id].activeBarbers += 1
      }
    })

    return Object.values(branchStats).sort((a, b) => b.revenue - a.revenue)
  }, [branches, filteredBookings, filteredTransactions, users, barbers])

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
      })),
      branchPerformance: branchPerformance.map(bp => ({
        branch: bp.branch?.name,
        bookings: bp.bookings,
        transactions: bp.transactions,
        revenue: bp.revenue,
        staff: bp.activeStaff,
        barbers: bp.activeBarbers
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

  const renderBranchAnalytics = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
        <Building className="w-6 h-6 text-[var(--color-primary)]" />
        <span>Branch Performance Analysis</span>
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {branchPerformance.length > 0 ? (
          branchPerformance.map((bp) => (
            <div key={bp.branch._id} className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-6 border border-[#444444]/50 hover:border-[var(--color-primary)]/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">{bp.branch.name}</h4>
                <span className="px-3 py-1 bg-[var(--color-primary)]/20 rounded-full text-sm text-[var(--color-primary)]">{bp.branch.branch_code}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Revenue</p>
                  <p className="text-xl font-bold text-green-400">₱{bp.revenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Bookings</p>
                  <p className="text-xl font-bold text-blue-400">{bp.bookings}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Transactions</p>
                  <p className="text-xl font-bold text-purple-400">{bp.transactions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Staff</p>
                  <p className="text-xl font-bold text-yellow-400">{bp.activeStaff}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Barbers</p>
                  <p className="text-xl font-bold text-pink-400">{bp.activeBarbers}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No branch data available</p>
          </div>
        )}
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
      <div className="flex space-x-4 border-b border-[#333333]">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'branches', label: 'Branches', icon: Building }
        ].map(tab => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-all ${
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
      {activeTab === 'branches' && renderBranchAnalytics()}
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

export default SystemReports