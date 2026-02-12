import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Wallet as WalletIcon, CreditCard, Clock, Gift, Home, Scissors, ShoppingBag, User, HelpCircle } from 'lucide-react'
import WalkthroughOverlay from '../../common/WalkthroughOverlay'
import { customerWalletHubSteps } from '../../../config/walkthroughSteps'
import PayTab from './PayTab'
import ActivityTab from './ActivityTab'
import RewardsTab from './RewardsTab'

/**
 * WalletHub - Tab-based wallet navigation
 *
 * Starbucks-style closed-loop wallet with:
 * - Pay: Balance card, quick actions, pending topups
 * - Activity: Full transaction history
 * - Rewards: Tier progress, points, available rewards
 */

const TABS = [
  { id: 'pay', label: 'Pay', icon: CreditCard },
  { id: 'activity', label: 'Activity', icon: Clock },
  { id: 'rewards', label: 'Rewards', icon: Gift }
]

function WalletHub({
  user,
  wallet,
  transactions,
  pendingTopups,
  onTopUp,
  onCheckTopupStatus,
  checkingTopupId,
  isProcessingReturn,
  autoPollingActive,
  defaultTab = 'pay'
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isNavHidden, setIsNavHidden] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const lastScrollY = useRef(0)

  // Scroll-aware navigation - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (Math.abs(currentScrollY - lastScrollY.current) < 10) return
      if (currentScrollY < 50) {
        setIsNavHidden(false)
      } else if (currentScrollY > lastScrollY.current) {
        setIsNavHidden(true)
      } else {
        setIsNavHidden(false)
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Get initial tab from URL or default
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab')
    return TABS.find(t => t.id === tabParam)?.id || defaultTab
  })

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && TABS.find(t => t.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Handle tab change
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
    // Update URL without navigation
    const newParams = new URLSearchParams(searchParams)
    if (tabId === defaultTab) {
      newParams.delete('tab')
    } else {
      newParams.set('tab', tabId)
    }
    setSearchParams(newParams, { replace: true })
  }, [searchParams, setSearchParams, defaultTab])

  // Calculate balance display
  const mainBalance = (wallet?.balance || 0) / 100
  const bonusBalance = (wallet?.bonus_balance || 0) / 100
  const totalBalance = mainBalance + bonusBalance

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header with Balance Summary */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-2xl">
        {/* Compact Header */}
        <div className="max-w-md mx-auto px-4 pt-4 pb-2">
          <div data-tour="wh-balance" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
              <span className="text-lg font-bold text-white">Wallet</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-400">Balance</p>
                <p className="text-lg font-bold text-white">
                  ₱{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <button onClick={() => setShowTutorial(true)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#2A2A2A] transition-colors" title="Show tutorial">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-md mx-auto px-4 pb-2">
          <div data-tour="wh-tabs" className="flex bg-[#1A1A1A] rounded-2xl p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-[#1A1A1A]" />
      </div>

      {/* Tab Content */}
      <div data-tour="wh-content" className="max-w-md mx-auto pb-32">
        {activeTab === 'pay' && (
          <PayTab
            user={user}
            wallet={wallet}
            mainBalance={mainBalance}
            bonusBalance={bonusBalance}
            totalBalance={totalBalance}
            pendingTopups={pendingTopups}
            onTopUp={onTopUp}
            onCheckTopupStatus={onCheckTopupStatus}
            checkingTopupId={checkingTopupId}
            isProcessingReturn={isProcessingReturn}
            autoPollingActive={autoPollingActive}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTab
            user={user}
            transactions={transactions}
          />
        )}

        {activeTab === 'rewards' && (
          <RewardsTab
            user={user}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation navigate={navigate} activeSection="wallet" isNavHidden={isNavHidden} />

      <WalkthroughOverlay steps={customerWalletHubSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />
    </div>
  )
}

// Bottom Navigation Component
const NAV_SECTIONS = [
  { id: 'home', label: 'Home', icon: Home, path: '/customer/dashboard' },
  { id: 'booking', label: 'Book', icon: Scissors, path: '/customer/booking' },
  { id: 'wallet', label: 'Pay', icon: WalletIcon, path: '/customer/wallet' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, path: '/customer/shop' },
  { id: 'profile', label: 'Account', icon: User, path: '/customer/profile' },
]

function BottomNavigation({ navigate, activeSection, isNavHidden = false }) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom transition-transform duration-300 ease-in-out ${
      isNavHidden ? 'translate-y-full' : 'translate-y-0'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-5 p-1 pb-2 md:p-2 md:pb-3">
          {NAV_SECTIONS.map((section) => {
            const IconComponent = section.icon
            const isActive = section.id === activeSection
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.path)}
                className={`flex flex-col items-center justify-center py-2 md:py-3 transition-colors ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <IconComponent className="w-5 h-5 md:w-6 md:h-6" />
                <span className="text-[10px] md:text-xs mt-1 font-medium">{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WalletHub
