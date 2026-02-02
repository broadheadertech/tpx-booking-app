import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Scissors, Calendar, User } from "lucide-react";

/**
 * ServiceHistoryCard - Shows customer's service history for staff
 *
 * Features:
 * - "Usual service" prominently displayed
 * - Last 5 services with date and barber
 * - Total services count
 *
 * @param {Object} props
 * @param {string} props.userId - The customer's user ID
 * @param {string} props.className - Additional CSS classes
 */
function ServiceHistoryCard({ userId, className = "" }) {
  const history = useQuery(
    api.services.tiers.getCustomerServiceHistory,
    userId ? { userId } : "skip"
  );

  // Loading state
  if (history === undefined) {
    return <ServiceHistorySkeleton className={className} />;
  }

  // No history
  if (!history || history.totalServices === 0) {
    return (
      <div className={`rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">No Service History</p>
            <p className="text-xs text-gray-500">First-time customer</p>
          </div>
        </div>
      </div>
    );
  }

  const { recentServices, usualService, totalServices } = history;

  return (
    <div className={`rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden ${className}`}>
      {/* Header with Usual Service */}
      <div className="px-4 py-3 bg-[var(--color-primary)]/10 border-b border-[var(--color-primary)]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Usual Service</p>
              <p className="text-sm font-semibold text-white">
                {usualService?.name || "Various"}
              </p>
            </div>
          </div>
          {usualService && (
            <span className="text-xs text-gray-400">
              {usualService.count}x booked
            </span>
          )}
        </div>
      </div>

      {/* Recent Services List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-400">Recent Services</h4>
          <span className="text-xs text-gray-500">{totalServices} total</span>
        </div>

        <div className="space-y-2">
          {recentServices.map((service, index) => (
            <div
              key={service.id || index}
              className="flex items-center justify-between p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-400">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {service.serviceName}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(service.date)}
                    </span>
                    {service.barberName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {service.barberName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {service.price > 0 && (
                <span className="text-xs text-gray-400">
                  ₱{service.price.toFixed(0)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: new Date(dateString).getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
    });
  } catch {
    return dateString;
  }
}

/**
 * Skeleton loader
 */
function ServiceHistorySkeleton({ className = "" }) {
  return (
    <div className={`rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden ${className}`}>
      <div className="px-4 py-3 bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" />
          <div>
            <div className="h-3 w-20 bg-gray-700 rounded animate-pulse mb-1" />
            <div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default ServiceHistoryCard;
