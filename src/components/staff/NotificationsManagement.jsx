import React, { useMemo, useState } from 'react'
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  Calendar,
  CheckCheck,
  Clock,
  DollarSign,
  Gift,
  Info,
  Loader2,
  Search,
  Settings,
  Trash2,
  X
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../common/Modal'

const NotificationsManagement = ({ onRefresh }) => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [mutating, setMutating] = useState(false)
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

  const isLoading = notifications === undefined || unreadCount === undefined

  const priorityStyles = {
    urgent: {
      container: 'bg-red-500/10 border-red-500/30 text-red-300',
      accent: 'text-red-400'
    },
    high: {
      container: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
      accent: 'text-orange-400'
    },
    medium: {
      container: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
      accent: 'text-blue-400'
    },
    low: {
      container: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
      accent: 'text-slate-300'
    }
  }

  const resolvePriorityStyles = (priority = 'low') => {
    return priorityStyles[priority] || priorityStyles.low
  }

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (!notifications) return []

    return notifications.filter(notification => {
      const matchesSearch =
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = filterType === 'all' || notification.type === filterType
      const matchesUnread = !showUnreadOnly || !notification.is_read

      return matchesSearch && matchesType && matchesUnread
    })
  }, [notifications, searchTerm, filterType, showUnreadOnly])

  const stats = useMemo(() => {
    const total = notifications?.length || 0
    const unread = notifications?.filter(notification => !notification.is_read).length || 0

    const typeBreakdown = (notifications || []).reduce(
      (acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1
        return acc
      },
      {}
    )

    return {
      total,
      unread,
      booking: typeBreakdown.booking || 0,
      payment: typeBreakdown.payment || 0,
      system: typeBreakdown.system || 0,
      promotion: typeBreakdown.promotion || 0,
      reminder: typeBreakdown.reminder || 0,
      alert: typeBreakdown.alert || 0
    }
  }, [notifications])

  const handleMarkAsRead = async (notificationId) => {
    if (!user?.id) return
    try {
      await markAsReadMutation({ notificationId, userId: user.id })
      onRefresh?.()
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    try {
      setMutating(true)
      await markAllAsReadMutation({ userId: user.id })
      onRefresh?.()
    } catch (err) {
      setError(err.message || 'Failed to mark all notifications as read')
    } finally {
      setMutating(false)
    }
  }

  const handleDelete = async (notificationId) => {
    if (!user?.id) return
    try {
      await deleteNotificationMutation({ notificationId, userId: user.id })
      onRefresh?.()
    } catch (err) {
      setError(err.message || 'Failed to delete notification')
    }
  }

  const getRecipientTypeFromRole = (role = '') => {
    if (role === 'super_admin') return 'admin'
    if (role === 'customer') return 'customer'
    return 'staff'
  }

  const handleCreateNotification = async ({ title, message, type, priority }) => {
    if (!user?.id) {
      return {
        success: false,
        error: 'You must be logged in to send notifications.'
      }
    }

    setMutating(true)

    try {
      await createNotificationMutation({
        title,
        message,
        type,
        priority,
        recipient_id: user.id,
        recipient_type: getRecipientTypeFromRole(user.role),
        sender_id: user.id
      })

      onRefresh?.()
      setShowCreateModal(false)

      return { success: true }
    } catch (err) {
      console.error('Failed to create notification:', err)
      return {
        success: false,
        error: err.message || 'Failed to create notification'
      }
    } finally {
      setMutating(false)
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

  const unreadTotal = unreadCount || stats.unread

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A]/50 rounded-2xl px-6 py-5 shadow-xl shadow-black/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-[#FF8C42]/10 border border-[#FF8C42]/30 text-[#FF8C42] shadow-lg shadow-[#FF8C42]/10">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">Notification Center</h1>
                {unreadTotal > 0 && (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                    {unreadTotal} unread
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">Stay updated with real-time alerts across bookings, payments, and system updates.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF8C42] text-white font-semibold text-sm shadow-lg shadow-[#FF8C42]/30 hover:shadow-[#FF8C42]/40 transition-all duration-200"
            >
              <Bell className="w-4 h-4" />
              Compose Alert
            </button>
            <button
              onClick={handleMarkAllAsRead}
              disabled={mutating || !unreadTotal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-200 text-sm font-semibold hover:bg-white/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Mark all read
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl px-5 py-4 flex items-start gap-3 text-red-200">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div className="flex-1 text-sm font-medium">{error}</div>
          <button
            onClick={() => setError('')}
            className="text-red-200/70 hover:text-red-100 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total',
            value: stats.total,
            description: 'Notifications received',
            icon: <Bell className="w-5 h-5" />,
            accent: 'from-[#FF8C42]/15 via-[#FF8C42]/5 to-transparent border-[#FF8C42]/30 text-[#FF9F5C]'
          },
          {
            label: 'Unread',
            value: stats.unread,
            description: 'Requires attention',
            icon: <AlertCircle className="w-5 h-5" />,
            accent: 'from-red-500/20 via-red-500/10 to-transparent border-red-500/30 text-red-300'
          },
          {
            label: 'Bookings',
            value: stats.booking,
            description: 'Scheduling alerts',
            icon: <Calendar className="w-5 h-5" />,
            accent: 'from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30 text-blue-300'
          },
          {
            label: 'Payments',
            value: stats.payment,
            description: 'Billing updates',
            icon: <DollarSign className="w-5 h-5" />,
            accent: 'from-green-500/20 via-green-500/10 to-transparent border-green-500/30 text-green-300'
          }
        ].map(({ label, value, description, icon, accent }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-2xl border px-5 py-6 bg-gradient-to-br ${accent} backdrop-blur-sm shadow-lg shadow-black/20`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 font-medium uppercase tracking-[0.12em]">{label}</p>
                <p className="mt-3 text-3xl font-bold text-white">{value}</p>
                <p className="mt-2 text-xs text-gray-500 uppercase tracking-[0.2em]">{description}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-white/70">
                {icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A]/50 rounded-2xl px-6 py-5 shadow-xl shadow-black/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#121212] border border-[#2F2F2F] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/60 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center gap-2 bg-[#121212] border border-[#2F2F2F] rounded-xl px-2 py-1">
              {[
                { value: 'all', label: 'All', icon: <Bell className="w-4 h-4" /> },
                { value: 'booking', label: 'Bookings', icon: <Calendar className="w-4 h-4" /> },
                { value: 'payment', label: 'Payments', icon: <DollarSign className="w-4 h-4" /> },
                { value: 'system', label: 'System', icon: <Settings className="w-4 h-4" /> },
                { value: 'promotion', label: 'Promos', icon: <Gift className="w-4 h-4" /> },
                { value: 'reminder', label: 'Reminders', icon: <Clock className="w-4 h-4" /> },
                { value: 'alert', label: 'Alerts', icon: <AlertCircle className="w-4 h-4" /> }
              ].map((option) => {
                const isActive = filterType === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilterType(option.value)}
                    type="button"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#FF8C42]/20 text-[#FF9F5C] border border-[#FF8C42]/30 shadow-lg shadow-[#FF8C42]/20'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <label className="inline-flex items-center gap-3 text-sm text-gray-300 font-medium">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="h-4 w-4 rounded border-[#3A3A3A] bg-[#121212] text-[#FF8C42] focus:ring-[#FF8C42]"
              />
              Show unread only
            </label>
            <button
              onClick={onRefresh}
              className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-200 hover:bg-white/10 transition-all duration-200"
            >
              Refresh feed
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A]/50 rounded-3xl p-6 space-y-4 shadow-2xl shadow-black/40">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-gray-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading notifications…</span>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <BellOff className="w-7 h-7 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">No notifications found</h3>
            <p className="text-sm text-gray-500 mt-2">{showUnreadOnly ? 'All notifications are read. Try turning off the unread filter.' : "You're all caught up!"}</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const priority = resolvePriorityStyles(notification.priority)
            const isUnread = !notification.is_read

            return (
              <div
                key={notification._id}
                className={`relative overflow-hidden rounded-2xl border px-5 py-5 transition-all duration-200 group ${
                  isUnread
                    ? 'border-[#FF8C42]/30 bg-[#1F1F1F] shadow-lg shadow-[#FF8C42]/10'
                    : 'border-[#2F2F2F] bg-[#181818] opacity-90'
                }`}
              >
                {isUnread && (
                  <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-[#FF8C42] animate-pulse" aria-hidden="true" />
                )}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl border ${priority.container} shadow-inner shadow-black/40`}>{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-white truncate flex-1">
                          {notification.title}
                        </h3>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border uppercase tracking-[0.2em] ${priority.container}`}>
                          {notification.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                        {notification.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 uppercase tracking-[0.18em]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(notification.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          {notification.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          {isUnread ? 'Unread' : 'Read'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="px-3 py-2 rounded-lg bg-[#FF8C42]/20 text-[#FF9F5C] text-xs font-semibold hover:bg-[#FF8C42]/30 transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 uppercase tracking-[0.25em] pt-2">
          <span>Notifications expire after 7 days</span>
          <span>{stats.total} total notifications</span>
        </div>
      </div>

      <NotificationComposerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateNotification}
        isSubmitting={mutating}
      />
    </div>
  )
}

const NotificationComposerModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('system')
  const [priority, setPriority] = useState('medium')
  const [formError, setFormError] = useState('')

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setType('system')
    setPriority('medium')
    setFormError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!title.trim() || !message.trim()) {
      setFormError('Title and message are required')
      return
    }

    setFormError('')

    const result = await onSubmit({ title: title.trim(), message: message.trim(), type, priority })

    if (!result?.success) {
      setFormError(result?.error || 'Unable to create notification')
      return
    }

    resetForm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Compose Notification"
      variant="dark"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="notification-title" className="text-sm font-semibold text-gray-300 uppercase tracking-[0.18em]">
            Title
          </label>
          <input
            id="notification-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Payment processed successfully"
            className="w-full h-11 rounded-xl bg-[#121212] border border-[#2F2F2F] text-gray-100 placeholder-gray-500 px-4 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/60"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="notification-message" className="text-sm font-semibold text-gray-300 uppercase tracking-[0.18em]">
            Message
          </label>
          <textarea
            id="notification-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a short message for the recipient"
            rows={4}
            className="w-full rounded-xl bg-[#121212] border border-[#2F2F2F] text-gray-100 placeholder-gray-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/60 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 uppercase tracking-[0.18em]">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'system', label: 'System', icon: <Settings className="w-4 h-4" /> },
                { value: 'booking', label: 'Booking', icon: <Calendar className="w-4 h-4" /> },
                { value: 'payment', label: 'Payment', icon: <DollarSign className="w-4 h-4" /> },
                { value: 'promotion', label: 'Promotion', icon: <Gift className="w-4 h-4" /> },
                { value: 'reminder', label: 'Reminder', icon: <Clock className="w-4 h-4" /> },
                { value: 'alert', label: 'Alert', icon: <AlertCircle className="w-4 h-4" /> }
              ].map((option) => {
                const isActive = type === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'border-[#FF8C42]/40 bg-[#FF8C42]/15 text-[#FF9F5C]'
                        : 'border-[#2F2F2F] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 uppercase tracking-[0.18em]">
              Priority
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ].map((option) => {
                const isActive = priority === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(option.value)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'border-[#FF8C42]/40 bg-[#FF8C42]/15 text-[#FF9F5C]'
                        : 'border-[#2F2F2F] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF8C42] text-white text-sm font-semibold shadow-lg shadow-[#FF8C42]/30 hover:shadow-[#FF8C42]/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Send notification
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default NotificationsManagement
