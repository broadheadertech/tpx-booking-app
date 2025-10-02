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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = getIcon(stat.icon, stat.label)

        return (
          <div key={index} className="bg-[#1A1A1A] p-6 rounded-2xl border border-[#2A2A2A]/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-400 mb-2">{stat.label}</p>
                <p className="text-3xl font-black text-[#FF8C42]">{stat.value}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FF8C42]/20 flex items-center justify-center">
                <IconComponent className="h-6 w-6 text-[#FF8C42]" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsCards