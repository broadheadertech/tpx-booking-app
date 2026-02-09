import { MapPin, Calendar, Phone, Navigation, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Branch Hero Section — FB-style layout
 * Cover photo → Circular profile pic → Identity stack → Action buttons → Social proof bar
 */
const BranchHero = ({ branch, branding, stats }) => {
  const heroImage = branch?.cover_photo || branding?.hero_image_url || branding?.banner_url || null
  const logo = branch?.profile_photo || branding?.logo_dark_url || branding?.logo_light_url || null
  const primaryColor = branding?.primary_color || 'var(--color-primary)'

  // Format bookings count for display
  const formatCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count?.toString() || '0'
  }

  const handleCall = () => {
    if (branch.phone) window.location.href = `tel:${branch.phone}`
  }

  const handleNavigate = () => {
    if (branch.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`, '_blank')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: branding?.display_name || branch.name,
          text: `Check out ${branding?.display_name || branch.name}`,
          url: window.location.href,
        })
      } catch {}
    } else {
      navigator.clipboard?.writeText(window.location.href)
    }
  }

  return (
    <div className="relative">
      {/* Cover Photo */}
      <div className="h-44 md:h-56 lg:h-72 bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={branch.name}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}20 0%, #0D0D0D 100%)`
            }}
          />
        )}
        {/* Bottom gradient fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/30 to-transparent" />
      </div>

      {/* Profile + Identity + Actions */}
      <div className="max-w-3xl mx-auto px-4">
        {/* Profile Picture — circular, overlapping cover */}
        <div className="relative -mt-14 md:-mt-16 flex flex-col items-center">
          <div
            className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-[#1A1A1A] overflow-hidden shadow-xl"
            style={{
              boxShadow: `0 0 0 4px #0D0D0D, 0 0 0 6px ${primaryColor}40`
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt={branch.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {branch.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Identity Stack */}
          <div className="mt-3 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {branding?.display_name || branch.name}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-xs text-gray-400 font-medium">
                Barbershop
              </span>
              <span className="text-[#2A2A2A]">·</span>
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span>{branch.address}</span>
              </div>
            </div>
            {/* Open/Closed Status */}
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <div className={`w-2 h-2 rounded-full ${stats.is_open ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-medium ${stats.is_open ? 'text-green-400' : 'text-red-400'}`}>
                {stats.is_open ? 'Open Now' : 'Closed'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4 w-full max-w-sm">
            <Link
              to={`/guest/booking?branch=${branch._id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Calendar className="w-4 h-4" />
              Book Now
            </Link>
            <button
              onClick={handleCall}
              className="flex items-center justify-center w-10 h-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white hover:border-[var(--color-primary)] transition-colors"
              title="Call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={handleNavigate}
              className="flex items-center justify-center w-10 h-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white hover:border-[var(--color-primary)] transition-colors"
              title="Navigate"
            >
              <Navigation className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-10 h-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white hover:border-[var(--color-primary)] transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Social Proof Bar */}
          <div className="flex items-center justify-center gap-4 mt-4 pb-4 text-sm">
            {stats.bookings_count > 0 && (
              <span className="text-gray-400">
                <span className="text-white font-semibold">{formatCount(stats.bookings_count)}</span> bookings
              </span>
            )}
            {stats.bookings_count > 0 && stats.barbers_count > 0 && (
              <span className="text-[#2A2A2A]">·</span>
            )}
            <span className="text-gray-400">
              <span className="text-white font-semibold">{stats.barbers_count}</span> barbers
            </span>
            <span className="text-[#2A2A2A]">·</span>
            <span className="text-gray-400">
              <span className="text-white font-semibold">{stats.services_count}</span> services
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BranchHero
