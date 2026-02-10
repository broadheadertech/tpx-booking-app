import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, Store, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useAppModal } from '../../../context/AppModalContext';

const PaymentFailure = () => {
  const { showAlert } = useAppModal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [updatingToPayAtShop, setUpdatingToPayAtShop] = useState(false);

  // PayMongo booking code from URL (Story 7.6)
  const bookingCode = searchParams.get('booking');

  // Query booking by code for PayMongo payments (Story 7.6)
  const paymongoBooking = useQuery(
    api.services.bookings.getBookingByCode,
    bookingCode ? { bookingCode } : "skip"
  );

  // Mutation to update booking payment status
  const updatePaymentStatus = useMutation(api.services.bookings.updatePaymentStatus);

  useEffect(() => {
    // Extract payment details from URL parameters (existing payment system)
    const payment_request_id = searchParams.get('payment_request_id');
    const reference_id = searchParams.get('reference_id');
    const status = searchParams.get('status');
    const failure_reason = searchParams.get('failure_reason');

    if (payment_request_id) {
      setPaymentDetails({
        paymentId: payment_request_id,
        referenceId: reference_id,
        status: status,
        failureReason: failure_reason
      });
    }
  }, [searchParams]);

  const handleBackToHome = () => {
    navigate('/customer/dashboard');
  };

  const handleTryAgain = () => {
    // Go back to booking page to retry payment
    navigate('/customer/dashboard?section=booking');
  };

  // Handle Pay at Shop fallback (Story 7.6 - FR22)
  const handlePayAtShop = async () => {
    if (!paymongoBooking?._id) return;

    setUpdatingToPayAtShop(true);
    try {
      await updatePaymentStatus({
        id: paymongoBooking._id,
        payment_status: 'unpaid'
      });
      // Redirect to success page with booking code
      navigate(`/booking/payment-success?booking=${bookingCode}`);
    } catch (error) {
      console.error('Error updating to Pay at Shop:', error);
      showAlert({ title: 'Update Failed', message: 'Failed to update booking. Please try again.', type: 'error' });
    } finally {
      setUpdatingToPayAtShop(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Failure Card */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-xl border border-[#444444]/50 p-8 text-center">
          {/* Failure Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <XCircle className="w-10 h-10 text-white" />
          </div>

          {/* Failure Message */}
          <h1 className="text-2xl font-bold text-white mb-2">
            Payment Failed
          </h1>
          <p className="text-gray-400 mb-6">
            We couldn't process your payment. Please try again or use a different payment method.
          </p>

          {/* Payment Details */}
          {paymentDetails && (
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
                  <span className="text-red-400 font-semibold">
                    {paymentDetails.status || 'FAILED'}
                  </span>
                </div>
                {paymentDetails.failureReason && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reason:</span>
                    <span className="text-red-400 text-xs">
                      {paymentDetails.failureReason}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Common Failure Reasons */}
          <div className="bg-[#1A1A1A] rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Common Issues</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Insufficient balance in your e-wallet</li>
              <li>• Network connection issues</li>
              <li>• Payment method temporarily unavailable</li>
              <li>• Transaction timeout</li>
            </ul>
          </div>

          {/* PayMongo Booking Details (Story 7.6) */}
          {paymongoBooking && (
            <div className="bg-[#1A1A1A] rounded-xl p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Booking Code:</span>
                  <span className="text-white font-mono font-bold">
                    {paymongoBooking.booking_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Service:</span>
                  <span className="text-white">
                    {paymongoBooking.service_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white font-semibold">
                    ₱{(paymongoBooking.service_price || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Pay at Shop fallback for PayMongo bookings (FR22) */}
            {paymongoBooking && (
              <button
                onClick={handlePayAtShop}
                disabled={updatingToPayAtShop}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {updatingToPayAtShop ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Store className="w-5 h-5" />
                    <span>Pay at Shop Instead</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleTryAgain}
              className="w-full py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold rounded-xl hover:from-[var(--color-accent)] hover:brightness-110 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Try Again</span>
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

        {/* Support Info */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Need help? Contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;