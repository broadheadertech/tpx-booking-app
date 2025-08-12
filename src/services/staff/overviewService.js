import apiService from '../api.js'

class OverviewService {
  // Get comprehensive dashboard overview data
  async getDashboardOverview() {
    try {
      // Fetch all necessary data in parallel for performance
      const [
        servicesResult,
        barbersResult,
        clientsResult,
        vouchersResult,
        salesResult,
        pointsResult
      ] = await Promise.allSettled([
        apiService.get('/services/'),
        apiService.get('/barbers/'),
        apiService.get('/clients/'),
        apiService.get('/vouchers/'),
        apiService.get('/sales/'),
        apiService.get('/points/')
      ])

      // Extract data from settled promises with proper error handling
      const services = Array.isArray(servicesResult.value) ? servicesResult.value : []
      const barbers = Array.isArray(barbersResult.value) ? barbersResult.value : []
      const clients = Array.isArray(clientsResult.value) ? clientsResult.value : []
      const vouchers = Array.isArray(vouchersResult.value) ? vouchersResult.value : []
      const sales = Array.isArray(salesResult.value) ? salesResult.value : []
      const points = Array.isArray(pointsResult.value) ? pointsResult.value : []

      // Log any failed requests
      if (servicesResult.status === 'rejected') console.warn('Services API failed:', servicesResult.reason)
      if (barbersResult.status === 'rejected') console.warn('Barbers API failed:', barbersResult.reason)
      if (clientsResult.status === 'rejected') console.warn('Clients API failed:', clientsResult.reason)
      if (vouchersResult.status === 'rejected') console.warn('Vouchers API failed:', vouchersResult.reason)
      if (salesResult.status === 'rejected') console.warn('Sales API failed:', salesResult.reason)
      if (pointsResult.status === 'rejected') console.warn('Points API failed:', pointsResult.reason)

      // Calculate key metrics with error handling
      const stats = this.calculateOverviewStats({
        services,
        barbers,
        clients,
        vouchers,
        sales,
        points
      })

      // Generate recent activity with error handling
      const recentActivity = this.generateRecentActivity({
        sales,
        vouchers,
        clients
      })

      return {
        stats,
        recentActivity,
        totals: {
          services: services.length,
          barbers: barbers.length,
          clients: clients.length,
          vouchers: vouchers.length,
          sales: sales.length,
          totalPoints: this.calculateTotalPoints(points)
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard overview:', error)
      
      // Return fallback data instead of throwing
      return this.getFallbackOverviewData()
    }
  }

  // Provide fallback data when API calls fail
  getFallbackOverviewData() {
    return {
      stats: [
        {
          label: "Today's Revenue",
          value: "₱0.00",
          change: "0%",
          trend: 'neutral',
          icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
          subtitle: 'Data unavailable'
        },
        {
          label: 'Total Services',
          value: '0',
          change: '0%',
          trend: 'neutral',
          icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
          subtitle: 'Data unavailable'
        },
        {
          label: 'Active Barbers',
          value: '0',
          change: '0%',
          trend: 'neutral',
          icon: 'M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3z',
          subtitle: 'Data unavailable'
        },
        {
          label: 'Active Vouchers',
          value: '0',
          change: '0%',
          trend: 'neutral',
          icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
          subtitle: 'Data unavailable'
        },
        {
          label: 'Total Clients',
          value: '0',
          change: '0%',
          trend: 'neutral',
          icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z',
          subtitle: 'Data unavailable'
        },
        {
          label: 'Loyalty Points',
          value: '0',
          change: '0%',
          trend: 'neutral',
          icon: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
          subtitle: 'Data unavailable'
        }
      ],
      recentActivity: [
        {
          id: 'fallback-1',
          type: 'info',
          message: 'Unable to load recent activity - please check your connection',
          time: 'N/A',
          status: 'error',
          icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        }
      ],
      totals: {
        services: 0,
        barbers: 0,
        clients: 0,
        vouchers: 0,
        sales: 0,
        totalPoints: 0
      }
    }
  }

  // Helper method to safely parse dates
  safeParseDate(dateString) {
    if (!dateString) return null
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  }

  // Helper method to safely get date string
  safeDateToString(dateString) {
    const date = this.safeParseDate(dateString)
    return date ? date.toISOString().split('T')[0] : null
  }

  calculateOverviewStats({ services, barbers, clients, vouchers, sales, points }) {
    // Get today's date for filtering
    const today = new Date().toISOString().split('T')[0]
    
    // Filter today's sales with safe date parsing
    const todaysSales = sales.filter(sale => {
      const saleDateString = this.safeDateToString(sale.sale_date)
      return saleDateString === today
    })

    // Calculate today's revenue
    const todaysRevenue = todaysSales.reduce((sum, sale) => {
      return sum + parseFloat(sale.discounted_amount || sale.total_amount || 0)
    }, 0)

    // Calculate total revenue (all time)
    const totalRevenue = sales.reduce((sum, sale) => {
      return sum + parseFloat(sale.discounted_amount || sale.total_amount || 0)
    }, 0)

    // Filter active vouchers (not expired and not redeemed) with safe date parsing
    const now = new Date()
    const activeVouchers = vouchers.filter(voucher => {
      const expiresAt = this.safeParseDate(voucher.expires_at)
      return !voucher.redeemed && expiresAt && expiresAt > now
    })

    // Filter active barbers
    const activeBarbers = barbers.filter(barber => barber.is_active)

    // Calculate total loyalty points distributed
    const totalPointsDistributed = points.reduce((sum, point) => {
      return sum + (point.total_points || 0)
    }, 0)

    // Get this week's sales for trend calculation with safe date parsing
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeekSales = sales.filter(sale => {
      const saleDate = this.safeParseDate(sale.sale_date)
      return saleDate && saleDate >= weekAgo
    })

    const thisWeekRevenue = thisWeekSales.reduce((sum, sale) => {
      return sum + parseFloat(sale.discounted_amount || sale.total_amount || 0)
    }, 0)

    // Calculate percentage changes (mock data for trends)
    const revenueChange = thisWeekRevenue > 0 ? '+12%' : '0%'
    const clientsChange = clients.length > 0 ? '+8%' : '0%'

    return [
      {
        label: "Today's Revenue",
        value: this.formatCurrency(todaysRevenue),
        change: revenueChange,
        trend: todaysRevenue > 0 ? 'up' : 'neutral',
        icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
        subtitle: `Total: ${this.formatCurrency(totalRevenue)}`
      },
      {
        label: 'Total Services',
        value: services.length.toString(),
        change: '+2%',
        trend: 'up',
        icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
        subtitle: `Available services`
      },
      {
        label: 'Active Barbers',
        value: activeBarbers.length.toString(),
        change: '0%',
        trend: 'neutral',
        icon: 'M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3z',
        subtitle: `${barbers.length} total barbers`
      },
      {
        label: 'Active Vouchers',
        value: activeVouchers.length.toString(),
        change: vouchers.length > activeVouchers.length ? '-15%' : '+5%',
        trend: vouchers.length > activeVouchers.length ? 'down' : 'up',
        icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
        subtitle: `${vouchers.length} total vouchers`
      },
      {
        label: 'Total Clients',
        value: clients.length.toString(),
        change: clientsChange,
        trend: clients.length > 0 ? 'up' : 'neutral',
        icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
        subtitle: 'Registered customers'
      },
      {
        label: 'Loyalty Points',
        value: this.formatNumber(totalPointsDistributed),
        change: '+25%',
        trend: 'up',
        icon: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
        subtitle: 'Points distributed'
      }
    ]
  }

  generateRecentActivity({ sales, vouchers, clients }) {
    const activities = []
    
    // Recent sales (last 3) with safe date parsing
    const recentSales = sales
      .filter(sale => this.safeParseDate(sale.sale_date)) // Only include sales with valid dates
      .sort((a, b) => {
        const dateA = this.safeParseDate(a.sale_date)
        const dateB = this.safeParseDate(b.sale_date)
        return dateB - dateA
      })
      .slice(0, 3)

    recentSales.forEach(sale => {
      activities.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        message: `Sale completed: ${this.formatCurrency(sale.discounted_amount || sale.total_amount)}`,
        time: this.formatTimeAgo(sale.sale_date),
        status: 'completed',
        icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'
      })
    })

    // Recent voucher redemptions with safe date parsing
    const recentVouchers = vouchers
      .filter(v => v.redeemed && this.safeParseDate(v.created_at)) // Only include vouchers with valid dates
      .sort((a, b) => {
        const dateA = this.safeParseDate(a.created_at)
        const dateB = this.safeParseDate(b.created_at)
        return dateB - dateA
      })
      .slice(0, 2)

    recentVouchers.forEach(voucher => {
      activities.push({
        id: `voucher-${voucher.id}`,
        type: 'voucher',
        message: `Voucher ${voucher.code} redeemed (${this.formatCurrency(voucher.value)})`,
        time: this.formatTimeAgo(voucher.created_at),
        status: 'completed',
        icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'
      })
    })

    // Recent client registrations (mock - we don't have creation dates)
    if (clients.length > 0) {
      const recentClients = clients.slice(-2) // Get last 2 clients

      recentClients.forEach(client => {
        activities.push({
          id: `client-${client.id}`,
          type: 'customer',
          message: `New client registered: ${client.nickname || client.username}`,
          time: 'Recently',
          status: 'new',
          icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z'
        })
      })
    }

    // If no activities, show placeholder
    if (activities.length === 0) {
      activities.push({
        id: 'placeholder-1',
        type: 'info',
        message: 'No recent activity available',
        time: 'N/A',
        status: 'info',
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      })
    }

    return activities.slice(0, 6) // Limit to 6 activities
  }

  calculateTotalPoints(points) {
    return points.reduce((sum, point) => sum + (point.total_points || 0), 0)
  }

  formatCurrency(amount) {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  }

  formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-PH')
  }

  formatTimeAgo(dateString) {
    if (!dateString) return 'Unknown'
    
    const date = this.safeParseDate(dateString)
    if (!date) return 'Unknown'
    
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString('en-PH')
  }

  // Helper method for getting quick stats
  async getQuickStats() {
    try {
      const overview = await this.getDashboardOverview()
      return {
        todayRevenue: overview.stats[0].value,
        totalServices: overview.totals.services,
        totalClients: overview.totals.clients,
        activeVouchers: overview.stats[3].value
      }
    } catch (error) {
      console.error('Error fetching quick stats:', error)
      return {
        todayRevenue: '₱0.00',
        totalServices: 0,
        totalClients: 0,
        activeVouchers: 0
      }
    }
  }
}

export default new OverviewService()