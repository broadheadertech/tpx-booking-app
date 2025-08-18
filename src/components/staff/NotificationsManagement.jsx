import React, { useState, useEffect } from 'react'
import { Bell, BellRing, Check, X, Trash2, Filter, Search, RefreshCw, Eye, EyeOff, Calendar, User, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import Button from '../common/Button'

const NotificationsManagement = ({ onRefresh }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedNotifications, setSelectedNotifications] = useState([])

  // Mock notifications data
  const mockNotifications = [
    {
      id: 1,
      title: 'New Booking Received',
      message: 'John Doe has booked a haircut appointment for tomorrow at 2:00 PM',
      type: 'booking',
      status: 'unread',
      priority: 'high',
      timestamp: '2024-02-15T14:30:00Z',
      actionUrl: '/bookings',
      metadata: {
        customerName: 'John Doe',
        serviceType: 'Haircut',
        appointmentTime: '2024-02-16T14:00:00Z'
      }
    },
    {
      id: 2,
      title: 'Low Stock Alert',
      message: 'Hair Pomade inventory is running low (5 units remaining)',
      type: 'inventory',
      status: 'unread',
      priority: 'medium',
      timestamp: '2024-02-15T12:15:00Z',
      actionUrl: '/products',
      metadata: {
        productName: 'Hair Pomade',
        currentStock: 5,
        minStock: 10
      }
    },
    {
      id: 3,
      title: 'Event Registration',
      message: '8 new registrations for the Beard Styling Workshop',
      type: 'event',
      status: 'read',
      priority: 'low',
      timestamp: '2024-02-15T10:45:00Z',
      actionUrl: '/events',
      metadata: {
        eventName: 'Beard Styling Workshop',
        registrations: 8
      }
    },
    {
      id: 4,
      title: 'Payment Received',
      message: 'Payment of ₱450 received from Sarah Wilson',
      type: 'payment',
      status: 'read',
      priority: 'low',
      timestamp: '2024-02-15T09:20:00Z',
      actionUrl: '/reports',
      metadata: {
        customerName: 'Sarah Wilson',
        amount: 450,
        paymentMethod: 'Cash'
      }
    },
    {
      id: 5,
      title: 'System Update',
      message: 'New features have been added to the booking system',
      type: 'system',
      status: 'read',
      priority: 'low',
      timestamp: '2024-02-14T16:00:00Z',
      actionUrl: null,
      metadata: {
        version: '2.1.0',
        features: ['Enhanced booking flow', 'New payment options']
      }
    },
    {
      id: 6,
      title: 'Booking Cancelled',
      message: 'Mike Johnson cancelled his appointment scheduled for today',
      type: 'booking',
      status: 'unread',
      priority: 'medium',
      timestamp: '2024-02-15T08:30:00Z',
      actionUrl: '/bookings',
      metadata: {
        customerName: 'Mike Johnson',
        appointmentTime: '2024-02-15T15:00:00Z',
        reason: 'Personal emergency'
      }
    }
  ]

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking': return Calendar
      case 'inventory': return AlertTriangle
      case 'event': return Bell
      case 'payment': return CheckCircle
      case 'system': return Info
      default: return Bell
    }
  }

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        text: 'text-red-900'
      }
    }
    
    switch (type) {
      case 'booking':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-900'
        }
      case 'inventory':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-900'
        }
      case 'event':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          icon: 'text-purple-600',
          text: 'text-purple-900'
        }
      case 'payment':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          text: 'text-green-900'
        }
      case 'system':
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
          text: 'text-gray-900'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
          text: 'text-gray-900'
        }
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return `${diffInMinutes} minutes ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} days ago`
    }
  }

  const handleMarkAsRead = async (notificationIds) => {
    try {
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, status: 'read' }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const handleMarkAsUnread = async (notificationIds) => {
    try {
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, status: 'unread' }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking notifications as unread:', error)
    }
  }

  const handleDelete = async (notificationIds) => {
    if (!confirm(`Are you sure you want to delete ${notificationIds.length} notification(s)?`)) return
    
    try {
      setNotifications(prev => 
        prev.filter(notification => !notificationIds.includes(notification.id))
      )
      setSelectedNotifications([])
    } catch (error) {
      console.error('Error deleting notifications:', error)
    }
  }

  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || notification.type === filterType
    const matchesStatus = filterStatus === 'all' || notification.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => n.status === 'unread').length,
    high: notifications.filter(n => n.priority === 'high').length,
    today: notifications.filter(n => {
      const today = new Date().toDateString()
      return new Date(n.timestamp).toDateString() === today
    }).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Notifications</h2>
          <p className="text-gray-600 mt-1">Stay updated with important alerts and messages</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => { loadNotifications(); onRefresh?.() }}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Unread</p>
              <p className="text-2xl font-bold text-orange-600">{stats.unread}</p>
            </div>
            <BellRing className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">High Priority</p>
              <p className="text-2xl font-bold text-red-600">{stats.high}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today</p>
              <p className="text-2xl font-bold text-green-600">{stats.today}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
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

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="booking">Bookings</option>
                <option value="inventory">Inventory</option>
                <option value="event">Events</option>
                <option value="payment">Payments</option>
                <option value="system">System</option>
              </select>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          {selectedNotifications.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedNotifications.length} selected
              </span>
              <button
                onClick={() => handleMarkAsRead(selectedNotifications)}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                <Eye className="h-3 w-3" />
                <span>Mark Read</span>
              </button>
              <button
                onClick={() => handleMarkAsUnread(selectedNotifications)}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <EyeOff className="h-3 w-3" />
                <span>Mark Unread</span>
              </button>
              <button
                onClick={() => handleDelete(selectedNotifications)}
                className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.length > 0 && (
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length === filteredNotifications.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Select All</span>
              </label>
              <span className="text-sm text-gray-500">
                {filteredNotifications.length} notification(s)
              </span>
            </div>
          )}

          {filteredNotifications.map((notification) => {
            const IconComponent = getNotificationIcon(notification.type)
            const colors = getNotificationColor(notification.type, notification.priority)
            const isSelected = selectedNotifications.includes(notification.id)
            
            return (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-6 ${
                  notification.status === 'unread' ? 'border-l-4 border-l-orange-500' : 'border-gray-200'
                } ${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  <label className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectNotification(notification.id)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </label>

                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border`}>
                    <IconComponent className={`w-5 h-5 ${colors.icon}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`text-base font-semibold ${colors.text}`}>
                            {notification.title}
                          </h3>
                          {notification.status === 'unread' && (
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          )}
                          {notification.priority === 'high' && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              High Priority
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatTimestamp(notification.timestamp)}</span>
                          <span className="capitalize">{notification.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {notification.status === 'unread' ? (
                          <button
                            onClick={() => handleMarkAsRead([notification.id])}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkAsUnread([notification.id])}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Mark as unread"
                          >
                            <EyeOff className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete([notification.id])}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {notification.actionUrl && (
                      <div className="mt-3">
                        <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                          View Details →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredNotifications.length === 0 && !loading && (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'You\'re all caught up! No new notifications.'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default NotificationsManagement