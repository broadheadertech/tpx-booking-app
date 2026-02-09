import { useState } from 'react'
import { Package, ShoppingCart, Gift, Scissors } from 'lucide-react'
import ProductsManagement from '../ProductsManagement'
import BranchProductOrdering from '../BranchProductOrdering'
import VoucherManagement from '../VoucherManagement'
import ServicesManagement from '../ServicesManagement'

/**
 * Products Hub - Consolidated products & services management
 * Groups: Services, Products, Order Products, Vouchers
 */
const ProductsHub = ({ user, services = [], vouchers = [], onRefresh, onCreateVoucher }) => {
  const [activeSection, setActiveSection] = useState('services')

  const sections = [
    { id: 'services', label: 'Services', icon: Scissors },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'order', label: 'Order Products', icon: ShoppingCart },
    { id: 'vouchers', label: 'Vouchers', icon: Gift },
  ]

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

export default ProductsHub
