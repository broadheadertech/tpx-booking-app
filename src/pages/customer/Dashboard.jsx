import React, { useState, useEffect } from 'react'
import { Home, Calendar, Gift, Star, Clock, MapPin, Phone, History, User, ShoppingBag } from 'lucide-react'
import ServiceBooking from '../../components/customer/ServiceBooking'
import CustomerProfile from '../../components/customer/CustomerProfile'
import VoucherManagement from '../../components/customer/VoucherManagement'
import LoyaltyPoints from '../../components/customer/LoyaltyPoints'
import MyBookings from '../../components/customer/MyBookings'
import ProductShop from '../../components/customer/ProductShop'
import Profile from './Profile'
import bannerImage from '../../assets/img/banner.jpg'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const [activeSection, setActiveSection] = useState('home')

  // Convex queries
  const services = useQuery(api.services.services.getActiveServices)
  const barbers = useQuery(api.services.barbers.getActiveBarbers)
  const bookings = user?.id ? useQuery(api.services.bookings.getBookingsByCustomer, { customerId: user.id }) : undefined
  const vouchers = user?.id ? useQuery(api.services.vouchers.getVouchersByUser, { userId: user.id }) : undefined

  const sections = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shop', label: 'Shop', icon: ShoppingBag },
    { id: 'bookings', label: 'Bookings', icon: History },
    { id: 'vouchers', label: 'Vouchers', icon: Gift },
    { id: 'profile', label: 'Profile', icon: User }
  ]

  // Calculate dashboard stats from Convex data
  const calculateStats = () => {
    const totalBookings = bookings ? bookings.length : 0
    
    // Count active vouchers (assigned and not expired)
    const activeVouchers = vouchers ? vouchers.filter(v => 
      v.status === 'assigned' && !v.isExpired
    ).length : 0
    
    return {
      totalBookings,
      activeVouchers
    }
  }

  const stats = calculateStats()

  const quickStats = [
    {
      label: 'Total Bookings',
      value: stats.totalBookings.toString(),
      icon: Clock
    },
    {
      label: 'Active Vouchers',
      value: stats.activeVouchers.toString(),
      icon: Gift
    }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'shop':
        return <ProductShop onBack={() => setActiveSection('home')} />
      case 'booking':
        return <ServiceBooking onBack={() => setActiveSection('home')} />
      case 'bookings':
        return <MyBookings onBack={() => setActiveSection('home')} />
      case 'vouchers':
        return <VoucherManagement onBack={() => setActiveSection('home')} />
      case 'loyalty':
        return <LoyaltyPoints onBack={() => setActiveSection('home')} />
      case 'profile':
        return <Profile />
      default:
        return (
          <div className="space-y-6">
            {/* Hero Section with Image */}
            <div className="relative overflow-hidden">
              {/* Background Image */}
              <div className="h-56 relative">
                {/* Banner Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${bannerImage})`,
                    filter: 'brightness(0.7) contrast(1.1)'
                  }}
                ></div>
                
                {/* Gradient Overlays for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 via-transparent to-black/60"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                
                {/* Animated particles effect */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 w-2 h-2 bg-orange-300 rounded-full animate-pulse"></div>
                  <div className="absolute top-12 right-8 w-1 h-1 bg-white rounded-full animate-ping"></div>
                  <div className="absolute bottom-16 left-8 w-1.5 h-1.5 bg-orange-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <div className="absolute bottom-8 right-4 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
                </div>
                
                {/* Bottom wave */}
                <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 1440 120" fill="none">
                  <path d="M0,64L1440,96L1440,120L0,120Z" fill="#F4F0E6"></path>
                </svg>
              </div>
              
              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6">
                {/* Professional Typography */}
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-light text-white drop-shadow-2xl tracking-wider">
                    <span className="font-thin">TPX</span>
                    <span className="font-extralight text-orange-200 ml-2">BARBERSHOP</span>
                  </h1>
                  
                  {/* Minimalist divider */}
                  <div className="flex justify-center">
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent"></div>
                  </div>
                  
                  <p className="text-white/80 font-light text-sm tracking-widest uppercase">
                    Premium Grooming
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats - Simplified */}
            <div className="px-4 -mt-6 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                {quickStats.map((stat) => {
                  const IconComponent = stat.icon
                  return (
                    <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-lg border" style={{borderColor: '#E0E0E0'}}>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{backgroundColor: '#F68B24'}}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold" style={{color: '#36454F'}}>{stat.value}</div>
                        <div className="text-sm font-medium" style={{color: '#8B8B8B'}}>{stat.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Main Actions - Streamlined */}
            <div className="px-4 space-y-4">
         
              {/* Primary Action - Book Service */}
              <button
                onClick={() => setActiveSection('booking')}
                className="w-full p-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Book Your Service</h3>
                    <p className="text-white/80">Schedule your next appointment</p>
                  </div>
                </div>
              </button>

              {/* Secondary Actions */}
            
            </div>

            {/* Shop Info */}
            <div className="bg-white mx-4 rounded-xl p-4 shadow-sm border" style={{borderColor: '#E0E0E0'}}>
              <h3 className="text-sm font-bold mb-3 text-center" style={{color: '#36454F'}}>Shop Information</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                    <MapPin className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{color: '#8B8B8B'}}>123 Main Street, Quezon City</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                    <Phone className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{color: '#8B8B8B'}}>+63 912 345 6789</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{color: '#8B8B8B'}}>9:00 AM - 8:00 PM (Mon-Sat)</span>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{backgroundColor: '#36454F'}}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1" style={{backgroundColor: '#F68B24'}}>
                <img 
                  src="/img/pnglog.png" 
                  alt="TPX Barbershop Logo" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(7500%) hue-rotate(106deg) brightness(109%) contrast(103%)'
                  }}
                />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">TPX Barbershop</h1>
                <p className="text-xs font-medium" style={{color: '#F68B24'}}>Dashboard</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-white">Welcome</p>
              <p className="text-xs text-gray-300">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto pb-20">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl" style={{borderTop: '1px solid #E0E0E0'}}>
        <div className="max-w-md mx-auto px-3">
          <div className="grid grid-cols-5 py-2">
            {sections.map((section) => {
              const IconComponent = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-300 relative"
                  style={{
                    backgroundColor: isActive ? '#F68B24' : 'transparent',
                    color: isActive ? 'white' : '#8B8B8B'
                  }}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <div 
                      className="absolute -top-1 w-1 h-1 rounded-full"
                      style={{backgroundColor: '#36454F'}}
                    />
                  )}
                  
                  <div className={`p-2 rounded-xl mb-1 transition-all duration-300 ${isActive ? 'bg-white/20 scale-110' : 'bg-transparent'}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium tracking-wide">{section.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard