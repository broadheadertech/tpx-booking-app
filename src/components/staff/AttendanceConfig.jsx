import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Shield, Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'

const AttendanceConfig = ({ branchId, barbers = [] }) => {
  const config = useQuery(
    api.services.faceAttendance.getAttendanceConfig,
    branchId ? { branch_id: branchId } : "skip"
  )
  const enrollments = useQuery(
    api.services.faceAttendance.getEnrollmentsByBranch,
    branchId ? { branch_id: branchId } : "skip"
  )
  const staffUsers = useQuery(
    api.services.auth.getUsersByBranch,
    branchId ? { branch_id: branchId } : "skip"
  )
  const saveConfig = useMutation(api.services.faceAttendance.saveAttendanceConfig)

  const [frEnabled, setFrEnabled] = useState(false)
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(95)
  const [adminReviewThreshold, setAdminReviewThreshold] = useState(80)
  const [livenessRequired, setLivenessRequired] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [barberOverrides, setBarberOverrides] = useState([])
  const [staffOverrides, setStaffOverrides] = useState([])

  // Sync from server
  useEffect(() => {
    if (config) {
      setFrEnabled(config.fr_enabled || false)
      setAutoApproveThreshold(Math.round((config.auto_approve_threshold || 0.95) * 100))
      setAdminReviewThreshold(Math.round((config.admin_review_threshold || 0.80) * 100))
      setLivenessRequired(config.liveness_required !== false)
      setBarberOverrides(config.barber_overrides || [])
      setStaffOverrides(config.staff_overrides || [])
    }
  }, [config])

  const enrolledBarberIds = new Set(enrollments?.filter(e => e.barber_id).map(e => e.barber_id) || [])
  const enrolledUserIds = new Set(enrollments?.filter(e => e.user_id).map(e => e.user_id) || [])

  // Filter to staff roles only
  const staffRoles = ['staff', 'branch_admin', 'admin_staff']
  const filteredStaff = (staffUsers || []).filter(u => staffRoles.includes(u.role) && u.is_active !== false)

  const handleSave = async () => {
    if (!branchId) return
    setSaving(true)
    setSaved(false)
    try {
      await saveConfig({
        branch_id: branchId,
        fr_enabled: frEnabled,
        auto_approve_threshold: autoApproveThreshold / 100,
        admin_review_threshold: adminReviewThreshold / 100,
        liveness_required: livenessRequired,
        barber_overrides: barberOverrides,
        staff_overrides: staffOverrides,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save config:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleBarberExempt = (barberId) => {
    setBarberOverrides(prev => {
      const existing = prev.find(o => o.barber_id === barberId)
      if (existing) {
        return prev.map(o => o.barber_id === barberId ? { ...o, fr_exempt: !o.fr_exempt } : o)
      }
      return [...prev, { barber_id: barberId, fr_exempt: true }]
    })
  }

  const isExempt = (barberId) => {
    return barberOverrides.find(o => o.barber_id === barberId)?.fr_exempt || false
  }

  const toggleStaffExempt = (userId) => {
    setStaffOverrides(prev => {
      const existing = prev.find(o => o.user_id === userId)
      if (existing) {
        return prev.map(o => o.user_id === userId ? { ...o, fr_exempt: !o.fr_exempt } : o)
      }
      return [...prev, { user_id: userId, fr_exempt: true }]
    })
  }

  const isStaffExempt = (userId) => {
    return staffOverrides.find(o => o.user_id === userId)?.fr_exempt || false
  }

  return (
    <div className="space-y-4">
      {/* FR Master Toggle */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[var(--color-primary)]" />
            <div>
              <h3 className="text-white font-medium">Facial Recognition</h3>
              <p className="text-gray-500 text-xs">Enable FR-based attendance for this branch</p>
            </div>
          </div>
          <button onClick={() => setFrEnabled(!frEnabled)}>
            {frEnabled ? (
              <ToggleRight className="w-8 h-8 text-green-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {frEnabled && (
        <>
          {/* Thresholds */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 space-y-4">
            <h3 className="text-white font-medium text-sm">Confidence Thresholds</h3>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Auto-approve threshold</span>
                <span className="text-green-400 font-medium">{autoApproveThreshold}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="100"
                value={autoApproveThreshold}
                onChange={e => setAutoApproveThreshold(Number(e.target.value))}
                className="w-full accent-green-500"
              />
              <p className="text-gray-600 text-[10px] mt-0.5">Matches above this are auto-approved (skip staff queue)</p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Admin review threshold</span>
                <span className="text-amber-400 font-medium">{adminReviewThreshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                value={adminReviewThreshold}
                onChange={e => setAdminReviewThreshold(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <p className="text-gray-600 text-[10px] mt-0.5">Matches below this threshold are rejected</p>
            </div>
          </div>

          {/* Liveness */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium text-sm">Liveness Check</h3>
                <p className="text-gray-500 text-xs">Require blink + head turn during check-in</p>
              </div>
              <button onClick={() => setLivenessRequired(!livenessRequired)}>
                {livenessRequired ? (
                  <ToggleRight className="w-7 h-7 text-green-500" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Per-barber overrides */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 space-y-3">
            <h3 className="text-white font-medium text-sm">Per-Barber Settings</h3>
            <p className="text-gray-600 text-xs">Toggle which barbers require facial recognition</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {barbers.map(barber => (
                <div key={barber._id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#0A0A0A]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{barber.full_name}</span>
                    {enrolledBarberIds.has(barber._id) ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Enrolled</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20">Not enrolled</span>
                    )}
                  </div>
                  <button onClick={() => toggleBarberExempt(barber._id)} className="text-xs">
                    {isExempt(barber._id) ? (
                      <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Exempt</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Required</span>
                    )}
                  </button>
                </div>
              ))}
              {barbers.length === 0 && (
                <p className="text-gray-600 text-xs text-center py-4">No barbers in this branch</p>
              )}
            </div>
          </div>

          {/* Per-staff overrides */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 space-y-3">
            <h3 className="text-white font-medium text-sm">Per-Staff Settings</h3>
            <p className="text-gray-600 text-xs">Toggle which staff users require facial recognition</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredStaff.map(staffUser => (
                <div key={staffUser._id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#0A0A0A]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{staffUser.nickname || staffUser.username}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{staffUser.role.replace('_', ' ')}</span>
                    {enrolledUserIds.has(staffUser._id) ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Enrolled</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20">Not enrolled</span>
                    )}
                  </div>
                  <button onClick={() => toggleStaffExempt(staffUser._id)} className="text-xs">
                    {isStaffExempt(staffUser._id) ? (
                      <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Exempt</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Required</span>
                    )}
                  </button>
                </div>
              ))}
              {filteredStaff.length === 0 && (
                <p className="text-gray-600 text-xs text-center py-4">No staff users in this branch</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
      </button>
    </div>
  )
}

export default AttendanceConfig
