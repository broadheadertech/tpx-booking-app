import { Link } from 'react-router-dom'
import { Clock, Calendar } from 'lucide-react'

/**
 * Service Card Component
 * Displays service info with price and booking CTA
 */
const ServiceCard = ({ service, branchId }) => {
  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return null
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333] hover:border-[var(--color-primary)]/50 transition-all group">
      <div className="flex items-start justify-between gap-4">
        {/* Service Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium mb-1 group-hover:text-[var(--color-primary)] transition-colors">
            {service.name}
          </h3>

          {service.description && (
            <p className="text-gray-500 text-sm line-clamp-2 mb-2">
              {service.description}
            </p>
          )}

          {/* Duration */}
          {service.duration && (
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(service.duration)}</span>
            </div>
          )}
        </div>

        {/* Price and Book */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-[var(--color-primary)] font-bold text-lg">
            {formatPrice(service.price)}
          </span>

          <Link
            to={`/guest/booking?branch=${branchId}&service=${service._id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-sm font-medium hover:bg-[var(--color-primary)] hover:text-white transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            Book
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ServiceCard
