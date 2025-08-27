import React, { useState } from 'react'
import { 
  Bell, 
  BellRing, 
  Trash2, 
  Search, 
  CheckCheck, 
  AlertCircle, 
  Info, 
  Calendar,
  DollarSign,
  Settings,
  Gift,
  Clock,
  X
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const NotificationsManagement = ({ onRefresh }) => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Convex queries with proper error handling
  const notifications = useQuery(
    api.services.notifications.getUserNotifications,
    user?.id ? { userId: user.id, limit: 50 } : "skip"
  )
  
  const unreadCount = useQuery(
    api.services.notifications.getUnreadCount,
    user?.id ? { userId: user.id } : "skip"
  )

  // Convex mutations
  const markAsReadMutation = useMutation(api.services.notifications.markAsRead)
  const markAllAsReadMutation = useMutation(api.services.notifications.markAllAsRead)
  const deleteNotificationMutation = useMutation(api.services.notifications.deleteNotification)
  const createNotificationMutation = useMutation(api.services.notifications.createNotification)

  // Filter notifications
  const filteredNotifications = notifications?.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || notification.type === filterType
    
    return matchesSearch && matchesType
  }) || []

  const handleMarkAsRead = async (notificationId) => {
    if (!user?.id) return
    try {
      await markAsReadMutation({ notificationId, userId: user.id })
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      await markAllAsReadMutation({ userId: user.id })
    } catch (err) {
      setError(err.message || 'Failed to mark all notifications as read')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (notificationId) => {
    if (!user?.id) return
    try {
      await deleteNotificationMutation({ notificationId, userId: user.id })
    } catch (err) {
      setError(err.message || 'Failed to delete notification')
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="w-4 h-4" />
      case 'payment': return <DollarSign className="w-4 h-4" />
      case 'system': return <Settings className="w-4 h-4" />
      case 'promotion': return <Gift className="w-4 h-4" />
      case 'reminder': return <Clock className="w-4 h-4" />
      case 'alert': return <AlertCircle className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to view notifications</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BellRing className="w-6 h-6 text-[#FF8C42]" />
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleMarkAllAsRead}
            disabled={loading || !unreadCount}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
            />
          </div>
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="booking">Booking</option>
          <option value="payment">Payment</option>
          <option value="system">System</option>
          <option value="promotion">Promotion</option>
          <option value="reminder">Reminder</option>
          <option value="alert">Alert</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No notifications found</p>
            <p className="text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`font-semibold ${
                        notification.is_read ? 'text-gray-900' : 'text-blue-900'
                      }`}>
                        {notification.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        getPriorityColor(notification.priority)
                      }`}>
                        {notification.priority}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatDate(notification.createdAt)}</span>
                      <span className="capitalize">{notification.type}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification._id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(notification._id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default NotificationsManagement