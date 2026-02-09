/**
 * Points Expiry Panel Component
 *
 * Super Admin can configure points expiry settings and view expiry statistics.
 * - Enable/disable expiry
 * - Configure expiry period (months)
 * - Configure warning period (days)
 * - View upcoming expirations
 * - Run expiry job (dry run or process)
 *
 * Story 19.5: Points Expiry Management
 * @module src/components/admin/PointsExpiryPanel
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { fromStorageFormat } from '../../../convex/lib/points';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Clock, AlertTriangle, Calendar, Users, Play, Settings, CheckCircle } from 'lucide-react';

/**
 * Format points from storage format to display
 */
const formatPoints = (points) => {
  const value = fromStorageFormat(points || 0);
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export default function PointsExpiryPanel() {
  const { user } = useCurrentUser();

  // Local state for form
  const [expiryEnabled, setExpiryEnabled] = useState(null);
  const [expiryMonths, setExpiryMonths] = useState('');
  const [warningDays, setWarningDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dryRunResult, setDryRunResult] = useState(null);

  // Queries
  const expiryConfig = useQuery(api.services.points.getExpiryConfig);
  const expirySummary = useQuery(api.services.points.getExpiringSummary);

  // Mutations
  const setConfigMutation = useMutation(api.services.loyaltyConfig.setConfig);
  const processExpiry = useMutation(api.services.points.processPointsExpiry);

  // Initialize form values when config loads
  React.useEffect(() => {
    if (expiryConfig && expiryEnabled === null) {
      setExpiryEnabled(expiryConfig.enabled);
      setExpiryMonths(String(expiryConfig.expiryMonths));
      setWarningDays(String(expiryConfig.warningDays));
    }
  }, [expiryConfig, expiryEnabled]);

  // Save expiry settings
  const handleSaveSettings = async () => {
    if (!user?._id) {
      setMessage({ type: 'error', text: 'Not authenticated' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Save all three settings
      await setConfigMutation({
        key: 'points_expiry_enabled',
        value: expiryEnabled ? 'true' : 'false',
        userId: user._id,
        reason: 'Updated via Points Expiry Panel',
      });

      await setConfigMutation({
        key: 'points_expiry_months',
        value: expiryMonths,
        userId: user._id,
        reason: 'Updated via Points Expiry Panel',
      });

      await setConfigMutation({
        key: 'expiry_warning_days',
        value: warningDays,
        userId: user._id,
        reason: 'Updated via Points Expiry Panel',
      });

      setMessage({ type: 'success', text: 'Expiry settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Run dry run to preview what would expire
  const handleDryRun = async () => {
    setProcessing(true);
    setDryRunResult(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await processExpiry({ dryRun: true });
      setDryRunResult(result);
      setMessage({
        type: 'info',
        text: `Preview: ${result.wouldExpire || 0} accounts would have ${formatPoints(result.totalPointsWouldExpire || 0)} points expired`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Dry run failed' });
    } finally {
      setProcessing(false);
    }
  };

  // Process actual expiry
  const handleProcessExpiry = async () => {
    if (!confirm('Are you sure you want to expire points for all inactive accounts? This action cannot be undone.')) {
      return;
    }

    setProcessing(true);
    setDryRunResult(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await processExpiry({ dryRun: false });
      setMessage({
        type: 'success',
        text: `Processed: ${result.processed} accounts, ${formatPoints(result.totalPointsExpired)} points expired`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Processing failed' });
    } finally {
      setProcessing(false);
    }
  };

  if (!expiryConfig) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#2A2A2A] pb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <Clock className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Points Expiry Management</h3>
          <p className="text-sm text-gray-400">Configure when inactive points expire</p>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
          message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
          'bg-blue-500/10 text-blue-400 border border-blue-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      {expirySummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400">Upcoming Expirations</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{expirySummary.upcomingExpirations}</div>
            <div className="text-xs text-gray-500">accounts at risk</div>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Points at Risk</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{formatPoints(expirySummary.totalPointsAtRisk)}</div>
            <div className="text-xs text-gray-500">pts expiring soon</div>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-400">Expired (30d)</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{expirySummary.recentlyExpired}</div>
            <div className="text-xs text-gray-500">transactions</div>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Status</span>
            </div>
            <div className={`text-2xl font-bold ${expirySummary.enabled ? 'text-green-400' : 'text-gray-500'}`}>
              {expirySummary.enabled ? 'Active' : 'Off'}
            </div>
            <div className="text-xs text-gray-500">
              {expirySummary.enabled ? `${expirySummary.expiryMonths}mo expiry` : 'expiry disabled'}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Section */}
      <div className="bg-[#1A1A1A] rounded-lg p-5 border border-[#2A2A2A]">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--color-primary)]" />
          Expiry Configuration
        </h4>

        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
            <div>
              <p className="text-sm font-medium text-white">Enable Points Expiry</p>
              <p className="text-xs text-gray-500">Automatically expire points after inactivity period</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={expiryEnabled || false}
                onChange={(e) => setExpiryEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* Expiry Months */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Expiry Period (Months)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={expiryMonths}
              onChange={(e) => setExpiryMonths(e.target.value)}
              disabled={!expiryEnabled}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Points will expire after this many months of inactivity (0 = never expire)
            </p>
          </div>

          {/* Warning Days */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Warning Period (Days)
            </label>
            <input
              type="number"
              min="0"
              max="90"
              value={warningDays}
              onChange={(e) => setWarningDays(e.target.value)}
              disabled={!expiryEnabled}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Show expiry warning to customers this many days before points expire
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Expiry Settings'}
          </button>
        </div>
      </div>

      {/* Process Expiry Section */}
      {expiryEnabled && (
        <div className="bg-[#1A1A1A] rounded-lg p-5 border border-[#2A2A2A]">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-red-400" />
            Run Expiry Process
          </h4>

          <p className="text-sm text-gray-400 mb-4">
            Manually trigger the expiry process. Use "Preview" to see what would expire before processing.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleDryRun}
              disabled={processing}
              className="flex-1 py-2 px-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] disabled:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {processing ? 'Running...' : 'Preview (Dry Run)'}
            </button>
            <button
              onClick={handleProcessExpiry}
              disabled={processing}
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              {processing ? 'Processing...' : 'Process Expiry'}
            </button>
          </div>

          {/* Dry Run Results */}
          {dryRunResult && dryRunResult.details && dryRunResult.details.length > 0 && (
            <div className="mt-4 bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
              <div className="text-sm text-gray-400 mb-2">
                Would expire {dryRunResult.wouldExpire} accounts:
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {dryRunResult.details.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-white">{item.userName}</span>
                    <span className="text-orange-400">{formatPoints(item.balance)} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* At-Risk Customers */}
      {expirySummary && expirySummary.customers && expirySummary.customers.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-lg p-5 border border-[#2A2A2A]">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Customers with Points Expiring Soon
          </h4>

          <div className="space-y-2">
            {expirySummary.customers.map((customer) => (
              <div
                key={customer.userId}
                className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
              >
                <div>
                  <div className="text-white font-medium">{customer.userName}</div>
                  <div className="text-xs text-gray-500">{customer.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-medium">
                    {formatPoints(customer.pointsAtRisk)} pts
                  </div>
                  <div className={`text-xs ${customer.daysUntilExpiry <= 7 ? 'text-red-400' : 'text-orange-400'}`}>
                    {customer.daysUntilExpiry} days left
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
