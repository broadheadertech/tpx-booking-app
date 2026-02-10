import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import BranchHero from '../../components/branch/BranchHero'
import BarberCard from '../../components/branch/BarberCard'
import ServiceCard from '../../components/branch/ServiceCard'
import PostCard from '../../components/branch/PostCard'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  Scissors,
  Calendar,
  Instagram,
  Facebook,
  Globe,
  Loader2,
  AlertCircle,
  Video,
  Twitter,
  Youtube,
  FileText,
  Info,
  ArrowLeft,
  Home,
  ShoppingBag,
  Wallet,
  User,
  ChevronRight
} from 'lucide-react'

const TAB_ICONS = {
  posts: FileText,
  services: Scissors,
  barbers: Users,
  about: Info,
}

/**
 * Public Branch Profile Page — FB-style layout
 * Posts-first, no overview, no footer
 */
const NAV_SECTIONS = [
  { id: 'home', label: 'Home', icon: Home, path: '/customer/dashboard' },
  { id: 'booking', label: 'Book', icon: Scissors, path: '/customer/booking' },
  { id: 'wallet', label: 'Pay', icon: Wallet, path: '/customer/wallet' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, path: '/customer/shop' },
  { id: 'profile', label: 'Account', icon: User, path: '/customer/profile' },
]

const BranchProfile = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('posts')
  const [isNavHidden, setIsNavHidden] = useState(false)
  const lastScrollY = useRef(0)

  const profileData = useQuery(
    api.services.branchProfile.getBranchProfileSummary,
    { slug: slug || '' }
  )

  const barbers = useQuery(
    api.services.branchProfile.getBranchBarbers,
    profileData?.branch?._id ? { branchId: profileData.branch._id } : 'skip'
  )

  const servicesData = useQuery(
    api.services.branchProfile.getBranchServices,
    profileData?.branch?._id ? { branchId: profileData.branch._id } : 'skip'
  )

  const posts = useQuery(
    api.services.branchProfile.getBranchPosts,
    profileData?.branch?._id ? { branchId: profileData.branch._id, limit: 20 } : 'skip'
  )

  // Hide bottom nav on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current + 10) {
        setIsNavHidden(true)
      } else if (currentScrollY < lastScrollY.current - 10) {
        setIsNavHidden(false)
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // SEO meta tags
  useEffect(() => {
    if (!profileData?.branch) return

    const { branch, branding, stats } = profileData
    const displayName = branding?.display_name || branch.name
    const description = branch.description || `Book your appointment at ${displayName}. ${stats.barbers_count} barbers, ${stats.services_count} services available.`

    document.title = `${displayName} | Book Now`

    const updateMetaTag = (name, content, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
      let meta = document.querySelector(selector)
      if (!meta) {
        meta = document.createElement('meta')
        if (property) {
          meta.setAttribute('property', name)
        } else {
          meta.setAttribute('name', name)
        }
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', content)
    }

    updateMetaTag('description', description)
    updateMetaTag('og:title', displayName, true)
    updateMetaTag('og:description', description, true)
    updateMetaTag('og:type', 'business.business', true)
    updateMetaTag('og:url', window.location.href, true)
    const socialImage = branch.cover_photo || branch.profile_photo || branding?.logo_url
    if (socialImage) {
      updateMetaTag('og:image', socialImage, true)
    }
    updateMetaTag('twitter:card', 'summary')
    updateMetaTag('twitter:title', displayName)
    updateMetaTag('twitter:description', description)

    return () => {
      document.title = 'TPX Booking'
    }
  }, [profileData])

  // Loading state
  if (profileData === undefined) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
          <p className="text-gray-400">Loading branch profile...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (profileData === null) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <h1 className="text-2xl font-bold text-white">Branch Not Found</h1>
          <p className="text-gray-400">
            The branch you're looking for doesn't exist or is no longer active.
          </p>
          <Link
            to="/"
            className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const { branch, branding, stats } = profileData

  const formatHour = (hour) => {
    const h = hour % 12 || 12
    const ampm = hour < 12 ? 'AM' : 'PM'
    return `${h}:00 ${ampm}`
  }

  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'services', label: 'Services' },
    { id: 'barbers', label: 'Barbers' },
    { id: 'about', label: 'About' },
  ]

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Back Button */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 py-3">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = '/'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Hero Section */}
      <BranchHero
        branch={branch}
        branding={branding}
        stats={stats}
      />

      {/* Quick Actions */}
      <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
        <Link
          to={`/b/${slug}/walkin`}
          className="flex-1 flex items-center justify-between px-4 py-3 bg-[var(--color-primary)] rounded-xl hover:opacity-90 transition-opacity group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-medium">Walk In</p>
              <p className="text-white/60 text-xs">Join the queue</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/60" />
        </Link>

        <Link
          to={`/b/${slug}/queue`}
          className="flex items-center px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-[var(--color-primary)]/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-primary)]/15 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Live Queue</p>
              <p className="text-gray-500 text-xs">See who's waiting</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Tab Navigation — sticky */}
      <div className="sticky top-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-sm border-b border-[#1A1A1A]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-center gap-1 py-2">
            {tabs.map((tab) => {
              const Icon = TAB_ICONS[tab.id]
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 md:hidden" />}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Posts Tab — default */}
        {activeTab === 'posts' && (
          <div className="max-w-xl mx-auto">
            {posts && posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No posts yet. Check back soon!</p>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div>
            {servicesData?.categories && servicesData.categories.length > 0 ? (
              <div className="space-y-8">
                {servicesData.categories.map((category) => (
                  <div key={category}>
                    <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {servicesData.grouped[category].map((service) => (
                        <ServiceCard
                          key={service._id}
                          service={service}
                          branchId={branch._id}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No services available at this time.</p>
              </div>
            )}
          </div>
        )}

        {/* Barbers Tab */}
        {activeTab === 'barbers' && (
          <div>
            {barbers && barbers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {barbers.map((barber) => (
                  <BarberCard
                    key={barber._id}
                    barber={barber}
                    branchId={branch._id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No barbers available at this time.</p>
              </div>
            )}
          </div>
        )}

        {/* About Tab — replaces old Overview */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* Social Links — first */}
            {branch.social_links && Object.values(branch.social_links).some(Boolean) && (
              <div>
                <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Social</h3>
                <div className="flex flex-wrap gap-3">
                  {branch.social_links.facebook && (
                    <a
                      href={branch.social_links.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[var(--color-primary)] transition-colors group"
                    >
                      <Facebook className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-primary)]" />
                    </a>
                  )}
                  {branch.social_links.instagram && (
                    <a
                      href={branch.social_links.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[var(--color-primary)] transition-colors group"
                    >
                      <Instagram className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-primary)]" />
                    </a>
                  )}
                  {branch.social_links.tiktok && (
                    <a
                      href={branch.social_links.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[var(--color-primary)] transition-colors group"
                    >
                      <Video className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-primary)]" />
                    </a>
                  )}
                  {branch.social_links.twitter && (
                    <a
                      href={branch.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[var(--color-primary)] transition-colors group"
                    >
                      <Twitter className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-primary)]" />
                    </a>
                  )}
                  {branch.social_links.youtube && (
                    <a
                      href={branch.social_links.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[var(--color-primary)] transition-colors group"
                    >
                      <Youtube className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-primary)]" />
                    </a>
                  )}
                  {branch.social_links.website && (
                    <a
                      href={branch.social_links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[var(--color-primary)] transition-colors group"
                    >
                      <Globe className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-primary)]" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {branch.description && (
              <div className="bg-[#1A1A1A] rounded-xl p-5 border border-[#2A2A2A]">
                <p className="text-gray-300 leading-relaxed">{branch.description}</p>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Location */}
              <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-white font-medium text-sm mb-0.5">Location</h3>
                    <p className="text-gray-400 text-sm">{branch.address}</p>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-white font-medium text-sm mb-0.5">Hours</h3>
                    <p className="text-gray-400 text-sm">
                      {formatHour(branch.booking_start_hour)} - {formatHour(branch.booking_end_hour)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone */}
              {branch.phone && (
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-white font-medium text-sm mb-0.5">Phone</h3>
                      <a href={`tel:${branch.phone}`} className="text-gray-400 text-sm hover:text-[var(--color-primary)]">
                        {branch.phone}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Email */}
              {branch.email && (
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-white font-medium text-sm mb-0.5">Email</h3>
                      <a href={`mailto:${branch.email}`} className="text-gray-400 text-sm hover:text-[var(--color-primary)]">
                        {branch.email}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom transition-transform duration-300 ease-in-out ${isNavHidden ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-5 p-1 pb-2 md:p-2 md:pb-3">
            {NAV_SECTIONS.map((section) => {
              const IconComponent = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => navigate(section.path)}
                  className="flex flex-col items-center justify-center py-2 md:py-3 transition-colors text-gray-600 hover:text-gray-400"
                >
                  <IconComponent className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs mt-1 font-medium">{section.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BranchProfile
