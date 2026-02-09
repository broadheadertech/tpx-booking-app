import { useState, useRef, useEffect, useCallback } from 'react'
import { RefreshCw, ArrowDown, Check } from 'lucide-react'

/**
 * Phase 3: Premium Experience - Pull to Refresh
 *
 * Native-feeling pull-to-refresh gesture for mobile:
 * - Smooth physics-based animation
 * - Visual feedback during pull
 * - Loading spinner while refreshing
 * - Success/error states
 * - Haptic feedback integration
 */

// Add required styles
if (typeof document !== 'undefined') {
  const styleId = 'pull-to-refresh-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes bounceDown {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(5px); }
      }
      .ptr-spinner {
        animation: spin 1s linear infinite;
      }
      .ptr-bounce {
        animation: bounceDown 1s ease-in-out infinite;
      }
    `
    document.head.appendChild(style)
  }
}

/**
 * PullToRefresh - Main component
 *
 * @example
 * <PullToRefresh onRefresh={handleRefresh}>
 *   <YourScrollableContent />
 * </PullToRefresh>
 */
const PullToRefresh = ({
  children,
  onRefresh,
  disabled = false,
  threshold = 80, // Pull distance to trigger refresh
  maxPull = 120, // Maximum pull distance
  resistance = 2.5, // Pull resistance factor
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  successText = 'Updated!',
  className = '',
  hapticEnabled = true
}) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const containerRef = useRef(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isAtTop = useRef(true)

  // Trigger haptic feedback
  const triggerHaptic = useCallback((type = 'light') => {
    if (!hapticEnabled) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        success: [10, 50, 30]
      }
      navigator.vibrate(patterns[type] || patterns.light)
    }
  }, [hapticEnabled])

  // Check if content is at top
  const checkIsAtTop = useCallback(() => {
    if (!containerRef.current) return true
    return containerRef.current.scrollTop <= 0
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return

    isAtTop.current = checkIsAtTop()
    if (!isAtTop.current) return

    startY.current = e.touches[0].clientY
    currentY.current = startY.current
    setIsPulling(true)
  }, [disabled, isRefreshing, checkIsAtTop])

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (disabled || isRefreshing || !isPulling) return
    if (!isAtTop.current) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0) {
      // Pulling down
      e.preventDefault()

      // Apply resistance
      const pull = Math.min(diff / resistance, maxPull)
      setPullDistance(pull)

      // Haptic feedback at threshold
      if (pull >= threshold && pullDistance < threshold) {
        triggerHaptic('medium')
      }
    }
  }, [disabled, isRefreshing, isPulling, resistance, maxPull, threshold, pullDistance, triggerHaptic])

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling) return

    setIsPulling(false)

    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true)
      setPullDistance(60) // Hold at indicator position

      try {
        await onRefresh?.()
        triggerHaptic('success')
        setShowSuccess(true)

        // Show success state briefly
        setTimeout(() => {
          setShowSuccess(false)
          setIsRefreshing(false)
          setPullDistance(0)
        }, 1000)
      } catch (error) {
        console.error('Refresh failed:', error)
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Not enough pull, spring back
      setPullDistance(0)
    }
  }, [disabled, isRefreshing, isPulling, pullDistance, threshold, onRefresh, triggerHaptic])

  // Handle scroll to check if at top
  const handleScroll = useCallback(() => {
    isAtTop.current = checkIsAtTop()
  }, [checkIsAtTop])

  // Calculate indicator state
  const getIndicatorState = () => {
    if (showSuccess) return 'success'
    if (isRefreshing) return 'refreshing'
    if (pullDistance >= threshold) return 'release'
    if (pullDistance > 0) return 'pull'
    return 'idle'
  }

  const indicatorState = getIndicatorState()

  // Progress percentage (0-1)
  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden pointer-events-none z-10"
        style={{
          top: 0,
          height: pullDistance,
          transform: `translateY(${-60 + pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out, height 0.3s ease-out'
        }}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{
            opacity: Math.min(progress * 2, 1),
            transform: `scale(${0.5 + progress * 0.5})`,
            transition: isPulling ? 'none' : 'all 0.3s ease-out'
          }}
        >
          {/* Icon */}
          <div className="relative w-10 h-10 mb-2">
            {indicatorState === 'success' ? (
              <div className="w-full h-full rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-500" />
              </div>
            ) : indicatorState === 'refreshing' ? (
              <div className="w-full h-full rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-[var(--color-primary)] ptr-spinner" />
              </div>
            ) : (
              <div
                className="w-full h-full rounded-full bg-[#2A2A2A] flex items-center justify-center"
                style={{
                  transform: `rotate(${progress * 180}deg)`,
                  transition: isPulling ? 'none' : 'transform 0.3s ease-out'
                }}
              >
                <ArrowDown
                  className={`w-5 h-5 text-gray-400 ${
                    indicatorState === 'release' ? 'ptr-bounce' : ''
                  }`}
                />
              </div>
            )}
          </div>

          {/* Text */}
          <span className="text-xs font-medium text-gray-400">
            {indicatorState === 'success' && successText}
            {indicatorState === 'refreshing' && refreshingText}
            {indicatorState === 'release' && releaseText}
            {indicatorState === 'pull' && pullText}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * SimplePullToRefresh - Minimal version with just spinner
 */
export const SimplePullToRefresh = ({
  children,
  onRefresh,
  disabled = false,
  className = ''
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const containerRef = useRef(null)
  const startY = useRef(0)

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return
    if (containerRef.current?.scrollTop > 0) return
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    if (disabled || isRefreshing) return
    if (containerRef.current?.scrollTop > 0) return

    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      e.preventDefault()
      setPullProgress(Math.min(diff / 100, 1))
    }
  }

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing) return

    if (pullProgress >= 1) {
      setIsRefreshing(true)
      try {
        await onRefresh?.()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullProgress(0)
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Simple spinner indicator */}
      {(pullProgress > 0 || isRefreshing) && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
          style={{
            top: `${pullProgress * 50}px`,
            opacity: pullProgress,
            transition: 'top 0.2s ease-out'
          }}
        >
          <RefreshCw
            className={`w-6 h-6 text-[var(--color-primary)] ${
              isRefreshing ? 'ptr-spinner' : ''
            }`}
            style={{
              transform: `rotate(${pullProgress * 360}deg)`
            }}
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullProgress * 50}px)`,
          transition: 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * useRefreshControl - Hook for custom refresh implementations
 */
export const useRefreshControl = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5
}) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop <= 0) {
      startY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (isRefreshing) return
    if (containerRef.current?.scrollTop > 0) return

    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      e.preventDefault()
      setPullDistance(diff / resistance)
    }
  }, [isRefreshing, resistance])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh?.()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
  }, [pullDistance, threshold, onRefresh])

  const bindProps = {
    ref: containerRef,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }

  return {
    pullDistance,
    isRefreshing,
    progress: Math.min(pullDistance / threshold, 1),
    bindProps
  }
}

export default PullToRefresh
