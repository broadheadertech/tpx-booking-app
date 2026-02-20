import { useState, useEffect } from 'react'
import { Package, ShoppingCart, Gift, Scissors, HelpCircle } from 'lucide-react'
import WalkthroughOverlay from '../../common/WalkthroughOverlay'
import { productsHubSteps } from '../../../config/walkthroughSteps'
import ProductsManagement from '../ProductsManagement'
import BranchProductOrdering from '../BranchProductOrdering'
import VoucherManagement from '../VoucherManagement'
import ServicesManagement from '../ServicesManagement'

/**
 * Products Hub - Consolidated products & services management
 * Groups: Services, Products, Order Products, Vouchers
 */
// Map section id → page_access_v2 key (only where they differ)
const PERM_MAP = { order: 'order_products' }

const ProductsHub = ({ user, services = [], vouchers = [], onRefresh, onCreateVoucher }) => {
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('staff_hub_products_section') || 'services')

  useEffect(() => {
    localStorage.setItem('staff_hub_products_section', activeSection)
  }, [activeSection])
  const [showTutorial, setShowTutorial] = useState(false)

  const allSections = [
    { id: 'services', label: 'Services', icon: Scissors },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'order', label: 'Order Products', icon: ShoppingCart },
    { id: 'vouchers', label: 'Vouchers', icon: Gift },
  ]

  // Filter sections by page_access_v2 permissions
  // If hub is enabled but no sub-section keys are configured, show all sub-sections
  const SUB_KEYS = ['services', 'order_products', 'vouchers']
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
      case 'services':
        return <ServicesManagement services={services} onRefresh={onRefresh} user={user} />
      case 'products':
        return <ProductsManagement onRefresh={onRefresh} user={user} />
      case 'order':
        return <BranchProductOrdering user={user} onRefresh={onRefresh} />
      case 'vouchers':
        return <VoucherManagement vouchers={vouchers} onRefresh={onRefresh} onCreateVoucher={onCreateVoucher} />
      default:
        return <ServicesManagement services={services} onRefresh={onRefresh} user={user} />
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div data-tour="ph-tabs" className="flex flex-wrap gap-1.5 p-1.5 bg-[#1A1A1A] rounded-xl border border-[#333]">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              data-tour={`ph-${section.id}-tab`}
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
        <button onClick={() => setShowTutorial(true)} className="ml-auto p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#2A2A2A] transition-colors" title="Show tutorial">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div data-tour="ph-content">
        {renderContent()}
      </div>

      <WalkthroughOverlay steps={productsHubSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />
    </div>
  )
}

export default ProductsHub
