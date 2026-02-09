import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * useTierPromotion - Hook to manage VIP tier promotion state and celebration
 *
 * Features:
 * - Tracks promotion state from earnPoints response
 * - Provides celebration trigger and dismiss functions
 * - Fetches new tier benefits for celebration display
 *
 * Usage:
 * ```jsx
 * const { promotion, showCelebration, handlePromotion, dismissCelebration } = useTierPromotion(userId);
 *
 * // After calling earnPoints mutation:
 * const result = await earnPoints({ ... });
 * if (result.tierPromotion?.promoted) {
 *   handlePromotion(result.tierPromotion);
 * }
 *
 * // In JSX:
 * {showCelebration && (
 *   <TierPromotionCelebration
 *     promotion={promotion}
 *     benefits={newTierBenefits}
 *     onClose={dismissCelebration}
 *   />
 * )}
 * ```
 */
export function useTierPromotion(userId) {
  const [promotion, setPromotion] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Get current tier with benefits for celebration display
  const userTier = useQuery(
    api.services.tiers.getUserTier,
    userId && promotion?.promoted ? { userId } : "skip"
  );

  /**
   * Handle tier promotion from earnPoints response
   * @param {Object} tierPromotion - Promotion data from earnPoints
   */
  const handlePromotion = useCallback((tierPromotion) => {
    if (tierPromotion?.promoted) {
      setPromotion(tierPromotion);
      setShowCelebration(true);
    }
  }, []);

  /**
   * Dismiss the celebration modal
   */
  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
    // Keep promotion data for a moment in case of animations
    setTimeout(() => {
      setPromotion(null);
    }, 500);
  }, []);

  /**
   * Clear promotion state completely
   */
  const clearPromotion = useCallback(() => {
    setPromotion(null);
    setShowCelebration(false);
  }, []);

  return {
    // State
    promotion,
    showCelebration,
    newTierBenefits: userTier?.benefits || [],

    // Actions
    handlePromotion,
    dismissCelebration,
    clearPromotion,
  };
}

export default useTierPromotion;
