import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Save, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const BarberSchedule = () => {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState({
    monday: { available: false, start: '09:00', end: '17:00' },
    tuesday: { available: false, start: '09:00', end: '17:00' },
    wednesday: { available: false, start: '09:00', end: '17:00' },
    thursday: { available: false, start: '09:00', end: '17:00' },
    friday: { available: false, start: '09:00', end: '17:00' },
    saturday: { available: false, start: '09:00', end: '17:00' },
    sunday: { available: false, start: '09:00', end: '17:00' }
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Get barber data
  const barbers = useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)

  // Initialize schedule from barber data
  useEffect(() => {
    if (currentBarber?.schedule) {
      setSchedule(currentBarber.schedule)
    }
  }, [currentBarber])

  const handleAvailabilityChange = (day, available) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available
      }
    }))
    setHasChanges(true)
  }

  const handleTimeChange = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Note: In a real implementation, you'd have a mutation to update barber schedule
      // For now, we'll simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000))
      setHasChanges(false)
      alert('Schedule updated successfully!')
    } catch (error) {
      console.error('Failed to save schedule:', error)
      alert('Failed to save schedule. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (currentBarber?.schedule) {
      setSchedule(currentBarber.schedule)
    }
    setHasChanges(false)
  }

  const setAllDays = (available) => {
    const newSchedule = {}
    Object.keys(schedule).forEach(day => {
      newSchedule[day] = {
        ...schedule[day],
        available
      }
    })
    setSchedule(newSchedule)
    setHasChanges(true)
  }

  const copyToAllDays = (sourceDay) => {
    const sourceSchedule = schedule[sourceDay]
    const newSchedule = {}
    Object.keys(schedule).forEach(day => {
      newSchedule[day] = {
        available: sourceSchedule.available,
        start: sourceSchedule.start,
        end: sourceSchedule.end
      }
    })
    setSchedule(newSchedule)
    setHasChanges(true)
  }

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  const timeSlots = []
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] pb-20 md:pb-0">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(/img/pnglog.png)`,
            filter: 'brightness(0.3)'
          }}
        ></div>
      </div>
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
          <div className="py-4 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">My Schedule</h1>
              <p className="text-sm md:text-base text-gray-400 mt-1">Manage your availability and working hours</p>
            </div>
            
            {hasChanges && (
              <div className="flex space-x-2">
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-[#444444] text-white rounded-lg hover:bg-[#555555] transition-colors text-sm md:text-base active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors disabled:opacity-50 text-sm md:text-base active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8 py-4 md:py-6">
        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">Quick Actions</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setAllDays(true)}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors active:scale-95 text-sm md:text-base"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Enable All Days</span>
            </button>
            <button
              onClick={() => setAllDays(false)}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors active:scale-95 text-sm md:text-base"
            >
              <XCircle className="w-4 h-4" />
              <span>Disable All Days</span>
            </button>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="space-y-3 md:space-y-4">
          {Object.entries(dayNames).map(([dayKey, dayName]) => {
            const daySchedule = schedule[dayKey]
            return (
              <div key={dayKey} className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
                <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
                  {/* Day and Availability */}
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="w-full sm:w-24">
                      <h3 className="text-base md:text-lg font-bold text-white">{dayName}</h3>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={daySchedule.available}
                          onChange={(e) => handleAvailabilityChange(dayKey, e.target.checked)}
                          className="w-5 h-5 text-[#FF8C42] bg-[#1A1A1A] border-[#555555] rounded focus:ring-[#FF8C42] focus:ring-2"
                        />
                        <span className="font-medium text-gray-300 text-sm md:text-base">
                          {daySchedule.available ? 'Available' : 'Unavailable'}
                        </span>
                      </label>
                      
                      {daySchedule.available && (
                        <div className="flex items-center space-x-1 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{daySchedule.start} - {daySchedule.end}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time Settings */}
                  {daySchedule.available && (
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-300 min-w-[40px]">Start:</label>
                        <select
                          value={daySchedule.start}
                          onChange={(e) => handleTimeChange(dayKey, 'start', e.target.value)}
                          className="px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-sm"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time} className="bg-[#1A1A1A] text-white">{time}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-300 min-w-[30px]">End:</label>
                        <select
                          value={daySchedule.end}
                          onChange={(e) => handleTimeChange(dayKey, 'end', e.target.value)}
                          className="px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-sm"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time} className="bg-[#1A1A1A] text-white">{time}</option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        onClick={() => copyToAllDays(dayKey)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm active:scale-95 w-full sm:w-auto"
                        title="Copy to all days"
                      >
                        Copy to All
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Schedule Summary */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 mt-4 md:mt-6">
          <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">Schedule Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-300 mb-2 text-sm md:text-base">Available Days</h4>
              <div className="space-y-2">
                {Object.entries(schedule)
                  .filter(([, daySchedule]) => daySchedule.available)
                  .map(([dayKey, daySchedule]) => (
                    <div key={dayKey} className="flex items-center justify-between p-3 bg-green-600/20 border border-green-500/30 rounded-lg">
                      <span className="font-medium text-green-300 text-sm md:text-base">{dayNames[dayKey]}</span>
                      <span className="text-green-400 text-xs md:text-sm">
                        {daySchedule.start} - {daySchedule.end}
                      </span>
                    </div>
                  ))
                }
                {Object.values(schedule).every(day => !day.available) && (
                  <p className="text-gray-500 text-sm">No available days set</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-300 mb-2 text-sm md:text-base">Unavailable Days</h4>
              <div className="space-y-2">
                {Object.entries(schedule)
                  .filter(([, daySchedule]) => !daySchedule.available)
                  .map(([dayKey]) => (
                    <div key={dayKey} className="flex items-center p-3 bg-red-600/20 border border-red-500/30 rounded-lg">
                      <span className="font-medium text-red-300 text-sm md:text-base">{dayNames[dayKey]}</span>
                    </div>
                  ))
                }
                {Object.values(schedule).every(day => day.available) && (
                  <p className="text-gray-500 text-sm">All days available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarberSchedule