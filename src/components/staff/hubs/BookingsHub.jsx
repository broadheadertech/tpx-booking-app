import { useState, useEffect } from 'react'
import { Calendar, FileText, CalendarDays, UserPlus, ClipboardList } from 'lucide-react'
import BookingsManagement from '../BookingsManagement'
import CustomBookingsManagement from '../CustomBookingsManagement'
import CalendarManagement from '../CalendarManagement'
import WalkInSection from '../WalkInSection'
import QueueSection from '../QueueSection'

/**
 * Bookings Hub - Consolidated bookings management
 * Groups: Bookings, Custom Bookings, Calendar, Walk-ins, Queue
 */
// Map section id → page_access_v2 key (only where they differ)
const PERM_MAP = { custom: 'custom_bookings' }
// Sub-section keys (excluding the hub-level "bookings" key itself)
const SUB_KEYS = ['custom_bookings', 'calendar', 'walkins', 'queue']

const BookingsHub = ({ user, onRefresh, incompleteBookingsCount = 0, waitingWalkInsCount = 0 }) => {
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('staff_hub_bookings_section') || 'bookings')

  useEffect(() => {
    localStorage.setItem('staff_hub_bookings_section', activeSection)
  }, [activeSection])

  const allSections = [
    {
      id: 'bookings',
      label: 'Bookings',
      icon: Calendar,
      badge: incompleteBookingsCount > 0 ? incompleteBookingsCount : null,
      badgeColor: 'bg-orange-500'
    },
    { id: 'custom', label: 'Custom', icon: FileText },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    {
      id: 'walkins',
      label: 'Walk-ins',
      icon: UserPlus,
      badge: waitingWalkInsCount > 0 ? waitingWalkInsCount : null,
      badgeColor: waitingWalkInsCount > 7 ? 'bg-red-500' : waitingWalkInsCount > 3 ? 'bg-yellow-500' : 'bg-green-500'
    },
    { id: 'queue', label: 'Queue', icon: ClipboardList },
  ]

  // Filter sections by page_access_v2 permissions
  // If hub is enabled but no sub-section keys are configured, show all sub-sections
  const hasV2 = user?.page_access_v2 && Object.keys(user.page_access_v2).length > 0
  const hasSubConfig = hasV2 && SUB_KEYS.some(k => k in user.page_access_v2)
  const sections = hasV2 && hasSubConfig
    ? allSections.filter(s => {
        const key = PERM_MAP[s.id] || s.id
        return user.page_access_v2[key]?.view === true
      })
    : allSections

  // If active section was filtered out, reset to first available
  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s.id === activeSection)) {
      setActiveSection(sections[0].id)
    }
  }, [sections, activeSection])

  const renderContent = () => {
    switch (activeSection) {
      case 'bookings':
        return <BookingsManagement onRefresh={onRefresh} user={user} />
      case 'custom':
        return <CustomBookingsManagement onRefresh={onRefresh} user={user} />
      case 'calendar':
        return <CalendarManagement user={user} />
      case 'walkins':
        return <WalkInSection />
      case 'queue':
        return <QueueSection />
      default:
        return <BookingsManagement onRefresh={onRefresh} user={user} />
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#1A1A1A] rounded-xl border border-[#333]">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{section.label}</span>
              {section.badge && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full ${section.badgeColor}`}>
                  {section.badge > 99 ? '99+' : section.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  )
}

export default BookingsHub
