import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook to track user idle time and trigger callbacks
 * @param {Object} options Configuration options
 * @param {number} options.idleTime - Time in milliseconds before considered idle (default: 30 min)
 * @param {number} options.warningTime - Time in milliseconds to show warning before logout (default: 60 sec)
 * @param {function} options.onIdle - Callback when user becomes idle
 * @param {function} options.onWarning - Callback when warning should be shown
 * @param {function} options.onActive - Callback when user becomes active again
 * @param {boolean} options.enabled - Whether idle tracking is enabled
 */
const useIdleTimer = ({
  idleTime = 30 * 60 * 1000, // 30 minutes default
  warningTime = 60 * 1000, // 60 seconds warning before logout
  onIdle,
  onWarning,
  onActive,
  enabled = true,
}) => {
  const [isIdle, setIsIdle] = useState(false)
  const [isWarning, setIsWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(warningTime)

  const idleTimerRef = useRef(null)
  const warningTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  // Start the countdown for warning period
  const startCountdown = useCallback(() => {
    setRemainingTime(warningTime)
    countdownRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1000) {
          clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1000
      })
    }, 1000)
  }, [warningTime])

  // Handle warning state
  const handleWarning = useCallback(() => {
    setIsWarning(true)
    startCountdown()
    onWarning?.()

    // Set timer for actual idle/logout after warning period
    warningTimerRef.current = setTimeout(() => {
      setIsIdle(true)
      setIsWarning(false)
      onIdle?.()
    }, warningTime)
  }, [onWarning, onIdle, warningTime, startCountdown])

  // Start or restart the idle timer
  const resetTimer = useCallback(() => {
    if (!enabled) return

    clearAllTimers()
    lastActivityRef.current = Date.now()
    setIsIdle(false)
    setIsWarning(false)
    setRemainingTime(warningTime)

    // Set timer for when to show warning
    idleTimerRef.current = setTimeout(() => {
      handleWarning()
    }, idleTime)
  }, [enabled, clearAllTimers, idleTime, handleWarning, warningTime])

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!enabled) return

    const now = Date.now()
    // Throttle activity handling to avoid excessive updates
    if (now - lastActivityRef.current < 1000) return

    lastActivityRef.current = now

    if (isWarning || isIdle) {
      onActive?.()
    }

    resetTimer()
  }, [enabled, isWarning, isIdle, onActive, resetTimer])

  // Extend session when user clicks "Stay Logged In"
  const extendSession = useCallback(() => {
    handleActivity()
  }, [handleActivity])

  // Setup event listeners
  useEffect(() => {
    if (!enabled) {
      clearAllTimers()
      return
    }

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'click',
    ]

    // Throttled event handler
    let throttleTimer = null
    const throttledHandler = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        handleActivity()
        throttleTimer = null
      }, 500)
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, throttledHandler, { passive: true })
    })

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we should still be in warning/idle state based on time elapsed
        const elapsed = Date.now() - lastActivityRef.current
        if (elapsed >= idleTime + warningTime) {
          setIsIdle(true)
          setIsWarning(false)
          onIdle?.()
        } else if (elapsed >= idleTime) {
          handleWarning()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Start initial timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledHandler)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearAllTimers()
      if (throttleTimer) clearTimeout(throttleTimer)
    }
  }, [enabled, idleTime, warningTime, handleActivity, handleWarning, onIdle, resetTimer, clearAllTimers])

  return {
    isIdle,
    isWarning,
    remainingTime,
    extendSession,
    resetTimer,
  }
}

export default useIdleTimer
