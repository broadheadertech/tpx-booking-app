// Utility for testing notification system
// This can be called from the browser console for testing

import { triggerBookingNotification } from './bookingNotifications';

// Test functions that can be called from the browser console
window.testNotifications = {
  // Test booking created notification
  testBookingCreated: () => {
    triggerBookingNotification('booking_created', {
      booking: { booking_code: 'TEST123' },
      service: { name: 'Haircut' },
      branch: { name: 'Main Branch' }
    });
    console.log('Booking created notification triggered');
  },

  // Test booking received notification (new correct behavior)
  testBookingReceived: () => {
    triggerBookingNotification('booking_created', {
      booking: { booking_code: 'TEST123', status: 'pending' },
      service: { name: 'Haircut' },
      branch: { name: 'Main Branch' }
    });
    console.log('Booking received notification triggered (correct behavior)');
  },

  // Test booking confirmed notification (when staff confirms)
  testBookingConfirmed: () => {
    triggerBookingNotification('booking_created', {
      booking: { booking_code: 'TEST123', status: 'confirmed' },
      service: { name: 'Haircut' },
      branch: { name: 'Main Branch' }
    });
    console.log('Booking confirmed notification triggered (when staff confirms)');
  },

  // Test payment success notification
  testPaymentSuccess: () => {
    triggerBookingNotification('payment_success', {
      payment: { amount: 500 },
      booking: { booking_code: 'TEST123' }
    });
    console.log('Payment success notification triggered');
  },

  // Test reminder notification
  testReminder: () => {
    triggerBookingNotification('reminder', {
      booking: { booking_code: 'TEST123', date: '2024-01-15', time: '10:00 AM' },
      service: { name: 'Beard Trim' }
    });
    console.log('Reminder notification triggered');
  },

  // Test system alert
  testSystemAlert: () => {
    triggerBookingNotification('system_alert', {
      title: 'System Maintenance',
      message: 'The system will be under maintenance from 2:00 AM to 4:00 AM.',
      priority: 'high'
    });
    console.log('System alert notification triggered');
  },

  // Test welcome back notification
  testWelcomeBack: () => {
    triggerBookingNotification('welcome_back', {
      user: { username: 'TestUser' }
    });
    console.log('Welcome back notification triggered');
  }
};

console.log('Notification test functions loaded. Use window.testNotifications.testBookingCreated() etc. to test.');
