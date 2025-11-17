import React from 'react'
import Card from '../common/Card'
import { Edit, Eye, Plus } from 'lucide-react'

const ManagementSection = ({ activeTab, data }) => {
  const renderCustomerCard = (item) => (
    <div>
      <div className="flex items-center space-x-4 mb-4">
        <h3 className="text-xl font-black text-white">{item.name}</h3>
        <span className={`px-4 py-2 text-sm font-bold rounded-full border-2 ${
          item.status === 'active' 
            ? 'bg-green-400/20 text-green-400 border-green-400/30' 
            : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30'
        }`}>
          {item.status}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="space-y-2">
          <p className="font-black text-white text-base uppercase tracking-wide">Contact</p>
          <p className="text-gray-400 font-medium">{item.email}</p>
          <p className="text-gray-400 font-medium">{item.phone}</p>
        </div>
        <div className="space-y-2">
          <p className="font-black text-white text-base uppercase tracking-wide">Loyalty</p>
          <p className="text-[var(--color-primary)] font-black text-xl">{item.points} points</p>
          <p className="text-gray-400 font-medium">{item.visits} total visits</p>
        </div>
        <div className="space-y-2">
          <p className="font-black text-white text-base uppercase tracking-wide">Last Visit</p>
          <p className="text-gray-400 font-bold">{item.lastVisit}</p>
        </div>
      </div>
    </div>
  )

  const renderVoucherCard = (item) => (
    <div>
      <div className="flex items-center space-x-4 mb-4">
        <h3 className="text-xl font-black text-white font-mono bg-[#2A2A2A] px-4 py-2 rounded-xl border border-[#3A3A3A]">{item.code}</h3>
        <span className={`px-4 py-2 text-sm font-bold rounded-full border-2 ${
          item.status === 'active' 
            ? 'bg-green-400/20 text-green-400 border-green-400/30' 
            : 'bg-gray-400/20 text-gray-400 border-gray-400/30'
        }`}>
          {item.status}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="space-y-2">
          <p className="font-black text-[#1A1A1A] text-base uppercase tracking-wide">Customer</p>
          <p className="text-[#6B6B6B] font-medium">{item.customer}</p>
        </div>
        <div className="space-y-2">
          <p className="font-black text-[#1A1A1A] text-base uppercase tracking-wide">Value</p>
          <p className="text-[var(--color-primary)] font-black text-xl">{item.value}</p>
        </div>
        <div className="space-y-2">
          <p className="font-black text-[#1A1A1A] text-base uppercase tracking-wide">Expires</p>
          <p className="text-[#6B6B6B] font-bold">{item.expires}</p>
        </div>
      </div>
    </div>
  )

  const renderBookingCard = (item) => (
    <div>
      <div className="flex items-center space-x-4 mb-4">
        <h3 className="text-xl font-black text-[#1A1A1A]">{item.customer}</h3>
        <span className={`px-4 py-2 text-sm font-bold rounded-full border-2 ${
          item.status === 'confirmed' 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
        }`}>
          {item.status}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
        <div className="space-y-2">
          <p className="font-black text-[#1A1A1A] text-base uppercase tracking-wide">Service</p>
          <p className="text-[#6B6B6B] font-medium">{item.service}</p>
        </div>
        <div className="space-y-2">
          <p className="font-black text-[#1A1A1A] text-base uppercase tracking-wide">Date & Time</p>
          <p className="text-[#6B6B6B] font-bold">{item.date}</p>
          <p className="text-[#6B6B6B] font-medium">{item.time}</p>
        </div>
        <div className="space-y-2">
          <p className="font-black text-[#1A1A1A] text-base uppercase tracking-wide">Staff</p>
          <p className="text-[#6B6B6B] font-medium">{item.staff}</p>
        </div>
        <div className="space-y-2">
          <p className="font-black text-[#1A1A1A] text-base uppercase tracking-wide">Price</p>
          <p className="text-[var(--color-primary)] font-black text-xl">{item.price}</p>
        </div>
      </div>
    </div>
  )

  const renderServiceCard = (item) => {
    return (
      <div className="relative">
        {/* Service Header */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-white font-black text-2xl">{item.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-[#1A1A1A] mb-1 truncate whitespace-nowrap overflow-hidden">{item.name}</h3>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-[#F5F5F5] text-[#6B6B6B] rounded-full text-sm font-semibold truncate whitespace-nowrap">
                {item.category}
              </span>
              <span className="text-[#6B6B6B] text-sm font-medium whitespace-nowrap">{item.duration}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/5 rounded-xl border-2 border-[var(--color-primary)]/20">
            <div className="text-lg font-black text-[var(--color-primary)] mb-1 truncate whitespace-nowrap overflow-hidden">{item.price}</div>
            <div className="text-xs text-[#6B6B6B] font-semibold whitespace-nowrap">Price</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-25 rounded-xl border-2 border-blue-200">
            <div className="text-lg font-black text-blue-600 mb-1 whitespace-nowrap">{item.bookings}</div>
            <div className="text-xs text-[#6B6B6B] font-semibold whitespace-nowrap">Bookings</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-25 rounded-xl border-2 border-green-200">
            <div className="text-lg font-black text-green-600 mb-1 truncate whitespace-nowrap overflow-hidden">{item.revenue}</div>
            <div className="text-xs text-[#6B6B6B] font-semibold whitespace-nowrap">Revenue</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button className="flex-1 py-3 px-4 text-sm border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl">
            <Edit className="w-4 h-4" />
            <span className="whitespace-nowrap">Edit</span>
          </button>
          <button className="flex-1 py-3 px-4 text-sm bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] text-white hover:scale-105 font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl">
            <Eye className="w-4 h-4" />
            <span className="whitespace-nowrap">View</span>
          </button>
        </div>
      </div>
    )
  }

  const renderCardContent = (item) => {
    switch (activeTab) {
      case 'customers':
        return renderCustomerCard(item)
      case 'vouchers':
        return renderVoucherCard(item)
      case 'bookings':
        return renderBookingCard(item)
      case 'services':
        return renderServiceCard(item)
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-white capitalize">
          {activeTab} Management
        </h2>
        <button className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:shadow-lg text-white font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center space-x-2 text-sm whitespace-nowrap w-auto inline-flex">
          <Plus className="w-4 h-4" />
          <span>Add New {activeTab.slice(0, -1)}</span>
        </button>
      </div>
      
      {/* Grid Layout for Services */}
      {activeTab === 'services' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {data?.map((item) => (
            <Card 
              key={item.id} 
              className="p-8 bg-gradient-to-br from-[#2A2A2A] to-[#333333] border-2 border-[#444444]/50 hover:border-[var(--color-primary)]/30 hover:shadow-2xl transition-all duration-300 rounded-3xl group hover:-translate-y-2"
            >
              {renderCardContent(item)}
            </Card>
          )) || []}
        </div>
      ) : (
        /* List Layout for Other Tabs */
        <div className="grid gap-6">
          {data?.map((item) => (
            <Card 
              key={item.id} 
              className="p-8 bg-gradient-to-br from-[#2A2A2A] to-[#333333] border-2 border-[#444444]/50 hover:border-[var(--color-primary)]/30 hover:shadow-2xl transition-all duration-300 rounded-3xl group hover:-translate-y-1"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {renderCardContent(item)}
                </div>
                <div className="flex space-x-4 ml-8">
                  <button className="px-6 py-3 text-sm border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white font-bold transition-all duration-300 rounded-xl flex items-center space-x-2 shadow-lg hover:shadow-xl">
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button className="px-6 py-3 text-sm bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] text-white hover:scale-105 font-bold transition-all duration-300 rounded-xl flex items-center space-x-2 shadow-lg hover:shadow-2xl">
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            </Card>
          )) || []}
        </div>
      )}
    </div>
  )
}

export default ManagementSection