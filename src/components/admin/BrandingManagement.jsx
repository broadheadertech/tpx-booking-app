import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Palette, RefreshCw, Eye, Undo2, Sparkles, Image as ImageIcon, ToggleLeft, ShieldCheck, Clock3, History, Download, Upload, AlertCircle, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import ConfirmDialog from '../common/ConfirmDialog'
import ImageUploadInput from './ImageUploadInput'

const DEFAULT_BRANDING = {
  display_name: '',
  primary_color: 'var(--color-primary)',
  accent_color: 'var(--color-accent)',
  bg_color: 'var(--color-bg)',
  text_color: '#FFFFFF',
  muted_color: '#333333',
  logo_light_url: '',
  logo_dark_url: '',
  favicon_url: '',
  banner_url: '',
  hero_image_url: '/landing/2.webp',
  feature_toggles: {
    kiosk: true,
    wallet: true,
    vouchers: true,
    referrals: false,
  },
}

const FEATURE_KEYS = [
  { key: 'kiosk', label: 'Kiosk Mode' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'referrals', label: 'Referrals' },
]

const COLOR_PRESETS = [
  { name: 'Default Orange', primary: '#FF8C42', accent: '#FF7A2B' },
  { name: 'Blue Ocean', primary: '#3B82F6', accent: '#0EA5E9' },
  { name: 'Purple Dream', primary: '#A855F7', accent: '#8B5CF6' },
  { name: 'Green Forest', primary: '#10B981', accent: '#059669' },
  { name: 'Red Passion', primary: '#EF4444', accent: '#DC2626' },
  { name: 'Pink Bliss', primary: '#EC4899', accent: '#DB2777' },
]

// Frontend validation
const validateColor = (color) => {
  if (!color || typeof color !== 'string') return 'Color is required'
  if (/^#[0-9A-F]{3}([0-9A-F]{3})?$/i.test(color)) return null
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(color)) return null
  if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i.test(color)) return null
  if (/^var\(--[\w-]+\)$/.test(color)) return null
  return 'Invalid color format (use #RRGGBB, rgb(...), or var(--name))'
}

const validateUrl = (url) => {
  if (!url) return null // Optional field
  if (url.startsWith('/')) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return null
    return 'URL must use http:// or https://'
  } catch {
    return 'Invalid URL format'
  }
}

const LabelValue = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-sm font-semibold text-white truncate">{value || '—'}</p>
  </div>
)

const ColorSwatch = ({ label, color }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl border border-white/5 shadow-inner" style={{ backgroundColor: color }} />
    <div>
      <p className="text-xs uppercase text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-white">{color || '—'}</p>
    </div>
  </div>
)

const ToggleRow = ({ label, enabled, onToggle, disabled }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-xs text-gray-400">Controls {label.toLowerCase()} visibility</p>
    </div>
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
)

const ColorInput = ({ label, value, onChange, disabled, error }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-gray-300">{label}</span>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value && value.startsWith('#') ? value : '#FF8C42'}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-16 rounded-lg border border-white/10 bg-transparent"
      />
      <input
        type="text"
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="var(--color-primary)"
        className={`flex-1 rounded-xl border px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 disabled:opacity-60 ${
          error
            ? 'border-red-500/50 bg-red-500/10 focus:ring-red-500/60'
            : 'border-white/10 bg-white/5 focus:ring-[var(--color-primary)]/60'
        }`}
      />
    </div>
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
  </label>
)

const UrlInput = ({ label, value, onChange, placeholder, disabled, error }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-gray-300">{label}</span>
    <input
      type="text"
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 disabled:opacity-60 ${
        error
          ? 'border-red-500/50 bg-red-500/10 focus:ring-red-500/60'
          : 'border-white/10 bg-white/5 focus:ring-[var(--color-primary)]/60'
      }`}
    />
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
  </label>
)

const ALLOWED_FIELDS = new Set([
  'display_name',
  'primary_color',
  'accent_color',
  'bg_color',
  'text_color',
  'muted_color',
  'logo_light_url',
  'logo_dark_url',
  'favicon_url',
  'banner_url',
  'hero_image_url',
  'feature_toggles',
])

const FEATURE_KEYS_ALLOWED = ['kiosk', 'wallet', 'vouchers', 'referrals']

const sanitizePayload = (form) => {
  const payload = {}
  ALLOWED_FIELDS.forEach((key) => {
    const value = form[key]
    if (value === undefined || value === null || value === '') return
    if (key === 'feature_toggles') {
      const toggles = {}
      FEATURE_KEYS_ALLOWED.forEach((toggleKey) => {
        const toggleValue = value?.[toggleKey]
        if (typeof toggleValue === 'boolean') {
          toggles[toggleKey] = toggleValue
        }
      })
      if (Object.keys(toggles).length) {
        payload.feature_toggles = toggles
      }
      return
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) payload[key] = trimmed
      return
    }
    payload[key] = value
  })
  return payload
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Not yet updated'
  return new Date(timestamp).toLocaleString()
}

export default function BrandingManagement() {
  // Use unified auth hook for user data (supports both Clerk and legacy auth)
  const { user: currentUser, authMethod, isAuthenticated } = useCurrentUser()
  // Get sessionToken from legacy auth (optional - backend now supports Clerk auth)
  const { sessionToken } = useAuth()
  const { branding: activeBranding, loading: brandingLoading, error: brandingError, refresh: refreshBranding } = useBranding()

  // Define canEdit - requires super_admin role (backend now supports both Clerk and legacy auth)
  const canEdit = currentUser?.role === 'super_admin' && isAuthenticated
  const canView = currentUser?.role === 'super_admin'

  const upsertGlobalBranding = useMutation(api.services.branding.upsertGlobalBranding)
  const rollbackGlobalBranding = useMutation(api.services.branding.rollbackGlobalBranding)
  const exportBranding = useQuery(canEdit ? api.services.branding.exportBranding : null, canEdit ? { sessionToken: sessionToken || undefined } : 'skip')
  const brandingHistory = useQuery(canEdit ? api.services.branding.getBrandingHistory : null, canEdit ? { sessionToken: sessionToken || undefined, limit: 10 } : 'skip')
  const importBrandingMutation = useMutation(api.services.branding.importBranding)
  
  const [form, setForm] = useState(() => ({ ...DEFAULT_BRANDING, ...(activeBranding || {}) }))
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [importing, setImporting] = useState(false)
  const previewRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isEditing) {
      setForm({ ...DEFAULT_BRANDING, ...(activeBranding || {}) })
    }
  }, [activeBranding, isEditing])

  const handleToggle = (key) => {
    if (!canEdit || !isEditing) return
    setForm((prev) => ({
      ...prev,
      feature_toggles: {
        ...(prev.feature_toggles || {}),
        [key]: !prev.feature_toggles?.[key],
      },
    }))
  }

  const validateForm = () => {
    const errors = {}
    
    // Validate colors
    const primaryError = validateColor(form.primary_color)
    if (primaryError) errors.primary_color = primaryError
    
    const accentError = validateColor(form.accent_color)
    if (accentError) errors.accent_color = accentError
    
    // Validate URLs (optional fields)
    const logoLightError = validateUrl(form.logo_light_url)
    if (logoLightError) errors.logo_light_url = logoLightError
    
    const logoDarkError = validateUrl(form.logo_dark_url)
    if (logoDarkError) errors.logo_dark_url = logoDarkError
    
    const faviconError = validateUrl(form.favicon_url)
    if (faviconError) errors.favicon_url = faviconError
    
    const bannerError = validateUrl(form.banner_url)
    if (bannerError) errors.banner_url = bannerError
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!canEdit || !isEditing) return

    // Validate before saving
    if (!validateForm()) {
      setStatus({ type: 'error', message: 'Please fix validation errors before saving.' })
      return
    }

    // Show confirmation dialog
    setConfirmDialog({
      type: 'warning',
      title: 'Save Branding Changes?',
      message: 'This will update branding across the entire application for all users. A version history entry will be created.',
      confirmText: 'Save Changes',
      onConfirm: async () => {
        setSaving(true)
        setStatus(null)
        setConfirmDialog(null)
        try {
          await upsertGlobalBranding({
            sessionToken: sessionToken || undefined, // Pass sessionToken if available (for legacy auth), otherwise undefined (for Clerk auth)
            payload: sanitizePayload(form),
          })
          setStatus({ type: 'success', message: `Branding updated successfully! Version ${(activeBranding?.version || 0) + 1} saved.` })
          setIsEditing(false)
          refreshBranding()
        } catch (error) {
          setStatus({ type: 'error', message: error.message || 'Failed to update branding.' })
        } finally {
          setSaving(false)
        }
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const handleReset = () => {
    if (!canEdit || !isEditing) return
    setConfirmDialog({
      type: 'warning',
      title: 'Reset to Defaults?',
      message: 'This will discard all your current changes and restore default branding values. This action cannot be undone.',
      confirmText: 'Reset to Defaults',
      onConfirm: () => {
        setForm(DEFAULT_BRANDING)
        setValidationErrors({})
        setStatus({ type: 'info', message: 'Reverted to default values. Click Save to apply.' })
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }
  
  const handleApplyPreset = (preset) => {
    if (!canEdit || !isEditing) return
    setForm((prev) => ({
      ...prev,
      primary_color: preset.primary,
      accent_color: preset.accent,
    }))
    setValidationErrors({})
    setStatus({ type: 'info', message: `Applied "${preset.name}" color preset. Click Save to apply.` })
  }
  
  const handleExport = () => {
    if (!exportBranding) return
    try {
      const blob = new Blob([JSON.stringify(exportBranding, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `branding-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', message: 'Branding configuration exported successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to export configuration.' })
    }
  }
  
  const handleImport = async (file) => {
    if (!file || !canEdit) return

    setImporting(true)
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const config = JSON.parse(e.target.result)

        setConfirmDialog({
          type: 'danger',
          title: 'Import Branding Configuration?',
          message: 'This will replace your current branding with the imported configuration. A backup will be created in version history. This action cannot be easily undone.',
          confirmText: 'Import Configuration',
          onConfirm: async () => {
            setConfirmDialog(null)
            try {
              await importBrandingMutation({ sessionToken: sessionToken || undefined, config })
              setStatus({ type: 'success', message: 'Branding imported successfully!' })
              refreshBranding()
              setIsEditing(false)
            } catch (error) {
              setStatus({ type: 'error', message: error.message || 'Import failed.' })
            } finally {
              setImporting(false)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }
          },
          onCancel: () => {
            setConfirmDialog(null)
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }
        })
      } catch (error) {
        setStatus({ type: 'error', message: 'Invalid JSON file.' })
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Failed to read file.' })
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    
    reader.readAsText(file)
  }
  
  const handleRollback = async (version) => {
    if (!canEdit) return

    setConfirmDialog({
      type: 'warning',
      title: `Rollback to Version ${version}?`,
      message: 'This will restore the branding configuration from this version. A new version history entry will be created. Current unsaved changes will be lost.',
      confirmText: 'Rollback',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await rollbackGlobalBranding({ sessionToken: sessionToken || undefined, version })
          setStatus({ type: 'success', message: `Successfully rolled back to version ${version}.` })
          refreshBranding()
          setIsEditing(false)
          setShowHistory(false)
        } catch (error) {
          setStatus({ type: 'error', message: error.message || 'Rollback failed.' })
        }
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const summaryBranding = useMemo(() => ({ ...DEFAULT_BRANDING, ...(activeBranding || {}) }), [activeBranding])

  const previewStyles = useMemo(() => ({
    '--color-primary': form.primary_color,
    '--color-accent': form.accent_color,
    '--color-bg': form.bg_color,
    '--color-text': form.text_color,
  }), [form])

  // Loading state
  if (brandingLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="mt-4 text-sm text-gray-400">Loading branding configuration...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (brandingError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 text-lg font-semibold text-white">Failed to Load Branding</p>
          <p className="mt-2 text-sm text-gray-400">{brandingError}</p>
          <button
            onClick={() => refreshBranding()}
            className="mt-6 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-10">
      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          open={!!confirmDialog}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText || 'Cancel'}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {/* Version History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-[var(--color-primary)]" />
                <h3 className="text-2xl font-bold text-white">Version History</h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {!brandingHistory || brandingHistory.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No version history available yet.</p>
              ) : (
                brandingHistory.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="rounded-lg bg-[var(--color-primary)]/20 px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                            v{item.version}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold text-white">
                            {item.changed_by_user?.nickname || 'Unknown'}
                          </span>
                          {' '}
                          updated branding configuration
                        </p>
                        {item.change_notes && (
                          <p className="mt-1 text-xs text-gray-400">{item.change_notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRollback(item.version)}
                        className="ml-4 rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                      >
                        Rollback
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wide">Branding Control</p>
          <h2 className="mt-2 flex items-center gap-3 text-3xl font-extrabold text-white">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg">
              <Palette className="h-6 w-6" />
            </span>
            Global Branding Management
          </h2>
          <p className="mt-2 text-sm text-gray-400">Configure the single source of truth for colors, media assets, and feature toggles across every experience.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
              >
                <History className="h-4 w-4" />
                History
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!exportBranding}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 cursor-pointer">
                <Upload className="h-4 w-4" />
                Import
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                  className="hidden"
                  disabled={importing}
                />
              </label>
              <button
                type="button"
                onClick={handleReset}
                disabled={!isEditing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" />
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus(null)
                  setForm({ ...DEFAULT_BRANDING, ...(activeBranding || {}) })
                  setValidationErrors({})
                  setIsEditing(true)
                }}
                className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-lg ${
                  isEditing
                    ? 'bg-white/10 text-white'
                    : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                {isEditing ? 'Editing' : 'Edit Branding'}
              </button>
            </>
          )}
        </div>
      </header>

      {status && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            status.type === 'success'
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : status.type === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : 'border-white/10 bg-white/5 text-gray-200'
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-[var(--color-bg)]/40 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-400">Display</p>
            <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{summaryBranding.display_name || 'Not set'}</p>
          <div className="mt-4 grid gap-3">
            <LabelValue label="Updated" value={formatTimestamp(summaryBranding.updatedAt || summaryBranding.updated_at)} />
            <LabelValue label="Identifier" value={summaryBranding._id || 'Singleton'} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--color-bg)]/40 p-6 shadow-xl">
          <p className="text-sm font-semibold text-gray-400">Color Tokens</p>
          <div className="mt-4 space-y-4">
            <ColorSwatch label="Primary" color={summaryBranding.primary_color} />
            <ColorSwatch label="Accent" color={summaryBranding.accent_color} />
            <ColorSwatch label="Background" color={summaryBranding.bg_color} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--color-bg)]/40 p-6 shadow-xl">
          <p className="text-sm font-semibold text-gray-400">Feature Toggles</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold text-white">
            {FEATURE_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <ToggleLeft className={`h-4 w-4 ${summaryBranding.feature_toggles?.[key] ? 'text-[var(--color-primary)]' : 'text-gray-500'}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[var(--color-bg)]/40 p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-400">Media Assets</p>
              <p className="text-lg font-bold text-white">Logos & Favicon</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm text-gray-300">
            <LabelValue label="Logo (Light)" value={summaryBranding.logo_light_url} />
            <LabelValue label="Logo (Dark)" value={summaryBranding.logo_dark_url} />
            <LabelValue label="Favicon" value={summaryBranding.favicon_url} />
          </div>
        </div>

        <div
          ref={previewRef}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--color-bg)] to-black/60 p-6"
          style={previewStyles}
        >
          <p className="text-sm font-semibold text-gray-400">Live Preview</p>
          <div className="mt-4 flex items-center gap-4 rounded-2xl bg-black/20 p-4">
            <img src={form.logo_light_url} alt="Logo preview" className="h-12 w-12 rounded-xl object-contain" />
            <div>
              <p className="text-lg font-bold text-[var(--color-text)]">{form.display_name || 'Brand Preview'}</p>
              <p className="text-sm text-[var(--color-muted)]">System-wide tokens</p>
            </div>
          </div>
          <div className="mt-6 h-12 rounded-2xl bg-[var(--color-primary)] shadow-inner" />
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-3xl border border-white/10 bg-[var(--color-bg)]/60 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400">Editor</p>
            <h3 className="text-xl font-bold text-white">Branding Details</h3>
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            {canEdit ? (isEditing ? 'Editing Mode' : 'Super Admin Access') : 'Read Only'}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <UrlInput
              label="Display Name"
              value={form.display_name}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, display_name: v }))}
              placeholder="Brand name"
              error={validationErrors.display_name}
            />
            
            {/* Color Presets */}
            {canEdit && isEditing && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4 text-[var(--color-primary)]" />
                  <p className="text-sm font-semibold text-white">Color Presets</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-left transition hover:bg-white/5"
                    >
                      <div
                        className="h-6 w-6 rounded"
                        style={{ background: `linear-gradient(to right, ${preset.primary}, ${preset.accent})` }}
                      />
                      <span className="text-xs font-medium text-white">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <ColorInput
              label="Primary Color"
              value={form.primary_color}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, primary_color: v }))}
              error={validationErrors.primary_color}
            />
            <ColorInput
              label="Accent Color"
              value={form.accent_color}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, accent_color: v }))}
              error={validationErrors.accent_color}
            />
            <ColorInput
              label="Background Color"
              value={form.bg_color}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, bg_color: v }))}
              error={validationErrors.bg_color}
            />
            <ColorInput
              label="Text Color"
              value={form.text_color}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, text_color: v }))}
              error={validationErrors.text_color}
            />
            <ColorInput
              label="Muted Color"
              value={form.muted_color}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, muted_color: v }))}
              error={validationErrors.muted_color}
            />
          </div>

          <div className="space-y-5">
            <ImageUploadInput
              label="Logo (Light Mode)"
              value={form.logo_light_url}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, logo_light_url: v }))}
              placeholder="https://domain/logo-light.png or upload"
            />
            <ImageUploadInput
              label="Logo (Dark Mode)"
              value={form.logo_dark_url}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, logo_dark_url: v }))}
              placeholder="https://domain/logo-dark.png or upload"
            />
            <ImageUploadInput
              label="Favicon"
              value={form.favicon_url}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, favicon_url: v }))}
              placeholder="https://domain/favicon.ico or upload"
            />
            <ImageUploadInput
              label="Banner Image"
              value={form.banner_url}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, banner_url: v }))}
              placeholder="https://domain/banner.png or upload"
            />
            <ImageUploadInput
              label="Hero Background Image"
              value={form.hero_image_url}
              disabled={!canEdit || !isEditing}
              onChange={(v) => setForm((prev) => ({ ...prev, hero_image_url: v }))}
              placeholder="https://domain/hero.jpg or upload"
            />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[var(--color-primary)]" />
                <p className="text-sm font-semibold text-white">Live Modules</p>
              </div>
              <p className="mt-1 text-xs text-gray-400">Toggle experiences for all clients.</p>
              <div className="mt-4 space-y-3">
                {FEATURE_KEYS.map(({ key, label }) => (
                  <ToggleRow
                    key={key}
                    label={label}
                    enabled={!!form.feature_toggles?.[key]}
                    onToggle={() => handleToggle(key)}
                    disabled={!canEdit || !isEditing}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {canEdit && isEditing && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setForm({ ...DEFAULT_BRANDING, ...(activeBranding || {}) })
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}