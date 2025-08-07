import React from 'react'
import { LayoutDashboard, Users, Calendar, Scissors, Gift } from 'lucide-react'

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  const getIconComponent = (tabId) => {
    const iconMap = {
      overview: LayoutDashboard,
      customers: Users,
      bookings: Calendar,
      services: Scissors,
      vouchers: Gift
    }
    return iconMap[tabId] || LayoutDashboard
  }

  return (
    <div className="bg-white border-2 border-[#F5F5F5] rounded-3xl shadow-lg">
      <nav className="flex space-x-3 p-4">
        {tabs.map((tab) => {
          const IconComponent = getIconComponent(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-8 rounded-2xl font-bold text-base transition-all duration-300 flex items-center space-x-4 group relative min-w-0 transform hover:-translate-y-1 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-2xl shadow-[#FF8C42]/25 scale-105'
                  : 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F5F5]'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white/25 text-white'
                  : 'bg-white text-[#6B6B6B] group-hover:bg-[#FF8C42]/10 group-hover:text-[#FF8C42] shadow-sm'
              }`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <span className="font-bold whitespace-nowrap">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default TabNavigation