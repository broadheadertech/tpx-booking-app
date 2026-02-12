import { useState, useEffect } from 'react'
import { Users, Target } from 'lucide-react'
import CustomersManagement from '../CustomersManagement'
import BranchCustomerAnalytics from '../../admin/BranchCustomerAnalytics'

/**
 * Customers Hub - Consolidated customer management
 * Groups: Customers, Customer Analytics
 */
// Map section id → page_access_v2 key (only where they differ)
const PERM_MAP = { analytics: 'customer_analytics' }

const CustomersHub = ({ user, customers = [], wallets = [], onRefresh }) => {
  const [activeSection, setActiveSection] = useState('customers')

  const allSections = [
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: Target },
  ]

  // Filter sections by page_access_v2 permissions
  // If hub is enabled but no sub-section keys are configured, show all sub-sections
  const SUB_KEYS = ['customer_analytics']
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
      case 'customers':
        return <CustomersManagement customers={customers} wallets={wallets} onRefresh={onRefresh} />
      case 'analytics':
        return <BranchCustomerAnalytics user={user} />
      default:
        return <CustomersManagement customers={customers} wallets={wallets} onRefresh={onRefresh} />
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

export default CustomersHub
