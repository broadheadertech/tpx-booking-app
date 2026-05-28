import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useToast } from '../components/common/ToastNotification';
import { useCurrentUser } from './useCurrentUser';

const STORAGE_KEY = 'last_seen_notifications';
const DESKTOP_OPT_IN_KEY = 'desktop_notifications_opt_in';

// Show a native desktop notification (Web Notifications API).
// Silently no-ops if the browser doesn't support it or permission is denied.
const showDesktopNotification = (title, body, { tag, onClick } = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  // Don't pop a desktop alert if the tab is already focused — the toast suffices.
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) return;
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: '/logo.png',
      badge: '/logo.png',
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      if (onClick) onClick();
      n.close();
    };
  } catch (e) {
    console.warn('[Notifications] Desktop notification failed:', e);
  }
};

// Hook to show toast notifications for new arrivals
export const useRealtimeNotifications = () => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const processedNotifications = useRef(new Set());
  const hasInitialized = useRef(false);

  // Get notifications for the current user
  const notifications = useQuery(
    api.services.notifications.getUserNotifications,
    user?._id ? { userId: user._id, limit: 20 } : "skip"
  );

  // Auto-request desktop notification permission for staff/admin roles
  // (customers don't need desktop pings for their own bookings — the toast is enough)
  useEffect(() => {
    if (!user) return;
    const isStaffRole = user.role && user.role !== 'customer';
    if (!isStaffRole) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    // Only ask once per device — track via localStorage so we don't re-prompt aggressively
    try {
      const askedKey = `${DESKTOP_OPT_IN_KEY}_${user._id}`;
      if (localStorage.getItem(askedKey)) return;
      localStorage.setItem(askedKey, '1');
      Notification.requestPermission().catch(() => {});
    } catch (_) {
      // localStorage may be unavailable; just request once
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

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
        case 'booking': {
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
          // Fire a desktop notification for staff/admin so they don't miss
          // an incoming booking when the tab is in the background.
          if (!isCustomer) {
            showDesktopNotification(
              notification.title || 'New Booking',
              notification.message || 'A new booking has come in.',
              {
                tag: `booking-${notification._id}`,
                onClick: () => window.dispatchEvent(new CustomEvent('switchToBookings')),
              }
            );
          }
          break;
        }
          
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
