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
  Banknote,
  Star,
  Receipt,
  CreditCard,
  Wallet,
  QrCode,
  ChevronDown,
  Palmtree,
} from "lucide-react";
import QRCode from "qrcode";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useBranding } from "../../context/BrandingContext";
import { formatTime } from "../../utils/dateUtils";
import { sendCustomBookingConfirmation, sendBarberBookingNotification } from "../../services/emailService";
import PaymentOptionsModal from "./PaymentOptionsModal";
import { MatcherQuiz } from "./BarberMatcher";
import { useAppModal } from "../../context/AppModalContext";
// Modern booking components
import {
  // Phase 1: Quick Wins
  CalendarStrip, TimeSlotPills, StepProgressDots, SuccessConfetti,
  // Phase 2: Core Upgrades
  ServiceCard, ServiceCardGrid, ServiceCategoryTabs,
  BarberCard, BarberCardCompact, BarberCardGrid,
  SmartRecommendations, QuickBookBanner,
  // Phase 3: Premium Experience
  ServiceCardSkeleton, BarberCardSkeleton, TimeSlotSkeleton, CalendarSkeleton,
  FadeIn, Stagger, AnimatedCard, PopIn,
  useHaptic, HapticButton
} from "./booking";

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

const ServiceBooking = ({ onBack, onComplete, prefillData }) => {
  const { branding } = useBranding();
  const { user, isAuthenticated } = useCurrentUser();
  const { showAlert, showConfirm } = useAppModal();
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use Philippine time for default date
    return getPhilippineDateString();
  });
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [step, setStep] = useState(1); // 1: branch, 2: services, 3: date & time & staff, 4: confirmation, 5: success, 6: confirmed, 7: custom form, 8: payment pending
  const [isRebookMode, setIsRebookMode] = useState(false);
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
  const successRef = useRef(null); // Ref for scrolling to success screen
  const [openCategory, setOpenCategory] = useState(null); // ✅ Top level hook
  const [dateError, setDateError] = useState(null);

  // Custom booking form states
  const [customFormResponses, setCustomFormResponses] = useState({});
  const [customFormCustomerName, setCustomFormCustomerName] = useState(user?.full_name || user?.nickname || "");
  const [customFormCustomerEmail, setCustomFormCustomerEmail] = useState(user?.email || "");
  const [customFormCustomerPhone, setCustomFormCustomerPhone] = useState(user?.mobile_number || user?.phone || "");
  const [customBookingSubmitting, setCustomBookingSubmitting] = useState(false);
  const [customBookingSuccess, setCustomBookingSuccess] = useState(null);
  const [isCustomBookingFlow, setIsCustomBookingFlow] = useState(false);
  const [cameFromQuickBook, setCameFromQuickBook] = useState(false); // Track if we auto-skipped branch selection

  // PayMongo payment flow states (Story 7.5)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Barber Matcher state (Help Me Choose feature)
  const [showBarberMatcher, setShowBarberMatcher] = useState(false);

  // Phase 3: Haptic feedback hook
  const haptic = useHaptic();

  // Pending payment polling states
  const [pendingPaymentSessionId, setPendingPaymentSessionId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentTypeState, setPaymentTypeState] = useState(null);
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
  const createPaymentRequest = useAction(
    api.services.payments.createPaymentRequest
  );
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

  // Wallet payment mutation - pays for booking using wallet balance and earns points
  const payBookingWithWallet = useMutation(api.services.wallet.payBookingWithWallet);

  // Wallet balance query for header display
  const walletData = useQuery(
    api.services.wallet.getWallet,
    user?._id ? { userId: user._id } : "skip"
  );

  // Handle payment status changes (polling for deferred booking)
  useEffect(() => {
    if (paymentStatus?.status === 'completed' && paymentStatus?.booking) {
      console.log('[ServiceBooking] Payment completed, booking created:', paymentStatus.booking);
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
      setStep(6);
    }
  }, [paymentStatus, selectedService, selectedStaff]);

  // Automatic payment status polling - checks every 5 seconds when waiting for payment
  useEffect(() => {
    if (!pendingPaymentSessionId) return;

    console.log('[ServiceBooking] Starting automatic payment status polling for:', pendingPaymentSessionId);

    const pollInterval = setInterval(async () => {
      try {
        console.log('[ServiceBooking] Auto-polling payment status...');
        const result = await checkPaymentStatus({ sessionId: pendingPaymentSessionId });
        console.log('[ServiceBooking] Auto-poll result:', result);

        if (result.status === 'paid' || result.status === 'already_paid') {
          console.log('[ServiceBooking] Payment confirmed via auto-poll!');
          // Payment confirmed! Create booking state and go to success
          setCreatedBooking({
            _id: result.bookingId,
            booking_code: result.bookingCode,
            service: selectedService,
            barber: selectedStaff,
            date: selectedDate,
            time: selectedTime,
            status: "booked",
            payment_status: paymentTypeState === 'pay_now' ? 'paid' : 'partial',
          });
          setPendingPaymentSessionId(null);
          localStorage.removeItem('pendingPaymongoSessionId');
          setStep(6); // Success step
        } else if (result.status === 'expired') {
          console.log('[ServiceBooking] Payment session expired');
          setPendingPaymentSessionId(null);
          localStorage.removeItem('pendingPaymongoSessionId');
        }
        // If status is 'pending', continue polling
      } catch (err) {
        console.error('[ServiceBooking] Auto-poll error:', err);
        // Don't stop polling on error, just log it
      }
    }, 5000); // Poll every 5 seconds

    // Cleanup interval on unmount or when session changes
    return () => {
      console.log('[ServiceBooking] Stopping automatic payment status polling');
      clearInterval(pollInterval);
    };
  }, [pendingPaymentSessionId, checkPaymentStatus, selectedService, selectedStaff, selectedDate, selectedTime, paymentTypeState]);

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

  // Phase 3: Haptic feedback on booking success
  useEffect(() => {
    if (step === 6) {
      haptic.success();
    }
  }, [step, haptic]);

  // Check for pre-selected barber from barber profile page or feed Quick Book
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
            // Auto-advance to barber selection step
            setStep(2);
            // Track that we came from Quick Book (skipped branch selection)
            setCameFromQuickBook(true);
          }
        }
      } catch (error) {
        console.error("Error parsing pre-selected barber:", error);
        sessionStorage.removeItem("preSelectedBarber");
      }
    }
  }, [branches, selectedBranch]);

  // Once we have barbers loaded and pre-selected barber data, auto-select barber and skip to service selection
  useEffect(() => {
    const preSelectedBarberData = sessionStorage.getItem("preSelectedBarber");
    if (preSelectedBarberData && barbers && barbers.length > 0 && selectedBranch) {
      try {
        const preSelectedBarber = JSON.parse(preSelectedBarberData);

        // Find the matching barber
        const matchingBarber = barbers.find(
          (barber) => barber._id === preSelectedBarber.barberId
        );

        if (matchingBarber && !selectedStaff) {
          // Auto-select the barber
          setSelectedStaff(matchingBarber);
          sessionStorage.setItem("barberId", matchingBarber._id);

          // Check if barber has custom booking enabled
          if (matchingBarber.custom_booking_enabled) {
            setCustomFormResponses({});
            setCustomFormCustomerName(user?.full_name || user?.nickname || "");
            setCustomFormCustomerEmail(user?.email || "");
            setCustomFormCustomerPhone(user?.mobile_number || user?.phone || "");
            setCustomBookingSuccess(null);
            setIsCustomBookingFlow(true);
          } else {
            setIsCustomBookingFlow(false);
          }

          // Skip directly to step 3 (service selection)
          setStep(3);

          // Clear the stored barber after using it
          sessionStorage.removeItem("preSelectedBarber");
        }
      } catch (error) {
        console.error("Error parsing pre-selected barber:", error);
        sessionStorage.removeItem("preSelectedBarber");
      }
    }
  }, [barbers, selectedBranch, selectedStaff, user]);

  // Quick Rebook: Pre-fill data from previous booking and skip to date/time selection
  useEffect(() => {
    if (prefillData?.rebookFrom && branches && !isRebookMode) {
      const rebook = prefillData.rebookFrom;
      console.log('[ServiceBooking] Quick Rebook mode - prefilling from:', rebook);

      // Find and set the branch
      const matchingBranch = branches.find(b => b._id === rebook.branch?._id || b._id === rebook.branch_id);
      if (matchingBranch) {
        setSelectedBranch(matchingBranch);
      }

      // Set the service - try to find full service from loaded services first
      if (rebook.service) {
        const serviceId = rebook.service._id || rebook.service;
        const fullService = services?.find(s => s._id === serviceId);
        setSelectedService(fullService || {
          _id: serviceId,
          name: rebook.service.name || rebook.serviceName,
          price: rebook.service.price || rebook.service_price,
          duration_minutes: rebook.service.duration || rebook.serviceDuration || 30,
        });
      }

      // Set the barber - try to find full barber from loaded barbers first (includes schedule)
      if (rebook.barber) {
        // Barber ID is available
        const barberId = rebook.barber._id || rebook.barber;
        const fullBarber = barbers?.find(b => b._id === barberId);
        setSelectedStaff(fullBarber || {
          _id: barberId,
          name: rebook.barber.name || rebook.barberName,
          full_name: rebook.barber.name || rebook.barberName,
        });
      } else if (rebook.barberName && rebook.barberName !== 'Any Available') {
        // Fallback: barber ID is null but we have the barber name (old bookings)
        // Try to find the barber by name
        const fullBarber = barbers?.find(b =>
          b.full_name === rebook.barberName || b.name === rebook.barberName
        );
        if (fullBarber) {
          console.log('[ServiceBooking] Found barber by name for rebook:', fullBarber.full_name);
          setSelectedStaff(fullBarber);
        } else {
          console.log('[ServiceBooking] Could not find barber by name:', rebook.barberName);
        }
      }

      // Mark as rebook mode and skip to date/time selection (step 4 for time)
      setIsRebookMode(true);
      setStep(4); // Go to time selection step
    }
  }, [prefillData, branches, barbers, services, isRebookMode]);

  // Update selected staff with full data once barbers load (for rebook mode)
  useEffect(() => {
    if (isRebookMode && selectedStaff && barbers && !selectedStaff.schedule) {
      const fullBarber = barbers.find(b => b._id === selectedStaff._id);
      if (fullBarber && fullBarber.schedule) {
        console.log('[ServiceBooking] Updating rebook barber with full schedule data');
        setSelectedStaff(fullBarber);
      }
    }
  }, [isRebookMode, selectedStaff, barbers]);

  // Reset QR code loading state and scroll to top when reaching success screen
  useEffect(() => {
    if (step === 6) {
      setQrCodeLoading(true);
      // Reset collapsible sections to collapsed state
      setShowQRSection(false);
      setShowDetailsSection(false);

      // Scroll to top using multiple methods for reliability
      // Method 1: Window scroll
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Method 2: Scroll the success ref into view (handles nested scrollable containers)
      setTimeout(() => {
        if (successRef.current) {
          successRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      // Method 3: Find and scroll parent container if exists
      const scrollableParent = document.querySelector('[data-booking-container]') ||
                               document.querySelector('.overflow-auto') ||
                               document.querySelector('.overflow-y-auto');
      if (scrollableParent) {
        scrollableParent.scrollTop = 0;
      }
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

    let startHour, startMin, endHour, endMin;

    // Check schedule type (specific dates vs weekly)
    if (selectedStaff.schedule_type === 'specific_dates' && selectedStaff.specific_dates) {
      // Use selectedDate directly (YYYY-MM-DD string) to avoid timezone issues
      const specificDate = selectedStaff.specific_dates.find(d => d.date === selectedDate);

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

      // If barber has schedule data, use it; otherwise fall back to branch hours (for rebook mode)
      if (barberSchedule) {
        if (!barberSchedule.available) {
          return []; // Barber explicitly not available this day
        }
        // Use barber's scheduled hours
        [startHour, startMin] = barberSchedule.start.split(':').map(Number);
        [endHour, endMin] = barberSchedule.end.split(':').map(Number);
      } else {
        // No barber schedule data (e.g., rebook mode) - fall back to branch hours
        startHour = selectedBranch?.booking_start_hour ?? 10;
        startMin = 0;
        endHour = selectedBranch?.booking_end_hour ?? 20;
        endMin = 0;
      }
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

      // Block slots less than 2 hours from now (minimum advance booking)
      if (isToday) {
        const nowMinutes = currentHour * 60 + currentMinute;
        const slotMinutes = hour * 60;
        if (slotMinutes < nowMinutes + 120) {
          available = false;
          reason = "too_soon";
        }
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

  // Auto-advance to tomorrow if today has no available slots (e.g., shift is over / 2-hour rule)
  React.useEffect(() => {
    const phTodayString = getPhilippineDateString();
    if (selectedDate !== phTodayString || !selectedStaff || !selectedBranch) return;
    if (timeSlots.length === 0) return; // Slots not generated yet

    const hasAvailable = timeSlots.some(s => s.available);
    if (!hasAvailable) {
      // Move to tomorrow
      const phNow = getPhilippineDate();
      phNow.setDate(phNow.getDate() + 1);
      const year = phNow.getFullYear();
      const month = String(phNow.getMonth() + 1).padStart(2, '0');
      const day = String(phNow.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
      setSelectedTime(null);
    }
  }, [timeSlots, selectedDate, selectedStaff, selectedBranch]);

  // Compute blocked (full-day) dates for the selected barber
  const blockedDates = React.useMemo(() => {
    if (!selectedStaff?.blocked_periods) return []
    return selectedStaff.blocked_periods
      .filter(p => !p.start_time && !p.end_time) // Full-day blocks only
      .map(p => p.date)
  }, [selectedStaff])

  // Check if the selected date is a full-day block for the barber
  const blockedPeriodForDate = React.useMemo(() => {
    if (!selectedStaff?.blocked_periods?.length || !selectedDate) return null
    return selectedStaff.blocked_periods.find(
      p => p.date === selectedDate && !p.start_time && !p.end_time
    ) || null
  }, [selectedStaff, selectedDate])

  // Compute weekday numbers where barber doesn't work (weekly schedule)
  const offDays = React.useMemo(() => {
    if (!selectedStaff?.schedule || selectedStaff.schedule_type === 'specific_dates') return []
    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }
    return Object.entries(selectedStaff.schedule)
      .filter(([, sched]) => sched && !sched.available)
      .map(([day]) => dayMap[day])
      .filter(n => n !== undefined)
  }, [selectedStaff])

  // Check if selected date is a regular schedule off-day (not vacation, just not working)
  const isBarberScheduledOff = React.useMemo(() => {
    if (!selectedStaff || !selectedDate || blockedPeriodForDate) return false
    if (selectedStaff.schedule_type === 'specific_dates' && selectedStaff.specific_dates) {
      const specificDate = selectedStaff.specific_dates.find(d => d.date === selectedDate)
      return !specificDate || !specificDate.available
    }
    const dateObj = new Date(selectedDate + 'T00:00:00')
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const barberSchedule = selectedStaff.schedule?.[dayOfWeek]
    return barberSchedule ? !barberSchedule.available : false
  }, [selectedStaff, selectedDate, blockedPeriodForDate])

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
      showAlert({ title: 'Missing Details', message: 'Please fill in all booking details', type: 'warning' });
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
        // Calculate booking fee for initial creation
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
      console.log("[ServiceBooking] Barber data being sent:", {
        selectedStaff_id: selectedStaff?._id,
        selectedStaff_name: selectedStaff?.full_name || selectedStaff?.name,
        selectedStaff_full: selectedStaff,
        booking_barber_field: bookingData.barber,
        barber_is_undefined: bookingData.barber === undefined,
      });

      // CRITICAL: Verify barber ID is being sent
      if (selectedStaff && !selectedStaff._id) {
        console.error("[ServiceBooking] WARNING: selectedStaff exists but has no _id!", selectedStaff);
      }

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
            customerName: user.full_name || user.nickname || user.username,
            customerPhone: user.mobile_number || user.phone,
            customerEmail: user.email,
            serviceName: selectedService?.name,
            servicePrice: selectedService?.price,
            bookingDate: selectedDate,
            bookingTime: formattedTime,
            branchName: selectedBranch?.name,
            bookingCode: null, // Will be generated by backend
            bookingType: 'regular'
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
          showAlert({
            title: 'Booking Confirmed',
            message: 'Booking confirmed! Note: Voucher status update encountered an issue. Please refresh to see the updated status.',
            type: 'warning'
          });
        }
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      showAlert({ title: 'Booking Failed', message: error.message || 'Failed to create booking. Please try again.', type: 'error' });
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
      showAlert({
        title: 'Payment Failed',
        message: `Payment failed: ${error.message}. Please try again or choose pay later.`,
        type: 'error'
      });
      return false; // Payment failed, don't proceed
    }
  };

  const handleBranchSelect = (branch) => {
    haptic.medium(); // Haptic feedback on selection
    setSelectedBranch(branch);
    // Reset selections when changing branch
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedTime(null);
    setStep(2);
  };

  const handleServiceSelect = (service) => {
    haptic.medium(); // Haptic feedback on selection
    setSelectedService(service);
    setStep(4);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setStep(5);
  };

  const handleStaffSelect = (barber) => {
    haptic.medium(); // Haptic feedback on selection
    // console.log("Selected Barber:", barber);
    console.log("Selected Barber ID:", barber._id);
    sessionStorage.setItem("barberId", barber._id);

    setSelectedStaff(barber); // keep full object

    // Check if barber has custom booking enabled
    if (barber.custom_booking_enabled) {
      // Reset custom form state and enter custom booking flow
      setCustomFormResponses({});
      setCustomFormCustomerName(user?.full_name || user?.nickname || "");
      setCustomFormCustomerEmail(user?.email || "");
      setCustomFormCustomerPhone(user?.mobile_number || user?.phone || "");
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
      if (paymentOption === "wallet") {
        // ============================================================
        // WALLET PAYMENT: Debit wallet, earn points, create booking (Customer Experience)
        // ============================================================
        console.log("Wallet payment selected - processing wallet payment");

        // Create booking first
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
          payment_status: "paid", // Wallet payment is immediate
          booking_fee: bookingFee,
        };

        const bookingId = await createBooking(bookingData);
        console.log("Booking created:", bookingId);

        // Calculate final price (service price - voucher discount + booking fee)
        const servicePrice = selectedVoucher?.value
          ? selectedService.price - selectedVoucher.value
          : selectedService.price;
        const finalPrice = servicePrice + bookingFee;

        // Process wallet payment (debit wallet + earn points)
        const walletResult = await payBookingWithWallet({
          userId: user._id,
          amount: finalPrice, // Includes service price + booking fee
          bookingId: bookingId,
          branchId: selectedBranch._id,
          serviceName: selectedService.name,
        });

        console.log("Wallet payment result:", walletResult);

        // Create booking object for UI
        const booking = {
          _id: bookingId,
          booking_code: null, // Will be populated by query
          service: selectedService,
          barber: selectedStaff,
          date: selectedDate,
          time: formattedTime,
          status: "booked",
          voucher_code: selectedVoucher?.code,
          payment_option: paymentOption,
          wallet_payment: true,
          points_earned: walletResult.pointsEarned?.totalPoints || 0,
        };
        setCreatedBooking(booking);

        // Send email notification to barber
        if (selectedStaff?.email) {
          try {
            await sendBarberBookingNotification({
              barberEmail: selectedStaff.email,
              barberName: selectedStaff.full_name || selectedStaff.name,
              customerName: user.full_name || user.nickname || user.username,
              customerPhone: user.mobile_number || user.phone,
              customerEmail: user.email,
              serviceName: selectedService?.name,
              servicePrice: selectedService?.price,
              bookingDate: selectedDate,
              bookingTime: formattedTime,
              branchName: selectedBranch?.name,
              bookingCode: null,
              bookingType: 'regular'
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
              user_id: user._id,
            });
          } catch (voucherError) {
            console.error("Voucher redemption error:", voucherError);
          }
        }

        setStep(6); // Go to success step
      } else if (paymentOption === "pay_at_shop") {
        // ============================================================
        // PAY AT SHOP: Create booking immediately (no payment required upfront)
        // ============================================================
        console.log("Pay at Shop selected - creating booking immediately");

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
              customerName: user.full_name || user.nickname || user.username,
              customerPhone: user.mobile_number || user.phone,
              customerEmail: user.email,
              serviceName: selectedService?.name,
              servicePrice: selectedService?.price,
              bookingDate: selectedDate,
              bookingTime: formattedTime,
              branchName: selectedBranch?.name,
              bookingCode: null,
              bookingType: 'regular'
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
              user_id: user._id,
            });
          } catch (voucherError) {
            console.error("Voucher redemption error:", voucherError);
          }
        }

        setStep(6); // Go to success step
      } else if (paymentOption === "combo_wallet_online") {
        // ============================================================
        // COMBO PAYMENT: Wallet + Online - Debit wallet first, then pay remainder online
        // ============================================================
        console.log("Combo payment selected - processing wallet debit then online payment");

        try {
          // Create deferred payment link with wallet portion info
          // The webhook will handle:
          // 1. Debiting wallet for the wallet portion
          // 2. Recording the online payment
          // 3. Creating the booking
          const result = await createPaymentLinkDeferred({
            customer_id: user._id,
            service_id: selectedService._id,
            barber_id: selectedStaff?._id || undefined,
            branch_id: selectedBranch._id,
            date: selectedDate,
            time: formattedTime,
            notes: selectedVoucher
              ? `Used voucher: ${selectedVoucher.code} (Combo payment: Wallet + Online)`
              : "Combo payment: Wallet + Online",
            voucher_id: selectedVoucher?._id || undefined,
            discount_amount: selectedVoucher?.value || undefined,
            customer_email: user.email,
            customer_name: user.full_name || user.nickname || user.username,
            booking_fee: bookingFee,
            price: selectedService.price,
            payment_type: "combo_wallet_online", // Special type for combo
            origin: window.location.origin,
            // Combo-specific fields - backend will calculate actual amounts
            is_combo_payment: true,
            use_wallet_balance: true,
          });

          console.log("Combo payment link created:", result);

          // Store session ID for polling
          localStorage.setItem('pendingPaymongoSessionId', result.sessionId);

          // Set pending payment state for polling
          setPendingPaymentSessionId(result.sessionId);
          setPaymentAmount(result.amount);
          setPaymentTypeState("combo_wallet_online");

          // Open PayMongo checkout in new tab
          window.open(result.checkoutUrl, '_blank');

          // Go to payment waiting step
          setStep(8);
        } catch (paymentError) {
          console.error("Combo payment creation failed:", paymentError);

          // Check if this is a minimum amount error - don't offer Pay at Shop for this
          const errorMessage = paymentError.message || "Unknown error";
          const isMinimumAmountError = errorMessage.includes("below minimum") || errorMessage.includes("minimum ₱100");

          if (isMinimumAmountError) {
            // For minimum amount errors, show a helpful message and return to payment options
            setError(`${errorMessage}\n\nPlease choose a different payment method (Pay Now, Pay Later, or Pay at Shop) or top up your wallet first.`);
            setPaymentProcessing(false);
            setShowPaymentModal(true); // Reopen payment modal to choose another option
            return;
          }

          // For other errors, offer Pay at Shop fallback with clear messaging
          const fallbackConfirmed = await showConfirm({
            title: 'Payment Failed',
            message: `Payment processing failed: ${errorMessage}\n\nWould you like to book now and PAY AT THE SHOP instead?\n\nYou'll pay ₱${(selectedService.price + bookingFee).toLocaleString()} at the branch.`,
            type: 'warning',
            confirmText: 'Pay at Shop',
            cancelText: 'Try Again'
          });

          if (fallbackConfirmed) {
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

            if (selectedVoucher?.code) {
              try {
                await redeemVoucher({
                  code: selectedVoucher.code,
                  user_id: user._id,
                });
              } catch (voucherError) {
                console.error("Voucher redemption error:", voucherError);
              }
            }

            setStep(6);
          } else {
            throw paymentError;
          }
        }
      } else {
        // ============================================================
        // PAY NOW / PAY LATER: Deferred booking - only create after payment succeeds
        // Booking is NOT created until payment webhook confirms success
        // ============================================================
        console.log("Creating deferred payment link for:", paymentOption);

        try {
          // Create payment link with booking data (booking will be created after payment)
          const result = await createPaymentLinkDeferred({
            customer_id: user._id,
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
            customer_email: user.email,
            customer_name: user.full_name || user.nickname || user.username,
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
          setPaymentTypeState(paymentOption);

          // Open PayMongo checkout in new tab (don't redirect - stay here to poll)
          window.open(result.checkoutUrl, '_blank');

          // Go to payment waiting step
          setStep(8);
        } catch (paymentError) {
          console.error("Payment link creation failed:", paymentError);

          // Offer Pay at Shop fallback (FR22)
          const fallbackConfirmed = await showConfirm({
            title: 'Payment Failed',
            message: `Payment processing failed: ${paymentError.message || "Unknown error"}\n\nWould you like to proceed with "Pay at Shop" instead? You can pay the full amount when you arrive at the branch.`,
            type: 'warning',
            confirmText: 'Pay at Shop',
            cancelText: 'Try Again'
          });

          if (fallbackConfirmed) {
            // Create booking with pay_at_shop flow
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
                  user_id: user._id,
                });
              } catch (voucherError) {
                console.error("Voucher redemption error:", voucherError);
              }
            }

            setStep(6);
          } else {
            throw paymentError;
          }
        }
      }
    } catch (error) {
      console.error("Error in payment flow:", error);
      setError(error.message || "Failed to process booking. Please try again.");
      // Reopen payment modal so user can choose a different payment method
      setShowPaymentModal(true);
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
        return "Confirm Booking";
      case 6:
        return "Booking Confirmed";
      default:
        return "Book Service";
    }
  };

  const renderStepIndicator = () => {
    // For custom booking flow, show only 3 steps: Branch -> Barber -> Custom Form
    const totalSteps = isCustomBookingFlow ? 3 : 5;

    // Hide step indicator on success page
    if (customBookingSuccess && isCustomBookingFlow) {
      return null;
    }
    if (step === 6 || step === 8) {
      return null; // Hide on success and payment pending screens
    }

    // Step labels for accessibility
    const stepLabels = isCustomBookingFlow
      ? [{ label: 'Branch' }, { label: 'Barber' }, { label: 'Form' }]
      : [{ label: 'Branch' }, { label: 'Barber' }, { label: 'Service' }, { label: 'Time' }, { label: 'Confirm' }];

    return (
      <div className="py-4 px-4">
        <StepProgressDots
          currentStep={step}
          totalSteps={totalSteps}
          steps={stepLabels}
          size="default"
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
        <FadeIn className="px-4 pb-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="h-8 w-48 bg-[#2A2A2A] rounded-lg mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-[#2A2A2A] rounded animate-pulse" />
          </div>
          <ServiceCardSkeleton count={4} />
        </FadeIn>
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
      <FadeIn direction="up" duration={300}>
        <div className="px-4 pb-6 max-w-2xl mx-auto">
          {/* Header */}
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
      </FadeIn>
    );
  };

  const renderTimeSelection = () => {
    // Transform timeSlots to format expected by TimeSlotPills
    const transformedSlots = timeSlots.map(slot => ({
      time: slot.time,
      available: slot.available,
      popular: slot.time === '10:00' || slot.time === '14:00' || slot.time === '11:00' // Mark popular times
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
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
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
            blockedDates={blockedDates}
            offDays={offDays}
          />
        </div>

        {/* Date Error Message */}
        {dateError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-400 text-sm font-medium">{dateError}</p>
          </div>
        )}

        {/* Vacation / Day Off Banner */}
        {selectedDate && blockedPeriodForDate && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <Palmtree className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-amber-400 font-semibold text-sm">
                {selectedStaff?.name || 'Barber'} is away on this date
              </p>
              <p className="text-gray-400 text-xs">
                {blockedPeriodForDate.reason || 'Day off'} — Please select another date
              </p>
            </div>
          </div>
        )}

        {/* Schedule Off-Day Banner */}
        {selectedDate && !blockedPeriodForDate && isBarberScheduledOff && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-amber-400 font-semibold text-sm">
                {selectedStaff?.name || 'Barber'} doesn't work on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}s
              </p>
              <p className="text-gray-400 text-xs">
                Please select another date
              </p>
            </div>
          </div>
        )}

        {/* Modern Time Slot Pills */}
        {selectedDate && !blockedPeriodForDate && !isBarberScheduledOff && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--color-primary)]" />
              Select Time
            </h3>

            {loadingTimeSlots || existingBookings === undefined ? (
              <FadeIn>
                <TimeSlotSkeleton count={8} />
              </FadeIn>
            ) : (
              <TimeSlotPills
                slots={transformedSlots}
                selectedTime={selectedTime}
                onTimeSelect={(time) => setSelectedTime(time)}
                showFilters={timeSlots.length > 6}
              />
            )}
          </div>
        )}

        {/* Continue Button */}
        {selectedDate && selectedTime && (
          <button
            onClick={() => setStep(5)}
            disabled={!!dateError || !selectedTime}
            className={`w-full py-4 font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 ${!dateError && selectedTime
              ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              : "bg-[#1A1A1A] text-gray-500 border border-[#2A2A2A] cursor-not-allowed"
              }`}
          >
            <CheckCircle className="w-5 h-5" />
            Continue to Confirmation
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

        {/* Help Me Choose Button */}
        <button
          onClick={() => setShowBarberMatcher(true)}
          className="mt-4 px-5 py-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full text-sm font-semibold text-purple-400 hover:text-white hover:border-purple-500/50 transition-all flex items-center gap-2 mx-auto"
        >
          <span className="text-lg">✨</span>
          Not sure? Help me choose
        </button>
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

  const renderConfirmation = () => (
    <div className="px-4 pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">
          Confirm Your Booking
        </h2>
        <p className="text-sm text-gray-400">
          Please review your appointment details
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        {/* Service Details Header */}
        <div className="text-center p-5 border-b border-[#2A2A2A] bg-gradient-to-b from-[#1F1F1F] to-[#1A1A1A]">
          <h3 className="text-xl font-bold text-white mb-1">
            {selectedService?.name}
          </h3>
          <div className="flex justify-center items-center gap-3">
            <span
              className="font-bold text-lg"
              style={{ color: branding?.primary_color || "#F68B24" }}
            >
              {selectedService?.hide_price ? 'Price may vary' : `₱${selectedService?.price.toLocaleString()}`}
            </span>
            {selectedService?.duration && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400 text-sm">
                  {selectedService?.duration}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between py-2 px-3 bg-[#0F0F0F] rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: hexToRgba(branding?.primary_color || "#F68B24", 0.15) }}
              >
                <Building className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
              </div>
              <span className="text-gray-400 text-sm">Branch</span>
            </div>
            <span className="font-semibold text-white text-sm">
              {selectedBranch?.name}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-[#0F0F0F] rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: hexToRgba(branding?.primary_color || "#F68B24", 0.15) }}
              >
                <Calendar className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
              </div>
              <span className="text-gray-400 text-sm">Date & Time</span>
            </div>
            <span className="font-semibold text-white text-sm">
              {selectedDate === getPhilippineDateString() ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}, {formatTime(selectedTime)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-[#0F0F0F] rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: hexToRgba(branding?.primary_color || "#F68B24", 0.15) }}
              >
                <User className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
              </div>
              <span className="text-gray-400 text-sm">Your Barber</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedStaff && (
                <BarberAvatar barber={selectedStaff} className="w-6 h-6" />
              )}
              <span className="font-semibold text-white text-sm">
                {selectedStaff?.full_name || selectedStaff?.name || "Any Barber"}
              </span>
            </div>
          </div>
        </div>

        {/* Voucher Selection */}
        <div className="p-4 border-t border-[#2A2A2A]">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
            Apply Voucher (Optional)
          </h4>

          {getAvailableVouchers().length > 0 ? (
            <div className="space-y-2">
              <div className="max-h-32 overflow-y-auto space-y-2">
                {getAvailableVouchers().map((voucher) => (
                  <button
                    key={voucher._id}
                    onClick={() =>
                      setSelectedVoucher(
                        selectedVoucher?._id === voucher._id ? null : voucher
                      )
                    }
                    className="w-full p-3 rounded-lg border transition-all duration-200 text-left"
                    style={{
                      borderColor:
                        selectedVoucher?._id === voucher._id
                          ? (branding?.primary_color || "#F68B24")
                          : "#2A2A2A",
                      backgroundColor:
                        selectedVoucher?._id === voucher._id
                          ? hexToRgba(branding?.primary_color || "#F68B24", 0.1)
                          : "#0F0F0F",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: hexToRgba(branding?.primary_color || "#F68B24", 0.2) }}
                        >
                          <Gift className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {voucher.code}
                          </p>
                          <p className="text-xs" style={{ color: branding?.primary_color || "#F68B24" }}>
                            Save ₱{parseFloat(voucher.value || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {selectedVoucher?._id === voucher._id && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedVoucher && (
                <div
                  className="text-xs p-3 rounded-lg flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: hexToRgba(branding?.primary_color || "#F68B24", 0.1),
                    color: branding?.primary_color || "#F68B24"
                  }}
                >
                  <Banknote className="w-4 h-4" />
                  <span className="font-medium">You'll save ₱{parseFloat(selectedVoucher.value || 0).toFixed(2)} with this voucher!</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 bg-[#0F0F0F] rounded-lg">
              <p className="text-xs text-gray-500">
                No vouchers available
              </p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="p-4 border-t border-[#2A2A2A] bg-[#0F0F0F]">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4" style={{ color: branding?.primary_color || "#F68B24" }} />
            Payment Summary
          </h4>
          <div className="space-y-2">
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
            <div className="border-t border-[#2A2A2A] pt-2 mt-2 flex justify-between items-center">
              <span className="font-bold text-white">Total Amount</span>
              <span className="font-bold text-lg" style={{ color: branding?.primary_color || "#F68B24" }}>
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

        {/* Action Buttons */}
        <div className="p-4 border-t border-[#2A2A2A] space-y-3">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={bookingLoading || paymentProcessing}
            className={`w-full py-3.5 px-4 text-white font-bold rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 shadow-lg ${bookingLoading || paymentProcessing ? "opacity-75 cursor-not-allowed" : "hover:opacity-90"
              }`}
            style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
          >
            {bookingLoading || paymentProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>{paymentProcessing ? "Processing Payment..." : "Booking..."}</span>
              </div>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Book Now</span>
              </>
            )}
          </button>

          <button
            onClick={() => setStep(4)}
            disabled={paymentProcessing}
            className="w-full py-3 px-4 border border-[#2A2A2A] text-gray-400 hover:bg-[#0F0F0F] hover:text-white font-semibold rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back to Edit Details</span>
          </button>
        </div>
      </div>
    </div>
  );

  // State for collapsible sections in success screen
  const [showQRSection, setShowQRSection] = useState(false);
  const [showDetailsSection, setShowDetailsSection] = useState(false);
  const [showFullscreenQR, setShowFullscreenQR] = useState(false);

  const renderBookingSuccess = () => {
    // Calculate points earned (estimate based on service price)
    const estimatedPoints = Math.floor((selectedService?.price || 0) / 10);

    // Calculate total for quick display
    const totalAmount = createdBooking?.total_amount
      ? parseFloat(createdBooking.total_amount)
      : Math.max(0, (selectedService?.price || 0) - (selectedVoucher?.value || 0)) +
        (selectedBranch?.enable_booking_fee ? (selectedBranch?.booking_fee_amount || 0) : 0);

    return (
      <div ref={successRef}>
      <SuccessConfetti
        show={step === 6}
        title="You're all set!"
        subtitle="Your booking has been confirmed"
        pointsEarned={estimatedPoints}
      >
        <div className="space-y-4 px-4">
          {/* Quick Summary Card - Always Visible */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-2xl">
                  {selectedService?.image || '✂️'}
                </div>
                <div>
                  <h4 className="font-bold text-white">{selectedService?.name}</h4>
                  <p className="text-sm text-gray-400">{selectedStaff?.full_name || selectedStaff?.name || 'Any Barber'}</p>
                </div>
              </div>
              {/* Payment Status Badge */}
              {getBookingById?.payment_status === 'paid' && (
                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">PAID</span>
              )}
              {getBookingById?.payment_status === 'partial' && (
                <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">PARTIAL</span>
              )}
              {getBookingById?.payment_status === 'unpaid' && (
                <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">PAY AT SHOP</span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  {createdBooking?.date ? new Date(createdBooking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{formatTime(createdBooking?.time || selectedTime)}</span>
              </div>
              <div className="font-bold text-lg" style={{ color: branding?.primary_color || '#F68B24' }}>
                ₱{totalAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Booking Code - Prominent */}
          <div className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 rounded-2xl p-4 border border-[var(--color-primary)]/30 text-center">
            <p className="text-xs text-gray-400 mb-1">BOOKING CODE</p>
            <p className="text-2xl font-black tracking-wider" style={{ color: branding?.primary_color || '#F68B24' }}>
              {getBookingById?.booking_code || (
                <span className="inline-flex items-center gap-2">
                  <span className="text-gray-400 text-lg">Generating...</span>
                  <div className="animate-pulse w-2 h-2 bg-[var(--color-primary)] rounded-full"></div>
                </span>
              )}
            </p>
          </div>

          {/* Collapsible QR Code Section */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
            <button
              onClick={() => setShowQRSection(!showQRSection)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#222] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-gray-400" />
                </div>
                <span className="font-semibold text-white">{showQRSection ? 'Hide' : 'Show'} QR Code</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showQRSection ? 'rotate-180' : ''}`} />
            </button>

            {/* Always render canvas (for QR generation) but only show content when expanded */}
            <div className={`overflow-hidden transition-all duration-300 ${showQRSection ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 pb-4 pt-2 border-t border-[#2A2A2A]">
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowFullscreenQR(true)}
                    className="p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-[var(--color-primary)] transition-colors cursor-pointer active:scale-95"
                  >
                    <div className="relative w-40 h-40">
                      {(qrCodeLoading || !getBookingById?.booking_code) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white rounded-lg z-10">
                          <div className="text-center space-y-2">
                            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                            <p className="text-xs text-gray-600">Loading...</p>
                          </div>
                        </div>
                      )}
                      <canvas
                        ref={qrRef}
                        className="rounded-lg w-full h-full"
                        style={{ display: qrCodeLoading || !getBookingById?.booking_code ? 'none' : 'block' }}
                      ></canvas>
                    </div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">Tap QR to enlarge for scanning</p>
              </div>
            </div>
          </div>

          {/* Collapsible Details Section */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
            <button
              onClick={() => setShowDetailsSection(!showDetailsSection)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#222] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-gray-400" />
                </div>
                <span className="font-semibold text-white">Booking Details</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showDetailsSection ? 'rotate-180' : ''}`} />
            </button>

            {showDetailsSection && (
              <div className="px-4 pb-4 pt-2 border-t border-[#2A2A2A] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Branch</span>
                  <span className="text-white font-medium">{selectedBranch?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Service</span>
                  <span className="text-white font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Date & Time</span>
                  <span className="text-white font-medium">
                    {createdBooking?.date ? new Date(createdBooking.date).toLocaleDateString() : 'Today'}, {formatTime(createdBooking?.time || selectedTime)}
                  </span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-400">Barber</span>
                  <div className="flex items-center gap-2">
                    {selectedStaff && <BarberAvatar barber={selectedStaff} className="w-6 h-6" />}
                    <span className="text-white font-medium">{selectedStaff?.full_name || selectedStaff?.name || 'Any Barber'}</span>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="border-t border-[#2A2A2A] pt-2 mt-2 space-y-2">
                  {selectedVoucher && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="text-gray-500 line-through">₱{selectedService?.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Voucher</span>
                        <span className="text-green-400">-₱{parseFloat(selectedVoucher.value || 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {selectedBranch?.enable_booking_fee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Booking Fee</span>
                      <span className="text-white">₱{(selectedBranch.booking_fee_amount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1">
                    <span className="text-white">Total</span>
                    <span style={{ color: branding?.primary_color || '#F68B24' }}>₱{totalAmount.toLocaleString()}</span>
                  </div>

                  {/* Payment status details */}
                  {getBookingById?.payment_status === 'paid' && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span>Amount Paid</span>
                      <span>₱{totalAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {getBookingById?.payment_status === 'partial' && (
                    <>
                      <div className="flex justify-between text-sm text-green-400">
                        <span>Fee Paid</span>
                        <span>₱{(getBookingById.convenience_fee_paid || getBookingById.booking_fee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-yellow-400">
                        <span>Due at Branch</span>
                        <span>₱{(getBookingById.service_price || selectedService?.price || 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {getBookingById?.payment_status === 'unpaid' && (
                    <div className="flex justify-between text-sm text-blue-400">
                      <span>Due at Branch</span>
                      <span>₱{totalAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onBack}
              className="w-full py-4 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: branding?.primary_color || "#F68B24" }}
            >
              Back to Home
            </button>
            <button
              onClick={() => onBack?.("bookings")}
              className="w-full py-3 border-2 font-bold rounded-2xl transition-all duration-200 active:scale-[0.98]"
              style={{ borderColor: branding?.primary_color || "#F68B24", color: branding?.primary_color || "#F68B24" }}
            >
              View My Bookings
            </button>
          </div>

          {/* Fullscreen QR Modal */}
          {showFullscreenQR && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{
                backgroundColor: '#FFFFFF',
                animation: 'flashIn 0.3s ease-out'
              }}
            >
              {/* Flash effect styles */}
              <style>{`
                @keyframes flashIn {
                  0% { opacity: 0; }
                  30% { opacity: 1; background-color: #FFFFFF; }
                  100% { opacity: 1; background-color: #FFFFFF; }
                }
              `}</style>

              {/* Close Button - Fixed position, properly aligned */}
              <button
                onClick={() => setShowFullscreenQR(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: branding?.primary_color || '#F68B24',
                  color: '#FFFFFF'
                }}
              >
                <X className="w-5 h-5" />
              </button>

              {/* QR Code Container */}
              <div className="flex flex-col items-center px-6" onClick={() => setShowFullscreenQR(false)}>
                {/* Large QR Code */}
                <div
                  className="p-5 rounded-2xl shadow-xl"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `3px solid ${branding?.primary_color || '#F68B24'}`
                  }}
                >
                  <div className="w-56 h-56 sm:w-64 sm:h-64 relative">
                    {getBookingById?.booking_code && (
                      <canvas
                        ref={(el) => {
                          if (el && getBookingById?.booking_code) {
                            // Re-render QR at larger size with branding color
                            QRCode.toCanvas(
                              el,
                              getBookingById.booking_code,
                              {
                                width: 256,
                                margin: 1,
                                color: {
                                  dark: branding?.primary_color || '#F68B24',
                                  light: '#FFFFFF'
                                },
                                errorCorrectionLevel: "H",
                              },
                              (error) => {
                                if (error) console.error("Fullscreen QR error:", error);
                              }
                            );
                          }
                        }}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </div>

                {/* Booking Code */}
                <div className="mt-6 text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Booking Code</p>
                  <p
                    className="text-3xl font-black tracking-widest"
                    style={{ color: branding?.primary_color || '#F68B24' }}
                  >
                    {getBookingById?.booking_code}
                  </p>
                </div>

                {/* Service Info */}
                <div className="mt-4 text-center">
                  <p className="font-semibold text-gray-800">{selectedService?.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {createdBooking?.date ? new Date(createdBooking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today'} • {formatTime(createdBooking?.time || selectedTime)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedStaff?.full_name || selectedStaff?.name || 'Any Barber'}
                  </p>
                </div>

                {/* Tap hint */}
                <p className="mt-8 text-xs text-gray-400">Tap anywhere to close</p>
              </div>
            </div>
          )}
        </div>
      </SuccessConfetti>
      </div>
    );
  };

  // Render payment pending state (step 8)
  const renderPaymentPending = () => {
    const isPending = paymentStatus?.status === 'pending' || paymentStatus?.status === 'paid';
    const pendingData = paymentStatus?.pendingPayment;

    return (
      <div className="space-y-6">
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
                {paymentTypeState === 'pay_now' ? 'Full Payment' : 'Convenience Fee'}
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
                console.log('[ServiceBooking] Manually checking payment status for:', pendingPaymentSessionId);
                const result = await checkPaymentStatus({ sessionId: pendingPaymentSessionId });
                console.log('[ServiceBooking] Manual check result:', result);

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
                    payment_status: paymentTypeState === 'pay_now' ? 'paid' : 'partial',
                  });
                  setPendingPaymentSessionId(null);
                  localStorage.removeItem('pendingPaymongoSessionId');
                  setStep(6); // Success step
                } else if (result.status === 'pending') {
                  // Still pending - inform user
                  showAlert({ title: 'Payment Pending', message: 'Payment is still processing. Please complete the payment in the payment window and try again.', type: 'info' });
                } else if (result.status === 'expired') {
                  showAlert({ title: 'Session Expired', message: 'Payment session has expired. Please start a new booking.', type: 'error' });
                  setPendingPaymentSessionId(null);
                  localStorage.removeItem('pendingPaymongoSessionId');
                  setStep(5);
                } else {
                  showAlert({ title: 'Verification Failed', message: result.error || 'Could not verify payment status. Please try again.', type: 'error' });
                }
              } catch (err) {
                console.error('[ServiceBooking] Manual check error:', err);
                showAlert({ title: 'Error', message: 'Error checking payment: ' + (err.message || 'Unknown error'), type: 'error' });
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
              setStep(5);
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

  // Custom booking form page content (not modal)
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
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => {
                // Handle back navigation based on current step
                if (step === 1) {
                  // On first step, exit to home
                  onBack();
                } else if (step === 6) {
                  // On success step, exit to home
                  onBack();
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
                  // Go to previous step
                  // Step flow: 1 (branch) -> 2 (barber) -> 3 (service) -> 4 (date/time) -> 5 (confirm)

                  // If on step 2 and came from Quick Book, go back to home
                  if (step === 2 && cameFromQuickBook) {
                    onBack();
                    return;
                  }

                  setStep(step - 1);
                  // Reset relevant selections when going back
                  if (step === 2) {
                    setSelectedBranch(null);
                  } else if (step === 3) {
                    setSelectedStaff(null);
                  } else if (step === 4) {
                    setSelectedService(null);
                  } else if (step === 5) {
                    setSelectedTime(null);
                  }
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="flex items-center gap-3">
              {/* Wallet Balance Badge (for logged-in users) */}
              {isAuthenticated && walletData && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">
                    ₱{(((walletData.balance || 0) + (walletData.bonus_balance || 0)) / 100).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="text-right">
                <p className="text-lg font-bold text-white">
                  {isCustomBookingFlow ? "Custom Booking" : "Book Service"}
                </p>
                <p className="text-xs text-[var(--color-primary)]">
                  {isCustomBookingFlow
                    ? (customBookingSuccess ? "Complete" : `Step ${step} of 3`)
                    : `Step ${step} of 5`
                  }
                </p>
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
        {step === 2 && renderStaffSelection()}
        {step === 3 && (isCustomBookingFlow ? renderCustomBookingForm() : renderServiceSelection())}
        {step === 4 && renderTimeSelection()}
        {step === 5 && renderConfirmation()}
        {step === 6 && renderBookingSuccess()}
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

      {/* Barber Matcher Quiz (Help Me Choose feature) */}
      {showBarberMatcher && (
        <MatcherQuiz
          userId={user?._id}
          branchId={selectedBranch?._id}
          onClose={() => setShowBarberMatcher(false)}
          onBookBarber={(matchedBarber) => {
            // Find the full barber object from our barbers list
            const fullBarber = barbers?.find(b => b._id === matchedBarber.barberId);
            if (fullBarber) {
              handleStaffSelect(fullBarber);
            }
            setShowBarberMatcher(false);
          }}
        />
      )}
    </div>
  );
};

export default ServiceBooking;
