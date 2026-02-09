import { useState, useMemo } from 'react'
import { Clock, Flame, Zap } from 'lucide-react'

/**
 * TimeSlotPills - Modern tappable time slot selector
 *
 * Features:
 * - Pill-shaped time buttons
 * - Visual availability states
 * - "Popular" and "Your usual" badges
 * - Morning/Afternoon/Evening filters
 * - Smooth selection animation
 */
const TimeSlotPills = ({
  slots = [], // Array of { time: '09:00', available: true, popular?: boolean }
  selectedTime,
  onTimeSelect,
  userUsualTime = null, // User's typical booking time
  showFilters = true
}) => {
  const [activeFilter, setActiveFilter] = useState('all')

  // Format time for display (24h to 12h)
  const formatTimeDisplay = (time24) => {
    if (!time24) return ''
    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Categorize time into period
  const getTimePeriod = (time) => {
    const hour = parseInt(time.split(':')[0])
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    return 'evening'
  }

  // Filter slots based on active filter
  const filteredSlots = useMemo(() => {
    if (activeFilter === 'all') return slots
    return slots.filter(slot => getTimePeriod(slot.time) === activeFilter)
  }, [slots, activeFilter])

  // Count available slots per period
  const periodCounts = useMemo(() => {
    return {
      all: slots.filter(s => s.available).length,
      morning: slots.filter(s => s.available && getTimePeriod(s.time) === 'morning').length,
      afternoon: slots.filter(s => s.available && getTimePeriod(s.time) === 'afternoon').length,
      evening: slots.filter(s => s.available && getTimePeriod(s.time) === 'evening').length,
    }
  }, [slots])

  // Filter buttons
  const filters = [
    { id: 'all', label: 'All', icon: Clock },
    { id: 'morning', label: 'AM', icon: null },
    { id: 'afternoon', label: 'PM', icon: null },
    { id: 'evening', label: 'Eve', icon: null },
  ]

  // Handle time selection
  const handleTimeClick = (slot) => {
    if (!slot.available) return
    onTimeSelect(slot.time)
  }

  // Check if time is user's usual
  const isUsualTime = (time) => {
    return userUsualTime && time === userUsualTime
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No time slots available for this date</p>
        <p className="text-sm text-gray-500 mt-1">Try selecting a different date</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Period Filters */}
      {showFilters && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {filters.map((filter) => {
            const count = periodCounts[filter.id]
            const isActive = activeFilter === filter.id
            const FilterIcon = filter.icon

            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full
                  text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
                  }
                `}
              >
                {FilterIcon && <FilterIcon className="w-4 h-4" />}
                <span>{filter.label}</span>
                <span className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                  ({count})
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* User's Usual Time Suggestion */}
      {userUsualTime && slots.some(s => s.time === userUsualTime && s.available) && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Your usual time</span>
          </div>
          <button
            onClick={() => onTimeSelect(userUsualTime)}
            className={`
              w-full py-3 px-4 rounded-xl font-medium transition-all duration-200
              flex items-center justify-center gap-2
              ${selectedTime === userUsualTime
                ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }
            `}
          >
            <Clock className="w-4 h-4" />
            {formatTimeDisplay(userUsualTime)}
          </button>
        </div>
      )}

      {/* Time Slots Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {filteredSlots.map((slot) => {
          const isSelected = selectedTime === slot.time
          const isAvailable = slot.available
          const isPopular = slot.popular
          const isUsual = isUsualTime(slot.time)

          return (
            <button
              key={slot.time}
              onClick={() => handleTimeClick(slot)}
              disabled={!isAvailable}
              className={`
                relative py-3 px-2 rounded-xl font-medium text-sm
                transition-all duration-200
                ${isSelected
                  ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg scale-105'
                  : isAvailable
                    ? 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] hover:scale-102 active:scale-98 border border-transparent hover:border-[var(--color-primary)]/30'
                    : 'bg-[#0A0A0A] text-gray-600 cursor-not-allowed line-through'
                }
              `}
            >
              {/* Popular Badge */}
              {isPopular && isAvailable && !isSelected && (
                <div className="absolute -top-1 -right-1 flex items-center justify-center">
                  <span className="flex items-center gap-0.5 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                    <Flame className="w-2.5 h-2.5" />
                  </span>
                </div>
              )}

              {/* Time Display */}
              <span className={isSelected ? 'text-white' : ''}>
                {formatTimeDisplay(slot.time)}
              </span>

              {/* Selected Checkmark */}
              {isSelected && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                  <div className="w-1 h-1 rounded-full bg-white/60" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* No slots in filter */}
      {filteredSlots.length === 0 && (
        <div className="text-center py-6">
          <p className="text-gray-400">No slots available in this time period</p>
          <button
            onClick={() => setActiveFilter('all')}
            className="text-[var(--color-primary)] text-sm mt-2 hover:underline"
          >
            Show all times
          </button>
        </div>
      )}

      {/* Style for hiding scrollbar */}
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

export default TimeSlotPills
