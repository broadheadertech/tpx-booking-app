import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Users, Clock, HelpCircle, Camera, Settings, FileText } from 'lucide-react'
import BarbersManagement from '../BarbersManagement'
import BranchUserManagement from '../BranchUserManagement'
import TimeAttendanceView from '../TimeAttendanceView'
import BioApprovalQueue from '../BioApprovalQueue'
import BarberModal from '../BarberModal'
import WalkthroughOverlay from '../../common/WalkthroughOverlay'
import AttendanceConfig from '../AttendanceConfig'
import { teamHubSteps } from '../../../config/walkthroughSteps'

/**
 * Team Hub - Consolidated team management
 * Groups: Barbers, Users, Attendance
 */
const TeamHub = ({ user, barbers = [], onRefresh }) => {
  const [activeSection, setActiveSection] = useState('barbers')
  const [showTutorial, setShowTutorial] = useState(false)
  const [showAttendanceConfig, setShowAttendanceConfig] = useState(false)
  const [bioReviewBarber, setBioReviewBarber] = useState(null)
  const navigate = useNavigate()

  // Query pending attendance requests for badge
  const pendingRequests = useQuery(
    api.services.timeAttendance.getPendingRequests,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  )
  const pendingCount = pendingRequests?.length || 0

  // Query pending bio reviews for badge
  const pendingBioReviews = useQuery(
    api.services.barbers.getPendingBioReviews,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  )
  const pendingBioCount = pendingBioReviews?.length || 0

  const allSections = [
    { id: 'barbers', label: 'Barbers', icon: UserCheck },
    { id: 'bio-reviews', label: 'Bio Reviews', icon: FileText, badge: pendingBioCount },
    { id: 'users', label: 'Staff Users', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock, badge: pendingCount },
  ]

  // Filter sections by page_access_v2 permissions
  // If hub is enabled but no sub-section keys are configured, show all sub-sections
  const SUB_KEYS = ['barbers', 'bio-reviews', 'users', 'attendance']
  const hasV2 = user?.page_access_v2 && Object.keys(user.page_access_v2).length > 0
  const hasSubConfig = hasV2 && SUB_KEYS.some(k => k in user.page_access_v2)
  const sections = hasV2 && hasSubConfig
    ? allSections.filter(s => user.page_access_v2[s.id]?.view === true)
    : allSections

  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s.id === activeSection)) {
      setActiveSection(sections[0].id)
    }
  }, [sections, activeSection])

  const staffName = user?.nickname || user?.username || user?.full_name || "Staff"

  const handleReviewBarber = (review) => {
    // Find the full barber object from the barbers list
    const fullBarber = barbers.find(b => b._id === review._id)
    if (fullBarber) {
      setBioReviewBarber(fullBarber)
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'barbers':
        return <BarbersManagement barbers={barbers} onRefresh={onRefresh} user={user} />
      case 'bio-reviews':
        return <BioApprovalQueue branchId={user?.branch_id} onReviewBarber={handleReviewBarber} />
      case 'users':
        return <BranchUserManagement onRefresh={onRefresh} />
      case 'attendance':
        if (showAttendanceConfig) {
          return <AttendanceConfig branchId={user?.branch_id} barbers={barbers} />
        }
        return <TimeAttendanceView branchId={user?.branch_id} staffName={staffName} />
      default:
        return <BarbersManagement barbers={barbers} onRefresh={onRefresh} user={user} />
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div data-tour="th-tabs" className="flex flex-wrap gap-1.5 p-1.5 bg-[#1A1A1A] rounded-xl border border-[#333]">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          const tourId = section.id === 'barbers' ? 'th-barbers-tab' : section.id === 'users' ? 'th-users-tab' : 'th-attendance-tab'
          return (
            <button
              key={section.id}
              data-tour={tourId}
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

        {/* Action buttons */}
        <div className="ml-auto flex items-center gap-1">
          {activeSection === 'attendance' && (
            <>
              <button
                onClick={() => navigate('/staff/face-attendance')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#2A2A2A] transition-colors"
                title="Launch Face Check-In Kiosk"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowAttendanceConfig(!showAttendanceConfig)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${showAttendanceConfig ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-gray-500 hover:text-white hover:bg-[#2A2A2A]'}`}
                title="FR Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#2A2A2A] transition-colors"
            title="Show tutorial"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div data-tour="th-content">
        {renderContent()}
      </div>

      {/* Walkthrough Tutorial */}
      <WalkthroughOverlay steps={teamHubSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />

      {/* Bio Review Modal */}
      {bioReviewBarber && (
        <BarberModal
          isOpen={true}
          onClose={() => setBioReviewBarber(null)}
          barber={bioReviewBarber}
          onRefresh={onRefresh}
          initialView="bio"
        />
      )}
    </div>
  )
}

export default TeamHub
