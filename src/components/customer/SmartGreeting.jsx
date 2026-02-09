import React from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Scissors, Calendar, Clock } from 'lucide-react'

/**
 * SmartGreeting - Personalized greeting with context about last haircut
 * Shows days since last cut and upcoming appointments
 */
const SmartGreeting = ({ user, onBookNow }) => {
  // Get user's bookings to calculate days since last cut
  const bookings = useQuery(
    api.services.bookings.getBookingsByCustomer,
    user?._id ? { customerId: user._id } : 'skip'
  )

  // Calculate days since last completed haircut
  const getLastCutInfo = () => {
    if (!bookings || bookings.length === 0) {
      return { daysSince: null, hasUpcoming: false, upcomingBooking: null }
    }

    // Find last completed booking
    const completedBookings = bookings
      .filter(b => b.status === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    const lastCompleted = completedBookings[0]

    // Find upcoming bookings (today or future, not cancelled/completed)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingBookings = bookings
      .filter(b => {
        const bookingDate = new Date(b.date)
        bookingDate.setHours(0, 0, 0, 0)
        return bookingDate >= today &&
               b.status !== 'cancelled' &&
               b.status !== 'completed'
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    const upcomingBooking = upcomingBookings[0]

    // Calculate days since last cut
    let daysSince = null
    if (lastCompleted) {
      const lastDate = new Date(lastCompleted.date)
      const diffTime = Math.abs(new Date() - lastDate)
      daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    }

    return { daysSince, hasUpcoming: !!upcomingBooking, upcomingBooking }
  }

  const { daysSince, hasUpcoming, upcomingBooking } = getLastCutInfo()

  // Get time-based greeting
  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Format upcoming booking date
  const formatUpcomingDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    today.setHours(0, 0, 0, 0)
    tomorrow.setHours(0, 0, 0, 0)
    const bookingDate = new Date(date)
    bookingDate.setHours(0, 0, 0, 0)

    if (bookingDate.getTime() === today.getTime()) return 'Today'
    if (bookingDate.getTime() === tomorrow.getTime()) return 'Tomorrow'

    return date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Format time to friendly 12-hour format (e.g., "3:30 PM")
  const formatTime = (timeStr) => {
    if (!timeStr) return ''

    // Handle HH:MM format
    const [hours, minutes] = timeStr.split(':').map(Number)
    if (isNaN(hours)) return timeStr

    const period = hours >= 12 ? 'PM' : 'AM'
    const friendlyHour = hours % 12 || 12

    return `${friendlyHour}${minutes ? `:${minutes.toString().padStart(2, '0')}` : ''} ${period}`
  }

  // Generate contextual message with smart reminders
  const getContextMessage = () => {
    if (hasUpcoming && upcomingBooking) {
      const bookingDate = new Date(upcomingBooking.date)
      const today = new Date()

      // Check if booking is today
      const isToday = bookingDate.toDateString() === today.toDateString()

      if (isToday && upcomingBooking.time) {
        // Parse booking time
        const [hours, minutes] = upcomingBooking.time.split(':').map(Number)
        const bookingTime = new Date(today)
        bookingTime.setHours(hours, minutes, 0, 0)

        const diffMs = bookingTime - today
        const diffMins = Math.floor(diffMs / (1000 * 60))

        // Already passed
        if (diffMins < -30) {
          return `Your appointment was at ${formatTime(upcomingBooking.time)} - hope you made it! 🙏`
        }
        if (diffMins < 0) {
          return `Your appointment started ${Math.abs(diffMins)} mins ago - head over now!`
        }
        // Coming up very soon
        if (diffMins <= 15) {
          return `Starting in ${diffMins} mins - time to head over! 🏃`
        }
        if (diffMins <= 30) {
          return `In ${diffMins} minutes - get ready to go!`
        }
        if (diffMins <= 60) {
          return `Coming up in ${diffMins} mins at ${formatTime(upcomingBooking.time)}`
        }
        // Later today
        const hoursLeft = Math.floor(diffMins / 60)
        return `Today at ${formatTime(upcomingBooking.time)} - ${hoursLeft}h ${diffMins % 60}m to go`
      }

      // Tomorrow or later
      const dateStr = formatUpcomingDate(upcomingBooking.date)
      const time = formatTime(upcomingBooking.time)
      return `${dateStr}${time ? ` at ${time}` : ''} - see you then!`
    }

    if (daysSince !== null) {
      if (daysSince === 0) return "Fresh cut today! Looking sharp ✨"
      if (daysSince === 1) return "Yesterday's cut still looking fresh!"
      if (daysSince < 7) return `${daysSince} days since your last cut`
      if (daysSince < 14) return `${daysSince} days - still looking good!`
      if (daysSince < 21) return `${daysSince} days ago - time for a trim?`
      if (daysSince < 30) return `${daysSince} days - looking a bit grown out?`
      return `${daysSince} days - definitely time for a fresh cut!`
    }

    return "Ready for your first cut with us?"
  }

  // Get urgency level for styling
  const getUrgencyLevel = () => {
    if (hasUpcoming) return 'upcoming'
    if (daysSince === null) return 'new'
    if (daysSince < 14) return 'good'
    if (daysSince < 21) return 'reminder'
    return 'urgent'
  }

  const urgency = getUrgencyLevel()

  const urgencyStyles = {
    upcoming: 'text-green-400',
    new: 'text-[var(--color-primary)]',
    good: 'text-gray-400',
    reminder: 'text-yellow-400',
    urgent: 'text-orange-400'
  }

  const firstName = user?.first_name || user?.nickname || user?.username || 'there'

  return (
    <div className="bg-gradient-to-r from-[#1A1A1A] to-[#252525] rounded-2xl p-4 border border-[#2A2A2A]">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {/* Main Greeting */}
          <h1 className="text-lg font-bold text-white">
            {getTimeGreeting()}, {firstName}!
          </h1>

          {/* Context Message */}
          <div className={`flex items-center gap-2 text-sm ${urgencyStyles[urgency]}`}>
            {hasUpcoming ? (
              <Calendar className="w-4 h-4" />
            ) : daysSince !== null ? (
              <Scissors className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span>{getContextMessage()}</span>
          </div>
        </div>

        {/* Quick Book CTA */}
        {!hasUpcoming && onBookNow && (
          <button
            onClick={onBookNow}
            className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
          >
            <Scissors className="w-4 h-4" />
            Book
          </button>
        )}
      </div>
    </div>
  )
}

export default SmartGreeting
