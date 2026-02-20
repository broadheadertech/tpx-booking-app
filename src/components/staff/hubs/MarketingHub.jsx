import { useState, useEffect } from 'react'
import { MessageSquare, CalendarDays, Bell, Brain } from 'lucide-react'
import PostModerationQueue from '../../admin/PostModerationQueue'
import BranchEmailAI from '../BranchEmailAI'
import EventsManagement from '../EventsManagement'
import NotificationsManagement from '../NotificationsManagement'

/**
 * Marketing Hub - Consolidated marketing & communications management
 * Groups: AI Email, Posts, Events, Notifications
 */
// Map section id → page_access_v2 key (only where they differ)
const PERM_MAP = { ai: 'email_marketing', posts: 'post_moderation' }

const MarketingHub = ({ user, events = [], onRefresh }) => {
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('staff_hub_marketing_section') || 'ai')

  useEffect(() => {
    localStorage.setItem('staff_hub_marketing_section', activeSection)
  }, [activeSection])

  const allSections = [
    { id: 'ai', label: 'AI Email', icon: Brain },
    { id: 'posts', label: 'Posts', icon: MessageSquare },
    { id: 'events', label: 'Events', icon: CalendarDays },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  // Filter sections by page_access_v2 permissions
  // If hub is enabled but no sub-section keys are configured, show all sub-sections
  const SUB_KEYS = ['email_marketing', 'post_moderation', 'events', 'notifications']
  const hasV2 = user?.page_access_v2 && Object.keys(user.page_access_v2).length > 0
  const hasSubConfig = hasV2 && SUB_KEYS.some(k => k in user.page_access_v2)
  const sections = hasV2 && hasSubConfig
    ? allSections.filter(s => {
        const key = PERM_MAP[s.id] || s.id
        return user.page_access_v2[key]?.view === true
      })
    : allSections

  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s.id === activeSection)) {
      setActiveSection(sections[0].id)
    }
  }, [sections, activeSection])

  const renderContent = () => {
    switch (activeSection) {
      case 'ai':
        return <BranchEmailAI user={user} />
      case 'posts':
        return <PostModerationQueue branchId={user?.branch_id} user={user} />
      case 'events':
        return <EventsManagement events={events} onRefresh={onRefresh} user={user} />
      case 'notifications':
        return <NotificationsManagement onRefresh={onRefresh} />
      default:
        return <BranchEmailAI user={user} />
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{section.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  )
}

export default MarketingHub
