/**
 * Flash Promotions Page
 *
 * Admin page for managing flash promotions.
 * Lists all promotions with filtering, and allows creating new ones.
 *
 * Story 20.2: Create Flash Promotion
 * @module src/pages/admin/FlashPromotionsPage
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import PromotionForm from '../../components/admin/PromotionForm';
import PromotionCard from '../../components/admin/PromotionCard';
import { Plus, Zap, Filter, RefreshCw, BarChart3, HelpCircle } from 'lucide-react';
import WalkthroughOverlay from '../../components/common/WalkthroughOverlay'
import { flashPromotionsSteps } from '../../config/walkthroughSteps'
import { fromStorageFormat } from '../../../convex/lib/points';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
  { value: 'ended', label: 'Ended' },
];

export default function FlashPromotionsPage() {
  const { user } = useCurrentUser();
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [showStats, setShowStats] = useState(null);

  // Queries
  const promotions = useQuery(api.services.promotions.getPromotions, {
    status: statusFilter || undefined,
    includeSystemWide: true,
  });

  const promoStats = useQuery(
    api.services.promotions.getPromoUsageStats,
    showStats ? { promoId: showStats._id } : 'skip'
  );

  // Aggregate stats for dashboard
  const aggregateStats = useQuery(api.services.promotions.getAggregatePromoStats, {});

  // Update promo statuses periodically
  const updateStatuses = useMutation(api.services.promotions.updatePromoStatuses);

  useEffect(() => {
    // Update statuses on mount
    updateStatuses().catch(console.error);

    // Update every minute
    const interval = setInterval(() => {
      updateStatuses().catch(console.error);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleEdit = (promo) => {
    setEditingPromo(promo);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPromo(null);
  };

  const handleFormSuccess = () => {
    // Form closes itself, just refresh
  };

  // Calculate summary stats
  const activeCount = promotions?.filter(p => p.status === 'active').length || 0;
  const scheduledCount = promotions?.filter(p => p.status === 'scheduled').length || 0;
  const totalBonusAwarded = promotions?.reduce((sum, p) => {
    // This would need actual usage data
    return sum;
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div data-tour="promos-header" className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Flash Promotions</h1>
              <p className="text-sm text-gray-400">Create and manage time-limited promotional events</p>
            </div>
            <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Promotion
          </button>
        </div>

        {/* Stats Cards */}
        <div data-tour="promos-stats" className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="text-gray-400 text-sm mb-1">Active Now</div>
            <div className="text-2xl font-bold text-green-400">{activeCount}</div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="text-gray-400 text-sm mb-1">Scheduled</div>
            <div className="text-2xl font-bold text-blue-400">{scheduledCount}</div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="text-gray-400 text-sm mb-1">Total Promos</div>
            <div className="text-2xl font-bold text-white">{promotions?.length || 0}</div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="text-gray-400 text-sm mb-1">Total Uses</div>
            <div className="text-2xl font-bold text-yellow-400">
              {aggregateStats?.totalUses || 0}
            </div>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="text-gray-400 text-sm mb-1">Bonus Awarded</div>
            <div className="text-2xl font-bold text-purple-400">
              {fromStorageFormat(aggregateStats?.totalBonusPoints || 0).toLocaleString()} pts
            </div>
          </div>
        </div>

        {/* Filters */}
        <div data-tour="promos-filters" className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filter:</span>
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-yellow-600 text-white'
                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Promotions Grid */}
        <div data-tour="promos-grid">
        {promotions === undefined ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-12 text-center">
            <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Promotions Found</h3>
            <p className="text-gray-400 mb-4">
              {statusFilter
                ? `No ${statusFilter} promotions. Try a different filter.`
                : 'Create your first flash promotion to reward customers!'}
            </p>
            {!statusFilter && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors"
              >
                Create First Promotion
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <PromotionCard
                key={promo._id}
                promotion={promo}
                onEdit={handleEdit}
                onViewStats={setShowStats}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Promotion Form Modal */}
      {showForm && (
        <PromotionForm
          promotion={editingPromo}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                Promo Statistics
              </h3>
              <button
                onClick={() => setShowStats(null)}
                className="p-2 text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center p-4 bg-[#2A2A2A] rounded-lg">
                <div className="text-2xl font-bold text-white mb-1">{showStats.name}</div>
                <div className="text-sm text-gray-400">
                  {showStats.type === 'bonus_points' ? `${showStats.multiplier}x Points` :
                   `+${(showStats.flat_amount || 0) / 100} ${showStats.type === 'wallet_bonus' ? 'Wallet' : 'pts'}`}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {promoStats?.totalUses || 0}
                  </div>
                  <div className="text-xs text-gray-500">Total Uses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {promoStats?.uniqueUsers || 0}
                  </div>
                  <div className="text-xs text-gray-500">Unique Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {fromStorageFormat(promoStats?.totalBonusPoints || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Bonus Pts</div>
                </div>
              </div>

              {promoStats?.recentUsage && promoStats.recentUsage.length > 0 && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Recent Usage</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {promoStats.recentUsage.map((usage, i) => (
                      <div key={i} className="flex justify-between text-sm p-2 bg-[#2A2A2A] rounded">
                        <span className="text-gray-400">
                          {new Date(usage.used_at).toLocaleString()}
                        </span>
                        <span className="text-green-400">
                          +{fromStorageFormat(usage.bonus_points)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowStats(null)}
              className="w-full mt-6 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showTutorial && (
        <WalkthroughOverlay steps={flashPromotionsSteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
      )}
    </div>
  );
}
