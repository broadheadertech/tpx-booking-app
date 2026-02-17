import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  Key,
  Plus,
  Search,
  Copy,
  Check,
  X,
  RotateCcw,
  ShieldOff,
  AlertTriangle,
  Shield,
  Clock,
  Ban,
} from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
  revoked: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const AVAILABLE_FEATURES = [
  'bookings',
  'pos',
  'wallet',
  'analytics',
  'marketing',
  'delivery',
  'shop',
  'loyalty',
  'reports',
  'api_access',
]

function LicenseManager() {
  const { user } = useCurrentUser()
  const licenses = useQuery(api.services.licenses.getAllLicenses) || []
  const expiringLicenses = useQuery(api.services.licenses.getExpiringLicenses) || []
  const branches = useQuery(api.services.branches.getAllBranches) || []

  const generateLicense = useMutation(api.services.licenses.generateLicense)
  const revokeLicense = useMutation(api.services.licenses.revokeLicense)
  const renewLicense = useMutation(api.services.licenses.renewLicense)

  const [searchQuery, setSearchQuery] = useState('')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [loading, setLoading] = useState(false)

  // Generate form state
  const [generateForm, setGenerateForm] = useState({
    branchId: '',
    maxUsers: 10,
    features: ['bookings', 'pos'],
    expiryDate: '',
  })

  // Stats
  const stats = useMemo(() => {
    const now = Date.now()
    const active = licenses.filter((l) => l.is_active && l.expires_at > now).length
    const revoked = licenses.filter((l) => !l.is_active).length
    const expiringSoon = expiringLicenses.length
    return { active, expiringSoon, revoked }
  }, [licenses, expiringLicenses])

  const filteredLicenses = useMemo(() => {
    if (!searchQuery) return licenses
    return licenses.filter(
      (l) =>
        (l.branch_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.license_key || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [licenses, searchQuery])

  const maskLicenseKey = (key) => {
    if (!key || key.length < 8) return key || '---'
    const parts = key.split('-')
    if (parts.length >= 4) {
      return `${parts[0]}-${parts[1]}-****-****`
    }
    return key.substring(0, 9) + '****-****'
  }

  const copyToClipboard = async (key, id) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    return expiresAt - now <= thirtyDays && expiresAt > now
  }

  const handleGenerate = async () => {
    if (!generateForm.branchId || !generateForm.expiryDate) return
    setLoading(true)
    try {
      await generateLicense({
        userId: user?._id,
        branch_id: generateForm.branchId,
        max_users: parseInt(generateForm.maxUsers),
        features: generateForm.features,
        expires_at: new Date(generateForm.expiryDate).getTime(),
      })
      setShowGenerateModal(false)
      setGenerateForm({ branchId: '', maxUsers: 10, features: ['bookings', 'pos'], expiryDate: '' })
    } catch (err) {
      console.error('Failed to generate license:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (licenseId) => {
    if (!window.confirm('Are you sure you want to revoke this license?')) return
    try {
      await revokeLicense({ licenseId, userId: user?._id })
    } catch (err) {
      console.error('Failed to revoke license:', err)
    }
  }

  const handleRenew = async (licenseId) => {
    try {
      await renewLicense({ licenseId, userId: user?._id })
    } catch (err) {
      console.error('Failed to renew license:', err)
    }
  }

  const toggleFeature = (feature) => {
    setGenerateForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '---'
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Key className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold text-white">License Manager</h2>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>Generate License</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-gray-500">Active Licenses</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <p className="text-xs text-gray-500">Expiring Soon</p>
          </div>
          <p className="text-2xl font-bold text-orange-400">{stats.expiringSoon}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <Ban className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500">Revoked</p>
          </div>
          <p className="text-2xl font-bold text-gray-400">{stats.revoked}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search by branch or license key..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* License Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Branch</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">License Key</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Issued</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Expires</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Max Users</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Features</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No licenses found.
                </td>
              </tr>
            ) : (
              filteredLicenses.map((license) => (
                <tr key={license._id} className="border-b border-[#2A2A2A] hover:bg-[#222222] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{license.branch_name || '---'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <code className="text-gray-300 text-xs font-mono">{maskLicenseKey(license.license_key)}</code>
                      <button
                        onClick={() => copyToClipboard(license.license_key, license._id)}
                        className="p-1 rounded hover:bg-[#3A3A3A] text-gray-400 hover:text-white transition-colors"
                        title="Copy license key"
                      >
                        {copiedId === license._id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                        !license.is_active ? STATUS_COLORS.revoked :
                        license.expires_at < Date.now() ? STATUS_COLORS.expired :
                        STATUS_COLORS.active
                      }`}>
                        {!license.is_active ? 'revoked' : license.expires_at < Date.now() ? 'expired' : 'active'}
                      </span>
                      {isExpiringSoon(license.expires_at) && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{formatDate(license.issued_at || license._creationTime)}</td>
                  <td className="px-4 py-3 text-gray-300">{formatDate(license.expires_at)}</td>
                  <td className="px-4 py-3 text-gray-300">{license.max_users ?? '---'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(license.features || []).slice(0, 3).map((f) => (
                        <span key={f} className="px-1.5 py-0.5 rounded bg-[#3A3A3A] text-gray-300 text-[10px]">
                          {f}
                        </span>
                      ))}
                      {(license.features || []).length > 3 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#3A3A3A] text-gray-400 text-[10px]">
                          +{license.features.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {license.is_active && license.expires_at > Date.now() && (
                        <>
                          <button
                            onClick={() => handleRenew(license._id)}
                            className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                            title="Renew"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRevoke(license._id)}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Revoke"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {(!license.is_active || license.expires_at <= Date.now()) && (
                        <button
                          onClick={() => handleRenew(license._id)}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          title="Renew"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate License Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white">Generate License</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#3A3A3A] text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Branch</label>
                <select
                  value={generateForm.branchId}
                  onChange={(e) => setGenerateForm({ ...generateForm, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="">Select a branch...</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} {b.branch_code ? `(${b.branch_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Users</label>
                  <input
                    type="number"
                    value={generateForm.maxUsers}
                    onChange={(e) => setGenerateForm({ ...generateForm, maxUsers: e.target.value })}
                    min={1}
                    className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={generateForm.expiryDate}
                    onChange={(e) => setGenerateForm({ ...generateForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Features</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_FEATURES.map((feature) => (
                    <button
                      key={feature}
                      type="button"
                      onClick={() => toggleFeature(feature)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        generateForm.features.includes(feature)
                          ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                          : 'bg-[#3A3A3A] text-gray-400 border-[#2A2A2A] hover:text-white'
                      }`}
                    >
                      {feature.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#3A3A3A] text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !generateForm.branchId || !generateForm.expiryDate}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate License'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LicenseManager
