import { useState } from 'react'
import { Star, Clock, Award, Scissors, CheckCircle, Heart, MessageCircle, Calendar } from 'lucide-react'

/**
 * BarberCard - Enhanced barber selection card
 *
 * Features:
 * - Avatar with availability status
 * - Real/mock ratings with review count
 * - Specialty tags
 * - "Why choose me" teaser
 * - Booking popularity indicator
 * - Next available slot
 */
const BarberCard = ({
  barber,
  isSelected = false,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  showExtended = false, // Show more details
  disabled = false
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Get availability status
  const isAvailable = barber.is_accepting_bookings !== false

  // Mock data for demo - in production these would come from the barber object
  const rating = barber.rating || 4.8
  const reviewCount = barber.review_count || Math.floor(Math.random() * 200) + 50
  const completedBookings = barber.completed_bookings || Math.floor(Math.random() * 500) + 100
  const specialties = barber.specialties || getDefaultSpecialties(barber)
  const nextAvailable = barber.next_available || 'Today'
  const yearsExperience = barber.years_experience || Math.floor(Math.random() * 10) + 2

  // Generate default specialties based on barber name/services
  function getDefaultSpecialties(barber) {
    const defaultTags = ['Fades', 'Classic Cuts', 'Beard Trim', 'Hot Towel', 'Kids Cuts', 'Senior Cuts']
    // Pick 2-3 random specialties
    const shuffled = defaultTags.sort(() => 0.5 - Math.random())
    return shuffled.slice(0, Math.floor(Math.random() * 2) + 2)
  }

  // Get initials for fallback avatar
  const getInitials = () => {
    const name = barber.full_name || barber.name || ''
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Get avatar URL
  const getAvatarUrl = () => {
    if (barber.avatar_url) return barber.avatar_url
    if (barber.profile_image) return barber.profile_image
    return null
  }

  return (
    <button
      onClick={() => !disabled && isAvailable && onSelect(barber)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      disabled={disabled || !isAvailable}
      className={`
        relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200
        ${isSelected
          ? 'bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/10 border-2 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20'
          : !isAvailable
            ? 'bg-[#1A1A1A] border border-[#2A2A2A] opacity-60'
            : 'bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[var(--color-primary)]/50 hover:bg-[#1F1F1F]'
        }
        ${isPressed && isAvailable ? 'scale-[0.98]' : ''}
        ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Favorite Button */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(barber._id)
          }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white/70'}`} />
        </button>
      )}

      {/* Selected Checkmark */}
      {isSelected && (
        <div className="absolute top-3 left-3 z-10 w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Unavailable Overlay */}
      {!isAvailable && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-red-500/90 text-white text-sm px-4 py-2 rounded-full font-semibold shadow-lg">
            Currently Unavailable
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`
              w-16 h-16 rounded-2xl overflow-hidden
              ${isSelected ? 'ring-2 ring-[var(--color-primary)]' : 'ring-2 ring-[#2A2A2A]'}
              transition-all duration-200
            `}>
              {getAvatarUrl() && !imageError ? (
                <img
                  src={getAvatarUrl()}
                  alt={barber.full_name || barber.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{getInitials()}</span>
                </div>
              )}
            </div>

            {/* Online Status Indicator */}
            {isAvailable && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1A1A1A]" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="font-bold text-white text-base mb-1 line-clamp-1">
              {barber.full_name || barber.name}
            </h3>

            {/* Rating & Reviews */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                <span className="text-sm font-semibold text-white">{rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-gray-500">({reviewCount} reviews)</span>
              <span className="text-gray-600">•</span>
              <span className="text-xs text-gray-500">{completedBookings}+ cuts</span>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1.5">
              {specialties.slice(0, 3).map((specialty, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 rounded-full bg-[#2A2A2A] text-[10px] font-medium text-gray-400"
                >
                  {specialty}
                </span>
              ))}
              {specialties.length > 3 && (
                <span className="px-2 py-0.5 rounded-full bg-[#2A2A2A] text-[10px] font-medium text-gray-500">
                  +{specialties.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Extended Info */}
        {showExtended && (
          <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
            {/* Experience & Next Available */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Award className="w-3.5 h-3.5" />
                <span>{yearsExperience}+ years experience</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Next: {nextAvailable}</span>
              </div>
            </div>

            {/* Why Choose Me */}
            {barber.bio && (
              <p className="text-xs text-gray-500 line-clamp-2 italic">
                "{barber.bio}"
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

/**
 * BarberCardCompact - Smaller version for grid layouts
 */
export const BarberCardCompact = ({
  barber,
  isSelected = false,
  onSelect,
  disabled = false
}) => {
  const [imageError, setImageError] = useState(false)
  const isAvailable = barber.is_accepting_bookings !== false
  const rating = barber.rating || 4.8

  const getInitials = () => {
    const name = barber.full_name || barber.name || ''
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAvatarUrl = () => {
    if (barber.avatar_url) return barber.avatar_url
    if (barber.profile_image) return barber.profile_image
    return null
  }

  return (
    <button
      onClick={() => !disabled && isAvailable && onSelect(barber)}
      disabled={disabled || !isAvailable}
      className={`
        relative rounded-2xl p-3 transition-all duration-200 flex flex-col items-center text-center
        ${isSelected
          ? 'bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/10 border-2 border-[var(--color-primary)]'
          : !isAvailable
            ? 'bg-[#1A1A1A] border border-[#2A2A2A] opacity-60'
            : 'bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[var(--color-primary)]/50'
        }
        ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
          <CheckCircle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Avatar */}
      <div className="relative mb-2">
        <div className={`
          w-14 h-14 rounded-full overflow-hidden
          ${isSelected ? 'ring-2 ring-[var(--color-primary)]' : 'ring-2 ring-[#2A2A2A]'}
          ${!isAvailable ? 'grayscale' : ''}
        `}>
          {getAvatarUrl() && !imageError ? (
            <img
              src={getAvatarUrl()}
              alt={barber.full_name || barber.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">{getInitials()}</span>
            </div>
          )}
        </div>

        {/* Status */}
        {isAvailable ? (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#1A1A1A]" />
        ) : (
          <div className="absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 bg-red-500 rounded-full border-2 border-[#1A1A1A]">
            <span className="text-[8px] font-bold text-white">BUSY</span>
          </div>
        )}
      </div>

      {/* Name */}
      <h4 className="font-bold text-sm text-white mb-0.5 line-clamp-1 w-full">
        {barber.full_name || barber.name}
      </h4>

      {/* Rating */}
      <div className="flex items-center justify-center gap-1">
        <Star className="w-3 h-3 text-yellow-400 fill-current" />
        <span className="text-xs font-medium text-gray-300">{rating.toFixed(1)}</span>
      </div>
    </button>
  )
}

/**
 * BarberCardGrid - Grid layout for barber cards
 */
export const BarberCardGrid = ({
  barbers = [],
  selectedBarber,
  onSelect,
  favoriteBarbers = [],
  onToggleFavorite,
  compact = false,
  columns = 2, // 2 or 3
  loading = false
}) => {
  if (loading) {
    return (
      <div className={`grid gap-3 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#1A1A1A] rounded-2xl p-4 animate-pulse">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-[#2A2A2A] mb-2" />
              <div className="h-4 bg-[#2A2A2A] rounded w-20 mb-1" />
              <div className="h-3 bg-[#2A2A2A] rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (barbers.length === 0) {
    return (
      <div className="text-center py-12">
        <Scissors className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
        <p className="text-gray-400">No barbers available</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={`grid gap-3 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {barbers.map((barber) => (
          <BarberCardCompact
            key={barber._id}
            barber={barber}
            isSelected={selectedBarber?._id === barber._id}
            onSelect={onSelect}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {barbers.map((barber) => (
        <BarberCard
          key={barber._id}
          barber={barber}
          isSelected={selectedBarber?._id === barber._id}
          onSelect={onSelect}
          isFavorite={favoriteBarbers.includes(barber._id)}
          onToggleFavorite={onToggleFavorite}
          showExtended={true}
        />
      ))}
    </div>
  )
}

export default BarberCard
