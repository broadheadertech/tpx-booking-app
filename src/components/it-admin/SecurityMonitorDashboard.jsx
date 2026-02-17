import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  ShieldAlert,
  AlertTriangle,
  Shield,
  CheckCircle,
  X,
  Filter,
  Eye,
  Clock,
  User,
  Globe,
  Building,
  FileWarning,
  Lock,
  LogIn,
  UserX,
  Key,
  Wifi,
} from 'lucide-react'

const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 text-red-500 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
}

const EVENT_TYPE_ICONS = {
  login_attempt: LogIn,
  login_failed: LogIn,
  brute_force_detected: UserX,
  unusual_transaction: FileWarning,
  suspicious_ip: Globe,
  role_escalation_attempt: Key,
  data_export: FileWarning,
  bulk_operation: FileWarning,
  api_abuse: Wifi,
}

const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low']

function SecurityMonitorDashboard() {
  const events = useQuery(api.services.securityMonitoring.getSecurityEvents) || []
  const stats = useQuery(api.services.securityMonitoring.getSecurityStats) || null
  const activeThreats = useQuery(api.services.securityMonitoring.getActiveThreats) || []

  const resolveSecurityEvent = useMutation(api.services.securityMonitoring.resolveSecurityEvent)
  const { user } = useCurrentUser()

  const [severityFilter, setSeverityFilter] = useState('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [showResolved, setShowResolved] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Get unique event types
  const eventTypes = useMemo(() => {
    const typeSet = new Set(events.map((e) => e.event_type).filter(Boolean))
    return Array.from(typeSet)
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesSeverity = severityFilter === 'all' || evt.severity === severityFilter
      const matchesType = eventTypeFilter === 'all' || evt.event_type === eventTypeFilter
      const matchesResolved = showResolved ? true : !evt.is_resolved
      return matchesSeverity && matchesType && matchesResolved
    })
  }, [events, severityFilter, eventTypeFilter, showResolved])

  const handleResolve = async () => {
    if (!selectedEvent || !resolutionNotes.trim()) return
    setLoading(true)
    try {
      await resolveSecurityEvent({
        eventId: selectedEvent._id,
        userId: user?._id,
        resolution_notes: resolutionNotes.trim(),
      })
      setSelectedEvent(null)
      setResolutionNotes('')
    } catch (err) {
      console.error('Failed to resolve security event:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (ts) => {
    if (!ts) return '---'
    const d = new Date(ts)
    return d.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEventIcon = (eventType) => {
    const Icon = EVENT_TYPE_ICONS[eventType] || ShieldAlert
    return Icon
  }

  const formatEventType = (type) => {
    if (!type) return '---'
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="space-y-6">
      {/* Active Threats Banner */}
      {activeThreats.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center space-x-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          </div>
          <div>
            <p className="text-red-400 font-bold text-sm">
              {activeThreats.length} Active Threat{activeThreats.length !== 1 ? 's' : ''} Detected
            </p>
            <p className="text-red-300/70 text-xs mt-0.5">
              Immediate attention required. Review and resolve security events below.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center space-x-3">
        <ShieldAlert className="w-6 h-6 text-red-400" />
        <h2 className="text-xl font-bold text-white">Security Monitor</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500">Total Events (24h)</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.total ?? 0}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-gray-500">Active Threats</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats?.activeThreats ?? activeThreats.length}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <FileWarning className="w-4 h-4 text-orange-400" />
            <p className="text-xs text-gray-500">High Severity</p>
          </div>
          <p className="text-2xl font-bold text-orange-400">{stats?.eventsBySeverity?.high ?? 0}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-gray-500">Low Severity</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats?.eventsBySeverity?.low ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="all">All Event Types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{formatEventType(t)}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="all">All Severities</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            showResolved
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-[#3A3A3A] text-gray-400 border-[#2A2A2A] hover:text-white'
          }`}
        >
          {showResolved ? 'Showing All' : 'Unresolved Only'}
        </button>
      </div>

      {/* Events Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Time</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Event Type</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Branch</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">IP</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No security events found.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => {
                const EventIcon = getEventIcon(evt.event_type)
                return (
                  <tr
                    key={evt._id}
                    className="border-b border-[#2A2A2A] hover:bg-[#222222] transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(evt)}
                  >
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {formatTimestamp(evt.createdAt || evt._creationTime)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <EventIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{formatEventType(evt.event_type)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[evt.severity] || SEVERITY_COLORS.low}`}>
                        {evt.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{evt.user_id || '---'}</td>
                    <td className="px-4 py-3 text-gray-300">{evt.branch_id || '---'}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{evt.ip_address || '---'}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[250px] truncate">{evt.description || '---'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                        evt.is_resolved
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {evt.is_resolved ? 'Resolved' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {!evt.is_resolved && (
                        <button
                          onClick={() => setSelectedEvent(evt)}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          title="View & Resolve"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Event Detail / Resolution Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white">Security Event Details</h3>
              <button
                onClick={() => { setSelectedEvent(null); setResolutionNotes('') }}
                className="p-1.5 rounded-lg hover:bg-[#3A3A3A] text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Event Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Event Type</p>
                  <p className="text-sm text-white font-medium">{formatEventType(selectedEvent.event_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Severity</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[selectedEvent.severity] || SEVERITY_COLORS.low}`}>
                    {selectedEvent.severity}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">User</p>
                  <p className="text-sm text-gray-300">{selectedEvent.user_id || '---'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Branch</p>
                  <p className="text-sm text-gray-300">{selectedEvent.branch_id || '---'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">IP Address</p>
                  <p className="text-sm text-gray-300 font-mono">{selectedEvent.ip_address || '---'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Time</p>
                  <p className="text-sm text-gray-300">{formatTimestamp(selectedEvent.createdAt || selectedEvent._creationTime)}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-300">{selectedEvent.description || '---'}</p>
              </div>

              {/* Full Metadata */}
              {selectedEvent.metadata && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Metadata</p>
                  <pre className="text-xs text-gray-400 bg-[#0A0A0A] rounded-lg p-3 overflow-x-auto border border-[#2A2A2A] font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Resolution Form */}
              {!selectedEvent.is_resolved && (
                <div className="border-t border-[#2A2A2A] pt-4">
                  <p className="text-sm text-white font-medium mb-2">Resolve Event</p>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter resolution notes (required)..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  />
                </div>
              )}

              {/* Resolution Info (if already resolved) */}
              {selectedEvent.is_resolved && selectedEvent.resolution_notes && (
                <div className="border-t border-[#2A2A2A] pt-4">
                  <p className="text-xs text-gray-500 mb-1">Resolution Notes</p>
                  <p className="text-sm text-emerald-400">{selectedEvent.resolution_notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => { setSelectedEvent(null); setResolutionNotes('') }}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#3A3A3A] text-sm transition-colors"
              >
                Close
              </button>
              {!selectedEvent.is_resolved && (
                <button
                  onClick={handleResolve}
                  disabled={loading || !resolutionNotes.trim()}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Resolving...' : 'Resolve Event'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityMonitorDashboard
