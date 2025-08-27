import React, { useState, useEffect } from 'react'
import { 
  Bell, 
  BellRing, 
  Archive, 
  Trash2, 
  Filter, 
  Search, 
  RotateCcw, 
  Plus, 
  CheckCheck, 
  AlertCircle, 
  Info, 
  Star, 
  Calendar,
  DollarSign,
  Settings,
  Gift,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const NotificationsManagement = ({ onRefresh }) => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedNotifications, setSelectedNotifications] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Convex queries
  const notifications = useQuery(
    user?.id ? api.services.notifications.getUserNotifications : undefined,
    user?.id ? {
      userId: user.id,
      limit: 100,
      includeArchived: showArchived
    } : undefined
  )
  
  const unreadCount = useQuery(
    user?.id ? api.services.notifications.getUnreadCount : undefined,
    user?.id ? { userId: user.id } : undefined
  )
  
  const notificationStats = useQuery(
    user?.role === 'admin' ? api.services.notifications.getNotificationStats : undefined,
    user?.role === 'admin' && user?.id ? { userId: user.id } : undefined
  )

  // Convex mutations
  const markAsRead = useMutation(api.services.notifications.markAsRead)
  const markAllAsRead = useMutation(api.services.notifications.markAllAsRead)
  const archiveNotification = useMutation(api.services.notifications.archiveNotification)
  const deleteNotification = useMutation(api.services.notifications.deleteNotification)
  const createNotification = useMutation(api.services.notifications.createNotification)
  const broadcastNotification = useMutation(api.services.notifications.broadcastNotification)

  // Filter notifications based on search and filters
  const filteredNotifications = notifications?.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || notification.type === filterType
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority
    
    return matchesSearch && matchesType && matchesPriority
  }) || []

  const handleMarkAsRead = async (notificationId) => {
    if (!user?.id) return
    try {
      await markAsRead({ notificationId, userId: user.id })
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      await markAllAsRead({ userId: user.id })
    } catch (err) {
      setError(err.message || 'Failed to mark all notifications as read')
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async (notificationId) => {
    if (!user?.id) return
    try {
      await archiveNotification({ notificationId, userId: user.id })
    } catch (err) {
      setError(err.message || 'Failed to archive notification')
    }
  }

  const handleDelete = async (notificationId) => {
    if (!user?.id) return
    try {
      await deleteNotification({ notificationId, userId: user.id })
    } catch (err) {
      setError(err.message || 'Failed to delete notification')
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="h-5 w-5" />
      case 'payment': return <DollarSign className="h-5 w-5" />
      case 'system': return <Settings className="h-5 w-5" />
      case 'promotion': return <Gift className="h-5 w-5" />
      case 'reminder': return <Clock className="h-5 w-5" />
      case 'alert': return <AlertCircle className="h-5 w-5" />
      default: return <Bell className="h-5 w-5" />
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

  const formatTimeAgo = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to view notifications.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Notifications</h2>
          <p className="text-gray-600 mt-1">
            Stay updated with important alerts and messages
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showArchived 
                ? 'bg-gray-200 text-gray-800' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showArchived ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
          </button>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark All Read</span>
            </button>
          )}
          
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 text-sm text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      {notificationStats && user?.role === 'admin' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{notificationStats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Unread</p>
                <p className="text-2xl font-bold text-red-600">{notificationStats.unread}</p>
              </div>
              <BellRing className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Archived</p>
                <p className="text-2xl font-bold text-gray-600">{notificationStats.archived}</p>
              </div>
              <Archive className="h-8 w-8 text-gray-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{notificationStats.byPriority.urgent}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'You\'re all caught up! No notifications to display.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className={`text-sm font-medium ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          getPriorityColor(notification.priority)
                        }`}>
                          {notification.priority}
                        </span>
                        
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {notification.type}
                        </span>
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.message}
                      </p>
                      
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                        
                        {notification.sender && (
                          <span>From: {notification.sender.username}</span>
                        )}
                        
                        {notification.action_url && notification.action_label && (
                          <a
                            href={notification.action_url}
                            className="text-orange-600 hover:text-orange-800 font-medium"
                          >
                            {notification.action_label}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                    
                    {!notification.is_archived && (
                      <button
                        onClick={() => handleArchive(notification._id)}
                        className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                    
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(notification._id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsManagement
