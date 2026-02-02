import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Bell, X, Check, Clock, AlertTriangle, Info, Gift, CreditCard, Calendar, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Notification type icons mapping
const NOTIFICATION_ICONS = {
  booking: Calendar,
  payment: CreditCard,
  system: Info,
  promotion: Gift,
  reminder: Clock,
  alert: AlertTriangle,
};

// Notification priority colors
const PRIORITY_COLORS = {
  low: 'text-blue-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
};

// Notification type border colors
const TYPE_BORDER_COLORS = {
  booking: 'border-blue-500',
  payment: 'border-green-500',
  system: 'border-gray-500',
  promotion: 'border-purple-500',
  reminder: 'border-yellow-500',
  alert: 'border-red-500',
};

// Icon background colors
const TYPE_ICON_COLORS = {
  booking: 'bg-blue-500/20',
  payment: 'bg-green-500/20',
  system: 'bg-gray-500/20',
  promotion: 'bg-purple-500/20',
  reminder: 'bg-yellow-500/20',
  alert: 'bg-red-500/20',
};

const NotificationItem = ({ notification, onMarkAsRead, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const Icon = NOTIFICATION_ICONS[notification.type] || Info;
  const priorityColor = PRIORITY_COLORS[notification.priority] || PRIORITY_COLORS.medium;
  const typeBorderColor = TYPE_BORDER_COLORS[notification.type] || TYPE_BORDER_COLORS.system;
  const typeIconBg = TYPE_ICON_COLORS[notification.type] || TYPE_ICON_COLORS.system;
  
  const timeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const handleAction = () => {
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${notification.is_read
          ? 'bg-[#0A0A0A] border-[#2A2A2A] hover:bg-[#1A1A1A]'
          : `bg-[#1A1A1A] ${typeBorderColor} hover:brightness-110`
        }
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !notification.is_read && onMarkAsRead(notification._id)}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute top-3 right-3 w-3 h-3 bg-[var(--color-primary)] rounded-full animate-pulse shadow-lg shadow-[var(--color-primary)]/30" />
      )}

      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className={`p-3 rounded-lg ${typeIconBg} ${notification.is_read ? 'opacity-60' : ''}`}>
          <Icon className={`${priorityColor} ${notification.is_read ? 'opacity-70' : ''}`} size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold text-sm leading-tight ${notification.is_read ? 'text-gray-300' : 'text-white'}`}>
                {notification.title}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {timeAgo(notification.createdAt)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  notification.is_read ? 'bg-gray-500/20 text-gray-400' : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                }`}>
                  {notification.type}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1 ml-2">
              {!notification.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification._id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] transition-colors rounded-lg hover:bg-[var(--color-primary)]/10"
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification._id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                  title="Delete notification"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <p className={`text-sm leading-relaxed mb-3 ${notification.is_read ? 'text-gray-400' : 'text-gray-300'}`}>
            {notification.message}
          </p>

          {/* Action button */}
          {notification.action_label && (
            <button
              onClick={handleAction}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
                bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white transition-all duration-200 shadow-lg shadow-[var(--color-primary)]/20"
            >
              {notification.action_label}
              <span className="ml-1">→</span>
            </button>
          )}

          {/* Metadata display */}
          {notification.metadata?.booking_id && (
            <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
              <p className="text-xs text-gray-500">
                Booking ID: <span className="font-mono text-gray-400">{notification.metadata.booking_id}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NotificationsPage = ({ onBack }) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  
  // Fetch notifications - skip if user not loaded yet
  const notifications = useQuery(
    api.services.bookingNotifications.getRecentNotifications,
    user?._id
      ? {
          userId: user._id,
          limit: 50,
          type: activeFilter === 'all' ? undefined : activeFilter,
          unreadOnly: unreadOnly,
        }
      : "skip"
  );

  // Fetch notification stats - skip if user not loaded yet
  const stats = useQuery(
    api.services.bookingNotifications.getNotificationStats,
    user?._id ? { userId: user._id } : "skip"
  );

  // Mutation hooks
  const markAsRead = useMutation(api.services.bookingNotifications.markNotificationsAsRead);
  const deleteNotification = useMutation(api.services.notifications.deleteNotification);
  const markAllAsRead = useMutation(api.services.notifications.markAllAsRead);
  
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead({ userId: user._id, notificationIds: [notificationId] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification({ notificationId, userId: user._id });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({ userId: user._id });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };
  
  const filterOptions = [
    { value: 'all', label: 'All', count: stats?.totalCount || 0 },
    { value: 'booking', label: 'Bookings', count: stats?.byType?.booking || 0 },
    { value: 'payment', label: 'Payments', count: stats?.byType?.payment || 0 },
    { value: 'reminder', label: 'Reminders', count: stats?.byType?.reminder || 0 },
    { value: 'alert', label: 'Alerts', count: stats?.byType?.alert || 0 },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[var(--color-primary)]/20 rounded-lg border border-[var(--color-primary)]/50">
                <Bell className="text-[var(--color-primary)] w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">Notifications</p>
                <p className="text-xs text-[var(--color-primary)]">
                  {stats?.unreadCount || 0} unread
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A] text-center">
            <div className="text-lg font-bold text-white">{stats?.totalCount || 0}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[var(--color-primary)]/50 text-center">
            <div className="text-lg font-bold text-[var(--color-primary)]">{stats?.unreadCount || 0}</div>
            <div className="text-xs text-gray-400">Unread</div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-3 border border-blue-500/50 text-center">
            <div className="text-lg font-bold text-blue-400">{stats?.byType?.booking || 0}</div>
            <div className="text-xs text-gray-400">Bookings</div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-3 border border-green-500/50 text-center">
            <div className="text-lg font-bold text-green-400">{stats?.byType?.payment || 0}</div>
            <div className="text-xs text-gray-400">Payments</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-6">
          <div className="bg-[#1A1A1A] rounded-2xl p-3 border border-[#2A2A2A]">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex-1
                    ${activeFilter === option.value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
                    }`}
                >
                  <div className="text-xs">{option.label}</div>
                  {option.count > 0 && (
                    <div className={`text-xs mt-0.5 ${
                      activeFilter === option.value
                        ? 'text-white/80'
                        : 'text-[var(--color-primary)]'
                    }`}>
                      ({option.count})
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between mb-6 bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <label className="flex items-center text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="mr-3 w-4 h-4 accent-[var(--color-primary)] rounded"
            />
            Show unread only
          </label>

          {stats && stats.unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-2 px-4 py-2 text-sm bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-lg transition-colors font-medium"
            >
              <CheckCircle size={14} />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications === undefined ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-[var(--color-primary)] mb-4"></div>
              <p className="text-gray-400 text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
              <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] mb-4">
                <Bell size={48} className="text-gray-500" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-white">No notifications found</h4>
              <p className="text-sm text-center max-w-md px-4">
                {unreadOnly
                  ? "No unread notifications at the moment."
                  : "You're all caught up! Check back later for new updates."
                }
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Footer info */}
        {notifications && notifications.length > 0 && (
          <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
            <p>Notifications expire after 7 days</p>
            <p className="text-gray-600">•</p>
            <p>{stats?.totalCount || 0} total notifications</p>
          </div>
        )}
      </div>

      {/* Bottom padding to prevent content cutoff */}
      <div className="h-6"></div>
    </div>
  );
};

export default NotificationsPage;
