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
          <div key={index} className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">{stat.label}</p>
                <p className="text-2xl font-bold text-[#FF8C42]">{stat.value}</p>
              </div>
              <IconComponent className="h-8 w-8 text-[#FF8C42] opacity-30" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsCards