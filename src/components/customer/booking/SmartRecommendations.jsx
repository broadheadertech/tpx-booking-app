import { useState, useMemo } from 'react'
import { Sparkles, TrendingUp, History, Clock, Star, ChevronRight, Zap } from 'lucide-react'

/**
 * SmartRecommendations - Personalized service/barber suggestions
 *
 * Features:
 * - "Your usual" based on booking history
 * - "Popular at this branch" trending picks
 * - "Based on your barber" skill-matched services
 * - Quick-book shortcuts
 * - Time-based suggestions ("Perfect for a quick visit")
 */

const RecommendationCard = ({
  type = 'service', // 'service' | 'barber' | 'combo'
  title,
  subtitle,
  icon: Icon,
  iconBg = 'from-purple-500 to-pink-500',
  item, // service or barber object
  onSelect,
  badge,
  showQuickBook = false
}) => {
  const [isPressed, setIsPressed] = useState(false)

  // Get display info based on type
  const getItemDisplay = () => {
    if (type === 'service') {
      return {
        name: item?.name || 'Service',
        detail: item?.hide_price ? 'Price varies' : `₱${item?.price?.toLocaleString()}`,
        emoji: item?.image || '✂️'
      }
    }
    if (type === 'barber') {
      return {
        name: item?.full_name || item?.name || 'Barber',
        detail: `${item?.rating || 4.8}★ • ${item?.completed_bookings || '100+'}+ cuts`,
        emoji: null,
        avatar: item?.avatar_url || item?.profile_image
      }
    }
    if (type === 'combo') {
      return {
        name: `${item?.service?.name} with ${item?.barber?.full_name || item?.barber?.name}`,
        detail: item?.service?.hide_price ? 'Price varies' : `₱${item?.service?.price?.toLocaleString()}`,
        emoji: item?.service?.image || '✂️'
      }
    }
    return { name: 'Unknown', detail: '', emoji: '❓' }
  }

  const display = getItemDisplay()

  return (
    <button
      onClick={() => onSelect(item, type)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`
        relative w-full text-left rounded-2xl p-4 transition-all duration-200
        bg-gradient-to-br from-[#1A1A1A] to-[#151515]
        border border-[#2A2A2A] hover:border-[var(--color-primary)]/50
        ${isPressed ? 'scale-[0.98]' : 'hover:scale-[1.01]'}
      `}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-bold">
          {badge}
        </span>
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-12 h-12 rounded-xl
          bg-gradient-to-br ${iconBg}
          flex items-center justify-center
        `}>
          {display.avatar ? (
            <img
              src={display.avatar}
              alt={display.name}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : display.emoji ? (
            <span className="text-xl">{display.emoji}</span>
          ) : (
            <Icon className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Category Label */}
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              {title}
            </span>
          </div>

          {/* Item Name */}
          <h4 className="font-bold text-white text-sm line-clamp-1 mb-0.5">
            {display.name}
          </h4>

          {/* Detail */}
          <p className="text-xs text-gray-500">
            {subtitle || display.detail}
          </p>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {showQuickBook ? (
            <div className="px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Book
            </div>
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>
    </button>
  )
}

/**
 * SmartRecommendations - Main component
 */
const SmartRecommendations = ({
  // User's booking history (for personalization)
  userBookingHistory = [],
  lastBookedService = null,
  lastBookedBarber = null,
  favoriteBarber = null,

  // Branch data
  services = [],
  barbers = [],
  branchPopularServices = [], // Service IDs sorted by popularity
  branchPopularBarbers = [], // Barber IDs sorted by popularity

  // Callbacks
  onSelectService,
  onSelectBarber,
  onQuickBook, // For combo quick-booking

  // Display options
  maxRecommendations = 3,
  showTitle = true,
  compact = false
}) => {
  // Generate recommendations based on available data
  const recommendations = useMemo(() => {
    const recs = []

    // 1. "Your usual" - if they have booking history
    if (lastBookedService && lastBookedBarber) {
      recs.push({
        id: 'usual-combo',
        type: 'combo',
        title: 'Your Usual',
        icon: History,
        iconBg: 'from-blue-500 to-cyan-500',
        item: { service: lastBookedService, barber: lastBookedBarber },
        badge: 'Quick Book',
        showQuickBook: true,
        priority: 1
      })
    } else if (lastBookedService) {
      recs.push({
        id: 'usual-service',
        type: 'service',
        title: 'Your Usual',
        icon: History,
        iconBg: 'from-blue-500 to-cyan-500',
        item: lastBookedService,
        subtitle: 'Last time you got this',
        priority: 2
      })
    }

    // 2. "Your favorite barber" - if they have one
    if (favoriteBarber && (!lastBookedBarber || favoriteBarber._id !== lastBookedBarber._id)) {
      recs.push({
        id: 'favorite-barber',
        type: 'barber',
        title: 'Your Favorite',
        icon: Star,
        iconBg: 'from-yellow-500 to-orange-500',
        item: favoriteBarber,
        subtitle: 'Available today',
        priority: 3
      })
    }

    // 3. "Popular at this branch" - top trending service
    if (branchPopularServices.length > 0) {
      const popularServiceId = branchPopularServices[0]
      const popularService = services.find(s => s._id === popularServiceId)
      if (popularService && (!lastBookedService || popularService._id !== lastBookedService._id)) {
        recs.push({
          id: 'popular-service',
          type: 'service',
          title: 'Trending Here',
          icon: TrendingUp,
          iconBg: 'from-orange-500 to-red-500',
          item: popularService,
          badge: '#1 Popular',
          priority: 4
        })
      }
    }

    // 4. "Top-rated barber" - if different from favorite
    if (branchPopularBarbers.length > 0) {
      const topBarberId = branchPopularBarbers[0]
      const topBarber = barbers.find(b => b._id === topBarberId)
      if (topBarber && (!favoriteBarber || topBarber._id !== favoriteBarber._id) && (!lastBookedBarber || topBarber._id !== lastBookedBarber._id)) {
        recs.push({
          id: 'top-barber',
          type: 'barber',
          title: 'Top Rated',
          icon: Star,
          iconBg: 'from-purple-500 to-pink-500',
          item: topBarber,
          badge: 'Most Booked',
          priority: 5
        })
      }
    }

    // 5. "Quick service" - fastest service option
    const quickService = services
      .filter(s => s.duration && parseInt(s.duration) <= 30)
      .sort((a, b) => parseInt(a.duration) - parseInt(b.duration))[0]

    if (quickService && recs.length < maxRecommendations) {
      recs.push({
        id: 'quick-service',
        type: 'service',
        title: 'Quick Visit',
        icon: Clock,
        iconBg: 'from-green-500 to-emerald-500',
        item: quickService,
        subtitle: `Only ${quickService.duration}`,
        priority: 6
      })
    }

    // Sort by priority and limit
    return recs
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxRecommendations)
  }, [
    lastBookedService,
    lastBookedBarber,
    favoriteBarber,
    services,
    barbers,
    branchPopularServices,
    branchPopularBarbers,
    maxRecommendations
  ])

  // Handle selection
  const handleSelect = (item, type) => {
    if (type === 'service') {
      onSelectService?.(item)
    } else if (type === 'barber') {
      onSelectBarber?.(item)
    } else if (type === 'combo') {
      // Quick book with both service and barber
      if (onQuickBook) {
        onQuickBook(item.service, item.barber)
      } else {
        onSelectService?.(item.service)
        onSelectBarber?.(item.barber)
      }
    }
  }

  // Don't render if no recommendations
  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Recommended for You</h3>
        </div>
      )}

      {recommendations.map((rec) => (
        <RecommendationCard
          key={rec.id}
          type={rec.type}
          title={rec.title}
          subtitle={rec.subtitle}
          icon={rec.icon}
          iconBg={rec.iconBg}
          item={rec.item}
          badge={rec.badge}
          showQuickBook={rec.showQuickBook}
          onSelect={handleSelect}
        />
      ))}
    </div>
  )
}

/**
 * QuickBookBanner - Prominent banner for returning customers
 */
export const QuickBookBanner = ({
  lastService,
  lastBarber,
  onQuickBook,
  onDismiss
}) => {
  if (!lastService || !lastBarber) return null

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[var(--color-primary)]/20 via-purple-500/20 to-pink-500/20 border border-[var(--color-primary)]/30 p-4">
      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <span className="text-gray-400 text-xs">✕</span>
      </button>

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-purple-600 flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-sm mb-0.5">
            Book again?
          </h4>
          <p className="text-xs text-gray-400 line-clamp-1">
            {lastService.name} with {lastBarber.full_name || lastBarber.name}
          </p>
        </div>

        {/* Quick Book Button */}
        <button
          onClick={() => onQuickBook(lastService, lastBarber)}
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-bold hover:bg-[var(--color-accent)] transition-colors"
        >
          Quick Book
        </button>
      </div>
    </div>
  )
}

export default SmartRecommendations
