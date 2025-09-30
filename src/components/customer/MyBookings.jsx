import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  MessageSquare,
} from "lucide-react";
import QRCode from "qrcode";
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from "../../context/AuthContext";

const MyBookings = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [showQRCode, setShowQRCode] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  // Convex queries - only call when user exists
  const bookings = user?.id ? useQuery(api.services.bookings.getBookingsByCustomer, { customerId: user.id }) : undefined;
  const services = useQuery(api.services.services.getAllServices);
  const barbers = useQuery(api.services.barbers.getAllBarbers);
  
  // Get all ratings to check which bookings have been rated
  const allRatings = useQuery(api.services.ratings.getAllRatings);

  // Loading state - true when user exists but data not loaded yet
  const loading = user?.id && (bookings === undefined || services === undefined || barbers === undefined);
  
  // Error state - currently no error handling implemented
  const error = null;

  // Convex mutations
  const updateBookingStatus = useMutation(api.services.bookings.updateBooking);
  const submitRating = useMutation(api.services.ratings.submitRating);

  const handleCancelBooking = async (bookingId) => {
    try {
      setCancelLoading(true);
      await updateBookingStatus({
        id: bookingId,
        status: "cancelled"
      });

      setShowCancelModal(null);
      // Show success message briefly
      const successMsg = document.createElement("div");
      successMsg.className =
        "fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      successMsg.textContent = "Booking cancelled successfully";
      document.body.appendChild(successMsg);
      setTimeout(() => document.body.removeChild(successMsg), 3000);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert(error.message || "Failed to cancel booking. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

// Rating Modal Component
const RatingModal = ({ booking, onSubmit, onClose, loading }) => {
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = () => {
    if (selectedRating === 0) {
      alert("Please select a rating");
      return;
    }
    onSubmit(booking, selectedRating, feedback);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => setSelectedRating(i)}
          onMouseEnter={() => setHoveredRating(i)}
          onMouseLeave={() => setHoveredRating(0)}
          className="p-1 transition-all duration-200 hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors duration-200 ${
              i <= (hoveredRating || selectedRating)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      );
    }
    return stars;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border"
        style={{ borderColor: "#E0E0E0" }}
      >
        <div className="text-center space-y-4">
          {/* Rating Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
            style={{ backgroundColor: "#F59E0B" }}
          >
            <Star className="w-6 h-6 text-white" />
          </div>

          {/* Title */}
          <div>
            <h3 className="text-lg font-bold mb-1" style={{ color: "#36454F" }}>
              Rate Your Service
            </h3>
            <p className="text-sm" style={{ color: "#8B8B8B" }}>
              How was your experience with {booking.barber?.name || "your barber"}?
            </p>
          </div>

          {/* Service Details */}
          <div
            className="rounded-xl p-3 text-left"
            style={{ backgroundColor: "#F4F0E6", border: "1px solid #E0E0E0" }}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Service:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.service?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Date:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {new Date(booking.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Barber:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.barber?.name || "Any Barber"}
                </span>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: "#36454F" }}>
              Rate your experience:
            </p>
            <div className="flex justify-center space-x-1 mb-2">
              {renderStars()}
            </div>
            {selectedRating > 0 && (
              <p className="text-xs" style={{ color: "#8B8B8B" }}>
                {selectedRating === 1 && "Poor"}
                {selectedRating === 2 && "Fair"}
                {selectedRating === 3 && "Good"}
                {selectedRating === 4 && "Very Good"}
                {selectedRating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#36454F" }}>
              Additional Feedback (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts about the service..."
              className="w-full p-3 border rounded-lg resize-none text-sm"
              style={{
                borderColor: "#E0E0E0",
                backgroundColor: "#FAFAFA",
                color: "#36454F",
              }}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs mt-1" style={{ color: "#8B8B8B" }}>
              {feedback.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 border-2 font-bold rounded-xl transition-all duration-200"
              style={{ borderColor: "#E0E0E0", color: "#8B8B8B" }}
              onMouseEnter={(e) =>
                !loading && (e.target.style.backgroundColor = "#F5F5F5")
              }
              onMouseLeave={(e) =>
                !loading && (e.target.style.backgroundColor = "transparent")
              }
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedRating === 0}
              className={`flex-1 py-3 text-white font-bold rounded-xl transition-all duration-200 ${
                loading || selectedRating === 0 ? "opacity-75 cursor-not-allowed" : ""
              }`}
              style={{
                backgroundColor:
                  loading || selectedRating === 0 ? "#CCCCCC" : "#F59E0B",
              }}
              onMouseEnter={(e) =>
                !loading &&
                selectedRating > 0 &&
                (e.target.style.backgroundColor = "#D97706")
              }
              onMouseLeave={(e) =>
                !loading &&
                selectedRating > 0 &&
                (e.target.style.backgroundColor = "#F59E0B")
              }
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Rating"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  const handleSubmitRating = async (bookingData, rating, feedback) => {
    try {
      setRatingLoading(true);
      await submitRating({
        bookingId: bookingData._id,
        customerId: user.id,
        barberId: bookingData.barber._id || bookingData.barber,
        serviceId: bookingData.service._id || bookingData.service,
        rating: rating,
        feedback: feedback || undefined,
      });

      setShowRatingModal(null);
      // Show success message
      const successMsg = document.createElement("div");
      successMsg.className =
        "fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      successMsg.textContent = "Rating submitted successfully";
      document.body.appendChild(successMsg);
      setTimeout(() => document.body.removeChild(successMsg), 3000);
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert(error.message || "Failed to submit rating. Please try again.");
    } finally {
      setRatingLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "pending":
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const filteredBookings = bookings ? bookings.filter((booking) => {
    if (activeFilter === "all") return true;
    return booking.status === activeFilter;
  }) : [];

  // Helper function to check if booking has been rated
  const hasBeenRated = (bookingId) => {
    if (!allRatings || !user?.id) return false;
    return allRatings.some(rating => 
      rating.booking_id === bookingId && rating.customer_id === user.id
    );
  };

  const filters = [
    { id: "all", label: "All Bookings", count: bookings ? bookings.length : 0 },
    {
      id: "confirmed",
      label: "Confirmed",
      count: bookings ? bookings.filter((b) => b.status === "confirmed").length : 0,
    },
    {
      id: "pending",
      label: "Pending",
      count: bookings ? bookings.filter((b) => b.status === "pending").length : 0,
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: bookings ? bookings.filter((b) => b.status === "cancelled").length : 0,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-lg font-bold text-white">My Bookings</p>
              <p className="text-xs text-[#FF8C42]">
                {bookings?.length || 0} total
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="bg-[#1A1A1A] rounded-2xl p-3 border border-[#2A2A2A]">
            <div className="grid grid-cols-4 gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeFilter === filter.id
                      ? 'bg-[#FF8C42] text-white'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-[#2A2A2A]'
                  }`}
                >
                  <div>{filter.label}</div>
                  <div className="text-xs mt-1 opacity-80">({filter.count})</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 bg-[#FF8C42]/20 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[#FF8C42]" />
            </div>
            <p className="text-sm text-gray-400">
              Loading bookings...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-sm text-red-400 mb-4">Failed to load bookings</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Bookings List */}
        {!loading && !error && (
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-bold mb-3 text-white">
                  No Bookings Found
                </h3>
                <p className="mb-6 text-gray-400">
                  {activeFilter === "all"
                    ? "You haven't made any bookings yet"
                    : `No ${activeFilter} bookings found`}
                </p>
                <button
                  onClick={onBack}
                  className="px-6 py-3 text-white font-bold rounded-xl bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-all duration-200 shadow-lg"
                >
                  Book Your First Service
                </button>
              </div>
            ) : (
              filteredBookings.map((booking) => {
                // Get service and barber data from Convex queries
                const service = services?.find(s => s._id === booking.service) || {};
                const barber = barbers?.find(b => b._id === booking.barber) || {};

                // Debug logging for voucher information
                console.log(`Booking ${booking._id}:`, {
                  voucher_code: booking.voucher_code,
                  total_amount: booking.total_amount,
                  voucherCode: booking.voucherCode,
                  voucher: booking.voucher,
                });

                return (
                  <div
                    key={booking._id}
                    className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#FF8C42]/30 transition-all duration-200 p-4"
                  >
                    {/* Compact Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-white truncate">
                            {service.name || "Service"}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>#{booking.booking_code}</span>
                          {booking.branch_name && (
                            <span className="text-[#FF8C42] font-medium flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {booking.branch_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Compact Details Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#FF8C42]" />
                        <div>
                          <p className="text-gray-400">Date</p>
                          <p className="font-medium text-white">
                            {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#FF8C42]" />
                        <div>
                          <p className="text-gray-400">Time</p>
                          <p className="font-medium text-white">
                            {booking.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#FF8C42]" />
                        <div>
                          <p className="text-gray-400">Barber</p>
                          <p className="font-medium text-white">
                            {barber.name || "Any Barber"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price and Actions Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Price</p>
                          <p className="font-semibold text-[#FF8C42]">
                            ₱{service.price ? parseFloat(service.price).toLocaleString() : "--"}
                          </p>
                        </div>
                        {(() => {
                          const voucherCode = booking.voucher_code || booking.voucherCode || booking.voucher?.code;
                          return voucherCode && (
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Voucher</p>
                              <p className="text-xs font-medium text-green-400">{voucherCode}</p>
                            </div>
                          );
                        })()}
                       </div>

                       {/* Compact Action Buttons */}
                       <div className="flex gap-2">
                         {booking.status === "booked" && (
                           <button
                             onClick={() => setShowQRCode({ ...booking, service, barber })}
                             className="flex-1 py-2 px-3 bg-[#FF8C42] text-white text-xs font-medium rounded-lg hover:bg-[#FF7A2B] transition-colors flex items-center justify-center gap-1"
                           >
                             <QrCode className="w-3 h-3" />
                             <span>Show QR</span>
                           </button>
                         )}
                         {booking.status === "pending" && (
                           <>
                             <button
                               onClick={() => setShowCancelModal({ ...booking, service, barber })}
                               className="flex-1 py-2 px-3 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
                             >
                               Cancel
                             </button>
                             <button
                               onClick={() => setShowQRCode({ ...booking, service, barber })}
                               className="flex-1 py-2 px-3 bg-[#FF8C42] text-white text-xs font-medium rounded-lg hover:bg-[#FF7A2B] transition-colors flex items-center justify-center gap-1"
                             >
                               <QrCode className="w-3 h-3" />
                               <span>QR Code</span>
                             </button>
                           </>
                         )}
                         {booking.status === "completed" && !hasBeenRated(booking._id) && (
                           <button
                             onClick={() => setShowRatingModal({ ...booking, service, barber })}
                             className="flex-1 py-2 px-3 bg-yellow-500 text-white text-xs font-medium rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-1"
                           >
                             <Star className="w-3 h-3" />
                             <span>Rate</span>
                           </button>
                         )}
                       </div>
                     </div>
                   </div>
          );
        })
      )}
    </div>
  )}
</div>

{/* Modals */}
{showRatingModal && (
  <RatingModal
    booking={showRatingModal}
    onSubmit={handleSubmitRating}
    onClose={() => setShowRatingModal(null)}
    loading={ratingLoading}
  />
)}

{showQRCode && (
  <QRCodeModal booking={showQRCode} onClose={() => setShowQRCode(null)} />
)}

{showCancelModal && (
  <CancelBookingModal
    booking={showCancelModal}
    onConfirm={handleCancelBooking}
    onClose={() => setShowCancelModal(null)}
    loading={cancelLoading}
  />
)}
</div>
);
};

const RatingModal = ({ booking, onSubmit, onClose, loading }) => {
const [rating, setRating] = useState(0);
const [feedback, setFeedback] = useState("");

const handleSubmit = () => {
  if (rating === 0) {
    alert("Please select a rating");
    return;
  }
  onSubmit(booking, rating, feedback);
};

return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div
      className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border"
      style={{ borderColor: "#E0E0E0" }}
    >
      <div className="text-center space-y-4">
        {/* Rating Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: "#F68B24" }}
        >
          <Star className="w-6 h-6 text-white" />
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-bold mb-1" style={{ color: "#36454F" }}>
            Rate Your Experience
          </h3>
          <p className="text-sm" style={{ color: "#8B8B8B" }}>
            How was your service?
          </p>
        </div>

        {/* Booking Summary */}
        <div
          className="rounded-xl p-3 text-left"
          style={{ backgroundColor: "#F4F0E6", border: "1px solid #E0E0E0" }}
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "#36454F" }}>Service:</span>
              <span className="font-bold" style={{ color: "#36454F" }}>
                {booking.service?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#36454F" }}>Date:</span>
              <span className="font-bold" style={{ color: "#36454F" }}>
                {new Date(booking.date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#36454F" }}>Barber:</span>
              <span className="font-bold" style={{ color: "#36454F" }}>
                {booking.barber?.name || "Any Barber"}
              </span>
            </div>
          </div>
        </div>

        {/* Rating Stars */}
        <div>
          <p className="text-sm mb-3" style={{ color: "#36454F" }}>
            Rate your experience:
          </p>
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="text-2xl transition-colors duration-200"
                style={{
                  color: star <= rating ? "#F59E0B" : "#D1D5DB",
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your feedback (optional)"
            className="w-full p-3 border rounded-lg text-sm resize-none"
            style={{ borderColor: "#E0E0E0", color: "#36454F" }}
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border font-bold rounded-xl transition-all duration-200"
            style={{ borderColor: "#E0E0E0", color: "#8B8B8B" }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#F5F5F5";
              e.target.style.color = "#36454F";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#8B8B8B";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 text-white font-bold rounded-xl transition-all duration-200"
            style={{
              backgroundColor: loading ? "#CCCCCC" : "#F68B24",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) =>
              !loading && (e.target.style.backgroundColor = "#E67E22")
            }
            onMouseLeave={(e) =>
              !loading && (e.target.style.backgroundColor = "#F68B24")
            }
          >
            {loading ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  </div>
);
 };



// QR Code Modal Component
const QRCodeModal = ({ booking, onClose }) => {
  const qrRef = useRef(null);

  // Generate QR code data - simplified to contain only booking code
  const qrData = booking.booking_code;

  useEffect(() => {
    // Small delay to ensure canvas is rendered in DOM
    const timer = setTimeout(() => {
      if (qrRef.current) {
        // Generate QR code as canvas
        QRCode.toCanvas(
          qrRef.current,
          qrData,
          {
            width: 160,
            margin: 2,
            color: {
              dark: "#36454F",
              light: "#ffffff",
            },
            errorCorrectionLevel: "H",
          },
          (error) => {
            if (error) console.error("QR Code generation error:", error);
          }
        );
      } else {
        console.error("Canvas ref not available in MyBookings QR modal");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [qrData]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border"
        style={{ borderColor: "#E0E0E0" }}
      >
        <div className="text-center space-y-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
            style={{ backgroundColor: "#F68B24" }}
          >
            <QrCode className="w-6 h-6 text-white" />
          </div>

          <div>
            <h3 className="text-lg font-bold mb-1" style={{ color: "#36454F" }}>
              Booking QR Code
            </h3>
            <p className="text-sm" style={{ color: "#36454F" }}>
              Show this to staff when you arrive
            </p>
          </div>

          {/* Real QR Code */}
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: "#F4F0E6" }}
          >
            <div className="flex justify-center">
              <canvas ref={qrRef} className="rounded-lg"></canvas>
            </div>
          </div>

          {/* Booking Details */}
          <div
            className="rounded-xl p-3 text-left"
            style={{ backgroundColor: "#F4F0E6", border: "1px solid #E0E0E0" }}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Service:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.service?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Date:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {new Date(booking.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Time:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Barber:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.barber?.name || "Any Barber"}
                </span>
              </div>

              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Code:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.booking_code}
                </span>
              </div>
              {(() => {
                const voucherCode =
                  booking.voucher_code ||
                  booking.voucherCode ||
                  booking.voucher?.code;
                const totalAmount = booking.total_amount || booking.totalAmount;

                return (
                  <>
                    {voucherCode && (
                      <div
                        className="flex justify-between border-t pt-2"
                        style={{ borderColor: "#E0E0E0" }}
                      >
                        <span style={{ color: "#22C55E" }}>Voucher:</span>
                        <span
                          className="font-bold"
                          style={{ color: "#22C55E" }}
                        >
                          {voucherCode}
                        </span>
                      </div>
                    )}
                    {totalAmount && (
                      <div className="flex justify-between">
                        <span style={{ color: "#3B82F6" }}>Total Paid:</span>
                        <span
                          className="font-bold"
                          style={{ color: "#3B82F6" }}
                        >
                          ₱{parseFloat(totalAmount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200"
            style={{ backgroundColor: "#F68B24" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#E67E22")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#F68B24")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Cancel Booking Modal Component
const CancelBookingModal = ({ booking, onConfirm, onClose, loading }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border"
        style={{ borderColor: "#E0E0E0" }}
      >
        <div className="text-center space-y-4">
          {/* Warning Icon */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-red-100">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>

          {/* Title and Message */}
          <div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "#36454F" }}>
              Cancel Booking?
            </h3>
            <p className="text-sm mb-4" style={{ color: "#8B8B8B" }}>
              Are you sure you want to cancel this booking? This action cannot
              be undone.
            </p>
          </div>

          {/* Booking Details */}
          <div
            className="rounded-xl p-4 text-left"
            style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Service:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.service?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Date:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.date
                    ? new Date(booking.date).toLocaleDateString()
                    : "Today"}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Time:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#36454F" }}>Barber:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.barber?.name || "Any Barber"}
                </span>
              </div>
              <div
                className="flex justify-between border-t pt-2"
                style={{ borderColor: "#FECACA" }}
              >
                <span style={{ color: "#36454F" }}>Code:</span>
                <span className="font-bold" style={{ color: "#36454F" }}>
                  {booking.booking_code}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 border-2 font-bold rounded-xl transition-all duration-200"
              style={{ borderColor: "#E0E0E0", color: "#8B8B8B" }}
              onMouseEnter={(e) =>
                !loading && (e.target.style.backgroundColor = "#F5F5F5")
              }
              onMouseLeave={(e) =>
                !loading && (e.target.style.backgroundColor = "transparent")
              }
            >
              Keep Booking
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 text-white font-bold rounded-xl transition-all duration-200 ${
                loading ? "opacity-75 cursor-not-allowed" : ""
              }`}
              style={{ backgroundColor: loading ? "#CCCCCC" : "#EF4444" }}
              onMouseEnter={(e) =>
                !loading && (e.target.style.backgroundColor = "#DC2626")
              }
              onMouseLeave={(e) =>
                !loading && (e.target.style.backgroundColor = "#EF4444")
              }
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Cancelling...</span>
                </div>
              ) : (
                "Yes, Cancel"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;
