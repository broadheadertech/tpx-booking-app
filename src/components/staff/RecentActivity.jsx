import React from 'react'
import { Calendar, Gift, UserPlus, Clock, DollarSign, User, Info, CheckCircle, XCircle } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const RecentActivity = ({ activities: propActivities = [] }) => {
  const { user } = useAuth()
  
  // Fetch recent bookings to generate activity feed - with pagination limits
  const bookingsData = user?.role === 'super_admin'
    ? useQuery(api.services.bookings.getAllBookings, { limit: 50 })
    : user?.branch_id
      ? useQuery(api.services.bookings.getBookingsByBranch, { branch_id: user.branch_id, limit: 50 })
      : undefined
  const bookings = bookingsData?.bookings || []

  // Fetch recent transactions - with pagination limits
  const transactionsData = user?.branch_id
    ? useQuery(api.services.transactions.getTransactionsByBranch, { branch_id: user.branch_id, limit: 50 })
    : undefined
  const transactions = transactionsData?.transactions || []
  
  // Transform bookings and transactions into activity items
  const generateActivities = () => {
    if (propActivities.length > 0) return propActivities
    
    const activityItems = []
    
    // Add booking activities
    if (bookings && bookings.length > 0) {
      const recentBookings = bookings
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
      
      recentBookings.forEach((booking) => {
        const timeAgo = getTimeAgo(booking.createdAt)
        const customerName = booking.customer_name || 'Customer'
        
        let message = ''
        let status = 'new'
        let type = 'booking'
        
        if (booking.status === 'completed') {
          message = `${customerName} completed their ${booking.service_name || 'service'} appointment`
          status = 'completed'
        } else if (booking.status === 'cancelled') {
          message = `${customerName} cancelled their ${booking.service_name || 'service'} appointment`
          status = 'cancelled'
          type = 'info'
        } else if (booking.status === 'confirmed') {
          message = `${customerName} confirmed their ${booking.service_name || 'service'} appointment`
          status = 'confirmed'
        } else {
          message = `New booking from ${customerName} for ${booking.service_name || 'service'}`
        }
        
        activityItems.push({
          id: booking._id,
          type,
          message,
          time: timeAgo,
          status
        })
      })
    }
    
    // Add transaction activities
    if (transactions && transactions.length > 0) {
      const recentTransactions = transactions
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3)
      
      recentTransactions.forEach((transaction) => {
        const timeAgo = getTimeAgo(transaction.createdAt)
        const customerName = transaction.customer_name || 'Customer'
        
        activityItems.push({
          id: transaction._id,
          type: 'sale',
          message: `${customerName} made a purchase - ₱${transaction.total_amount.toFixed(2)}`,
          time: timeAgo,
          status: transaction.payment_status === 'completed' ? 'completed' : 'new'
        })
      })
    }
    
    // Sort all activities by most recent and limit to 8
    return activityItems
      .sort((a, b) => {
        // Convert time strings back to timestamps for sorting (rough approximation)
        const getMinutes = (timeStr) => {
          if (timeStr.includes('just now')) return 0
          if (timeStr.includes('min')) return parseInt(timeStr)
          if (timeStr.includes('hour')) return parseInt(timeStr) * 60
          if (timeStr.includes('day')) return parseInt(timeStr) * 1440
          return 99999
        }
        return getMinutes(a.time) - getMinutes(b.time)
      })
      .slice(0, 8)
  }
  
  // Helper function to calculate time ago
  const getTimeAgo = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
  
  const activities = generateActivities()
  // Icon mapping for different activity types
  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking':
      case 'appointment':
        return Calendar
      case 'voucher':
        return Gift
      case 'customer':
      case 'client':
        return UserPlus
      case 'sale':
        return DollarSign
      case 'user':
        return User
      case 'info':
      default:
        return Info
    }
  }

  const getColorClasses = (type, status) => {
    // Status-based coloring for better UX
    if (status === 'completed') {
      return {
        icon: 'text-green-500',
        status: 'bg-green-500/10 text-green-500 border border-green-500/20'
      }
    }
    
    if (status === 'cancelled') {
      return {
        icon: 'text-red-500',
        status: 'bg-red-500/10 text-red-500 border border-red-500/20'
      }
    }
    
    if (status === 'confirmed') {
      return {
        icon: 'text-blue-500',
        status: 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
      }
    }
    
    const typeColors = {
      booking: 'blue',
      appointment: 'blue', 
      voucher: 'orange',
      customer: 'purple',
      client: 'purple',
      sale: 'green',
      user: 'gray',
      info: 'gray'
    }
    
    const color = typeColors[type] || 'gray'
    
    const colors = {
      blue: {
        icon: 'text-blue-500',
        status: 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
      },
      orange: {
        icon: 'text-[var(--color-primary)]',
        status: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
      },
      purple: {
        icon: 'text-purple-500',
        status: 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
      },
      green: {
        icon: 'text-green-500',
        status: 'bg-green-500/10 text-green-500 border border-green-500/20'
      },
      gray: {
        icon: 'text-gray-500',
        status: 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
      }
    }
    return colors[color]
  }

  return (
    <div className="p-6 bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold text-white">Recent Activity</h3>
      </div>
      
      <div className="space-y-2">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Info className="mx-auto h-10 w-10 text-gray-500 mb-3" />
            <p className="text-sm text-gray-400">No recent activity available</p>
          </div>
        ) : (
          activities.map((activity) => {
            const IconComponent = getActivityIcon(activity.type)
            const colorClasses = getColorClasses(activity.type, activity.status)
            
            return (
              <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#1A1A1A]/50 border border-transparent hover:bg-[#1A1A1A]/80 hover:border-[var(--color-primary)]/30 transition-all duration-200 group cursor-pointer">
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${colorClasses.icon}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white mb-0.5 group-hover:text-[var(--color-primary)] transition-colors truncate">
                    {activity.message}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${colorClasses.status} flex-shrink-0`}>
                  {activity.status}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default RecentActivity