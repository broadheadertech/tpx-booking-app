import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { 
  Bell, 
  Check, 
  Trash2, 
  Filter, 
  Search,
  Calendar,
  CreditCard,
  Gift,
  Clock,
  AlertTriangle,
  Info,
  Settings,
  ChevronDown,
  MailOpen,
  BellOff
} from 'lucide-react';

const NOTIFICATION_CONFIG = {
  booking: {
    icon: Calendar,
    color: 'text-blue-400',
    label: 'Booking'
  },
  payment: {
    icon: CreditCard,
    color: 'text-green-400',
    label: 'Payment'
  },
  system: {
    icon: Info,
    color: 'text-gray-400',
    label: 'System'
  },
  promotion: {
    icon: Gift,
    color: 'text-purple-400',
    label: 'Promotion'
  },
  reminder: {
    icon: Clock,
    color: 'text-yellow-400',
    label: 'Reminder'
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-red-400',
    label: 'Alert'
  },
};

const PRIORITY_CONFIG = {
  low: { color: 'text-gray-400', label: 'Low', bg: 'bg-gray-500/10' },
  medium: { color: 'text-blue-400', label: 'Medium', bg: 'bg-blue-500/10' },
  high: { color: 'text-orange-400', label: 'High', bg: 'bg-orange-500/10' },
  urgent: { color: 'text-red-400', label: 'Urgent', bg: 'bg-red-500/10' },
};

interface NotificationDashboardProps {
  userId: string;
  className?: string;
}

export const NotificationDashboard: React.FC<NotificationDashboardProps> = ({ userId, className = '' }) => {
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const notifications = useQuery(api.services.notifications.getUserNotifications, {
    userId,
    limit: 100,
  });
  
  const stats = useQuery(api.services.bookingNotifications.getNotificationStats, { userId });
  
  const markAsRead = useMutation(api.services.notifications.markAsRead);
  const markAllAsRead = useMutation(api.services.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.services.notifications.deleteNotification);
  
  const filteredNotifications = React.useMemo(() => {
    if (!notifications) return [];
    
    let filtered = [...notifications];
    
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(notification => 
        filterStatus === 'read' ? notification.is_read : !notification.is_read
      );
    }
    
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [notifications, searchQuery, filterType, filterStatus]);
  
  const handleMarkAsRead = async (notificationId?: string) => {
    try {
      if (notificationId) {
        await markAsRead({ notificationId, userId });
      } else if (selectedNotifications.size > 0) {
        await Promise.all(
          Array.from(selectedNotifications).map(id => 
            markAsRead({ notificationId: id, userId })
          )
        );
        setSelectedNotifications(new Set());
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({ userId });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Compact Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <Bell className="h-5 w-5 text-gray-400" />
            <span className="text-2xl font-bold text-white">{stats?.totalCount || 0}</span>
          </div>
          <p className="text-xs text-gray-400">Total</p>
        </div>

        <div className="bg-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <MailOpen className="h-5 w-5 text-[var(--color-primary)]" />
            <span className="text-2xl font-bold text-white">{stats?.unreadCount || 0}</span>
          </div>
          <p className="text-xs text-gray-400">Unread</p>
        </div>

        <div className="bg-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            <span className="text-2xl font-bold text-white">{stats?.byType?.booking || 0}</span>
          </div>
          <p className="text-xs text-gray-400">Bookings</p>
        </div>

        <div className="bg-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="h-5 w-5 text-green-400" />
            <span className="text-2xl font-bold text-white">{stats?.byType?.payment || 0}</span>
          </div>
          <p className="text-xs text-gray-400">Payments</p>
        </div>
      </div>
      
      {/* Compact Controls */}
      <div className="bg-[#2A2A2A] rounded-xl border border-[#444444]/50 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[#1A1A1A] border border-[#444444] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isFilterOpen
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[#1A1A1A] border border-[#444444] text-gray-300 hover:bg-[#333333]'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {stats?.unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>
        
        {/* Filter Options */}
        {isFilterOpen && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#444444]/50">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="all">All Types</option>
                <option value="booking">Bookings</option>
                <option value="payment">Payments</option>
                <option value="reminder">Reminders</option>
                <option value="alert">Alerts</option>
                <option value="system">System</option>
                <option value="promotion">Promotions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-primary)]">
              {selectedNotifications.size} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMarkAsRead()}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>Mark Read</span>
              </button>
              <button
                onClick={() => handleDelete()}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-500/90 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setSelectedNotifications(new Set())}
                className="px-3 py-1.5 bg-[#1A1A1A] border border-[#444444] text-gray-300 text-sm rounded-lg hover:bg-[#333333] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-[#2A2A2A] rounded-xl border border-[#444444]/50 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <BellOff className="h-12 w-12 text-gray-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'No Matching Notifications'
                : 'All Caught Up!'
              }
            </h3>
            <p className="text-sm text-center">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'No new notifications'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#444444]/30">
            {filteredNotifications.map((notification) => {
              const config = NOTIFICATION_CONFIG[notification.type];
              const priorityConfig = PRIORITY_CONFIG[notification.priority];
              const isSelected = selectedNotifications.has(notification._id);
              const IconComponent = config.icon;
              
              return (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-[#333333]/50 transition-colors ${
                    isSelected ? 'bg-[var(--color-primary)]/5' : ''
                  } ${!notification.is_read ? 'border-l-2 border-l-[var(--color-primary)]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const newSelected = new Set(selectedNotifications);
                        if (newSelected.has(notification._id)) {
                          newSelected.delete(notification._id);
                        } else {
                          newSelected.add(notification._id);
                        }
                        setSelectedNotifications(newSelected);
                      }}
                      className="mt-1 accent-[var(--color-primary)]"
                    />
                    
                    {/* Icon */}
                    <div className="p-2 bg-[#1A1A1A] rounded-lg border border-[#444444]">
                      <IconComponent className={`${config.color} h-4 w-4`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className={`font-semibold text-sm ${!notification.is_read ? 'text-white' : 'text-gray-300'}`}>
                          {notification.title}
                        </h3>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig.bg} ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                          
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification._id)}
                              className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDelete(notification._id)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className={`text-sm mb-2 ${!notification.is_read ? 'text-gray-300' : 'text-gray-400'}`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{config.label}</span>
                        <span>•</span>
                        <span>{timeAgo(notification.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
