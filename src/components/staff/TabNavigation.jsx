import React, { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Users, Calendar, Scissors, Gift, BarChart3, UserCheck, CalendarDays, Package, Bell, ChevronDown, MoreHorizontal, Building, Settings, DollarSign, Mail, CreditCard, FileText, UserPlus } from 'lucide-react'

const TabNavigation = ({ tabs, activeTab, onTabChange, incompleteBookingsCount = 0 }) => {
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false)
  const moreDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle More dropdown
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
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
      customers: Users,
      bookings: Calendar,
      services: Scissors,
      vouchers: Gift,
      reports: BarChart3,
      barbers: UserCheck,
      users: Users,
      events: CalendarDays,
      calendar: CalendarDays,
      products: Package,
      notifications: Bell,
      branches: Building,
      payroll: DollarSign,
      email_marketing: Mail,
      pos: CreditCard,
      custom_bookings: FileText,
      walkins: UserPlus
    }
    return iconMap[tabId] || LayoutDashboard
  }

  // Define primary tabs (most frequently used)
  const primaryTabIds = ['overview', 'reports', 'bookings', 'custom_bookings', 'calendar', 'walkins', 'barbers', 'users', 'services', 'vouchers', 'payroll']

  // Helper to check if a tab is available in the current filtered tabs
  const isTabAvailable = (tabId) => tabs.some(t => t.id === tabId)

  const primaryTabs = tabs.filter(tab => primaryTabIds.includes(tab.id))
  const secondaryTabs = tabs.filter(tab => !primaryTabIds.includes(tab.id))

  const activeSecondaryTab = secondaryTabs.find(tab => tab.id === activeTab)

  const handleTabClick = (tabId) => {
    onTabChange(tabId)
    setIsMoreDropdownOpen(false)
  }

  return (
    <div className="bg-[#0A0A0A] backdrop-blur-sm border border-[#1A1A1A]/30 rounded-xl sm:rounded-2xl shadow-2xl shadow-black/40 overflow-visible relative z-10">
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-center p-1.5">
        <div className="flex items-center space-x-0.5 bg-[#050505]/60 rounded-lg p-1">
          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative flex items-center space-x-2 px-3 py-2.5 rounded-md font-medium text-xs transition-all duration-250 group min-w-0 ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-md shadow-[var(--color-primary)]/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]/40'
                    }`}
                >
                  {/* Active indicator */}
                  {activeTab === tab.id && (
                    <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-white rounded-full" />
                  )}

                  <div className={`flex items-center justify-center w-4 h-4 transition-all duration-200 ${activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-500 group-hover:text-[var(--color-primary)]'
                    }`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="font-medium whitespace-nowrap text-xs">{tab.label}</span>

                  {/* Badge for bookings */}
                  {tab.id === 'bookings' && incompleteBookingsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                      {incompleteBookingsCount > 99 ? '99+' : incompleteBookingsCount}
                    </span>
                  )}
                </button>
              </div>
            )
          })}

          {/* More Dropdown */}
          {secondaryTabs.length > 0 && (
            <div className="relative" ref={moreDropdownRef}>
              <button
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                className={`relative flex items-center space-x-1.5 px-3 py-2.5 rounded-md font-medium text-xs transition-all duration-250 group ${activeSecondaryTab
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-md shadow-[var(--color-primary)]/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]/40'
                  }`}
              >
                {activeSecondaryTab ? (
                  <>
                    {/* Active indicator */}
                    <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-white rounded-full" />
                    <div className="flex items-center justify-center w-4 h-4 text-white">
                      {React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-4 h-4" })}
                    </div>
                    <span className="font-medium whitespace-nowrap text-xs">{activeSecondaryTab.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''
                      }`} />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center w-4 h-4 text-gray-500 group-hover:text-[var(--color-primary)]">
                      <MoreHorizontal className="w-4 h-4" />
                    </div>
                    <span className="font-medium whitespace-nowrap text-xs">More</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 group-hover:text-[var(--color-primary)] transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''
                      }`} />
                  </>
                )}
              </button>

              {/* Dropdown Menu */}
              {isMoreDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-44 bg-[#050505]/95 backdrop-blur-xl rounded-lg shadow-2xl border border-[#1A1A1A]/50 py-1.5" style={{ zIndex: 10, position: 'absolute' }}>
                  {secondaryTabs.map((tab) => {
                    const IconComponent = getIconComponent(tab.id)
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 text-left transition-all duration-200 ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                          : 'text-gray-400 hover:bg-[#1A1A1A]/40 hover:text-white'
                          }`}
                      >
                        <div className={`flex items-center justify-center w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-500'
                          }`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-xs">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Navigation - No Horizontal Scroll */}
      <nav className="lg:hidden">
        <div className="flex flex-wrap gap-1.5 sm:gap-2 p-2 sm:p-3 justify-center">
          {/* Show primary tabs first */}
          {primaryTabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs transition-all duration-200 whitespace-nowrap relative flex-shrink-0 min-w-[60px] sm:min-w-[70px] touch-manipulation ${activeTab === tab.id
                    ? 'bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-[#2A2A2A] active:scale-95'
                    }`}
                >
                  <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-all duration-200 ${activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-400'
                    }`}>
                    <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="font-semibold text-[10px] sm:text-xs leading-tight">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  )}

                  {/* Badge for bookings */}
                  {tab.id === 'bookings' && incompleteBookingsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                      {incompleteBookingsCount > 99 ? '99+' : incompleteBookingsCount}
                    </span>
                  )}
                </button>
              </div>
            )
          })}

          {/* More button for secondary tabs */}
          {secondaryTabs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs transition-all duration-200 whitespace-nowrap flex-shrink-0 min-w-[60px] sm:min-w-[70px] touch-manipulation ${activeSecondaryTab
                  ? 'bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-md scale-105'
                  : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]/40 active:scale-95'
                  }`}
              >
                <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-all duration-200 ${activeSecondaryTab ? 'text-white' : 'text-gray-400'
                  }`}>
                  {activeSecondaryTab ? (
                    React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-4 h-4 sm:w-5 sm:h-5" })
                  ) : (
                    <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
                <span className="font-semibold text-[10px] sm:text-xs leading-tight">
                  {activeSecondaryTab ? activeSecondaryTab.label : 'More'}
                </span>
                {activeSecondaryTab && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </button>

              {/* Mobile Dropdown */}
              {isMoreDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 sm:w-52 bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl shadow-2xl border border-[#2A2A2A]/50 py-2 z-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {secondaryTabs.map((tab) => {
                    const IconComponent = getIconComponent(tab.id)
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 sm:py-3 text-left transition-all duration-200 touch-manipulation active:scale-95 ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                          : 'text-gray-300 hover:bg-[#333333] hover:text-[var(--color-primary)]'
                          }`}
                      >
                        <div className={`flex items-center justify-center w-5 h-5 flex-shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'
                          }`}>
                          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="font-semibold text-xs sm:text-sm">{tab.label}</span>
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
      <nav className="hidden md:flex lg:hidden items-center justify-center p-2">
        <div className="flex items-center space-x-2 bg-[#0A0A0A]/50 rounded-xl p-1">
          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap relative ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-[#333333]/50'
                    }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>

                  {/* Badge for bookings */}
                  {tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </button>
              </div>
            )
          })}

          {/* More Dropdown for Tablet */}
          {secondaryTabs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap ${activeSecondaryTab
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-[#333333]/50'
                  }`}
              >
                {activeSecondaryTab ? (
                  <>
                    {React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-4 h-4" })}
                    <span>{activeSecondaryTab.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''
                      }`} />
                  </>
                ) : (
                  <>
                    <MoreHorizontal className="w-4 h-4" />
                    <span>More</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''
                      }`} />
                  </>
                )}
              </button>

              {/* Tablet Dropdown */}
              {isMoreDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-44 bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl shadow-2xl border border-[#2A2A2A]/50 py-2" style={{ zIndex: 10, position: 'absolute' }}>
                  {secondaryTabs.map((tab) => {
                    const IconComponent = getIconComponent(tab.id)
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 text-left transition-all duration-200 ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                          : 'text-gray-300 hover:bg-[#333333] hover:text-[var(--color-primary)]'
                          }`}
                      >
                        <div className={`flex items-center justify-center w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'
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
      </nav>
    </div>
  )
}

export default TabNavigation