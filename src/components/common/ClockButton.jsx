import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Loader2, Hourglass, XCircle } from "lucide-react";
import Skeleton from "./Skeleton";

/**
 * ClockButton - Barber clock in/out component with approval workflow
 *
 * Features:
 * - One-tap clock in/out (creates pending request)
 * - Pending approval state (amber)
 * - Real-time shift duration display (after approval)
 * - Compact mode for inline header display
 */
export function ClockButton({ barberId, barberName, branchId, compact = false }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAutoCloseNotice, setShowAutoCloseNotice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmClockOut, setShowConfirmClockOut] = useState(false);

  // Query clock status (now includes pendingRequest)
  const status = useQuery(
    api.services.timeAttendance.getBarberClockStatus,
    barberId ? { barber_id: barberId } : "skip"
  );

  // Mutations
  const clockIn = useMutation(api.services.timeAttendance.clockIn);
  const clockOut = useMutation(api.services.timeAttendance.clockOut);

  // Update local duration every second when clocked in
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!status?.isClockedIn) {
      setDuration(0);
      return;
    }

    const clockInTime = status?.shift?.clock_in;
    if (clockInTime) {
      setDuration(Date.now() - clockInTime);
    }

    const interval = setInterval(() => {
      if (clockInTime) {
        setDuration(Date.now() - clockInTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.isClockedIn, status?.shift?.clock_in]);

  // Handle clock in
  const handleClockIn = async () => {
    if (!barberId || !branchId || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await clockIn({ barber_id: barberId, branch_id: branchId });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      if (result?.autoClosedPreviousShift) {
        setShowAutoCloseNotice(true);
        setTimeout(() => setShowAutoCloseNotice(false), 5000);
      }
    } catch (err) {
      console.error("Clock in failed:", err);
      const errorMessage = err?.data?.message || err?.message || "Failed to clock in. Please try again.";
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    if (!barberId || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      await clockOut({ barber_id: barberId });
    } catch (err) {
      console.error("Clock out failed:", err);
      const errorMessage = err?.data?.message || err?.message || "Failed to clock out. Please try again.";
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Format duration as Xh Xm
  const formatDuration = (ms) => {
    if (!ms || ms < 0) return "0h 0m";
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Loading state
  if (status === undefined) {
    if (compact) {
      return <Skeleton className="h-9 w-20 rounded-xl" />;
    }
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    );
  }

  const isClockedIn = status?.isClockedIn;
  const pendingRequest = status?.pendingRequest;
  const hasPendingIn = pendingRequest?.type === "clock_in";
  const hasPendingOut = pendingRequest?.type === "clock_out";
  const wasRejected = pendingRequest?.type === "rejected";

  // ─── COMPACT MODE ───────────────────────────────────────────────────────────

  if (compact) {
    // Pending clock-in
    if (hasPendingIn) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl">
          <Hourglass className="w-3.5 h-3.5 animate-pulse" />
          <span>Pending</span>
        </div>
      );
    }

    // Clocked in with pending clock-out
    if (isClockedIn && hasPendingOut) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl">
          <Hourglass className="w-3.5 h-3.5 animate-pulse" />
          <span>{formatDuration(duration)}</span>
        </div>
      );
    }

    // Clocked in (approved)
    if (isClockedIn) {
      return (
        <div className="relative">
          <button
            onClick={() => setShowConfirmClockOut(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            <span>{formatDuration(duration)}</span>
          </button>
          {showConfirmClockOut && (
            <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl p-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-white">End your shift?</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">You've been working for <strong className="text-white">{formatDuration(duration)}</strong>. This will submit a clock-out request for approval.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmClockOut(false)}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowConfirmClockOut(false); handleClockOut(); }}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                  Clock Out
                </button>
              </div>
            </div>
          )}
          <style>{`
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.2s ease-out; }
          `}</style>
        </div>
      );
    }

    // Not clocked in
    return (
      <button
        onClick={handleClockIn}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl active:scale-95 transition-all disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogIn className="w-3.5 h-3.5" />
        )}
        <span>Clock In</span>
      </button>
    );
  }

  // ─── FULL MODE ──────────────────────────────────────────────────────────────

  // Pending clock-in state
  if (hasPendingIn) {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Success Message */}
        {showSuccess && (
          <div className="flex items-center gap-2 text-amber-500 text-sm font-medium bg-amber-500/10 px-4 py-2 rounded-xl animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>Clock-in request submitted!</span>
          </div>
        )}

        {/* Auto-Close Notice */}
        {showAutoCloseNotice && (
          <div className="flex items-center gap-2 text-amber-500 text-sm font-medium bg-amber-500/10 px-4 py-2 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            <span>Your previous shift was auto-closed at midnight.</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-500/10 px-4 py-2 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Pending State */}
        <div className="h-14 w-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold rounded-xl flex items-center justify-center gap-2">
          <Hourglass className="w-5 h-5 animate-pulse" />
          Awaiting Approval
        </div>

        <p className="text-xs text-gray-500 text-center">
          Your clock-in request is being reviewed by staff
        </p>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Rejected state (shows briefly)
  if (wasRejected) {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-500/10 px-4 py-2 rounded-xl animate-fade-in">
          <XCircle className="w-4 h-4" />
          <span>Your request was rejected</span>
        </div>

        <button
          onClick={handleClockIn}
          disabled={isLoading}
          className="h-14 w-full bg-[var(--color-primary)] hover:bg-[var(--color-accent)] active:scale-[0.98] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all min-w-[200px] shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          {isLoading ? "Clocking In..." : "Try Again"}
        </button>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Clocked in with pending clock-out
  if (isClockedIn && hasPendingOut) {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-500/10 px-4 py-2 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Duration Display */}
        <div className="flex items-center gap-2 bg-[#1A1A1A] px-4 py-2 rounded-xl border border-[#2A2A2A]">
          <Clock className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-sm text-gray-400">Shift Duration:</span>
          <span className="text-sm font-semibold text-white">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Pending Clock Out */}
        <div className="h-14 w-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold rounded-xl flex items-center justify-center gap-2">
          <Hourglass className="w-5 h-5 animate-pulse" />
          Clock-Out Pending Approval
        </div>

        <p className="text-xs text-gray-500 text-center">
          Your clock-out request is being reviewed by staff
        </p>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Clocked in (approved) — normal clock out
  if (isClockedIn) {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-500/10 px-4 py-2 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Duration Display */}
        <div className="flex items-center gap-2 bg-[#1A1A1A] px-4 py-2 rounded-xl border border-[#2A2A2A]">
          <Clock className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-sm text-gray-400">Shift Duration:</span>
          <span className="text-sm font-semibold text-white">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Clock Out Confirmation */}
        {showConfirmClockOut ? (
          <div className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span className="text-base font-semibold text-white">End your shift?</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              You've been working for <strong className="text-white">{formatDuration(duration)}</strong>. Are you sure you want to clock out? This will submit a request for staff approval.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClockOut(false)}
                className="flex-1 h-12 rounded-xl bg-[#2A2A2A] text-gray-300 font-medium hover:bg-[#3A3A3A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirmClockOut(false); handleClockOut(); }}
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
                Yes, Clock Out
              </button>
            </div>
          </div>
        ) : (
          /* Clock Out Button */
          <button
            onClick={() => setShowConfirmClockOut(true)}
            disabled={isLoading}
            className="h-14 w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all min-w-[200px] shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            {isLoading ? "Clocking Out..." : "Clock Out"}
          </button>
        )}

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Not clocked in — default state
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center gap-2 text-amber-500 text-sm font-medium bg-amber-500/10 px-4 py-2 rounded-xl animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>Clock-in request submitted!</span>
        </div>
      )}

      {/* Auto-Close Notice */}
      {showAutoCloseNotice && (
        <div className="flex items-center gap-2 text-amber-500 text-sm font-medium bg-amber-500/10 px-4 py-2 rounded-xl animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          <span>Your previous shift was auto-closed at midnight.</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-500/10 px-4 py-2 rounded-xl animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Clock In Button */}
      <button
        onClick={handleClockIn}
        disabled={isLoading}
        className="h-14 w-full bg-[var(--color-primary)] hover:bg-[var(--color-accent)] active:scale-[0.98] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all min-w-[200px] shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <LogIn className="w-5 h-5" />
        )}
        {isLoading ? "Clocking In..." : "Clock In"}
      </button>

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center">
        Tap to request clock in (requires staff approval)
      </p>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ClockButton;
