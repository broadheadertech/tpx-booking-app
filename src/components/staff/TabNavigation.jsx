import React, { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Users, Calendar, Scissors, Gift, BarChart3, UserCheck, CalendarDays, Package, Bell, ChevronDown, MoreHorizontal } from 'lucide-react'

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
      events: CalendarDays,
      products: Package,
      notifications: Bell
    }
    return iconMap[tabId] || LayoutDashboard
  }

  // Define primary tabs (most frequently used)
  const primaryTabIds = ['overview', 'bookings', 'barbers', 'customers', 'services', 'vouchers', 'notifications']
  const secondaryTabIds = ['reports', 'events', 'products']
  
  const primaryTabs = tabs.filter(tab => primaryTabIds.includes(tab.id))
  const secondaryTabs = tabs.filter(tab => secondaryTabIds.includes(tab.id))
  
  const activeSecondaryTab = secondaryTabs.find(tab => tab.id === activeTab)
  
  const handleTabClick = (tabId) => {
    onTabChange(tabId)
    setIsMoreDropdownOpen(false)
  }

  return (
    <div className="bg-gradient-to-r from-[#1E1E1E] to-[#2A2A2A] backdrop-blur-sm border border-[#333333]/50 rounded-2xl shadow-xl shadow-black/20 overflow-visible relative z-50">
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-center p-2">
        <div className="flex items-center space-x-1 bg-[#333333]/30 rounded-xl p-1">
          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-300 group min-w-0 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg shadow-[#FF8C42]/25 transform scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-[#444444]/50 hover:shadow-sm'
                  }`}
                >
                  {/* Active indicator */}
                  {activeTab === tab.id && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  )}

                  <div className={`flex items-center justify-center w-5 h-5 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-[#FF8C42]'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="font-semibold whitespace-nowrap">{tab.label}</span>

                  {/* Badge for bookings */}
                  {tab.id === 'bookings' && incompleteBookingsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {incompleteBookingsCount > 99 ? '99+' : incompleteBookingsCount}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
          
          {/* More Dropdown */}
          <div className="relative" ref={moreDropdownRef}>
            <button
              onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
              className={`relative flex items-center space-x-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-300 group ${
                activeSecondaryTab
                  ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg shadow-[#FF8C42]/25'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80 hover:shadow-sm'
              }`}
            >
              {activeSecondaryTab ? (
                <>
                  {/* Active indicator */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  <div className="flex items-center justify-center w-5 h-5 text-white">
                    {React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-5 h-5" })}
                  </div>
                  <span className="font-semibold whitespace-nowrap">{activeSecondaryTab.label}</span>
                  <ChevronDown className={`w-4 h-4 text-white transition-transform duration-200 ${
                    isMoreDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-5 h-5 text-gray-500 group-hover:text-[#FF8C42]">
                    <MoreHorizontal className="w-5 h-5" />
                  </div>
                  <span className="font-semibold whitespace-nowrap">More</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 group-hover:text-[#FF8C42] transition-transform duration-200 ${
                    isMoreDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </>
              )}
            </button>
            
            {/* Dropdown Menu */}
               {isMoreDropdownOpen && (
                 <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200/50 py-2" style={{zIndex: 99999, position: 'absolute'}}>
                {secondaryTabs.map((tab) => {
                  const IconComponent = getIconComponent(tab.id)
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF8C42]'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-5 h-5 ${
                        activeTab === tab.id ? 'text-white' : 'text-gray-500'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="font-semibold">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden">
        <div className="flex overflow-x-auto scrollbar-hide p-2 space-x-1">
          {/* Show primary tabs first */}
          {primaryTabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex flex-col items-center justify-center min-w-[70px] px-2 py-3 rounded-xl font-medium text-xs transition-all duration-300 whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-b from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex items-center justify-center w-5 h-5 mb-1 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-500'
                  }`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-[10px]">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  )}

                  {/* Badge for bookings */}
                  {tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                      {tab.badge > 99 ? '99' : tab.badge}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
          
          {/* More button for secondary tabs */}
          <div className="relative">
            <button
              onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
              className={`flex flex-col items-center justify-center min-w-[70px] px-2 py-3 rounded-xl font-medium text-xs transition-all duration-300 whitespace-nowrap ${
                activeSecondaryTab
                  ? 'bg-gradient-to-b from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className={`flex items-center justify-center w-5 h-5 mb-1 transition-all duration-200 ${
                activeSecondaryTab ? 'text-white' : 'text-gray-500'
              }`}>
                {activeSecondaryTab ? (
                  React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-4 h-4" })
                ) : (
                  <MoreHorizontal className="w-4 h-4" />
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
                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-200/50 py-2" style={{zIndex: 99999, position: 'absolute'}}>
                {secondaryTabs.map((tab) => {
                  const IconComponent = getIconComponent(tab.id)
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF8C42]'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-4 h-4 ${
                        activeTab === tab.id ? 'text-white' : 'text-gray-500'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-xs">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Tablet Navigation */}
      <nav className="hidden md:flex lg:hidden items-center justify-center p-2">
        <div className="flex items-center space-x-2 bg-gray-50/80 rounded-xl p-1">
          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
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
          <div className="relative">
            <button
              onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap ${
                activeSecondaryTab
                  ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              {activeSecondaryTab ? (
                <>
                  {React.createElement(getIconComponent(activeSecondaryTab.id), { className: "w-4 h-4" })}
                  <span>{activeSecondaryTab.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                    isMoreDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </>
                              ) : (
                  <>
                    <MoreHorizontal className="w-4 h-4" />
                    <span>More</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                      isMoreDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </>
                )}
            </button>
            
            {/* Tablet Dropdown */}
              {isMoreDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-200/50 py-2" style={{zIndex: 99999, position: 'absolute'}}>
                {secondaryTabs.map((tab) => {
                  const IconComponent = getIconComponent(tab.id)
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-2.5 text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF8C42]'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-4 h-4 ${
                        activeTab === tab.id ? 'text-white' : 'text-gray-500'
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
        </div>
      </nav>
    </div>
  )
}

export default TabNavigation