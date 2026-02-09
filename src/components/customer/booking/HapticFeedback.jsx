import { useCallback, useRef } from 'react'

/**
 * Phase 3: Premium Experience - Haptic Feedback
 *
 * Provides tactile feedback on mobile devices for better UX:
 * - useHaptic hook for triggering vibrations
 * - HapticButton component wrapper
 * - Different vibration patterns for different actions
 *
 * Gracefully degrades on unsupported devices
 */

/**
 * Vibration patterns for different feedback types
 * Values are in milliseconds
 */
const HAPTIC_PATTERNS = {
  // Light tap - selection, toggle
  light: [10],

  // Medium tap - button press, confirmation
  medium: [20],

  // Heavy tap - important action, submit
  heavy: [30],

  // Success - completion, achievement
  success: [10, 50, 30],

  // Error - invalid input, failure
  error: [50, 30, 50, 30, 50],

  // Warning - caution, attention needed
  warning: [30, 50, 30],

  // Selection change - picker, slider
  selection: [5],

  // Double tap - quick feedback
  double: [10, 30, 10],

  // Long press - context menu, drag start
  longPress: [50],

  // Notification - alert, message
  notification: [20, 100, 20],
}

/**
 * Check if vibration API is supported
 */
const isVibrationSupported = () => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

/**
 * Trigger a vibration pattern
 * @param {string|number[]} pattern - Pattern name or custom pattern array
 */
const vibrate = (pattern = 'medium') => {
  if (!isVibrationSupported()) return false

  try {
    const vibrationPattern = typeof pattern === 'string'
      ? HAPTIC_PATTERNS[pattern] || HAPTIC_PATTERNS.medium
      : pattern

    return navigator.vibrate(vibrationPattern)
  } catch (error) {
    console.warn('Haptic feedback failed:', error)
    return false
  }
}

/**
 * useHaptic - Hook for haptic feedback
 *
 * @returns {Object} Haptic feedback methods
 *
 * @example
 * const { trigger, light, medium, heavy, success, error } = useHaptic()
 *
 * // Trigger specific pattern
 * <button onClick={() => { handleSubmit(); success() }}>Submit</button>
 *
 * // Custom pattern
 * trigger([50, 100, 50])
 */
export const useHaptic = (enabled = true) => {
  const isEnabled = useRef(enabled)
  isEnabled.current = enabled

  const trigger = useCallback((pattern = 'medium') => {
    if (!isEnabled.current) return false
    return vibrate(pattern)
  }, [])

  return {
    // Core trigger function
    trigger,

    // Preset triggers
    light: useCallback(() => trigger('light'), [trigger]),
    medium: useCallback(() => trigger('medium'), [trigger]),
    heavy: useCallback(() => trigger('heavy'), [trigger]),
    success: useCallback(() => trigger('success'), [trigger]),
    error: useCallback(() => trigger('error'), [trigger]),
    warning: useCallback(() => trigger('warning'), [trigger]),
    selection: useCallback(() => trigger('selection'), [trigger]),
    notification: useCallback(() => trigger('notification'), [trigger]),

    // Check support
    isSupported: isVibrationSupported(),
  }
}

/**
 * HapticButton - Button wrapper with haptic feedback
 *
 * @example
 * <HapticButton
 *   hapticType="medium"
 *   onClick={handleClick}
 *   className="..."
 * >
 *   Click Me
 * </HapticButton>
 */
export const HapticButton = ({
  children,
  onClick,
  hapticType = 'medium',
  hapticEnabled = true,
  disabled = false,
  as: Component = 'button',
  ...props
}) => {
  const { trigger } = useHaptic(hapticEnabled)

  const handleClick = (e) => {
    if (disabled) return

    // Trigger haptic first for immediate feedback
    trigger(hapticType)

    // Then call the onClick handler
    onClick?.(e)
  }

  return (
    <Component
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </Component>
  )
}

/**
 * HapticTouchable - Touchable area with haptic on press
 * Good for cards, list items, etc.
 */
export const HapticTouchable = ({
  children,
  onPress,
  hapticType = 'light',
  hapticEnabled = true,
  disabled = false,
  className = '',
  ...props
}) => {
  const { trigger } = useHaptic(hapticEnabled)

  const handleTouchStart = () => {
    if (!disabled) {
      trigger(hapticType)
    }
  }

  const handleClick = (e) => {
    if (!disabled) {
      onPress?.(e)
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      className={`${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * HapticToggle - Toggle switch with haptic feedback
 */
export const HapticToggle = ({
  checked,
  onChange,
  hapticEnabled = true,
  disabled = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  className = ''
}) => {
  const { trigger } = useHaptic(hapticEnabled)

  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
  }

  const s = sizes[size] || sizes.md

  const handleToggle = () => {
    if (disabled) return
    trigger('selection')
    onChange?.(!checked)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleToggle}
      disabled={disabled}
      className={`
        relative inline-flex flex-shrink-0 ${s.track} rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-black
        ${checked ? 'bg-[var(--color-primary)]' : 'bg-[#3A3A3A]'}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `}
    >
      <span
        className={`
          ${s.thumb} rounded-full bg-white shadow-lg
          transform transition-transform duration-200 ease-in-out
          ${checked ? s.translate : 'translate-x-0.5'}
        `}
        style={{ marginTop: '0.125rem' }}
      />
    </button>
  )
}

/**
 * HapticSlider - Range slider with haptic feedback on value changes
 */
export const HapticSlider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  hapticEnabled = true,
  hapticOnStep = true, // Vibrate on each step
  disabled = false,
  className = ''
}) => {
  const { trigger } = useHaptic(hapticEnabled)
  const lastHapticValue = useRef(value)

  const handleChange = (e) => {
    const newValue = Number(e.target.value)

    // Trigger haptic on step changes
    if (hapticOnStep && Math.abs(newValue - lastHapticValue.current) >= step) {
      trigger('selection')
      lastHapticValue.current = newValue
    }

    onChange?.(newValue)
  }

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`
          w-full h-2 appearance-none rounded-full cursor-pointer
          bg-[#3A3A3A] outline-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${percentage}%, #3A3A3A ${percentage}%)`
        }}
      />
    </div>
  )
}

/**
 * withHaptic - HOC to add haptic feedback to any component
 *
 * @example
 * const HapticCard = withHaptic(Card, 'light')
 */
export const withHaptic = (Component, hapticType = 'medium') => {
  return function HapticWrapper({ onClick, hapticEnabled = true, ...props }) {
    const { trigger } = useHaptic(hapticEnabled)

    const handleClick = (e) => {
      trigger(hapticType)
      onClick?.(e)
    }

    return <Component onClick={handleClick} {...props} />
  }
}

/**
 * HapticFeedbackProvider - Context provider for global haptic settings
 * (Optional - for app-wide haptic enable/disable toggle)
 */
import { createContext, useContext, useState } from 'react'

const HapticContext = createContext({ enabled: true, setEnabled: () => {} })

export const HapticProvider = ({ children, defaultEnabled = true }) => {
  const [enabled, setEnabled] = useState(defaultEnabled)

  return (
    <HapticContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </HapticContext.Provider>
  )
}

export const useHapticContext = () => useContext(HapticContext)

export default {
  useHaptic,
  HapticButton,
  HapticTouchable,
  HapticToggle,
  HapticSlider,
  withHaptic,
  HapticProvider,
  useHapticContext,
  HAPTIC_PATTERNS,
  isVibrationSupported,
  vibrate
}
