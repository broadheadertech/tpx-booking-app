import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Settings, Save, AlertCircle, DollarSign, Loader2, Clock } from 'lucide-react'

const BookingSettingsModal = ({ isOpen, onClose, branchId }) => {
    const [formData, setFormData] = useState({
        enable_booking_fee: false,
        booking_fee_amount: 0,
        enable_late_fee: false,
        late_fee_amount: 0,
        booking_start_hour: 10,
        booking_end_hour: 20
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    // Fetch branch details
    const branch = useQuery(api.services.branches.getBranchById, branchId ? { id: branchId } : 'skip')
    const updateBranch = useMutation(api.services.branches.updateBranch)

    // Initialize form data when branch data is loaded
    useEffect(() => {
        if (branch) {
            setFormData({
                enable_booking_fee: branch.enable_booking_fee || false,
                booking_fee_amount: branch.booking_fee_amount || 0,
                booking_fee_type: branch.booking_fee_type || 'fixed',
                enable_late_fee: branch.enable_late_fee || false,
                late_fee_amount: branch.late_fee_amount || 0,
                late_fee_type: branch.late_fee_type || 'fixed',
                late_fee_grace_period: branch.late_fee_grace_period || 0,
                booking_start_hour: branch.booking_start_hour || 10,
                booking_end_hour: branch.booking_end_hour || 20
            })
        }
    }, [branch])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))

        // Clear messages on change
        if (error) setError('')
        if (success) setSuccess('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            await updateBranch({
                id: branchId,
                enable_booking_fee: formData.enable_booking_fee,
                booking_fee_amount: parseFloat(formData.booking_fee_amount) || 0,
                booking_fee_type: formData.booking_fee_type,
                enable_late_fee: formData.enable_late_fee,
                late_fee_amount: parseFloat(formData.late_fee_amount) || 0,
                late_fee_type: formData.late_fee_type,
                late_fee_grace_period: parseInt(formData.late_fee_grace_period) || 0,
                booking_start_hour: parseInt(formData.booking_start_hour) || 10,
                booking_end_hour: parseInt(formData.booking_end_hour) || 20
            })
            setSuccess('Booking settings updated successfully')
            setTimeout(() => {
                onClose()
                setSuccess('')
            }, 1500)
        } catch (err) {
            console.error('Error updating booking settings:', err)
            setError(err.message || 'Failed to update booking settings')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Booking Settings"
            variant="dark"
            size="md"
        >
            <div className="space-y-6">
                {branch === undefined ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl flex items-center space-x-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-xl flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-medium">{success}</p>
                            </div>
                        )}

                        <div className="bg-[#0F0F0F]/50 rounded-xl p-5 border border-[#333333]/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-base font-medium text-white">Apply Booking Fee</h4>
                                    <p className="text-xs text-gray-400 mt-1">Charge a fee for every booking</p>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input
                                        type="checkbox"
                                        name="enable_booking_fee"
                                        id="enable_booking_fee"
                                        checked={formData.enable_booking_fee}
                                        onChange={handleChange}
                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer duration-300 ease-in-out" // Simplified class, assuming global styles or adding style block
                                        style={{
                                            right: formData.enable_booking_fee ? '0' : '50%',
                                            borderColor: formData.enable_booking_fee ? 'var(--color-primary)' : '#4B5563'
                                        }}
                                    />
                                    <label
                                        htmlFor="enable_booking_fee"
                                        className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${formData.enable_booking_fee ? 'bg-[var(--color-primary)]' : 'bg-gray-700'
                                            }`}
                                    ></label>
                                </div>
                            </div>

                            {formData.enable_booking_fee && (
                                <div className="pt-4 border-t border-[#333333]/50 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Fee Type</label>
                                        <div className="flex gap-2 p-1 bg-[#0A0A0A] rounded-xl border border-[#333333]">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, booking_fee_type: 'fixed' }))}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${formData.booking_fee_type === 'fixed'
                                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                                        : 'text-gray-400 hover:text-white'
                                                    }`}
                                            >
                                                Fixed Amount
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, booking_fee_type: 'percent' }))}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${formData.booking_fee_type === 'percent'
                                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                                        : 'text-gray-400 hover:text-white'
                                                    }`}
                                            >
                                                Percentage
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                            {formData.booking_fee_type === 'percent' ? 'Percentage Value' : 'Fee Amount'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 sm:text-sm">
                                                    {formData.booking_fee_type === 'percent' ? '%' : '₱'}
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                name="booking_fee_amount"
                                                value={formData.booking_fee_amount}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                className="w-full pl-8 pr-4 py-2.5 bg-[#0A0A0A] border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                                required={formData.enable_booking_fee}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-[#0F0F0F]/50 rounded-xl p-5 border border-[#333333]/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-base font-medium text-white">Apply Late Fee</h4>
                                    <p className="text-xs text-gray-400 mt-1">Charge a fee for late arrivals</p>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input
                                        type="checkbox"
                                        name="enable_late_fee"
                                        id="enable_late_fee"
                                        checked={formData.enable_late_fee}
                                        onChange={handleChange}
                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer duration-300 ease-in-out"
                                        style={{
                                            right: formData.enable_late_fee ? '0' : '50%',
                                            borderColor: formData.enable_late_fee ? 'var(--color-primary)' : '#4B5563'
                                        }}
                                    />
                                    <label
                                        htmlFor="enable_late_fee"
                                        className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${formData.enable_late_fee ? 'bg-[var(--color-primary)]' : 'bg-gray-700'}`}
                                    ></label>
                                </div>
                            </div>

                            {formData.enable_late_fee && (
                                <div className="pt-4 border-t border-[#333333]/50 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Late Fee Type</label>
                                        <select
                                            name="late_fee_type"
                                            value={formData.late_fee_type}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333333] rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-all text-sm"
                                        >
                                            <option value="fixed">Fixed Amount</option>
                                            <option value="per_minute">Per Minute Late</option>
                                            <option value="per_hour">Per Hour Late</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                            {formData.late_fee_type === 'fixed' ? 'Fee Amount' : 'Rate Amount'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 sm:text-sm">₱</span>
                                            </div>
                                            <input
                                                type="number"
                                                name="late_fee_amount"
                                                value={formData.late_fee_amount}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                className="w-full pl-8 pr-4 py-2.5 bg-[#0A0A0A] border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                                required={formData.enable_late_fee}
                                            />
                                            {formData.late_fee_type !== 'fixed' && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 text-xs">
                                                        /{formData.late_fee_type === 'per_minute' ? 'min' : 'hr'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Grace Period (Minutes)</label>
                                        <input
                                            type="number"
                                            name="late_fee_grace_period"
                                            value={formData.late_fee_grace_period}
                                            onChange={handleChange}
                                            placeholder="15"
                                            min="0"
                                            className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">No fee charged if within this time</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Operating Hours Section */}
                        <div className="bg-[#0F0F0F]/50 rounded-xl p-5 border border-[#333333]/50 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-[var(--color-primary)]" />
                                <div>
                                    <h4 className="text-base font-medium text-white">Operating Hours</h4>
                                    <p className="text-xs text-gray-400">Set the hours when bookings can be made</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Start Hour (24h)</label>
                                    <select
                                        name="booking_start_hour"
                                        value={formData.booking_start_hour}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333333] rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-all"
                                    >
                                        {[...Array(24)].map((_, i) => (
                                            <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">End Hour (24h)</label>
                                    <select
                                        name="booking_end_hour"
                                        value={formData.booking_end_hour}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333333] rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-all"
                                    >
                                        {[...Array(24)].map((_, i) => (
                                            <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Validation warning if end <= start */}
                            {parseInt(formData.booking_end_hour) <= parseInt(formData.booking_start_hour) && (
                                <div className="flex items-center gap-2 text-amber-500 text-xs mt-2 bg-amber-500/10 p-2 rounded-lg">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>End time must be after start time.</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-[#333333] transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Settings
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    )
}

function CheckCircle({ className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    )
}

export default BookingSettingsModal
