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
} from "lucide-react";
import QRCode from "qrcode";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../context/AuthContext";

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

const GuestServiceBooking = ({ onBack }) => {
  const [guestData, setGuestData] = useState({
    name: "",
    email: "",
    number: "",
  });
  const [isSignedIn, setIsSignedIn] = useState(false);
  const createUser = useMutation(api.services.auth.createUser);
  const createGuestUser = useMutation(api.services.auth.createGuestUser);
  const { user, isAuthenticated } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [step, setStep] = useState(1); // 1: branch, 2: services, 3: date & time & staff, 4: guest info, 5: confirmation, 6: success
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const qrRef = useRef(null);
  const [openCategory, setOpenCategory] = useState(null); // ✅ Top level hook

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

  // Generate QR code when we reach step 5 and have actual booking data
  useEffect(() => {
    if (step === 6 && createdBooking?._id && getBookingById?.booking_code) {
      console.log(
        "Step 5 reached with booking ID:",
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
    // Use branch-configured booking hours, default to 10am-8pm
    const startHour = selectedBranch.booking_start_hour ?? 10; // Default 10 AM
    const endHour = selectedBranch.booking_end_hour ?? 20; // Default 8 PM (20:00)
    const currentDate = new Date();
    const selectedDateObj = new Date(selectedDate);
    const isToday =
      selectedDateObj.toDateString() === currentDate.toDateString();
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();

    // Get booked times for this barber on this date
    const bookedTimes = existingBookings
      ? existingBookings
          .filter((booking) => booking.status !== "cancelled")
          .map((booking) => booking.time.substring(0, 5)) // Remove seconds part
      : [];

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const displayTime =
          hour === 12
            ? `12:${minute.toString().padStart(2, "0")} PM`
            : hour > 12
              ? `${hour - 12}:${minute.toString().padStart(2, "0")} PM`
              : `${hour}:${minute.toString().padStart(2, "0")} AM`;

        // Check availability
        let available = true;
        let reason = null;

        // Check if time slot is already booked
        if (bookedTimes.includes(timeString)) {
          available = false;
          reason = "booked";
        }

        // Check if time slot is in the past (for today only)
        if (
          isToday &&
          (hour < currentHour ||
            (hour === currentHour && minute <= currentMinute))
        ) {
          available = false;
          reason = "past";
        }

        slots.push({
          time: timeString,
          displayTime: displayTime,
          available: available,
          reason: reason,
        });
      }
    }

    return slots;
  }, [selectedDate, selectedStaff, selectedBranch, existingBookings]);

  // Get available barbers for selected service
  const getAvailableBarbers = () => {
    if (!selectedService || !barbers) return barbers || [];

    // Filter barbers who provide the specific service
    const serviceBarbers = barbers.filter(
      (barber) =>
        barber.services &&
        Array.isArray(barber.services) &&
        barber.services.some((serviceId) => serviceId === selectedService._id)
    );

    // Only return barbers that specifically offer this service
    console.log(
      `Found ${serviceBarbers.length} barbers for service ${selectedService.name}`
    );
    return serviceBarbers;
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
        customer: sessionStorage.getItem("user_id"),
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
        setStep(5);
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
        setStep(5);
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
    sessionStorage.setItem("barberId", barber._id);

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
        return "Your Information";
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
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step >= stepNumber ? "text-white shadow-md" : "text-gray-500"
              }`}
              style={{
                backgroundColor: step >= stepNumber ? "#F68B24" : "#E0E0E0",
              }}
            >
              {step > stepNumber ? "✓" : stepNumber}
            </div>
            {stepNumber < 5 && (
              <div
                className={`w-4 h-0.5 mx-1 rounded transition-all duration-300`}
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8C42]"></div>
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
              className="w-full pl-10 pr-10 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-[#FF8C42] transition-colors text-sm"
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
                className="w-full bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[#FF8C42] rounded-lg p-4 text-left transition-all duration-200 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Location Pin Icon */}
                    <MapPin className="w-5 h-5 text-[#FF8C42] flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      {/* Branch Name */}
                      <h3 className="text-base font-semibold text-white mb-1 group-hover:text-[#FF8C42] transition-colors">
                        {branch.name}
                      </h3>

                      {/* Branch Details - Compact */}
                      <div className="space-y-0.5 text-xs text-gray-400">
                        <p className="truncate">{branch.address}</p>
                        <div className="flex items-center gap-3">
                          <span>{branch.phone}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-500">
                            #{branch.branch_code}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="ml-4 text-gray-500 group-hover:text-[#FF8C42] transition-colors flex-shrink-0">
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8C42]"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12 px-4">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={loadBookingData}
            className="px-6 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF7A2B] transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      );
    }

    // Group services by category
    // Define the preferred category order
    const categoryOrder = ["Haircut", "Package", "Other Services"];

    // Group services by category
    const categoriesMap = services.reduce((acc, service) => {
      const category = service.category || "Other Services"; // default to "Other Services"
      if (!acc[category]) acc[category] = [];
      acc[category].push(service);
      return acc;
    }, {});

    // Create a sorted array of category entries based on the preferred order
    const categories = categoryOrder
      .filter((cat) => categoriesMap[cat]) // only keep categories that exist
      .map((cat) => [cat, categoriesMap[cat]]);

    // If there are other uncategorized categories, append them at the end
    Object.entries(categoriesMap).forEach(([cat, services]) => {
      if (!categoryOrder.includes(cat)) {
        categories.push([cat, services]);
      }
    });

    return (
      <div className="px-4 pb-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Choose Service</h2>
          <p className="text-sm text-gray-400">
            Select the service you'd like to book at {selectedBranch?.name}
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
            className="w-full pl-10 pr-10 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-[#FF8C42] transition-colors text-sm"
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
          {Object.entries(categories).map(
            ([categoryName, categoryServices]) => {
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
                            className="w-full bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[#FF8C42] rounded-lg p-4 text-left transition-all duration-200 flex justify-between items-start"
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
                              <span className="text-[#FF8C42] font-bold mt-1 block">
                                ₱
                                {parseFloat(
                                  service.price || 0
                                ).toLocaleString()}
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

  const renderTimeAndStaffSelection = () => (
    <div className="px-4 pb-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2 text-center">
        <h2 className="text-2xl font-bold text-white mb-1">
          Select Barber & Time
        </h2>
        <p className="text-sm text-gray-400">
          Choose your preferred barber, then pick a schedule
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
              <span className="text-[#FF8C42] font-semibold">
                ₱{selectedService?.price.toLocaleString()}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{selectedService?.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Barber Selection */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-3">
          Step 1: Choose Your Barber
        </h3>
        {getAvailableBarbers().length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {getAvailableBarbers().map((barber) => (
              <button
                key={barber._id}
                onClick={() => {
                  handleStaffSelect(barber);
                  setSelectedTime(null);
                }}
                className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 ${
                  selectedStaff?._id === barber._id
                    ? "border-[#FF8C42] bg-[#FF8C42]/10"
                    : "border-[#2A2A2A] hover:border-[#FF8C42]/50"
                }`}
              >
                <BarberAvatar barber={barber} className="w-10 h-10" />
                <div className="flex-1 text-left">
                  <h4 className="text-sm font-semibold text-white">
                    {barber.full_name || barber.name || "Professional Barber"}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span className="text-yellow-400">★★★★★</span>
                    <span>5.0 • Professional</span>
                  </div>
                </div>
                {selectedStaff?._id === barber._id && (
                  <CheckCircle className="w-5 h-5 text-[#FF8C42]" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-sm text-[#FF8C42] font-medium">
              No barbers available for "{selectedService?.name}"
            </p>
            <button
              onClick={() => setStep(1)}
              className="mt-3 px-4 py-2 bg-[#FF8C42] text-white text-xs font-medium rounded-lg hover:bg-[#FF7A2B] transition"
            >
              Choose Different Service
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Date Selection */}
      {selectedStaff && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-3">
            Step 2: Select Date
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
            className="w-full px-3 py-2.5 rounded-lg bg-[#121212] border border-[#2A2A2A] text-gray-200 text-sm focus:outline-none focus:border-[#FF8C42] transition-colors"
          />
        </div>
      )}

      {/* Step 3: Time Slots */}
      {selectedStaff && selectedDate && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-white">
              Step 3: Available Times
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
              <div className="animate-spin w-5 h-5 border-2 border-[#FF8C42] border-t-transparent rounded-full"></div>
              <span className="text-gray-400 text-sm">Loading times...</span>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-sm text-[#FF8C42] font-medium">
                No available times
              </p>
              <p className="text-xs text-gray-400 mt-1">
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
                    className={`p-2 text-sm rounded-lg border transition-all duration-200 ${
                      slot.available
                        ? selectedTime === slot.time
                          ? "bg-[#FF8C42] text-white border-[#FF8C42]"
                          : "bg-[#1F1F1F] text-gray-200 border-[#2A2A2A] hover:border-[#FF8C42]/50"
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
                  <div className="w-3 h-3 bg-[#FF8C42] rounded"></div>
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
      {selectedStaff && selectedDate && selectedTime && (
        <button
          onClick={() => setStep(4)}
          className="w-full py-3 bg-[#FF8C42] text-white font-bold rounded-lg hover:bg-[#FF7A2B] transition-all duration-200"
        >
          Continue to Confirmation
        </button>
      )}

      {/* Progress Indicator */}
      {selectedStaff && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#FF8C42]/10">
            <span className="text-xs font-semibold text-[#FF8C42]">
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

  // Form validation state for guest sign-in
  const [formErrors, setFormErrors] = useState({});

  // Error dialog state
  const [errorDialog, setErrorDialog] = useState({
    isOpen: false,
    title: "Error",
    message: "",
  });

  // Success notification state
  const [successNotification, setSuccessNotification] = useState({
    isOpen: false,
    title: "Success",
    message: "",
  });

  const showErrorDialog = (title, message) => {
    setErrorDialog({
      isOpen: true,
      title: title,
      message: message,
    });
  };

  const closeErrorDialog = () => {
    setErrorDialog({
      isOpen: false,
      title: "Error",
      message: "",
    });
  };

  const showSuccessNotification = (title, message) => {
    setSuccessNotification({
      isOpen: true,
      title: title,
      message: message,
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setSuccessNotification({
        isOpen: false,
        title: "Success",
        message: "",
      });
    }, 3000);
  };

  const closeSuccessNotification = () => {
    setSuccessNotification({
      isOpen: false,
      title: "Success",
      message: "",
    });
  };

  const validateGuestForm = () => {
    const errors = {};

    if (!guestData.name.trim()) {
      errors.name = "Full name is required";
    } else if (guestData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!guestData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(guestData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!guestData.number.trim()) {
      errors.number = "Phone number is required";
    } else if (!/^\+?[0-9\s\-\(\)]{7,}$/.test(guestData.number)) {
      errors.number = "Please enter a valid phone number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGuestSignInSubmit = async (e) => {
    e.preventDefault();

    if (!validateGuestForm()) {
      return;
    }

    // Show loading state
    setLoading(true);
    setFormErrors({});

    try {
      // Generate a unique username for guest users
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).slice(2, 6);
      const guestUsername = `guest_${guestData.name.toLowerCase().replace(/\s+/g, "_")}_${timestamp}_${randomSuffix}`;
      const generatedPassword = Math.random().toString(36).slice(-8);

      console.log("Creating guest user with data:", {
        username: guestUsername,
        email: guestData.email.trim(),
        mobile_number: guestData.number?.trim() || undefined,
        branch_id: selectedBranch?._id,
      });

      const newUser = await createGuestUser({
        username: guestUsername,
        email: guestData.email.trim(),
        password: generatedPassword,
        mobile_number: guestData.number?.trim() || undefined,
        branch_id: selectedBranch?._id,
        guest_name: guestData.name.trim(), // Pass original guest name
      });

      sessionStorage.setItem("user_id", newUser._id);

      // Handle existing vs new guest user
      if (newUser.isExistingUser) {
        console.log(
          "✅ Existing customer found for guest booking:",
          newUser._id
        );
        sessionStorage.setItem("guest_type", "existing_customer");
        // Show success message for existing user
        showSuccessNotification(
          "Welcome Back!",
          "We found your existing account. You can continue with your booking."
        );
      } else {
        sessionStorage.setItem("guest_username", guestUsername);
        sessionStorage.setItem("guest_temp_password", generatedPassword);
        sessionStorage.setItem("guest_type", "new_guest");
        console.log("✅ New guest account created successfully:", newUser._id);
        showSuccessNotification(
          "Account Created!",
          "Your guest account has been created successfully."
        );
      }

      setStep(5);
      setIsSignedIn(true);
    } catch (error) {
      console.error("❌ Guest sign-in failed:", error);

      // Handle specific error cases
      let title = "Sign In Failed";
      let errorMessage = "Failed to create guest account. Please try again.";

      if (
        error.message?.includes("email already exists") ||
        error.message?.includes("AUTH_EMAIL_EXISTS")
      ) {
        if (
          error.message?.includes("staff") ||
          error.message?.includes("admin")
        ) {
          title = "Account Type Restricted";
          errorMessage =
            "This email address is registered as a staff or admin account. Please use a different email for guest booking.";
        } else {
          title = "Booking Issue";
          errorMessage =
            "There was an issue with your booking. Please try again or contact support.";
        }
        setFormErrors({ email: "Unable to use this email" });
      } else if (
        error.message?.includes("username already exists") ||
        error.message?.includes("AUTH_USERNAME_EXISTS")
      ) {
        title = "System Issue";
        errorMessage =
          "There was a temporary issue creating your booking. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      showErrorDialog(title, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderGuestSignIn = () => {
    return (
      <div className="px-4 pb-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-light text-white mb-2">
            Your Information
          </h2>
          <p className="text-sm text-gray-400">
            We'll create a temporary guest account for your booking
          </p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-[#FF8C42]/10 border border-[#FF8C42]/20">
            <span className="text-xs text-[#FF8C42]">🔒 Secure & Private</span>
          </div>
        </div>

        {/* Guest Form Card */}
        <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-2xl shadow-xl border border-[#2A2A2A]/50 p-6">
          <form onSubmit={handleGuestSignInSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={guestData.name}
                required
                onChange={(e) => {
                  setGuestData({ ...guestData, name: e.target.value });
                  if (formErrors.name) {
                    setFormErrors({ ...formErrors, name: "" });
                  }
                }}
                className={`w-full h-12 px-4 bg-[#2A2A2A] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 transition-all duration-300 text-sm text-white placeholder-gray-500 ${
                  formErrors.name
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#3A3A3A] focus:border-[#FF8C42]"
                }`}
              />
              {formErrors.name && (
                <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={guestData.email}
                required
                onChange={(e) => {
                  setGuestData({ ...guestData, email: e.target.value });
                  if (formErrors.email) {
                    setFormErrors({ ...formErrors, email: "" });
                  }
                }}
                className={`w-full h-12 px-4 bg-[#2A2A2A] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 transition-all duration-300 text-sm text-white placeholder-gray-500 ${
                  formErrors.email
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#3A3A3A] focus:border-[#FF8C42]"
                }`}
              />
              {formErrors.email && (
                <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                We'll only use this for booking confirmation
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                placeholder="+63 912 345 6789"
                value={guestData.number}
                required
                onChange={(e) => {
                  setGuestData({ ...guestData, number: e.target.value });
                  if (formErrors.number) {
                    setFormErrors({ ...formErrors, number: "" });
                  }
                }}
                className={`w-full h-12 px-4 bg-[#2A2A2A] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 transition-all duration-300 text-sm text-white placeholder-gray-500 ${
                  formErrors.number
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#3A3A3A] focus:border-[#FF8C42]"
                }`}
              />
              {formErrors.number && (
                <p className="text-xs text-red-400 mt-1">{formErrors.number}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                For booking updates and reminders
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-light transition-all duration-300 text-sm ${
                  loading
                    ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg transform hover:scale-[1.02]"
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Creating your guest account...</span>
                  </div>
                ) : (
                  "Continue to Booking"
                )}
              </button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  By continuing, you agree to create a guest account for booking
                  purposes
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  You can always upgrade to a full account later
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

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

          {/* Payment Options - Pay Later Only */}
          <div className="border-t pt-3" style={{ borderColor: "#E0E0E0" }}>
            <h4 className="text-sm font-bold mb-3" style={{ color: "#36454F" }}>
              Complete Your Booking
            </h4>

            <button
              onClick={() => handleConfirmBooking("pay_later")}
              disabled={bookingLoading}
              className={`w-full py-3 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center space-x-2 font-bold ${
                bookingLoading
                  ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white hover:shadow-lg"
              }`}
              style={{
                backgroundColor: bookingLoading ? "#4B5563" : "#FF8C42",
                color: bookingLoading ? "#D1D5DB" : "#FFFFFF",
              }}
              onMouseEnter={(e) => {
                if (!bookingLoading) {
                  e.target.style.backgroundColor = "#FF7A2B";
                }
              }}
              onMouseLeave={(e) => {
                if (!bookingLoading) {
                  e.target.style.backgroundColor = "#FF8C42";
                }
              }}
            >
              {bookingLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  <span>Booking...</span>
                </div>
              ) : (
                <>
                  <span>🏪</span>
                  <span>Complete Booking - Pay at Shop</span>
                </>
              )}
            </button>

            <p
              className="text-xs text-center mt-3"
              style={{ color: "#8B8B8B" }}
            >
              Complete your booking now and pay when you arrive at the shop
            </p>
          </div>

          {/* Go Back Button */}
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
          <h2 className="text-3xl font-light mb-2 text-white">
            Booking Confirmed!
          </h2>
          <p className="font-light text-gray-300 text-sm">
            Your appointment has been successfully booked
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-[#2A2A2A] shadow-lg text-center">
          <h3 className="text-lg font-light mb-4 text-white">
            Your Booking QR Code
          </h3>

          {/* Real QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="relative w-44 h-44">
                {(qrCodeLoading || !getBookingById?.booking_code) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center space-y-3">
                      <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-xs text-gray-600">
                        {!getBookingById?.booking_code
                          ? "Loading booking details..."
                          : "Generating QR Code..."}
                      </p>
                    </div>
                  </div>
                )}
                <canvas
                  ref={qrRef}
                  className="rounded-lg w-full h-full"
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

          <div className="text-center space-y-3">
            <div className="text-lg font-light text-white">
              Booking Code:{" "}
              {getBookingById?.booking_code ? (
                <span className="font-bold text-[#FF8C42]">
                  {getBookingById.booking_code}
                </span>
              ) : (
                <span className="inline-flex items-center space-x-2">
                  <span className="text-gray-400">Generating...</span>
                  <div className="animate-pulse w-2 h-2 bg-orange-500 rounded-full"></div>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Screenshot this QR code and show it when you arrive
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
          <h4 className="text-sm font-light text-white mb-4 text-center">
            Booking Details
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-light text-gray-400 text-sm">Branch:</span>
              <span className="font-normal text-white text-sm">
                {selectedBranch?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-light text-gray-400 text-sm">Service:</span>
              <span className="font-normal text-white text-sm">
                {selectedService?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-light text-gray-400 text-sm">
                Date & Time:
              </span>
              <span className="font-normal text-white text-sm">
                {createdBooking?.date
                  ? new Date(createdBooking.date).toLocaleDateString()
                  : "Today"}
                , {createdBooking?.time || selectedTime}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-light text-gray-400 text-sm">Barber:</span>
              <div className="flex items-center space-x-2">
                {selectedStaff && (
                  <BarberAvatar barber={selectedStaff} className="w-6 h-6" />
                )}
                <span className="font-normal text-white text-sm">
                  {selectedStaff?.full_name ||
                    selectedStaff?.name ||
                    "Any Barber"}
                </span>
              </div>
            </div>
            {selectedVoucher && (
              <div className="flex justify-between">
                <span className="font-light text-gray-400 text-sm">
                  Subtotal:
                </span>
                <span className="font-normal line-through text-gray-500 text-sm">
                  ₱{selectedService?.price.toLocaleString()}
                </span>
              </div>
            )}
            {selectedVoucher && (
              <div className="flex justify-between">
                <span className="font-light text-gray-400 text-sm">
                  Voucher Discount:
                </span>
                <span className="font-normal text-green-400 text-sm">
                  -₱{parseFloat(selectedVoucher.value || 0).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 border-orange-500/30">
              <span className="font-light text-white">Total:</span>
              <span className="font-normal text-lg text-[#FF8C42]">
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
        <div className="space-y-3"></div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}

      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="relative flex items-center justify-center py-4">
            {/* Back Arrow - Left aligned */}
            <button
              onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
              className="absolute left-0 flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Title - Centered */}
            <div className="text-center">
              <p className="text-lg font-light text-white">Book Service</p>
              <p className="text-xs text-[#FF8C42]">Step {step} of 6</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>


      {/* Step Indicator */}
      <div className="relative z-10">{renderStepIndicator()}</div>

      {/* Content */}
      <div className="relative z-10 pb-8">
        {step === 1 && renderBranchSelection()}
        {step === 2 && renderServiceSelection()}
        {step === 3 && renderTimeAndStaffSelection()}
        {step === 4 && renderGuestSignIn()}
        {step === 5 && renderConfirmation()}
        {step === 6 && renderBookingSuccess()}
      </div>

      {/* Error Dialog Modal */}
      {errorDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeErrorDialog}
          ></div>

          {/* Modal */}
          <div className="relative bg-[#1A1A1A] rounded-2xl shadow-2xl border border-[#2A2A2A] max-w-md w-full mx-auto p-6">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white text-center mb-2">
              {errorDialog.title}
            </h3>

            {/* Message */}
            <p className="text-sm text-gray-300 text-center mb-6 leading-relaxed">
              {errorDialog.message}
            </p>

            {/* Action Button */}
            <button
              onClick={closeErrorDialog}
              className="w-full py-3 bg-[#FF8C42] hover:bg-[#FF7A2B] text-white font-medium rounded-xl transition-all duration-200"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotification.isOpen && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-green-500/90 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-green-400/30 p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  {successNotification.title}
                </h4>
                <p className="text-sm text-green-50">
                  {successNotification.message}
                </p>
              </div>
              <button
                onClick={closeSuccessNotification}
                className="flex-shrink-0 text-green-100 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestServiceBooking;
