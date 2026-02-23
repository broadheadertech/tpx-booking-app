import { useState } from 'react'
import {
  Settings,
  Store,
  CreditCard,
  Wallet,
  Bell,
  Clock,
  Info
} from 'lucide-react'
import BranchProfileSettings from './BranchProfileSettings'
import PaymentSettings from './PaymentSettings'
import BranchWalletView from './BranchWalletView'
import BranchScheduleSettings from './BranchScheduleSettings'
import SystemInfoPanel from './SystemInfoPanel'

/**
 * Branch Settings Component
 * Consolidated settings panel with sub-tabs for different settings areas
 */
const BranchSettings = ({ user, onRefresh }) => {
  const [activeSection, setActiveSection] = useState('profile')

  const sections = [
    { id: 'profile', label: 'Branch Profile', icon: Store, description: 'Logo, cover photo, social links' },
    { id: 'payments', label: 'Payment Settings', icon: CreditCard, description: 'Payment methods & fees' },
    { id: 'wallet', label: 'Wallet Settings', icon: Wallet, description: 'Customer wallet configuration' },
    { id: 'schedule', label: 'Schedule', icon: Clock, description: 'Operating hours & closures' },
    { id: 'system', label: 'System Info', icon: Info, description: 'Version & changelog' },
  ]

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return <BranchProfileSettings user={user} />
      case 'payments':
        return <PaymentSettings onRefresh={onRefresh} />
      case 'wallet':
        return <BranchWalletView />
      case 'schedule':
        return <BranchScheduleSettings />
      case 'system':
        return <SystemInfoPanel />
      default:
        return <BranchProfileSettings user={user} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
          <Settings className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Branch Settings</h2>
          <p className="text-sm text-gray-500">Manage your branch configuration and preferences</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-[#1A1A1A] rounded-xl border border-[#333]">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          )
        })}
      </div>

      {/* Section Content */}
      <div className="min-h-[400px]">
        {renderSectionContent()}
      </div>
    </div>
  )
}

export default BranchSettings
