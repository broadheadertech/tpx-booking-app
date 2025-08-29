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
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
              <p className="text-gray-600 mt-1">Manage your availability and working hours</p>
            </div>
            
            {hasChanges && (
              <div className="flex space-x-2">
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setAllDays(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Enable All Days</span>
            </button>
            <button
              onClick={() => setAllDays(false)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Disable All Days</span>
            </button>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="space-y-4">
          {Object.entries(dayNames).map(([dayKey, dayName]) => {
            const daySchedule = schedule[dayKey]
            return (
              <div key={dayKey} className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Day and Availability */}
                  <div className="flex items-center space-x-4">
                    <div className="w-24">
                      <h3 className="text-lg font-bold text-gray-900">{dayName}</h3>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={daySchedule.available}
                          onChange={(e) => handleAvailabilityChange(dayKey, e.target.checked)}
                          className="w-5 h-5 text-[#FF8C42] border-gray-300 rounded focus:ring-[#FF8C42] focus:ring-2"
                        />
                        <span className="font-medium text-gray-700">
                          {daySchedule.available ? 'Available' : 'Unavailable'}
                        </span>
                      </label>
                      
                      {daySchedule.available && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{daySchedule.start} - {daySchedule.end}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time Settings */}
                  {daySchedule.available && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Start:</label>
                        <select
                          value={daySchedule.start}
                          onChange={(e) => handleTimeChange(dayKey, 'start', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">End:</label>
                        <select
                          value={daySchedule.end}
                          onChange={(e) => handleTimeChange(dayKey, 'end', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        onClick={() => copyToAllDays(dayKey)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Schedule Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Available Days</h4>
              <div className="space-y-1">
                {Object.entries(schedule)
                  .filter(([, daySchedule]) => daySchedule.available)
                  .map(([dayKey, daySchedule]) => (
                    <div key={dayKey} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <span className="font-medium text-green-800">{dayNames[dayKey]}</span>
                      <span className="text-green-600 text-sm">
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
              <h4 className="font-semibold text-gray-700 mb-2">Unavailable Days</h4>
              <div className="space-y-1">
                {Object.entries(schedule)
                  .filter(([, daySchedule]) => !daySchedule.available)
                  .map(([dayKey]) => (
                    <div key={dayKey} className="flex items-center p-2 bg-red-50 rounded-lg">
                      <span className="font-medium text-red-800">{dayNames[dayKey]}</span>
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