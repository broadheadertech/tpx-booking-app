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
  Lock,
  Banknote,
  ChevronRight,
  Star,
  CreditCard,
} from "lucide-react";
import QRCode from "qrcode";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useBranding } from "../../context/BrandingContext";
import { formatTime } from "../../utils/dateUtils";
import { sendCustomBookingConfirmation, sendBarberBookingNotification } from "../../services/emailService";
import PaymentOptionsModal from "../../components/customer/PaymentOptionsModal";
import {
  // Phase 1: Quick Wins
  CalendarStrip, TimeSlotPills, StepProgressDots, SuccessConfetti,
  // Phase 2: Core Upgrades
  ServiceCard, ServiceCardGrid, ServiceCategoryTabs,
  BarberCard, BarberCardCompact, BarberCardGrid,
  SmartRecommendations, QuickBookBanner
} from "../../components/customer/booking";

// Helper function to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex) return hex;
  let r = 0,
    g = 0,
    b = 0;
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

// Helper function to get Philippine time (UTC+8)
const getPhilippineDate = () => {
  const now = new Date();
  // Convert to Philippine timezone
  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  return phTime;
};

// Helper function to get Philippine date string (YYYY-MM-DD)
const getPhilippineDateString = () => {
  const phDate = getPhilippineDate();
  const year = phDate.getFullYear();
  const month = String(phDate.getMonth() + 1).padStart(2, "0");
  const day = String(phDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const GuestServiceBooking = ({ onBack }) => {
  const { branding } = useBranding();
  const [guestData, setGuestData] = useState({
    name: "",
    email: "",
    number: "",
  });
  const [isSignedIn, setIsSignedIn] = useState(false);
  const createUser = useMutation(api.services.auth.createUser);
  const createGuestUser = useMutation(api.services.auth.createGuestUser);
  const { user, isAuthenticated } = useCurrentUser();
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use Philippine time for default date
    return getPhilippineDateString();
  });
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [step, setStep] = useState(1); // 1: branch, 2: services, 3: date & time & staff, 4: guest info, 5: confirmation, 6: success, 7: booking confirmed, 8: payment pending
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
  const [dateError, setDateError] = useState(null);

  // Custom booking form states
  const [customFormResponses, setCustomFormResponses] = useState({});
  const [customFormCustomerName, setCustomFormCustomerName] = useState("");
  const [customFormCustomerEmail, setCustomFormCustomerEmail] = useState("");
  const [customFormCustomerPhone, setCustomFormCustomerPhone] = useState("");
  const [customBookingSubmitting, setCustomBookingSubmitting] = useState(false);
  const [customBookingSuccess, setCustomBookingSuccess] = useState(null);
  const [isCustomBookingFlow, setIsCustomBookingFlow] = useState(false);

  // PayMongo payment flow states (Story 7.5)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Pending payment polling states
  const [pendingPaymentSessionId, setPendingPaymentSessionId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState(null);
  const [checkingPaymentManually, setCheckingPaymentManually] = useState(false);

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
  const updateBookingPaymentStatus = useMutation(
    api.services.bookings.updatePaymentStatus
  );

  // PayMongo payment link creation (Story 7.5)
  const createPaymentLink = useAction(api.services.paymongo.createPaymentLink);
  // Deferred booking flow - creates payment link without creating booking first
  const createPaymentLinkDeferred = useAction(api.services.paymongo.createPaymentLinkDeferred);
  // Manual payment status check (fallback when webhooks don't work)
  const checkPaymentStatus = useAction(api.services.paymongo.checkAndProcessPaymentStatus);

  // Query to get booking details after creation
  const getBookingById = useQuery(
    api.services.bookings.getBookingById,
    createdBooking?._id ? { id: createdBooking._id } : "skip"
  );

  // Query to poll payment status for deferred booking flow
  const paymentStatus = useQuery(
    api.services.paymongo.getPaymentStatusByLink,
    pendingPaymentSessionId ? { paymongo_link_id: pendingPaymentSessionId } : "skip"
  );

  // Query to get existing bookings for selected barber and date
  const existingBookings = useQuery(
    api.services.bookings.getBookingsByBarberAndDate,
    selectedStaff && selectedDate
      ? { barberId: selectedStaff._id, date: selectedDate }
      : "skip"
  );
  const redeemVoucher = useMutation(api.services.vouchers.redeemVoucher);

  // Initialize component and clear any stale guest data
  useEffect(() => {
    // Clear any existing guest session data to ensure clean start
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("guest_email");
    sessionStorage.removeItem("guest_name");
    sessionStorage.removeItem("guest_number");
    sessionStorage.removeItem("guest_type");

    // Reset guest data state
    setGuestData({
      name: "",
      email: "",
      number: "",
    });
    setIsSignedIn(false);
  }, []);

  // Handle payment status changes (polling for deferred booking)
  useEffect(() => {
    if (paymentStatus?.status === 'completed' && paymentStatus?.booking) {
      console.log('[GuestServiceBooking] Payment completed, booking created:', paymentStatus.booking);
      // Payment completed and booking created - show success
      setCreatedBooking({
        _id: paymentStatus.booking._id,
        booking_code: paymentStatus.booking.booking_code,
        service: selectedService,
        barber: selectedStaff,
        date: paymentStatus.booking.date,
        time: paymentStatus.booking.time,
        status: "booked",
        payment_status: paymentStatus.booking.payment_status,
      });
      // Clear pending payment state
      setPendingPaymentSessionId(null);
      localStorage.removeItem('pendingPaymongoSessionId');
      // Go to success step
      setStep(7);
    }
  }, [paymentStatus, selectedService, selectedStaff]);

  // Automatic payment status polling - checks every 5 seconds when waiting for payment
  useEffect(() => {
    if (!pendingPaymentSessionId) return;

    console.log('[GuestServiceBooking] Starting automatic payment status polling for:', pendingPaymentSessionId);

    const pollInterval = setInterval(async () => {
      try {
        console.log('[GuestServiceBooking] Auto-polling payment status...');
        const result = await checkPaymentStatus({ sessionId: pendingPaymentSessionId });
        console.log('[GuestServiceBooking] Auto-poll result:', result);

        if (result.status === 'paid' || result.status === 'already_paid') {
          console.log('[GuestServiceBooking] Payment confirmed via auto-poll!');
          // Payment confirmed! Create booking state and go to success
          setCreatedBooking({
            _id: result.bookingId,
            booking_code: result.bookingCode,
            service: selectedService,
            barber: selectedStaff,
            date: selectedDate,
            time: selectedTime,
            status: "booked",
            payment_status: paymentType === 'pay_now' ? 'paid' : 'partial',
          });
          setPendingPaymentSessionId(null);
          localStorage.removeItem('pendingPaymongoSessionId');
          setStep(7); // Success step
        } else if (result.status === 'expired') {
          console.log('[GuestServiceBooking] Payment session expired');
          setPendingPaymentSessionId(null);
          localStorage.removeItem('pendingPaymongoSessionId');
        }
        // If status is 'pending', continue polling
      } catch (err) {
        console.error('[GuestServiceBooking] Auto-poll error:', err);
        // Don't stop polling on error, just log it
      }
    }, 5000); // Poll every 5 seconds

    // Cleanup interval on unmount or when session changes
    return () => {
      console.log('[GuestServiceBooking] Stopping automatic payment status polling');
      clearInterval(pollInterval);
    };
  }, [pendingPaymentSessionId, checkPaymentStatus, selectedService, selectedStaff, selectedDate, selectedTime, paymentType]);

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

  // Check for pre-selected barber from barber profile page - auto-select branch first
  useEffect(() => {
    const preSelectedBarberData = sessionStorage.getItem("preSelectedBarber");
    if (preSelectedBarberData && branches) {
      try {
        const preSelectedBarber = JSON.parse(preSelectedBarberData);

        // If we have a branchId, auto-select the branch first
        if (preSelectedBarber.branchId) {
          const matchingBranch = branches.find(
            (branch) => branch._id === preSelectedBarber.branchId
          );

          if (matchingBranch && !selectedBranch) {
            setSelectedBranch(matchingBranch);
          }
        }
      } catch (error) {
        console.error("Error parsing pre-selected barber:", error);
        sessionStorage.removeItem("preSelectedBarber");
      }
    }
  }, [branches, selectedBranch]);

  // Once branch is selected and barbers are loaded, auto-select barber and skip to service selection
  useEffect(() => {
    const preSelectedBarberData = sessionStorage.getItem("preSelectedBarber");
    if (preSelectedBarberData && barbers && barbers.length > 0 && selectedBranch) {
      try {
        const preSelectedBarber = JSON.parse(preSelectedBarberData);
        // Find the matching barber from the current barbers list
        const matchingBarber = barbers.find(
          (barber) => barber._id === preSelectedBarber.barberId
        );

        if (matchingBarber && !selectedStaff) {
          // Auto-select the barber
          setSelectedStaff(matchingBarber);
          sessionStorage.setItem("barberId", matchingBarber._id);

          // Check if barber has custom booking enabled (from stored data or barber object)
          if (matchingBarber.custom_booking_enabled || preSelectedBarber.customBookingEnabled) {
            // Reset custom form state and enter custom booking flow
            setCustomFormResponses({});
            setCustomFormCustomerName("");
            setCustomFormCustomerEmail("");
            setCustomFormCustomerPhone("");
            setCustomBookingSuccess(null);
            setIsCustomBookingFlow(true);
          } else {
            setIsCustomBookingFlow(false);
          }

          // Skip directly to step 3 (service selection or custom booking form)
          setStep(3);

          // Clear the stored barber after using it
          sessionStorage.removeItem("preSelectedBarber");
        }
      } catch (error) {
        console.error("Error parsing pre-selected barber:", error);
        sessionStorage.removeItem("preSelectedBarber");
      }
    }
  }, [barbers, selectedBranch, selectedStaff]);

  // Reset QR code loading state when step changes
  useEffect(() => {
    if (step === 7) {
      setQrCodeLoading(true);
    }
  }, [step]);

  // Generate QR code when we reach step 7 and have actual booking data
  useEffect(() => {
    if (step === 7 && createdBooking?._id && getBookingById?.booking_code) {
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

  // Filter available vouchers from Convex data (guest users typically don't have vouchers)
  const getAvailableVouchers = () => {
    // For guest users, typically no vouchers are available
    // This prevents confusion when guest users see voucher options they can't use
    if (!isSignedIn || !vouchers) return [];

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
    // Use Philippine time for all time comparisons
    const phNow = getPhilippineDate();
    const phTodayString = getPhilippineDateString();

    // Prevent past dates from having available slots
    if (selectedDate < phTodayString) {
      return [];
    }

    const selectedDateObj = new Date(selectedDate + "T00:00:00");
    const isToday = selectedDate === phTodayString;
    const currentHour = phNow.getHours();
    const currentMinute = phNow.getMinutes();

    // Get day of week for schedule check
    const dayOfWeek = selectedDateObj
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    // Check barber's schedule for this day
    const barberSchedule = selectedStaff.schedule?.[dayOfWeek];

    let startHour, startMin, endHour, endMin;

    // If barber has schedule data, use it; otherwise fall back to branch hours
    if (barberSchedule) {
      if (!barberSchedule.available) {
        return []; // Barber explicitly not available this day
      }
      // Use barber's scheduled hours
      [startHour, startMin] = barberSchedule.start.split(":").map(Number);
      [endHour, endMin] = barberSchedule.end.split(":").map(Number);
    } else {
      // No barber schedule data - fall back to branch hours
      startHour = selectedBranch?.booking_start_hour ?? 10;
      startMin = 0;
      endHour = selectedBranch?.booking_end_hour ?? 20;
      endMin = 0;
    }

    // Apply Branch Operating Hours Constraints
    // Ensure that even if a barber sets availability outside branch hours, 
    // the branch's operating hours take precedence.
    if (selectedBranch) {
      const branchStart = selectedBranch.booking_start_hour ?? 10;
      const branchEnd = selectedBranch.booking_end_hour ?? 20;

      // New start hour is the later of the two
      startHour = Math.max(startHour, branchStart);

      // New end hour is the earlier of the two
      endHour = Math.min(endHour, branchEnd);

      // If the resulting range is invalid (e.g., barber starts after branch closes), return empty
      if (startHour >= endHour) {
        return [];
      }
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
      // Block the slot if: the hour has passed, OR it's the current hour (since the slot time has technically started)
      if (isToday && hour <= currentHour) {
        available = false;
        reason = "past";
      }

      // Check blocked periods (Time Off)
      if (
        selectedStaff.blocked_periods &&
        selectedStaff.blocked_periods.length > 0
      ) {
        // Use selectedDate directly (YYYY-MM-DD string) to avoid timezone issues
        // Do NOT use toISOString() as it converts to UTC and can shift the date
        const blockingPeriod = selectedStaff.blocked_periods.find(
          (p) => p.date === selectedDate
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
    // Include barbers with custom booking enabled - guests can now use custom booking forms
    let available = barbers.filter((b) => b.is_active);

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

    // Validate availability against existing bookings
    if (existingBookings === undefined) {
      alert("Please wait while we verify availability...");
      return;
    }

    // Check if time slot is already taken
    const isSlotTaken = existingBookings.some(
      (booking) =>
        booking.status !== "cancelled" &&
        booking.time.substring(0, 5) === selectedTime.substring(0, 5)
    );

    if (isSlotTaken) {
      alert(
        "This time slot is no longer available. Please select another time."
      );
      setStep(4); // Return to Date & Time selection
      return;
    }

    // Ensure we have a user ID from guest account creation
    const userId = sessionStorage.getItem("user_id");
    if (!userId) {
      alert("Guest account not created properly. Please try again.");
      setStep(4); // Go back to guest info step
      return;
    }

    try {
      setBookingLoading(true);

      // Format time to include seconds for API compatibility
      const formattedTime = selectedTime.includes(":")
        ? `${selectedTime}:00`
        : selectedTime;

      // Get guest email and name from state or session storage
      const customerEmail =
        guestData.email || sessionStorage.getItem("guest_email");
      const customerName =
        guestData.name || sessionStorage.getItem("guest_name");

      const bookingData = {
        customer: userId,
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
        customer_email: customerEmail,
        customer_name: customerName,
        // Calculate booking fee based on type
        booking_fee: (() => {
          if (!selectedBranch?.enable_booking_fee) return 0;

          const feeAmount = selectedBranch.booking_fee_amount || 0;
          if (selectedBranch.booking_fee_type === 'percent') {
            return (selectedService.price * feeAmount) / 100;
          }
          return feeAmount;
        })(),
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

      // Send email notification to the barber about the new booking
      console.log('📧 Attempting to send barber notification...');
      console.log('  → selectedStaff:', selectedStaff?.full_name || selectedStaff?.name);
      console.log('  → selectedStaff.email:', selectedStaff?.email);

      if (selectedStaff?.email) {
        try {
          const emailResult = await sendBarberBookingNotification({
            barberEmail: selectedStaff.email,
            barberName: selectedStaff.full_name || selectedStaff.name,
            customerName: customerName,
            customerPhone: guestData.number || sessionStorage.getItem("guest_number"),
            customerEmail: customerEmail,
            serviceName: selectedService?.name,
            servicePrice: selectedService?.price,
            bookingDate: selectedDate,
            bookingTime: formattedTime,
            branchName: selectedBranch?.name,
            bookingCode: null, // Will be generated by backend
            bookingType: 'guest'
          });
          console.log('📧 Email send result:', emailResult);
        } catch (emailError) {
          // Don't fail the booking if email fails
          console.error('❌ Failed to send barber notification email:', emailError);
        }
      } else {
        console.warn('⚠️ Barber notification skipped: No barber email available');
        console.warn('  → selectedStaff object:', JSON.stringify(selectedStaff, null, 2));
      }

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
        setStep(7); // Success step for pay later
      }

      // Redeem voucher if one was selected (skip for guests since vouchers require user account)
      if (selectedVoucher?.code && userId) {
        try {
          console.log(
            "Redeeming voucher:",
            selectedVoucher.code,
            "User ID:",
            userId
          );
          const redemptionResult = await redeemVoucher({
            code: selectedVoucher.code,
            user_id: userId,
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
            userId: userId,
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

      // Calculate booking fee dynamically
      const bookingFee = (() => {
        if (!selectedBranch?.enable_booking_fee) return 0;

        const feeAmount = selectedBranch.booking_fee_amount || 0;
        if (selectedBranch.booking_fee_type === 'percent') {
          return (originalAmount * feeAmount) / 100;
        }
        return feeAmount;
      })();

      const subtotalAfterDiscount = Math.max(0, originalAmount - discountAmount);
      const finalAmount = subtotalAfterDiscount + bookingFee;

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

      // Get guest user info for payment processing
      const guestEmail =
        guestData.email || sessionStorage.getItem("guest_email");
      const guestName = guestData.name || sessionStorage.getItem("guest_name");

      // Call Convex payment action
      const paymentResult = await createPaymentRequest({
        amount: finalAmount,
        paymentMethod: paymentMethod,
        bookingId: bookingId,
        customerEmail: guestEmail,
        customerName: guestName,
      });

      console.log("Payment created successfully:", paymentResult);

      // Redirect to payment page if there's a redirect URL
      if (paymentResult.redirect_url) {
        window.location.href = paymentResult.redirect_url;
        return true;
      } else {
        // If no redirect URL, show success
        setStep(7);
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
      // Reset custom form state and enter custom booking flow
      setCustomFormResponses({});
      setCustomFormCustomerName("");
      setCustomFormCustomerEmail("");
      setCustomFormCustomerPhone("");
      setCustomBookingSuccess(null);
      setIsCustomBookingFlow(true);
      setStep(3); // Go to step 3 which will show custom booking form
    } else {
      setIsCustomBookingFlow(false);
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

      // Send confirmation email if customer provided email
      if (customFormCustomerEmail.trim()) {
        try {
          await sendCustomBookingConfirmation({
            customerEmail: customFormCustomerEmail.trim(),
            customerName: customFormCustomerName.trim(),
            bookingCode: result.booking_code,
            barberName: result.barber_name,
            branchName: result.branch_name,
            formTitle: result.form_title,
          });
          console.log('✅ Confirmation email sent successfully');
        } catch (emailError) {
          // Don't fail the submission if email fails
          console.error('Failed to send confirmation email:', emailError);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to submit booking request");
    } finally {
      setCustomBookingSubmitting(false);
    }
  };

  // Close/cancel custom booking form - go back to barber selection
  const handleCloseCustomBookingForm = () => {
    setIsCustomBookingFlow(false);
    setSelectedStaff(null);
    setCustomFormResponses({});
    setCustomBookingSuccess(null);
    setError(null);
    setStep(2); // Go back to barber selection
  };

  const handleConfirmBooking = async (
    paymentType = "pay_later",
    paymentMethod = null
  ) => {
    // Validate that guest account is properly created before proceeding
    const userId = sessionStorage.getItem("user_id");
    const guestEmail = sessionStorage.getItem("guest_email");

    if (!userId || !guestEmail) {
      showErrorDialog(
        "Guest Account Required",
        "Please complete the guest information form before booking."
      );
      setStep(4); // Go back to guest info step
      return;
    }

    await handleCreateBooking(paymentType, paymentMethod);
  };

  /**
   * Handle payment option selection from PaymentOptionsModal (Story 7.5)
   * @param {string} paymentOption - "pay_now", "pay_later", or "pay_at_shop"
   */
  const handlePaymentOptionSelect = async (paymentOption) => {
    setShowPaymentModal(false);
    setPaymentProcessing(true);
    setError(null);

    try {
      // Validate guest account is properly created
      const userId = sessionStorage.getItem("user_id");
      const guestEmail = sessionStorage.getItem("guest_email");
      const guestName = guestData.name || sessionStorage.getItem("guest_name");

      if (!userId || !guestEmail) {
        showErrorDialog(
          "Guest Account Required",
          "Please complete the guest information form before booking."
        );
        setStep(5); // Go back to guest info step
        setPaymentProcessing(false);
        return;
      }

      if (!selectedService || !selectedDate || !selectedTime) {
        throw new Error("Please fill in all booking details");
      }

      // Format time to include seconds for API compatibility
      const formattedTime = selectedTime.includes(":")
        ? `${selectedTime}:00`
        : selectedTime;

      // Calculate booking fee
      const bookingFee = (() => {
        if (!selectedBranch?.enable_booking_fee) return 0;
        const feeAmount = selectedBranch.booking_fee_amount || 0;
        if (selectedBranch.booking_fee_type === 'percent') {
          return (selectedService.price * feeAmount) / 100;
        }
        return feeAmount;
      })();

      // Handle payment based on selected option
      if (paymentOption === "pay_at_shop") {
        // ============================================================
        // PAY AT SHOP: Create booking immediately (no payment required upfront)
        // ============================================================
        console.log("Pay at Shop selected - creating booking immediately");

        const bookingData = {
          customer: userId,
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
          customer_email: guestEmail,
          customer_name: guestName,
          payment_status: "unpaid",
          booking_fee: bookingFee,
        };

        const bookingId = await createBooking(bookingData);

        // Create initial booking object for UI
        const booking = {
          _id: bookingId,
          booking_code: null,
          service: selectedService,
          barber: selectedStaff,
          date: selectedDate,
          time: formattedTime,
          status: "booked",
          voucher_code: selectedVoucher?.code,
          payment_option: paymentOption,
        };
        setCreatedBooking(booking);

        // Send email notification to barber
        if (selectedStaff?.email) {
          try {
            await sendBarberBookingNotification({
              barberEmail: selectedStaff.email,
              barberName: selectedStaff.full_name || selectedStaff.name,
              customerName: guestName,
              customerPhone: guestData.number || sessionStorage.getItem("guest_number"),
              customerEmail: guestEmail,
              serviceName: selectedService?.name,
              servicePrice: selectedService?.price,
              bookingDate: selectedDate,
              bookingTime: formattedTime,
              branchName: selectedBranch?.name,
              bookingCode: null,
              bookingType: 'guest'
            });
          } catch (emailError) {
            console.error('Failed to send barber notification email:', emailError);
          }
        }

        // Redeem voucher if selected
        if (selectedVoucher?.code) {
          try {
            await redeemVoucher({
              code: selectedVoucher.code,
              user_id: userId,
            });
          } catch (voucherError) {
            console.error("Voucher redemption error:", voucherError);
          }
        }

        setStep(7); // Go to success step
      } else {
        // ============================================================
        // PAY NOW / PAY LATER: Deferred booking - only create after payment succeeds
        // Booking is NOT created until payment webhook confirms success
        // ============================================================
        console.log("Creating deferred payment link for:", paymentOption);

        try {
          // Create payment link with booking data (booking will be created after payment)
          const result = await createPaymentLinkDeferred({
            customer_id: userId,
            service_id: selectedService._id,
            barber_id: selectedStaff?._id || undefined,
            branch_id: selectedBranch._id,
            date: selectedDate,
            time: formattedTime,
            notes: selectedVoucher
              ? `Used voucher: ${selectedVoucher.code}`
              : undefined,
            voucher_id: selectedVoucher?._id || undefined,
            discount_amount: selectedVoucher?.value || undefined,
            customer_email: guestEmail,
            customer_name: guestName,
            booking_fee: bookingFee,
            price: selectedService.price,
            payment_type: paymentOption,
            origin: window.location.origin,
          });

          console.log("Deferred payment link created:", result);

          // DON'T redeem voucher yet - it will be redeemed when booking is created after payment
          // DON'T create booking yet - it will be created by webhook after payment success

          // Store session ID for polling
          localStorage.setItem('pendingPaymongoSessionId', result.sessionId);

          // Set pending payment state for polling
          setPendingPaymentSessionId(result.sessionId);
          setPaymentAmount(result.amount);
          setPaymentType(paymentOption);

          // Open PayMongo checkout in new tab (don't redirect - stay here to poll)
          window.open(result.checkoutUrl, '_blank');

          // Go to payment waiting step
          setStep(8);
        } catch (paymentError) {
          console.error("Payment link creation failed:", paymentError);

          // Offer Pay at Shop fallback (FR22)
          const fallbackConfirmed = window.confirm(
            `Payment processing failed: ${paymentError.message || "Unknown error"}\n\nWould you like to proceed with "Pay at Shop" instead? You can pay the full amount when you arrive at the branch.`
          );

          if (fallbackConfirmed) {
            // Create booking with pay_at_shop flow
            const bookingData = {
              customer: userId,
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
              customer_email: guestEmail,
              customer_name: guestName,
              payment_status: "unpaid",
              booking_fee: bookingFee,
            };

            const bookingId = await createBooking(bookingData);
            setCreatedBooking({
              _id: bookingId,
              service: selectedService,
              barber: selectedStaff,
              date: selectedDate,
              time: formattedTime,
              status: "booked",
              payment_option: "pay_at_shop",
            });

            // Redeem voucher
            if (selectedVoucher?.code) {
              try {
                await redeemVoucher({
                  code: selectedVoucher.code,
                  user_id: userId,
                });
              } catch (voucherError) {
                console.error("Voucher redemption error:", voucherError);
              }
            }

            setStep(7);
          } else {
            throw paymentError;
          }
        }
      }
    } catch (err) {
      console.error("Payment option handling error:", err);
      setError(err.message || "Failed to process payment option");
      showErrorDialog("Booking Error", err.message || "Failed to process your booking. Please try again.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Select Branch";
      case 2:
        return "Choose Barber";
      case 3:
        return isCustomBookingFlow ? "Custom Booking" : "Choose Service";
      case 4:
        return "Select Date & Time";
      case 5:
        return "Your Information";
      case 6:
        return "Confirm Booking";
      case 7:
        return "Booking Confirmed";
      default:
        return "Book Service";
    }
  };

  const renderStepIndicator = () => {
    // For custom booking flow, show only 3 steps: Branch -> Barber -> Custom Form
    const totalSteps = isCustomBookingFlow ? 3 : 7;

    // Hide step indicator on success page
    if (customBookingSuccess && isCustomBookingFlow) {
      return null;
    }

    // Define steps with labels for the modern component
    const guestSteps = isCustomBookingFlow
      ? [
          { label: 'Branch' },
          { label: 'Barber' },
          { label: 'Details' }
        ]
      : [
          { label: 'Branch' },
          { label: 'Service' },
          { label: 'Barber' },
          { label: 'Schedule' },
          { label: 'Info' },
          { label: 'Confirm' },
          { label: 'Done' }
        ];

    return (
      <div className="mb-4 px-4 py-2">
        <StepProgressDots
          currentStep={step}
          totalSteps={totalSteps}
          steps={guestSteps}
          showLabels={false}
          size="small"
        />
      </div>
    );
  };

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
                          {/* <span>{branch.phone}</span> */}
                          {/* <span className="text-gray-600">•</span>
                          <span className="text-gray-500">
                            #{branch.branch_code} */}
                          {/* </span> */}
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
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      );
    }

    // Map service categories to standard categories (same as POS)
    const mapServiceCategory = (category) => {
      if (!category) return "Other Services";
      const catLower = category.toLowerCase();
      if (catLower.includes("haircut") || catLower.includes("hair")) {
        return "Haircut";
      }
      if (catLower.includes("package")) {
        return "Package";
      }
      return "Other Services";
    };

    // Group services by category
    const servicesToDisplay = selectedStaff
      ? services.filter(
        (service) =>
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

    // Get unique categories
    const categoryNames = Object.keys(categories);

    // Filter services based on search and category
    const getFilteredServices = () => {
      let filtered = servicesToDisplay;

      // Filter by search term
      if (serviceSearchTerm) {
        const searchLower = serviceSearchTerm.toLowerCase();
        filtered = filtered.filter(service =>
          service.name.toLowerCase().includes(searchLower) ||
          (service.description && service.description.toLowerCase().includes(searchLower))
        );
      }

      // Filter by category if one is selected
      if (openCategory) {
        filtered = filtered.filter(service =>
          mapServiceCategory(service.category) === openCategory
        );
      }

      return filtered;
    };

    const filteredServices = getFilteredServices();

    // Calculate barbers per service
    const barbersByService = {};
    servicesToDisplay.forEach(service => {
      barbersByService[service._id] = barbers
        ? barbers.filter(
          barber =>
            barber.is_active &&
            barber.services &&
            Array.isArray(barber.services) &&
            barber.services.includes(service._id)
        ).length
        : 0;
    });

    // Get service counts per category
    const serviceCounts = {};
    categoryNames.forEach(cat => {
      serviceCounts[cat] = (categories[cat] || []).length;
    });

    // Mock popular services (first 2 services)
    const popularServices = servicesToDisplay.slice(0, 2).map(s => s._id);

    return (
      <div className="px-4 pb-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Choose Service</h2>
          <p className="text-sm text-gray-400">
            Select the service you'd like to book{" "}
            {selectedStaff
              ? `with ${selectedStaff.full_name || selectedStaff.name}`
              : `at ${selectedBranch?.name}`}
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
            className="w-full pl-10 pr-10 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
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

        {/* Category Tabs */}
        <div className="mb-4">
          <ServiceCategoryTabs
            categories={categoryNames}
            activeCategory={openCategory}
            onCategoryChange={setOpenCategory}
            serviceCounts={serviceCounts}
          />
        </div>

        {/* Service Cards */}
        <ServiceCardGrid
          services={filteredServices}
          selectedService={selectedService}
          onSelect={handleServiceSelect}
          popularServices={popularServices}
          barbersByService={barbersByService}
          loading={loading}
        />

        {/* Empty State */}
        {filteredServices.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-400 text-sm">No services found</p>
            <button
              onClick={() => {
                setServiceSearchTerm("");
                setOpenCategory(null);
              }}
              className="mt-3 text-[var(--color-primary)] text-sm font-medium"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderTimeSelection = () => {
    // Transform time slots for the modern TimeSlotPills component
    const transformedSlots = timeSlots.map(slot => ({
      time: slot.time,
      available: slot.available,
      popular: slot.time === '10:00' || slot.time === '14:00' || slot.time === '11:00'
    }));

    return (
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
                  {selectedService?.hide_price
                    ? "Price may vary"
                    : `₱${selectedService?.price.toLocaleString()}`}
                </span>
                <span className="text-gray-400">{selectedService?.duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Calendar Strip */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
          <CalendarStrip
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime(null);
              // Validation
              const phToday = getPhilippineDateString();
              if (date < phToday) {
                setDateError("Dates in the past cannot be selected.");
              } else {
                setDateError(null);
              }
            }}
            minDate={getPhilippineDateString()}
            maxMonthsAhead={12}
          />
        </div>

        {/* Date Error Message */}
        {dateError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-400 text-sm font-medium">{dateError}</p>
          </div>
        )}

        {/* Modern Time Slot Pills */}
        {selectedDate && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Available Times</h3>
              <span className="text-xs text-gray-400 bg-[#2A2A2A] px-2 py-1 rounded-full">
                {new Date(selectedDate).toLocaleDateString("en-PH", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {loadingTimeSlots || existingBookings === undefined ? (
              <div className="flex justify-center items-center py-8 space-x-2">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full"></div>
                <span className="text-gray-400 text-sm">Loading times...</span>
              </div>
            ) : (
              <TimeSlotPills
                slots={transformedSlots}
                selectedTime={selectedTime}
                onTimeSelect={setSelectedTime}
                showFilters={true}
              />
            )}
          </div>
        )}

        {/* Continue Button */}
        {selectedDate && selectedTime && (
          <button
            onClick={() => setStep(5)}
            disabled={!!dateError || !selectedTime}
            className={`w-full py-4 font-bold rounded-xl transition-all duration-200 ${!dateError && selectedTime
              ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              : "bg-[#1A1A1A] text-gray-500 border border-[#2A2A2A] cursor-not-allowed"
              }`}
          >
            Continue to Your Information
          </button>
        )}
      </div>
    );
  };

  const renderStaffSelection = () => (
    <div className="pb-6 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Choose Your Barber
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Select your preferred professional
        </p>
      </div>

      {/* Modern Barber Cards */}
      <BarberCardGrid
        barbers={getAvailableBarbers()}
        selectedBarber={selectedStaff}
        onSelect={handleStaffSelect}
        compact={false}
        loading={!barbers}
      />

      {/* Empty State */}
      {barbers && getAvailableBarbers().length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
          <p className="text-gray-400">No barbers available at this branch</p>
        </div>
      )}
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

      // CRITICAL: Store user ID and guest data in sessionStorage for booking creation
      sessionStorage.setItem("user_id", newUser._id);
      sessionStorage.setItem("guest_email", guestData.email.trim());
      sessionStorage.setItem("guest_name", guestData.name.trim());
      sessionStorage.setItem("guest_number", guestData.number?.trim() || "");
      sessionStorage.setItem("guest_branch_id", selectedBranch?._id);

      console.log("✅ Guest account created/verified:", {
        userId: newUser._id,
        email: guestData.email.trim(),
        name: guestData.name.trim(),
        branchId: selectedBranch?._id,
        isExisting: newUser.isExistingUser || false,
      });

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

      setStep(6);
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
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
            <Lock className="w-3.5 h-3.5 text-[var(--color-primary)] mr-1" />
            <span className="text-xs text-[var(--color-primary)]">
              Secure & Private
            </span>
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
                className={`w-full h-12 px-4 bg-[#2A2A2A] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-all duration-300 text-sm text-white placeholder-gray-500 ${formErrors.name
                  ? "border-red-500 focus:border-red-500"
                  : "border-[#3A3A3A] focus:border-[var(--color-primary)]"
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
                className={`w-full h-12 px-4 bg-[#2A2A2A] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-all duration-300 text-sm text-white placeholder-gray-500 ${formErrors.email
                  ? "border-red-500 focus:border-red-500"
                  : "border-[#3A3A3A] focus:border-[var(--color-primary)]"
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
                className={`w-full h-12 px-4 bg-[#2A2A2A] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-all duration-300 text-sm text-white placeholder-gray-500 ${formErrors.number
                  ? "border-red-500 focus:border-red-500"
                  : "border-[#3A3A3A] focus:border-[var(--color-primary)]"
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
                className={`w-full py-3 rounded-xl font-light transition-all duration-300 text-sm ${loading
                  ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white hover:shadow-lg transform hover:scale-[1.02]"
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
        <h2 className="text-xl font-bold mb-1 text-white">
          Confirm Your Booking
        </h2>
        <p className="text-sm font-medium text-gray-400">
          Please review your appointment details
        </p>
      </div>

      <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] shadow-lg">
        <div className="space-y-4">
          {/* Service Details */}
          <div className="text-center border-b pb-3 border-[#2A2A2A]">
            <div className="text-2xl mb-2">{selectedService?.image}</div>
            <h3 className="text-lg font-bold mb-1 text-white">
              {selectedService?.name}
            </h3>
            <div className="flex justify-center items-center space-x-3">
              <span className="font-bold text-base text-[var(--color-primary)]">
                {selectedService?.hide_price
                  ? "Price may vary"
                  : `₱${selectedService?.price.toLocaleString()}`}
              </span>
              <span className="font-medium text-sm text-gray-400">
                {selectedService?.duration}
              </span>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="font-semibold text-sm text-gray-400">
                  Branch
                </span>
              </div>
              <span className="font-bold text-sm text-white">
                {selectedBranch?.name}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="font-semibold text-sm text-gray-400">
                  Date & Time
                </span>
              </div>
              <span className="font-bold text-sm text-white">
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString("en-PH", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                  : "Today"}
                , {formatTime(selectedTime)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="font-semibold text-sm text-gray-400">
                  Your Barber
                </span>
              </div>
              <span className="font-bold text-sm text-white">
                {selectedStaff?.full_name ||
                  selectedStaff?.name ||
                  "Any Barber"}
              </span>
            </div>
          </div>

          {/* Voucher Selection */}
          <div className="border-t pt-3 border-[#2A2A2A]">
            <h4 className="text-sm font-bold mb-3 flex items-center text-white">
              <Gift className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
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
                      className={`w-full p-2 rounded-lg border-2 transition-all duration-200 text-left ${selectedVoucher?._id === voucher._id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[#2A2A2A] bg-[#0F0F0F] hover:border-[var(--color-primary)]/50"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Gift className="w-4 h-4 text-[var(--color-primary)]" />
                          <div>
                            <p className="text-xs font-bold text-white">
                              {voucher.code}
                            </p>
                            <p className="text-xs text-[var(--color-primary)]">
                              ₱{parseFloat(voucher.value || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {selectedVoucher?._id === voucher._id && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[var(--color-primary)]">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedVoucher && (
                  <div className="text-xs text-center p-2 rounded flex items-center justify-center gap-2 bg-blue-900/30 text-blue-300">
                    <Banknote className="w-4 h-4" />
                    <span>
                      You'll save ₱
                      {parseFloat(selectedVoucher.value || 0).toFixed(2)} with
                      this voucher
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-gray-400">No vouchers available</p>
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="border-t pt-3 border-[#2A2A2A]">
            <h4 className="text-sm font-bold mb-3 flex items-center text-white">
              <Banknote className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
              Payment Summary
            </h4>
            <div className="space-y-2 bg-[#0F0F0F] p-3 rounded-lg border border-[#2A2A2A]">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Service Price</span>
                <span className="text-white">₱{selectedService?.price.toLocaleString()}</span>
              </div>
              {selectedVoucher && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Voucher Discount</span>
                  <span className="text-green-400">-₱{parseFloat(selectedVoucher.value || 0).toLocaleString()}</span>
                </div>
              )}
              {selectedBranch?.enable_booking_fee && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    Booking Fee {selectedBranch.booking_fee_type === 'percent' ? `(${selectedBranch.booking_fee_amount}%)` : ''}
                  </span>
                  <span className="text-white">
                    ₱{(() => {
                      if (selectedBranch.booking_fee_type === 'percent') {
                        return ((selectedService?.price || 0) * (selectedBranch.booking_fee_amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      }
                      return (selectedBranch.booking_fee_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              )}
              <div className="border-t border-[#2A2A2A] pt-2 mt-1 flex justify-between items-center">
                <span className="font-bold text-white">Total Amount</span>
                <span className="font-bold text-lg text-[var(--color-primary)]">
                  ₱{(() => {
                    const price = selectedService?.price || 0;
                    const discount = selectedVoucher?.value || 0;
                    let fee = 0;

                    if (selectedBranch?.enable_booking_fee) {
                      if (selectedBranch.booking_fee_type === 'percent') {
                        fee = (price * (selectedBranch.booking_fee_amount || 0)) / 100;
                      } else {
                        fee = selectedBranch.booking_fee_amount || 0;
                      }
                    }

                    return (Math.max(0, price - discount) + fee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Book Now Button */}
          <div className="border-t pt-3 border-[#2A2A2A]">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={bookingLoading || paymentProcessing}
              className={`w-full py-3 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 font-bold ${bookingLoading || paymentProcessing
                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                : "bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white hover:shadow-lg"
                }`}
            >
              {bookingLoading || paymentProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  <span>{paymentProcessing ? "Processing..." : "Booking..."}</span>
                </div>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Choose Payment Option</span>
                </>
              )}
            </button>
          </div>

          {/* Go Back Button */}
          <div className="pt-2">
            <button
              onClick={() => setStep(4)}
              className="w-full py-2 px-3 border border-[#2A2A2A] text-gray-400 hover:bg-[#222222] hover:text-white font-bold rounded-lg transition-all duration-200 text-sm"
            >
              ← Go Back to Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBookingSuccess = () => {
    // Calculate estimated points for guest (based on service price)
    const estimatedPoints = Math.floor((selectedService?.price || 0) / 10);

    return (
      <SuccessConfetti
        show={step === 7}
        title="You're all set!"
        subtitle="Your booking has been confirmed"
        pointsEarned={0} // Guests don't earn points
      >
        <div className="space-y-6 px-4">
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
                <span className="font-bold text-[var(--color-primary)]">
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
            backgroundColor: hexToRgba(
              branding?.primary_color || "#F68B24",
              0.05
            ),
            borderColor: hexToRgba(branding?.primary_color || "#F68B24", 0.2),
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
                , {formatTime(createdBooking?.time || selectedTime)}
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
                  {selectedService?.hide_price
                    ? "Price may vary"
                    : `₱${selectedService?.price.toLocaleString()}`}
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
            {selectedBranch?.enable_booking_fee && (
              <div className="flex justify-between">
                <span className="font-light text-gray-400 text-sm">
                  Booking Fee: {selectedBranch.booking_fee_type === 'percent' ? `(${selectedBranch.booking_fee_amount}%)` : ''}
                </span>
                <span className="font-normal text-white text-sm">
                  ₱{(() => {
                    if (selectedBranch.booking_fee_type === 'percent') {
                      return ((selectedService?.price || 0) * (selectedBranch.booking_fee_amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                    return (selectedBranch.booking_fee_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 border-orange-500/30">
              <span className="font-light text-white">Total:</span>
              <span className="font-normal text-lg text-[var(--color-primary)]">
                ₱
                {createdBooking?.total_amount
                  ? parseFloat(createdBooking.total_amount).toLocaleString()
                  : (() => {
                    const price = selectedService?.price || 0;
                    const discount = selectedVoucher?.value || 0;
                    let fee = 0;

                    if (selectedBranch?.enable_booking_fee) {
                      if (selectedBranch.booking_fee_type === 'percent') {
                        fee = (price * (selectedBranch.booking_fee_amount || 0)) / 100;
                      } else {
                        fee = selectedBranch.booking_fee_amount || 0;
                      }
                    }

                    return (Math.max(0, price - discount) + fee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onBack}
            className="w-full py-4 hover:brightness-90 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg"
            style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
          >
            Back to Home
          </button>
        </div>
      </div>
      </SuccessConfetti>
    );
  };

  // Render payment pending state (step 8)
  const renderPaymentPending = () => {
    const isPaymentCompleted = paymentStatus?.status === 'completed';
    const isPending = paymentStatus?.status === 'pending' || paymentStatus?.status === 'paid';
    const pendingData = paymentStatus?.pendingPayment;

    return (
      <div className="space-y-6 px-4">
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{ backgroundColor: '#3B82F6' }}
          >
            {isPending ? (
              <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full"></div>
            ) : (
              <CreditCard className="w-10 h-10 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-light mb-2 text-white">
            {isPending ? 'Waiting for Payment...' : 'Complete Your Payment'}
          </h2>
          <p className="font-light text-gray-300 text-sm">
            {isPending
              ? 'Please complete your payment in the payment window'
              : 'A new tab has opened for payment. Please complete it there.'}
          </p>
        </div>

        {/* Payment Info Card */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] shadow-lg">
          <h3 className="text-lg font-light mb-4 text-white text-center">
            Payment Details
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-light text-gray-400 text-sm">Service:</span>
              <span className="font-normal text-white text-sm">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-light text-gray-400 text-sm">Barber:</span>
              <span className="font-normal text-white text-sm">{selectedStaff?.full_name || 'Any Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-light text-gray-400 text-sm">Date & Time:</span>
              <span className="font-normal text-white text-sm">{selectedDate}, {selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-light text-gray-400 text-sm">Payment Type:</span>
              <span className="font-normal text-white text-sm">
                {paymentType === 'pay_now' ? 'Full Payment' : 'Convenience Fee'}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3 border-blue-500/30">
              <span className="font-light text-white">Amount to Pay:</span>
              <span className="font-normal text-lg text-blue-400">
                ₱{paymentAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className={`rounded-2xl p-4 border ${
          isPending
            ? 'bg-blue-500/10 border-blue-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isPending ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm text-white">
              {isPending
                ? 'Checking payment status...'
                : 'Waiting for you to complete payment'}
            </span>
          </div>
          {pendingPaymentSessionId && (
            <p className="text-xs text-gray-500 mt-2 font-mono break-all">
              Session: {pendingPaymentSessionId.substring(0, 20)}...
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={async () => {
              if (!pendingPaymentSessionId || checkingPaymentManually) return;

              setCheckingPaymentManually(true);
              try {
                console.log('[GuestServiceBooking] Manually checking payment status for:', pendingPaymentSessionId);
                const result = await checkPaymentStatus({ sessionId: pendingPaymentSessionId });
                console.log('[GuestServiceBooking] Manual check result:', result);

                if (result.status === 'paid' || result.status === 'already_paid') {
                  // Payment confirmed! Create booking state and go to success
                  setCreatedBooking({
                    _id: result.bookingId,
                    booking_code: result.bookingCode,
                    service: selectedService,
                    barber: selectedStaff,
                    date: selectedDate,
                    time: selectedTime,
                    status: "booked",
                    payment_status: paymentType === 'pay_now' ? 'paid' : 'partial',
                  });
                  setPendingPaymentSessionId(null);
                  localStorage.removeItem('pendingPaymongoSessionId');
                  setStep(7); // Success step
                } else if (result.status === 'pending') {
                  // Still pending - inform user
                  window.alert('Payment is still processing. Please complete the payment in the payment window and try again.');
                } else if (result.status === 'expired') {
                  window.alert('Payment session has expired. Please start a new booking.');
                  setPendingPaymentSessionId(null);
                  localStorage.removeItem('pendingPaymongoSessionId');
                  setStep(6);
                } else {
                  window.alert(result.error || 'Could not verify payment status. Please try again.');
                }
              } catch (err) {
                console.error('[GuestServiceBooking] Manual check error:', err);
                window.alert('Error checking payment: ' + (err.message || 'Unknown error'));
              } finally {
                setCheckingPaymentManually(false);
              }
            }}
            disabled={checkingPaymentManually}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
          >
            {checkingPaymentManually ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Checking Payment...
              </>
            ) : (
              "I've Completed Payment - Check Status"
            )}
          </button>
          <button
            onClick={() => {
              // Cancel and go back to confirmation
              setPendingPaymentSessionId(null);
              localStorage.removeItem('pendingPaymongoSessionId');
              setStep(6);
            }}
            disabled={checkingPaymentManually}
            className="w-full py-3 bg-transparent border border-[#333] hover:bg-[#1A1A1A] text-gray-400 font-medium rounded-2xl transition-all duration-200 disabled:opacity-50"
          >
            Cancel & Go Back
          </button>
        </div>

        <p className="text-center text-xs text-gray-500">
          Click the button above after completing your online payment to verify and confirm your booking.
        </p>
      </div>
    );
  };

  // Render field input based on type for custom booking form
  const renderCustomFormField = (field) => {
    const value = customFormResponses[field.id] || (field.type === 'checkbox' || field.type === 'multiselect' ? [] : '');

    const baseInputClass = "w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] transition-all";

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
                <label key={idx} className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-xl cursor-pointer hover:bg-[#1A1A1A] transition-all">
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
              <label key={idx} className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-xl cursor-pointer hover:bg-[#1A1A1A] transition-all">
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
            min={getPhilippineDateString()}
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
                min={getPhilippineDateString()}
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
                min={value?.from || getPhilippineDateString()}
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

  // Custom booking form page content for guests
  const renderCustomBookingForm = () => {
    if (!selectedStaff) return null;

    // Show success state as a page
    if (customBookingSuccess) {
      return (
        <div className="px-4 pb-6 max-w-2xl mx-auto">
          <div className="text-center py-8">
            <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ backgroundColor: hexToRgba(branding?.primary_color || "#F68B24", 0.2) }}>
              <CheckCircle className="w-12 h-12" style={{ color: branding?.primary_color || "#F68B24" }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Request Submitted!</h2>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              Your booking request has been sent to {selectedStaff.full_name || selectedStaff.name}.
              They will contact you soon to confirm your appointment.
            </p>

            {/* Reference Code Card */}
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A] mb-6">
              <p className="text-sm text-gray-400 mb-2">Reference Code</p>
              <p className="text-2xl font-mono font-bold" style={{ color: branding?.primary_color || "#F68B24" }}>
                {customBookingSuccess.booking_code}
              </p>
            </div>

            {/* Booking Summary */}
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] mb-6 text-left">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Booking Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Barber</span>
                  <span className="text-white font-medium">{selectedStaff.full_name || selectedStaff.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Branch</span>
                  <span className="text-white font-medium">{selectedBranch?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-yellow-400 font-medium">Pending Confirmation</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onBack}
                className="w-full py-4 text-white font-bold rounded-xl transition-all"
                style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
              >
                Back to Home
              </button>
              <button
                onClick={() => {
                  setCustomBookingSuccess(null);
                  setIsCustomBookingFlow(false);
                  setSelectedStaff(null);
                  setStep(2);
                }}
                className="w-full py-3 text-gray-400 font-medium rounded-xl border border-[#2A2A2A] hover:bg-white/5 transition-all"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Loading state for form
    if (!customBookingForm) {
      return (
        <div className="px-4 pb-6 max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading booking form...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 pb-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <BarberAvatar barber={selectedStaff} className="w-16 h-16" />
            <div>
              <h2 className="text-2xl font-bold text-white">{customBookingForm.title}</h2>
              <p className="text-gray-400">with {selectedStaff.full_name || selectedStaff.name}</p>
            </div>
          </div>
          {customBookingForm.description && (
            <p className="text-gray-400 text-sm">{customBookingForm.description}</p>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={handleCustomBookingSubmit} className="space-y-6">
          {/* Customer Info */}
          <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] space-y-4">
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
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
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
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Phone Number</label>
              <input
                type="tel"
                value={customFormCustomerPhone}
                onChange={(e) => setCustomFormCustomerPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Custom Fields */}
          {customBookingForm.fields && customBookingForm.fields.length > 0 && (
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] space-y-4">
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

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
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
          </div>
        </form>
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
              onClick={() => {
                if (step === 1) {
                  // If on first step, navigate to login page
                  window.location.href = "/auth/login";
                } else if (step === 3 && isCustomBookingFlow) {
                  // In custom booking flow at step 3, go back to barber selection
                  if (customBookingSuccess) {
                    // If on success page, exit to home
                    onBack();
                  } else {
                    setIsCustomBookingFlow(false);
                    setSelectedStaff(null);
                    setCustomFormResponses({});
                    setError(null);
                    setStep(2);
                  }
                } else {
                  // Otherwise, go to previous step
                  setStep((prev) => Math.max(prev - 1, 1));
                }
              }}
              className="absolute left-0 flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Title - Centered */}
            <div className="text-center">
              <p className="text-lg font-light text-white">
                {isCustomBookingFlow ? "Custom Booking" : "Book Service"}
              </p>
              <p className="text-xs text-[var(--color-primary)]">
                {isCustomBookingFlow
                  ? (customBookingSuccess ? "Complete" : `Step ${step} of 3`)
                  : `Step ${step} of 7`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="relative z-10">{renderStepIndicator()}</div>

      {/* Registration Promo Banner - hide during custom booking flow */}
      {step < 7 && !isCustomBookingFlow && (
        <div className="relative z-10 px-4 mb-4 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 border border-[var(--color-primary)]/30 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <Gift className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Get better deals & exclusive vouchers!
                </p>
                <p className="text-xs text-gray-400">
                  Register for a free account to unlock special discounts and rewards
                </p>
              </div>
              <button
                onClick={() => window.location.href = "/auth/register"}
                className="flex-shrink-0 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 pb-8">
        {step === 1 && renderBranchSelection()}
        {step === 2 && renderStaffSelection()}
        {step === 3 && (isCustomBookingFlow ? renderCustomBookingForm() : renderServiceSelection())}
        {step === 4 && renderTimeSelection()}
        {step === 5 && renderGuestSignIn()}
        {step === 6 && renderConfirmation()}
        {step === 7 && renderBookingSuccess()}
        {step === 8 && renderPaymentPending()}
      </div>

      {/* Payment Options Modal (Story 7.5) */}
      <PaymentOptionsModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        branchId={selectedBranch?._id}
        servicePrice={(() => {
          const price = selectedService?.price || 0;
          const discount = selectedVoucher?.value || 0;
          let fee = 0;
          if (selectedBranch?.enable_booking_fee) {
            if (selectedBranch.booking_fee_type === 'percent') {
              fee = (price * (selectedBranch.booking_fee_amount || 0)) / 100;
            } else {
              fee = selectedBranch.booking_fee_amount || 0;
            }
          }
          return Math.max(0, price - discount) + fee;
        })()}
        serviceName={selectedService?.name || "Service"}
        onSelect={handlePaymentOptionSelect}
      />

      {/* Error Dialog Modal */}
      {errorDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeErrorDialog}
          ></div>

          {/* Modal */}
          <div
            className="relative bg-[#1A1A1A] rounded-2xl shadow-2xl border border-[#2A2A2A] max-w-md w-full mx-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-dialog-title"
            tabIndex="-1"
          >
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
            <h3
              id="error-dialog-title"
              className="text-lg font-semibold text-white text-center mb-2"
            >
              {errorDialog.title}
            </h3>

            {/* Message */}
            <p className="text-sm text-gray-300 text-center mb-6 leading-relaxed">
              {errorDialog.message}
            </p>

            {/* Action Button */}
            <button
              onClick={closeErrorDialog}
              className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white font-medium rounded-xl transition-all duration-200"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotification.isOpen && (
        <div
          className="fixed top-4 right-4 z-50 max-w-sm"
          role="status"
          aria-live="polite"
        >
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
