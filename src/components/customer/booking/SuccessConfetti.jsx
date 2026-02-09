import { useEffect, useState } from 'react'
import { Check, Calendar, Sparkles } from 'lucide-react'

/**
 * SuccessConfetti - Celebration animation for booking confirmation
 *
 * Features:
 * - Confetti particle animation
 * - Animated checkmark
 * - Points earned animation
 * - Smooth entrance transitions
 */

// Confetti particle component
const ConfettiParticle = ({ delay, color, size, left, duration }) => {
  return (
    <div
      className="absolute animate-confetti-fall pointer-events-none"
      style={{
        left: `${left}%`,
        top: '-10px',
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    >
      <div
        className="rounded-sm animate-confetti-spin"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          animationDuration: `${duration * 0.8}ms`,
        }}
      />
    </div>
  )
}

// Generate confetti particles
const generateConfetti = (count = 50) => {
  const colors = [
    'var(--color-primary)',
    'var(--color-accent)',
    '#FFD700', // Gold
    '#FF6B6B', // Coral
    '#4ECDC4', // Teal
    '#A855F7', // Purple
    '#F97316', // Orange
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: `${Math.random() * 8 + 4}px`,
    left: Math.random() * 100,
    delay: Math.random() * 500,
    duration: Math.random() * 2000 + 2000,
  }))
}

const SuccessConfetti = ({
  show = true,
  title = "You're all set!",
  subtitle = "Your booking has been confirmed",
  pointsEarned = 0,
  onComplete,
  children
}) => {
  const [confetti, setConfetti] = useState([])
  const [showCheck, setShowCheck] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [showPoints, setShowPoints] = useState(false)

  useEffect(() => {
    if (show) {
      // Generate confetti
      setConfetti(generateConfetti(60))

      // Animation sequence
      setTimeout(() => setShowCheck(true), 200)
      setTimeout(() => setShowContent(true), 600)
      setTimeout(() => setShowPoints(true), 1000)

      // Callback after animations
      if (onComplete) {
        setTimeout(onComplete, 2000)
      }
    }
  }, [show, onComplete])

  if (!show) return null

  return (
    <div className="relative w-full overflow-hidden">
      {/* Confetti Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((particle) => (
          <ConfettiParticle key={particle.id} {...particle} />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center py-8 px-4">
        {/* Animated Checkmark */}
        <div
          className={`
            relative mb-6 transition-all duration-500 ease-out
            ${showCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
          `}
        >
          {/* Outer Ring */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] p-1 animate-pulse-slow">
            <div className="w-full h-full rounded-full bg-[var(--color-bg)] flex items-center justify-center">
              {/* Inner Circle with Check */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/30">
                <Check
                  className={`
                    w-8 h-8 text-white transition-all duration-300 delay-300
                    ${showCheck ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
                  `}
                  strokeWidth={3}
                />
              </div>
            </div>
          </div>

          {/* Sparkle Effects */}
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-400 animate-bounce" />
          <Sparkles className="absolute -bottom-1 -left-3 w-5 h-5 text-[var(--color-primary)] animate-bounce delay-100" />
        </div>

        {/* Title */}
        <h2
          className={`
            text-2xl font-bold text-white mb-2 text-center
            transition-all duration-500 ease-out delay-200
            ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          {title}
        </h2>

        {/* Subtitle */}
        <p
          className={`
            text-gray-400 text-center mb-6
            transition-all duration-500 ease-out delay-300
            ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          {subtitle}
        </p>

        {/* Points Earned */}
        {pointsEarned > 0 && (
          <div
            className={`
              flex items-center gap-2 bg-amber-500/20 text-amber-400
              px-4 py-2 rounded-full font-semibold mb-6
              transition-all duration-500 ease-out
              ${showPoints ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-90'}
            `}
          >
            <Sparkles className="w-5 h-5" />
            <span>+{pointsEarned} points earned!</span>
          </div>
        )}

        {/* Children (booking details, buttons, etc.) */}
        <div
          className={`
            w-full transition-all duration-500 ease-out delay-500
            ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          {children}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes confetti-spin {
          0% {
            transform: rotateX(0) rotateY(0);
          }
          100% {
            transform: rotateX(360deg) rotateY(360deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }

        .animate-confetti-spin {
          animation: confetti-spin linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

/**
 * SuccessCheckmark - Standalone animated checkmark
 */
export const SuccessCheckmark = ({ size = 'default', show = true }) => {
  const sizes = {
    small: 'w-12 h-12',
    default: 'w-20 h-20',
    large: 'w-28 h-28'
  }

  const iconSizes = {
    small: 'w-6 h-6',
    default: 'w-10 h-10',
    large: 'w-14 h-14'
  }

  return (
    <div
      className={`
        ${sizes[size]} rounded-full
        bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]
        flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/30
        transition-all duration-500 ease-out
        ${show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
      `}
    >
      <Check
        className={`${iconSizes[size]} text-white`}
        strokeWidth={3}
      />
    </div>
  )
}

export default SuccessConfetti
