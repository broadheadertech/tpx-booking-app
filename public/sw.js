// Service Worker for TipunoX Booking App - PWA + Notifications

const CACHE_NAME = 'tpx-v1';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Listen for messages from the app (alarm scheduling)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_ALARM') {
    const { alarmTime, appointments, workHours } = event.data;
    // Store alarm data
    self.alarmData = { alarmTime, appointments, workHours };
  }

  if (event.data && event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title, {
      body,
      tag: tag || 'tpx-alarm',
      icon: '/img/app_logo.png',
      badge: '/img/app_logo.png',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
    });
  }
});

// Notification click - open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
