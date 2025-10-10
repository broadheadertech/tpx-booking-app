import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  stats: any;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  userId: Id<'users'>;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, userId }) => {
  const [lastRefresh, setLastRefresh] = useState(0);
  
  // Fetch notifications
  const notifications = useQuery(
    api.services.notifications.getUserNotifications,
    { userId, limit: 50 },
    { pollInterval: 30000 } // Refresh every 30 seconds
  );
  
  // Fetch notification stats
  const stats = useQuery(
    api.services.bookingNotifications.getNotificationStats,
    { userId },
    { pollInterval: 60000 } // Refresh every minute
  );
  
  // Mutation hooks
  const markAsReadMutation = useMutation(api.services.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.services.notifications.markAllAsRead);
  const deleteNotificationMutation = useMutation(api.services.notifications.deleteNotification);
  
  // Calculate unread count
  const unreadCount = React.useMemo(() => {
    if (!notifications) return 0;
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);
  
  // Auto-refresh notifications when they might be updated
  const refreshNotifications = () => {
    setLastRefresh(Date.now());
  };
  
  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation({ notificationId, userId });
      refreshNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await markAllAsReadMutation({ userId });
      refreshNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };
  
  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationMutation({ notificationId, userId });
      refreshNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };
  
  const value: NotificationContextType = {
    notifications: notifications || [],
    unreadCount,
    stats: stats || null,
    isLoading: notifications === undefined,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
