import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Banknote,
  Store,
  MapPin,
  Scissors,
  Receipt,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Wallet,
  Tag,
  Timer,
} from "lucide-react";
import QRCode from "qrcode";
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useBranding } from "../../context/BrandingContext";
import { useAppModal } from "../../context/AppModalContext";

const MyBookings = ({ onBack }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useCurrentUser();
  const { branding } = useBranding();
  const { showAlert } = useAppModal();
  const [activeFilter, setActiveFilter] = useState("all");
  const [showQRCode, setShowQRCode] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBooking, setExpandedBooking] = useState(null);
  const itemsPerPage = 8;

  // Branding colors with fallbacks
  const primaryColor = branding?.primary_color || '#00704A';
  const accentColor = branding?.accent_color || '#1E3932';

  // Convex queries - only call when user exists
  const bookings = user?._id ? useQuery(api.services.bookings.getBookingsByCustomer, { customerId: user._id }) : undefined;
  const services = useQuery(api.services.services.getAllServices);
  const barbers = useQuery(api.services.barbers.getAllBarbers);
  
  // Get all ratings to check which bookings have been rated
  const allRatings = useQuery(api.services.ratings.getAllRatings);

  // Loading state - true when user exists but data not loaded yet
  const loading = user?._id && (bookings === undefined || services === undefined || barbers === undefined);

  // Debug: Log booking data to check barber fields
  if (bookings && bookings.length > 0) {
    console.log('[MyBookings] First booking data:', {
      barber_id: bookings[0].barber,
      barber_name: bookings[0].barber_name,
      barber_name_type: typeof bookings[0].barber_name,
      barber_name_is_undefined: bookings[0].barber_name === undefined,
      barber_name_is_null: bookings[0].barber_name === null,
      barber_name_is_empty: bookings[0].barber_name === '',
      booking_code: bookings[0].booking_code,
    });
    // Also log all bookings' barber info
    console.log('[MyBookings] All bookings barber data:', bookings.map(b => ({
      code: b.booking_code,
      barber_id: b.barber,
      barber_name: b.barber_name
    })));
  }
  
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
      showAlert({ title: 'Cancellation Failed', message: error.message || 'Failed to cancel booking. Please try again.', type: 'error' });
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
      showAlert({ title: 'Rating Required', message: 'Please select a rating', type: 'warning' });
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
              How was your experience with {booking.barber_name || "your barber"}?
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
                  {booking.barber_name || "Any Barber"}
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
      showAlert({ title: 'Rating Failed', message: error.message || 'Failed to submit rating. Please try again.', type: 'error' });
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
      case "booked":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "in_progress":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  // Get status border color for card accent
  const getStatusBorderColor = (status) => {
    switch (status) {
      case "confirmed":
      case "booked":
        return "#22c55e"; // green-500
      case "pending":
        return "#eab308"; // yellow-500
      case "cancelled":
        return "#ef4444"; // red-500
      case "completed":
        return "#3b82f6"; // blue-500
      case "in_progress":
        return "#a855f7"; // purple-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  // Format relative date (Today, Tomorrow, Jan 15)
  const formatRelativeDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format payment method display
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'wallet':
        return <Wallet className="w-3.5 h-3.5" />;
      case 'card':
      case 'gcash':
      case 'paymongo':
        return <CreditCard className="w-3.5 h-3.5" />;
      default:
        return <Banknote className="w-3.5 h-3.5" />;
    }
  };

  // Get payment method label for display
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'wallet':
        return 'Wallet';
      case 'gcash':
        return 'GCash';
      case 'paymongo':
        return 'Online Pay';
      case 'card':
        return 'Card';
      case 'cash':
        return 'Cash';
      default:
        return 'Cash';
    }
  };

  // Format time from 24-hour to 12-hour format (e.g., "14:30" → "2:30 PM")
  const formatTime12Hour = (time) => {
    if (!time) return '';

    // Handle if time is already in 12-hour format
    if (time.includes('AM') || time.includes('PM')) return time;

    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const filteredBookings = bookings ? bookings.filter((booking) => {
    if (activeFilter === "all") return true;
    return booking.status === activeFilter;
  }) : [];

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

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
              <p className="text-xs text-[var(--color-primary)]">
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
                      ? 'bg-[var(--color-primary)] text-white'
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
            <div className="rounded-full w-16 h-16 bg-[var(--color-primary)]/20 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[var(--color-primary)]" />
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
          <>
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
                    className="px-6 py-3 text-white font-bold rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110 transition-all duration-200 shadow-lg"
                  >
                    Book Your First Service
                  </button>
                </div>
              ) : (
                currentBookings.map((booking) => {
                // Get service and barber data from Convex queries
                const service = services?.find(s => s._id === booking.service) || {};
                const barber = barbers?.find(b => b._id === booking.barber) || {};
                const isExpanded = expandedBooking === booking._id;

                // Calculate price breakdown
                const servicePrice = booking.service_price || service.price || 0;
                const bookingFee = booking.booking_fee || 0;
                const convenienceFee = booking.convenience_fee_paid || booking.convenience_fee || bookingFee || 0;
                const discount = booking.discount_amount || 0;
                const voucherCode = booking.voucher_code || booking.voucherCode || booking.voucher?.code;
                const totalPaid = booking.total_amount || booking.amount_paid || 0;
                // Due at shop is the full service price + booking fee (convenience fee is just for reservation)
                const amountDue = booking.amount_due || (servicePrice + bookingFee);

                return (
                  <div
                    key={booking._id}
                    className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden hover:border-[#3A3A3A] transition-all duration-200"
                    style={{ borderLeft: `4px solid ${getStatusBorderColor(booking.status)}` }}
                  >
                    {/* Main Card Content */}
                    <div className="p-4">
                      {/* Top Row: Service + Status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Service Icon */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${primaryColor}20` }}
                          >
                            <Scissors className="w-5 h-5" style={{ color: primaryColor }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white truncate">
                              {booking.is_custom_booking ? 'Custom Booking' : (service.name || "Service")}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-500">#{booking.booking_code}</span>
                              {booking.branch_name && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {booking.branch_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Status Badge */}
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          {booking.is_custom_booking && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date, Time, Barber Row */}
                      <div className="flex items-center gap-4 mb-3 p-2.5 bg-[#0F0F0F] rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs font-semibold text-white">{formatRelativeDate(booking.date)}</p>
                            <p className="text-[10px] text-gray-500">{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                          </div>
                        </div>
                        <div className="w-px h-8 bg-[#2A2A2A]" />
                        <div className="flex items-center gap-2 flex-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs font-semibold text-white">{formatTime12Hour(booking.time)}</p>
                            {service.duration && (
                              <p className="text-[10px] text-gray-500">{service.duration} min</p>
                            )}
                          </div>
                        </div>
                        <div className="w-px h-8 bg-[#2A2A2A]" />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{booking.barber_name || barber.full_name || barber.name || "Any"}</p>
                            <p className="text-[10px] text-gray-500">Barber</p>
                          </div>
                        </div>
                      </div>

                      {/* Price Summary Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Total/Price Display */}
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
                            <p className="text-lg font-black" style={{ color: primaryColor }}>
                              ₱{parseFloat(totalPaid || (servicePrice + convenienceFee - discount)).toLocaleString()}
                            </p>
                          </div>
                          {/* Booking Fee indicator (if paid) */}
                          {convenienceFee > 0 && (booking.payment_status === 'paid' || booking.payment_status === 'partial') && (
                            <div className="px-2 py-1 rounded-lg bg-[#2A2A2A]">
                              <p className="text-[9px] text-gray-500 uppercase">Booking Fee</p>
                              <p className="text-[10px] text-green-400 font-medium">₱{parseFloat(convenienceFee).toLocaleString()}</p>
                            </div>
                          )}
                          {/* Payment Method Pill */}
                          {(booking.payment_status === 'paid' || booking.payment_status === 'partial') && booking.payment_method && (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[#2A2A2A] text-gray-300 flex items-center gap-1">
                              {getPaymentMethodIcon(booking.payment_method)}
                              {getPaymentMethodLabel(booking.payment_method)}
                            </span>
                          )}
                          {/* Payment Status Pill */}
                          {booking.payment_status === 'paid' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              PAID
                            </span>
                          )}
                          {booking.payment_status === 'partial' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              ₱{amountDue.toLocaleString()} DUE
                            </span>
                          )}
                          {(booking.payment_status === 'unpaid' || !booking.payment_status) && booking.status !== 'cancelled' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 flex items-center gap-1">
                              <Store className="w-3 h-3" />
                              PAY AT SHOP
                            </span>
                          )}
                        </div>

                        {/* Expand/Actions Toggle */}
                        <button
                          onClick={() => setExpandedBooking(isExpanded ? null : booking._id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Details</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Section */}
                    {isExpanded && (
                      <div className="border-t border-[#2A2A2A] bg-[#0F0F0F]">
                        {/* Price Breakdown */}
                        <div className="p-4 space-y-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Price Breakdown</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Service Price</span>
                              <span className="text-white font-medium">₱{parseFloat(servicePrice).toLocaleString()}</span>
                            </div>
                            {convenienceFee > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Booking Fee</span>
                                <span className="text-white font-medium">₱{parseFloat(convenienceFee).toLocaleString()}</span>
                              </div>
                            )}
                            {discount > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-green-400 flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  Discount
                                </span>
                                <span className="text-green-400 font-medium">-₱{parseFloat(discount).toLocaleString()}</span>
                              </div>
                            )}
                            {voucherCode && (
                              <div className="flex justify-between text-xs">
                                <span className="text-green-400 flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  Voucher ({voucherCode})
                                </span>
                                <span className="text-green-400 font-medium">Applied</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs pt-2 border-t border-[#2A2A2A]">
                              <span className="text-white font-bold">Total</span>
                              <span className="font-black" style={{ color: primaryColor }}>
                                ₱{parseFloat(totalPaid || (servicePrice + convenienceFee - discount)).toLocaleString()}
                              </span>
                            </div>
                            {booking.payment_status === 'partial' && (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-400">Convenience Fee Paid</span>
                                  <span className="text-green-400 font-medium">₱{convenienceFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-yellow-400 font-medium">Due at Shop</span>
                                  <span className="text-yellow-400 font-bold">₱{amountDue.toLocaleString()}</span>
                                </div>
                              </>
                            )}
                            {/* Payment Method Info */}
                            {booking.payment_method && (booking.payment_status === 'paid' || booking.payment_status === 'partial') && (
                              <div className="flex justify-between items-center text-xs pt-2 mt-2 border-t border-[#2A2A2A]">
                                <span className="text-gray-400 flex items-center gap-1.5">
                                  {getPaymentMethodIcon(booking.payment_method)}
                                  Payment Method
                                </span>
                                <span className="text-white font-medium">{getPaymentMethodLabel(booking.payment_method)}</span>
                              </div>
                            )}
                            {/* Convenience Fee Breakdown Note */}
                            {convenienceFee > 0 && (booking.payment_status === 'paid' || booking.payment_status === 'partial') && (
                              <div className="mt-2 p-2 bg-[#1A1A1A] rounded-lg">
                                <p className="text-[10px] text-gray-500">
                                  <span className="text-gray-400 font-medium">Booking fee of ₱{parseFloat(convenienceFee).toLocaleString()}</span> was charged for online reservation and is non-refundable.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-4 pt-0 flex gap-2">
                          {/* Track button for custom bookings */}
                          {booking.is_custom_booking && (
                            <button
                              onClick={() => navigate(`/track/${booking.booking_code}`)}
                              className="flex-1 py-2.5 px-4 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Track Order
                            </button>
                          )}
                          {(booking.status === "booked" || booking.status === "confirmed") && !booking.is_custom_booking && (
                            <button
                              onClick={() => setShowQRCode({ ...booking, service, barber })}
                              className="flex-1 py-2.5 px-4 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <QrCode className="w-4 h-4" />
                              Show QR Code
                            </button>
                          )}
                          {booking.status === "pending" && !booking.is_custom_booking && (
                            <>
                              <button
                                onClick={() => setShowCancelModal({ ...booking, service, barber })}
                                className="flex-1 py-2.5 px-4 bg-red-500/20 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Cancel
                              </button>
                              <button
                                onClick={() => setShowQRCode({ ...booking, service, barber })}
                                className="flex-1 py-2.5 px-4 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <QrCode className="w-4 h-4" />
                                QR Code
                              </button>
                            </>
                          )}
                          {booking.status === "completed" && !hasBeenRated(booking._id) && !booking.is_custom_booking && (
                            <button
                              onClick={() => setShowRatingModal({ ...booking, service, barber })}
                              className="flex-1 py-2.5 px-4 bg-yellow-500 text-white text-xs font-bold rounded-xl hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                            >
                              <Star className="w-4 h-4" />
                              Rate Service
                            </button>
                          )}
                          {booking.status === "completed" && hasBeenRated(booking._id) && (
                            <div className="flex-1 py-2.5 px-4 bg-green-500/20 text-green-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Rated
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
      )}
    </div>

    {/* Pagination Controls */}
    {filteredBookings.length > 0 && totalPages > 1 && (
      <div className="mt-6 bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentPage === 1
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-white hover:bg-[#2A2A2A]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              Page <span className="text-[var(--color-primary)] font-semibold">{currentPage}</span> of <span className="text-white font-semibold">{totalPages}</span>
            </span>
            <span className="text-xs text-gray-500">
              ({startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length})
            </span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentPage === totalPages
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-white hover:bg-[#2A2A2A]'
            }`}
          >
            <span className="text-sm">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}
  </>
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
const { showAlert } = useAppModal();
const [rating, setRating] = useState(0);
const [feedback, setFeedback] = useState("");

const handleSubmit = () => {
  if (rating === 0) {
    showAlert({ title: 'Rating Required', message: 'Please select a rating', type: 'warning' });
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
                {booking.barber_name || "Any Barber"}
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
                  {booking.barber_name || "Any Barber"}
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
                const servicePrice = booking.service_price || booking.service?.price || 0;
                const bookingFee = booking.booking_fee || 0;
                // For paid bookings, calculate service + booking fee; for partial, use stored total
                const totalAmount = booking.payment_status === 'paid'
                  ? servicePrice + bookingFee
                  : (booking.total_amount || booking.totalAmount);

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
                    {(booking.payment_status === 'paid' || totalAmount) && (
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
                  {booking.barber_name || "Any Barber"}
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
