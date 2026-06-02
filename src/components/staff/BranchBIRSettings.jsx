import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Save,
  Loader2,
  Receipt,
  Building2,
  Cpu,
  Code2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

/**
 * Branch BIR Compliance Settings (BA-facing)
 * Mirrors the super-admin BIR tab in BranchFormModal, scoped to the BA's own branch.
 */
const BranchBIRSettings = ({ user }) => {
  const [formData, setFormData] = useState({
    business_name: '',
    business_style: '',
    registered_address: '',
    tin: '',
    or_branch_code: '',
    vat_registered: false,
    ptu_number: '',
    ptu_date_issued: '',
    min_number: '',
    pos_serial_number: '',
    accreditation_number: '',
    software_provider_name: '',
    software_provider_tin: '',
    software_provider_accreditation: '',
    software_provider_date_issued: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const branch = useQuery(
    api.services.branches.getBranchById,
    user?.branch_id ? { id: user.branch_id } : 'skip'
  )

  const updateBranch = useMutation(api.services.branches.updateBranch)

  useEffect(() => {
    if (branch) {
      setFormData({
        business_name: branch.business_name || '',
        business_style: branch.business_style || '',
        registered_address: branch.registered_address || '',
        tin: branch.tin || '',
        or_branch_code: branch.or_branch_code || '',
        vat_registered: branch.vat_registered ?? false,
        ptu_number: branch.ptu_number || '',
        ptu_date_issued: branch.ptu_date_issued || '',
        min_number: branch.min_number || '',
        pos_serial_number: branch.pos_serial_number || '',
        accreditation_number: branch.accreditation_number || '',
        software_provider_name: branch.software_provider_name || '',
        software_provider_tin: branch.software_provider_tin || '',
        software_provider_accreditation: branch.software_provider_accreditation || '',
        software_provider_date_issued: branch.software_provider_date_issued || '',
      })
    }
  }, [branch])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user?.branch_id) return

    setSaving(true)
    setMessage(null)
    try {
      await updateBranch({
        id: user.branch_id,
        business_name: formData.business_name || undefined,
        business_style: formData.business_style || undefined,
        registered_address: formData.registered_address || undefined,
        tin: formData.tin || undefined,
        or_branch_code: formData.or_branch_code || undefined,
        vat_registered: formData.vat_registered,
        ptu_number: formData.ptu_number || undefined,
        ptu_date_issued: formData.ptu_date_issued || undefined,
        min_number: formData.min_number || undefined,
        pos_serial_number: formData.pos_serial_number || undefined,
        accreditation_number: formData.accreditation_number || undefined,
        software_provider_name: formData.software_provider_name || undefined,
        software_provider_tin: formData.software_provider_tin || undefined,
        software_provider_accreditation: formData.software_provider_accreditation || undefined,
        software_provider_date_issued: formData.software_provider_date_issued || undefined,
      })
      setMessage({ type: 'success', text: 'BIR settings updated successfully.' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Failed to update BIR settings:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update BIR settings.' })
    } finally {
      setSaving(false)
    }
  }

  if (!user?.branch_id) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-400">No branch assigned to your account.</p>
      </div>
    )
  }

  if (branch === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    )
  }

  const inputClass = 'w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-400 mb-2'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">BIR Compliance</h2>
        <p className="text-sm text-gray-500 mt-1">
          These details print on every Official Receipt issued at this branch. Required for BIR compliance.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Identity */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333]">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
            Business Identity
          </h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Registered Business Name</label>
              <input type="text" name="business_name" value={formData.business_name} onChange={handleChange} className={inputClass} placeholder="As registered with BIR" />
            </div>
            <div>
              <label className={labelClass}>Business Style / Trade Name</label>
              <input type="text" name="business_style" value={formData.business_style} onChange={handleChange} className={inputClass} placeholder="DBA / trade name (optional)" />
            </div>
            <div>
              <label className={labelClass}>Registered Address</label>
              <textarea name="registered_address" value={formData.registered_address} onChange={handleChange} rows="2" className={inputClass} placeholder="BIR-registered address (defaults to branch address if blank)" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>TIN</label>
                <input type="text" name="tin" value={formData.tin} onChange={handleChange} className={inputClass} placeholder="000-000-000-00000" />
              </div>
              <div>
                <label className={labelClass}>OR Branch Code</label>
                <input type="text" name="or_branch_code" value={formData.or_branch_code} onChange={handleChange} className={inputClass} placeholder="e.g. MNL" />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="vat_registered"
                checked={formData.vat_registered}
                onChange={handleChange}
                className="w-5 h-5 rounded border-[#333] bg-[#0D0D0D] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm text-gray-300">VAT-Registered (12%)</span>
            </label>
          </div>
        </div>

        {/* POS Permit */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333]">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[var(--color-primary)]" />
            POS Permit (PTU)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>PTU Number</label>
              <input type="text" name="ptu_number" value={formData.ptu_number} onChange={handleChange} className={inputClass} placeholder="FP000000000000" />
            </div>
            <div>
              <label className={labelClass}>PTU Date Issued</label>
              <input type="date" name="ptu_date_issued" value={formData.ptu_date_issued} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>MIN (Machine ID)</label>
              <input type="text" name="min_number" value={formData.min_number} onChange={handleChange} className={inputClass} placeholder="00000000000000" />
            </div>
            <div>
              <label className={labelClass}>POS Serial Number</label>
              <input type="text" name="pos_serial_number" value={formData.pos_serial_number} onChange={handleChange} className={inputClass} placeholder="SN-XXXXXX" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Accreditation Number</label>
              <input type="text" name="accreditation_number" value={formData.accreditation_number} onChange={handleChange} className={inputClass} placeholder="000-000000000-000000" />
            </div>
          </div>
        </div>

        {/* Software Provider */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333]">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[var(--color-primary)]" />
            Software Provider
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Provider Name</label>
              <input type="text" name="software_provider_name" value={formData.software_provider_name} onChange={handleChange} className={inputClass} placeholder="e.g. Broadheader Inc." />
            </div>
            <div>
              <label className={labelClass}>Provider TIN</label>
              <input type="text" name="software_provider_tin" value={formData.software_provider_tin} onChange={handleChange} className={inputClass} placeholder="000-000-000-00000" />
            </div>
            <div>
              <label className={labelClass}>Accreditation Number</label>
              <input type="text" name="software_provider_accreditation" value={formData.software_provider_accreditation} onChange={handleChange} className={inputClass} placeholder="000-000000000-000000" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Accreditation Date</label>
              <input type="date" name="software_provider_date_issued" value={formData.software_provider_date_issued} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save BIR Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BranchBIRSettings
