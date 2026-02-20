import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  Clock,
  Power,
  Calendar,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6am to 11pm

const formatHour = (h) => {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

const BranchScheduleSettings = () => {
  const { user } = useCurrentUser()
  const branchId = user?.branch_id

  const schedule = useQuery(
    api.services.branches.getBranchSchedule,
    branchId ? { branch_id: branchId } : 'skip'
  )

  const toggleManualClose = useMutation(api.services.branches.toggleBranchManualClose)
  const updateWeeklySchedule = useMutation(api.services.branches.updateBranchWeeklySchedule)
  const updateClosedDates = useMutation(api.services.branches.updateBranchClosedDates)

  // Manual close state
  const [isClosing, setIsClosing] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [toggleLoading, setToggleLoading] = useState(false)

  // Weekly schedule state
  const [weeklySchedule, setWeeklySchedule] = useState({})
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSaved, setScheduleSaved] = useState(false)

  // Closed dates state
  const [closedDates, setClosedDates] = useState([])
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [datesLoading, setDatesLoading] = useState(false)
  const [datesSaved, setDatesSaved] = useState(false)

  // Init state from query
  useEffect(() => {
    if (schedule) {
      setCloseReason(schedule.manual_close_reason || '')

      // Initialize weekly schedule
      const defaultSchedule = {}
      DAYS.forEach(({ key }) => {
        const existing = schedule.weekly_schedule?.[key]
        defaultSchedule[key] = existing || {
          is_open: true,
          start_hour: schedule.booking_start_hour || 10,
          end_hour: schedule.booking_end_hour || 20,
        }
      })
      setWeeklySchedule(defaultSchedule)

      // Initialize closed dates (filter out past dates)
      const today = new Date().toISOString().split('T')[0]
      setClosedDates(
        (schedule.closed_dates || []).filter(cd => cd.date >= today)
      )
    }
  }, [schedule])

  if (!branchId) {
    return (
      <div className="text-center text-gray-500 py-12">
        No branch assigned to your account.
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  const isClosed = schedule.is_manually_closed

  const handleToggleClose = async () => {
    setToggleLoading(true)
    try {
      await toggleManualClose({
        branch_id: branchId,
        is_closed: !isClosed,
        reason: !isClosed ? closeReason : undefined,
      })
      if (isClosed) setCloseReason('')
    } catch (e) {
      console.error('Failed to toggle branch status:', e)
    }
    setToggleLoading(false)
  }

  const handleSaveSchedule = async () => {
    // Validate: end_hour must be > start_hour for open days
    for (const { key, label } of DAYS) {
      const day = weeklySchedule[key]
      if (day?.is_open && day.end_hour <= day.start_hour) {
        alert(`${label}: End time must be after start time.`)
        return
      }
    }
    setScheduleLoading(true)
    try {
      await updateWeeklySchedule({
        branch_id: branchId,
        weekly_schedule: weeklySchedule,
      })
      setScheduleSaved(true)
      setTimeout(() => setScheduleSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save schedule:', e)
    }
    setScheduleLoading(false)
  }

  const handleAddClosedDate = async () => {
    if (!newDate || !newReason.trim()) return
    const updated = [...closedDates, { date: newDate, reason: newReason.trim() }]
      .sort((a, b) => a.date.localeCompare(b.date))
    setDatesLoading(true)
    try {
      await updateClosedDates({ branch_id: branchId, closed_dates: updated })
      setClosedDates(updated)
      setNewDate('')
      setNewReason('')
      setDatesSaved(true)
      setTimeout(() => setDatesSaved(false), 2000)
    } catch (e) {
      console.error('Failed to add closed date:', e)
    }
    setDatesLoading(false)
  }

  const handleRemoveClosedDate = async (dateToRemove) => {
    const updated = closedDates.filter(cd => cd.date !== dateToRemove)
    setDatesLoading(true)
    try {
      await updateClosedDates({ branch_id: branchId, closed_dates: updated })
      setClosedDates(updated)
    } catch (e) {
      console.error('Failed to remove closed date:', e)
    }
    setDatesLoading(false)
  }

  const updateDay = (dayKey, field, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }))
  }

  return (
    <div className="space-y-6">
      {/* Section A: Open/Close Toggle */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
            <Power className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Branch Status</h3>
            <p className="text-xs text-gray-500">Manually open or close your branch</p>
          </div>
        </div>

        {/* Status Display */}
        <div className={`flex items-center gap-3 p-4 rounded-lg border mb-4 ${
          isClosed
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          <div className={`w-3 h-3 rounded-full ${isClosed ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className={`text-sm font-semibold ${isClosed ? 'text-red-400' : 'text-green-400'}`}>
            {isClosed ? 'Branch is Closed' : 'Branch is Open'}
          </span>
          {isClosed && schedule.manual_close_reason && (
            <span className="text-xs text-gray-400 ml-2">— {schedule.manual_close_reason}</span>
          )}
        </div>

        {/* Close reason input (only when opening the close dialog) */}
        {!isClosed && (
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">Close reason (optional)</label>
            <input
              type="text"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="e.g., Holiday, Renovation, Emergency"
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        )}

        <button
          onClick={handleToggleClose}
          disabled={toggleLoading}
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            isClosed
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {toggleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Power className="w-4 h-4" />
          )}
          {isClosed ? 'Re-open Branch' : 'Close Branch'}
        </button>
      </div>

      {/* Section B: Weekly Schedule */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
              <Clock className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Weekly Schedule</h3>
              <p className="text-xs text-gray-500">Set operating hours for each day</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const day = weeklySchedule[key]
            if (!day) return null
            return (
              <div
                key={key}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  day.is_open ? 'border-[#2A2A2A] bg-[#0A0A0A]' : 'border-[#2A2A2A] bg-[#1A1A1A]/50 opacity-60'
                }`}
              >
                {/* Day name */}
                <span className="text-sm font-medium text-white w-24 flex-shrink-0">{label}</span>

                {/* Toggle */}
                <button
                  onClick={() => updateDay(key, 'is_open', !day.is_open)}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                    day.is_open ? 'bg-green-600' : 'bg-[#3A3A3A]'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    day.is_open ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>

                {day.is_open ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <select
                      value={day.start_hour}
                      onChange={(e) => {
                        const newStart = Number(e.target.value)
                        updateDay(key, 'start_hour', newStart)
                        // Auto-fix end hour if it's <= new start
                        if (day.end_hour <= newStart) {
                          updateDay(key, 'end_hour', Math.min(newStart + 1, 23))
                        }
                      }}
                      className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      {HOURS.map(h => (
                        <option key={h} value={h}>{formatHour(h)}</option>
                      ))}
                    </select>
                    <span className="text-gray-500 text-xs">to</span>
                    <select
                      value={day.end_hour}
                      onChange={(e) => updateDay(key, 'end_hour', Number(e.target.value))}
                      className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      {HOURS.filter(h => h > day.start_hour).map(h => (
                        <option key={h} value={h}>{formatHour(h)}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs text-red-400 font-medium">Closed</span>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleSaveSchedule}
          disabled={scheduleLoading}
          className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          {scheduleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : scheduleSaved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {scheduleSaved ? 'Saved!' : 'Save Schedule'}
        </button>
      </div>

      {/* Section C: Closure Dates */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
            <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Closure Dates</h3>
            <p className="text-xs text-gray-500">Set specific dates when the branch will be closed</p>
          </div>
        </div>

        {/* Existing Closed Dates */}
        {closedDates.length > 0 ? (
          <div className="space-y-2 mb-4">
            {closedDates.map((cd) => (
              <div
                key={cd.date}
                className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm text-white font-medium">
                      {new Date(cd.date + 'T00:00:00').toLocaleDateString('en-PH', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-400">{cd.reason}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveClosedDate(cd.date)}
                  disabled={datesLoading}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-4 mb-4">
            No closure dates set
          </div>
        )}

        {/* Add New Closed Date */}
        <div className="border border-[#2A2A2A] rounded-lg p-3 space-y-3">
          <p className="text-xs text-gray-400 font-medium">Add Closure Date</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Reason (e.g., Holiday, Maintenance)"
            className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
          />
          <button
            onClick={handleAddClosedDate}
            disabled={!newDate || !newReason.trim() || datesLoading}
            className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              newDate && newReason.trim()
                ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                : 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
            }`}
          >
            {datesLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : datesSaved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {datesSaved ? 'Added!' : 'Add Date'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BranchScheduleSettings
