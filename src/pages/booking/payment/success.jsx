import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Calendar } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [bookingUpdated, setBookingUpdated] = useState(false);

  // Convex mutations
  const updatePaymentStatus = useMutation(api.services.payments.updatePaymentStatus);
  const getPaymentByRequestId = useQuery(api.services.payments.getPaymentByRequestId,
    paymentDetails?.paymentId ? { paymentRequestId: paymentDetails.paymentId } : "skip"
  );

  useEffect(() => {
    // Extract payment details from URL parameters
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

  // Update payment status when we have payment details
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-xl border border-[#444444]/50 p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-white mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-400 mb-6">
            Your booking payment has been processed successfully.
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
              className="w-full py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white font-semibold rounded-xl hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
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