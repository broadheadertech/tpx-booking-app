import React, { useState, useMemo } from 'react'
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addDays, 
  addMonths, 
  subMonths, 
  isSameDay, 
  isSameMonth, 
  setHours, 
  setMinutes, 
  differenceInMinutes, 
  startOfDay,
  addWeeks,
  subWeeks,
  subDays,
  parseISO
} from 'date-fns'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  MapPin, 
  DollarSign, 
  Scissors, 
  MoreVertical,
  X,
  CalendarDays,
  LayoutGrid,
  AlertCircle
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../common/Modal'

// Separate component to handle barber avatar display
const BarberAvatar = ({ barber, className = "w-12 h-12" }) => {
  const [imageError, setImageError] = useState(false)

  // Get image URL from Convex storage if available (pass undefined if no storageId)
  const imageUrlFromStorage = useQuery(api.services.barbers.getImageUrl, {
    storageId: barber.avatarStorageId
  })

  // Use storage URL if available, otherwise fallback to regular avatar or default
  const imageSrc = imageUrlFromStorage || barber.avatarUrl

  if (imageError || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-[#333] rounded-full ${className}`}>
        <User className="w-4 h-4 text-gray-400" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={`${barber.full_name} avatar`}
      className={`${className} rounded-full object-cover border border-[#333]`}
      onError={() => setImageError(true)}
    />
  )
}

const CalendarManagement = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('day') // 'day' or 'month'
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Configuration
  const START_HOUR = 8
  const END_HOUR = 20
  const HOUR_HEIGHT = 100 // px per hour in day view

  // Derived User State
  const isSuperAdmin = user?.role === 'super_admin'
  const branchId = user?.branch_id

  // Fetch Data - Always call hooks unconditionally
  // Bookings
  const allBookings = useQuery(api.services.bookings.getAllBookings, isSuperAdmin ? undefined : "skip")
  const branchBookings = useQuery(api.services.bookings.getBookingsByBranch, branchId && !isSuperAdmin ? { branch_id: branchId } : "skip")
  const bookings = (isSuperAdmin ? allBookings : branchBookings) || []

  // Services
  const allServices = useQuery(api.services.services.getAllServices, isSuperAdmin ? undefined : "skip")
  const branchServices = useQuery(api.services.services.getServicesByBranch, branchId && !isSuperAdmin ? { branch_id: branchId } : "skip")
  const services = (isSuperAdmin ? allServices : branchServices) || []

  // Barbers
  const allBarbers = useQuery(api.services.barbers.getActiveBarbers, isSuperAdmin ? undefined : "skip")
  const branchBarbers = useQuery(api.services.barbers.getBarbersByBranch, branchId && !isSuperAdmin ? { branch_id: branchId } : "skip")
  const rawBarbers = isSuperAdmin ? allBarbers : branchBarbers
  const barbers = (rawBarbers || []).filter(b => b.is_active)

  // Derived Data
  const timeSlots = useMemo(() => {
    const slots = []
    for (let i = START_HOUR; i <= END_HOUR; i++) {
      slots.push(i)
    }
    return slots
  }, [])

  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subDays(currentDate, 1))
    }
  }

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addDays(currentDate, 1))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const getBookingsForDay = (date, barberId = null) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date)
      const sameDay = isSameDay(bookingDate, date)
      if (!sameDay) return false
      if (barberId && booking.barber !== barberId) return false
      if (booking.status === 'cancelled') return false
      return true
    })
  }

  const getBookingStyle = (booking) => {
    const [hours, minutes] = booking.time.split(':').map(Number)
    const startMinutes = (hours - START_HOUR) * 60 + minutes
    const service = services.find(s => s._id === booking.service)
    const duration = service ? service.duration_minutes : 60
    
    return {
      top: `${(startMinutes / 60) * HOUR_HEIGHT}px`,
      height: `${(duration / 60) * HOUR_HEIGHT}px`,
      position: 'absolute',
      width: '95%',
      left: '2.5%'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 border-green-500 text-green-200'
      case 'completed': return 'bg-blue-500/20 border-blue-500 text-blue-200'
      case 'booked': return 'bg-purple-500/20 border-purple-500 text-purple-200'
      default: return 'bg-yellow-500/20 border-yellow-500 text-yellow-200'
    }
  }

  const handleBookingClick = (booking, e) => {
    e.stopPropagation()
    setSelectedBooking(booking)
    setShowDetailModal(true)
    setActionError(null)
  }
  
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      // Handle HH:mm:ss format
      const [hours, minutes] = timeStr.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes))
      return format(date, 'h:mm a')
    } catch (e) {
      return timeStr
    }
  }

  // Format customer name - extract readable name from guest IDs
  const formatCustomerName = (name) => {
    if (!name) return 'Walk-in'

    // Check if it's a guest format: guest_firstname_lastname_timestamp_id
    if (name.startsWith('guest_')) {
      const parts = name.split('_')
      // Extract name parts (skip 'guest' and numeric/id parts at the end)
      const nameParts = parts.slice(1).filter(part =>
        isNaN(part) && part.length > 4 // Filter out numbers and short IDs
      )
      if (nameParts.length > 0) {
        // Capitalize each word
        return nameParts
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ')
      }
    }

    return name
  }

  // Helper to calculate layout for overlapping bookings
  const calculateBookingLayout = (bookings) => {
    // Sort bookings by start time, then by duration (descending)
    const sortedBookings = [...bookings].sort((a, b) => {
      const aStart = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1])
      const bStart = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1])
      if (aStart !== bStart) return aStart - bStart
      
      // Secondary sort: longer duration first (helps with nesting)
      const aService = services.find(s => s._id === a.service)
      const bService = services.find(s => s._id === b.service)
      return (bService?.duration_minutes || 0) - (aService?.duration_minutes || 0)
    })

    const columns = []
    const layout = {}

    sortedBookings.forEach(booking => {
      const startHours = parseInt(booking.time.split(':')[0])
      const startMinutes = parseInt(booking.time.split(':')[1])
      const startTime = startHours * 60 + startMinutes
      
      const service = services.find(s => s._id === booking.service)
      const duration = service ? service.duration_minutes : 60
      const endTime = startTime + duration

      // Find the first column where this booking fits
      let columnIndex = 0
      let placed = false

      while (!placed) {
        if (!columns[columnIndex]) {
          columns[columnIndex] = []
        }

        // Check if overlapping with any booking in this column
        const hasOverlap = columns[columnIndex].some(b => {
          const bStartH = parseInt(b.time.split(':')[0])
          const bStartM = parseInt(b.time.split(':')[1])
          const bStart = bStartH * 60 + bStartM
          
          const bService = services.find(s => s._id === b.service)
          const bDur = bService ? bService.duration_minutes : 60
          const bEnd = bStart + bDur

          return (startTime < bEnd && endTime > bStart)
        })

        if (!hasOverlap) {
          columns[columnIndex].push(booking)
          layout[booking._id] = { columnIndex }
          placed = true
        } else {
          columnIndex++
        }
      }
    })

    // Calculate widths and positions
    const totalColumns = columns.length
    sortedBookings.forEach(booking => {
      const { columnIndex } = layout[booking._id]
      // Width is 100% divided by number of overlapping groups... 
      // A simpler approach for visual clarity:
      // If totalColumns > 1, we share width. 
      // Width = (100 - margin) / totalColumns
      // Left = columnIndex * Width
      
      const widthPercent = 95 / totalColumns
      const leftPercent = (columnIndex * widthPercent) + 2.5
      
      layout[booking._id] = {
        width: `${widthPercent}%`,
        left: `${leftPercent}%`,
        zIndex: columnIndex + 10
      }
    })

    return layout
  }

  // -- Renderers --

  const renderDayView = () => {
    return (
      <div className="flex flex-col h-[calc(100vh-240px)] overflow-hidden bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        {/* Header - Barbers */}
        <div className="flex border-b border-[#2A2A2A] bg-[#222]">
          <div className="w-16 flex-shrink-0 border-r border-[#2A2A2A] p-2"></div> {/* Time column header */}
          <div className="flex-1 flex overflow-x-auto scrollbar-hide">
            {barbers.map(barber => (
              <div key={barber._id} className="flex-1 min-w-[200px] p-3 border-r border-[#2A2A2A] text-center">
                <div className="flex items-center justify-center space-x-2">
                  <BarberAvatar barber={barber} className="w-8 h-8" />
                  <span className="font-bold text-white truncate">{barber.full_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid - Time Slots */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="flex min-h-full relative">
            {/* Time Labels */}
            <div className="w-16 flex-shrink-0 border-r border-[#2A2A2A] bg-[#1A1A1A] sticky left-0 z-10">
              {timeSlots.map(hour => (
                <div key={hour} className="relative border-b border-[#2A2A2A]/30" style={{ height: `${HOUR_HEIGHT}px` }}>
                  <span className="absolute -top-3 left-2 text-xs text-gray-500 font-medium">
                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Barber Columns */}
            <div className="flex-1 flex relative">
               {/* Horizontal Guidelines */}
               <div className="absolute inset-0 pointer-events-none z-0">
                {timeSlots.map(hour => (
                   <div key={hour} className="border-b border-[#2A2A2A]/30 w-full" style={{ height: `${HOUR_HEIGHT}px` }}></div>
                ))}
              </div>

              {barbers.map(barber => {
                const daysBookings = getBookingsForDay(currentDate, barber._id)
                // Calculate layout for this barber's column
                const layoutMap = calculateBookingLayout(daysBookings)
                
                return (
                  <div key={barber._id} className="flex-1 min-w-[200px] border-r border-[#2A2A2A] relative z-1">
                    {/* Bookings */}
                    {daysBookings.map(booking => {
                      const service = services.find(s => s._id === booking.service)
                      const serviceName = service ? service.name : 'Unknown Service'
                      const statusColor = getStatusColor(booking.status)
                      
                      // Get layout properties
                      const layout = layoutMap[booking._id] || { width: '95%', left: '2.5%', zIndex: 10 }
                      
                      // Calculate vertical position
                      const [hours, minutes] = booking.time.split(':').map(Number)
                      const startMinutes = (hours - START_HOUR) * 60 + minutes
                      const duration = service ? service.duration_minutes : 60
                      const top = (startMinutes / 60) * HOUR_HEIGHT
                      const height = (duration / 60) * HOUR_HEIGHT
                      
                      // Determine if this is a short booking (less than 45 minutes)
                      const isShortBooking = duration < 45

                      return (
                        <div
                          key={booking._id}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            position: 'absolute',
                            width: layout.width,
                            left: layout.left,
                            zIndex: layout.zIndex
                          }}
                          onClick={(e) => handleBookingClick(booking, e)}
                          className={`rounded-lg border-l-4 p-2 cursor-pointer hover:brightness-110 transition-all shadow-lg overflow-hidden ${statusColor}`}
                        >
                          {isShortBooking ? (
                            // Compact layout for short bookings - two rows
                            <div className="flex flex-col h-full justify-center gap-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white text-xs truncate">
                                  {formatCustomerName(booking.customer_name)}
                                </span>
                                <span className="text-[10px] font-medium opacity-90 whitespace-nowrap">
                                  {formatTime(booking.time)}
                                </span>
                              </div>
                              <div className="text-[10px] opacity-80 truncate">
                                {serviceName}
                              </div>
                            </div>
                          ) : (
                            // Full layout for longer bookings
                            <div className="flex flex-col h-full">
                              <div className="font-bold text-white text-sm leading-tight mb-0.5 line-clamp-1">
                                {formatCustomerName(booking.customer_name)}
                              </div>
                              <div className="text-xs opacity-90 leading-tight line-clamp-1">
                                {serviceName}
                              </div>
                              <div className="mt-auto flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-semibold opacity-95">
                                  {formatTime(booking.time)}
                                </span>
                                <span className="text-[10px] opacity-80">
                                  {duration} min
                                </span>
                              </div>
                              {booking.price && (
                                <div className="text-[10px] font-semibold text-white/90 mt-0.5">
                                  ${booking.price}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weeks = []
    let week = []
    
    days.forEach(day => {
      week.push(day)
      if (week.length === 7) {
        weeks.push(week)
        week = []
      }
    })

    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden flex flex-col h-[calc(100vh-240px)]">
        {/* Weekday Headers - Responsive */}
        <div className="grid grid-cols-7 border-b border-[#2A2A2A] bg-[#222]">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="p-1 sm:p-3 text-center text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider">
              <span className="hidden sm:inline">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index]}
              </span>
              <span className="sm:hidden">
                {day}
              </span>
            </div>
          ))}
        </div>
        
        {/* Calendar Grid - Responsive */}
        <div className="flex-1 grid grid-rows-5 sm:grid-rows-6 overflow-hidden">
           {weeks.map((weekRow, i) => (
             <div key={i} className="grid grid-cols-7 h-full min-h-0">
               {weekRow.map(day => {
                 const isCurrentMonth = isSameMonth(day, monthStart)
                 const isToday = isSameDay(day, new Date())
                 const dayBookings = getBookingsForDay(day)
                 
                 return (
                   <div 
                     key={day.toString()} 
                     onClick={() => {
                        setCurrentDate(day)
                        setView('day')
                     }}
                     className={`
                       border-r border-b border-[#2A2A2A] p-1 sm:p-2 transition-colors cursor-pointer relative group overflow-hidden
                       ${!isCurrentMonth ? 'bg-[#111] text-gray-600' : 'bg-[#1A1A1A] text-white hover:bg-[#222]'}
                       ${isToday ? 'bg-[var(--color-primary)]/10' : ''}
                     `}
                   >
                     {/* Day Number - Responsive sizing */}
                     <div className={`
                       flex items-center justify-center rounded-full text-sm sm:text-sm font-bold mb-1
                       ${isToday ? 'w-6 h-6 sm:w-7 sm:h-7 bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30' : 'w-6 h-6 sm:w-7 sm:h-7'}
                     `}>
                       {format(day, 'd')}
                     </div>
                     
                     {/* Booking Indicators - Responsive */}
                     <div className="space-y-0.5 sm:space-y-1 overflow-hidden">
                       {/* On mobile, show fewer booking details with different format */}
                       <div className="sm:hidden">
                         {dayBookings.length > 0 && (
                           <div className="text-[8px] text-center bg-[#2A2A2A] rounded px-1 py-0.5 text-[var(--color-primary)] font-medium">
                             {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                           </div>
                         )}
                       </div>
                       
                       {/* Desktop view - show booking details */}
                       <div className="hidden sm:block space-y-1 overflow-y-auto max-h-[calc(100%-35px)] custom-scrollbar">
                         {dayBookings.slice(0, 3).map(booking => (
                           <div 
                             key={booking._id} 
                             className="text-[10px] truncate px-1.5 py-0.5 rounded bg-[#2A2A2A] text-gray-300 border border-[#333] hover:bg-[#333] transition-colors"
                           >
                             <span className="font-medium">{formatTime(booking.time)}</span> {booking.customer_name?.split(' ')[0]}
                           </div>
                         ))}
                         {dayBookings.length > 3 && (
                           <div className="text-[10px] text-center text-gray-500 font-medium px-1.5 py-0.5">
                             +{dayBookings.length - 3} more
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 )
               })}
             </div>
           ))}
        </div>
      </div>
    )
  }

  const renderBookingDetails = () => {
    if (!selectedBooking) return null
    
    const service = services.find(s => s._id === selectedBooking.service)
    const barber = barbers.find(b => b._id === selectedBooking.barber)
    
    return (
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Booking Details"
        maxWidth="max-w-md"
        variant="dark"
      >
        <div className="space-y-6">
          {actionError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {actionError}
            </div>
          )}
        
          {/* Header Info */}
          <div className="flex items-center space-x-4 pb-4 border-b border-[#2A2A2A]">
             <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
               <User className="w-6 h-6 text-[var(--color-primary)]" />
             </div>
             <div>
               <h3 className="text-xl font-bold text-white">{selectedBooking.customer_name || 'Walk-in Customer'}</h3>
               <p className="text-gray-400 text-sm">{selectedBooking.customer_phone || 'No phone number'}</p>
               <p className="text-gray-500 text-xs mt-1 font-mono">#{selectedBooking.booking_code}</p>
             </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A]">
              <div className="flex items-center space-x-2 text-gray-400 mb-1">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Date</span>
              </div>
              <p className="text-white font-medium">{format(new Date(selectedBooking.date), 'MMM dd, yyyy')}</p>
            </div>
            <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A]">
              <div className="flex items-center space-x-2 text-gray-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Time</span>
              </div>
              <p className="text-white font-medium">{formatTime(selectedBooking.time)}</p>
            </div>
             <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A]">
              <div className="flex items-center space-x-2 text-gray-400 mb-1">
                <Scissors className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Service</span>
              </div>
              <p className="text-white font-medium truncate">{service?.name || 'Unknown'}</p>
            </div>
             <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A]">
              <div className="flex items-center space-x-2 text-gray-400 mb-1">
                <User className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Barber</span>
              </div>
              <p className="text-white font-medium truncate">{barber?.full_name || 'Any Staff'}</p>
            </div>
          </div>
          
          {/* Price & Status */}
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A] flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Total Price</span>
              <span className="text-2xl font-black text-[var(--color-primary)]">${selectedBooking.price}</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(selectedBooking.status)}`}>
              {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
            </div>
          </div>

          {selectedBooking.notes && (
            <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]">
              <span className="text-xs text-gray-400 font-bold uppercase block mb-2">Notes</span>
              <p className="text-gray-300 text-sm italic">"{selectedBooking.notes}"</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button 
              onClick={() => setShowDetailModal(false)}
              className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333] text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-black text-white">
            {format(currentDate, view === 'month' ? 'MMMM yyyy' : 'EEEE, MMM d, yyyy')}
          </h2>
          <div className="flex items-center bg-[#2A2A2A] rounded-lg p-1 border border-[#333]">
            <button 
              onClick={handlePrev}
              className="p-1 hover:bg-[#333] text-gray-400 hover:text-white rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-gray-300 hover:text-white transition-colors"
            >
              Today
            </button>
             <button 
              onClick={handleNext}
              className="p-1 hover:bg-[#333] text-gray-400 hover:text-white rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center bg-[#2A2A2A] rounded-lg p-1 border border-[#333]">
           <button 
            onClick={() => setView('day')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === 'day' 
                ? 'bg-[var(--color-primary)] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-[#333]'
            }`}
           >
             <LayoutGrid className="w-4 h-4" />
             <span>Day View</span>
           </button>
           <button 
            onClick={() => setView('month')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === 'month' 
                ? 'bg-[var(--color-primary)] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-[#333]'
            }`}
           >
             <CalendarDays className="w-4 h-4" />
             <span>Month View</span>
           </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1">
        {view === 'day' ? renderDayView() : renderMonthView()}
      </div>

      {/* Details Modal */}
      {showDetailModal && renderBookingDetails()}
    </div>
  )
}

export default CalendarManagement
