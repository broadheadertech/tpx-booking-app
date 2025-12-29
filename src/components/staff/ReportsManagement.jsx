import React, { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Users, Calendar,
  Download, RefreshCw, Scissors, Clock, Award, AlertCircle,
  ChevronRight, Star, Package, CreditCard, ArrowUp, ArrowDown,
  BarChart3, PieChart, LineChart, Target, ShoppingCart, UserCheck,
  AlertTriangle, Bell, Zap, Brain, TrendingUpDown, Activity, XCircle
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const ReportsManagement = ({ onRefresh, user }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [activeTab, setActiveTab] = useState('descriptive')
  const [loading, setLoading] = useState(false)

  // Calculate date ranges for fetching (include previous period for comparison) using useMemo for stability
  const { queryStart, queryEnd, startDateStr, endDateStr } = useMemo(() => {
    const now = new Date();
    // Set end to end of day to be stable and inclusive
    const end = new Date(now).setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    let days = 1;
    if (selectedPeriod === 'today') days = 2; // Today + Yesterday
    if (selectedPeriod === 'week') days = 14; // 2 Weeks
    if (selectedPeriod === 'month') days = 60; // 2 Months
    if (selectedPeriod === 'year') days = 730; // 2 Years

    start.setDate(start.getDate() - days);

    return {
      queryStart: start.getTime(),
      queryEnd: end,
      startDateStr: start.toISOString().split('T')[0],
      endDateStr: now.toISOString().split('T')[0]
    };
  }, [selectedPeriod]);

  // Fetch data with specific date ranges to support "This Year" and other long periods
  // We fetch enough data for current period + previous period comparison
  const bookingsData = user?.role === 'super_admin'
    ? useQuery(api.services.bookings.getBookingsByDateRange, { startDate: startDateStr, endDate: endDateStr })
    : user?.branch_id
      ? useQuery(api.services.bookings.getBookingsByDateRange, { startDate: startDateStr, endDate: endDateStr, branch_id: user.branch_id })
      : null

  // Handle both array return (from new date range query) and object return (legacy pagination support if needed)
  const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData?.bookings || [])

  const transactionsData = user?.role === 'super_admin'
    ? useQuery(api.services.transactions.getTransactionsByDateRange, { startDate: queryStart, endDate: queryEnd })
    : user?.branch_id
      ? useQuery(api.services.transactions.getTransactionsByDateRange, { startDate: queryStart, endDate: queryEnd, branch_id: user.branch_id })
      : null

  const transactions = transactionsData || []

  const barbers = user?.role === 'branch_admin'
    ? useQuery(api.services.barbers.getAllBarbers)
    : user?.branch_id
      ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
      : []

  const services = user?.role === 'branch_admin'
    ? useQuery(api.services.services.getAllServices)
    : user?.branch_id
      ? useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id })
      : []

  const products = useQuery(api.services.products.getAllProducts)

  // Helper functions (defined before useMemo to avoid initialization errors)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatTime = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:00 ${period}`
  }

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    if (!bookings || !transactions || !barbers || !services || !products) return null

    // Local helper function for time formatting (to avoid hoisting issues)
    const formatTimeLocal = (hour) => {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      return `${displayHour}:00 ${period}`
    }


    const now = Date.now()
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const weekStart = now - (7 * 24 * 60 * 60 * 1000)
    const monthStart = now - (30 * 24 * 60 * 60 * 1000)
    const yearStart = now - (365 * 24 * 60 * 60 * 1000)

    // Get period data
    let periodStart = todayStart
    if (selectedPeriod === 'week') periodStart = weekStart
    if (selectedPeriod === 'month') periodStart = monthStart
    if (selectedPeriod === 'year') periodStart = yearStart

    // Filter transactions - include both 'completed' payment_status and 'paid' status for consistency
    const periodTransactions = transactions.filter(t =>
      t.createdAt >= periodStart &&
      (t.payment_status === 'completed' || t.payment_status === 'paid')
    )

    // Filter bookings by appointment date (b.date) - the actual scheduled date
    // This ensures we count bookings based on when they were scheduled, not when created
    const periodBookings = bookings.filter(b => {
      if (!b.date) return false

      // Convert booking date string (YYYY-MM-DD) to timestamp for comparison
      const bookingDate = new Date(b.date).setHours(0, 0, 0, 0)
      const periodEnd = Date.now()

      return bookingDate >= periodStart && bookingDate <= periodEnd
    })
    const validPeriodBookings = periodBookings.filter(b => b.status !== 'cancelled')
    const allCompletedTransactions = transactions.filter(t =>
      t.payment_status === 'completed' || t.payment_status === 'paid'
    )

    // Previous period for comparison
    const periodLength = now - periodStart
    const prevPeriodStart = periodStart - periodLength
    const prevPeriodEnd = periodStart
    const prevTransactions = transactions.filter(t =>
      t.createdAt >= prevPeriodStart &&
      t.createdAt < prevPeriodEnd &&
      (t.payment_status === 'completed' || t.payment_status === 'paid')
    )
    // Filter previous period bookings by appointment date
    const prevBookings = bookings.filter(b => {
      if (!b.date) return false
      const bookingDate = new Date(b.date).setHours(0, 0, 0, 0)
      return bookingDate >= prevPeriodStart && bookingDate < prevPeriodEnd
    })
    const prevValidBookings = prevBookings.filter(b => b.status !== 'cancelled')

    // === DESCRIPTIVE ANALYTICS: What happened? ===

    // Revenue metrics
    const totalRevenue = periodTransactions.reduce((sum, t) => sum + t.total_amount, 0)
    const prevRevenue = prevTransactions.reduce((sum, t) => sum + t.total_amount, 0)
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

    const servicesRevenue = periodTransactions.reduce((sum, t) => {
      return sum + (t.services || []).reduce((s, svc) => s + (svc.price * svc.quantity), 0)
    }, 0)

    const productsRevenue = periodTransactions.reduce((sum, t) => {
      return sum + (t.products || []).reduce((s, p) => s + (p.price * p.quantity), 0)
    }, 0)

    // Customer metrics
    const uniqueCustomers = new Set(periodTransactions.map(t => t.customer || t.customer_name)).size
    const prevCustomers = new Set(prevTransactions.map(t => t.customer || t.customer_name)).size
    const customerChange = prevCustomers > 0 ? ((uniqueCustomers - prevCustomers) / prevCustomers) * 100 : 0

    // Transaction metrics
    const transactionCount = periodTransactions.length
    const avgTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0
    const prevAvgTransaction = prevTransactions.length > 0
      ? prevTransactions.reduce((sum, t) => sum + t.total_amount, 0) / prevTransactions.length
      : 0
    const avgTransactionChange = prevAvgTransaction > 0 ? ((avgTransaction - prevAvgTransaction) / prevAvgTransaction) * 100 : 0

    // Booking completion metrics
    const completedBookings = validPeriodBookings.filter(b => b.status === 'completed').length
    const completionRate = validPeriodBookings.length > 0 ? (completedBookings / validPeriodBookings.length) * 100 : 0
    const prevCompletionRate = prevValidBookings.length > 0
      ? (prevValidBookings.filter(b => b.status === 'completed').length / prevValidBookings.length) * 100
      : 0

    // Count completed services from transactions (more accurate for walk-in customers)
    const completedServices = periodTransactions.reduce((sum, t) =>
      sum + (t.services?.length || 0), 0
    )

    // Staff performance
    const barberStats = barbers.map(barber => {
      const barberTransactions = periodTransactions.filter(t => t.barber === barber._id)
      const barberRevenue = barberTransactions.reduce((sum, t) => sum + t.total_amount, 0)
      const barberBookings = validPeriodBookings.filter(b => b.barber === barber._id)
      const completedBookings = barberBookings.filter(b => b.status === 'completed').length
      const completionRate = barberBookings.length > 0 ? (completedBookings / barberBookings.length) * 100 : 0

      const prevBarberTransactions = prevTransactions.filter(t => t.barber === barber._id)
      const prevRevenue = prevBarberTransactions.reduce((sum, t) => sum + t.total_amount, 0)
      const revenueGrowth = prevRevenue > 0 ? ((barberRevenue - prevRevenue) / prevRevenue) * 100 : 0

      return {
        id: barber._id,
        name: barber.full_name,
        revenue: barberRevenue,
        transactions: barberTransactions.length,
        bookings: barberBookings.length,
        completionRate,
        avgTransaction: barberTransactions.length > 0 ? barberRevenue / barberTransactions.length : 0,
        revenueGrowth
      }
    }).sort((a, b) => b.revenue - a.revenue)

    // Top services
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
    const popularServices = Object.values(serviceStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    // === DIAGNOSTIC ANALYTICS: Why did it happen? ===

    // Peak hours analysis
    const hourStats = Array(24).fill(0).map((_, hour) => ({
      hour,
      transactions: 0,
      revenue: 0
    }))

    periodTransactions.forEach(t => {
      const hour = new Date(t.createdAt).getHours()
      hourStats[hour].transactions++
      hourStats[hour].revenue += t.total_amount
    })

    const peakHours = [...hourStats].sort((a, b) => b.transactions - a.transactions).slice(0, 3)
    const peakRevenueHours = [...hourStats].sort((a, b) => b.revenue - a.revenue).slice(0, 3)

    // Service-Product correlation
    const serviceProductCorrelation = {}
    periodTransactions.forEach(t => {
      t.services.forEach(service => {
        if (!serviceProductCorrelation[service.service_name]) {
          serviceProductCorrelation[service.service_name] = {}
        }
        (t.products || []).forEach(product => {
          if (!serviceProductCorrelation[service.service_name][product.product_name]) {
            serviceProductCorrelation[service.service_name][product.product_name] = 0
          }
          serviceProductCorrelation[service.service_name][product.product_name]++
        })
      })
    })

    // Customer retention (repeat customers)
    const customerFrequency = {}
    allCompletedTransactions.forEach(t => {
      const customerId = t.customer || t.customer_name
      if (customerId) {
        customerFrequency[customerId] = (customerFrequency[customerId] || 0) + 1
      }
    })
    const repeatCustomers = Object.values(customerFrequency).filter(freq => freq > 1).length
    const totalCustomersAllTime = Object.keys(customerFrequency).length
    const retentionRate = totalCustomersAllTime > 0 ? (repeatCustomers / totalCustomersAllTime) * 100 : 0
    const avgVisitsPerCustomer = totalCustomersAllTime > 0
      ? Object.values(customerFrequency).reduce((sum, freq) => sum + freq, 0) / totalCustomersAllTime
      : 0

    // Day of week analysis
    const dayStats = Array(7).fill(0).map((_, day) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      transactions: 0,
      revenue: 0
    }))

    periodTransactions.forEach(t => {
      const day = new Date(t.createdAt).getDay()
      dayStats[day].transactions++
      dayStats[day].revenue += t.total_amount
    })

    const busiestDays = [...dayStats].sort((a, b) => b.transactions - a.transactions).slice(0, 3)

    // Cancellation analysis
    const cancelledBookings = periodBookings.filter(b => b.status === 'cancelled')
    const cancellationRate = periodBookings.length > 0 ? (cancelledBookings.length / periodBookings.length) * 100 : 0

    // === PREDICTIVE ANALYTICS: What will happen? ===

    // Revenue forecast (simple linear projection)
    const last7DaysRevenue = transactions
      .filter(t => t.createdAt >= now - (7 * 24 * 60 * 60 * 1000) && t.payment_status === 'completed')
      .reduce((sum, t) => sum + t.total_amount, 0)
    const dailyAvgRevenue = last7DaysRevenue / 7
    const next7DaysForecast = dailyAvgRevenue * 7
    const next30DaysForecast = dailyAvgRevenue * 30

    // Product demand forecast
    const productDemand = {}
    const recentTransactions = transactions.filter(t => t.createdAt >= monthStart)
    recentTransactions.forEach(t => {
      (t.products || []).forEach(p => {
        if (!productDemand[p.product_id]) {
          productDemand[p.product_id] = {
            name: p.product_name,
            totalSold: 0,
            avgPerWeek: 0
          }
        }
        productDemand[p.product_id].totalSold += p.quantity
      })
    })

    Object.keys(productDemand).forEach(key => {
      const weeksInPeriod = (now - monthStart) / (7 * 24 * 60 * 60 * 1000)
      productDemand[key].avgPerWeek = productDemand[key].totalSold / weeksInPeriod
      productDemand[key].forecastNextWeek = Math.ceil(productDemand[key].avgPerWeek)
      productDemand[key].forecastNextMonth = Math.ceil(productDemand[key].avgPerWeek * 4)
    })

    // Customer churn prediction
    const customersNotSeenRecently = []
    Object.entries(customerFrequency).forEach(([customerId, frequency]) => {
      const customerTransactions = allCompletedTransactions.filter(t =>
        (t.customer || t.customer_name) === customerId
      )
      if (customerTransactions.length > 0) {
        const lastVisit = Math.max(...customerTransactions.map(t => t.createdAt))
        const daysSinceLastVisit = (now - lastVisit) / (24 * 60 * 60 * 1000)

        if (daysSinceLastVisit > 30 && frequency > 2) {
          customersNotSeenRecently.push({
            id: customerId,
            frequency,
            daysSinceLastVisit: Math.floor(daysSinceLastVisit),
            churnRisk: daysSinceLastVisit > 60 ? 'High' : 'Medium'
          })
        }
      }
    })

    const churnRisk = customersNotSeenRecently.length
    const churnRate = totalCustomersAllTime > 0 ? (churnRisk / totalCustomersAllTime) * 100 : 0

    // Growth trend prediction
    const growthTrend = revenueChange > 5 ? 'Increasing' : revenueChange < -5 ? 'Decreasing' : 'Stable'
    const predictedMonthlyRevenue = growthTrend === 'Increasing'
      ? totalRevenue * 1.1
      : growthTrend === 'Decreasing'
        ? totalRevenue * 0.9
        : totalRevenue

    // === PRESCRIPTIVE ANALYTICS: What should be done? ===

    // Promotion suggestions
    const promotionSuggestions = []

    // Low performing services
    const avgServiceRevenue = popularServices.length > 0
      ? popularServices.reduce((sum, s) => sum + s.revenue, 0) / popularServices.length
      : 0

    Object.values(serviceStats).forEach(service => {
      if (service.revenue < avgServiceRevenue * 0.5 && service.revenue > 0) {
        promotionSuggestions.push({
          type: 'Service Promotion',
          target: service.name,
          suggestion: `Offer 20% discount to boost demand`,
          priority: 'Medium',
          expectedImpact: 'Increase bookings by 30-40%'
        })
      }
    })

    // Slow days promotion
    const avgDailyTransactions = dayStats.reduce((sum, d) => sum + d.transactions, 0) / 7
    dayStats.forEach(day => {
      if (day.transactions < avgDailyTransactions * 0.7 && day.transactions > 0) {
        promotionSuggestions.push({
          type: 'Day Promotion',
          target: `${day.day}days`,
          suggestion: `Offer "Happy ${day.day}" special discount`,
          priority: 'High',
          expectedImpact: 'Fill slow periods'
        })
      }
    })

    // Customer win-back
    if (customersNotSeenRecently.length > 0) {
      promotionSuggestions.push({
        type: 'Win-Back Campaign',
        target: `${customersNotSeenRecently.length} inactive customers`,
        suggestion: `Send personalized "We miss you" offers`,
        priority: 'High',
        expectedImpact: 'Recover 20-30% of at-risk customers'
      })
    }

    // Restocking alerts
    const restockingAlerts = products
      .filter(p => p.stock <= p.minStock && p.status !== 'inactive')
      .map(p => ({
        product: p.name,
        currentStock: p.stock,
        minStock: p.minStock,
        suggestedOrder: Math.max(p.minStock * 2, productDemand[p._id]?.forecastNextMonth || p.minStock * 2),
        urgency: p.stock === 0 ? 'Critical' : p.stock <= p.minStock * 0.5 ? 'High' : 'Medium'
      }))
      .sort((a, b) => a.currentStock - b.currentStock)

    // Staff scheduling recommendations
    const staffRecommendations = []

    // Peak hours staffing
    if (peakHours.length > 0) {
      const topPeakHour = peakHours[0]
      const avgTransactionsPerHour = hourStats.reduce((sum, h) => sum + h.transactions, 0) / 24
      if (topPeakHour.transactions > avgTransactionsPerHour * 1.5) {
        staffRecommendations.push({
          type: 'Peak Hour Staffing',
          timeframe: `${formatTimeLocal(topPeakHour.hour)} - ${formatTimeLocal((topPeakHour.hour + 2) % 24)}`,
          suggestion: `Add ${Math.ceil(topPeakHour.transactions / 5)} more barbers`,
          reason: `${topPeakHour.transactions} transactions during peak`,
          priority: 'High'
        })
      }
    }

    // Busy days staffing
    busiestDays.forEach((day, idx) => {
      if (idx < 2 && day.transactions > 0) {
        staffRecommendations.push({
          type: 'Busy Day Staffing',
          timeframe: `${day.day}s`,
          suggestion: `Ensure full staff availability`,
          reason: `Peak day with ${day.transactions} transactions`,
          priority: 'Medium'
        })
      }
    })

    // Underperforming staff support
    barberStats.forEach(barber => {
      if (barber.transactions > 0 && barber.completionRate < 70) {
        staffRecommendations.push({
          type: 'Staff Training',
          timeframe: 'This week',
          suggestion: `Provide booking management training for ${barber.name}`,
          reason: `Low completion rate: ${barber.completionRate.toFixed(0)}%`,
          priority: 'Medium'
        })
      }
    })

    // Payment method optimization
    const paymentMethods = {}
    periodTransactions.forEach(t => {
      if (!paymentMethods[t.payment_method]) paymentMethods[t.payment_method] = 0
      paymentMethods[t.payment_method]++
    })

    // Product performance
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
    const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    return {
      // Descriptive
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
        average: avgTransaction,
        change: avgTransactionChange
      },
      bookings: {
        total: validPeriodBookings.length,
        totalAll: periodBookings.length,
        completed: completedBookings,
        completionRate,
        completionChange: completionRate - prevCompletionRate,
        completedServices // Services completed via transactions (more accurate for walk-ins)
      },
      barbers: barberStats,
      services: popularServices,

      // Diagnostic
      peakHours,
      peakRevenueHours,
      serviceProductCorrelation,
      retentionRate,
      repeatCustomers,
      totalCustomersAllTime,
      avgVisitsPerCustomer,
      dayStats,
      busiestDays,
      cancellationRate,
      cancelledBookings: cancelledBookings.length,

      // Predictive
      forecast: {
        next7Days: next7DaysForecast,
        next30Days: next30DaysForecast,
        dailyAverage: dailyAvgRevenue,
        growthTrend,
        predictedMonthly: predictedMonthlyRevenue
      },
      productDemand,
      churnRisk: {
        count: churnRisk,
        rate: churnRate,
        customers: customersNotSeenRecently.slice(0, 10)
      },

      // Prescriptive
      promotionSuggestions: promotionSuggestions.slice(0, 5),
      restockingAlerts,
      staffRecommendations,

      // Additional
      paymentMethods,
      products: topProducts
    }
  }, [bookings, transactions, barbers, services, products, selectedPeriod])

  const handleExport = () => {
    if (!analytics) return

    const timestamp = new Date().toISOString().split('T')[0]
    let csv = `Business Analytics Report - ${selectedPeriod}\n`
    csv += `Generated: ${new Date().toLocaleString()}\n`
    csv += `Tab: ${activeTab}\n\n`

    if (activeTab === 'descriptive') {
      csv += `DESCRIPTIVE ANALYTICS: What Happened?\n\n`
      csv += `Revenue Summary\n`
      csv += `Total Revenue,${formatCurrency(analytics.revenue.total)}\n`
      csv += `Services Revenue,${formatCurrency(analytics.revenue.services)}\n`
      csv += `Products Revenue,${formatCurrency(analytics.revenue.products)}\n`
      csv += `Change vs Previous,${analytics.revenue.change.toFixed(1)}%\n\n`

      csv += `Top Services\n`
      csv += `Service,Count,Revenue\n`
      analytics.services.forEach(s => {
        csv += `"${s.name}",${s.count},${formatCurrency(s.revenue)}\n`
      })

      csv += `\nBarber Performance\n`
      csv += `Barber,Revenue,Transactions,Completion Rate\n`
      analytics.barbers.forEach(b => {
        csv += `"${b.name}",${formatCurrency(b.revenue)},${b.transactions},${b.completionRate.toFixed(1)}%\n`
      })
    } else if (activeTab === 'diagnostic') {
      csv += `DIAGNOSTIC ANALYTICS: Why It Happened?\n\n`
      csv += `Peak Hours\n`
      csv += `Hour,Transactions,Revenue\n`
      analytics.peakHours.forEach(h => {
        csv += `${formatTime(h.hour)},${h.transactions},${formatCurrency(h.revenue)}\n`
      })

      csv += `\nBusiest Days\n`
      csv += `Day,Transactions,Revenue\n`
      analytics.busiestDays.forEach(d => {
        csv += `${d.day},${d.transactions},${formatCurrency(d.revenue)}\n`
      })

      csv += `\nCustomer Retention\n`
      csv += `Retention Rate,${analytics.retentionRate.toFixed(1)}%\n`
      csv += `Repeat Customers,${analytics.repeatCustomers}\n`
      csv += `Avg Visits per Customer,${analytics.avgVisitsPerCustomer.toFixed(1)}\n`
    } else if (activeTab === 'predictive') {
      csv += `PREDICTIVE ANALYTICS: What Will Happen?\n\n`
      csv += `Revenue Forecast\n`
      csv += `Next 7 Days,${formatCurrency(analytics.forecast.next7Days)}\n`
      csv += `Next 30 Days,${formatCurrency(analytics.forecast.next30Days)}\n`
      csv += `Daily Average,${formatCurrency(analytics.forecast.dailyAverage)}\n`
      csv += `Growth Trend,${analytics.forecast.growthTrend}\n\n`

      csv += `Churn Risk\n`
      csv += `At-Risk Customers,${analytics.churnRisk.count}\n`
      csv += `Churn Rate,${analytics.churnRisk.rate.toFixed(1)}%\n`
    } else if (activeTab === 'prescriptive') {
      csv += `PRESCRIPTIVE ANALYTICS: What Should Be Done?\n\n`
      csv += `Promotion Suggestions\n`
      csv += `Type,Target,Suggestion,Priority\n`
      analytics.promotionSuggestions.forEach(p => {
        csv += `"${p.type}","${p.target}","${p.suggestion}",${p.priority}\n`
      })

      csv += `\nRestocking Alerts\n`
      csv += `Product,Current Stock,Min Stock,Suggested Order,Urgency\n`
      analytics.restockingAlerts.forEach(r => {
        csv += `"${r.product}",${r.currentStock},${r.minStock},${r.suggestedOrder},${r.urgency}\n`
      })

      csv += `\nStaff Recommendations\n`
      csv += `Type,Timeframe,Suggestion,Priority\n`
      analytics.staffRecommendations.forEach(s => {
        csv += `"${s.type}","${s.timeframe}","${s.suggestion}",${s.priority}\n`
      })
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-${activeTab}-${selectedPeriod}-${timestamp}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Business Analytics</h2>
          <p className="text-sm text-gray-400">Comprehensive performance insights</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          <button
            onClick={() => { setLoading(true); onRefresh?.(); setTimeout(() => setLoading(false), 1000) }}
            className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-accent)] transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-1">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('descriptive')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium transition-all text-sm ${activeTab === 'descriptive'
              ? 'bg-[var(--color-primary)] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Descriptive</span>
            <span className="sm:hidden">What</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium transition-all text-sm ${activeTab === 'diagnostic'
              ? 'bg-[var(--color-primary)] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
          >
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Diagnostic</span>
            <span className="sm:hidden">Why</span>
          </button>
          <button
            onClick={() => setActiveTab('predictive')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium transition-all text-sm ${activeTab === 'predictive'
              ? 'bg-[var(--color-primary)] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
          >
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Predictive</span>
            <span className="sm:hidden">Will</span>
          </button>
          <button
            onClick={() => setActiveTab('prescriptive')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium transition-all text-sm ${activeTab === 'prescriptive'
              ? 'bg-[var(--color-primary)] text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Prescriptive</span>
            <span className="sm:hidden">Do</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'descriptive' && (
        <DescriptiveAnalytics
          analytics={analytics}
          formatCurrency={formatCurrency}
          formatTime={formatTime}
        />
      )}

      {activeTab === 'diagnostic' && (
        <DiagnosticAnalytics
          analytics={analytics}
          formatCurrency={formatCurrency}
          formatTime={formatTime}
        />
      )}

      {activeTab === 'predictive' && (
        <PredictiveAnalytics
          analytics={analytics}
          formatCurrency={formatCurrency}
          formatTime={formatTime}
        />
      )}

      {activeTab === 'prescriptive' && (
        <PrescriptiveAnalytics
          analytics={analytics}
          formatCurrency={formatCurrency}
          formatTime={formatTime}
        />
      )}
    </div>
  )
}

// DESCRIPTIVE ANALYTICS TAB: What happened?
const DescriptiveAnalytics = ({ analytics, formatCurrency, formatTime }) => (
  <div className="space-y-4">
    {/* Key Metrics */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        icon={DollarSign}
        iconColor="text-[var(--color-primary)]"
        value={formatCurrency(analytics.revenue.total)}
        label="Total Revenue"
        change={analytics.revenue.change}
      />
      <MetricCard
        icon={Users}
        iconColor="text-gray-400"
        value={analytics.customers.unique}
        label="Customers"
        change={analytics.customers.change}
      />
      <MetricCard
        icon={CreditCard}
        iconColor="text-gray-400"
        value={analytics.transactions.count}
        label="Transactions"
        subtext={`Avg: ${formatCurrency(analytics.transactions.average)}`}
        change={analytics.transactions.change}
      />
      <MetricCard
        icon={Calendar}
        iconColor="text-gray-400"
        value={analytics.bookings.total > 0 ? `${analytics.bookings.completionRate.toFixed(0)}%` : 'N/A'}
        label="Completion Rate"
        subtext={analytics.bookings.total > 0 ? `${analytics.bookings.completed}/${analytics.bookings.total} bookings` : 'No bookings'}
        change={analytics.bookings.total > 0 ? analytics.bookings.completionChange : undefined}
      />
    </div>

    {/* Revenue Breakdown */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <Scissors className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Revenue Breakdown
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Services</span>
              <span className="text-white font-semibold">{formatCurrency(analytics.revenue.services)}</span>
            </div>
            <div className="w-full bg-[#0A0A0A] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] h-2 rounded-full transition-all duration-500"
                style={{ width: `${analytics.revenue.total > 0 ? (analytics.revenue.services / analytics.revenue.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.revenue.total > 0 ? ((analytics.revenue.services / analytics.revenue.total) * 100).toFixed(1) : '0.0'}% of total revenue
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Products</span>
              <span className="text-white font-semibold">{formatCurrency(analytics.revenue.products)}</span>
            </div>
            <div className="w-full bg-[#0A0A0A] rounded-full h-2">
              <div
                className="bg-gray-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${analytics.revenue.total > 0 ? (analytics.revenue.products / analytics.revenue.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.revenue.total > 0 ? ((analytics.revenue.products / analytics.revenue.total) * 100).toFixed(1) : '0.0'}% of total revenue
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <Clock className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Booking Performance
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Total Bookings</span>
            <span className="text-white font-bold text-xl">{analytics.bookings.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Completed</span>
            <span className="text-white font-semibold">{analytics.bookings.completed}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Services Completed</span>
            <span className="text-[var(--color-primary)] font-semibold">{analytics.bookings.completedServices}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Completion Rate</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">
                {analytics.bookings.total > 0 ? `${analytics.bookings.completionRate.toFixed(1)}%` : 'N/A'}
              </span>
              {analytics.bookings.total > 0 && analytics.bookings.completionChange !== 0 && (
                <span className={`text-xs flex items-center ${analytics.bookings.completionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {analytics.bookings.completionChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(analytics.bookings.completionChange).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Barber Performance */}
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <Award className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Staff Performance
      </h3>
      <div className="space-y-2">
        {analytics.barbers.slice(0, 5).map((barber, index) => (
          <div
            key={barber.id}
            className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg hover:bg-[#1A1A1A] transition-colors border border-[#2A2A2A]"
          >
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${index === 0 ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[#2A2A2A] text-gray-400'
                }`}>
                <span className="text-sm font-bold">#{index + 1}</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">{barber.name}</p>
                <p className="text-gray-400 text-xs">
                  {barber.transactions} txn{barber.bookings > 0 ? ` • ${barber.completionRate.toFixed(0)}% complete` : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">{formatCurrency(barber.revenue)}</p>
              <p className="text-gray-400 text-xs">Avg: {formatCurrency(barber.avgTransaction)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Services & Products */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <Scissors className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Top Services
        </h3>
        <div className="space-y-3">
          {analytics.services.slice(0, 5).map((service, index) => {
            const maxRevenue = analytics.services[0]?.revenue || 1
            const percentage = (service.revenue / maxRevenue) * 100

            return (
              <div key={service.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300 truncate flex-1">{service.name}</span>
                  <span className="text-white font-semibold ml-2">{formatCurrency(service.revenue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#0A0A0A] rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] h-1.5 rounded-full transition-all"
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

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <Package className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Top Products
        </h3>
        {analytics.products.length > 0 ? (
          <div className="space-y-3">
            {analytics.products.map((product, index) => {
              const maxRevenue = analytics.products[0]?.revenue || 1
              const percentage = (product.revenue / maxRevenue) * 100

              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-300 truncate flex-1">{product.name}</span>
                    <span className="text-white font-semibold ml-2">{formatCurrency(product.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#0A0A0A] rounded-full h-1.5">
                      <div
                        className="bg-gray-500 h-1.5 rounded-full transition-all"
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
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <CreditCard className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Payment Methods Distribution
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(analytics.paymentMethods).map(([method, count]) => {
          const percentage = analytics.transactions.count > 0 ? (count / analytics.transactions.count) * 100 : 0
          return (
            <div key={method} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white mb-1">{count}</p>
              <p className="text-xs text-gray-400 capitalize mb-1">
                {method.replace('_', ' ')}
              </p>
              <p className="text-xs text-gray-500">
                {percentage.toFixed(0)}%
              </p>
            </div>
          )
        })}
      </div>
    </div>
  </div>
)

// DIAGNOSTIC ANALYTICS TAB: Why did it happen?
const DiagnosticAnalytics = ({ analytics, formatCurrency, formatTime }) => (
  <div className="space-y-4">
    {/* Peak Hours Analysis */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <Clock className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Peak Transaction Hours
        </h3>
        <div className="space-y-3">
          {analytics.peakHours.map((hour, index) => (
            <div key={hour.hour} className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${index === 0 ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[#2A2A2A] text-gray-400'
                  }`}>
                  <span className="text-sm font-bold">#{index + 1}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{formatTime(hour.hour)}</p>
                  <p className="text-gray-400 text-xs">{hour.transactions} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{formatCurrency(hour.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 Schedule more staff during these high-traffic periods
        </p>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <Calendar className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Busiest Days
        </h3>
        <div className="space-y-3">
          {analytics.busiestDays.map((day, index) => (
            <div key={day.day} className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${index === 0 ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[#2A2A2A] text-gray-400'
                  }`}>
                  <span className="text-sm font-bold">#{index + 1}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{day.day}</p>
                  <p className="text-gray-400 text-xs">{day.transactions} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{formatCurrency(day.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 Optimize inventory and staffing for peak days
        </p>
      </div>
    </div>

    {/* Customer Retention Analysis */}
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <UserCheck className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Customer Retention Insights
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-white mb-1">{analytics.retentionRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400">Retention Rate</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-white mb-1">{analytics.repeatCustomers}</p>
          <p className="text-xs text-gray-400">Repeat Customers</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-white mb-1">{analytics.totalCustomersAllTime}</p>
          <p className="text-xs text-gray-400">Total Customers</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-white mb-1">{analytics.avgVisitsPerCustomer.toFixed(1)}</p>
          <p className="text-xs text-gray-400">Avg Visits/Customer</p>
        </div>
      </div>
      <div className="mt-4 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
        <p className="text-sm text-gray-300">
          {analytics.retentionRate > 60 ? (
            <>✅ Strong retention rate indicates customer satisfaction</>
          ) : analytics.retentionRate > 40 ? (
            <>⚠️ Moderate retention - consider loyalty programs</>
          ) : (
            <>🔴 Low retention - immediate action needed</>
          )}
        </p>
      </div>
    </div>

    {/* Cancellation Analysis */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <XCircle className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Booking Cancellation Rate
        </h3>
        <div className="text-center py-4">
          <p className="text-5xl font-bold text-white mb-2">{analytics.cancellationRate.toFixed(1)}%</p>
          <p className="text-gray-400 text-sm mb-4">
            {analytics.cancelledBookings} out of {analytics.bookings.totalAll} bookings
          </p>
          <div className="w-full bg-[#0A0A0A] rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full ${analytics.cancellationRate > 20 ? 'bg-red-500' :
                analytics.cancellationRate > 10 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
              style={{ width: `${Math.min(analytics.cancellationRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {analytics.cancellationRate > 20 ? '🔴 High cancellation rate - investigate causes' :
              analytics.cancellationRate > 10 ? '⚠️ Moderate - send reminders' :
                '✅ Low cancellation rate'}
          </p>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <Activity className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Daily Performance Pattern
        </h3>
        <div className="space-y-2">
          {analytics.dayStats.map((day, index) => {
            const maxTransactions = Math.max(...analytics.dayStats.map(d => d.transactions))
            const percentage = maxTransactions > 0 ? (day.transactions / maxTransactions) * 100 : 0

            return (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300 w-12">{day.day}</span>
                  <span className="text-gray-400 text-xs flex-1 text-right mr-2">{day.transactions} txn</span>
                </div>
                <div className="w-full bg-[#0A0A0A] rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] h-1.5 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>

    {/* Service-Product Correlation */}
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <ShoppingCart className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Service-Product Purchase Correlation
      </h3>
      {Object.keys(analytics.serviceProductCorrelation).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(analytics.serviceProductCorrelation).slice(0, 5).map(([service, products]) => {
            const topProduct = Object.entries(products).sort(([, a], [, b]) => b - a)[0]
            if (!topProduct) return null

            return (
              <div key={service} className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{service}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Often bought with: <span className="text-white">{topProduct[0]}</span> ({topProduct[1]}x)
                    </p>
                  </div>
                  <div className="ml-3">
                    <span className="px-2 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs rounded-full">
                      {topProduct[1]}x
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">No service-product correlations found</p>
      )}
      <p className="text-xs text-gray-500 mt-3">
        💡 Use these insights to create bundle offers
      </p>
    </div>
  </div>
)

// PREDICTIVE ANALYTICS TAB: What will happen?
const PredictiveAnalytics = ({ analytics, formatCurrency, formatTime }) => (
  <div className="space-y-4">
    {/* Revenue Forecast */}
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <TrendingUp className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Revenue Forecast
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white mb-1">{formatCurrency(analytics.forecast.dailyAverage)}</p>
          <p className="text-xs text-gray-400">Daily Average</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white mb-1">{formatCurrency(analytics.forecast.next7Days)}</p>
          <p className="text-xs text-gray-400">Next 7 Days</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white mb-1">{formatCurrency(analytics.forecast.next30Days)}</p>
          <p className="text-xs text-gray-400">Next 30 Days</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            {analytics.forecast.growthTrend === 'Increasing' ? (
              <TrendingUp className="h-5 w-5 text-green-400" />
            ) : analytics.forecast.growthTrend === 'Decreasing' ? (
              <TrendingDown className="h-5 w-5 text-red-400" />
            ) : (
              <TrendingUpDown className="h-5 w-5 text-gray-400" />
            )}
            <p className={`text-xl font-bold ${analytics.forecast.growthTrend === 'Increasing' ? 'text-green-400' :
              analytics.forecast.growthTrend === 'Decreasing' ? 'text-red-400' :
                'text-gray-400'
              }`}>
              {analytics.forecast.growthTrend}
            </p>
          </div>
          <p className="text-xs text-gray-400">Growth Trend</p>
        </div>
      </div>
    </div>

    {/* Churn Risk Analysis */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <AlertTriangle className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          Customer Churn Risk
        </h3>
        <div className="text-center py-4">
          <p className="text-5xl font-bold text-white mb-2">{analytics.churnRisk.count}</p>
          <p className="text-gray-400 text-sm mb-1">At-Risk Customers</p>
          <p className="text-2xl font-bold text-white mb-2">{analytics.churnRisk.rate.toFixed(1)}%</p>
          <p className="text-gray-400 text-xs">Churn Rate</p>
        </div>
        <div className={`mt-4 p-3 rounded-lg ${analytics.churnRisk.rate > 20 ? 'bg-red-500/10 border border-red-500/30' :
          analytics.churnRisk.rate > 10 ? 'bg-yellow-500/10 border border-yellow-500/30' :
            'bg-green-500/10 border border-green-500/30'
          }`}>
          <p className="text-sm text-gray-300">
            {analytics.churnRisk.rate > 20 ? '🔴 High risk - launch win-back campaign' :
              analytics.churnRisk.rate > 10 ? '⚠️ Moderate risk - engage inactive customers' :
                '✅ Low churn - maintain current practices'}
          </p>
        </div>
      </div>

      <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
          <Users className="h-4 w-4 text-[var(--color-primary)] mr-2" />
          High-Risk Customers (Not Seen Recently)
        </h3>
        {analytics.churnRisk.customers.length > 0 ? (
          <div className="space-y-2">
            {analytics.churnRisk.customers.slice(0, 5).map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium truncate">
                    {customer.id.length > 30 ? customer.id.substring(0, 30) + '...' : customer.id}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {customer.frequency} visits • Last seen {customer.daysSinceLastVisit} days ago
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${customer.churnRisk === 'High'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                  {customer.churnRisk} Risk
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No at-risk customers identified</p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          💡 Send personalized offers to re-engage these customers
        </p>
      </div>
    </div>

    {/* Product Demand Forecast */}
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <Package className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Product Demand Forecast
      </h3>
      {Object.keys(analytics.productDemand).length > 0 ? (
        <div className="space-y-2">
          {Object.values(analytics.productDemand).slice(0, 8).map((product, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{product.name}</p>
                <p className="text-gray-400 text-xs">Avg: {product.avgPerWeek.toFixed(1)} per week</p>
              </div>
              <div className="text-right ml-3">
                <p className="text-white text-sm font-semibold">{product.forecastNextWeek} units</p>
                <p className="text-gray-400 text-xs">Next week</p>
              </div>
              <div className="text-right ml-3">
                <p className="text-white text-sm font-semibold">{product.forecastNextMonth} units</p>
                <p className="text-gray-400 text-xs">Next month</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">No product sales data available for forecasting</p>
      )}
      <p className="text-xs text-gray-500 mt-3">
        💡 Plan inventory orders based on these predictions
      </p>
    </div>

    {/* Predictive Insights */}
    <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/5 border border-[var(--color-primary)]/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Brain className="h-5 w-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white mb-2">AI-Powered Predictions</h4>
          <div className="space-y-1.5 text-sm text-gray-300">
            <p>📈 Expected revenue: {formatCurrency(analytics.forecast.next30Days)} in next 30 days</p>
            <p>📊 Trend: {analytics.forecast.growthTrend} pattern detected</p>
            <p>⚠️ {analytics.churnRisk.count} customers at risk of churning</p>
            {analytics.forecast.growthTrend === 'Decreasing' && (
              <p>🎯 Suggested action: Increase marketing efforts and launch promotions</p>
            )}
            {analytics.churnRisk.rate > 15 && (
              <p>🎯 Suggested action: Implement loyalty rewards program</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)

// PRESCRIPTIVE ANALYTICS TAB: What should be done?
const PrescriptiveAnalytics = ({ analytics, formatCurrency, formatTime }) => (
  <div className="space-y-4">
    {/* Promotion Suggestions */}
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <Zap className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Recommended Promotions
      </h3>
      {analytics.promotionSuggestions.length > 0 ? (
        <div className="space-y-2">
          {analytics.promotionSuggestions.map((promo, index) => (
            <div key={index} className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:border-[var(--color-primary)]/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${promo.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                      promo.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                      {promo.priority}
                    </span>
                    <p className="text-white font-medium text-sm">{promo.type}</p>
                  </div>
                  <p className="text-gray-400 text-xs mb-1">Target: <span className="text-white">{promo.target}</span></p>
                  <p className="text-gray-300 text-sm">{promo.suggestion}</p>
                  <p className="text-gray-500 text-xs mt-1">Expected: {promo.expectedImpact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">All areas performing well. No immediate promotions needed.</p>
      )}
    </div>

    {/* Restocking Alerts */}
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <Bell className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Inventory Restocking Alerts
      </h3>
      {analytics.restockingAlerts.length > 0 ? (
        <div className="space-y-2">
          {analytics.restockingAlerts.map((alert, index) => (
            <div key={index} className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${alert.urgency === 'Critical' ? 'bg-red-500/20 text-red-400' :
                      alert.urgency === 'High' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                      {alert.urgency}
                    </span>
                    <p className="text-white font-medium text-sm">{alert.product}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">
                      Current: <span className={alert.currentStock === 0 ? 'text-red-400' : 'text-white'}>{alert.currentStock}</span>
                    </span>
                    <span className="text-gray-400">
                      Min: <span className="text-white">{alert.minStock}</span>
                    </span>
                    <span className="text-gray-400">
                      Suggested Order: <span className="text-[var(--color-primary)] font-semibold">{alert.suggestedOrder} units</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">✅ All products are sufficiently stocked</p>
      )}
    </div>

    {/* Staff Scheduling Recommendations */}
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
        <Calendar className="h-4 w-4 text-[var(--color-primary)] mr-2" />
        Staff Scheduling Recommendations
      </h3>
      {analytics.staffRecommendations.length > 0 ? (
        <div className="space-y-2">
          {analytics.staffRecommendations.map((rec, index) => (
            <div key={index} className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rec.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                      rec.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                      {rec.priority}
                    </span>
                    <p className="text-white font-medium text-sm">{rec.type}</p>
                  </div>
                  <p className="text-gray-400 text-xs mb-1">When: <span className="text-white">{rec.timeframe}</span></p>
                  <p className="text-gray-300 text-sm">{rec.suggestion}</p>
                  <p className="text-gray-500 text-xs mt-1">{rec.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">✅ Current staff scheduling is optimal</p>
      )}
    </div>

    {/* Action Summary */}
    <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/5 border border-[var(--color-primary)]/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Target className="h-5 w-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white mb-2">Priority Actions</h4>
          <div className="space-y-1.5 text-sm text-gray-300">
            {analytics.restockingAlerts.filter(a => a.urgency === 'Critical').length > 0 && (
              <p>🔴 URGENT: Restock {analytics.restockingAlerts.filter(a => a.urgency === 'Critical').length} critical items immediately</p>
            )}
            {analytics.promotionSuggestions.filter(p => p.priority === 'High').length > 0 && (
              <p>🎯 Launch {analytics.promotionSuggestions.filter(p => p.priority === 'High').length} high-priority promotions this week</p>
            )}
            {analytics.staffRecommendations.filter(s => s.priority === 'High').length > 0 && (
              <p>👥 Optimize staffing for {analytics.staffRecommendations.filter(s => s.priority === 'High').length} peak periods</p>
            )}
            {analytics.churnRisk.count > 0 && (
              <p>📧 Reach out to {analytics.churnRisk.count} at-risk customers with personalized offers</p>
            )}
            {analytics.restockingAlerts.length === 0 && analytics.promotionSuggestions.length === 0 && (
              <p>✅ All systems optimal. Continue monitoring performance metrics.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)

// Reusable Metric Card Component
const MetricCard = ({ icon: Icon, iconColor, value, label, subtext, change }) => (
  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <Icon className={`h-5 w-5 ${iconColor}`} />
      {change !== undefined && change !== 0 && (
        <div className={`flex items-center text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-white mb-1">{value}</p>
    <p className="text-xs text-gray-400">{label}</p>
    {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
  </div>
)

export default ReportsManagement
