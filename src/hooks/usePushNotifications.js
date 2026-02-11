import { useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

/**
 * Hook to manage push notifications in Capacitor native apps.
 * Handles permission requests, token registration, and notification listeners.
 * Only activates on native platforms (Android/iOS), no-ops on web.
 */
export const usePushNotifications = (userId) => {
  const listenerCleanups = useRef([])
  const savePushToken = useMutation(api.services.pushTokens.saveToken)
  const removePushToken = useMutation(api.services.pushTokens.removeToken)

  const isNative = Capacitor.isNativePlatform()

  const registerPush = useCallback(async () => {
    if (!isNative || !userId) return

    try {
      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions()

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions()
      }

      if (permStatus.receive !== 'granted') {
        console.log('[Push] Permission not granted')
        return
      }

      // Register with the native push service (FCM / APNs)
      await PushNotifications.register()
    } catch (err) {
      console.error('[Push] Registration error:', err)
    }
  }, [isNative, userId])

  useEffect(() => {
    if (!isNative || !userId) return

    // Listen for successful registration — save token to Convex
    const onRegistration = PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Token received:', token.value)
      try {
        await savePushToken({
          user_id: userId,
          token: token.value,
          platform: Capacitor.getPlatform(), // 'android' or 'ios'
        })
      } catch (err) {
        console.error('[Push] Failed to save token:', err)
      }
    })

    // Listen for registration errors
    const onRegistrationError = PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err)
    })

    // Listen for received notifications (while app is in foreground)
    const onPushReceived = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received:', notification)
    })

    // Listen for notification tap (user tapped the notification)
    const onPushAction = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification action:', action)
      // Handle deep link navigation based on notification data
      const data = action.notification.data
      if (data?.route) {
        window.location.href = data.route
      }
    })

    // Store cleanup refs
    listenerCleanups.current = [onRegistration, onRegistrationError, onPushReceived, onPushAction]

    // Auto-register on mount
    registerPush()

    return () => {
      listenerCleanups.current.forEach(async (listener) => {
        const l = await listener
        l.remove()
      })
    }
  }, [isNative, userId, registerPush, savePushToken])

  // Unregister push token (e.g., on logout)
  const unregisterPush = useCallback(async () => {
    if (!isNative || !userId) return
    try {
      await removePushToken({ user_id: userId })
    } catch (err) {
      console.error('[Push] Failed to remove token:', err)
    }
  }, [isNative, userId, removePushToken])

  return { registerPush, unregisterPush, isNative }
}
