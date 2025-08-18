import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { LayoutDashboard, Users, Calendar, Scissors, Gift, BarChart3, UserCheck, CalendarDays, Package, ChevronDown, Building2, ShoppingBag, Bell } from 'lucide-react'

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  const [openDropdown, setOpenDropdown] = useState(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 200 })
  const dropdownRef = useRef(null)
  const buttonRefs = useRef({})
  const portalDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideMainComponent = dropdownRef.current && dropdownRef.current.contains(event.target)
      const isInsidePortalDropdown = portalDropdownRef.current && portalDropdownRef.current.contains(event.target)
      
      if (!isInsideMainComponent && !isInsidePortalDropdown) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Calculate dropdown position
  const calculateDropdownPosition = (buttonElement) => {
    if (!buttonElement) return
    
    const rect = buttonElement.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
    
    setDropdownPosition({
      top: rect.bottom + scrollTop + 8,
      left: rect.left + scrollLeft,
      width: Math.max(200, rect.width)
    })
  }

  const handleDropdownToggle = (groupKey) => {
    const isOpening = openDropdown !== groupKey
    setOpenDropdown(isOpening ? groupKey : null)
    
    if (isOpening && buttonRefs.current[groupKey]) {
      calculateDropdownPosition(buttonRefs.current[groupKey])
    }
  }

  const getIconComponent = (tabId) => {
    const iconMap = {
      overview: LayoutDashboard,
      customers: Users,
      bookings: Calendar,
      services: Scissors,
      vouchers: Gift,
      reports: BarChart3,
      barbers: UserCheck,
      events: CalendarDays,
      products: Package,
      notifications: Bell
    }
    return iconMap[tabId] || LayoutDashboard
  }

  // Group tabs into categories
  const tabGroups = {
    core: {
      label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: tabs.filter(tab => ['overview', 'reports'].includes(tab.id))
    },
    management: {
      label: 'Management',
      icon: Building2,
      tabs: tabs.filter(tab => ['customers', 'bookings', 'barbers'].includes(tab.id))
    },
    business: {
      label: 'Business',
      icon: ShoppingBag,
      tabs: tabs.filter(tab => ['services', 'vouchers', 'events', 'products'].includes(tab.id))
    },
    notifications: {
      label: 'Notifications',
      icon: Bell,
      tabs: tabs.filter(tab => ['notifications'].includes(tab.id))
    }
  }

  const getActiveGroup = () => {
    for (const [groupKey, group] of Object.entries(tabGroups)) {
      if (group.tabs.some(tab => tab.id === activeTab)) {
        return groupKey
      }
    }
    return 'core'
  }

  const activeGroup = getActiveGroup()
  const activeTabData = tabs.find(tab => tab.id === activeTab)

  // Portal-based dropdown component
  const DropdownPortal = ({ groupKey, group }) => {
    if (openDropdown !== groupKey) return null

    return createPortal(
      <div 
        ref={portalDropdownRef}
        className="fixed bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-[9999]"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          minWidth: `${dropdownPosition.width}px`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {group.tabs.map((tab) => {
          const IconComponent = getIconComponent(tab.id)
          return (
            <button
              key={tab.id}
              onClick={(e) => {
                e.stopPropagation()
                console.log('Tab clicked:', tab.id)
                onTabChange(tab.id)
                setOpenDropdown(null)
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-500'
                  : 'text-gray-700'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>,
      document.body
    )
  }

  return (
    <div ref={dropdownRef} className="bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-xl shadow-black/5 overflow-hidden">
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-center p-2">
        <div className="flex items-center space-x-2 bg-gray-50/80 rounded-xl p-1">
          {Object.entries(tabGroups).map(([groupKey, group]) => {
            const isActiveGroup = groupKey === activeGroup
            const GroupIcon = group.icon
            const isStandaloneTab = group.tabs.length === 1
            
            return (
              <div key={groupKey} className="relative">
                <button
                  ref={(el) => buttonRefs.current[groupKey] = el}
                  onClick={() => isStandaloneTab ? onTabChange(group.tabs[0].id) : handleDropdownToggle(groupKey)}
                  className={`relative flex items-center space-x-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-300 group ${
                    isActiveGroup
                      ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg shadow-[#FF8C42]/25'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80 hover:shadow-sm'
                  }`}
                >
                  <GroupIcon className="w-5 h-5" />
                  <span className="whitespace-nowrap">{group.label}</span>
                  {isActiveGroup && activeTabData && !isStandaloneTab && (
                    <span className="text-xs opacity-75">• {activeTabData.label}</span>
                  )}
                  {!isStandaloneTab && (
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                      openDropdown === groupKey ? 'rotate-180' : ''
                    }`} />
                  )}
                </button>
                {!isStandaloneTab && <DropdownPortal groupKey={groupKey} group={group} />}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Tablet Navigation */}
      <nav className="hidden md:flex lg:hidden items-center justify-center p-2">
        <div className="flex items-center space-x-1 bg-gray-50/80 rounded-xl p-1 overflow-x-auto scrollbar-hide max-w-full">
          {Object.entries(tabGroups).map(([groupKey, group]) => {
             const isActiveGroup = groupKey === activeGroup
             const GroupIcon = group.icon
             const isStandaloneTab = group.tabs.length === 1
             
             return (
               <div key={groupKey} className="relative flex-shrink-0">
                  <button
                    ref={(el) => buttonRefs.current[`tablet-${groupKey}`] = el}
                    onClick={() => isStandaloneTab ? onTabChange(group.tabs[0].id) : handleDropdownToggle(groupKey)}
                    className={`relative flex items-center space-x-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap ${
                      isActiveGroup
                        ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                    }`}
                  >
                    <GroupIcon className="w-4 h-4" />
                    <span>{group.label}</span>
                    {!isStandaloneTab && (
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                        openDropdown === groupKey ? 'rotate-180' : ''
                      }`} />
                    )}
                  </button>
                  {!isStandaloneTab && <DropdownPortal groupKey={groupKey} group={group} />}
                </div>
             )
           })}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden">
        <div className="flex overflow-x-auto scrollbar-hide p-2 space-x-1">
          {Object.entries(tabGroups).map(([groupKey, group]) => {
             const isActiveGroup = groupKey === activeGroup
             const GroupIcon = group.icon
             const isStandaloneTab = group.tabs.length === 1
             
             return (
               <div key={groupKey} className="relative flex-shrink-0">
                  <button
                    ref={(el) => buttonRefs.current[`mobile-${groupKey}`] = el}
                    onClick={() => isStandaloneTab ? onTabChange(group.tabs[0].id) : handleDropdownToggle(groupKey)}
                    className={`flex flex-col items-center justify-center min-w-[70px] px-2 py-3 rounded-xl font-medium text-xs transition-all duration-300 whitespace-nowrap ${
                      isActiveGroup
                        ? 'bg-gradient-to-b from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <GroupIcon className="w-5 h-5 mb-1" />
                    <span className="font-semibold">{group.label}</span>
                    {!isStandaloneTab && (
                      <ChevronDown className={`w-3 h-3 mt-0.5 transition-transform duration-200 ${
                        openDropdown === groupKey ? 'rotate-180' : ''
                      }`} />
                    )}
                  </button>
                  {!isStandaloneTab && <DropdownPortal groupKey={groupKey} group={group} />}
                </div>
             )
           })}
        </div>
      </nav>

    </div>
  )
}

export default TabNavigation