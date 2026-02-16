import React, { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  Building,
  Users,
  BarChart3,
  Settings,
  Shield,
  Palette,
  Mail,
  Ticket,
  Package,
  Percent,
  PieChart,
  Scale,
  Receipt,
  FileText,
  ChevronDown,
  Star,
  Zap,
  Wallet,
  Banknote,
  History,
  Brain,
  Activity,
  Target,
  ShoppingCart,
  Truck,
  Image,
  DollarSign,
  Megaphone,
  Scissors,
  AlertTriangle,
  CreditCard,
  Key,
  Bug,
  Ban,
  ShieldAlert,
} from 'lucide-react'

const CATEGORIES = [
  { id: 'overview', label: 'Overview' },
  { id: 'branches', label: 'Branches' },
  { id: 'users', label: 'Users' },
  { id: 'Commerce', label: 'Commerce', isCategory: true, defaultTab: 'default_services' },
  { id: 'Finance', label: 'Finance', isCategory: true, defaultTab: 'pl' },
  { id: 'Marketing', label: 'Marketing', isCategory: true, defaultTab: 'loyalty' },
  { id: 'Reports', label: 'Reports', isCategory: true, defaultTab: 'reports' },
  { id: 'Platform', label: 'Platform', isCategory: true, defaultTab: 'subscriptions' },
  { id: 'settings', label: 'Settings' },
]

const ITAdminTabNavigation = ({ tabs, activeTab, onTabChange }) => {
  const [openCategory, setOpenCategory] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenCategory(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getIconComponent = (id) => {
    const iconMap = {
      overview: LayoutDashboard,
      branches: Building,
      users: Users,
      reports: BarChart3,
      settings: Settings,
      branding: Palette,
      emails: Mail,
      email_marketing: Brain,
      vouchers: Ticket,
      catalog: Package,
      royalty: Percent,
      pl: PieChart,
      expenses: Receipt,
      balance_sheet: Scale,
      payment_history: FileText,
      loyalty: Star,
      promotions: Zap,
      wallet: Wallet,
      settlements: Banknote,
      audit_trail: History,
      wallet_analytics: Activity,
      customer_analytics: Target,
      default_services: Scissors,
      shop_config: ShoppingCart,
      shop_banners: Image,
      delivery_orders: Truck,
      damage_claims: AlertTriangle,
      // Platform (IT Admin) icons
      subscriptions: CreditCard,
      licenses: Key,
      error_monitor: Bug,
      security_monitor: ShieldAlert,
      bans: Ban,
      // Category icons
      Commerce: ShoppingCart,
      Finance: DollarSign,
      Marketing: Megaphone,
      Reports: BarChart3,
      Platform: Shield,
    }
    return iconMap[id] || LayoutDashboard
  }

  const getActiveCategory = () => {
    const activeTabObj = tabs.find(t => t.id === activeTab)
    return activeTabObj?.category || null
  }

  const getCategoryTabs = (categoryId) => {
    return tabs.filter(t => t.category === categoryId)
  }

  const hasCategory = (categoryId) => {
    return tabs.some(t => t.category === categoryId)
  }

  const activeCategory = getActiveCategory()

  const handleCategoryClick = (cat) => {
    if (cat.isCategory) {
      if (openCategory === cat.id) {
        setOpenCategory(null)
      } else {
        if (activeCategory !== cat.id) {
          onTabChange(cat.defaultTab)
        }
        setOpenCategory(cat.id)
      }
    } else {
      onTabChange(cat.id)
      setOpenCategory(null)
    }
  }

  const handleSubTabClick = (tabId) => {
    onTabChange(tabId)
    setOpenCategory(null)
  }

  const isNavActive = (cat) => {
    if (cat.isCategory) return activeCategory === cat.id
    return activeTab === cat.id
  }

  const getActiveCategorySubLabel = (cat) => {
    if (!cat.isCategory || activeCategory !== cat.id) return null
    const activeTabObj = tabs.find(t => t.id === activeTab)
    return activeTabObj?.label || null
  }

  const visibleCategories = CATEGORIES.filter(cat => {
    if (cat.isCategory) return hasCategory(cat.id)
    return tabs.some(t => t.id === cat.id)
  })

  const renderDropdown = (categoryId, align = 'left') => {
    if (openCategory !== categoryId) return null
    const subTabs = getCategoryTabs(categoryId)
    if (subTabs.length === 0) return null

    return (
      <div className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-52 bg-[#1A1A1A]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-[#333333]/50 py-2 z-50`}>
        {subTabs.map((tab) => {
          const IconComponent = getIconComponent(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabClick(tab.id)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 text-left transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                  : 'text-gray-300 hover:bg-[#333333]/50 hover:text-white'
              }`}
            >
              <div className={`flex items-center justify-center w-4 h-4 ${
                activeTab === tab.id ? 'text-white' : 'text-gray-400'
              }`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-[#1E1E1E] to-[#2A2A2A] backdrop-blur-sm border border-[#333333]/50 rounded-2xl shadow-xl shadow-black/20 overflow-visible relative z-50" ref={dropdownRef}>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block p-2">
        <div className="flex items-center bg-[#333333]/30 rounded-xl p-1">
          <div className="flex-shrink-0 flex items-center space-x-2 px-4 py-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-semibold text-sm">IT ADMIN</span>
          </div>

          <div className="flex-shrink-0 w-px h-8 bg-[#444444]"></div>

          <div className="flex items-center space-x-1">
            {visibleCategories.map((cat) => {
              const IconComponent = getIconComponent(cat.isCategory ? cat.id : cat.id)
              const isActive = isNavActive(cat)
              const subLabel = getActiveCategorySubLabel(cat)

              return (
                <div key={cat.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => handleCategoryClick(cat)}
                    className={`relative flex items-center space-x-2 px-3 py-3 rounded-lg font-semibold text-sm transition-all duration-300 group min-w-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-primary)]/25'
                        : 'text-gray-300 hover:text-white hover:bg-[#444444]/50 hover:shadow-sm'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                    )}
                    <div className={`flex items-center justify-center w-4 h-4 transition-all duration-200 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-[var(--color-primary)]'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="font-semibold whitespace-nowrap">
                      {subLabel || cat.label}
                    </span>
                    {cat.isCategory && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        openCategory === cat.id ? 'rotate-180' : ''
                      } ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[var(--color-primary)]'}`} />
                    )}
                  </button>
                  {cat.isCategory && renderDropdown(cat.id)}
                </div>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden">
        <div className="flex flex-wrap gap-1 p-2 justify-center">
          <div className="w-full flex justify-center mb-2">
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold text-xs">IT ADMIN PANEL</span>
            </div>
          </div>

          {visibleCategories.map((cat) => {
            const IconComponent = getIconComponent(cat.isCategory ? cat.id : cat.id)
            const isActive = isNavActive(cat)

            return (
              <div key={cat.id} className="relative">
                <button
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex flex-col items-center justify-center px-3 py-3 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap relative flex-shrink-0 min-w-[60px] ${
                    isActive
                      ? 'bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg scale-105'
                      : 'text-gray-400 hover:text-white hover:bg-[#333333]/50 active:scale-95'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 mb-1 transition-all duration-200 ${
                    isActive ? 'text-white' : 'text-gray-500'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-[10px]">{cat.label}</span>
                  {isActive && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  )}
                </button>
                {cat.isCategory && renderDropdown(cat.id, 'right')}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Tablet Navigation */}
      <nav className="hidden md:block lg:hidden p-2">
        <div className="flex items-center bg-[#333333]/30 rounded-xl p-1">
          <div className="flex-shrink-0 flex items-center space-x-2 px-3 py-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-semibold text-xs">IT ADMIN</span>
          </div>

          <div className="flex-shrink-0 w-px h-6 bg-[#444444]"></div>

          <div className="flex items-center space-x-1">
            {visibleCategories.map((cat) => {
              const IconComponent = getIconComponent(cat.isCategory ? cat.id : cat.id)
              const isActive = isNavActive(cat)
              const subLabel = getActiveCategorySubLabel(cat)

              return (
                <div key={cat.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => handleCategoryClick(cat)}
                    className={`flex items-center space-x-2 px-2.5 py-2 rounded-lg font-semibold text-xs transition-all duration-300 whitespace-nowrap relative ${
                      isActive
                        ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-[#444444]/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{subLabel || cat.label}</span>
                    {cat.isCategory && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        openCategory === cat.id ? 'rotate-180' : ''
                      }`} />
                    )}
                  </button>
                  {cat.isCategory && renderDropdown(cat.id)}
                </div>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}

export default ITAdminTabNavigation
