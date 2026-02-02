import { useState, useEffect } from "react";
import { X } from "lucide-react";

/**
 * TierPromotionCelebration - Shows celebration modal when user is promoted to a new tier
 *
 * Features:
 * - Animated celebration with confetti-like effects
 * - Shows new tier icon, name, and color
 * - Lists new tier benefits
 * - Auto-dismiss after timeout (optional)
 *
 * @param {Object} props
 * @param {Object} props.promotion - Promotion data from earnPoints response
 * @param {boolean} props.promotion.promoted - Whether promotion occurred
 * @param {string} props.promotion.previousTier - Previous tier name
 * @param {string} props.promotion.newTier - New tier name
 * @param {string} props.promotion.newTierIcon - New tier icon emoji
 * @param {string} props.promotion.newTierColor - New tier color hex
 * @param {Array} props.benefits - New tier benefits (optional)
 * @param {Function} props.onClose - Callback when celebration is dismissed
 * @param {number} props.autoDismissMs - Auto-dismiss after X milliseconds (0 = no auto-dismiss)
 */
function TierPromotionCelebration({
  promotion,
  benefits = [],
  onClose,
  autoDismissMs = 0,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (promotion?.promoted) {
      // Trigger entrance animation
      setIsVisible(true);

      // Auto-dismiss if configured
      if (autoDismissMs > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoDismissMs);
        return () => clearTimeout(timer);
      }
    }
  }, [promotion, autoDismissMs]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose?.();
    }, 300);
  };

  if (!promotion?.promoted || !isVisible) {
    return null;
  }

  const { previousTier, newTier, newTierIcon, newTierColor } = promotion;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Celebration particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full animate-float"
            style={{
              backgroundColor: newTierColor,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      {/* Modal content */}
      <div
        className={`relative w-full max-w-sm rounded-3xl border-2 p-6 text-center transform transition-all duration-500 ${
          isClosing ? "scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
        style={{
          background: `linear-gradient(to bottom, ${newTierColor}20, #0A0A0A)`,
          borderColor: newTierColor,
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Celebration icon with glow */}
        <div className="relative mb-6">
          <div
            className="absolute inset-0 blur-2xl opacity-50 animate-pulse"
            style={{ backgroundColor: newTierColor }}
          />
          <div
            className="relative w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl animate-bounce-slow"
            style={{
              background: `linear-gradient(135deg, ${newTierColor}30, ${newTierColor}10)`,
              border: `3px solid ${newTierColor}`,
            }}
          >
            {newTierIcon}
          </div>
        </div>

        {/* Congratulations text */}
        <h2
          className="text-2xl font-black mb-2"
          style={{ color: newTierColor }}
        >
          Congratulations!
        </h2>
        <p className="text-gray-300 mb-4">
          You've been promoted from{" "}
          <span className="text-gray-400">{previousTier}</span> to
        </p>

        {/* New tier name */}
        <div
          className="text-3xl font-black mb-6"
          style={{ color: newTierColor }}
        >
          {newTierIcon} {newTier} {newTierIcon}
        </div>

        {/* Benefits preview */}
        {benefits.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3">
              Your new benefits include:
            </p>
            <div className="space-y-2">
              {benefits.slice(0, 3).map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-300 justify-center"
                >
                  <span className="text-base">
                    {getBenefitIcon(benefit.benefit_type)}
                  </span>
                  <span>{benefit.description}</span>
                </div>
              ))}
              {benefits.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{benefits.length - 3} more benefits
                </p>
              )}
            </div>
          </div>
        )}

        {/* Dismiss button */}
        <button
          onClick={handleClose}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${newTierColor}, ${newTierColor}CC)`,
          }}
        >
          Awesome!
        </button>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          50% {
            transform: translateY(-100px) rotate(180deg);
            opacity: 0.4;
          }
          90% {
            opacity: 0.2;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Get icon for benefit type
 */
function getBenefitIcon(benefitType) {
  const icons = {
    points_multiplier: "✨",
    priority_booking: "📅",
    free_service: "🎁",
    discount: "💰",
    early_access: "⚡",
    vip_line: "👑",
    exclusive_event: "🎉",
  };
  return icons[benefitType] || "•";
}

export default TierPromotionCelebration;
