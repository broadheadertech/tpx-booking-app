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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50 animate-pulse">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-600 rounded w-16"></div>
                <div className="h-6 bg-gray-600 rounded w-12"></div>
              </div>
              <div className="w-10 h-10 bg-gray-600 rounded-lg flex-shrink-0"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, index) => {
        const IconComponent = getIconComponent(stat.icon)

        return (
          <div key={index} className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 mb-1 truncate">{stat.label}</p>
                <p className="text-2xl font-bold text-[#FF8C42]">{stat.value}</p>
                {stat.subtext && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{stat.subtext}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center flex-shrink-0">
                <IconComponent className="h-5 w-5 text-[#FF8C42]" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsCards