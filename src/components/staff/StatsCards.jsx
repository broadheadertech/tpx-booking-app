import React from 'react'
import { DollarSign, Calendar, Users, Gift, Star, Scissors, Award } from 'lucide-react'

const StatsCards = ({ stats = [] }) => {
  // Icon mapping for different stat types
  const getIcon = (iconPath, label) => {
    // Map common icons based on label
    if (label.toLowerCase().includes('revenue')) return DollarSign
    if (label.toLowerCase().includes('booking') || label.toLowerCase().includes('appointment')) return Calendar
    if (label.toLowerCase().includes('customer') || label.toLowerCase().includes('client')) return Users
    if (label.toLowerCase().includes('voucher')) return Gift
    if (label.toLowerCase().includes('service')) return Star
    if (label.toLowerCase().includes('barber')) return Scissors
    if (label.toLowerCase().includes('point')) return Award

    // Default fallback
    return Star
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {stats.map((stat, index) => {
        const IconComponent = getIcon(stat.icon, stat.label)

        return (
          <div key={index} className="bg-[#1A1A1A] p-3 sm:p-4 rounded-xl border border-[#2A2A2A]/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 mb-1 truncate">{stat.label}</p>
                <p className="text-2xl font-bold text-[#FF8C42]">{stat.value}</p>
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