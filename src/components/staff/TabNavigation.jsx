import React from 'react'
import { LayoutDashboard, Users, Calendar, Scissors, Gift, BarChart3, UserCheck } from 'lucide-react'

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  const getIconComponent = (tabId) => {
    const iconMap = {
      overview: LayoutDashboard,
      customers: Users,
      bookings: Calendar,
      services: Scissors,
      vouchers: Gift,
      reports: BarChart3,
      barbers: UserCheck
    }
    return iconMap[tabId] || LayoutDashboard
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-xl shadow-black/5 overflow-hidden">
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-center p-2">
        <div className="flex items-center space-x-1 bg-gray-50/80 rounded-xl p-1">
          {tabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center space-x-3 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 group min-w-0 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg shadow-[#FF8C42]/25 transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80 hover:shadow-sm'
                }`}
              >
                {/* Active indicator */}
                {activeTab === tab.id && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
                
                <div className={`flex items-center justify-center w-5 h-5 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-500 group-hover:text-[#FF8C42]'
                }`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className="font-semibold whitespace-nowrap">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden">
        <div className="flex overflow-x-auto scrollbar-hide p-2 space-x-1">
          {tabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-3 rounded-xl font-medium text-xs transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-b from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 mb-1 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-500'
                }`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className="font-semibold">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Tablet Navigation */}
      <nav className="hidden md:flex lg:hidden items-center justify-center p-2">
        <div className="flex items-center space-x-2 bg-gray-50/80 rounded-xl p-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const IconComponent = getIconComponent(tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default TabNavigation