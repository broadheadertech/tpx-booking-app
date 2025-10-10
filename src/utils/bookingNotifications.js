import React from 'react';
import { useToast } from '../components/common/ToastNotification';

// Hook to automatically show toast notifications for booking events
export const useBookingNotificationToasts = () => {
  const toast = useToast();

  const showBookingCreated = (booking, service, branch) => {
    toast.booking(
      'Booking Confirmed!',
      `Your ${service?.name || 'service'} appointment at ${branch?.name || 'our branch'} has been confirmed.`,
      {
        duration: 7000,
        action: {
          label: 'View Booking',
          onClick: () => {
            if (booking?.booking_code) {
              window.location.href = `/booking/${booking.booking_code}`;
            }
          },
          showArrow: true
        }
      }
    );
  };

  const showBookingUpdated = (booking, type = 'updated') => {
    const messages = {
      rescheduled: 'Your appointment has been rescheduled.',
      cancelled: 'Your booking has been cancelled.',
      confirmed: 'Your booking has been confirmed.',
      completed: 'Your appointment has been completed. Thank you!',
      updated: 'Your booking has been updated.'
    };

    const titles = {
      rescheduled: 'Booking Rescheduled',
      cancelled: 'Booking Cancelled',
      confirmed: 'Booking Confirmed',
      completed: 'Appointment Completed',
      updated: 'Booking Updated'
    };

    toast.booking(
      titles[type] || 'Booking Updated',
      messages[type] || 'Your booking has been updated.',
      {
        duration: 6000,
        action: booking?.booking_code ? {
          label: 'View Details',
          onClick: () => {
            window.location.href = `/booking/${booking.booking_code}`;
          },
          showArrow: true
        } : undefined
      }
    );
  };

  const showPaymentSuccess = (payment, booking) => {
    toast.payment(
      'Payment Successful',
      `Payment of ₱${payment?.amount || '0'} received for booking ${booking?.booking_code || ''}.`,
      {
        duration: 7000,
        action: {
          label: 'View Receipt',
          onClick: () => {
            if (booking?.booking_code) {
              window.location.href = `/booking/${booking.booking_code}/receipt`;
            }
          },
          showArrow: true
        }
      }
    );
  };

  const showPaymentFailed = (payment, booking) => {
    toast.error(
      'Payment Failed',
      `Payment for booking ${booking?.booking_code || ''} could not be processed. Please try again.`,
      {
        duration: 8000,
        action: {
          label: 'Retry Payment',
          onClick: () => {
            if (booking?.booking_code) {
              window.location.href = `/booking/${booking.booking_code}/payment`;
            }
          },
          showArrow: true
        }
      }
    );
  };

  const showVoucherReceived = (voucher, service) => {
    toast.promotion(
      'Voucher Received!',
      `You've received a voucher for ${service?.name || 'services'}. Value: ₱${voucher?.value || '0'}`,
      {
        duration: 8000,
        action: {
          label: 'View Vouchers',
          onClick: () => {
            window.location.href = '/customer/vouchers';
          },
          showArrow: true
        }
      }
    );
  };

  const showReminder = (booking, service) => {
    toast.reminder(
      'Appointment Reminder',
      `Reminder: Your ${service?.name || 'appointment'} is scheduled for ${booking?.date} at ${booking?.time}.`,
      {
        duration: 10000, // Reminders stay longer
        action: {
          label: 'View Details',
          onClick: () => {
            if (booking?.booking_code) {
              window.location.href = `/booking/${booking.booking_code}`;
            }
          },
          showArrow: true
        }
      }
    );
  };

  const showWelcomeBack = (user) => {
    toast.info(
      'Welcome Back!',
      `Good to see you again, ${user?.username || 'valued customer'}!`,
      {
        duration: 5000
      }
    );
  };

  const showSystemAlert = (title, message, priority = 'medium') => {
    if (priority === 'urgent' || priority === 'high') {
      toast.error(title, message, { duration: 10000 });
    } else if (priority === 'medium') {
      toast.warning(title, message, { duration: 7000 });
    } else {
      toast.info(title, message, { duration: 5000 });
    }
  };

  return {
    showBookingCreated,
    showBookingUpdated,
    showPaymentSuccess,
    showPaymentFailed,
    showVoucherReceived,
    showReminder,
    showWelcomeBack,
    showSystemAlert
  };
};

// Utility function to trigger notifications from anywhere in the app
export const triggerBookingNotification = (type, data) => {
  // This can be called from Convex mutations, API responses, etc.
  // It will trigger a custom event that the hook can listen to
  
  const event = new CustomEvent('bookingNotification', {
    detail: { type, data }
  });
  
  window.dispatchEvent(event);
};

// Hook to listen for booking notification events
export const useBookingNotificationListener = () => {
  const bookingToasts = useBookingNotificationToasts();

  React.useEffect(() => {
    const handleNotification = (event) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'booking_created':
          bookingToasts.showBookingCreated(data.booking, data.service, data.branch);
          break;
        case 'booking_updated':
          bookingToasts.showBookingUpdated(data.booking, data.updateType);
          break;
        case 'payment_success':
          bookingToasts.showPaymentSuccess(data.payment, data.booking);
          break;
        case 'payment_failed':
          bookingToasts.showPaymentFailed(data.payment, data.booking);
          break;
        case 'voucher_received':
          bookingToasts.showVoucherReceived(data.voucher, data.service);
          break;
        case 'reminder':
          bookingToasts.showReminder(data.booking, data.service);
          break;
        case 'system_alert':
          bookingToasts.showSystemAlert(data.title, data.message, data.priority);
          break;
        case 'welcome_back':
          bookingToasts.showWelcomeBack(data.user);
          break;
        default:
          console.warn('Unknown notification type:', type);
      }
    };

    window.addEventListener('bookingNotification', handleNotification);
    
    return () => {
      window.removeEventListener('bookingNotification', handleNotification);
    };
  }, [bookingToasts]);
};
