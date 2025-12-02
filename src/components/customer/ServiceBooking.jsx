import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  CheckCircle,
  Gift,
  Building,
  Search,
  X,
  MapPin,
  AlertTriangle,
  CreditCard,
  Banknote,
  Star,
} from "lucide-react";
import QRCode from "qrcode";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";
import { formatTime } from "../../utils/dateUtils";

// Helper function to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex) return hex;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Barber Avatar Component
const BarberAvatar = ({ barber, className = "w-12 h-12" }) => {
  const [imageError, setImageError] = useState(false);

  // Get image URL from Convex storage if available
  const imageUrlFromStorage = useQuery(
    api.services.barbers.getImageUrl,
    barber.avatarStorageId ? { storageId: barber.avatarStorageId } : "skip"
  );

  // Use storage URL if available, otherwise fallback to regular avatar or default
  const imageSrc =
    imageUrlFromStorage || barber.avatarUrl || "/img/avatar_default.jpg";

  if (imageError || !imageSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 rounded-full ${className}`}
      >
        <User className="w-6 h-6 text-gray-500" />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={`${barber.full_name || barber.name} avatar`}
      className={`${className} rounded-full object-cover`}
      onError={() => setImageError(true)}
    />
  );
};

const ServiceBooking = ({ onBack }) => {
  const { branding } = useBranding();
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
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const qrRef = useRef(null);
  const [openCategory, setOpenCategory] = useState(null); // ✅ Top level hook

  // Custom booking form states
  const [showCustomBookingForm, setShowCustomBookingForm] = useState(false);
  const [customFormResponses, setCustomFormResponses] = useState({});
  const [customFormCustomerName, setCustomFormCustomerName] = useState(user?.full_name || user?.nickname || "");
  const [customFormCustomerEmail, setCustomFormCustomerEmail] = useState(user?.email || "");
  const [customFormCustomerPhone, setCustomFormCustomerPhone] = useState(user?.mobile_number || user?.phone || "");
  const [customBookingSubmitting, setCustomBookingSubmitting] = useState(false);
  const [customBookingSuccess, setCustomBookingSuccess] = useState(null);

  // Convex queries
  const branches = useQuery(api.services.branches.getActiveBranches);
  const services = useQuery(
    api.services.services.getServicesByBranch,
    selectedBranch ? { branch_id: selectedBranch._id } : "skip"
  );
  const barbers = useQuery(
    api.services.barbers.getBarbersByBranch,
    selectedBranch ? { branch_id: selectedBranch._id } : "skip"
  );
  const vouchers = useQuery(
    api.services.vouchers.getVouchersByUser,
    user?._id ? { userId: user._id } : "skip"
  );

  // Query for custom booking form when a barber with custom booking is selected
  const customBookingForm = useQuery(
    api.services.customBookingForms.getActiveFormByBarber,
    selectedStaff?.custom_booking_enabled && selectedStaff?._id
      ? { barber_id: selectedStaff._id }
      : "skip"
  );

  // Mutation for submitting custom booking form
  const submitCustomBookingForm = useMutation(api.services.customBookingSubmissions.submitForm);

  // Convex mutations and actions
  const createBooking = useMutation(api.services.bookings.createBooking);
  const createPaymentRequest = useAction(
    api.services.payments.createPaymentRequest
  );
  const updateBookingPaymentStatus = useMutation(
    api.services.bookings.updatePaymentStatus
  );

  // Query to get booking details after creation
  const getBookingById = useQuery(
    api.services.bookings.getBookingById,
    createdBooking?._id ? { id: createdBooking._id } : "skip"
  );

  // Query to get existing bookings for selected barber and date
  const existingBookings = useQuery(
    api.services.bookings.getBookingsByBarberAndDate,
    selectedStaff && selectedDate
      ? { barberId: selectedStaff._id, date: selectedDate }
      : "skip"
  );
  const redeemVoucher = useMutation(api.services.vouchers.redeemVoucher);

  // Check for pre-selected service from AI assistant
  useEffect(() => {
    const preSelectedServiceData = sessionStorage.getItem("preSelectedService");
    if (preSelectedServiceData && services && selectedBranch) {
      try {
        const preSelectedService = JSON.parse(preSelectedServiceData);
        // Find the matching service from the current services list
        const matchingService = services.find(
          (service) =>
            service._id === preSelectedService._id ||
            service.name.toLowerCase().includes("haircut") ||
            service.name.toLowerCase().includes("cut")
        );

        if (matchingService) {
          setSelectedService(matchingService);
          setStep(3); // Skip to step 3 since service is already selected
        }

        // Clear the stored service after using it
        sessionStorage.removeItem("preSelectedService");
      } catch (error) {
        console.error("Error parsing pre-selected service:", error);
        sessionStorage.removeItem("preSelectedService");
      }
    }
  }, [services, selectedBranch]);

  // Reset QR code loading state when step changes
  useEffect(() => {
    if (step === 6) {
      setQrCodeLoading(true);
    }
  }, [step]);

  // Generate QR code when we reach step 6 and have actual booking data
  useEffect(() => {
    if (step === 6 && createdBooking?._id && getBookingById?.booking_code) {
      console.log(
        "Step 4 reached with booking ID:",
        createdBooking._id,
        "actual booking code:",
        getBookingById.booking_code
      );

      const generateQRCode = (retryCount = 0) => {
        if (qrRef.current) {
          console.log(
            "Canvas found, generating QR code with actual booking data"
          );

          // Use actual booking data from database
          const bookingData = getBookingById;

          // Generate QR code data - simplified to contain only booking code
          const qrData = bookingData.booking_code;

          console.log("Generating QR with data:", qrData);
          console.log(
            "QR Scanner expects format with bookingId and bookingCode fields:",
            {
              bookingId: bookingData._id,
              bookingCode: bookingData.booking_code,
            }
          );

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
                console.log(
                  "QR Code generated successfully with booking code:",
                  bookingData.booking_code
                );
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
    if (!selectedDate || !selectedStaff || !selectedBranch) return [];

    const slots = [];
    const currentDate = new Date();
    const selectedDateObj = new Date(selectedDate);
    const isToday =
      selectedDateObj.toDateString() === currentDate.toDateString();
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();

    let startHour, startMin, endHour, endMin;

    // Check schedule type (specific dates vs weekly)
    if (selectedStaff.schedule_type === 'specific_dates' && selectedStaff.specific_dates) {
      const dateStr = selectedDateObj.toISOString().split('T')[0];
      const specificDate = selectedStaff.specific_dates.find(d => d.date === dateStr);

      if (!specificDate || !specificDate.available) {
        return [];
      }

      [startHour, startMin] = specificDate.start.split(':').map(Number);
      [endHour, endMin] = specificDate.end.split(':').map(Number);
    } else {
      // Default to weekly schedule
      // Get day of week for schedule check
      const dayOfWeek = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Check barber's schedule for this day
      const barberSchedule = selectedStaff.schedule?.[dayOfWeek];
      
      // If barber doesn't have schedule or is not available this day, return empty
      if (!barberSchedule || !barberSchedule.available) {
        return [];
      }

      // Use barber's scheduled hours instead of branch hours
      [startHour, startMin] = barberSchedule.start.split(':').map(Number);
      [endHour, endMin] = barberSchedule.end.split(':').map(Number);
    }

    // Get booked times for this barber on this date
    const bookedTimes = existingBookings
      ? existingBookings
          .filter((booking) => booking.status !== "cancelled")
          .map((booking) => booking.time.substring(0, 5)) // Remove seconds part
      : [];

    for (let hour = startHour; hour < endHour; hour++) {
      const minute = 0; // Only hourly slots

      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;

      const displayTime =
        hour === 12
          ? `12:00 PM`
          : hour > 12
            ? `${hour - 12}:00 PM`
            : `${hour}:00 AM`;

      // Check availability
      let available = true;
      let reason = null;

      // Check if time slot is already booked
      if (bookedTimes.includes(timeString)) {
        available = false;
        reason = "booked";
      }

      // Check if time slot is in the past (for today only)
      if (isToday && hour < currentHour) {
        available = false;
        reason = "past";
      }

      // Check blocked periods (Time Off)
      if (
        selectedStaff.blocked_periods &&
        selectedStaff.blocked_periods.length > 0
      ) {
        const dateString = selectedDateObj.toISOString().split("T")[0];
        const blockingPeriod = selectedStaff.blocked_periods.find(
          (p) => p.date === dateString
        );

        if (blockingPeriod) {
          // If no specific times are set, it blocks the whole day
          if (!blockingPeriod.start_time && !blockingPeriod.end_time) {
            available = false;
            reason = "blocked";
          } else {
            // Check specific time overlap
            const slotTime = timeString; // HH:mm format

            // Convert times to comparable numbers (minutes from midnight)
            const getMinutes = (t) => {
              if (!t) return 0;
              const [h, m] = t.split(":").map(Number);
              return h * 60 + m;
            };

            const slotMinutes = getMinutes(slotTime);
            const startMinutes = getMinutes(blockingPeriod.start_time);
            const endMinutes = getMinutes(blockingPeriod.end_time);

            if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
              available = false;
              reason = "blocked";
            }
          }
        }
      }

      slots.push({
        time: timeString,
        displayTime: displayTime,
        available: available,
        reason: reason,
      });
    }

    return slots;
  }, [selectedDate, selectedStaff, selectedBranch, existingBookings]);

  // Get available barbers for selected service
  const getAvailableBarbers = () => {
    if (!barbers) return [];

    // First, filter only active employees (is_active = true)
    // We keep those who are not accepting bookings, but they will be disabled in UI
    let available = barbers.filter(b => b.is_active);

    // If a service is selected, further filter by who can perform that service
    if (selectedService) {
      available = available.filter(
        (barber) =>
          barber.services &&
          Array.isArray(barber.services) &&
          barber.services.some((serviceId) => serviceId === selectedService._id)
      );
    }

    return available;
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
        customer: user._id,
        service: selectedService._id,
        barber: selectedStaff?._id || undefined,
        branch_id: selectedBranch._id,
        date: selectedDate,
        time: formattedTime,
        status: "booked",
        notes: selectedVoucher
          ? `Used voucher: ${selectedVoucher.code}`
          : undefined,
        voucher_id: selectedVoucher?._id || undefined,
        discount_amount: selectedVoucher?.value || undefined,
        customer_email: user.email,
        customer_name: user.full_name || user.nickname || user.username,
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
        voucher_code: selectedVoucher?.code,
      };
      setCreatedBooking(booking);

      // Handle payment processing
      if (paymentType === "pay_now" && paymentMethod) {
        const paymentSuccess = await handlePaymentProcessing(
          bookingId,
          paymentMethod
        );
        if (!paymentSuccess) {
          // Payment failed, don't proceed to success page
          return;
        }
        // For immediate payments, update booking payment status to paid
        try {
          await updateBookingPaymentStatus({
            id: bookingId,
            payment_status: "paid",
          });
          console.log("Booking payment status updated to paid");
        } catch (statusError) {
          console.error("Error updating booking payment status:", statusError);
          // Don't fail the booking creation if status update fails
        }
      } else {
        setStep(6); // Success step for pay later
      }

      // Redeem voucher if one was selected
      if (selectedVoucher?.code) {
        try {
          console.log(
            "Redeeming voucher:",
            selectedVoucher.code,
            "User:",
            user._id
          );
          const redemptionResult = await redeemVoucher({
            code: selectedVoucher.code,
            user_id: user._id,
          });

          console.log("✅ Voucher redeemed successfully:", {
            code: selectedVoucher.code,
            voucherId: selectedVoucher._id,
            status: "redeemed",
            result: redemptionResult,
          });

          // Show success message for voucher redemption
          setTimeout(() => {
            console.log(
              `✅ Voucher ${selectedVoucher.code} has been applied and marked as redeemed!`
            );
          }, 1500);
        } catch (voucherError) {
          console.error("⚠️ Error during voucher redemption:", {
            code: selectedVoucher.code,
            error: voucherError?.message || voucherError,
            userId: user._id,
          });
          // Log the error but don't break the booking flow
          // The booking is still successful, but notify user about voucher issue
          alert(
            `Booking confirmed! Note: Voucher status update encountered an issue. Please refresh to see the updated status.`
          );
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
        setStep(6);
        return true;
      }

      console.log("Processing payment:", {
        amount: finalAmount,
        paymentMethod,
        bookingId,
      });

      // Call Convex payment action
      const paymentResult = await createPaymentRequest({
        amount: finalAmount,
        paymentMethod: paymentMethod,
        bookingId: bookingId,
        customerEmail: user.email,
        customerName: user.full_name || user.name,
      });

      console.log("Payment created successfully:", paymentResult);

      // Redirect to payment page if there's a redirect URL
      if (paymentResult.redirect_url) {
        window.location.href = paymentResult.redirect_url;
        return true;
      } else {
        // If no redirect URL, show success
        setStep(6);
        return true;
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      alert(
        `Payment failed: ${error.message}. Please try again or choose pay later.`
      );
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
    setStep(4);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setStep(5);
  };

  const handleStaffSelect = (barber) => {
    // console.log("Selected Barber:", barber);
    console.log("Selected Barber ID:", barber._id);
    sessionStorage.setItem("barberId", barber._id);

    setSelectedStaff(barber); // keep full object

    // Check if barber has custom booking enabled
    if (barber.custom_booking_enabled) {
      // Reset custom form state
      setCustomFormResponses({});
      setCustomFormCustomerName(user?.full_name || user?.nickname || "");
      setCustomFormCustomerEmail(user?.email || "");
      setCustomFormCustomerPhone(user?.mobile_number || user?.phone || "");
      setCustomBookingSuccess(null);
      setShowCustomBookingForm(true);
    } else {
      setStep(3);
    }
  };

  // Handle custom booking form submission
  const handleCustomBookingSubmit = async (e) => {
    e.preventDefault();

    if (!customBookingForm || !selectedStaff) return;

    // Validate required fields
    if (!customFormCustomerName.trim()) {
      setError("Please enter your name");
      return;
    }

    // Validate required form fields
    for (const field of customBookingForm.fields) {
      if (field.required) {
        const response = customFormResponses[field.id];
        if (
          response === undefined ||
          response === null ||
          response === "" ||
          (Array.isArray(response) && response.length === 0)
        ) {
          setError(`Please fill in: ${field.label}`);
          return;
        }
      }
    }

    setCustomBookingSubmitting(true);
    setError(null);

    try {
      const result = await submitCustomBookingForm({
        form_id: customBookingForm._id,
        customer_name: customFormCustomerName.trim(),
        customer_email: customFormCustomerEmail.trim() || undefined,
        customer_phone: customFormCustomerPhone.trim() || undefined,
        responses: customFormResponses,
      });

      setCustomBookingSuccess(result);
    } catch (err) {
      setError(err.message || "Failed to submit booking request");
    } finally {
      setCustomBookingSubmitting(false);
    }
  };

  // Close custom booking form
  const handleCloseCustomBookingForm = () => {
    setShowCustomBookingForm(false);
    setSelectedStaff(null);
    setCustomFormResponses({});
    setCustomBookingSuccess(null);
    setError(null);
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
        return "Choose Barber";
      case 3:
        return "Choose Service";
      case 4:
        return "Select Date & Time";
      case 5:
        return "Confirm Booking";
      case 6:
        return "Booking Confirmed";
      default:
        return "Book Service";
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-4 px-4 py-2">
      <div className="flex items-center space-x-3">
        {[1, 2, 3, 4, 5].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step >= stepNumber ? "text-white shadow-md" : "text-gray-500"
              }`}
              style={{
                backgroundColor: step >= stepNumber ? (branding?.primary_color || "#F68B24") : (branding?.muted_color || "#E0E0E0"),
              }}
            >
              {step > stepNumber ? "✓" : stepNumber}
            </div>
            {stepNumber < 5 && (
              <div
                className={`w-8 h-0.5 mx-1 rounded transition-all duration-300`}
                style={{
                  backgroundColor: step > stepNumber ? (branding?.primary_color || "#F68B24") : (branding?.muted_color || "#E0E0E0"),
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      );
    }

    if (branches.length === 0) {
      return (
        <div className="text-center py-12 px-4">
          <p className="text-sm text-gray-400">No branches available</p>
        </div>
      );
    }

    // Filter branches based on search
    const filteredBranches = branches.filter((branch) => {
      const searchLower = branchSearchTerm.toLowerCase();
      return (
        branch.name.toLowerCase().includes(searchLower) ||
        branch.address.toLowerCase().includes(searchLower) ||
        branch.branch_code.toLowerCase().includes(searchLower) ||
        branch.phone.includes(searchLower)
      );
    });

    return (
      <div className="px-4 pb-6 max-w-2xl mx-auto">
        {/* Header - Clean and Professional */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            Select Location
          </h2>
          <p className="text-sm text-gray-400">
            Choose your preferred branch to continue
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, address, or code..."
              value={branchSearchTerm}
              onChange={(e) => setBranchSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
            />
            {branchSearchTerm && (
              <button
                onClick={() => setBranchSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Branch List - Compact Cards */}
        {filteredBranches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">
              No branches found matching "{branchSearchTerm}"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBranches.map((branch) => (
              <button
                key={branch._id}
                onClick={() => handleBranchSelect(branch)}
                className="w-full bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[var(--color-primary)] rounded-lg p-4 text-left transition-all duration-200 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Location Pin Icon */}
                    <MapPin className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      {/* Branch Name */}
                      <h3 className="text-base font-semibold text-white mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                        {branch.name}
                      </h3>

                      {/* Branch Details - Compact */}
                      <div className="space-y-0.5 text-xs text-gray-400">
                        <p className="truncate">{branch.address}</p>
                        <div className="flex items-center gap-3">
                          {/* <span>{branch.phone}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-500">
                            #{branch.branch_code}
                          </span> */}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="ml-4 text-gray-500 group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderServiceSelection = () => {
    if (loading || !services) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12 px-4">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={loadBookingData}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      );
    }

    // Map service categories to standard categories (same as POS)
    const mapServiceCategory = (category) => {
      if (!category) return 'Other Services';
      const catLower = category.toLowerCase();
      if (catLower.includes('haircut') || catLower.includes('hair')) {
        return 'Haircut';
      }
      if (catLower.includes('package')) {
        return 'Package';
      }
      return 'Other Services';
    };

    // Group services by category
    const servicesToDisplay = selectedStaff 
      ? services.filter(service => 
          selectedStaff.services && 
          selectedStaff.services.includes(service._id)
        )
      : services;

    const categories = servicesToDisplay.reduce((acc, service) => {
      const category = mapServiceCategory(service.category);
      if (!acc[category]) acc[category] = [];
      acc[category].push(service);
      return acc;
    }, {});

    return (
      <div className="px-4 pb-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Choose Service</h2>
          <p className="text-sm text-gray-400">
            Select the service you'd like to book {selectedStaff ? `with ${selectedStaff.full_name || selectedStaff.name}` : `at ${selectedBranch?.name}`}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search services..."
            value={serviceSearchTerm}
            onChange={(e) => setServiceSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
          />
          {serviceSearchTerm && (
            <button
              onClick={() => setServiceSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Dropdowns */}
        <div className="space-y-3">
          {['Haircut', 'Package', 'Other Services'].map((categoryName) => {
              const categoryServices = categories[categoryName] || [];
              
              // Filter services within this category based on search term
              const filteredServices = categoryServices.filter((service) => {
                const searchLower = serviceSearchTerm.toLowerCase();
                return (
                  service.name.toLowerCase().includes(searchLower) ||
                  (service.description &&
                    service.description.toLowerCase().includes(searchLower)) ||
                  service.price.toString().includes(searchLower)
                );
              });

              if (filteredServices.length === 0) return null;

              const isOpen = openCategory === categoryName;

              return (
                <div
                  key={categoryName}
                  className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]"
                >
                  <button
                    onClick={() =>
                      setOpenCategory(isOpen ? null : categoryName)
                    }
                    className="w-full text-left px-4 py-3 flex justify-between items-center text-white font-semibold"
                  >
                    <span>{categoryName}</span>
                    <span>{isOpen ? "−" : "+"}</span>
                  </button>

                  {isOpen && (
                    <div className="space-y-2 px-4 pb-4">
                      {filteredServices.map((service) => {
                        const availableBarbers = barbers
                          ? barbers.filter(
                              (barber) =>
                                barber.is_active &&
                                barber.services &&
                                Array.isArray(barber.services) &&
                                barber.services.some(
                                  (serviceId) => serviceId === service._id
                                )
                            ).length
                          : 0;

                        return (
                          <button
                            key={service._id}
                            onClick={() => handleServiceSelect(service)}
                            className="w-full bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[var(--color-primary)] rounded-lg p-4 text-left transition-all duration-200 flex justify-between items-start"
                          >
                            <div>
                              <h3 className="text-base font-semibold text-white">
                                {service.name}
                              </h3>
                              {service.description && (
                                <p className="text-xs text-gray-400 line-clamp-2">
                                  {service.description}
                                </p>
                              )}
                              <span className="text-[var(--color-primary)] font-bold mt-1 block">
                                {service.hide_price ? (
                                  'Price may vary'
                                ) : (
                                  `₱${parseFloat(service.price || 0).toLocaleString()}`
                                )}
                              </span>
                              {availableBarbers === 0 && (
                                <p className="text-[10px] text-amber-500 mt-1">
                                  Limited availability
                                </p>
                              )}
                            </div>
                            <div className="self-center text-gray-500">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>
    );
  };

  const renderTimeSelection = () => (
    <div className="px-4 pb-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2 text-center">
        <h2 className="text-2xl font-bold text-white mb-1">
          Select Date & Time
        </h2>
        <p className="text-sm text-gray-400">
          Choose a schedule for your appointment
        </p>
      </div>

      {/* Selected Service Summary */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl">{selectedService?.image}</div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {selectedService?.name}
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--color-primary)] font-semibold">
                {selectedService?.hide_price ? 'Price may vary' : `₱${selectedService?.price.toLocaleString()}`}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{selectedService?.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Selection */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-3">
          Select Date
        </h3>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelectedTime(null);
          }}
          min={new Date().toISOString().split("T")[0]}
          max={
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]
          }
          className="w-full px-3 py-2.5 rounded-lg bg-[#121212] border border-[#2A2A2A] text-gray-200 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-white">
              Select Time
            </h3>
            <span className="text-xs text-gray-400">
              {new Date(selectedDate).toLocaleDateString("en-PH", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {loadingTimeSlots ? (
            <div className="flex justify-center items-center py-6 space-x-2">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full"></div>
              <span className="text-gray-400 text-sm">Loading times...</span>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-6 h-6 text-[var(--color-primary)] mx-auto mb-2" />
              <p className="text-sm text-[var(--color-primary)] font-medium">No available times</p>
              <p className="text-xs text-gray-400 mt-1">Please select a different date</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`p-2 text-sm rounded-lg border transition-all duration-200 ${
                      slot.available
                        ? selectedTime === slot.time
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "bg-[#1F1F1F] text-gray-200 border-[#2A2A2A] hover:border-[var(--color-primary)]/50"
                        : "bg-[#111111] text-gray-500 border-[#1F1F1F] cursor-not-allowed"
                    }`}
                  >
                    {slot.displayTime}
                  </button>
                ))}
              </div>

              <div className="flex justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-[#1F1F1F] border border-[#2A2A2A] rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-[var(--color-primary)] rounded"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-[#111111] rounded"></div>
                  <span>Booked</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Continue Button */}
      {selectedDate && selectedTime && (
        <button
          onClick={() => setStep(5)}
          className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg hover:bg-[var(--color-accent)] transition-all duration-200"
        >
          Continue to Confirmation
        </button>
      )}
    </div>
  );

  const renderStaffSelection = () => (
    <div className="pb-6 px-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Choose Your Barber
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Select your preferred professional
        </p>
      </div>

      {/* Barber Grid - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {getAvailableBarbers().map((barber) => {
          const isAvailable = barber.is_accepting_bookings !== false; // Default true if undefined
          
          return (
          <button
            key={barber._id}
            onClick={() => isAvailable && handleStaffSelect(barber)}
            disabled={!isAvailable}
            className={`group rounded-xl p-3 transition-all duration-300 border hover:shadow-lg flex flex-col items-center text-center relative overflow-hidden ${
              selectedStaff?._id === barber._id
                ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]"
                : !isAvailable 
                  ? "bg-[#1A1A1A] border-[#2A2A2A] opacity-60 cursor-not-allowed"
                  : "bg-[#1A1A1A] border-[#2A2A2A] hover:border-[var(--color-primary)]/50"
            }`}
          >
            {/* Avatar Container */}
            <div className="relative mb-2">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-[#2A2A2A] ${isAvailable ? 'group-hover:ring-[var(--color-primary)]/50' : 'grayscale'} transition-all duration-300`}>
                <BarberAvatar barber={barber} className="w-full h-full" />
              </div>
              {selectedStaff?._id === barber._id && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#1A1A1A] shadow-lg">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              )}
              {!isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <div className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                    Busy
                  </div>
                </div>
              )}
            </div>

            {/* Barber Name */}
            <h3 className="text-sm font-bold text-white mb-0.5 line-clamp-1 w-full group-hover:text-[var(--color-primary)] transition-colors duration-200">
              {barber.full_name || barber.name}
            </h3>

            {/* Rating */}
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs font-medium text-gray-300">5.0</span>
            </div>

            {/* Experience or Status */}
            <p className={`text-[10px] line-clamp-1 ${!isAvailable ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
              {!isAvailable ? 'Currently Unavailable' : (barber.experience || 'Professional')}
            </p>
          </button>
        )})}
      </div>

      {/* Empty State */}
      {(!barbers || getAvailableBarbers().length === 0) && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
          <p className="text-gray-400">No barbers available at this branch</p>
        </div>
      )}
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
                style={{ color: branding?.primary_color || "#F68B24" }}
              >
                {selectedService?.hide_price ? 'Price may vary' : `₱${selectedService?.price.toLocaleString()}`}
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
                <Building className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
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
                <Calendar className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
                <span
                  className="font-semibold text-sm"
                  style={{ color: "#36454F" }}
                >
                  Date & Time
                </span>
              </div>
              <span className="font-bold text-sm" style={{ color: "#36454F" }}>
                Today, {formatTime(selectedTime)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
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
              <Gift className="w-4 h-4 mr-2" style={{ color: branding?.primary_color || "#F68B24" }} />
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
                            ? (branding?.primary_color || "#F68B24")
                            : "#E0E0E0",
                        backgroundColor:
                          selectedVoucher?._id === voucher._id
                            ? hexToRgba(branding?.primary_color || "#F68B24", 0.1)
                            : "white",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Gift className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
                          <div>
                            <p
                              className="text-xs font-bold"
                              style={{ color: "#36454F" }}
                            >
                              {voucher.code}
                            </p>
                            <p className="text-xs" style={{ color: branding?.primary_color || "#F68B24" }}>
                              ₱{parseFloat(voucher.value || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {selectedVoucher?._id === voucher._id && (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
                          >
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedVoucher && (
                  <div className="text-xs text-center p-2 rounded flex items-center justify-center gap-2" style={{ backgroundColor: "#F0F8FF", color: "#36454F" }}>
                    <Banknote className="w-4 h-4" />
                    <span>You'll save ₱{parseFloat(selectedVoucher.value || 0).toFixed(2)} with this voucher</span>
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
                  className={`py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 ${
                    bookingLoading ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Now</span>
                </button>
                <button
                  onClick={() => handleConfirmBooking("pay_later")}
                  disabled={bookingLoading}
                  className={`py-3 px-4 border-2 hover:bg-[var(--color-primary)] hover:text-white font-bold rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 ${
                    bookingLoading ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                  style={{ borderColor: branding?.primary_color || "#F68B24", color: branding?.primary_color || "#F68B24" }}
                >
                  {bookingLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      <span>Booking...</span>
                    </div>
                  ) : (
                    <>
                      <Building className="w-4 h-4" />
                      <span>Pay Later</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
                  <h5 className="text-sm font-bold mb-2 text-white">
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
                        <CreditCard className="w-4 h-4 text-white" />
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
                    className="flex-1 py-2 px-3 border border-[#2A2A2A] text-gray-400 hover:bg-[#1A1A1A] hover:text-white font-bold rounded-lg transition-all duration-200 text-sm"
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
                    className="w-full py-2 px-3 border border-[#2A2A2A] text-gray-400 hover:bg-[#1A1A1A] hover:text-white font-bold rounded-lg transition-all duration-200 text-sm"
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
            style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
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
        <div className="bg-[#1A1A1A] rounded-2xl p-8 border-2 border-[#2A2A2A] shadow-lg text-center">
          <h3 className="text-lg font-black mb-4 text-white">
            Your Booking QR Code
          </h3>

          {/* Real QR Code */}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-[#0A0A0A] rounded-2xl border-2 border-[#2A2A2A] shadow-sm">
              <div className="relative w-48 h-48">
                {(qrCodeLoading || !getBookingById?.booking_code) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center space-y-3">
                      <div className="animate-spin w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-gray-700">
                        {!getBookingById?.booking_code
                          ? "Loading booking details..."
                          : "Generating QR Code..."}
                      </p>
                    </div>
                  </div>
                )}
                <canvas
                  ref={qrRef}
                  className="rounded-xl w-full h-full"
                  style={{
                    display:
                      qrCodeLoading || !getBookingById?.booking_code
                        ? "none"
                        : "block",
                  }}
                ></canvas>
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="text-lg font-black text-white">
              Booking Code:{" "}
              {getBookingById?.booking_code ? (
                getBookingById.booking_code
              ) : (
                <span className="inline-flex items-center space-x-2">
                  <span className="text-gray-400">Generating...</span>
                  <div className="animate-pulse w-2 h-2 bg-orange-500 rounded-full"></div>
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              Show this QR code when you arrive
            </p>
          </div>
        </div>

        {/* Booking Summary */}
        <div
          className="rounded-2xl p-6 border"
          style={{
            backgroundColor: hexToRgba(branding?.primary_color || "#F68B24", 0.05),
            borderColor: hexToRgba(branding?.primary_color || "#F68B24", 0.2),
          }}
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Branch:</span>
              <span className="font-bold text-white">
                {selectedBranch?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Service:</span>
              <span className="font-bold text-white">
                {selectedService?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Date & Time:</span>
              <span className="font-bold text-white">
                {createdBooking?.date
                  ? new Date(createdBooking.date).toLocaleDateString()
                  : "Today"}
                , {formatTime(createdBooking?.time || selectedTime)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-300">Barber:</span>
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
                <span className="font-medium text-gray-300">Subtotal:</span>
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
              className="flex justify-between border-t pt-3"
              style={{ borderColor: hexToRgba(branding?.primary_color || "#F68B24", 0.3) }}
            >
              <span className="font-bold text-white">Total:</span>
              <span 
                className="font-black text-lg"
                style={{ color: branding?.primary_color || "#F68B24" }}
              >
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
            style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = branding?.accent_color || "#E67E22")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = branding?.primary_color || "#F68B24")}
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
            style={{ borderColor: branding?.primary_color || "#F68B24", color: branding?.primary_color || "#F68B24" }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = branding?.primary_color || "#F68B24";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = branding?.primary_color || "#F68B24";
            }}
          >
            View My Bookings
          </button>
        </div>
      </div>
    );
  };

  // Render field input based on type
  const renderCustomFormField = (field) => {
    const value = customFormResponses[field.id] || (field.type === 'checkbox' || field.type === 'multiselect' ? [] : '');

    const baseInputClass = "w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] transition-all";

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type}
            value={value}
            onChange={(e) => setCustomFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className={baseInputClass}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setCustomFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            rows={3}
            className={`${baseInputClass} resize-none`}
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setCustomFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
            className={baseInputClass}
          >
            <option value="">Select an option...</option>
            {(field.options || []).map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'multiselect':
      case 'checkbox':
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, idx) => {
              const isSelected = Array.isArray(value) && value.includes(option);
              return (
                <label key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      setCustomFormResponses(prev => {
                        const current = Array.isArray(prev[field.id]) ? prev[field.id] : [];
                        if (e.target.checked) {
                          return { ...prev, [field.id]: [...current, option] };
                        } else {
                          return { ...prev, [field.id]: current.filter(v => v !== option) };
                        }
                      });
                    }}
                    className="w-5 h-5 rounded border-gray-600 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-white">{option}</span>
                </label>
              );
            })}
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, idx) => (
              <label key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="radio"
                  name={field.id}
                  checked={value === option}
                  onChange={() => setCustomFormResponses(prev => ({ ...prev, [field.id]: option }))}
                  className="w-5 h-5 border-gray-600 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setCustomFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            className={baseInputClass}
          />
        );
      case 'date_range':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={value?.from || ''}
                onChange={(e) => setCustomFormResponses(prev => ({
                  ...prev,
                  [field.id]: { ...prev[field.id], from: e.target.value }
                }))}
                min={new Date().toISOString().split('T')[0]}
                className={baseInputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={value?.to || ''}
                onChange={(e) => setCustomFormResponses(prev => ({
                  ...prev,
                  [field.id]: { ...prev[field.id], to: e.target.value }
                }))}
                min={value?.from || new Date().toISOString().split('T')[0]}
                className={baseInputClass}
              />
            </div>
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setCustomFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );
    }
  };

  // Custom booking form modal content
  const renderCustomBookingFormModal = () => {
    if (!showCustomBookingForm || !selectedStaff) return null;

    // Show success state
    if (customBookingSuccess) {
      return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-md border border-[#2A2A2A] overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: hexToRgba(branding?.primary_color || "#F68B24", 0.2) }}>
                <CheckCircle className="w-10 h-10" style={{ color: branding?.primary_color || "#F68B24" }} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
              <p className="text-gray-400 mb-4">
                Your booking request has been sent to {selectedStaff.full_name || selectedStaff.name}.
                They will contact you soon to confirm your appointment.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Reference Code: <span className="font-mono text-[var(--color-primary)]">{customBookingSuccess.booking_code}</span>
              </p>
              <button
                onClick={handleCloseCustomBookingForm}
                className="w-full py-4 text-white font-bold rounded-xl transition-all"
                style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Loading state for form
    if (!customBookingForm) {
      return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-md p-8 text-center border border-[#2A2A2A]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading booking form...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-[#2A2A2A]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <BarberAvatar barber={selectedStaff} className="w-10 h-10" />
              <div>
                <h2 className="font-bold text-white">{customBookingForm.title}</h2>
                <p className="text-sm text-gray-400">with {selectedStaff.full_name || selectedStaff.name}</p>
              </div>
            </div>
            <button
              onClick={handleCloseCustomBookingForm}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleCustomBookingSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            {customBookingForm.description && (
              <p className="text-gray-400 text-sm mb-4">{customBookingForm.description}</p>
            )}

            {/* Customer Info */}
            <div className="space-y-4 pb-4 border-b border-[#2A2A2A]">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Your Information</h3>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customFormCustomerName}
                  onChange={(e) => setCustomFormCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Email Address</label>
                <input
                  type="email"
                  value={customFormCustomerEmail}
                  onChange={(e) => setCustomFormCustomerEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={customFormCustomerPhone}
                  onChange={(e) => setCustomFormCustomerPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Custom Fields */}
            {customBookingForm.fields && customBookingForm.fields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Booking Details</h3>
                {customBookingForm.fields.sort((a, b) => a.order - b.order).map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-white mb-2">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {field.helpText && (
                      <p className="text-xs text-gray-500 mb-2">{field.helpText}</p>
                    )}
                    {renderCustomFormField(field)}
                  </div>
                ))}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="p-4 border-t border-[#2A2A2A] space-y-3">
            <button
              type="submit"
              onClick={handleCustomBookingSubmit}
              disabled={customBookingSubmitting}
              className="w-full py-4 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
            >
              {customBookingSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Booking Request"
              )}
            </button>
            <button
              type="button"
              onClick={handleCloseCustomBookingForm}
              className="w-full py-3 text-gray-400 font-medium rounded-xl hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Custom Booking Form Modal */}
      {renderCustomBookingFormModal()}

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
              <p className="text-lg font-bold text-white">Book Service</p>
              <p className="text-xs text-[var(--color-primary)]">Step {step} of 4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="relative z-10">{renderStepIndicator()}</div>

      {/* Content */}
      <div className="relative z-10 pb-8">
        {step === 1 && renderBranchSelection()}
        {step === 2 && renderStaffSelection()}
        {step === 3 && renderServiceSelection()}
        {step === 4 && renderTimeSelection()}
        {step === 5 && renderConfirmation()}
        {step === 6 && renderBookingSuccess()}
      </div>
    </div>
  );
};

export default ServiceBooking;
