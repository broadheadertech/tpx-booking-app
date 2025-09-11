import React from 'react'
import { Building, Users, Calendar, DollarSign, User, Scissors, TrendingUp, Activity } from 'lucide-react'

const StatsCards = ({ stats }) => {
  const getIconComponent = (iconName) => {
    const iconMap = {
      building: Building,
      users: Users,
      calendar: Calendar,
      dollar: DollarSign,
      user: User,
      scissors: Scissors,
      trending: TrendingUp,
      activity: Activity
    }
    return iconMap[iconName] || Activity
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-4 bg-gray-600 rounded w-24"></div>
                <div className="h-8 bg-gray-600 rounded w-16"></div>
                <div className="h-3 bg-gray-600 rounded w-20"></div>
              </div>
              <div className="w-12 h-12 bg-gray-600 rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const IconComponent = getIconComponent(stat.icon)

        return (
          <div
            key={index}
            className="group bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50 hover:border-[#FF8C42]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#FF8C42]/10 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-400 mb-2">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-white mb-1 group-hover:text-[#FF8C42] transition-colors">
                  {stat.value}
                </p>
                {stat.subtext && (
                  <p className="text-xs text-gray-500">
                    {stat.subtext}
                  </p>
                )}
              </div>
              
              <div className="w-12 h-12 bg-[#FF8C42]/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 border border-[#FF8C42]/30 group-hover:bg-[#FF8C42]/30">
                <IconComponent className="w-6 h-6 text-[#FF8C42]" />
              </div>
            </div>

            {/* Progress bar effect */}
            <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, (index + 1) * 16.67)}%` }}
              ></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsCards