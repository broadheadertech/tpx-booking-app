import React, { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  Building,
  Users,
  BarChart3,
  Settings,
  Crown,
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
  MoreHorizontal
} from 'lucide-react'

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false)
  const desktopDropdownRef = useRef(null)
  const mobileDropdownRef = useRef(null)
  const tabletDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideDesktop = !desktopDropdownRef.current || !desktopDropdownRef.current.contains(event.target)
      const isOutsideMobile = !mobileDropdownRef.current || !mobileDropdownRef.current.contains(event.target)
      const isOutsideTablet = !tabletDropdownRef.current || !tabletDropdownRef.current.contains(event.target)

      if (isOutsideDesktop && isOutsideMobile && isOutsideTablet) {
        setIsMoreDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getIconComponent = (tabId) => {
    const iconMap = {
      overview: LayoutDashboard,
      branches: Building,
      users: Users,
      reports: BarChart3,
      settings: Settings,
      branding: Palette,
      emails: Mail,
      vouchers: Ticket,
      catalog: Package,
      royalty: Percent,
      pl: PieChart,
      expenses: Receipt,
      balance_sheet: Scale,
      payment_history: FileText,
    }
    return iconMap[tabId] || LayoutDashboard
  }

  const handleTabClick = (tabId) => {
    onTabChange(tabId)
    setIsMoreDropdownOpen(false)
  }

  // Define primary tabs (most frequently used) - these show in the main nav
  const primaryTabIds = ['overview', 'branches', 'users', 'reports', 'royalty', 'pl', 'balance_sheet']

  const primaryTabs = tabs.filter(tab => primaryTabIds.includes(tab.id))
  const secondaryTabs = tabs.filter(tab => !primaryTabIds.includes(tab.id))

  const activeSecondaryTab = secondaryTabs.find(tab => tab.id === activeTab)

  return (
    <div className="bg-gradient-to-r from-[#1E1E1E] to-[#2A2A2A] backdrop-blur-sm border border-[#333333]/50 rounded-2xl shadow-xl shadow-black/20 overflow-visible relative z-50">
      {/* Desktop Navigation */}
      <nav className="hidden lg:block p-2">
        <div className="flex items-center bg-[#333333]/30 rounded-xl p-1">
          {/* Admin Crown Icon - Fixed */}
          <div className="flex-shrink-0 flex items-center space-x-2 px-4 py-3">
            <Crown className="w-5 h-5 text-[var(--color-primary)]" />
            <span className="text-[var(--color-primary)] font-semibold text-sm">ADMIN</span>
          </div>

          {/* Separator */}
          <div className="flex-shrink-0 w-px h-8 bg-[#444444]"></div>

          {/* Primary Tabs */}
          <div className="flex items-center space-x-1">
            {primaryTabs.map((tab) => {
              const IconComponent = getIconComponent(tab.id)

              return (
                <div key={tab.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => handleTabClick(tab.id)}
                    className={`relative flex items-center space-x-2 px-3 py-3 rounded-lg font-semibold text-sm transition-all duration-300 group min-w-0 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-primary)]/25'
                        : 'text-gray-300 hover:text-white hover:bg-[#444444]/50 hover:shadow-sm'
                    }`}
                  >
                    {/* Active indicator */}
                    {activeTab === tab.id && (
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                    )}

                    <div className={`flex items-center justify-center w-4 h-4 transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-[var(--color-primary)]'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="font-semibold whitespace-nowrap">{tab.label}</span>
                  </button>
                </div>
              )
            })}

            {/* More Dropdown for Secondary Tabs */}
            {secondaryTabs.length > 0 && (
              <div className="relative" ref={desktopDropdownRef}>
                <button
                  onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                  className={`relative flex items-center space-x-2 px-3 py-3 rounded-lg font-semibold text-sm transition-all duration-300 group ${
                    activeSecondaryTab
                      ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-primary)]/25'
                      : 'text-gray-300 hover:text-white hover:bg-[#444444]/50 hover:shadow-sm'
                  }`}
                >
                  {activeSecondaryTab ? (
                    <>
                      {/* Active indicator */}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                      <div className="flex items-center justify-center w-4 h-4 text-white">
                        {React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-4 h-4" })}
                      </div>
                      <span className="font-semibold whitespace-nowrap">{activeSecondaryTab.label}</span>
                      <ChevronDown className={`w-4 h-4 text-white transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-4 h-4 text-gray-400 group-hover:text-[var(--color-primary)]">
                        <MoreHorizontal className="w-4 h-4" />
                      </div>
                      <span className="font-semibold whitespace-nowrap">More</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-[var(--color-primary)] transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isMoreDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[#1A1A1A]/95 backdrop-blur-xl rounded-lg shadow-2xl border border-[#333333]/50 py-2 z-50">
                    {secondaryTabs.map((tab) => {
                      const IconComponent = getIconComponent(tab.id)
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabClick(tab.id)}
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
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden">
        <div className="flex flex-wrap gap-1 p-2 justify-center">
          {/* Admin Badge */}
          <div className="w-full flex justify-center mb-2">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 border border-[var(--color-primary)]/30 rounded-full px-4 py-2">
              <Crown className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-[var(--color-primary)] font-semibold text-xs">ADMIN PANEL</span>
            </div>
          </div>

          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex flex-col items-center justify-center px-3 py-3 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap relative flex-shrink-0 min-w-[60px] ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg scale-105'
                      : 'text-gray-400 hover:text-white hover:bg-[#333333]/50 active:scale-95'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 mb-1 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-500'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-[10px]">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  )}
                </button>
              </div>
            )
          })}

          {/* More button for secondary tabs on mobile */}
          {secondaryTabs.length > 0 && (
            <div className="relative" ref={mobileDropdownRef}>
              <button
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                className={`flex flex-col items-center justify-center px-3 py-3 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap flex-shrink-0 min-w-[60px] ${
                  activeSecondaryTab
                    ? 'bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg scale-105'
                    : 'text-gray-400 hover:text-white hover:bg-[#333333]/50 active:scale-95'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 mb-1 transition-all duration-200 ${
                  activeSecondaryTab ? 'text-white' : 'text-gray-500'
                }`}>
                  {activeSecondaryTab ? (
                    React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-5 h-5" })
                  ) : (
                    <MoreHorizontal className="w-5 h-5" />
                  )}
                </div>
                <span className="font-semibold text-[10px]">
                  {activeSecondaryTab ? activeSecondaryTab.label : 'More'}
                </span>
                {activeSecondaryTab && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </button>

              {/* Mobile Dropdown */}
              {isMoreDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl shadow-2xl border border-[#333333]/50 py-2 z-50 max-h-[60vh] overflow-y-auto">
                  {secondaryTabs.map((tab) => {
                    const IconComponent = getIconComponent(tab.id)
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                            : 'text-gray-300 hover:bg-[#333333]/50 hover:text-white'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-5 h-5 flex-shrink-0 ${
                          activeTab === tab.id ? 'text-white' : 'text-gray-400'
                        }`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-sm">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Tablet Navigation */}
      <nav className="hidden md:block lg:hidden p-2">
        <div className="flex items-center bg-[#333333]/30 rounded-xl p-1">
          {/* Admin Badge - Fixed */}
          <div className="flex-shrink-0 flex items-center space-x-2 px-3 py-2">
            <Crown className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-[var(--color-primary)] font-semibold text-xs">ADMIN</span>
          </div>

          <div className="flex-shrink-0 w-px h-6 bg-[#444444]"></div>

          {/* Primary Tabs */}
          <div className="flex items-center space-x-1">
            {primaryTabs.map((tab) => {
              const IconComponent = getIconComponent(tab.id)

              return (
                <div key={tab.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex items-center space-x-2 px-2.5 py-2 rounded-lg font-semibold text-xs transition-all duration-300 whitespace-nowrap relative ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-[#444444]/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                </div>
              )
            })}

            {/* More Dropdown for Tablet */}
            {secondaryTabs.length > 0 && (
              <div className="relative" ref={tabletDropdownRef}>
                <button
                  onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                  className={`flex items-center space-x-2 px-2.5 py-2 rounded-lg font-semibold text-xs transition-all duration-300 whitespace-nowrap ${
                    activeSecondaryTab
                      ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-[#444444]/50'
                  }`}
                >
                  {activeSecondaryTab ? (
                    <>
                      {React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-4 h-4" })}
                      <span>{activeSecondaryTab.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
                    </>
                  ) : (
                    <>
                      <MoreHorizontal className="w-4 h-4" />
                      <span>More</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {/* Tablet Dropdown */}
                {isMoreDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-44 bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl shadow-2xl border border-[#333333]/50 py-2 z-50">
                    {secondaryTabs.map((tab) => {
                      const IconComponent = getIconComponent(tab.id)
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabClick(tab.id)}
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
                          <span className="font-semibold text-sm">{tab.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}

export default TabNavigation
