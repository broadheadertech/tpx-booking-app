import React, { useState } from 'react'
import { Calendar, Clock, Trash2, Plus, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import AlertModal from '../common/AlertModal'

const TimeOffManager = ({ barber }) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    isWholeDay: true,
    startTime: '09:00',
    endTime: '17:00',
    reason: ''
  })
  const [loading, setLoading] = useState(false)
  const [alertState, setAlertState] = useState({ isOpen: false, type: 'info', title: '', message: '' })

  const updateBarber = useMutation(api.services.barbers.updateBarber)

  const handleAddPeriod = async () => {
    if (!barber?._id) return

    setLoading(true)
    try {
      const newPeriod = {
        date: formData.date,
        reason: formData.reason,
        start_time: formData.isWholeDay ? undefined : formData.startTime,
        end_time: formData.isWholeDay ? undefined : formData.endTime
      }

      const currentPeriods = barber.blocked_periods || []
      
      await updateBarber({
        id: barber._id,
        blocked_periods: [...currentPeriods, newPeriod]
      })

      setShowAddForm(false)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        isWholeDay: true,
        startTime: '09:00',
        endTime: '17:00',
        reason: ''
      })
      
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Time Off Added',
        message: 'Your unavailability has been scheduled.'
      })
    } catch (error) {
      console.error('Failed to add time off:', error)
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to add time off. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePeriod = async (index) => {
    if (!barber?._id) return

    if (!window.confirm('Are you sure you want to remove this time off?')) return

    setLoading(true)
    try {
      const newPeriods = [...(barber.blocked_periods || [])]
      newPeriods.splice(index, 1)

      await updateBarber({
        id: barber._id,
        blocked_periods: newPeriods
      })
    } catch (error) {
      console.error('Failed to remove time off:', error)
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to remove time off. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  // Sort periods by date
  const sortedPeriods = [...(barber?.blocked_periods || [])].sort((a, b) => new Date(a.date) - new Date(b.date))

  // Filter out past periods (optional, but keeps list clean)
  const upcomingPeriods = sortedPeriods.filter(p => new Date(p.date) >= new Date(new Date().setHours(0,0,0,0)))

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Time Off & Unavailability</h3>
          <p className="text-xs text-gray-400">Manage your days off and unavailable hours</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#333333] text-[var(--color-primary)] rounded-lg text-xs font-medium transition-colors border border-[#333333]"
          >
            <Plus className="w-3 h-3" />
            <span>Add Time Off</span>
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-[#222222] rounded-lg p-4 mb-4 border border-[#333333]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:border-[var(--color-primary)] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isWholeDay}
                    onChange={() => setFormData({ ...formData, isWholeDay: true })}
                    className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-white">Whole Day</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.isWholeDay}
                    onChange={() => setFormData({ ...formData, isWholeDay: false })}
                    className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-white">Specific Hours</span>
                </label>
              </div>
            </div>
          </div>

          {!formData.isWholeDay && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:border-[var(--color-primary)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:border-[var(--color-primary)] outline-none"
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Reason (Optional)</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Doctor appointment, Personal leave"
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:border-[var(--color-primary)] outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-2 text-gray-400 hover:text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPeriod}
              disabled={loading}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Time Off'}
            </button>
          </div>
        </div>
      )}

      {upcomingPeriods.length === 0 ? (
        <div className="text-center py-6 bg-[#1A1A1A] rounded-lg border border-[#333333] border-dashed">
          <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-xs">No upcoming time off scheduled</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {upcomingPeriods.map((period, index) => {
            // Format display time
            const timeDisplay = !period.start_time 
              ? 'Whole Day' 
              : `${format(new Date(`2000-01-01T${period.start_time}`), 'h:mm a')} - ${format(new Date(`2000-01-01T${period.end_time}`), 'h:mm a')}`
            
            const dateDisplay = format(new Date(period.date), 'MMM d, yyyy (EEE)')

            return (
              <div key={index} className="flex items-center justify-between p-3 bg-[#222222] rounded-lg border border-[#333333] group">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-[#333333] flex flex-col items-center justify-center border border-[#444444]">
                    <span className="text-[10px] text-gray-400 uppercase">{format(new Date(period.date), 'MMM')}</span>
                    <span className="text-sm font-bold text-white">{format(new Date(period.date), 'd')}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-white">{period.reason || 'Unavailability'}</p>
                      {!period.start_time && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded border border-blue-500/30">All Day</span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{timeDisplay}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePeriod(index)}
                  disabled={loading}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <AlertModal 
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
      />
    </div>
  )
}

export default TimeOffManager
