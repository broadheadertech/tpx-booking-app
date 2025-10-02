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
}

interface NotificationProps {
  notification: any;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationProps> = ({ notification, onMarkAsRead, onDelete }) => {
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
          : 'bg-gradient-to-r from-[#333333] to-[#3A3A3A] border-[#FF8C42]/30 hover:border-[#FF8C42]/50 hover:shadow-lg hover:shadow-[#FF8C42]/10'
        }
        ${typeColor}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !notification.is_read && onMarkAsRead(notification._id)}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute top-3 right-3 w-3 h-3 bg-[#FF8C42] rounded-full animate-pulse shadow-lg shadow-[#FF8C42]/30" />
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
                  notification.is_read ? 'bg-gray-500/20 text-gray-400' : 'bg-[#FF8C42]/20 text-[#FF8C42]'
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
                  className="p-1.5 text-gray-400 hover:text-[#FF8C42] transition-colors rounded-lg hover:bg-[#FF8C42]/10"
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
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAction}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
                bg-[#FF8C42] hover:bg-[#FF8C42]/90 text-white transition-all duration-200 shadow-lg shadow-[#FF8C42]/20"
            >
              {notification.action_label}
              <span className="ml-1">→</span>
            </motion.button>
          )}

          {/* Metadata display */}
          {notification.metadata?.booking_id && (
            <div className="mt-3 pt-3 border-t border-[#444444]/30">
              <p className="text-xs text-gray-500">
                Booking ID: <span className="font-mono text-gray-400">{notification.metadata.booking_id}</span>
              </p>
            </div>
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
  const stats = useQuery(api.services.bookingNotifications.getNotificationStats, { userId });

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onOpenModal}
      className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
    >
      <Bell size={20} />

      {stats && stats.unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FF8C42] text-white text-xs
            font-semibold rounded-full flex items-center justify-center px-1 shadow-lg"
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
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ userId, isOpen, onClose }) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Fetch notifications
  const notifications = useQuery(api.services.bookingNotifications.getRecentNotifications, {
    userId,
    limit: 50,
    type: activeFilter === 'all' ? undefined : activeFilter as any,
    unreadOnly: unreadOnly,
  });

  // Fetch notification stats
  const stats = useQuery(api.services.bookingNotifications.getNotificationStats, { userId });

  // Mutation hooks
  const markAsRead = useMutation(api.services.bookingNotifications.markNotificationsAsRead);
  const deleteNotification = useMutation(api.services.notifications.deleteNotification);
  const markAllAsRead = useMutation(api.services.notifications.markAllAsRead);
  const cleanupExpired = useMutation(api.services.bookingNotifications.cleanupExpiredNotifications);
  
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead({ userId, notificationIds: [notificationId] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
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
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#FF8C42]/20 rounded-lg border border-[#FF8C42]/50">
                  <Bell className="text-[#FF8C42]" size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Notification Center</h2>
                  <p className="text-sm text-gray-400">Stay updated with real-time alerts</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-lg bg-[#0A0A0A] hover:bg-[#2A2A2A] flex items-center justify-center transition-colors duration-200 border border-[#2A2A2A]/50"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-300 hover:text-[#FF8C42]" />
              </button>
            </div>

            {/* Stats and Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 px-6 pt-6">
              <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]/50 text-center">
                <div className="text-lg font-bold text-white">{stats?.totalCount || 0}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="bg-[#FF8C42]/20 rounded-lg p-3 border border-[#FF8C42]/50 text-center">
                <div className="text-lg font-bold text-[#FF8C42]">{stats?.unreadCount || 0}</div>
                <div className="text-xs text-gray-300">Unread</div>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/50 text-center">
                <div className="text-lg font-bold text-blue-400">{stats?.byType?.booking || 0}</div>
                <div className="text-xs text-blue-300">Bookings</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/50 text-center">
                <div className="text-lg font-bold text-green-400">{stats?.byType?.payment || 0}</div>
                <div className="text-xs text-green-300">Payments</div>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-6 px-6">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${activeFilter === option.value
                      ? 'bg-[#FF8C42] text-white shadow-lg shadow-[#FF8C42]/20'
                      : 'bg-[#0A0A0A] text-gray-300 hover:bg-[#2A2A2A] hover:text-white border border-[#2A2A2A]/50'
                    }`}
                >
                  {option.label}
                  {option.count > 0 && (
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      activeFilter === option.value
                        ? 'bg-white/20 text-white'
                        : 'bg-[#FF8C42]/20 text-[#FF8C42]'
                    }`}>
                      {option.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex items-center justify-between pt-6 border-t border-[#2A2A2A] px-6">
              <label className="flex items-center text-sm text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="mr-3 w-4 h-4 accent-[#FF8C42] rounded"
                />
                Show unread only
              </label>

              {stats && stats.unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1.5 text-sm bg-[#FF8C42] hover:bg-[#FF8C42]/90 text-white rounded-lg transition-colors font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
              {notifications === undefined ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-[#FF8C42]"></div>
                  <p className="text-gray-400 text-sm mt-4">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                  <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A]/50 mb-4">
                    <Bell size={48} className="text-gray-500" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">No notifications found</h4>
                  <p className="text-sm text-center max-w-md">
                    {unreadOnly
                      ? "No unread notifications at the moment."
                      : "You're all caught up! Check back later for new updates."
                    }
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <AnimatePresence mode="wait">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification._id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A]">
              <div className="flex items-center space-x-4 text-gray-400">
                <span className="text-sm">Notifications expire after 7 days</span>
                <span className="text-gray-600">•</span>
                <span className="text-sm">{stats?.totalCount || 0} total notifications</span>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium bg-[#0A0A0A] hover:bg-[#2A2A2A] text-gray-300 hover:text-white rounded-lg transition-colors duration-200 border border-[#2A2A2A]/50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Backward compatibility: Combined component (deprecated, use NotificationBell + NotificationModal separately)
export const NotificationSystem: React.FC<NotificationSystemProps> = ({ userId, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <NotificationBell userId={userId} onOpenModal={() => setIsOpen(true)} />
      <NotificationModal userId={userId} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};

// Custom scrollbar styling
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
`;
document.head.appendChild(style);
