/**
 * Promotion Form Component
 *
 * Form for creating and editing flash promotions.
 * Supports bonus_points, flat_bonus, and wallet_bonus types.
 *
 * Story 20.2: Create Flash Promotion
 * @module src/components/admin/PromotionForm
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { X, Zap, Gift, Wallet, Calendar, Users, Info } from 'lucide-react';

const PROMO_TYPES = [
  {
    value: 'bonus_points',
    label: 'Bonus Points',
    description: 'Multiply points earned (e.g., 2x points)',
    icon: Zap,
    color: 'text-yellow-400',
  },
  {
    value: 'flat_bonus',
    label: 'Flat Bonus',
    description: 'Add fixed bonus points to each transaction',
    icon: Gift,
    color: 'text-green-400',
  },
  {
    value: 'wallet_bonus',
    label: 'Wallet Bonus',
    description: 'Extra credit on wallet top-ups',
    icon: Wallet,
    color: 'text-blue-400',
  },
];

const TIER_OPTIONS = [
  { value: '', label: 'All Customers' },
  { value: 'bronze', label: 'Bronze & Above' },
  { value: 'silver', label: 'Silver & Above' },
  { value: 'gold', label: 'Gold & Above' },
  { value: 'platinum', label: 'Platinum Only' },
];

export default function PromotionForm({ promotion, onClose, onSuccess }) {
  const { user } = useCurrentUser();
  const isEditing = !!promotion;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'bonus_points',
    multiplier: '2.0',
    flatAmount: '100',
    branchId: '',
    tierRequirement: '',
    minPurchase: '',
    newCustomersOnly: false,
    maxUses: '',
    maxUsesPerUser: '1',
    startDate: '',
    startTime: '00:00',
    endDate: '',
    endTime: '23:59',
    status: 'scheduled',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Queries
  const branches = useQuery(api.services.branches.getAllBranches);

  // Mutations
  const createPromotion = useMutation(api.services.promotions.createPromotion);
  const updatePromotion = useMutation(api.services.promotions.updatePromotion);

  // Initialize form with existing promotion data
  useEffect(() => {
    if (promotion) {
      const startDate = new Date(promotion.start_at);
      const endDate = new Date(promotion.end_at);

      setFormData({
        name: promotion.name || '',
        description: promotion.description || '',
        type: promotion.type || 'bonus_points',
        multiplier: promotion.multiplier?.toString() || '2.0',
        flatAmount: promotion.flat_amount ? (promotion.flat_amount / 100).toString() : '100',
        branchId: promotion.branch_id || '',
        tierRequirement: promotion.tier_requirement || '',
        minPurchase: promotion.min_purchase?.toString() || '',
        newCustomersOnly: promotion.new_customers_only || false,
        maxUses: promotion.max_uses?.toString() || '',
        maxUsesPerUser: promotion.max_uses_per_user?.toString() || '1',
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5),
        status: promotion.status || 'scheduled',
      });
    } else {
      // Set default dates (tomorrow to next week)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      setFormData(prev => ({
        ...prev,
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
      }));
    }
  }, [promotion]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Promotion name is required');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required');
      return;
    }

    const startAt = new Date(`${formData.startDate}T${formData.startTime}`).getTime();
    const endAt = new Date(`${formData.endDate}T${formData.endTime}`).getTime();

    if (endAt <= startAt) {
      setError('End date must be after start date');
      return;
    }

    if (formData.type === 'bonus_points' && (!formData.multiplier || parseFloat(formData.multiplier) <= 1)) {
      setError('Multiplier must be greater than 1');
      return;
    }

    if ((formData.type === 'flat_bonus' || formData.type === 'wallet_bonus') &&
        (!formData.flatAmount || parseFloat(formData.flatAmount) <= 0)) {
      setError('Bonus amount must be greater than 0');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        multiplier: formData.type === 'bonus_points' ? parseFloat(formData.multiplier) : undefined,
        flat_amount: formData.type !== 'bonus_points' ? Math.round(parseFloat(formData.flatAmount) * 100) : undefined,
        branchId: formData.branchId || undefined,
        tierRequirement: formData.tierRequirement || undefined,
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : undefined,
        newCustomersOnly: formData.newCustomersOnly || undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        maxUsesPerUser: formData.maxUsesPerUser ? parseInt(formData.maxUsesPerUser) : 1,
        startAt,
        endAt,
        status: formData.status,
        createdBy: user._id,
      };

      if (isEditing) {
        await updatePromotion({
          promoId: promotion._id,
          ...payload,
        });
      } else {
        await createPromotion(payload);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = PROMO_TYPES.find(t => t.value === formData.type);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? 'Edit Promotion' : 'Create Flash Promotion'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Promotion Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Double Points Weekend"
              className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description shown to customers..."
              rows={2}
              className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>

          {/* Promo Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Promotion Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PROMO_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('type', type.value)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-[#2A2A2A] border-yellow-500'
                        : 'bg-[#1A1A1A] border-[#3A3A3A] hover:border-[#4A4A4A]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${type.color}`} />
                    <div className="text-sm font-medium text-white">{type.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type-specific Value */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {formData.type === 'bonus_points' ? 'Points Multiplier *' : 'Bonus Amount (Points) *'}
            </label>
            {formData.type === 'bonus_points' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="1.1"
                  value={formData.multiplier}
                  onChange={(e) => handleChange('multiplier', e.target.value)}
                  className="flex-1 px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
                <span className="text-gray-400">x</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">+</span>
                <input
                  type="number"
                  min="1"
                  value={formData.flatAmount}
                  onChange={(e) => handleChange('flatAmount', e.target.value)}
                  className="flex-1 px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
                <span className="text-gray-400">pts</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'bonus_points'
                ? `Customers earn ${formData.multiplier || 1}x points (e.g., ₱500 = ${Math.round(500 * (parseFloat(formData.multiplier) || 1))} pts)`
                : `Customers earn +${formData.flatAmount || 0} bonus points per transaction`}
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date & Time *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-28 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date & Time *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="w-28 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>

          {/* Branch Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Branch Scope
            </label>
            <select
              value={formData.branchId}
              onChange={(e) => handleChange('branchId', e.target.value)}
              className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:border-yellow-500"
            >
              <option value="">System-wide (All Branches)</option>
              {branches?.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Eligibility Rules */}
          <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Eligibility Rules</span>
            </div>

            <div className="space-y-4">
              {/* Tier Requirement */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Minimum Tier</label>
                <select
                  value={formData.tierRequirement}
                  onChange={(e) => handleChange('tierRequirement', e.target.value)}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                >
                  {TIER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Min Purchase */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Minimum Purchase (Optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₱</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.minPurchase}
                    onChange={(e) => handleChange('minPurchase', e.target.value)}
                    placeholder="No minimum"
                    className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Total Uses</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxUses}
                    onChange={(e) => handleChange('maxUses', e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => handleChange('maxUsesPerUser', e.target.value)}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* New Customers Only */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">New Customers Only</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.newCustomersOnly}
                    onChange={(e) => handleChange('newCustomersOnly', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 px-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : (isEditing ? 'Update Promotion' : 'Create Promotion')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
