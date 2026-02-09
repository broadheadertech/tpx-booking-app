import { formatPoints, toStorageFormat } from "../../../convex/lib/points";

/**
 * PointsEarnPreview - Shows preview of points to be earned on purchase
 *
 * Displays "You'll earn X points on this purchase" message
 * Points earned at 1:1 ratio: ₱1 = 1 point
 *
 * @param {Object} props
 * @param {number} props.amount - Payment amount in pesos (e.g., 500 for ₱500)
 * @param {string} props.variant - Display variant: "inline" | "card" | "badge"
 * @param {string} props.className - Additional CSS classes
 */
function PointsEarnPreview({ amount, variant = "inline", className = "" }) {
  // Skip if no amount or 0
  if (!amount || amount <= 0) {
    return null;
  }

  // Calculate points: 1:1 ratio, ₱1 = 1 point
  // Convert to storage format then format for display
  const pointsToEarn = toStorageFormat(amount);
  const pointsDisplay = formatPoints(pointsToEarn);

  if (variant === "badge") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium ${className}`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z" />
        </svg>
        +{pointsDisplay}
      </span>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 p-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-orange-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-400">You'll earn</p>
            <p className="text-lg font-semibold text-orange-400">
              {pointsDisplay}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Points added automatically after payment
        </p>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <svg
        className="w-4 h-4 text-orange-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z" />
      </svg>
      <span className="text-gray-400">
        You'll earn{" "}
        <span className="text-orange-400 font-medium">{pointsDisplay}</span> on
        this purchase
      </span>
    </div>
  );
}

export default PointsEarnPreview;
