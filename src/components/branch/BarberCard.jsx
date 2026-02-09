import { Link } from 'react-router-dom'
import { Calendar, Clock, Star } from 'lucide-react'

/**
 * Barber Card Component
 * Displays barber info with booking CTA
 */
const BarberCard = ({ barber, branchId, compact = false }) => {
  const barberName = barber?.name || 'Unknown'
  const initials = barberName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'BB'

  // Create slug from barber name for profile link
  const barberSlug = barberName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  if (compact) {
    // Compact version for overview grid
    return (
      <Link
        to={`/barbers/${barberSlug}`}
        className="block bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] hover:border-[var(--color-primary)] transition-all group"
      >
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden mb-3 ring-2 ring-[#2A2A2A] group-hover:ring-[var(--color-primary)] transition-all">
            {barber.avatar ? (
              <img
                src={barber.avatar}
                alt={barberName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] font-semibold">
                {initials}
              </div>
            )}
          </div>

          {/* Name */}
          <h3 className="text-white font-medium text-sm truncate w-full">
            {barberName}
          </h3>

          {/* Specialties */}
          {barber.specialties && barber.specialties.length > 0 && (
            <p className="text-gray-500 text-xs truncate w-full mt-1">
              {barber.specialties[0]}
            </p>
          )}
        </div>
      </Link>
    )
  }

  // Full version
  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden hover:border-[var(--color-primary)]/40 transition-all">
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Link to={`/barbers/${barberSlug}`} className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-[#2A2A2A] hover:ring-[var(--color-primary)] transition-all">
              {barber.avatar ? (
                <img
                  src={barber.avatar}
                  alt={barberName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] text-lg font-semibold">
                  {initials}
                </div>
              )}
            </div>
          </Link>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link to={`/barbers/${barberSlug}`}>
              <h3 className="text-white font-semibold text-base hover:text-[var(--color-primary)] transition-colors">
                {barberName}
              </h3>
            </Link>

            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
              {/* Rating */}
              {barber.rating != null && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                  <span className="text-white text-xs font-medium">{barber.rating}</span>
                </div>
              )}

              {/* Experience */}
              {barber.experience && (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>{barber.experience}</span>
                </div>
              )}

              {/* Bookings */}
              {barber.totalBookings > 0 && (
                <span className="text-gray-500 text-xs">{barber.totalBookings} bookings</span>
              )}
            </div>

            {/* Specialties */}
            {barber.specialties && barber.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {barber.specialties.slice(0, 3).map((specialty, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[11px] rounded-full"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Book Button */}
        <Link
          to={`/guest/booking?branch=${branchId}&barber=${barber._id}`}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Calendar className="w-4 h-4" />
          Book with {barberName.split(' ')[0]}
        </Link>
      </div>
    </div>
  )
}

export default BarberCard
