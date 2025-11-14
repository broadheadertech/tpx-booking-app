import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useToast } from '../components/common/ToastNotification';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'last_seen_notifications';

// Hook to show toast notifications for new arrivals
export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const toast = useToast();
  const processedNotifications = useRef(new Set());
  const hasInitialized = useRef(false);

  // Get notifications for the current user
  const notifications = useQuery(
    api.services.notifications.getUserNotifications,
    user?._id ? { userId: user._id, limit: 20 } : "skip"
  );

  useEffect(() => {
    if (!notifications || !user) return;

    const unreadNotifications = notifications.filter(n => !n.is_read);

    // Initialize - load previously seen notifications from localStorage
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      
      try {
        const storedData = localStorage.getItem(`${STORAGE_KEY}_${user._id}`);
        if (storedData) {
          const lastSeenIds = JSON.parse(storedData);
          lastSeenIds.forEach(id => processedNotifications.current.add(id));
        }
      } catch (error) {
        console.error('[Notifications] Error loading seen notifications:', error);
      }

      // Mark all current notifications as seen on first load
      unreadNotifications.forEach(n => {
        processedNotifications.current.add(n._id);
      });

      // Save to localStorage
      try {
        const idsArray = Array.from(processedNotifications.current);
        localStorage.setItem(`${STORAGE_KEY}_${user._id}`, JSON.stringify(idsArray));
      } catch (error) {
        console.error('[Notifications] Error saving seen notifications:', error);
      }

      return;
    }

    // Find truly NEW notifications that haven't been seen before
    const newNotifications = unreadNotifications.filter(n => 
      !processedNotifications.current.has(n._id)
    );

    if (newNotifications.length === 0) return;

    // Show toast for each new notification
    newNotifications.forEach(notification => {
      // Mark as processed to avoid duplicate toasts
      processedNotifications.current.add(notification._id);

      // Show appropriate toast based on notification type
      switch (notification.type) {
        case 'booking':
          const isCustomer = user?.role === 'customer';
          toast.booking(
            notification.title,
            notification.message,
            {
              duration: 6000,
              action: isCustomer ? {
                label: notification.action_label || 'View',
                onClick: () => {
                  window.dispatchEvent(new CustomEvent('switchToBookings'));
                }
              } : undefined
            }
          );
          break;
          
        case 'payment':
          toast.payment(
            notification.title,
            notification.message,
            { duration: 6000 }
          );
          break;
          
        case 'reminder':
          toast.reminder(
            notification.title,
            notification.message,
            { duration: 7000 }
          );
          break;
          
        case 'promotion':
          toast.promotion(
            notification.title,
            notification.message,
            { duration: 6000 }
          );
          break;
          
        case 'alert':
          if (notification.priority === 'urgent' || notification.priority === 'high') {
            toast.error(
              notification.title,
              notification.message,
              { duration: 8000 }
            );
          } else {
            toast.warning(
              notification.title,
              notification.message,
              { duration: 6000 }
            );
          }
          break;
          
        case 'system':
          toast.info(
            notification.title,
            notification.message,
            { duration: 5000 }
          );
          break;
          
        default:
          toast.info(
            notification.title,
            notification.message,
            { duration: 5000 }
          );
      }
    });

    // Save updated processed notifications to localStorage
    try {
      const idsArray = Array.from(processedNotifications.current).slice(-100); // Keep last 100
      localStorage.setItem(`${STORAGE_KEY}_${user._id}`, JSON.stringify(idsArray));
    } catch (error) {
      console.error('[Notifications] Error saving seen notifications:', error);
    }
  }, [notifications, user, toast]);

  return {
    notifications,
    unreadCount: notifications?.filter(n => !n.is_read).length || 0
  };
};

// Hook for booking-specific notifications
export const useBookingNotifications = () => {
  const toast = useToast();

  const showBookingSuccess = (bookingCode, service, branch) => {
    toast.booking(
      'Booking Confirmed!',
      `Your ${service} appointment at ${branch} has been confirmed. Code: ${bookingCode}`,
      {
        duration: 7000,
        action: {
          label: 'View Booking',
          onClick: () => {
            // Trigger a custom event to switch to bookings tab
            window.dispatchEvent(new CustomEvent('switchToBookings'));
          },
          showArrow: true
        }
      }
    );
  };

  const showBookingCancelled = (bookingCode) => {
    toast.warning(
      'Booking Cancelled',
      `Your booking ${bookingCode} has been cancelled.`,
      {
        duration: 6000
      }
    );
  };

  const showPaymentSuccess = (amount, bookingCode) => {
    toast.payment(
      'Payment Successful',
      `Payment of ₱${amount} received for booking ${bookingCode}.`,
      {
        duration: 7000
      }
    );
  };

  const showPaymentFailed = (bookingCode) => {
    toast.error(
      'Payment Failed',
      `Payment for booking ${bookingCode} could not be processed. Please try again.`,
      {
        duration: 8000
      }
    );
  };

  return {
    showBookingSuccess,
    showBookingCancelled,
    showPaymentSuccess,
    showPaymentFailed
  };
};
