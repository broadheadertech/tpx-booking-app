import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Bell, X, Check, Clock, AlertTriangle, Info, Gift, CreditCard, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// Notification type colors
const TYPE_COLORS = {
  booking: 'bg-blue-500/20 border-blue-500/50',
  payment: 'bg-green-500/20 border-green-500/50',
  system: 'bg-gray-500/20 border-gray-500/50',
  promotion: 'bg-purple-500/20 border-purple-500/50',
  reminder: 'bg-yellow-500/20 border-yellow-500/50',
  alert: 'bg-red-500/20 border-red-500/50',
};

interface NotificationSystemProps {
  userId: any; // Convex ID type
  className?: string;
  userRole?: string;
}

interface NotificationProps {
  notification: any;
  onMarkAsRead: (id: any) => void;
  onDelete: (id: any) => void;
  userRole?: string;
}

// Compact notification item for modal display
const CompactNotificationItem: React.FC<NotificationProps> = ({ notification, onMarkAsRead, onDelete, userRole }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const Icon = NOTIFICATION_ICONS[notification.type] || Info;
  const priorityColor = PRIORITY_COLORS[notification.priority] || PRIORITY_COLORS.medium;
  const typeColor = TYPE_COLORS[notification.type] || TYPE_COLORS.system;
  
  const timeAgo = (timestamp: number) => {
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative p-3 rounded-lg border backdrop-blur-sm transition-all duration-200 cursor-pointer
        ${notification.is_read
          ? 'bg-[#2A2A2A]/50 border-[#444444]/30 hover:bg-[#333333]/70'
          : 'bg-gradient-to-r from-[#333333] to-[#3A3A3A] border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/50 hover:shadow-lg hover:shadow-[var(--color-primary)]/10'
        }
        ${typeColor}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !notification.is_read && onMarkAsRead(notification._id)}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse shadow-lg shadow-[var(--color-primary)]/30" />
      )}

      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`p-2 rounded-md ${typeColor} border ${notification.is_read ? 'opacity-60' : ''} flex-shrink-0`}>
          <Icon className={`${priorityColor} ${notification.is_read ? 'opacity-70' : ''}`} size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold text-sm leading-tight ${notification.is_read ? 'text-gray-300' : 'text-white'} truncate`}>
                {notification.title}
              </h4>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {timeAgo(notification.createdAt)}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  notification.is_read ? 'bg-gray-500/20 text-gray-400' : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                }`}>
                  {notification.type}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
              {!notification.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification._id);
                  }}
                  className="p-1 text-gray-400 hover:text-[var(--color-primary)] transition-colors rounded hover:bg-[var(--color-primary)]/10"
                  title="Mark as read"
                >
                  <Check size={12} />
                </button>
              )}
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification._id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                  title="Delete notification"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-1 ${notification.is_read ? 'text-gray-400' : 'text-gray-300'} line-clamp-2`}>
            {notification.message}
          </p>

          {/* Action button - hidden for staff users */}
          {notification.action_label && userRole === 'customer' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAction}
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md
                bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white transition-all duration-200 shadow-lg shadow-[var(--color-primary)]/20"
            >
              {notification.action_label}
              <span className="ml-1">→</span>
            </motion.button>
          )}

        </div>
      </div>
    </motion.div>
  );
};

// Original notification item for dashboard/management pages
const NotificationItem: React.FC<NotificationProps> = ({ notification, onMarkAsRead, onDelete, userRole }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const Icon = NOTIFICATION_ICONS[notification.type] || Info;
  const priorityColor = PRIORITY_COLORS[notification.priority] || PRIORITY_COLORS.medium;
  const typeColor = TYPE_COLORS[notification.type] || TYPE_COLORS.system;
  
  const timeAgo = (timestamp: number) => {
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 cursor-pointer
        ${notification.is_read
          ? 'bg-[#2A2A2A]/50 border-[#444444]/30 hover:bg-[#333333]/70'
          : 'bg-gradient-to-r from-[#333333] to-[#3A3A3A] border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/50 hover:shadow-lg hover:shadow-[var(--color-primary)]/10'
        }
        ${typeColor}
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
        <div className={`p-3 rounded-lg ${typeColor} border ${notification.is_read ? 'opacity-60' : ''}`}>
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

          {/* Action button - hidden for staff users */}
          {notification.action_label && userRole === 'customer' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAction}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
                bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white transition-all duration-200 shadow-lg shadow-[var(--color-primary)]/20"
            >
              {notification.action_label}
              <span className="ml-1">→</span>
            </motion.button>
          )}

        </div>
      </div>
    </motion.div>
  );
};

interface NotificationBellProps {
  userId: any;
  className?: string;
  onOpenModal: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId, className = '', onOpenModal }) => {
  const stats = useQuery(
    api.services.bookingNotifications.getNotificationStats,
    userId ? { userId } : "skip"
  );

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onOpenModal}
      className={`relative p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors rounded-lg sm:rounded-xl hover:bg-white/10 touch-manipulation w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center ${className}`}
    >
      <Bell className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />

      {stats && stats.unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] bg-[var(--color-primary)] text-white text-[10px] sm:text-xs
            font-semibold rounded-full flex items-center justify-center px-0.5 sm:px-1 shadow-lg"
        >
          {stats.unreadCount > 99 ? '99+' : stats.unreadCount}
        </motion.div>
      )}
    </motion.button>
  );
};

interface NotificationModalProps {
  userId: any;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ userId, isOpen, onClose, userRole = 'customer' }) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Fetch notifications - skip if userId not available
  const notifications = useQuery(
    api.services.bookingNotifications.getRecentNotifications,
    userId
      ? {
          userId,
          limit: 50,
          type: activeFilter === 'all' ? undefined : activeFilter as any,
          unreadOnly: unreadOnly,
        }
      : "skip"
  );

  // Fetch notification stats - skip if userId not available
  const stats = useQuery(
    api.services.bookingNotifications.getNotificationStats,
    userId ? { userId } : "skip"
  );

  // Mutation hooks
  const markAsRead = useMutation(api.services.bookingNotifications.markNotificationsAsRead);
  const deleteNotification = useMutation(api.services.notifications.deleteNotification);
  const markAllAsRead = useMutation(api.services.notifications.markAllAsRead);
  const cleanupExpired = useMutation(api.services.bookingNotifications.cleanupExpiredNotifications);
  
  const handleMarkAsRead = async (notificationId: any) => {
    try {
      await markAsRead({ userId, notificationIds: [notificationId] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async (notificationId: any) => {
    try {
      await deleteNotification({ notificationId, userId });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({ userId });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      console.log('Clearing all notifications for user:', userId);
      
      // Delete notifications one by one using existing deleteNotification function
      if (notifications && notifications.length > 0) {
        console.log(`Deleting ${notifications.length} notifications...`);
        
        // Delete all notifications in parallel for better performance
        const deletePromises = notifications.map(async (notification) => {
          try {
            await deleteNotification({ notificationId: notification._id, userId });
            return { success: true, id: notification._id };
          } catch (err) {
            console.error('Failed to delete notification:', notification._id, err);
            return { success: false, id: notification._id, error: err };
          }
        });
        
        const results = await Promise.all(deletePromises);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`Clear all complete: ${successful} deleted, ${failed} failed`);
        
        if (failed > 0) {
          console.warn(`${failed} notifications failed to delete`);
        }
      } else {
        console.log('No notifications to clear');
      }
      
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      alert('Failed to clear notifications: ' + error.message);
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-3xl shadow-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[var(--color-primary)]/20 rounded-lg border border-[var(--color-primary)]/50">
                  <Bell className="text-[var(--color-primary)]" size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Notification Center</h2>
                  <p className="text-xs text-gray-400">Stay updated with real-time alerts</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-[#0A0A0A] hover:bg-[#2A2A2A] flex items-center justify-center transition-colors duration-200 border border-[#2A2A2A]/50"
                title="Close"
              >
                <X className="w-4 h-4 text-gray-300 hover:text-[var(--color-primary)]" />
              </button>
            </div>

            {/* Stats and Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 px-4 pt-4">
              <div className="bg-[#0A0A0A] rounded-lg p-2 border border-[#2A2A2A]/50 text-center">
                <div className="text-base font-bold text-white">{stats?.totalCount || 0}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="bg-[var(--color-primary)]/20 rounded-lg p-2 border border-[var(--color-primary)]/50 text-center">
                <div className="text-base font-bold text-[var(--color-primary)]">{stats?.unreadCount || 0}</div>
                <div className="text-xs text-gray-300">Unread</div>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-500/50 text-center">
                <div className="text-base font-bold text-blue-400">{stats?.byType?.booking || 0}</div>
                <div className="text-xs text-blue-300">Bookings</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-2 border border-green-500/50 text-center">
                <div className="text-base font-bold text-green-400">{stats?.byType?.payment || 0}</div>
                <div className="text-xs text-green-300">Payments</div>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-1 mb-4 px-4">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                    ${activeFilter === option.value
                      ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                      : 'bg-[#0A0A0A] text-gray-300 hover:bg-[#2A2A2A] hover:text-white border border-[#2A2A2A]/50'
                    }`}
                >
                  {option.label}
                  {option.count > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                      activeFilter === option.value
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    }`}>
                      {option.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#2A2A2A] px-4">
              <label className="flex items-center text-xs text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="mr-2 w-3 h-3 accent-[var(--color-primary)] rounded"
                />
                Show unread only
              </label>

              <div className="flex items-center gap-2">
                {stats && stats.totalCount > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded-md transition-colors font-medium"
                  >
                    Clear All
                  </button>
                )}
                {stats && stats.unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-3 py-1.5 text-xs bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-md transition-colors font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List - Compact */}
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              {notifications === undefined ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-[var(--color-primary)]"></div>
                  <p className="text-gray-400 text-sm mt-3">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                  <div className="p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]/50 mb-3">
                    <Bell size={32} className="text-gray-500" />
                  </div>
                  <h4 className="text-base font-semibold mb-2">No notifications found</h4>
                  <p className="text-xs text-center max-w-sm">
                    {unreadOnly
                      ? "No unread notifications at the moment."
                      : "You're all caught up! Check back later for new updates."
                    }
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  <AnimatePresence mode="wait">
                    {notifications.map((notification) => (
                      <CompactNotificationItem
                        key={notification._id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDelete}
                        userRole={userRole}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#2A2A2A]">
              <div className="flex items-center space-x-3 text-gray-400">
                <span className="text-xs">Notifications expire after 7 days</span>
                <span className="text-gray-600">•</span>
                <span className="text-xs">{stats?.totalCount || 0} total notifications</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium bg-[#0A0A0A] hover:bg-[#2A2A2A] text-gray-300 hover:text-white rounded-md transition-colors duration-200 border border-[#2A2A2A]/50"
              >
                Close
              </button>
            </div>
          </motion.div>

          {/* Clear All Confirmation Dialog */}
          <AnimatePresence>
            {showClearConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]"
                onClick={() => setShowClearConfirm(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-md rounded-2xl shadow-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-600/20 rounded-lg border border-red-600/50">
                        <AlertTriangle className="text-red-400" size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Clear All Notifications</h3>
                        <p className="text-xs text-gray-400">This action cannot be undone</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="w-6 h-6 rounded-lg bg-[#0A0A0A] hover:bg-[#2A2A2A] flex items-center justify-center transition-colors duration-200 border border-[#2A2A2A]/50"
                    >
                      <X className="w-3 h-3 text-gray-300 hover:text-red-400" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="mb-4">
                      <p className="text-sm text-gray-300 mb-2">
                        Are you sure you want to delete all notifications? This will permanently remove:
                      </p>
                      <ul className="text-xs text-gray-400 space-y-1 ml-4">
                        <li>• {stats?.totalCount || 0} total notifications</li>
                        <li>• {stats?.unreadCount || 0} unread notifications</li>
                        <li>• All notification history</li>
                      </ul>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-4 py-2 text-xs font-medium bg-[#0A0A0A] hover:bg-[#2A2A2A] text-gray-300 hover:text-white rounded-md transition-colors duration-200 border border-[#2A2A2A]/50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearAll}
                        className="px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Backward compatibility: Combined component (deprecated, use NotificationBell + NotificationModal separately)
export const NotificationSystem: React.FC<NotificationSystemProps> = ({ userId, className = '', userRole = 'customer' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <NotificationBell userId={userId} onOpenModal={() => setIsOpen(true)} />
      <NotificationModal userId={userId} isOpen={isOpen} onClose={() => setIsOpen(false)} userRole={userRole} />
    </div>
  );
};

// Custom scrollbar styling and line-clamp utility
const style = document.createElement('style');
style.textContent = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
document.head.appendChild(style);
