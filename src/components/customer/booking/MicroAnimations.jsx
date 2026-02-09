import { useState, useEffect, useRef } from 'react'

/**
 * Phase 3: Premium Experience - Micro-Animations
 *
 * Subtle, delightful animations that enhance the user experience:
 * - AnimatedCard - Scale/bounce on tap
 * - FadeIn - Smooth fade entrance
 * - SlideIn - Slide from direction
 * - PopIn - Pop/scale entrance
 * - Stagger - Staggered children animation
 * - AnimatedCounter - Number count animation
 * - PulseOnChange - Pulse when value changes
 */

// Add animation keyframes
if (typeof document !== 'undefined') {
  const styleId = 'micro-animation-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeInLeft {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes fadeInRight {
        from { opacity: 0; transform: translateX(10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes popIn {
        0% { opacity: 0; transform: scale(0.8); }
        70% { transform: scale(1.05); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      @keyframes wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-3deg); }
        75% { transform: rotate(3deg); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.3); }
        50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
      }
      @keyframes slideInFromBottom {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes checkmark {
        0% { stroke-dashoffset: 100; }
        100% { stroke-dashoffset: 0; }
      }
    `
    document.head.appendChild(style)
  }
}

/**
 * AnimatedCard - Interactive card with press/hover animations
 */
export const AnimatedCard = ({
  children,
  onClick,
  disabled = false,
  scaleOnPress = 0.98,
  scaleOnHover = 1.02,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const scale = isPressed ? scaleOnPress : isHovered ? scaleOnHover : 1

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => { setIsPressed(false); setIsHovered(false) }}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onTouchStart={() => !disabled && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`transition-all duration-200 ease-out ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      {children}
    </div>
  )
}

/**
 * FadeIn - Fade entrance animation
 */
export const FadeIn = ({
  children,
  delay = 0,
  duration = 300,
  direction = 'up', // 'up' | 'down' | 'left' | 'right' | 'none'
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const animationMap = {
    up: 'fadeInUp',
    down: 'fadeInDown',
    left: 'fadeInLeft',
    right: 'fadeInRight',
    none: 'fadeIn'
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        animation: isVisible ? `${animationMap[direction]} ${duration}ms ease-out forwards` : 'none'
      }}
    >
      {children}
    </div>
  )
}

/**
 * PopIn - Pop/scale entrance animation
 */
export const PopIn = ({
  children,
  delay = 0,
  duration = 400,
  bounce = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        animation: isVisible ? `${bounce ? 'bounceIn' : 'popIn'} ${duration}ms ease-out forwards` : 'none'
      }}
    >
      {children}
    </div>
  )
}

/**
 * Stagger - Staggered animation for list items
 */
export const Stagger = ({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  animation = 'fadeInUp', // 'fadeInUp' | 'fadeInLeft' | 'popIn'
  duration = 300,
  className = ''
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const childArray = Array.isArray(children) ? children : [children]

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <div
          key={index}
          style={{
            opacity: mounted ? 1 : 0,
            animation: mounted
              ? `${animation} ${duration}ms ease-out ${initialDelay + index * staggerDelay}ms forwards`
              : 'none',
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

/**
 * AnimatedCounter - Animated number counter
 */
export const AnimatedCounter = ({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const previousValue = useRef(0)

  useEffect(() => {
    const startValue = previousValue.current
    const endValue = value
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      const currentValue = startValue + (endValue - startValue) * easeProgress
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        previousValue.current = endValue
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  )
}

/**
 * PulseOnChange - Pulse animation when value changes
 */
export const PulseOnChange = ({
  children,
  value, // Watch this value for changes
  duration = 300,
  scale = 1.1,
  className = ''
}) => {
  const [isPulsing, setIsPulsing] = useState(false)
  const previousValue = useRef(value)

  useEffect(() => {
    if (previousValue.current !== value) {
      setIsPulsing(true)
      const timer = setTimeout(() => setIsPulsing(false), duration)
      previousValue.current = value
      return () => clearTimeout(timer)
    }
  }, [value, duration])

  return (
    <div
      className={`transition-transform ${className}`}
      style={{
        transform: isPulsing ? `scale(${scale})` : 'scale(1)',
        transitionDuration: `${duration / 2}ms`
      }}
    >
      {children}
    </div>
  )
}

/**
 * FloatingAnimation - Subtle floating effect
 */
export const FloatingAnimation = ({
  children,
  duration = 3000,
  className = ''
}) => {
  return (
    <div
      className={className}
      style={{
        animation: `float ${duration}ms ease-in-out infinite`
      }}
    >
      {children}
    </div>
  )
}

/**
 * GlowEffect - Glowing animation (for selected/active states)
 */
export const GlowEffect = ({
  children,
  active = true,
  color = 'rgba(139, 92, 246, 0.5)',
  className = ''
}) => {
  return (
    <div
      className={className}
      style={{
        animation: active ? 'glow 2s ease-in-out infinite' : 'none',
        '--glow-color': color
      }}
    >
      {children}
    </div>
  )
}

/**
 * ShakeOnError - Shake animation for error states
 */
export const ShakeOnError = ({
  children,
  error = false,
  duration = 400,
  className = ''
}) => {
  const [isShaking, setIsShaking] = useState(false)

  useEffect(() => {
    if (error) {
      setIsShaking(true)
      const timer = setTimeout(() => setIsShaking(false), duration)
      return () => clearTimeout(timer)
    }
  }, [error, duration])

  return (
    <div
      className={className}
      style={{
        animation: isShaking ? `shake ${duration}ms ease-in-out` : 'none'
      }}
    >
      {children}
    </div>
  )
}

/**
 * SlideInPanel - Slide-in panel from bottom (for modals/sheets)
 */
export const SlideInPanel = ({
  children,
  isOpen,
  onClose,
  className = ''
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
    }
  }, [isOpen])

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false)
    }
  }

  if (!shouldRender) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}
        style={{
          animation: isOpen
            ? 'slideInFromBottom 300ms ease-out forwards'
            : 'slideInFromBottom 300ms ease-out reverse forwards'
        }}
        onAnimationEnd={handleAnimationEnd}
      >
        {children}
      </div>
    </>
  )
}

/**
 * AnimatedCheckmark - Animated checkmark SVG
 */
export const AnimatedCheckmark = ({
  size = 24,
  color = '#22C55E',
  strokeWidth = 3,
  delay = 0,
  className = ''
}) => {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M5 13l4 4L19 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 100,
          strokeDashoffset: animate ? 0 : 100,
          transition: 'stroke-dashoffset 0.5s ease-out'
        }}
      />
    </svg>
  )
}

/**
 * useInView - Hook to detect when element is in viewport
 */
export const useInView = (options = {}) => {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (options.once !== false) {
            observer.disconnect()
          }
        } else if (options.once === false) {
          setIsInView(false)
        }
      },
      { threshold: options.threshold || 0.1, ...options }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [options.once, options.threshold])

  return [ref, isInView]
}

export default {
  AnimatedCard,
  FadeIn,
  PopIn,
  Stagger,
  AnimatedCounter,
  PulseOnChange,
  FloatingAnimation,
  GlowEffect,
  ShakeOnError,
  SlideInPanel,
  AnimatedCheckmark,
  useInView
}
