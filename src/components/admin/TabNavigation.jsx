import React, { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Building, Users, BarChart3, Settings, Crown } from 'lucide-react'

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false)
  const moreDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
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
      branches: Building,
      users: Users,
      reports: BarChart3,
      settings: Settings
    }
    return iconMap[tabId] || LayoutDashboard
  }

  const handleTabClick = (tabId) => {
    onTabChange(tabId)
    setIsMoreDropdownOpen(false)
  }

  return (
    <div className="bg-gradient-to-r from-[#1E1E1E] to-[#2A2A2A] backdrop-blur-sm border border-[#333333]/50 rounded-2xl shadow-xl shadow-black/20 overflow-visible relative z-50">
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-center p-2">
        <div className="flex items-center space-x-1 bg-[#333333]/30 rounded-xl p-1">
          {/* Admin Crown Icon */}
          <div className="flex items-center space-x-2 px-4 py-3">
            <Crown className="w-5 h-5 text-[#FF8C42]" />
            <span className="text-[#FF8C42] font-semibold text-sm">ADMIN</span>
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-[#444444]"></div>

          {/* Tabs */}
          {tabs.map((tab) => {
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
                </button>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden">
        <div className="flex flex-wrap gap-1 p-2 justify-center">
          {/* Admin Badge */}
          <div className="w-full flex justify-center mb-2">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-[#FF8C42]/20 to-[#FF7A2B]/20 border border-[#FF8C42]/30 rounded-full px-4 py-2">
              <Crown className="w-4 h-4 text-[#FF8C42]" />
              <span className="text-[#FF8C42] font-semibold text-xs">ADMIN PANEL</span>
            </div>
          </div>

          {tabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex flex-col items-center justify-center px-3 py-3 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap relative flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-b from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-[#333333]/50'
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
        </div>
      </nav>

      {/* Tablet Navigation */}
      <nav className="hidden md:flex lg:hidden items-center justify-center p-2">
        <div className="flex items-center space-x-2 bg-[#333333]/30 rounded-xl p-1">
          {/* Admin Badge */}
          <div className="flex items-center space-x-2 px-3 py-2">
            <Crown className="w-4 h-4 text-[#FF8C42]" />
            <span className="text-[#FF8C42] font-semibold text-xs">ADMIN</span>
          </div>

          <div className="w-px h-6 bg-[#444444]"></div>

          {tabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-[#444444]/50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              </div>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default TabNavigation