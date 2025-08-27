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

  // Convex queries - only call when user exists
  const bookings = user?.id ? useQuery(api.services.bookings.getBookingsByCustomer, { customerId: user.id }) : undefined;
  const services = useQuery(api.services.services.getAllServices);
  const barbers = useQuery(api.services.barbers.getAllBarbers);

  // Loading state - true when user exists but data not loaded yet
  const loading = user?.id && (bookings === undefined || services === undefined || barbers === undefined);
  
  // Error state - currently no error handling implemented
  const error = null;

  // Convex mutations
  const updateBookingStatus = useMutation(api.services.bookings.updateBooking);

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

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Calendar className="w-4 h-4" style={{ color: "#8B8B8B" }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-50 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const filteredBookings = bookings ? bookings.filter((booking) => {
    if (activeFilter === "all") return true;
    return booking.status === activeFilter;
  }) : [];

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
    <div className="min-h-screen" style={{ backgroundColor: "#F4F0E6" }}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: "#36454F" }}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-lg transition-all duration-200"
              style={{ "&:hover": { color: "#F68B24" } }}
              onMouseEnter={(e) => (e.target.style.color = "#F68B24")}
              onMouseLeave={(e) => (e.target.style.color = "white")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-sm font-bold text-white">My Bookings</p>
              <p className="text-xs" style={{ color: "#F68B24" }}>
                {bookings?.length || 0} total
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Filter Tabs */}
        <div className="mb-4">
          <div
            className="bg-white rounded-xl p-2 border shadow-sm"
            style={{ borderColor: "#E0E0E0" }}
          >
            <div className="grid grid-cols-4 gap-1">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200`}
                  style={{
                    backgroundColor:
                      activeFilter === filter.id ? "#F68B24" : "transparent",
                    color: activeFilter === filter.id ? "white" : "#8B8B8B",
                  }}
                  onMouseEnter={(e) => {
                    if (activeFilter !== filter.id) {
                      e.target.style.backgroundColor = "#F4F0E6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeFilter !== filter.id) {
                      e.target.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <div>{filter.label}</div>
                  <div className="text-xs mt-1">({filter.count})</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div
              className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#F68B24", opacity: 0.1 }}
            >
              <Calendar className="w-8 h-8" style={{ color: "#F68B24" }} />
            </div>
            <p className="text-sm" style={{ color: "#8B8B8B" }}>
              Loading bookings...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div
              className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#dc3545", opacity: 0.1 }}
            >
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-red-600 mb-4">Failed to load bookings</p>
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
              <div className="text-center py-8">
                <Calendar
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: "#8B8B8B" }}
                />
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ color: "#36454F" }}
                >
                  No Bookings Found
                </h3>
                <p className="mb-4" style={{ color: "#8B8B8B" }}>
                  {activeFilter === "all"
                    ? "You haven't made any bookings yet"
                    : `No ${activeFilter} bookings found`}
                </p>
                <button
                  onClick={onBack}
                  className="px-6 py-3 text-white font-bold rounded-xl transition-all duration-200"
                  style={{ backgroundColor: "#F68B24" }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#E67E22")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#F68B24")
                  }
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
                    className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-lg transition-all duration-200"
                    style={{ borderColor: "#E0E0E0" }}
                  >
                    {/* Booking Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: "#F68B24" }}
                        >
                          <span className="text-white text-lg">✂️</span>
                        </div>
                        <div>
                          <h3
                            className="text-base font-bold"
                            style={{ color: "#36454F" }}
                          >
                            {service.name || "Service"}
                          </h3>
                          <p className="text-xs" style={{ color: "#8B8B8B" }}>
                            Code: {booking.booking_code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(booking.status)}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="space-y-2 mb-3">
                      {/* Date and Time Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <Calendar
                            className="w-3 h-3"
                            style={{ color: "#F68B24" }}
                          />
                          <div>
                            <p className="text-xs" style={{ color: "#8B8B8B" }}>
                              Date
                            </p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "#36454F" }}
                            >
                              {new Date(booking.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock
                            className="w-3 h-3"
                            style={{ color: "#F68B24" }}
                          />
                          <div>
                            <p className="text-xs" style={{ color: "#8B8B8B" }}>
                              Time
                            </p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "#36454F" }}
                            >
                              {booking.time}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Barber and Service Price Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <User
                            className="w-3 h-3"
                            style={{ color: "#F68B24" }}
                          />
                          <div>
                            <p className="text-xs" style={{ color: "#8B8B8B" }}>
                              Barber
                            </p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "#36454F" }}
                            >
                              {barber.name || "Any Barber"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: "#F68B24" }}
                          ></div>
                          <div>
                            <p className="text-xs" style={{ color: "#8B8B8B" }}>
                              Service Price
                            </p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "#F68B24" }}
                            >
                              ₱
                              {service.price
                                ? parseFloat(service.price).toLocaleString()
                                : "--"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Voucher and Total Amount Row */}
                      {(() => {
                        // Check for voucher code in different possible field names
                        const voucherCode =
                          booking.voucher_code ||
                          booking.voucherCode ||
                          booking.voucher?.code;
                        const totalAmount =
                          booking.total_amount || booking.totalAmount;

                        return (
                          (voucherCode || totalAmount) && (
                            <div
                              className="grid grid-cols-2 gap-3 pt-2 border-t"
                              style={{ borderColor: "#E0E0E0" }}
                            >
                              {voucherCode && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 rounded bg-green-500"></div>
                                  <div>
                                    <p
                                      className="text-xs"
                                      style={{ color: "#8B8B8B" }}
                                    >
                                      Voucher Used
                                    </p>
                                    <p
                                      className="text-sm font-bold"
                                      style={{ color: "#22C55E" }}
                                    >
                                      {voucherCode}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {totalAmount && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                                  <div>
                                    <p
                                      className="text-xs"
                                      style={{ color: "#8B8B8B" }}
                                    >
                                      Total Paid
                                    </p>
                                    <p
                                      className="text-sm font-bold"
                                      style={{ color: "#3B82F6" }}
                                    >
                                      ₱
                                      {parseFloat(totalAmount).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        );
                      })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      {booking.status === "booked" && (
                        <button
                          onClick={() =>
                            setShowQRCode({ ...booking, service, barber })
                          }
                          className="flex-1 py-2 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                          style={{ backgroundColor: "#F68B24" }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#E67E22")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#F68B24")
                          }
                        >
                          <QrCode className="w-3 h-3" />
                          <span className="text-sm">Show QR</span>
                        </button>
                      )}
                      {booking.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              setShowCancelModal({
                                ...booking,
                                service,
                                barber,
                              })
                            }
                            className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg transition-all duration-200 text-sm"
                            onMouseEnter={(e) =>
                              (e.target.style.backgroundColor = "#DC2626")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.backgroundColor = "#EF4444")
                            }
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() =>
                              setShowQRCode({ ...booking, service, barber })
                            }
                            className="flex-1 py-2 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                            style={{ backgroundColor: "#F68B24" }}
                            onMouseEnter={(e) =>
                              (e.target.style.backgroundColor = "#E67E22")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.backgroundColor = "#F68B24")
                            }
                          >
                            <QrCode className="w-3 h-3" />
                            <span>View QR</span>
                          </button>
                        </>
                      )}
                      {booking.status === "cancelled" && (
                        <button
                          onClick={onBack}
                          className="flex-1 py-2 text-white font-bold rounded-lg transition-all duration-200 text-sm"
                          style={{ backgroundColor: "#F68B24" }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#E67E22")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#F68B24")
                          }
                        >
                          Book Again
                        </button>
                      )}
                      {(booking.status === "confirmed" ||
                        booking.status === "completed") && (
                        <button
                          onClick={() =>
                            setShowQRCode({ ...booking, service, barber })
                          }
                          className="flex-1 py-2 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                          style={{ backgroundColor: "#10B981" }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#059669")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#10B981")
                          }
                        >
                          <QrCode className="w-3 h-3" />
                          <span>Show QR</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <QRCodeModal booking={showQRCode} onClose={() => setShowQRCode(null)} />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <CancelBookingModal
          booking={showCancelModal}
          onConfirm={() => handleCancelBooking(showCancelModal._id)}
          onClose={() => setShowCancelModal(null)}
          loading={cancelLoading}
        />
      )}
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
