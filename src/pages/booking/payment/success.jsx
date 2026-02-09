import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Calendar, QrCode, CreditCard, Store, Loader2, X } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import QRCode from 'qrcode';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [bookingUpdated, setBookingUpdated] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(5);
  const [shouldAutoClose, setShouldAutoClose] = useState(false);

  // PayMongo booking code from URL (Story 7.6)
  const bookingCode = searchParams.get('booking');

  // PayMongo session ID for deferred booking flow (from redirect or localStorage)
  // PayMongo Checkout Sessions redirect with ?session_id={CHECKOUT_SESSION_ID}
  const urlSessionId = searchParams.get('session_id');
  // Legacy link ID support (for backwards compatibility)
  const urlLinkId = searchParams.get('link');
  const [storedSessionId, setStoredSessionId] = useState(null);

  // On mount, check localStorage for pending payment session ID
  useEffect(() => {
    // Check for new sessionId format first
    const pendingSessionId = localStorage.getItem('pendingPaymongoSessionId');
    // Fallback to legacy linkId format
    const pendingLinkId = localStorage.getItem('pendingPaymongoLinkId');
    const pendingId = pendingSessionId || pendingLinkId;

    if (pendingId && !urlSessionId && !urlLinkId && !bookingCode) {
      // Use stored session ID and add it to URL for proper refresh handling
      setStoredSessionId(pendingId);
      // Clear from localStorage after retrieving
      localStorage.removeItem('pendingPaymongoSessionId');
      localStorage.removeItem('pendingPaymongoLinkId');
      // Update URL to include the session ID
      setSearchParams({ session_id: pendingId });
    }
  }, [urlSessionId, urlLinkId, bookingCode, setSearchParams]);

  // Use session ID from URL (from PayMongo redirect), URL link (legacy), or localStorage
  const paymongoLinkId = urlSessionId || urlLinkId || storedSessionId;

  // Debug logging
  useEffect(() => {
    console.log('[PaymentSuccess] Session ID sources:', {
      urlSessionId,
      urlLinkId,
      storedSessionId,
      finalPaymongoLinkId: paymongoLinkId,
    });
  }, [urlSessionId, urlLinkId, storedSessionId, paymongoLinkId]);

  useEffect(() => {
    console.log('[PaymentSuccess] Payment status query result:', paymentStatusByLink);
  }, [paymentStatusByLink]);

  // Convex mutations
  const updatePaymentStatus = useMutation(api.services.payments.updatePaymentStatus);
  const getPaymentByRequestId = useQuery(api.services.payments.getPaymentByRequestId,
    paymentDetails?.paymentId ? { paymentRequestId: paymentDetails.paymentId } : "skip"
  );

  // Query booking by code for PayMongo payments (Story 7.6)
  const paymongoBooking = useQuery(
    api.services.bookings.getBookingByCode,
    bookingCode ? { bookingCode } : "skip"
  );

  // Query payment status by link ID for deferred booking flow
  const paymentStatusByLink = useQuery(
    api.services.paymongo.getPaymentStatusByLink,
    paymongoLinkId ? { paymongo_link_id: paymongoLinkId } : "skip"
  );

  useEffect(() => {
    // Extract payment details from URL parameters (existing payment system)
    const payment_request_id = searchParams.get('payment_request_id');
    const reference_id = searchParams.get('reference_id');
    const status = searchParams.get('status');

    if (payment_request_id) {
      setPaymentDetails({
        paymentId: payment_request_id,
        referenceId: reference_id,
        status: status
      });
    }
  }, [searchParams]);

  // Auto-close tab functionality for deferred booking flow
  // Start auto-close when payment is confirmed (paymentStatusByLink?.status === 'completed')
  useEffect(() => {
    // Only trigger auto-close for completed deferred payments (when paymongoLinkId exists)
    if (paymongoLinkId && paymentStatusByLink?.status === 'completed') {
      console.log('[PaymentSuccess] Payment confirmed - starting auto-close countdown');
      setShouldAutoClose(true);
    }
  }, [paymongoLinkId, paymentStatusByLink?.status]);

  // Countdown timer for auto-close
  useEffect(() => {
    if (!shouldAutoClose) return;

    // If countdown reached 0, close the tab
    if (autoCloseCountdown <= 0) {
      console.log('[PaymentSuccess] Auto-closing tab...');
      // Try to close the tab - this works if the tab was opened via JavaScript
      window.close();
      // If window.close() doesn't work (e.g., tab wasn't opened by script),
      // the user will still see the countdown message explaining what happened
      return;
    }

    // Decrement countdown every second
    const timer = setTimeout(() => {
      setAutoCloseCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldAutoClose, autoCloseCountdown]);

  // Generate QR code for PayMongo booking (Story 7.6 - FR6)
  // Handles both direct booking code and deferred booking flow
  useEffect(() => {
    // Check for booking code from direct flow or deferred flow
    const bookingCodeToUse = paymongoBooking?.booking_code ||
      (paymentStatusByLink?.status === 'completed' && paymentStatusByLink?.booking?.booking_code);
    const bookingDate = paymongoBooking?.date ||
      (paymentStatusByLink?.status === 'completed' && paymentStatusByLink?.booking?.date);

    if (bookingCodeToUse) {
      const generateQR = async () => {
        try {
          const qrData = JSON.stringify({
            type: 'booking',
            code: bookingCodeToUse,
            date: bookingDate,
          });
          const url = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
          });
          setQrCodeUrl(url);
        } catch (err) {
          console.error('QR code generation failed:', err);
        }
      };
      generateQR();
    }
  }, [paymongoBooking, paymentStatusByLink]);

  // Update payment status when we have payment details (existing payment system)
  useEffect(() => {
    const updateBookingStatus = async () => {
      if (paymentDetails?.paymentId && paymentDetails?.status === 'COMPLETED' && !bookingUpdated) {
        try {
          console.log('Updating payment status for successful payment:', paymentDetails.paymentId);

          // Update payment status in Convex
          await updatePaymentStatus({
            payment_request_id: paymentDetails.paymentId,
            status: 'SUCCEEDED',
            metadata: {
              source: 'payment_success_page',
              timestamp: new Date().toISOString()
            }
          });

          setBookingUpdated(true);
          console.log('Payment status updated successfully');
        } catch (error) {
          console.error('Error updating payment status:', error);
          // Continue anyway - the webhook might still work
        }
      }
    };

    updateBookingStatus();
  }, [paymentDetails, updatePaymentStatus, bookingUpdated]);

  const handleBackToHome = () => {
    navigate('/customer/dashboard');
  };

  const handleViewBookings = () => {
    navigate('/customer/dashboard?section=bookings');
  };

  // Helper to format payment status display for booking data
  const getPaymentStatusDisplay = (bookingData) => {
    if (!bookingData) return null;

    const status = bookingData.payment_status;
    const servicePrice = bookingData.service_price || 0;
    const convenienceFeePaid = bookingData.convenience_fee_paid || 0;

    switch (status) {
      case 'paid':
        return {
          label: 'Fully Paid',
          badge: 'bg-green-500/20 text-green-400 border-green-500/30',
          icon: CreditCard,
          amount: `₱${servicePrice.toLocaleString()}`,
          dueAtBranch: '₱0'
        };
      case 'partial':
        return {
          label: 'Partially Paid',
          badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          icon: CreditCard,
          amount: `₱${convenienceFeePaid.toLocaleString()}`,
          dueAtBranch: `₱${servicePrice.toLocaleString()}`
        };
      case 'unpaid':
      default:
        return {
          label: 'Pay at Branch',
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          icon: Store,
          amount: '₱0',
          dueAtBranch: `₱${servicePrice.toLocaleString()}`
        };
    }
  };

  // Determine which data source to use
  const isDeferred = !!paymongoLinkId;
  const isLoading = isDeferred
    ? !paymentStatusByLink || paymentStatusByLink.status === 'pending' || paymentStatusByLink.status === 'paid'
    : false;
  const isCompleted = isDeferred
    ? paymentStatusByLink?.status === 'completed'
    : !!paymongoBooking;

  // Get booking data from either source
  const bookingData = isDeferred
    ? paymentStatusByLink?.booking || paymentStatusByLink?.pendingPayment
    : paymongoBooking;

  const paymentStatus = getPaymentStatusDisplay(isDeferred ? paymentStatusByLink?.booking : paymongoBooking);

  // Show loading state while waiting for booking to be created (deferred flow)
  if (isDeferred && (paymentStatusByLink?.status === 'pending' || paymentStatusByLink?.status === 'paid')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-xl border border-[#444444]/50 p-8 text-center">
            {/* Loading Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Processing Payment...</h1>
            <p className="text-gray-400 mb-6">
              {paymentStatusByLink?.message || 'Please wait while we confirm your payment and create your booking.'}
            </p>

            {/* Show pending booking details */}
            {bookingData && (
              <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4 text-left">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Booking Preview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Service:</span>
                    <span className="text-white font-semibold">{bookingData.service_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Barber:</span>
                    <span className="text-white">{bookingData.barber_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date & Time:</span>
                    <span className="text-white">{bookingData.date}, {bookingData.time}</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-gray-500 text-xs">This may take a few seconds...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state for failed/expired payments
  if (isDeferred && (paymentStatusByLink?.status === 'failed' || paymentStatusByLink?.status === 'expired' || paymentStatusByLink?.status === 'not_found')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-xl border border-[#444444]/50 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Verifying Payment...</h1>
            <p className="text-gray-400 mb-4">
              {paymentStatusByLink?.status === 'not_found'
                ? 'Your payment is being processed. This may take a moment.'
                : paymentStatusByLink?.message || 'Unable to verify payment.'}
            </p>

            {/* Debug info */}
            <div className="bg-[#1A1A1A] rounded-xl p-3 mb-4 text-left">
              <p className="text-xs text-gray-500 font-mono break-all">
                Session: {paymongoLinkId || 'None'}
              </p>
            </div>

            <p className="text-gray-500 text-xs mb-4">
              If you completed payment, please wait or check your bookings.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold rounded-xl hover:brightness-110 transition-all duration-200"
              >
                Refresh Status
              </button>
              <button
                onClick={handleViewBookings}
                className="w-full py-3 border border-[#555555] text-gray-300 font-semibold rounded-xl hover:bg-[#444444] transition-all duration-200"
              >
                Check My Bookings
              </button>
              <button
                onClick={handleBackToHome}
                className="w-full py-3 border border-[#333333] text-gray-500 font-semibold rounded-xl hover:bg-[#333333] transition-all duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get the correct booking object for display
  const displayBooking = isDeferred && paymentStatusByLink?.status === 'completed'
    ? paymentStatusByLink.booking
    : paymongoBooking;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Auto-close Banner */}
        {shouldAutoClose && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl px-4 py-3 mb-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  {autoCloseCountdown > 0
                    ? `This tab will close in ${autoCloseCountdown}s...`
                    : 'You can close this tab now'}
                </p>
                <p className="text-white/70 text-xs">
                  Return to your booking app to see your QR code
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShouldAutoClose(false);
                setAutoCloseCountdown(5);
              }}
              className="text-white/80 hover:text-white text-xs underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Success Card */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-xl border border-[#444444]/50 p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-white mb-2">
            {displayBooking ? 'Booking Confirmed!' : 'Payment Successful!'}
          </h1>
          <p className="text-gray-400 mb-6">
            {displayBooking
              ? 'Your appointment has been successfully booked.'
              : 'Your booking payment has been processed successfully.'}
          </p>

          {/* PayMongo Booking Details (Story 7.6) */}
          {displayBooking && (
            <>
              {/* Payment Status Badge */}
              {paymentStatus && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6 ${paymentStatus.badge}`}>
                  <paymentStatus.icon className="w-4 h-4" />
                  <span className="font-semibold text-sm">{paymentStatus.label}</span>
                </div>
              )}

              {/* Booking Details */}
              <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4 text-left">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Booking Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Booking Code:</span>
                    <span className="text-white font-mono font-bold">
                      {displayBooking.booking_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Service:</span>
                    <span className="text-white font-semibold">
                      {displayBooking.service_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Barber:</span>
                    <span className="text-white">
                      {displayBooking.barber_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date & Time:</span>
                    <span className="text-white">
                      {displayBooking.formattedDate || displayBooking.date}, {displayBooking.formattedTime || displayBooking.time}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              {paymentStatus && (
                <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4 text-left">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Payment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount Paid:</span>
                      <span className="text-green-400 font-semibold">
                        {paymentStatus.amount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Due at Branch:</span>
                      <span className={paymentStatus.dueAtBranch === '₱0' ? 'text-gray-500' : 'text-yellow-400 font-semibold'}>
                        {paymentStatus.dueAtBranch}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code for Check-in (FR6) - Prominent Display */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 mb-4 border border-[#2A2A2A]">
                <h3 className="text-lg font-light mb-4 text-white">
                  Your Booking QR Code
                </h3>

                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-2xl shadow-sm">
                    <div className="relative w-44 h-44">
                      {!qrCodeUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                          <div className="text-center space-y-3">
                            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                            <p className="text-xs text-gray-600">Generating QR Code...</p>
                          </div>
                        </div>
                      )}
                      {qrCodeUrl && (
                        <img src={qrCodeUrl} alt="Booking QR Code" className="w-full h-full" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <div className="text-lg font-light text-white">
                    Booking Code:{" "}
                    <span className="font-bold text-[var(--color-primary)]">
                      {displayBooking.booking_code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Screenshot this QR code and show it when you arrive
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Existing Payment Details (non-PayMongo) */}
          {paymentDetails && !paymongoBooking && (
            <div className="bg-[#1A1A1A] rounded-xl p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment ID:</span>
                  <span className="text-white font-mono text-xs">
                    {paymentDetails.paymentId?.substring(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reference:</span>
                  <span className="text-white font-mono text-xs">
                    {paymentDetails.referenceId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-semibold">
                    {paymentDetails.status || 'COMPLETED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Booking Status:</span>
                  <span className={`font-semibold ${bookingUpdated ? 'text-green-400' : 'text-yellow-400'}`}>
                    {bookingUpdated ? 'Updated' : 'Updating...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleViewBookings}
              className="w-full py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold rounded-xl hover:from-[var(--color-accent)] hover:brightness-110 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
            >
              <Calendar className="w-5 h-5" />
              <span>View My Bookings</span>
            </button>

            <button
              onClick={handleBackToHome}
              className="w-full py-3 border border-[#555555] text-gray-300 font-semibold rounded-xl hover:bg-[#444444] transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            You will receive a confirmation email shortly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;