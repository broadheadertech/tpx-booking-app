import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Gift,
  Scissors,
  Shield,
  Zap,
  Star,
  Crown,
  Sparkles,
  Building,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import QRCode from "qrcode";
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from "../../context/AuthContext"

// Barber Avatar Component
const BarberAvatar = ({ barber, className = "w-12 h-12" }) => {
  const [imageError, setImageError] = useState(false)

  // Get image URL from Convex storage if available
  const imageUrlFromStorage = useQuery(
    api.services.barbers.getImageUrl,
    barber.avatarStorageId ? { storageId: barber.avatarStorageId } : "skip"
  )

  // Use storage URL if available, otherwise fallback to regular avatar or default
  const imageSrc = imageUrlFromStorage || barber.avatarUrl || '/img/avatar_default.jpg'

  if (imageError || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 rounded-full ${className}`}>
        <User className="w-6 h-6 text-gray-500" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={`${barber.full_name || barber.name} avatar`}
      className={`${className} rounded-full object-cover`}
      onError={() => setImageError(true)}
    />
  )
}

const ServiceBooking = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [step, setStep] = useState(1); // 1: branch, 2: services, 3: date & time & staff, 4: confirmation, 5: success
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(true);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const qrRef = useRef(null);

  // Convex queries
  const branches = useQuery(api.services.branches.getActiveBranches)
  const services = useQuery(
    api.services.services.getServicesByBranch, 
    selectedBranch ? { branch_id: selectedBranch._id } : "skip"
  )
  const barbers = useQuery(
    api.services.barbers.getBarbersByBranch, 
    selectedBranch ? { branch_id: selectedBranch._id } : "skip"
  )
  const vouchers = useQuery(
    api.services.vouchers.getVouchersByUser, 
    user?.id ? { userId: user.id } : "skip"
  )

  // Convex mutations and actions
  const createBooking = useMutation(api.services.bookings.createBooking)
  const createPaymentRequest = useAction(api.services.payments.createPaymentRequest)
  const updateBookingPaymentStatus = useMutation(api.services.bookings.updatePaymentStatus)
  
  // Query to get booking details after creation
  const getBookingById = useQuery(
    api.services.bookings.getBookingById, 
    createdBooking?._id ? { id: createdBooking._id } : "skip"
  )
  
  // Query to get existing bookings for selected barber and date
  const existingBookings = useQuery(
    api.services.bookings.getBookingsByBarberAndDate,
    selectedStaff && selectedDate 
      ? { barberId: selectedStaff._id, date: selectedDate }
      : "skip"
  )
  const redeemVoucher = useMutation(api.services.vouchers.redeemVoucher)

  // Check for pre-selected service from AI assistant
  useEffect(() => {
    const preSelectedServiceData = sessionStorage.getItem('preSelectedService')
    if (preSelectedServiceData && services && selectedBranch) {
      try {
        const preSelectedService = JSON.parse(preSelectedServiceData)
        // Find the matching service from the current services list
        const matchingService = services.find(service => 
          service._id === preSelectedService._id || 
          service.name.toLowerCase().includes('haircut') || 
          service.name.toLowerCase().includes('cut')
        )
        
        if (matchingService) {
          setSelectedService(matchingService)
          setStep(3) // Skip to step 3 since service is already selected
        }
        
        // Clear the stored service after using it
        sessionStorage.removeItem('preSelectedService')
      } catch (error) {
        console.error('Error parsing pre-selected service:', error)
        sessionStorage.removeItem('preSelectedService')
      }
    }
  }, [services, selectedBranch])

  // Reset QR code loading state when step changes
  useEffect(() => {
    if (step === 5) {
      setQrCodeLoading(true);
    }
  }, [step]);

  // Generate QR code when we reach step 5 and have actual booking data
  useEffect(() => {
    if (step === 5 && createdBooking?._id && getBookingById?.booking_code) {
      console.log(
        "Step 4 reached with booking ID:",
        createdBooking._id,
        "actual booking code:",
        getBookingById.booking_code
      );

      const generateQRCode = (retryCount = 0) => {
        if (qrRef.current) {
          console.log("Canvas found, generating QR code with actual booking data");

          // Use actual booking data from database
          const bookingData = getBookingById;
          
          // Generate QR code data - simplified to contain only booking code
          const qrData = bookingData.booking_code;

          console.log("Generating QR with data:", qrData);
          console.log("QR Scanner expects format with bookingId and bookingCode fields:", {
            bookingId: bookingData._id,
            bookingCode: bookingData.booking_code
          });

          // Generate QR code as canvas
          QRCode.toCanvas(
            qrRef.current,
            qrData,
            {
              width: 192,
              margin: 2,
              color: {
                dark: "#36454F",
                light: "#ffffff",
              },
              errorCorrectionLevel: "H",
            },
            (error) => {
              if (error) {
                console.error("QR Code generation error:", error);
              } else {
                console.log("QR Code generated successfully with booking code:", bookingData.booking_code);
              }
              setQrCodeLoading(false);
            }
          );
        } else if (retryCount < 5) {
          console.log(
            `Canvas ref not available, retrying... (${retryCount + 1}/5)`
          );
          setTimeout(() => generateQRCode(retryCount + 1), 200);
        } else {
          console.error("Canvas ref still not available after 5 retries");
          setQrCodeLoading(false);
        }
      };

      // Start QR code generation with initial delay
      const timer = setTimeout(() => generateQRCode(), 100);

      return () => clearTimeout(timer);
    }
  }, [
    step,
    createdBooking?._id,
    getBookingById?.booking_code, // Wait for actual booking code
    selectedService,
    selectedStaff,
    selectedVoucher,
  ]);



  // Filter available vouchers from Convex data
  const getAvailableVouchers = () => {
    if (!vouchers) return [];

    return vouchers.filter((voucher) => {
      const isNotExpired = voucher.expires_at > Date.now();
      const isNotRedeemed = !voucher.redeemed;

      return isNotExpired && isNotRedeemed;
    });
  };

  // Generate time slots for the selected date
  const timeSlots = React.useMemo(() => {
    if (!selectedDate || !selectedStaff) return [];
    
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    const currentDate = new Date();
    const selectedDateObj = new Date(selectedDate);
    const isToday = selectedDateObj.toDateString() === currentDate.toDateString();
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();
    
    // Get booked times for this barber on this date
    const bookedTimes = existingBookings ? existingBookings
      .filter(booking => booking.status !== 'cancelled')
      .map(booking => booking.time.substring(0, 5)) // Remove seconds part
      : [];
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = hour === 12 ? `12:${minute.toString().padStart(2, '0')} PM` :
                           hour > 12 ? `${hour - 12}:${minute.toString().padStart(2, '0')} PM` :
                           `${hour}:${minute.toString().padStart(2, '0')} AM`;
        
        // Check availability
        let available = true;
        let reason = null;
        
        // Check if time slot is already booked
        if (bookedTimes.includes(timeString)) {
          available = false;
          reason = 'booked';
        }
        
        // Check if time slot is in the past (for today only)
        if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
          available = false;
          reason = 'past';
        }
        
        slots.push({
          time: timeString,
          displayTime: displayTime,
          available: available,
          reason: reason
        });
      }
    }
    
    return slots;
  }, [selectedDate, selectedStaff, existingBookings]);

  // Get available barbers for selected service
  const getAvailableBarbers = () => {
    if (!selectedService || !barbers) return barbers || [];

    // Filter barbers who provide the specific service
    const serviceBarbers = barbers.filter(
      (barber) =>
        barber.services &&
        Array.isArray(barber.services) &&
        barber.services.some(serviceId => serviceId === selectedService._id)
    );

    // Only return barbers that specifically offer this service
    console.log(
      `Found ${serviceBarbers.length} barbers for service ${selectedService.name}`
    );
    return serviceBarbers;
  };

  // Helper function to get service icon
  const getServiceIcon = (serviceName) => {
    const name = serviceName?.toLowerCase() || "";
    if (name.includes("haircut") || name.includes("cut")) {
      return <Scissors className="w-5 h-5 text-white" />;
    }
    if (name.includes("beard")) {
      return <Shield className="w-5 h-5 text-white" />;
    }
    if (name.includes("shave")) {
      return <Zap className="w-5 h-5 text-white" />;
    }
    if (name.includes("wash")) {
      return <Sparkles className="w-5 h-5 text-white" />;
    }
    if (name.includes("package") || name.includes("complete")) {
      return <Crown className="w-5 h-5 text-white" />;
    }
    return <Star className="w-5 h-5 text-white" />;
  };

  const handleCreateBooking = async (
    paymentType = "pay_later",
    paymentMethod = null
  ) => {
    if (!selectedService || !selectedDate || !selectedTime) {
      alert("Please fill in all booking details");
      return;
    }

    try {
      setBookingLoading(true);

      // Format time to include seconds for API compatibility
      const formattedTime = selectedTime.includes(":")
        ? `${selectedTime}:00`
        : selectedTime;

      const bookingData = {
        customer: user.id,
        service: selectedService._id,
        barber: selectedStaff?._id || undefined,
        branch_id: selectedBranch._id,
        date: selectedDate,
        time: formattedTime,
        discount_amount: selectedVoucher?.value,
        status: "booked",
        notes: selectedVoucher ? `Used voucher: ${selectedVoucher.code}` : undefined,
      };

      console.log("Creating booking with data:", bookingData);
      const bookingId = await createBooking(bookingData);

      // Create initial booking object - actual data will be fetched via getBookingById
      const booking = {
        _id: bookingId,
        booking_code: null, // Will be populated by getBookingById query
        service: selectedService,
        barber: selectedStaff,
        date: selectedDate,
        time: formattedTime,
        status: "booked",
        voucher_code: selectedVoucher?.code
      };
      setCreatedBooking(booking);

      // Handle payment processing
      if (paymentType === "pay_now" && paymentMethod) {
        const paymentSuccess = await handlePaymentProcessing(bookingId, paymentMethod);
        if (!paymentSuccess) {
          // Payment failed, don't proceed to success page
          return;
        }
        // For immediate payments, update booking payment status to paid
        try {
          await updateBookingPaymentStatus({
            id: bookingId,
            payment_status: 'paid'
          });
          console.log('Booking payment status updated to paid');
        } catch (statusError) {
          console.error('Error updating booking payment status:', statusError);
          // Don't fail the booking creation if status update fails
        }
      } else {
        setStep(5); // Success step for pay later
      }

      // Redeem voucher if one was selected
      if (selectedVoucher?.code) {
        try {
          console.log("Redeeming voucher:", selectedVoucher.code);
          await redeemVoucher({
            code: selectedVoucher.code,
            redeemed_by: user.id
          });

          console.log("Voucher redeemed successfully");

          // Show success message for voucher redemption
          setTimeout(() => {
            console.log(`✅ Voucher ${selectedVoucher.code} redeemed successfully!`);
          }, 1500);
        } catch (voucherError) {
          console.error("Error during voucher redemption:", voucherError);
          // Don't break the booking flow - the booking is still successful
          // The voucher remains unredeemed and user can try again later
        }
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert(error.message || "Failed to create booking. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePaymentProcessing = async (bookingId, paymentMethod) => {
    try {
      // Calculate final amount after voucher discount
      const originalAmount = selectedService?.price || 0;
      const discountAmount = selectedVoucher?.value || 0;
      const finalAmount = Math.max(0, originalAmount - discountAmount);

      if (finalAmount === 0) {
        // If amount is 0 after voucher, no payment needed
        setStep(5);
        return true;
      }

      console.log('Processing payment:', {
        amount: finalAmount,
        paymentMethod,
        bookingId
      });

      // Call Convex payment action
      const paymentResult = await createPaymentRequest({
        amount: finalAmount,
        paymentMethod: paymentMethod,
        bookingId: bookingId,
        customerEmail: user.email,
        customerName: user.full_name || user.name
      });

      console.log('Payment created successfully:', paymentResult);

      // Redirect to payment page if there's a redirect URL
      if (paymentResult.redirect_url) {
        window.location.href = paymentResult.redirect_url;
        return true;
      } else {
        // If no redirect URL, show success
        setStep(5);
        return true;
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      alert(`Payment failed: ${error.message}. Please try again or choose pay later.`);
      return false; // Payment failed, don't proceed
    }
  };

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    // Reset selections when changing branch
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedTime(null);
    setStep(2);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    // Reset selected staff when changing service to avoid validation errors
    setSelectedStaff(null);
    setStep(3);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleStaffSelect = (barber) => {
    // console.log("Selected Barber:", barber);
    console.log("Selected Barber ID:", barber._id);
    sessionStorage.setItem('barberId', barber._id)
    
    setSelectedStaff(barber); // keep full object
  };

  const handleConfirmBooking = async (
    paymentType = "pay_later",
    paymentMethod = null
  ) => {
    await handleCreateBooking(paymentType, paymentMethod);
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Select Branch";
      case 2:
        return "Choose Service";
      case 3:
        return "Select Date, Time & Barber";
      case 4:
        return "Confirm Booking";
      case 5:
        return "Booking Confirmed";
      default:
        return "Book Service";
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-4 px-4 py-2">
      <div className="flex items-center space-x-3">
        {[1, 2, 3, 4].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step >= stepNumber ? "text-white shadow-md" : "text-gray-500"
              }`}
              style={{
                backgroundColor: step >= stepNumber ? "#F68B24" : "#E0E0E0",
              }}
            >
              {step > stepNumber ? "✓" : stepNumber}
            </div>
            {stepNumber < 4 && (
              <div
                className={`w-8 h-0.5 mx-1 rounded transition-all duration-300`}
                style={{
                  backgroundColor: step > stepNumber ? "#F68B24" : "#E0E0E0",
                }}
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderBranchSelection = () => {
    if (!branches) {
      return (
        <div className="text-center py-8 px-4 min-h-[200px] flex flex-col justify-center">
          <div
            className="rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "rgba(246, 139, 36, 0.1)" }}
          >
            <Building className="w-7 h-7" style={{ color: "#F68B24" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "#8B8B8B" }}>
            Loading branches...
          </p>
        </div>
      );
    }

    if (branches.length === 0) {
      return (
        <div className="text-center py-8 px-4 min-h-[200px] flex flex-col justify-center">
          <div
            className="rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "rgba(220, 53, 69, 0.1)" }}
          >
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-sm text-red-600 mb-4 font-medium px-4">No branches available</p>
        </div>
      );
    }

    return (
      <div className="px-4 pb-4">
        {/* Mobile-First Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full w-12 h-12 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center mr-3 shadow-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold leading-tight text-white">
                Select Your Branch
              </h2>
              <p className="text-sm font-medium text-gray-400">
                Choose your preferred location
              </p>
            </div>
          </div>
        </div>

        {/* Mobile-Optimized Branch Cards */}
        <div className="space-y-4">
          {branches.map((branch) => (
            <button
              key={branch._id}
              onClick={() => handleBranchSelect(branch)}
              className="group relative w-full bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl shadow-lg active:shadow-xl border-2 border-[#555555]/30 hover:border-[#FF8C42]/50 active:border-[#FF8C42] transition-all duration-200 overflow-hidden touch-manipulation min-h-[120px]"
            >
              {/* Mobile-Optimized Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF8C42]/5 via-transparent to-[#FF8C42]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF8C42]/10 to-[#FF7A2B]/10 opacity-0 group-active:opacity-100 transition-opacity duration-200"></div>

              {/* Touch-Friendly Content */}
              <div className="relative p-4">
                <div className="flex items-start space-x-3">
                  {/* Mobile-Optimized Icon Badge */}
                  <div className="flex-shrink-0">
                    <div className="rounded-full w-12 h-12 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Mobile-First Content Layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-base font-bold leading-tight text-white group-hover:text-[#FF8C42] transition-colors duration-200">
                          {branch.name}
                        </h3>
                        <p className="text-xs font-mono text-gray-400 mt-1">
                          #{branch.branch_code}
                        </p>
                      </div>
                    </div>

                    {/* Branch Contact Info */}
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3 h-3 flex-shrink-0 text-gray-500" />
                        <span className="text-xs text-gray-400 truncate">
                          {branch.address}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3 h-3 flex-shrink-0 text-gray-500" />
                        <span className="text-xs text-gray-400">
                          {branch.phone}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3 h-3 flex-shrink-0 text-gray-500" />
                        <span className="text-xs text-gray-400">
                          {branch.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile-Optimized Accent Line */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] scale-x-0 group-hover:scale-x-100 group-active:scale-x-100 transition-transform duration-200 origin-left rounded-b-2xl"></div>
              </div>
            </button>
          ))}
        </div>

        {/* Mobile-Optimized Footer */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 px-4 py-3 rounded-full bg-[#FF8C42]/20 border border-[#FF8C42]/30">
            <Building className="w-4 h-4 text-[#FF8C42]" />
            <span className="text-sm font-semibold text-[#FF8C42]">
              {branches.length} Branch{branches.length !== 1 ? 'es' : ''} Available
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderServiceSelection = () => {
    if (loading || !services) {
      return (
        <div className="text-center py-8 px-4 min-h-[200px] flex flex-col justify-center">
          <div
            className="rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "rgba(246, 139, 36, 0.1)" }}
          >
            <Calendar className="w-7 h-7" style={{ color: "#F68B24" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "#8B8B8B" }}>
            Loading premium services...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 px-4 min-h-[200px] flex flex-col justify-center">
          <div
            className="rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "rgba(220, 53, 69, 0.1)" }}
          >
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-sm text-red-600 mb-4 font-medium px-4">{error}</p>
          <button
            onClick={loadBookingData}
            className="w-full max-w-xs mx-auto px-6 py-3 bg-gradient-to-r from-[#F68B24] to-orange-500 text-white rounded-xl font-semibold hover:from-orange-500 hover:to-[#F68B24] transition-all duration-300 shadow-lg active:shadow-md active:scale-95 min-h-[44px] touch-manipulation"
          >
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="px-4 pb-4">
        {/* Mobile-First Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full w-12 h-12 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center mr-3 shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold leading-tight text-white">
                Choose Your Service
              </h2>
              <p className="text-sm font-medium text-gray-400">
                Premium grooming services
              </p>
            </div>
          </div>
        </div>

        {/* Mobile-Optimized Service Cards */}
        <div className="space-y-4">
          {services && services.map((service) => (
            <button
              key={service._id}
              onClick={() => handleServiceSelect(service)}
              className="group relative w-full bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl shadow-lg active:shadow-xl border-2 border-[#555555]/30 hover:border-[#FF8C42]/50 active:border-[#FF8C42] transition-all duration-200 overflow-hidden touch-manipulation min-h-[100px]"
            >
              {/* Mobile-Optimized Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF8C42]/5 via-transparent to-[#FF8C42]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF8C42]/10 to-[#FF7A2B]/10 opacity-0 group-active:opacity-100 transition-opacity duration-200"></div>

              {/* Touch-Friendly Content */}
              <div className="relative p-4">
                <div className="flex items-center space-x-3">
                  {/* Mobile-Optimized Icon Badge */}
                  <div className="flex-shrink-0">
                    <div className="rounded-full w-12 h-12 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                      {getServiceIcon(service.name)}
                    </div>
                  </div>

                  {/* Mobile-First Content Layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-base font-bold leading-tight text-white group-hover:text-[#FF8C42] transition-colors duration-200">
                          {service.name}
                        </h3>
                        <p className="text-sm mt-1 line-clamp-2 leading-relaxed text-gray-400">
                          {service.description ||
                            "Professional grooming service tailored to your needs"}
                        </p>
                      </div>
                    </div>

                    {/* Mobile-Optimized Meta Info */}
                    <div className="flex items-center space-x-4 mt-3">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 flex-shrink-0 text-gray-500" />
                        <span className="text-sm font-medium truncate text-gray-400">
                          {service.duration_minutes
                            ? `${service.duration_minutes} min`
                            : "Duration varies"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 flex-shrink-0 text-[#FF8C42]" />
                        <span className="text-sm font-medium text-gray-400">
                          5.0
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile-Friendly Price Display */}
                  <div className="flex-shrink-0">
                    <div className="rounded-xl px-3 py-2 bg-[#FF8C42]/20 border border-[#FF8C42]/30 text-center min-w-[70px]">
                      <div className="text-base font-bold leading-tight text-[#FF8C42]">
                        ₱{parseFloat(service.price || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile-Optimized Accent Line */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] scale-x-0 group-hover:scale-x-100 group-active:scale-x-100 transition-transform duration-200 origin-left rounded-b-2xl"></div>
              </div>
            </button>
          ))}
        </div>

        {/* Mobile-Optimized Footer */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 px-4 py-3 rounded-full bg-[#FF8C42]/20 border border-[#FF8C42]/30">
            <Crown className="w-4 h-4 text-[#FF8C42]" />
            <span className="text-sm font-semibold text-[#FF8C42]">
              {services.length} Premium Services Available
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTimeAndStaffSelection = () => (
    <div className="space-y-4 px-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold mb-2 text-white">
          Select Barber & Time
        </h2>
        <p className="text-sm font-medium text-gray-400">
          Choose your preferred barber, then pick a time
        </p>
      </div>

      {/* Selected Service Summary */}
      <div
        className="bg-white rounded-xl p-3 border shadow-sm"
        style={{ borderColor: "#E0E0E0" }}
      >
        <div className="flex items-center space-x-2">
          <div className="text-xl">{selectedService?.image}</div>
          <div className="flex-1">
            <h3 className="text-base font-bold" style={{ color: "#36454F" }}>
              {selectedService?.name}
            </h3>
            <div className="flex items-center space-x-3 text-sm">
              <span className="font-bold" style={{ color: "#F68B24" }}>
                ₱{selectedService?.price.toLocaleString()}
              </span>
              <span className="font-medium" style={{ color: "#8B8B8B" }}>
                {selectedService?.duration}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Selection - Now First */}
      <div
        className="bg-white rounded-xl p-4 border shadow-sm"
        style={{ borderColor: "#E0E0E0" }}
      >
        <h3 className="text-base font-bold mb-3" style={{ color: "#36454F" }}>
          Step 1: Choose Your Barber
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {getAvailableBarbers().length > 0 ? (
            getAvailableBarbers().map((barber) => (
              <button
                key={barber._id}
                onClick={() => {
                  handleStaffSelect(barber);
                  // Reset date and time when barber changes
                  setSelectedTime(null);
                }}
                className="w-full p-3 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-sm"
                style={{
                  borderColor:
                    selectedStaff?._id === barber._id ? "#F68B24" : "#E0E0E0",
                  backgroundColor:
                    selectedStaff?._id === barber._id
                      ? "rgba(246, 139, 36, 0.1)"
                      : "white",
                }}
              >
                <div className="flex items-center space-x-3">
                  {selectedStaff?._id === barber._id ? (
                    <div className="relative">
                      <BarberAvatar barber={barber} className="w-10 h-10" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ) : (
                    <BarberAvatar barber={barber} className="w-10 h-10" />
                  )}
                  <div className="flex-1">
                    <h4
                      className="font-bold text-sm"
                      style={{ color: "#36454F" }}
                    >
                      {barber.full_name || barber.name || "Professional Barber"}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex text-yellow-400 text-xs">★★★★★</div>
                      <span className="text-xs" style={{ color: "#8B8B8B" }}>
                        5.0 • Professional
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-sm font-medium" style={{ color: "#F68B24" }}>
                No barbers available for "{selectedService?.name}"
              </p>
              <p className="text-xs mt-1" style={{ color: "#8B8B8B" }}>
                This service may not be offered by our current staff
              </p>
              <button
                onClick={() => setStep(1)}
                className="mt-3 px-4 py-2 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Choose Different Service
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date Selection - Now Second, only show if barber is selected */}
      {selectedStaff && (
        <div
          className="bg-white rounded-xl p-4 border shadow-sm"
          style={{ borderColor: "#E0E0E0" }}
        >
          <h3 className="text-base font-bold mb-3" style={{ color: "#36454F" }}>
            Step 2: Select Date
          </h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedTime(null); // Reset selected time when date changes
            }}
            min={new Date().toISOString().split("T")[0]} // Prevent past dates
            max={
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            } // 30 days ahead
            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base font-medium focus:outline-none focus:border-orange-500 transition-colors"
            style={{ color: "#36454F" }}
          />
        </div>
      )}

      {/* Time Slots - Now Third, only show if both barber and date are selected */}
      {selectedStaff && selectedDate && (
        <div
          className="bg-white rounded-xl p-4 border shadow-sm"
          style={{ borderColor: "#E0E0E0" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold" style={{ color: "#36454F" }}>
              Step 3: Available Times
            </h3>
            <span className="text-xs" style={{ color: "#8B8B8B" }}>
              {new Date(selectedDate).toLocaleDateString("en-PH", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {loadingTimeSlots ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                <span className="text-sm" style={{ color: "#8B8B8B" }}>
                  Loading available times...
                </span>
              </div>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-sm font-medium" style={{ color: "#F68B24" }}>
                No available times
              </p>
              <p className="text-xs mt-1" style={{ color: "#8B8B8B" }}>
                Please select a different date
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className="p-2 rounded-lg font-semibold text-center transition-all duration-200 border text-sm relative"
                    style={{
                      backgroundColor: slot.available
                        ? selectedTime === slot.time
                          ? "#F68B24"
                          : "#F5F5F5"
                        : "#F0F0F0",
                      color: slot.available
                        ? selectedTime === slot.time
                          ? "white"
                          : "#36454F"
                        : "#CCCCCC",
                      borderColor: slot.available
                        ? selectedTime === slot.time
                          ? "#F68B24"
                          : "transparent"
                        : "transparent",
                      cursor: slot.available ? "pointer" : "not-allowed",
                    }}
                    title={
                      slot.available
                        ? `Book at ${slot.displayTime}`
                        : `${slot.displayTime} - ${
                            slot.reason === "past"
                              ? "Past time"
                              : slot.reason === "booked"
                              ? "Already booked"
                              : "Unavailable"
                          }`
                    }
                  >
                    {slot.displayTime}
                    {!slot.available && (
                      <div className="absolute top-1 right-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            slot.reason === "past"
                              ? "bg-gray-400"
                              : "bg-red-500"
                          }`}
                        ></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center space-x-3 text-xs">
                <div className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: "#F5F5F5" }}
                  ></div>
                  <span style={{ color: "#8B8B8B" }}>Available</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: "#F68B24" }}
                  ></div>
                  <span style={{ color: "#8B8B8B" }}>Selected</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: "#F0F0F0" }}
                  ></div>
                  <span style={{ color: "#8B8B8B" }}>Booked</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-gray-300"></div>
                  <span style={{ color: "#8B8B8B" }}>Past</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Continue Button - Only show when all selections are made */}
      {selectedTime && selectedStaff && selectedDate && (
        <button
          onClick={() => setStep(4)}
          className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200 shadow-lg"
          style={{ backgroundColor: "#F68B24" }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#E67E22")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#F68B24")}
        >
          Continue to Confirmation
        </button>
      )}

      {/* Progress Indicator */}
      {selectedStaff && (
        <div className="text-center">
          <div
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full shadow-sm"
            style={{ backgroundColor: "rgba(246, 139, 36, 0.1)" }}
          >
            <span
              className="text-xs font-semibold"
              style={{ color: "#F68B24" }}
            >
              {selectedStaff && !selectedDate
                ? "Step 2: Select Date"
                : selectedStaff && selectedDate && !selectedTime
                ? "Step 3: Select Time"
                : selectedStaff && selectedDate && selectedTime
                ? "Ready to Continue!"
                : "Step 1: Choose Barber"}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderStaffSelection = () => (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <h2 className="text-3xl font-black text-[#1A1A1A] mb-2">
          Choose Your Barber
        </h2>
        <p className="text-lg text-[#6B6B6B] font-medium">
          Select your preferred professional
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {getAvailableBarbers().map((barber) => (
          <button
            key={barber._id}
            onClick={() => handleStaffSelect(barber)}
            className={`group bg-white rounded-3xl p-6 shadow-xl border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
              selectedStaff?._id === barber._id
                ? "border-[#FF8C42]"
                : "border-[#F5F5F5] hover:border-[#FF8C42]"
            }`}
          >
            <div className="text-center">
              <div className="relative w-16 h-16 rounded-full mx-auto mb-4">
                <BarberAvatar barber={barber} className="w-16 h-16" />
                {selectedStaff?._id === barber._id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-black text-[#1A1A1A] mb-2 group-hover:text-[#FF8C42] transition-colors duration-200">
                {barber}
                {barber.full_name}
              </h3>
              <div className="space-y-2">
                <div className="px-3 py-1 bg-[#FF8C42]/10 text-[#FF8C42] rounded-full text-sm font-semibold inline-block">
                  Professional Barber
                </div>
                <p className="text-[#6B6B6B] text-sm font-medium">
                  Experienced professional
                </p>
                <div className="flex items-center justify-center space-x-1">
                  <div className="flex text-yellow-400">{"★".repeat(5)}</div>
                  <span className="text-sm font-bold text-[#6B6B6B] ml-1">
                    5.0
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-3 px-4">
      <div className="text-center mb-3">
        <h2 className="text-xl font-bold mb-1" style={{ color: "#36454F" }}>
          Confirm Your Booking
        </h2>
        <p className="text-sm font-medium" style={{ color: "#8B8B8B" }}>
          Please review your appointment details
        </p>
      </div>

      <div
        className="bg-white rounded-xl p-4 border shadow-lg"
        style={{ borderColor: "#E0E0E0" }}
      >
        <div className="space-y-4">
          {/* Service Details */}
          <div
            className="text-center border-b pb-3"
            style={{ borderColor: "#E0E0E0" }}
          >
            <div className="text-2xl mb-2">{selectedService?.image}</div>
            <h3 className="text-lg font-bold mb-1" style={{ color: "#36454F" }}>
              {selectedService?.name}
            </h3>
            <div className="flex justify-center items-center space-x-3">
              <span
                className="font-bold text-base"
                style={{ color: "#F68B24" }}
              >
                ₱{selectedService?.price.toLocaleString()}
              </span>
              <span
                className="font-medium text-sm"
                style={{ color: "#8B8B8B" }}
              >
                {selectedService?.duration}
              </span>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4" style={{ color: "#F68B24" }} />
                <span
                  className="font-semibold text-sm"
                  style={{ color: "#36454F" }}
                >
                  Branch
                </span>
              </div>
              <span className="font-bold text-sm" style={{ color: "#36454F" }}>
                {selectedBranch?.name}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" style={{ color: "#F68B24" }} />
                <span
                  className="font-semibold text-sm"
                  style={{ color: "#36454F" }}
                >
                  Date & Time
                </span>
              </div>
              <span className="font-bold text-sm" style={{ color: "#36454F" }}>
                Today, {selectedTime}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" style={{ color: "#F68B24" }} />
                <span
                  className="font-semibold text-sm"
                  style={{ color: "#36454F" }}
                >
                  Your Barber
                </span>
              </div>
              <span className="font-bold text-sm" style={{ color: "#36454F" }}>
                {selectedStaff?.full_name ||
                  selectedStaff?.name ||
                  "Any Barber"}
              </span>
            </div>
          </div>

          {/* Voucher Selection */}
          <div className="border-t pt-3" style={{ borderColor: "#E0E0E0" }}>
            <h4
              className="text-sm font-bold mb-3 flex items-center"
              style={{ color: "#36454F" }}
            >
              <Gift className="w-4 h-4 mr-2" style={{ color: "#F68B24" }} />
              Apply Voucher (Optional)
            </h4>

            {getAvailableVouchers().length > 0 ? (
              <div className="space-y-2 mb-3">
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {getAvailableVouchers().map((voucher) => (
                    <button
                      key={voucher._id}
                      onClick={() =>
                        setSelectedVoucher(
                          selectedVoucher?._id === voucher._id ? null : voucher
                        )
                      }
                      className="w-full p-2 rounded-lg border-2 transition-all duration-200 text-left"
                      style={{
                        borderColor:
                          selectedVoucher?._id === voucher._id
                            ? "#F68B24"
                            : "#E0E0E0",
                        backgroundColor:
                          selectedVoucher?._id === voucher._id
                            ? "rgba(246, 139, 36, 0.1)"
                            : "white",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">🎁</div>
                          <div>
                            <p
                              className="text-xs font-bold"
                              style={{ color: "#36454F" }}
                            >
                              {voucher.code}
                            </p>
                            <p className="text-xs" style={{ color: "#F68B24" }}>
                              ₱{parseFloat(voucher.value || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {selectedVoucher?._id === voucher._id && (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "#F68B24" }}
                          >
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedVoucher && (
                  <div
                    className="text-xs text-center p-2 rounded"
                    style={{ backgroundColor: "#F0F8FF", color: "#36454F" }}
                  >
                    💰 You'll save ₱
                    {parseFloat(selectedVoucher.value || 0).toFixed(2)} with
                    this voucher
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs" style={{ color: "#8B8B8B" }}>
                  No vouchers available
                </p>
              </div>
            )}
          </div>

          {/* Payment Options */}
          <div className="border-t pt-3" style={{ borderColor: "#E0E0E0" }}>
            <h4 className="text-sm font-bold mb-3" style={{ color: "#36454F" }}>
              Complete Your Booking
            </h4>

            {!showPaymentMethods ? (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => setShowPaymentMethods(true)}
                  disabled={bookingLoading}
                  className={`py-3 px-4 bg-green-500 text-white font-bold rounded-lg transition-all duration-200 text-sm flex items-center justify-center space-x-2 ${
                    bookingLoading ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                  onMouseEnter={(e) =>
                    !bookingLoading &&
                    (e.target.style.backgroundColor = "#16A34A")
                  }
                  onMouseLeave={(e) =>
                    !bookingLoading &&
                    (e.target.style.backgroundColor = "#22C55E")
                  }
                >
                  <span>💳</span>
                  <span>Pay Now</span>
                </button>
                <button
                  onClick={() => handleConfirmBooking("pay_later")}
                  disabled={bookingLoading}
                  className={`py-3 px-4 border-2 font-bold rounded-lg transition-all duration-200 text-sm flex items-center justify-center space-x-2 ${
                    bookingLoading ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                  style={{
                    borderColor: "#F68B24",
                    color: bookingLoading ? "#CCCCCC" : "#F68B24",
                  }}
                  onMouseEnter={(e) =>
                    !bookingLoading &&
                    ((e.target.style.backgroundColor = "#F68B24"),
                    (e.target.style.color = "white"))
                  }
                  onMouseLeave={(e) =>
                    !bookingLoading &&
                    ((e.target.style.backgroundColor = "transparent"),
                    (e.target.style.color = "#F68B24"))
                  }
                >
                  {bookingLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      <span>Booking...</span>
                    </div>
                  ) : (
                    <>
                      <span>🏪</span>
                      <span>Pay Later</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5
                    className="text-sm font-bold mb-2"
                    style={{ color: "#36454F" }}
                  >
                    Select Payment Method
                  </h5>
                  <div className="space-y-2">
                    <button
                      key="gcash"
                      onClick={() => setSelectedPaymentMethod("gcash")}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                        selectedPaymentMethod === "gcash"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">G</span>
                      </div>
                      <div className="text-left">
                        <p
                          className="font-bold text-sm"
                          style={{ color: "#36454F" }}
                        >
                          GCash
                        </p>
                        <p className="text-xs" style={{ color: "#8B8B8B" }}>
                          Digital wallet payment
                        </p>
                      </div>
                    </button>

                    <button
                      key="maya"
                      onClick={() => setSelectedPaymentMethod("maya")}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                        selectedPaymentMethod === "maya"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      <div className="text-left">
                        <p
                          className="font-bold text-sm"
                          style={{ color: "#36454F" }}
                        >
                          Maya
                        </p>
                        <p className="text-xs" style={{ color: "#8B8B8B" }}>
                          Digital wallet payment
                        </p>
                      </div>
                    </button>

                    <button
                      key="card"
                      onClick={() => setSelectedPaymentMethod("card")}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                        selectedPaymentMethod === "card"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">💳</span>
                      </div>
                      <div className="text-left">
                        <p
                          className="font-bold text-sm"
                          style={{ color: "#36454F" }}
                        >
                          Credit/Debit Card
                        </p>
                        <p className="text-xs" style={{ color: "#8B8B8B" }}>
                          Visa, Mastercard, etc.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowPaymentMethods(false);
                      setSelectedPaymentMethod(null);
                    }}
                    className="flex-1 py-2 px-3 border font-bold rounded-lg transition-all duration-200 text-sm"
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
                    Back
                  </button>
                  <button
                    onClick={() =>
                      handleConfirmBooking("pay_now", selectedPaymentMethod)
                    }
                    disabled={!selectedPaymentMethod || bookingLoading}
                    className={`flex-1 py-2 px-3 text-white font-bold rounded-lg transition-all duration-200 shadow-lg text-sm ${
                      !selectedPaymentMethod || bookingLoading
                        ? "opacity-75 cursor-not-allowed"
                        : ""
                    }`}
                    style={{
                      backgroundColor:
                        !selectedPaymentMethod || bookingLoading
                          ? "#CCCCCC"
                          : "#22C55E",
                    }}
                    onMouseEnter={(e) =>
                      !selectedPaymentMethod ||
                      bookingLoading ||
                      (e.target.style.backgroundColor = "#16A34A")
                    }
                    onMouseLeave={(e) =>
                      !selectedPaymentMethod ||
                      bookingLoading ||
                      (e.target.style.backgroundColor = "#22C55E")
                    }
                  >
                    {bookingLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      "Confirm & Pay"
                    )}
                  </button>
                </div>
              </div>
            )}

            {!showPaymentMethods && (
              <p
                className="text-xs text-center mb-3"
                style={{ color: "#8B8B8B" }}
              >
                Choose your preferred payment option to complete booking
              </p>
            )}
          </div>

          {/* Go Back Button */}
          {!showPaymentMethods && (
            <div className="pt-2">
              <button
                onClick={() => setStep(3)}
                className="w-full py-2 px-3 border font-bold rounded-lg transition-all duration-200 text-sm"
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
                ← Go Back to Edit Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderBookingSuccess = () => {
    return (
      <div className="space-y-6 px-4">
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{ backgroundColor: "#F68B24" }}
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2 text-white">
            Booking Confirmed!
          </h2>
          <p className="font-medium text-gray-300">
            Your appointment has been successfully booked
          </p>
        </div>

        {/* QR Code */}
        <div
          className="bg-white rounded-2xl p-8 border-2 shadow-lg text-center"
          style={{ borderColor: "#E0E0E0" }}
        >
          <h3 className="text-lg font-black mb-4 text-black">
            Your Booking QR Code
          </h3>

          {/* Real QR Code */}
          <div className="flex justify-center mb-4">
            <div
              className="p-4 bg-white rounded-2xl border-2 shadow-sm"
              style={{ borderColor: "#E0E0E0" }}
            >
              <div className="relative w-48 h-48">
                {(qrCodeLoading || !getBookingById?.booking_code) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center space-y-3">
                      <div className="animate-spin w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-gray-700">
                        {!getBookingById?.booking_code ? "Loading booking details..." : "Generating QR Code..."}
                      </p>
                    </div>
                  </div>
                )}
                <canvas
                  ref={qrRef}
                  className="rounded-xl w-full h-full"
                  style={{ display: (qrCodeLoading || !getBookingById?.booking_code) ? "none" : "block" }}
                ></canvas>
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="text-lg font-black text-black">
              Booking Code: {getBookingById?.booking_code ? getBookingById.booking_code :
                <span className="inline-flex items-center space-x-2">
                  <span className="text-gray-700">Generating...</span>
                  <div className="animate-pulse w-2 h-2 bg-orange-500 rounded-full"></div>
                </span>
              }
            </div>
            <p className="text-sm text-gray-700">
              Show this QR code when you arrive
            </p>
          </div>
        </div>

        {/* Booking Summary */}
        <div
          className="rounded-2xl p-6 border"
          style={{
            backgroundColor: "rgba(246, 139, 36, 0.05)",
            borderColor: "rgba(246, 139, 36, 0.2)",
          }}
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">
                Branch:
              </span>
              <span className="font-bold text-white">
                {selectedBranch?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">
                Service:
              </span>
              <span className="font-bold text-white">
                {selectedService?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">
                Date & Time:
              </span>
              <span className="font-bold text-white">
                {createdBooking?.date
                  ? new Date(createdBooking.date).toLocaleDateString()
                  : "Today"}
                , {createdBooking?.time || selectedTime}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-300">
                Barber:
              </span>
              <div className="flex items-center space-x-2">
                {selectedStaff && (
                  <BarberAvatar barber={selectedStaff} className="w-8 h-8" />
                )}
                <span className="font-bold text-white">
                  {selectedStaff?.full_name ||
                    selectedStaff?.name ||
                    "Any Barber"}
                </span>
              </div>
            </div>
            {selectedVoucher && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">
                  Subtotal:
                </span>
                <span className="font-bold line-through text-gray-400">
                  ₱{selectedService?.price.toLocaleString()}
                </span>
              </div>
            )}
            {selectedVoucher && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">
                  Voucher Discount:
                </span>
                <span className="font-bold text-green-400">
                  -₱{parseFloat(selectedVoucher.value || 0).toLocaleString()}
                </span>
              </div>
            )}
            <div
              className="flex justify-between border-t pt-3 border-orange-500/30"
            >
              <span className="font-bold text-white">
                Total:
              </span>
              <span className="font-black text-lg text-orange-400">
                ₱
                {createdBooking?.total_amount
                  ? parseFloat(createdBooking.total_amount).toLocaleString()
                  : Math.max(
                      0,
                      (selectedService?.price || 0) -
                        (selectedVoucher?.value || 0)
                    ).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onBack}
            className="w-full py-4 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg"
            style={{ backgroundColor: "#F68B24" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#E67E22")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#F68B24")}
          >
            Back to Home
          </button>
          <button
            onClick={() => {
              // Navigate to bookings section in dashboard
              if (onBack) {
                onBack("bookings"); // Pass 'bookings' to indicate which section to show
              }
            }}
            className="w-full py-3 border-2 font-bold rounded-2xl transition-all duration-200"
            style={{ borderColor: "#F68B24", color: "#F68B24" }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#F68B24";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#F68B24";
            }}
          >
            View My Bookings
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
      </div>
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30 shadow-lg">
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
              <p className="text-lg font-bold text-white">
                Book Service
              </p>
              <p className="text-xs text-[#FF8C42]">
                Step {step} of 4
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="relative z-10">
        {renderStepIndicator()}
      </div>

      {/* Content */}
      <div className="relative z-10 pb-8">
        {step === 1 && renderBranchSelection()}
        {step === 2 && renderServiceSelection()}
        {step === 3 && renderTimeAndStaffSelection()}
        {step === 4 && renderConfirmation()}
        {step === 5 && renderBookingSuccess()}
      </div>
    </div>
  );
};

export default ServiceBooking;
