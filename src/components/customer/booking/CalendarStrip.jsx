import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

/**
 * CalendarStrip - Modern horizontal week picker with month selection
 *
 * Features:
 * - Month selector for booking up to 1 year ahead
 * - Horizontal scrolling week view
 * - Touch-friendly day selection
 * - Visual indicators for availability
 * - Smooth animations
 * - Auto-scroll to selected date
 */
const CalendarStrip = ({
  selectedDate,
  onDateSelect,
  availableDates = [], // Array of 'YYYY-MM-DD' strings
  blockedDates = [], // Array of 'YYYY-MM-DD' strings (barber day off / vacation)
  offDays = [], // Array of weekday numbers (0=Sun..6=Sat) where barber doesn't work
  minDate = null, // Minimum selectable date
  maxMonthsAhead = 12 // How many months ahead to allow
}) => {
  const scrollRef = useRef(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Initialize with selected date's month or current month
    if (selectedDate) {
      const [year, month] = selectedDate.split('-')
      return `${year}-${month}`
    }
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  // Generate list of months (current month + next 12 months)
  const availableMonths = useMemo(() => {
    const months = []
    const start = minDate ? new Date(minDate) : new Date()
    start.setDate(1) // Start from first of month

    for (let i = 0; i < maxMonthsAhead; i++) {
      const monthDate = new Date(start)
      monthDate.setMonth(start.getMonth() + i)
      months.push({
        key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        fullLabel: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        year: monthDate.getFullYear(),
        month: monthDate.getMonth()
      })
    }
    return months
  }, [minDate, maxMonthsAhead])

  // Generate dates for the selected month
  const dates = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const result = []

    // Get first and last day of the month
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)

    // Start from minDate if it's in this month, otherwise from first of month
    const minDateObj = minDate ? new Date(minDate) : new Date()
    minDateObj.setHours(0, 0, 0, 0)

    let startDate = firstDay
    if (minDateObj > firstDay && minDateObj.getMonth() === month - 1 && minDateObj.getFullYear() === year) {
      startDate = minDateObj
    }

    // Generate all dates from start to end of month
    for (let d = new Date(startDate); d <= lastDay; d.setDate(d.getDate() + 1)) {
      result.push(new Date(d))
    }

    return result
  }, [selectedMonth, minDate])

  // Format date to YYYY-MM-DD
  const formatDateKey = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Check if date is available
  const isDateAvailable = (date) => {
    if (availableDates.length === 0) return true
    return availableDates.includes(formatDateKey(date))
  }

  // Check if date is today
  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Check if date is selected
  const isSelected = (date) => {
    if (!selectedDate) return false
    return formatDateKey(date) === selectedDate
  }

  // Check if date is in past
  const isPast = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Get day name
  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  // Handle date selection
  const handleDateClick = (date) => {
    if (isPast(date) || !isDateAvailable(date)) return
    onDateSelect(formatDateKey(date))
  }

  // Handle month selection
  const handleMonthSelect = (monthKey) => {
    setSelectedMonth(monthKey)
    setShowMonthPicker(false)
    // Scroll to start when month changes
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  // Scroll to selected date on mount or when selected date changes
  useEffect(() => {
    if (selectedDate && scrollRef.current) {
      const selectedIndex = dates.findIndex(d => formatDateKey(d) === selectedDate)
      if (selectedIndex > 0) {
        const scrollPosition = selectedIndex * 56 - 100
        scrollRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' })
      }
    }
  }, [selectedDate, dates])

  // Update selected month when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const [year, month] = selectedDate.split('-')
      const newMonthKey = `${year}-${month}`
      if (newMonthKey !== selectedMonth) {
        setSelectedMonth(newMonthKey)
      }
    }
  }, [selectedDate])

  // Navigate to previous/next month
  const navigateMonth = (direction) => {
    const currentIndex = availableMonths.findIndex(m => m.key === selectedMonth)
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
    if (newIndex >= 0 && newIndex < availableMonths.length) {
      setSelectedMonth(availableMonths[newIndex].key)
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }
  }

  // Get current month info
  const currentMonthInfo = availableMonths.find(m => m.key === selectedMonth) || availableMonths[0]
  const currentMonthIndex = availableMonths.findIndex(m => m.key === selectedMonth)
  const canGoPrev = currentMonthIndex > 0
  const canGoNext = currentMonthIndex < availableMonths.length - 1

  return (
    <div className="w-full">
      {/* Month Selector Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => navigateMonth('prev')}
          disabled={!canGoPrev}
          className={`p-2 rounded-full transition-colors ${
            canGoPrev ? 'hover:bg-white/10 text-gray-400' : 'text-gray-700 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Month Dropdown Button */}
        <button
          onClick={() => setShowMonthPicker(!showMonthPicker)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-colors"
        >
          <span className="text-lg font-semibold text-white">
            {currentMonthInfo?.fullLabel}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => navigateMonth('next')}
          disabled={!canGoNext}
          className={`p-2 rounded-full transition-colors ${
            canGoNext ? 'hover:bg-white/10 text-gray-400' : 'text-gray-700 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month Picker Dropdown */}
      {showMonthPicker && (
        <div className="mb-4 p-2 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <div className="grid grid-cols-4 gap-2">
            {availableMonths.map((month) => {
              const isCurrentMonth = month.key === selectedMonth
              const isThisMonth = (() => {
                const now = new Date()
                return month.year === now.getFullYear() && month.month === now.getMonth()
              })()

              return (
                <button
                  key={month.key}
                  onClick={() => handleMonthSelect(month.key)}
                  className={`
                    py-2 px-1 rounded-lg text-sm font-medium transition-all duration-200
                    ${isCurrentMonth
                      ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                      : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A]'
                    }
                    ${isThisMonth && !isCurrentMonth ? 'ring-1 ring-[var(--color-primary)]/50' : ''}
                  `}
                >
                  <div className="text-xs text-gray-500">{month.year}</div>
                  <div>{month.label}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Month Pills (horizontal scroll) */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {availableMonths.slice(0, 6).map((month) => {
          const isCurrentMonth = month.key === selectedMonth
          const isThisMonth = (() => {
            const now = new Date()
            return month.year === now.getFullYear() && month.month === now.getMonth()
          })()

          return (
            <button
              key={month.key}
              onClick={() => handleMonthSelect(month.key)}
              className={`
                flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                ${isCurrentMonth
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A] hover:text-white'
                }
                ${isThisMonth && !isCurrentMonth ? 'ring-1 ring-[var(--color-primary)]/50' : ''}
              `}
            >
              {isThisMonth ? 'This Month' : month.label}
            </button>
          )
        })}
        {availableMonths.length > 6 && (
          <button
            onClick={() => setShowMonthPicker(true)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A] hover:text-white transition-colors"
          >
            More...
          </button>
        )}
      </div>

      {/* Date Strip */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {dates.length === 0 ? (
          <div className="w-full text-center py-6 text-gray-500">
            No available dates this month
          </div>
        ) : (
          dates.map((date) => {
            const dateKey = formatDateKey(date)
            const selected = isSelected(date)
            const today = isToday(date)
            const past = isPast(date)
            const available = isDateAvailable(date)
            const blocked = blockedDates.includes(dateKey)
            const offDay = offDays.includes(date.getDay())
            const disabled = past || !available

            return (
              <button
                key={dateKey}
                onClick={() => handleDateClick(date)}
                disabled={disabled}
                className={`
                  flex-shrink-0 w-[52px] py-3 rounded-2xl flex flex-col items-center justify-center
                  transition-all duration-200 scroll-snap-align-center
                  ${selected
                    ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg scale-105'
                    : disabled
                      ? 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed'
                      : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2A2A2A] hover:scale-102 active:scale-98'
                  }
                  ${today && !selected ? 'ring-2 ring-[var(--color-primary)]/50' : ''}
                `}
                style={{ scrollSnapAlign: 'center' }}
              >
                {/* Day Name */}
                <span className={`text-[10px] font-medium uppercase tracking-wide mb-1 ${
                  selected ? 'text-white/80' : disabled ? 'text-gray-600' : 'text-gray-500'
                }`}>
                  {getDayName(date)}
                </span>

                {/* Day Number */}
                <span className={`text-lg font-bold ${
                  selected ? 'text-white' : disabled ? 'text-gray-600' : 'text-white'
                }`}>
                  {date.getDate()}
                </span>

                {/* Today indicator */}
                {today && (
                  <span className={`text-[8px] font-bold uppercase mt-0.5 ${
                    selected ? 'text-white/80' : 'text-[var(--color-primary)]'
                  }`}>
                    Today
                  </span>
                )}

                {/* Blocked / vacation / off-day indicator */}
                {!today && (blocked || offDay) && !disabled && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    selected ? 'bg-white/60' : 'bg-amber-500'
                  }`} />
                )}

                {/* Availability dot */}
                {!today && !disabled && available && !blocked && !offDay && (
                  <div className={`w-1 h-1 rounded-full mt-1 ${
                    selected ? 'bg-white/60' : 'bg-green-500'
                  }`} />
                )}
              </button>
            )
          })
        )}
      </div>

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

export default CalendarStrip
