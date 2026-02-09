import { useState } from 'react'
import { MessageSquare, CalendarDays, Bell, Brain } from 'lucide-react'
import PostModerationQueue from '../../admin/PostModerationQueue'
import BranchEmailAI from '../BranchEmailAI'
import EventsManagement from '../EventsManagement'
import NotificationsManagement from '../NotificationsManagement'

/**
 * Marketing Hub - Consolidated marketing & communications management
 * Groups: AI Email, Posts, Events, Notifications
 */
const MarketingHub = ({ user, events = [], onRefresh }) => {
  const [activeSection, setActiveSection] = useState('ai')

  const sections = [
    { id: 'ai', label: 'AI Email', icon: Brain },
    { id: 'posts', label: 'Posts', icon: MessageSquare },
    { id: 'events', label: 'Events', icon: CalendarDays },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

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
