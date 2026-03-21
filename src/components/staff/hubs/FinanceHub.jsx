import { useState, useEffect } from 'react'
import { DollarSign, Banknote, Percent, PieChart, Scale, Receipt, TrendingUp, Wallet, HelpCircle } from 'lucide-react'
import PayrollManagement from '../PayrollManagement'
import CashAdvanceApproval from '../CashAdvanceApproval'
import BranchRoyaltyHistory from '../BranchRoyaltyHistory'
import AccountingDashboard from '../AccountingDashboard'
import BalanceSheetDashboard from '../BalanceSheetDashboard'
import PaymentHistory from '../PaymentHistory'
import WalletEarningsDashboard from '../WalletEarningsDashboard'
import BranchAdminWallet from '../BranchAdminWallet'
import WalkthroughOverlay from '../../common/WalkthroughOverlay'
import { financeHubSteps } from '../../../config/walkthroughSteps'

/**
 * Finance Hub - Consolidated finance & accounting management
 * Groups: Payroll, Cash Advances, Royalty, P&L, Balance Sheet, Payment History, Wallet Earnings
 */
const FinanceHub = ({ user, onRefresh, pendingAdvancesCount = 0 }) => {
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('staff_hub_finance_section') || 'accounting')
  const [showWalkthrough, setShowWalkthrough] = useState(false)

  useEffect(() => {
    localStorage.setItem('staff_hub_finance_section', activeSection)
  }, [activeSection])

  const allSections = [
    { id: 'accounting', label: 'P&L', icon: PieChart },
    { id: 'balance_sheet', label: 'Balance Sheet', icon: Scale },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    {
      id: 'cash_advances',
      label: 'Cash Advances',
      icon: Banknote,
      badge: pendingAdvancesCount > 0 ? pendingAdvancesCount : null,
      badgeColor: 'bg-yellow-500'
    },
    { id: 'royalty', label: 'Royalty', icon: Percent },
    { id: 'payments', label: 'Payments', icon: Receipt },
    { id: 'wallet_earnings', label: 'Earnings', icon: TrendingUp },
    { id: 'branch_wallet', label: 'Branch Wallet', icon: Wallet },
  ]

  // Filter sections by page_access_v2 permissions
  // If hub is enabled but no sub-section keys are configured, show all sub-sections
  const SUB_KEYS = ['accounting', 'balance_sheet', 'payroll', 'cash_advances', 'royalty', 'payments', 'wallet_earnings', 'branch_wallet']
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

  const renderContent = () => {
    switch (activeSection) {
      case 'accounting':
        return <AccountingDashboard user={user} onRefresh={onRefresh} />
      case 'balance_sheet':
        return <BalanceSheetDashboard branchId={user?.branch_id} userId={user?._id} />
      case 'payroll':
        return <PayrollManagement onRefresh={onRefresh} user={user} />
      case 'cash_advances':
        return <CashAdvanceApproval user={user} onRefresh={onRefresh} />
      case 'royalty':
        return <BranchRoyaltyHistory />
      case 'payments':
        return <PaymentHistory />
      case 'wallet_earnings':
        return <WalletEarningsDashboard />
      case 'branch_wallet':
        return <BranchAdminWallet />
      default:
        return <AccountingDashboard user={user} onRefresh={onRefresh} />
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
              data-tour={`finance-tab-${section.id}`}
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
      <WalkthroughOverlay steps={financeHubSteps} isVisible={showWalkthrough} onComplete={() => setShowWalkthrough(false)} onSkip={() => setShowWalkthrough(false)} />
      {!showWalkthrough && (
        <button onClick={() => setShowWalkthrough(true)} className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all shadow-lg shadow-black/40" title="Finance tour">
          <HelpCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export default FinanceHub
