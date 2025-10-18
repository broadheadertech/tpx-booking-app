import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useToast } from '../components/common/ToastNotification';
import { useAuth } from '../context/AuthContext';

// Hook to show toast notifications for new arrivals
export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const toast = useToast();
  const lastNotificationCount = useRef(0);
  const processedNotifications = useRef(new Set());
  const isInitialLoad = useRef(true);
  
  // Development mode - show all notifications including on initial load
  const isDev = import.meta.env.DEV;

  // Get notifications for the current user
  const notifications = useQuery(
    api.services.notifications.getUserNotifications,
    user?._id ? { userId: user._id, limit: 10 } : "skip"
  );

  useEffect(() => {
    if (!notifications || !user) return;

    const unreadNotifications = notifications.filter(n => !n.is_read);
    const currentCount = unreadNotifications.length;

    console.log('[Notifications] Loaded:', currentCount, 'unread notifications', unreadNotifications);

    // Skip showing toasts on initial load - only for new arrivals (unless in dev mode)
    if (isInitialLoad.current && !isDev) {
      // Mark all current unread notifications as processed without showing toasts
      unreadNotifications.forEach(n => {
        processedNotifications.current.add(n._id);
      });
      isInitialLoad.current = false;
      lastNotificationCount.current = currentCount;
      console.log('[Notifications] Initial load - marked as processed, no toasts shown');
      return;
    }

    // In dev mode, show on initial load too
    if (isInitialLoad.current && isDev) {
      isInitialLoad.current = false;
      console.log('[Notifications] Initial load in DEV mode - will show toasts');
    }

    // Check for new unread notifications (count increased OR in dev mode)
    if (currentCount > lastNotificationCount.current || isDev) {
      // Find new notifications that haven't been processed
      const newNotifications = unreadNotifications.filter(n => 
        !processedNotifications.current.has(n._id)
      );

      console.log('[Notifications] New notifications:', newNotifications.length);

      // Show toast for each new notification
      newNotifications.forEach(notification => {
        // Mark as processed to avoid duplicate toasts
        processedNotifications.current.add(notification._id);

        console.log('[Notifications] Showing toast for:', notification.title);

        // Show appropriate toast based on notification type
        switch (notification.type) {
          case 'booking':
            // Special handling for booking received vs confirmed
            const isBookingReceived = notification.title.includes('Booking Received');
            const isBookingConfirmed = notification.title.includes('Booking Confirmed');

            // Only show action button for customers
            const isCustomer = user?.role === 'customer';

            toast.booking(
              notification.title,
              notification.message,
              {
                duration: isBookingConfirmed ? 7000 : 6000,
                action: isCustomer ? {
                  label: notification.action_label || 'View Booking',
                  onClick: () => {
                    // Trigger a custom event to switch to bookings tab
                    console.log('Dispatching switchToBookings event...')
                    window.dispatchEvent(new CustomEvent('switchToBookings'));
                  },
                  showArrow: true
                } : undefined
              }
            );
            break;
            
          case 'payment':
            toast.payment(
              notification.title,
              notification.message,
              {
                duration: 6000,
                action: notification.action_url ? {
                  label: notification.action_label || 'View Payment',
                  onClick: () => {
                    window.location.href = notification.action_url;
                  },
                  showArrow: true
                } : undefined
              }
            );
            break;
            
          case 'reminder':
            toast.reminder(
              notification.title,
              notification.message,
              {
                duration: 8000, // Reminders stay longer
                action: notification.action_url ? {
                  label: notification.action_label || 'View Details',
                  onClick: () => {
                    window.location.href = notification.action_url;
                  },
                  showArrow: true
                } : undefined
              }
            );
            break;
            
          case 'promotion':
            toast.promotion(
              notification.title,
              notification.message,
              {
                duration: 7000,
                action: notification.action_url ? {
                  label: notification.action_label || 'View Offer',
                  onClick: () => {
                    window.location.href = notification.action_url;
                  },
                  showArrow: true
                } : undefined
              }
            );
            break;
            
          case 'alert':
            if (notification.priority === 'urgent' || notification.priority === 'high') {
              toast.error(
                notification.title,
                notification.message,
                {
                  duration: 10000, // Urgent alerts stay the longest
                  action: notification.action_url ? {
                    label: notification.action_label || 'Take Action',
                    onClick: () => {
                      window.location.href = notification.action_url;
                    },
                    showArrow: true
                  } : undefined
                }
              );
            } else {
              toast.warning(
                notification.title,
                notification.message,
                {
                  duration: 8000,
                  action: notification.action_url ? {
                    label: notification.action_label || 'View Details',
                    onClick: () => {
                      window.location.href = notification.action_url;
                    },
                    showArrow: true
                  } : undefined
                }
              );
            }
            break;
            
          case 'system':
            toast.info(
              notification.title,
              notification.message,
              {
                duration: 6000,
                action: notification.action_url ? {
                  label: notification.action_label || 'View Details',
                  onClick: () => {
                    window.location.href = notification.action_url;
                  },
                  showArrow: true
                } : undefined
              }
            );
            break;
            
          default:
            toast.info(
              notification.title,
              notification.message,
              {
                duration: 5000,
                action: notification.action_url ? {
                  label: notification.action_label || 'View',
                  onClick: () => {
                    window.location.href = notification.action_url;
                  },
                  showArrow: true
                } : undefined
              }
            );
        }
      });
    }

    // Update the last known count
    lastNotificationCount.current = currentCount;

    // Clean up old processed notifications (keep last 50)
    if (processedNotifications.current.size > 50) {
      const entries = Array.from(processedNotifications.current);
      processedNotifications.current = new Set(entries.slice(-50));
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
