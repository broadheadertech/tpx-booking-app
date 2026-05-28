import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { X, Calendar, Clock, AlertTriangle, Info, ShieldCheck } from "lucide-react";

const formatPHP = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

/**
 * Modal to transfer (reschedule) a no-show booking to a new date/time.
 * Shows the computed transfer fee from branch config + lets staff waive
 * with a required reason when the fault is the shop's.
 */
const TransferBookingModal = ({ booking, transferredBy, onClose, onSuccess }) => {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [waiveFee, setWaiveFee] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = useQuery(
    api.services.bookings.previewTransferFee,
    booking?._id ? { booking_id: booking._id } : "skip"
  );

  const transfer = useMutation(api.services.bookings.transferNoShowBooking);

  // Date input min = today
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const finalFee = waiveFee ? 0 : preview?.fee || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) {
      setError("Pick a new date and time.");
      return;
    }
    if (waiveFee && !waiveReason.trim()) {
      setError("A reason is required to waive the transfer fee.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await transfer({
        booking_id: booking._id,
        new_date: newDate,
        new_time: newTime,
        transferred_by: transferredBy,
        waive_fee: waiveFee || undefined,
        waive_reason: waiveFee ? waiveReason.trim() : undefined,
      });
      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Transfer failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#333] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-[#333] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Transfer Booking</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              #{booking.booking_code} • {booking.customer_name || "Customer"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Original booking summary */}
          <div className="bg-[#252525] rounded-lg p-3 text-sm">
            <p className="text-gray-400 text-xs mb-1">Original (no-show)</p>
            <p className="text-white">
              {booking.date} at {booking.time}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Paid online • {formatPHP(booking.amount_paid || booking.price)}
            </p>
          </div>

          {/* New date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                New Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                New Time
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          {/* Fee preview */}
          {preview && (
            <div
              className={`rounded-lg p-3 border ${
                finalFee > 0
                  ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30"
                  : "bg-emerald-500/10 border-emerald-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info
                    className={`w-4 h-4 ${
                      finalFee > 0 ? "text-[var(--color-primary)]" : "text-emerald-400"
                    }`}
                  />
                  <span className="text-sm text-gray-300">Transfer Fee</span>
                </div>
                <span
                  className={`text-lg font-bold ${
                    finalFee > 0 ? "text-[var(--color-primary)]" : "text-emerald-400"
                  }`}
                >
                  {formatPHP(finalFee)}
                </span>
              </div>
              {!preview.fee_enabled && (
                <p className="text-xs text-gray-500 mt-1">
                  This branch has no transfer fee configured.
                </p>
              )}
              {preview.fee_enabled && (
                <p className="text-xs text-gray-500 mt-1">
                  Per branch config: {preview.fee_type === "percent" ? `${preview.fee_amount}% of price` : `flat ${formatPHP(preview.fee_amount)}`}
                </p>
              )}
            </div>
          )}

          {/* Waive */}
          {preview?.fee_enabled && preview.fee > 0 && (
            <div className="bg-[#252525] rounded-lg p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waiveFee}
                  onChange={(e) => setWaiveFee(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Waive transfer fee (shop fault)
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Use only when the no-show was caused by the barbershop (e.g. barber unavailable, system error, schedule mistake).
                  </p>
                </div>
              </label>
              {waiveFee && (
                <textarea
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="Reason for waiver (required) — e.g. 'Assigned barber was sick, customer was not informed'"
                  rows={2}
                  className="w-full mt-2 bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                  required
                />
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {busy ? "Transferring…" : `Transfer${finalFee > 0 ? ` (${formatPHP(finalFee)})` : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferBookingModal;
