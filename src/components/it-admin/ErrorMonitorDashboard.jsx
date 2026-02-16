import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  Bug,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle,
  Filter,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Check,
} from 'lucide-react'

const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 text-red-500 border-red-500/30',
  error: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  warning: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  info: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
}

const SEVERITY_OPTIONS = ['critical', 'error', 'warning', 'info']

function ErrorMonitorDashboard() {
  const errors = useQuery(api.services.errorMonitoring.getErrors) || []
  const stats = useQuery(api.services.errorMonitoring.getErrorStats) || null

  const resolveError = useMutation(api.services.errorMonitoring.resolveError)
  const bulkResolveErrors = useMutation(api.services.errorMonitoring.bulkResolveErrors)

  const { user } = useCurrentUser()

  const [severityFilter, setSeverityFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showResolved, setShowResolved] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const [selectedErrors, setSelectedErrors] = useState([])
  const [loading, setLoading] = useState(false)

  // Get unique sources from errors
  const sources = useMemo(() => {
    const sourceSet = new Set(errors.map((e) => e.source).filter(Boolean))
    return Array.from(sourceSet)
  }, [errors])

  const filteredErrors = useMemo(() => {
    return errors.filter((err) => {
      const matchesSeverity = severityFilter === 'all' || err.severity === severityFilter
      const matchesSource = sourceFilter === 'all' || err.source === sourceFilter
      const matchesResolved = showResolved ? true : !err.resolved
      return matchesSeverity && matchesSource && matchesResolved
    })
  }, [errors, severityFilter, sourceFilter, showResolved])

  const handleResolve = async (errorId) => {
    try {
      await resolveError({ errorId, userId: user?._id })
    } catch (err) {
      console.error('Failed to resolve error:', err)
    }
  }

  const handleBulkResolve = async () => {
    if (selectedErrors.length === 0) return
    setLoading(true)
    try {
      await bulkResolveErrors({ errorIds: selectedErrors, userId: user?._id })
      setSelectedErrors([])
    } catch (err) {
      console.error('Failed to bulk resolve:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectError = (id) => {
    setSelectedErrors((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedErrors.length === filteredErrors.filter((e) => !e.resolved).length) {
      setSelectedErrors([])
    } else {
      setSelectedErrors(filteredErrors.filter((e) => !e.resolved).map((e) => e._id))
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
      second: '2-digit',
    })
  }

  const truncateMessage = (msg, maxLen = 80) => {
    if (!msg) return '---'
    return msg.length > maxLen ? msg.substring(0, maxLen) + '...' : msg
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Bug className="w-6 h-6 text-orange-400" />
        <h2 className="text-xl font-bold text-white">Error Monitor</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <Bug className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500">Total Errors (24h)</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.total ?? 0}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <AlertOctagon className="w-4 h-4 text-red-400" />
            <p className="text-xs text-gray-500">Critical</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats?.critical ?? 0}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <p className="text-xs text-gray-500">Warnings</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats?.warning ?? 0}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-gray-500">Resolution Rate</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats?.resolutionRate ?? 0}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="all">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
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

        {selectedErrors.length > 0 && (
          <button
            onClick={handleBulkResolve}
            disabled={loading}
            className="ml-auto px-4 py-2.5 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Resolving...' : `Resolve Selected (${selectedErrors.length})`}
          </button>
        )}
      </div>

      {/* Error Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    filteredErrors.filter((e) => !e.resolved).length > 0 &&
                    selectedErrors.length === filteredErrors.filter((e) => !e.resolved).length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-[#3A3A3A] bg-[#3A3A3A] text-[var(--color-primary)] focus:ring-0"
                />
              </th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Timestamp</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Source</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Function</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Message</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredErrors.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No errors found.
                </td>
              </tr>
            ) : (
              filteredErrors.map((error) => (
                <React.Fragment key={error._id}>
                  <tr
                    className={`border-b border-[#2A2A2A] hover:bg-[#222222] transition-colors cursor-pointer ${
                      expandedRow === error._id ? 'bg-[#222222]' : ''
                    }`}
                    onClick={() => setExpandedRow(expandedRow === error._id ? null : error._id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {!error.resolved && (
                        <input
                          type="checkbox"
                          checked={selectedErrors.includes(error._id)}
                          onChange={() => toggleSelectError(error._id)}
                          className="rounded border-[#3A3A3A] bg-[#3A3A3A] text-[var(--color-primary)] focus:ring-0"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {expandedRow === error._id ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        <span>{formatTimestamp(error.createdAt || error._creationTime)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{error.source || '---'}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{error.function_name || '---'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[error.severity] || SEVERITY_COLORS.info}`}>
                        {error.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-[300px]">
                      {truncateMessage(error.message)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                        error.resolved
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {error.resolved ? 'Resolved' : 'Unresolved'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {!error.resolved && (
                        <button
                          onClick={() => handleResolve(error._id)}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          title="Resolve"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded Row - Stack Trace & Metadata */}
                  {expandedRow === error._id && (
                    <tr className="bg-[#151515]">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="space-y-3">
                          {error.message && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">Full Message</p>
                              <p className="text-sm text-gray-300">{error.message}</p>
                            </div>
                          )}
                          {error.stack_trace && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">Stack Trace</p>
                              <pre className="text-xs text-gray-400 bg-[#0A0A0A] rounded-lg p-3 overflow-x-auto border border-[#2A2A2A] font-mono whitespace-pre-wrap">
                                {error.stack_trace}
                              </pre>
                            </div>
                          )}
                          {error.metadata && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">Metadata</p>
                              <pre className="text-xs text-gray-400 bg-[#0A0A0A] rounded-lg p-3 overflow-x-auto border border-[#2A2A2A] font-mono whitespace-pre-wrap">
                                {JSON.stringify(error.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ErrorMonitorDashboard
