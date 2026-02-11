import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Hook for biometric authentication (Face ID / Fingerprint).
 * Used to secure sensitive operations like wallet transactions.
 * Only activates on native platforms, no-ops on web.
 */
export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState(false)
  const [biometryType, setBiometryType] = useState(null) // 'face' | 'finger' | 'iris' | null
  const isNative = Capacitor.isNativePlatform()

  // Check if biometric auth is available on the device
  const checkAvailability = useCallback(async () => {
    if (!isNative) {
      setIsAvailable(false)
      return false
    }

    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
      const result = await BiometricAuth.checkBiometry()

      const available = result.isAvailable
      setIsAvailable(available)

      // Map biometry type
      if (result.biometryTypes?.length > 0) {
        const type = result.biometryTypes[0]
        // BiometryType enum: 1=touchId, 2=faceId, 3=iris
        if (type === 2) setBiometryType('face')
        else if (type === 1) setBiometryType('finger')
        else if (type === 3) setBiometryType('iris')
      }

      return available
    } catch (err) {
      console.error('[Biometric] Availability check failed:', err)
      setIsAvailable(false)
      return false
    }
  }, [isNative])

  // Perform biometric authentication
  const authenticate = useCallback(async (reason = 'Verify your identity') => {
    if (!isNative) return true // Allow on web without biometric

    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')

      // Check availability first
      const check = await BiometricAuth.checkBiometry()
      if (!check.isAvailable) {
        // Biometric not available, fall through (allow the action)
        return true
      }

      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true, // Allow PIN/password fallback
      })

      return true
    } catch (err) {
      // User cancelled or auth failed
      console.log('[Biometric] Auth failed or cancelled:', err)
      return false
    }
  }, [isNative])

  return {
    isAvailable,
    biometryType,
    checkAvailability,
    authenticate,
    isNative,
  }
}
