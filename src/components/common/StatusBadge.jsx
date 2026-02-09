import { CheckCircle, XCircle } from "lucide-react";

/**
 * StatusBadge - Reusable status indicator with traffic light pattern
 *
 * Features:
 * - Green/Red color coding (In/Out)
 * - Color-independent accessibility with icons + text (UX5)
 * - Multiple size variants
 */
export function StatusBadge({ status, size = "sm" }) {
  const isActive = status === "in" || status === true;

  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizes[size]} ${
        isActive
          ? "bg-green-500/10 text-green-500"
          : "bg-red-500/10 text-red-500"
      }`}
    >
      {isActive ? (
        <>
          <CheckCircle className="w-4 h-4" aria-hidden="true" />
          <span>Clocked In</span>
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4" aria-hidden="true" />
          <span>Clocked Out</span>
        </>
      )}
    </span>
  );
}

export default StatusBadge;
