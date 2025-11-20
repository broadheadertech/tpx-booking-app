import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { 
  Bell, 
  Check, 
  X, 
  Trash2, 
  Settings, 
  Filter, 
  Search,
  Calendar,
  CreditCard,
  Gift,
  Clock,
  AlertTriangle,
  Info,
  ChevronDown,
  Mail,
  MailOpen,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Enhanced notification type icons with more visual context
const NOTIFICATION_CONFIG = {
  booking: {
    icon: Calendar,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    label: 'Booking'
  },
  payment: {
    icon: CreditCard,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    label: 'Payment'
  },
  system: {
    icon: Info,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/50',
    label: 'System'
  },
  promotion: {
    icon: Gift,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
    label: 'Promotion'
  },
  reminder: {
    icon: Clock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    label: 'Reminder'
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    label: 'Alert'
  },
};

const PRIORITY_CONFIG = {
  low: { color: 'text-blue-400', label: 'Low' },
  medium: { color: 'text-yellow-400', label: 'Medium' },
  high: { color: 'text-orange-400', label: 'High' },
  urgent: { color: 'text-red-400', label: 'Urgent' },
};

interface NotificationDashboardProps {
  userId: string;
  className?: string;
}

export const NotificationDashboard: React.FC<NotificationDashboardProps> = ({ userId, className = '' }) => {
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Fetch notifications
  const notifications = useQuery(api.services.notifications.getUserNotifications, {
    userId,
    limit: 100,
  });
  
  // Fetch notification stats
  const stats = useQuery(api.services.bookingNotifications.getNotificationStats, { userId });
  
  // Mutation hooks
  const markAsRead = useMutation(api.services.notifications.markAsRead);
  const markAllAsRead = useMutation(api.services.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.services.notifications.deleteNotification);
  const cleanupExpired = useMutation(api.services.bookingNotifications.cleanupExpiredNotifications);
  
  // Filter and sort notifications
  const filteredNotifications = React.useMemo(() => {
    if (!notifications) return [];
    
    let filtered = [...notifications];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType);
    }
    
    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(notification => notification.priority === filterPriority);
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(notification => 
        filterStatus === 'read' ? notification.is_read : !notification.is_read
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      return 0;
    });
    
    return filtered;
  }, [notifications, searchQuery, filterType, filterPriority, filterStatus, sortBy, sortOrder]);
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n._id)));
    } else {
      setSelectedNotifications(new Set());
    }
  };
  
  const handleSelectNotification = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };
  
  const handleMarkAsRead = async (notificationId?: string) => {
    try {
      if (notificationId) {
        await markAsRead({ notificationId, userId });
      } else if (selectedNotifications.size > 0) {
        await markAsRead({ userId, notificationIds: Array.from(selectedNotifications) });
        setSelectedNotifications(new Set());
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };
  
  const handleDelete = async (notificationId?: string) => {
    try {
      if (notificationId) {
        await deleteNotification({ notificationId, userId });
      } else if (selectedNotifications.size > 0) {
        await Promise.all(
          Array.from(selectedNotifications).map(id => 
            deleteNotification({ notificationId: id, userId })
          )
        );
        setSelectedNotifications(new Set());
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };
  
  const handleCleanupExpired = async () => {
    try {
      await cleanupExpired({});
    } catch (error) {
      console.error('Failed to cleanup expired notifications:', error);
    }
  };
  
  const timeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const getExpiryStatus = (expiresAt?: number) => {
    if (!expiresAt) return null;
    
    const now = Date.now();
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) return 'expired';
    if (timeLeft < 24 * 60 * 60 * 1000) return 'expires today';
    if (timeLeft < 3 * 24 * 60 * 60 * 1000) return 'expires in 2 days';
    
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Header with Stats */}
      <div className="bg-gradient-to-br from-[#2A2A2A] via-[#333333] to-[#2A2A2A] rounded-2xl border border-[#444444]/50 p-6 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[var(--color-primary)]/20 rounded-xl border border-[var(--color-primary)]/30">
              <BellRing className="text-[var(--color-primary)]" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Notification Management</h2>
              <p className="text-gray-400 text-sm">Monitor, organize, and manage all your notifications</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCleanupExpired}
              className="px-4 py-2.5 text-sm bg-[#444444]/50 hover:bg-[#555555]/50 text-gray-300 rounded-lg transition-all duration-200 hover:shadow-lg border border-[#444444]/30 hover:border-[#555555]/50"
              title="Remove expired notifications"
            >
              <Archive size={16} className="mr-2" />
              Cleanup Expired
            </button>
            {stats?.unreadCount > 0 && (
              <button
                onClick={() => handleMarkAsRead()}
                className="px-4 py-2.5 text-sm bg-gradient-to-r from-[var(--color-primary)] to-[#FF9D5C] hover:from-[var(--color-primary)]/90 hover:to-[var(--color-accent)]/90 text-white rounded-lg transition-all duration-200 shadow-lg shadow-[var(--color-primary)]/20 font-medium"
              >
                <MailOpen size={16} className="mr-2" />
                Mark All Read
              </button>
            )}
          </div>
        </div>
        
        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#444444]/30 to-[#555555]/30 rounded-xl p-5 border border-[#444444]/50 hover:border-[#555555]/50 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-500/20 rounded-lg border border-gray-500/30">
                <Bell className="text-gray-400 group-hover:text-gray-300 transition-colors" size={20} />
              </div>
              <span className="text-2xl font-bold text-white tabular-nums">{stats?.totalCount || 0}</span>
            </div>
            <p className="text-sm text-gray-400 font-medium">Total Notifications</p>
            <div className="mt-2 h-1 bg-gray-600 rounded-full overflow-hidden">
              <div className="h-full bg-gray-500 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[var(--color-primary)]/20 to-[#FF9D5C]/20 rounded-xl p-5 border border-[var(--color-primary)]/50 hover:border-[var(--color-primary)]/60 transition-all duration-200 group shadow-lg shadow-[var(--color-primary)]/10">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-[var(--color-primary)]/30 rounded-lg border border-[var(--color-primary)]/40">
                <Mail className="text-[var(--color-primary)] group-hover:text-[var(--color-accent)] transition-colors" size={20} />
              </div>
              <span className="text-2xl font-bold text-white tabular-nums">{stats?.unreadCount || 0}</span>
            </div>
            <p className="text-sm text-[var(--color-primary)] font-medium">Unread</p>
            <div className="mt-2 h-1 bg-[var(--color-primary)]/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[#FF9D5C] rounded-full transition-all duration-500"
                style={{
                  width: stats?.totalCount ? `${Math.min((stats.unreadCount / stats.totalCount) * 100, 100)}%` : '0%'
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-5 border border-blue-500/50 hover:border-blue-500/60 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-500/30 rounded-lg border border-blue-500/40">
                <Calendar className="text-blue-400 group-hover:text-blue-300 transition-colors" size={20} />
              </div>
              <span className="text-2xl font-bold text-white tabular-nums">{stats?.byType?.booking || 0}</span>
            </div>
            <p className="text-sm text-blue-300 font-medium">Bookings</p>
            <div className="mt-2 h-1 bg-blue-500/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                style={{
                  width: stats?.totalCount ? `${Math.min((stats.byType?.booking / stats.totalCount) * 100, 100)}%` : '0%'
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-5 border border-green-500/50 hover:border-green-500/60 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-500/30 rounded-lg border border-green-500/40">
                <CreditCard className="text-green-400 group-hover:text-green-300 transition-colors" size={20} />
              </div>
              <span className="text-2xl font-bold text-white tabular-nums">{stats?.byType?.payment || 0}</span>
            </div>
            <p className="text-sm text-green-300 font-medium">Payments</p>
            <div className="mt-2 h-1 bg-green-500/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                style={{
                  width: stats?.totalCount ? `${Math.min((stats.byType?.payment / stats.totalCount) * 100, 100)}%` : '0%'
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Controls */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl border border-[#444444]/50 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
          {/* Enhanced Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Search notifications by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#444444]/50 rounded-xl
                text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Enhanced Filters & Sort */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
                isFilterOpen
                  ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                  : 'bg-[#333333] border border-[#444444]/50 text-gray-300 hover:bg-[#444444]/50 hover:border-[#555555]/50'
              }`}
            >
              <Filter size={16} className="mr-2" />
              Filters
              <ChevronDown size={16} className={`ml-2 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Enhanced Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-4 py-3 bg-[#333333] border border-[#444444]/50 rounded-xl text-gray-300 focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200 text-sm font-medium"
            >
              <option value="createdAt-desc">🕒 Newest First</option>
              <option value="createdAt-asc">📅 Oldest First</option>
              <option value="priority-desc">🔴 Priority (High to Low)</option>
              <option value="priority-asc">🟢 Priority (Low to High)</option>
            </select>
          </div>
        </div>
        
        {/* Enhanced Advanced Filters */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#444444]/30"
            >
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  Notification Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444]/50 rounded-xl text-gray-300 focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200 text-sm"
                >
                  <option value="all">🎯 All Types</option>
                  <option value="booking">📅 Bookings</option>
                  <option value="payment">💳 Payments</option>
                  <option value="reminder">⏰ Reminders</option>
                  <option value="alert">🚨 Alerts</option>
                  <option value="system">⚙️ System</option>
                  <option value="promotion">🎉 Promotions</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                  Priority Level
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444]/50 rounded-xl text-gray-300 focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200 text-sm"
                >
                  <option value="all">📊 All Priorities</option>
                  <option value="urgent">🚨 Urgent</option>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Read Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444]/50 rounded-xl text-gray-300 focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200 text-sm"
                >
                  <option value="all">📱 All Status</option>
                  <option value="unread">📧 Unread Only</option>
                  <option value="read">✓ Read Only</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Enhanced Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="bg-gradient-to-r from-[var(--color-primary)]/20 via-[#FF9D5C]/20 to-[var(--color-primary)]/20 border border-[var(--color-primary)]/50 rounded-2xl p-6 shadow-lg shadow-[var(--color-primary)]/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[var(--color-primary)]/30 rounded-lg border border-[var(--color-primary)]/40">
                <Check size={20} className="text-[var(--color-primary)]" />
              </div>
              <span className="text-[var(--color-primary)] font-bold text-lg">
                {selectedNotifications.size} notification{selectedNotifications.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleMarkAsRead()}
                className="px-4 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[#FF9D5C] hover:from-[var(--color-primary)]/90 hover:to-[var(--color-accent)]/90 text-white text-sm rounded-xl transition-all duration-200 shadow-lg shadow-[var(--color-primary)]/20 font-medium flex items-center"
              >
                <Check size={16} className="mr-2" />
                Mark as Read
              </button>
              <button
                onClick={() => handleDelete()}
                className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-500/90 hover:to-red-600/90 text-white text-sm rounded-xl transition-all duration-200 shadow-lg shadow-red-500/20 font-medium flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedNotifications(new Set())}
                className="px-4 py-2.5 bg-[#444444]/50 hover:bg-[#555555]/50 text-gray-300 text-sm rounded-xl transition-all duration-200 border border-[#444444]/30 hover:border-[#555555]/50 font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced Notifications List */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl border border-[#444444]/50 overflow-hidden shadow-2xl">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-gray-400">
            <div className="p-6 bg-[#444444]/30 rounded-3xl border border-[#444444]/50 mb-6">
              <Bell size={72} className="text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-300">
              {searchQuery || filterType !== 'all' || filterPriority !== 'all' || filterStatus !== 'all'
                ? 'No Matching Notifications'
                : 'All Caught Up!'
              }
            </h3>
            <p className="text-center max-w-md text-gray-400 leading-relaxed">
              {searchQuery || filterType !== 'all' || filterPriority !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search terms or filters to discover more notifications.'
                : 'You\'re all caught up! No new notifications at the moment. We\'ll notify you when something important happens.'
              }
            </p>
            {(searchQuery || filterType !== 'all' || filterPriority !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setFilterPriority('all');
                  setFilterStatus('all');
                }}
                className="mt-6 px-6 py-3 bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/30 text-[var(--color-primary)] rounded-xl transition-all duration-200 font-medium border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/50"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#444444]/30">
            {filteredNotifications.map((notification) => {
              const config = NOTIFICATION_CONFIG[notification.type];
              const priorityConfig = PRIORITY_CONFIG[notification.priority];
              const isSelected = selectedNotifications.has(notification._id);
              const expiryStatus = getExpiryStatus(notification.expires_at);
              
              return (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-6 hover:bg-[#333333]/50 transition-colors cursor-pointer
                    ${isSelected ? 'bg-[var(--color-primary)]/10' : ''}
                    ${!notification.is_read ? 'border-l-4 border-l-[var(--color-primary)]' : ''}
                  `}
                  onClick={() => handleSelectNotification(notification._id)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectNotification(notification._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 accent-[var(--color-primary)]"
                    />
                    
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                      <config.icon className={config.color} size={20} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${!notification.is_read ? 'text-white' : 'text-gray-300'}`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 ${!notification.is_read ? 'text-gray-300' : 'text-gray-400'}`}>
                            {notification.message}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          {/* Priority Badge */}
                          <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig.color} bg-opacity-20 bg-current`}>
                            {priorityConfig.label}
                          </span>
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-1">
                            {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification._id);
                                }}
                                className="p-1 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                                title="Mark as read"
                              >
                                <MailOpen size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification._id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>{config.label}</span>
                          <span>•</span>
                          <span>{timeAgo(notification.createdAt)}</span>
                          {expiryStatus && (
                            <>
                              <span>•</span>
                              <span className="text-yellow-400">{expiryStatus}</span>
                            </>
                          )}
                        </div>
                        
                        {notification.action_label && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = notification.action_url!;
                            }}
                            className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors"
                          >
                            {notification.action_label} →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
