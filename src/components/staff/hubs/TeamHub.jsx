import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { UserCheck, Users, Clock } from 'lucide-react'
import BarbersManagement from '../BarbersManagement'
import BranchUserManagement from '../BranchUserManagement'
import TimeAttendanceView from '../TimeAttendanceView'

/**
 * Team Hub - Consolidated team management
 * Groups: Barbers, Users, Attendance
 */
const TeamHub = ({ user, barbers = [], onRefresh }) => {
  const [activeSection, setActiveSection] = useState('barbers')

  // Query pending attendance requests for badge
  const pendingRequests = useQuery(
    api.services.timeAttendance.getPendingRequests,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  )
  const pendingCount = pendingRequests?.length || 0

  const sections = [
    { id: 'barbers', label: 'Barbers', icon: UserCheck },
    { id: 'users', label: 'Staff Users', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock, badge: pendingCount },
  ]

  const staffName = user?.nickname || user?.username || user?.full_name || "Staff"

  const renderContent = () => {
    switch (activeSection) {
      case 'barbers':
        return <BarbersManagement barbers={barbers} onRefresh={onRefresh} user={user} />
      case 'users':
        return <BranchUserManagement onRefresh={onRefresh} />
      case 'attendance':
        return <TimeAttendanceView branchId={user?.branch_id} staffName={staffName} />
      default:
        return <BarbersManagement barbers={barbers} onRefresh={onRefresh} user={user} />
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{section.label}</span>
              {section.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full">
                  {section.badge}
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

export default TeamHub
