import { useState, useEffect } from 'react'
import { Star, Scissors, Check, RefreshCw, Loader2, Sparkles, ChevronRight } from 'lucide-react'

/**
 * MatchResult - Display matched barbers with celebration
 * Shows top match prominently, with runner-ups below
 */
const MatchResult = ({ matchedBarbers, isLoading, onBook, onRetake }) => {
  const [showCelebration, setShowCelebration] = useState(true)
  const [expandedBarber, setExpandedBarber] = useState(null)

  // Hide celebration after animation
  useEffect(() => {
    if (matchedBarbers?.length > 0) {
      const timer = setTimeout(() => setShowCelebration(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [matchedBarbers])

  const topMatch = matchedBarbers?.[0]
  const runnerUps = matchedBarbers?.slice(1) || []

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/20 animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-[var(--color-primary)] animate-spin" />
        </div>
        <p className="text-white font-semibold mt-6">Finding your perfect match...</p>
        <p className="text-gray-500 text-sm mt-2">Analyzing your preferences</p>
      </div>
    )
  }

  // No matches found
  if (!matchedBarbers || matchedBarbers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <Scissors className="w-10 h-10 text-gray-600" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">No Matches Found</h3>
        <p className="text-gray-500 text-center text-sm mb-6">
          We couldn't find barbers matching your preferences. Try adjusting your criteria.
        </p>
        <button
          onClick={onRetake}
          className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retake Quiz
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <Sparkles className="w-16 h-16 text-[var(--color-primary)] mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white">It's a Match!</h2>
          </div>
          {/* Confetti particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-ping"
              style={{
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6'][i % 4],
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Top Match */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-3xl border border-[var(--color-primary)]/30 overflow-hidden">
          {/* Match badge */}
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] px-4 py-2 text-center">
            <span className="text-white font-bold text-sm">
              🎯 {topMatch.matchScore}% Match
            </span>
          </div>

          <div className="p-6">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <img
                  src={topMatch.avatar || '/img/avatar_default.jpg'}
                  alt={topMatch.barberName}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-[var(--color-primary)]/30"
                />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{topMatch.barberName}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span>{topMatch.rating.toFixed(1)}</span>
                  <span>•</span>
                  <span>{topMatch.totalBookings.toLocaleString()} cuts</span>
                </div>
              </div>
            </div>

            {/* Tagline */}
            {topMatch.tagline && (
              <p className="text-gray-400 text-sm italic mb-4">"{topMatch.tagline}"</p>
            )}

            {/* Match Reasons */}
            <div className="space-y-2 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Why you match:</p>
              {topMatch.matchReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                  <span className="text-sm text-gray-300">{reason}</span>
                </div>
              ))}
            </div>

            {/* Specialties */}
            {topMatch.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {topMatch.specialties.slice(0, 4).map((specialty, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}

            {/* Book Button */}
            <button
              onClick={() => onBook(topMatch)}
              className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Scissors className="w-5 h-5" />
              Book with {topMatch.barberName.split(' ')[0]}
            </button>
          </div>
        </div>
      </div>

      {/* Runner-ups */}
      {runnerUps.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Also great for you</p>
          <div className="space-y-3">
            {runnerUps.map((barber) => (
              <button
                key={barber.barberId}
                onClick={() => setExpandedBarber(expandedBarber === barber.barberId ? null : barber.barberId)}
                className="w-full bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={barber.avatar || '/img/avatar_default.jpg'}
                    alt={barber.barberName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-semibold">{barber.barberName}</h4>
                      <span className="text-[var(--color-primary)] font-bold text-sm">
                        {barber.matchScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span>{barber.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${expandedBarber === barber.barberId ? 'rotate-90' : ''}`} />
                </div>

                {/* Expanded content */}
                {expandedBarber === barber.barberId && (
                  <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                    {barber.matchReasons.slice(0, 2).map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                        <span className="text-sm text-gray-400">{reason}</span>
                      </div>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onBook(barber)
                      }}
                      className="w-full mt-3 py-3 bg-white/10 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                    >
                      <Scissors className="w-4 h-4" />
                      Book
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Retake option */}
      <div className="p-4 pb-safe">
        <button
          onClick={onRetake}
          className="w-full py-3 text-gray-500 text-sm hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retake Quiz
        </button>
      </div>
    </div>
  )
}

export default MatchResult
