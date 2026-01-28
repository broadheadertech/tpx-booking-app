import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Skeleton from "./Skeleton";

/**
 * ClockButton - Barber clock in/out component
 *
 * Features:
 * - One-tap clock in/out
 * - Real-time shift duration display
 * - Optimistic updates for <1s response feel
 * - Success message on clock in
 */
export function ClockButton({ barberId, barberName, branchId }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAutoCloseNotice, setShowAutoCloseNotice] = useState(false);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [localClockIn, setLocalClockIn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Query clock status
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
    if (!status?.isClockedIn && !isOptimistic) {
      setDuration(0);
      return;
    }

    // Calculate initial duration
    const clockInTime = isOptimistic ? localClockIn : status?.shift?.clock_in;
    if (clockInTime) {
      setDuration(Date.now() - clockInTime);
    }

    // Update every second
    const interval = setInterval(() => {
      if (clockInTime) {
        setDuration(Date.now() - clockInTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.isClockedIn, status?.shift?.clock_in, isOptimistic, localClockIn]);

  // Handle clock in
  const handleClockIn = async () => {
    if (!barberId || !branchId || isLoading) return;

    // Clear previous error
    setError(null);
    setIsLoading(true);

    // Optimistic update
    setIsOptimistic(true);
    setLocalClockIn(Date.now());

    try {
      const result = await clockIn({ barber_id: barberId, branch_id: branchId });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Show notice if previous shift was auto-closed
      if (result?.autoClosedPreviousShift) {
        setShowAutoCloseNotice(true);
        setTimeout(() => setShowAutoCloseNotice(false), 5000);
      }
    } catch (err) {
      console.error("Clock in failed:", err);
      // Revert optimistic update
      setIsOptimistic(false);
      setLocalClockIn(null);
      // Show error to user
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

    // Clear previous error
    setError(null);
    setIsLoading(true);

    try {
      await clockOut({ barber_id: barberId });
      setIsOptimistic(false);
      setLocalClockIn(null);
    } catch (err) {
      console.error("Clock out failed:", err);
      // Show error to user
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
  if (status === undefined && !isOptimistic) {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    );
  }

  // Determine if clocked in (including optimistic state)
  const isClockedIn = isOptimistic || status?.isClockedIn;

  // Clocked in state - show clock out button and duration
  if (isClockedIn) {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Error Message */}
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

        {/* Clock Out Button */}
        <button
          onClick={handleClockOut}
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
      </div>
    );
  }

  // Not clocked in - show clock in button
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center gap-2 text-green-500 text-sm font-medium bg-green-500/10 px-4 py-2 rounded-xl animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>Welcome back, {barberName?.split(" ")[0] || "Barber"}!</span>
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
        Tap to start tracking your shift
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
