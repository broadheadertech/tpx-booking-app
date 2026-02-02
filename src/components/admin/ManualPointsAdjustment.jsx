/**
 * Manual Points Adjustment Component
 *
 * Super Admin tool to manually adjust customer points balances.
 * Includes customer search, adjustment form, and audit history.
 *
 * Story 19.4: Manual Points Adjustment
 * @module src/components/admin/ManualPointsAdjustment
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { fromStorageFormat } from '../../../convex/lib/points';

/**
 * Format points from storage format to display
 * @param {number} points - Points in ×100 format
 * @returns {string} Formatted points string
 */
const formatPoints = (points) => {
  const value = fromStorageFormat(points || 0);
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

/**
 * Convert display points to storage format (×100)
 * @param {number} displayValue - Human-readable points value
 * @returns {number} Storage format value
 */
const toStorageFormat = (displayValue) => {
  return Math.round(displayValue * 100);
};

/**
 * Debounce hook for search input
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export default function ManualPointsAdjustment() {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Adjustment form state
  const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' or 'deduct'
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // UI state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNegativeBalance, setPendingNegativeBalance] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Debounced search term
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Queries
  const searchResults = useQuery(
    api.services.points.searchCustomersForAdjustment,
    debouncedSearch.trim() ? { searchTerm: debouncedSearch, limit: 8 } : 'skip'
  );

  const recentAdjustments = useQuery(
    api.services.points.getRecentAdjustments,
    { limit: 10 }
  );

  // Mutation
  const adjustPoints = useMutation(api.services.points.adjustPoints);

  // Calculate preview balance
  const previewBalance = useMemo(() => {
    if (!selectedCustomer || !amount) return null;

    const adjustmentAmount = adjustmentType === 'add'
      ? toStorageFormat(parseFloat(amount))
      : -toStorageFormat(parseFloat(amount));

    return selectedCustomer.currentBalance + adjustmentAmount;
  }, [selectedCustomer, amount, adjustmentType]);

  // Handle customer selection
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchTerm('');
    setAmount('');
    setReason('');
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Handle form submission
  const handleSubmit = async (allowNegative = false) => {
    if (!selectedCustomer || !amount || !reason.trim()) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid positive amount');
      return;
    }

    setErrorMessage(null);
    setShowConfirmModal(false);

    const adjustmentAmount = adjustmentType === 'add'
      ? toStorageFormat(parsedAmount)
      : -toStorageFormat(parsedAmount);

    try {
      // For this demo, use a placeholder admin ID
      // In production, get from Clerk auth context
      const result = await adjustPoints({
        userId: selectedCustomer.userId,
        amount: adjustmentAmount,
        reason: reason.trim(),
        allowNegativeBalance: allowNegative,
        adjustedBy: selectedCustomer.userId, // Placeholder - should be actual admin ID
      });

      if (result.success === false && result.error === 'NEGATIVE_BALANCE') {
        // Show negative balance warning
        setPendingNegativeBalance({
          oldBalance: result.oldBalance,
          newBalance: result.newBalance,
        });
        return;
      }

      if (result.success) {
        setSuccessMessage({
          oldBalance: result.oldBalance,
          newBalance: result.newBalance,
          adjustment: result.adjustment,
          tierPromotion: result.tierPromotion,
        });

        // Update selected customer's balance
        setSelectedCustomer(prev => ({
          ...prev,
          currentBalance: result.newBalance,
        }));

        // Reset form
        setAmount('');
        setReason('');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to adjust points');
    }
  };

  // Handle negative balance confirmation
  const handleConfirmNegativeBalance = async () => {
    setPendingNegativeBalance(null);
    await handleSubmit(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] pb-4">
        <h3 className="text-lg font-semibold text-white">Manual Points Adjustment</h3>
        <p className="text-sm text-gray-400 mt-1">
          Search for a customer and adjust their points balance
        </p>
      </div>

      {/* Customer Search Section */}
      <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Search Customer
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
          />

          {/* Search Results Dropdown */}
          {searchTerm && searchResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((customer) => (
                <button
                  key={customer.userId}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full px-4 py-3 text-left hover:bg-[#3A3A3A] border-b border-[#3A3A3A] last:border-b-0 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-medium">{customer.name}</div>
                      <div className="text-gray-400 text-sm">{customer.email}</div>
                      {customer.phone && (
                        <div className="text-gray-500 text-xs">{customer.phone}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-500 font-medium">
                        {formatPoints(customer.currentBalance)} pts
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchTerm && searchResults && searchResults.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg shadow-lg p-4 text-gray-400 text-center">
              No customers found
            </div>
          )}
        </div>
      </div>

      {/* Selected Customer & Adjustment Form */}
      {selectedCustomer && (
        <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
          {/* Selected Customer Info */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2A2A2A]">
            <div>
              <div className="text-white font-semibold text-lg">{selectedCustomer.name}</div>
              <div className="text-gray-400 text-sm">{selectedCustomer.email}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-xs uppercase">Current Balance</div>
              <div className="text-yellow-500 font-bold text-xl">
                {formatPoints(selectedCustomer.currentBalance)} pts
              </div>
            </div>
          </div>

          {/* Adjustment Type Toggle */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Adjustment Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAdjustmentType('add')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  adjustmentType === 'add'
                    ? 'bg-green-600 text-white'
                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                }`}
              >
                + Add Points
              </button>
              <button
                onClick={() => setAdjustmentType('deduct')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  adjustmentType === 'deduct'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                }`}
              >
                - Deduct Points
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (Points)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter points amount..."
              min="0"
              step="0.01"
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* Reason Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for this adjustment (required for audit)..."
              rows={3}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>

          {/* Balance Preview */}
          {previewBalance !== null && amount && (
            <div className="mb-4 p-3 bg-[#2A2A2A] rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Balance Preview</div>
              <div className="flex items-center gap-3 text-lg">
                <span className="text-gray-400">{formatPoints(selectedCustomer.currentBalance)}</span>
                <span className="text-gray-500">→</span>
                <span className={previewBalance < 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                  {formatPoints(previewBalance)} pts
                </span>
                {previewBalance < 0 && (
                  <span className="text-red-400 text-sm">(Negative Balance!)</span>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
              <div className="text-green-300 font-medium mb-1">Adjustment Successful!</div>
              <div className="text-green-400 text-sm">
                {formatPoints(successMessage.oldBalance)} → {formatPoints(successMessage.newBalance)} pts
                ({successMessage.adjustment > 0 ? '+' : ''}{formatPoints(successMessage.adjustment)})
              </div>
              {successMessage.tierPromotion && (
                <div className="text-yellow-400 text-sm mt-1">
                  🎉 Tier promoted: {successMessage.tierPromotion.previousTier} → {successMessage.tierPromotion.newTier}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={!amount || !reason.trim()}
            className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {adjustmentType === 'add' ? 'Add' : 'Deduct'} {amount ? formatPoints(toStorageFormat(parseFloat(amount) || 0)) : '0'} Points
          </button>
        </div>
      )}

      {/* Recent Adjustments History */}
      <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
        <h4 className="text-md font-semibold text-white mb-3">Recent Adjustments</h4>
        {recentAdjustments && recentAdjustments.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentAdjustments.map((adj) => (
              <div
                key={adj._id}
                className="flex items-center justify-between p-2 bg-[#2A2A2A] rounded-lg text-sm"
              >
                <div>
                  <div className="text-white">{adj.userName}</div>
                  <div className="text-gray-500 text-xs truncate max-w-xs" title={adj.notes}>
                    {adj.notes?.replace(/\[MANUAL_ADJUST by [^\]]+\] ?/, '') || 'No reason'}
                  </div>
                </div>
                <div className="text-right">
                  <div className={adj.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {adj.amount >= 0 ? '+' : ''}{formatPoints(adj.amount)} pts
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(adj.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">No recent adjustments</div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 max-w-md w-full mx-4 border border-[#2A2A2A]">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Adjustment</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Customer:</span>
                <span className="text-white">{selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Type:</span>
                <span className={adjustmentType === 'add' ? 'text-green-400' : 'text-red-400'}>
                  {adjustmentType === 'add' ? 'Add Points' : 'Deduct Points'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white">{formatPoints(toStorageFormat(parseFloat(amount) || 0))} pts</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">New Balance:</span>
                <span className={previewBalance < 0 ? 'text-red-400' : 'text-white'}>
                  {formatPoints(previewBalance)} pts
                </span>
              </div>
              <div className="pt-2 border-t border-[#2A2A2A]">
                <span className="text-gray-400 text-sm">Reason:</span>
                <p className="text-white text-sm mt-1">{reason}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 px-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                className="flex-1 py-2 px-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Negative Balance Warning Modal */}
      {pendingNegativeBalance && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 max-w-md w-full mx-4 border border-red-700">
            <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Negative Balance Warning</h3>
            <p className="text-gray-300 mb-4">
              This adjustment will result in a negative points balance:
            </p>
            <div className="bg-red-900/30 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Balance:</span>
                <span className="text-white">{formatPoints(pendingNegativeBalance.oldBalance)} pts</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">New Balance:</span>
                <span className="text-red-400 font-bold">{formatPoints(pendingNegativeBalance.newBalance)} pts</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Do you want to proceed with this adjustment?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingNegativeBalance(null)}
                className="flex-1 py-2 px-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNegativeBalance}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
