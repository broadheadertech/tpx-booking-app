import { useState } from 'react'
import { Clock, Star, TrendingUp, Sparkles, ChevronRight } from 'lucide-react'

/**
 * ServiceCard - Modern visual service selection card
 *
 * Features:
 * - Visual image/emoji display
 * - Price and duration at a glance
 * - Popular/Recommended badges
 * - Smooth selection animation
 * - Description preview
 */
const ServiceCard = ({
  service,
  isSelected = false,
  onSelect,
  isPopular = false,
  isRecommended = false,
  availableBarbers = 0,
  disabled = false
}) => {
  const [isPressed, setIsPressed] = useState(false)

  // Get service emoji/icon based on category or name
  const getServiceEmoji = () => {
    if (service.image) return service.image
    const name = (service.name || '').toLowerCase()
    const category = (service.category || '').toLowerCase()

    if (name.includes('haircut') || category.includes('haircut')) return '✂️'
    if (name.includes('beard') || name.includes('shave')) return '🧔'
    if (name.includes('color') || name.includes('dye')) return '🎨'
    if (name.includes('wash') || name.includes('shampoo')) return '🧴'
    if (name.includes('style') || name.includes('styling')) return '💇'
    if (name.includes('trim')) return '✂️'
    if (name.includes('fade')) return '💈'
    if (name.includes('massage') || name.includes('spa')) return '💆'
    if (name.includes('facial')) return '🧖'
    if (name.includes('package') || name.includes('combo')) return '📦'
    if (name.includes('kid') || name.includes('child')) return '👦'
    if (name.includes('senior') || name.includes('elder')) return '👴'
    return '💈'
  }

  // Format price display
  const formatPrice = () => {
    if (service.hide_price) return 'Price varies'
    if (service.price === 0) return 'Free'
    return `₱${service.price?.toLocaleString()}`
  }

  return (
    <button
      onClick={() => !disabled && onSelect(service)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      disabled={disabled}
      className={`
        relative w-full text-left rounded-2xl p-4 transition-all duration-200
        ${isSelected
          ? 'bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/10 border-2 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20'
          : 'bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[var(--color-primary)]/50 hover:bg-[#1F1F1F]'
        }
        ${isPressed ? 'scale-[0.98]' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        {isPopular && (
          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Popular
          </span>
        )}
        {isRecommended && (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            For You
          </span>
        )}
      </div>

      <div className="flex gap-4">
        {/* Service Icon/Image */}
        <div className={`
          flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl
          ${isSelected
            ? 'bg-[var(--color-primary)]/20'
            : 'bg-[#2A2A2A]'
          }
        `}>
          {getServiceEmoji()}
        </div>

        {/* Service Details */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className={`font-bold text-base mb-1 pr-16 line-clamp-1 ${
            isSelected ? 'text-white' : 'text-gray-100'
          }`}>
            {service.name}
          </h3>

          {/* Description */}
          {service.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
              {service.description}
            </p>
          )}

          {/* Price & Duration Row */}
          <div className="flex items-center gap-3">
            {/* Price */}
            <span className={`font-bold ${
              isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-primary)]'
            }`}>
              {formatPrice()}
            </span>

            {/* Duration */}
            {service.duration && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {service.duration}
              </span>
            )}

            {/* Available Barbers */}
            {availableBarbers > 0 && (
              <span className="text-xs text-gray-500">
                {availableBarbers} {availableBarbers === 1 ? 'barber' : 'barbers'}
              </span>
            )}
          </div>
        </div>

        {/* Selection Indicator */}
        <div className={`
          flex-shrink-0 self-center w-6 h-6 rounded-full flex items-center justify-center
          transition-all duration-200
          ${isSelected
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[#2A2A2A] text-gray-600'
          }
        `}>
          {isSelected ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </div>
    </button>
  )
}

/**
 * ServiceCardGrid - Grid layout for service cards
 */
export const ServiceCardGrid = ({
  services = [],
  selectedService,
  onSelect,
  popularServices = [], // Array of service IDs that are popular
  recommendedServices = [], // Array of service IDs recommended for this user
  barbersByService = {}, // Map of serviceId -> available barber count
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1A1A1A] rounded-2xl p-4 animate-pulse">
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#2A2A2A]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#2A2A2A] rounded w-3/4" />
                <div className="h-3 bg-[#2A2A2A] rounded w-1/2" />
                <div className="h-3 bg-[#2A2A2A] rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">💈</div>
        <p className="text-gray-400">No services available</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {services.map((service) => (
        <ServiceCard
          key={service._id}
          service={service}
          isSelected={selectedService?._id === service._id}
          onSelect={onSelect}
          isPopular={popularServices.includes(service._id)}
          isRecommended={recommendedServices.includes(service._id)}
          availableBarbers={barbersByService[service._id] || 0}
        />
      ))}
    </div>
  )
}

/**
 * ServiceCategoryTabs - Horizontal scrollable category tabs
 */
export const ServiceCategoryTabs = ({
  categories = [],
  activeCategory,
  onCategoryChange,
  serviceCounts = {} // Map of category -> service count
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
      <button
        onClick={() => onCategoryChange(null)}
        className={`
          flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
          ${activeCategory === null
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A] hover:text-white'
          }
        `}
      >
        All Services
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`
            flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
            ${activeCategory === category
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A] hover:text-white'
            }
          `}
        >
          {category}
          {serviceCounts[category] > 0 && (
            <span className="ml-1.5 text-xs opacity-70">
              ({serviceCounts[category]})
            </span>
          )}
        </button>
      ))}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}

export default ServiceCard
