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
  LayoutGrid
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
                
                return (
                  <div key={barber._id} className="flex-1 min-w-[200px] border-r border-[#2A2A2A] relative z-1">
                    {/* Bookings */}
                    {daysBookings.map(booking => {
                      const service = services.find(s => s._id === booking.service)
                      const serviceName = service ? service.name : 'Unknown Service'
                      const statusColor = getStatusColor(booking.status)
                      
                      return (
                        <div
                          key={booking._id}
                          style={getBookingStyle(booking)}
                          onClick={(e) => handleBookingClick(booking, e)}
                          className={`rounded-lg border-l-4 p-2 text-xs cursor-pointer hover:brightness-110 transition-all shadow-lg overflow-hidden flex flex-col z-10 ${statusColor}`}
                        >
                          <div className="font-bold truncate">{booking.customer_name || 'Walk-in Customer'}</div>
                          <div className="truncate opacity-80">{serviceName}</div>
                          <div className="mt-auto flex items-center justify-between">
                             <span className="font-mono opacity-75">{booking.time}</span>
                          </div>
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
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-[#2A2A2A] bg-[#222]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-bold text-gray-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="flex-1 grid grid-rows-5 sm:grid-rows-6">
           {weeks.map((weekRow, i) => (
             <div key={i} className="grid grid-cols-7 h-full">
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
                       border-r border-b border-[#2A2A2A] p-2 transition-colors cursor-pointer relative group
                       ${!isCurrentMonth ? 'bg-[#111] text-gray-600' : 'bg-[#1A1A1A] text-white hover:bg-[#222]'}
                       ${isToday ? 'bg-[var(--color-primary)]/10' : ''}
                     `}
                   >
                     <div className={`
                       w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1
                       ${isToday ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30' : ''}
                     `}>
                       {format(day, 'd')}
                     </div>
                     
                     {/* Booking Indicators */}
                     <div className="space-y-1 overflow-y-auto max-h-[calc(100%-30px)] custom-scrollbar">
                       {dayBookings.slice(0, 4).map(booking => (
                         <div key={booking._id} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-[#2A2A2A] text-gray-300 border border-[#333]">
                           {booking.time} {booking.customer_name}
                         </div>
                       ))}
                       {dayBookings.length > 4 && (
                         <div className="text-[10px] text-center text-gray-500 font-medium">
                           +{dayBookings.length - 4} more
                         </div>
                       )}
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
      >
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center space-x-4 pb-4 border-b border-[#2A2A2A]">
             <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
               <User className="w-6 h-6 text-[var(--color-primary)]" />
             </div>
             <div>
               <h3 className="text-xl font-bold text-white">{selectedBooking.customer_name || 'Walk-in Customer'}</h3>
               <p className="text-gray-400 text-sm">{selectedBooking.customer_phone || 'No phone number'}</p>
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
              <p className="text-white font-medium">{selectedBooking.time}</p>
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
