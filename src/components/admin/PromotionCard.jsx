/**
 * Promotion Card Component
 *
 * Displays a flash promotion with status, details, and action buttons.
 *
 * Story 20.2: Create Flash Promotion
 * @module src/components/admin/PromotionCard
 */

import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Zap, Gift, Wallet, Clock, Users, MapPin, MoreVertical, Play, Square, Edit, BarChart3 } from 'lucide-react';

const STATUS_STYLES = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Draft' },
  scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Scheduled' },
  active: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Active' },
  ended: { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20', label: 'Ended' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Cancelled' },
};

const TYPE_ICONS = {
  bonus_points: { icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  flat_bonus: { icon: Gift, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  wallet_bonus: { icon: Wallet, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
};

export default function PromotionCard({ promotion, onEdit, onViewStats }) {
  const [showMenu, setShowMenu] = React.useState(false);

  const endPromotion = useMutation(api.services.promotions.endPromotion);
  const updatePromotion = useMutation(api.services.promotions.updatePromotion);

  const statusStyle = STATUS_STYLES[promotion.status] || STATUS_STYLES.draft;
  const typeInfo = TYPE_ICONS[promotion.type] || TYPE_ICONS.bonus_points;
  const TypeIcon = typeInfo.icon;

  const now = Date.now();
  const isActive = promotion.status === 'active';
  const isScheduled = promotion.status === 'scheduled';
  const canEdit = promotion.status === 'draft' || promotion.status === 'scheduled';

  // Calculate time remaining or until start
  const getTimeText = () => {
    if (promotion.status === 'ended' || promotion.status === 'cancelled') {
      return `Ended ${new Date(promotion.end_at).toLocaleDateString()}`;
    }

    if (isActive) {
      const hoursLeft = Math.max(0, Math.floor((promotion.end_at - now) / (60 * 60 * 1000)));
      if (hoursLeft < 24) {
        return `${hoursLeft}h remaining`;
      }
      const daysLeft = Math.floor(hoursLeft / 24);
      return `${daysLeft}d ${hoursLeft % 24}h remaining`;
    }

    if (isScheduled) {
      const hoursUntil = Math.floor((promotion.start_at - now) / (60 * 60 * 1000));
      if (hoursUntil < 0) return 'Starting soon...';
      if (hoursUntil < 24) {
        return `Starts in ${hoursUntil}h`;
      }
      return `Starts ${new Date(promotion.start_at).toLocaleDateString()}`;
    }

    return `${new Date(promotion.start_at).toLocaleDateString()} - ${new Date(promotion.end_at).toLocaleDateString()}`;
  };

  // Get promo value display
  const getValueText = () => {
    if (promotion.type === 'bonus_points') {
      return `${promotion.multiplier}x Points`;
    }
    const amount = (promotion.flat_amount || 0) / 100;
    return promotion.type === 'wallet_bonus' ? `+₱${amount} Wallet` : `+${amount} pts`;
  };

  const handleEnd = async () => {
    if (!confirm('Are you sure you want to end this promotion? This cannot be undone.')) return;
    try {
      await endPromotion({ promoId: promotion._id });
    } catch (error) {
      alert('Failed to end promotion: ' + error.message);
    }
    setShowMenu(false);
  };

  const handleActivate = async () => {
    try {
      await updatePromotion({ promoId: promotion._id, status: 'active' });
    } catch (error) {
      alert('Failed to activate promotion: ' + error.message);
    }
    setShowMenu(false);
  };

  return (
    <div className={`bg-[#1A1A1A] rounded-xl border ${isActive ? 'border-green-500/30' : 'border-[#2A2A2A]'} p-5 relative`}>
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
          {statusStyle.label}
        </span>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-40 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg shadow-lg z-20 py-1">
                {canEdit && (
                  <button
                    onClick={() => { onEdit?.(promotion); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3A3A3A] flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {isScheduled && (
                  <button
                    onClick={handleActivate}
                    className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-[#3A3A3A] flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Activate Now
                  </button>
                )}
                {isActive && (
                  <button
                    onClick={handleEnd}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[#3A3A3A] flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    End Now
                  </button>
                )}
                <button
                  onClick={() => { onViewStats?.(promotion); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3A3A3A] flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Stats
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Type Icon & Value */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${typeInfo.bgColor} flex items-center justify-center`}>
          <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
        </div>
        <div>
          <div className="text-white font-semibold">{promotion.name}</div>
          <div className={`text-sm font-medium ${typeInfo.color}`}>{getValueText()}</div>
        </div>
      </div>

      {/* Description */}
      {promotion.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{promotion.description}</p>
      )}

      {/* Meta Info */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {getTimeText()}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {promotion.branchName || 'All Branches'}
        </span>
        {promotion.total_uses > 0 && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {promotion.total_uses} uses
          </span>
        )}
      </div>

      {/* Eligibility Tags */}
      {(promotion.tier_requirement || promotion.min_purchase) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {promotion.tier_requirement && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
              {promotion.tier_requirement}+ tier
            </span>
          )}
          {promotion.min_purchase && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
              Min ₱{promotion.min_purchase}
            </span>
          )}
        </div>
      )}

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-500 animate-pulse" style={{ transform: 'translate(30%, -30%)' }} />
      )}
    </div>
  );
}
