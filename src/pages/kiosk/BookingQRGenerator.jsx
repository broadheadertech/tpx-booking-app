import React, { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { QrCode, RefreshCw, CheckCircle, ArrowLeft, Clock, User, Calendar, Scissors, Star, Crown, Sparkles, Shield, Zap, XCircle } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// Barber Avatar Component
const BarberAvatar = ({ barber, className = "w-12 h-12" }) => {
  const [imageError, setImageError] = useState(false)

  // Get image URL from Convex storage if available
  const imageUrlFromStorage = barber.avatarStorageId ?
    useQuery(api.services.barbers.getImageUrl, {
      storageId: barber.avatarStorageId
    }) :
    null

  // Use storage URL if available, otherwise fallback to regular avatar or default
  const imageSrc = imageUrlFromStorage || barber.avatarUrl || '/img/avatar_default.jpg'

  if (imageError || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-600 rounded-full ${className}`}>
        <User className="w-6 h-6 text-gray-300" />
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

function BookingQRGenerator() {
  const [selectedService, setSelectedService] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [step, setStep] = useState(1) // 1: services, 2: barber & time, 3: customer info, 4: confirmation, 5: success
  const [bookingQrUrl, setBookingQrUrl] = useState('')
  const [isGeneratingBooking, setIsGeneratingBooking] = useState(false)
  const [createdBooking, setCreatedBooking] = useState(null)
  const [error, setError] = useState(null)
  const [qrCodeLoading, setQrCodeLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const qrRef = useRef(null)

  // Convex queries and mutations
  const services = useQuery(api.services.services.getActiveServices)
  const barbers = useQuery(api.services.barbers.getActiveBarbers)
  const createWalkInBookingMutation = useMutation(api.services.bookings.createWalkInBooking)
  
  // Query to get booking details after creation
  const getBookingById = useQuery(
    api.services.bookings.getBookingById, 
    createdBooking?._id ? { id: createdBooking._id } : "skip"
  )
  
  // Query to get existing bookings for selected barber and today
  const today = new Date().toISOString().split('T')[0]
  const existingBookings = useQuery(
    api.services.bookings.getBookingsByBarberAndDate,
    selectedBarber && today 
      ? { barberId: selectedBarber._id, date: today }
      : "skip"
  )

  const loading = services === undefined || barbers === undefined

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
    getBookingById?.booking_code,
    selectedService,
    selectedBarber,
  ]);

  // Generate time slots for today
  const timeSlots = React.useMemo(() => {
    if (!selectedBarber) return [];
    
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    const currentDate = new Date();
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();
    
    // Get booked times for this barber today
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
        if (hour < currentHour || (hour === currentHour && minute <= currentMinute)) {
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
  }, [selectedBarber, existingBookings]);

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

  const handleCreateBooking = async () => {
    if (!selectedService || !selectedTime || !selectedBarber || !customerName.trim()) {
      alert("Please fill in all required booking details including customer name");
      return;
    }

    try {
      setIsGeneratingBooking(true);

      // Format time to include seconds for API compatibility
      const formattedTime = selectedTime.includes(":")
        ? `${selectedTime}:00`
        : selectedTime;

      const bookingData = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        service: selectedService._id,
        barber: selectedBarber._id,
        date: today,
        time: formattedTime,
        status: "pending",
        notes: `Kiosk walk-in booking for ${selectedService.name}`,
      };

      console.log("Creating walk-in booking with data:", bookingData);
      const bookingId = await createWalkInBookingMutation(bookingData);

      // Create initial booking object - actual data will be fetched via getBookingById
      const booking = {
        _id: bookingId,
        booking_code: null, // Will be populated by getBookingById query
        service: selectedService,
        barber: selectedBarber,
        date: today,
        time: formattedTime,
        status: "pending",
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
      };
      setCreatedBooking(booking);
      setStep(5); // Success step

    } catch (error) {
      console.error("Error creating booking:", error);
      alert(error.message || "Failed to create booking. Please try again.");
    } finally {
      setIsGeneratingBooking(false);
    }
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedTime(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setStep(1);
    setCreatedBooking(null);
    setBookingQrUrl('');
    setError(null);
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>TPX Barbershop - Booking QR Code</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .header { 
              color: #36454F; 
              margin-bottom: 20px; 
            }
            .qr-container { 
              margin: 20px 0; 
            }
            .service-info { 
              background: #F0F8FF; 
              padding: 15px; 
              border-radius: 10px; 
              margin: 20px 0; 
              border: 1px solid #E0E0E0;
            }
            .footer { 
              color: #8B8B8B; 
              font-size: 12px; 
              margin-top: 30px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TPX Barbershop</h1>
            <h2>Booking Confirmation</h2>
          </div>
          <div class="service-info">
            <h3>Service: ${selectedService?.name}</h3>
            <p>Price: ₱${selectedService?.price}</p>
            <p>Barber: ${selectedBarber?.full_name || selectedBarber?.name}</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p>Time: ${selectedTime}</p>
          </div>
          <div class="qr-container">
            <canvas ref="qrCanvas"></canvas>
          </div>
          <div class="footer">
            <p>Show this QR code at the kiosk to confirm your appointment</p>
            <p>Thank you for choosing TPX Barbershop!</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // Step indicator component
  const renderStepIndicator = () => (
    <div className="flex justify-center mb-6">
      <div className="flex items-center space-x-3">
        {[1, 2, 3, 4].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step >= stepNumber ? "text-white shadow-md" : "text-gray-500"
              }`}
              style={{
                backgroundColor: step >= stepNumber ? "#FF8C42" : "#444444",
              }}
            >
              {step > stepNumber ? "✓" : stepNumber}
            </div>
            {stepNumber < 4 && (
              <div
                className={`w-8 h-0.5 mx-1 rounded transition-all duration-300`}
                style={{
                  backgroundColor: step > stepNumber ? "#FF8C42" : "#444444",
                }}
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF8C42] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-white">Loading Services...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/20">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-white">Error Loading Data</h3>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 text-white font-bold rounded-xl transition-colors duration-200 bg-[#FF8C42] hover:bg-[#E67A1F]"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      {step < 5 && renderStepIndicator()}
      
      {step === 1 && (
        /* Service Selection */
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 shadow-xl border border-[#444444]/50">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Choose Your Service</h2>
            <p className="text-gray-300">Select the service you'd like to book</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {services && services.map((service) => (
              <button
                key={service._id}
                onClick={() => {
                  setSelectedService(service);
                  setSelectedBarber(null);
                  setSelectedTime(null);
                  setStep(2);
                }}
                className="group relative w-full bg-gradient-to-br from-[#1A1A1A]/50 to-[#2A2A2A]/50 rounded-xl p-4 border-2 border-[#444444]/50 hover:border-[#FF8C42]/50 transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="rounded-full w-12 h-12 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
                      {getServiceIcon(service.name)}
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-bold text-white group-hover:text-[#FF8C42] transition-colors duration-200">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {service.description || "Professional grooming service"}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-400">
                          {service.duration_minutes ? `${service.duration_minutes} min` : "Duration varies"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="rounded-xl px-3 py-2 bg-[#FF8C42]/20 border border-[#FF8C42]/30">
                      <div className="text-base font-bold text-[#FF8C42]">
                        ₱{parseFloat(service.price || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        /* Barber & Time Selection */
        <div className="space-y-6">
          {/* Selected Service Summary */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-4 border border-[#444444]/50">
            <div className="flex items-center space-x-3">
              <div className="rounded-full w-10 h-10 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center">
                {getServiceIcon(selectedService?.name)}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">{selectedService?.name}</h3>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="font-bold text-[#FF8C42]">₱{selectedService?.price.toLocaleString()}</span>
                  <span className="font-medium text-gray-400">{selectedService?.duration_minutes} min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barber Selection */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-6 border border-[#444444]/50">
            <h3 className="text-xl font-bold mb-4 text-white">Choose Your Barber</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getAvailableBarbers().length > 0 ? (
                getAvailableBarbers().map((barber) => (
                  <button
                    key={barber._id}
                    onClick={() => {
                      setSelectedBarber(barber);
                      setSelectedTime(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                      selectedBarber?._id === barber._id
                        ? 'border-[#FF8C42] bg-[#FF8C42]/10'
                        : 'border-[#444444]/50 bg-[#1A1A1A]/50 hover:border-[#FF8C42]/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <BarberAvatar barber={barber} className="w-12 h-12" />
                      <div className="flex-1">
                        <h4 className="font-bold text-white">
                          {barber.full_name || barber.name || "Professional Barber"}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex text-yellow-400 text-xs">★★★★★</div>
                          <span className="text-xs text-gray-400">5.0 • Professional</span>
                        </div>
                      </div>
                      {selectedBarber?._id === barber._id && (
                        <CheckCircle className="w-5 h-5 text-[#FF8C42]" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-2 text-center py-6">
                  <p className="text-[#FF8C42] font-medium">No barbers available for this service</p>
                  <button
                    onClick={() => setStep(1)}
                    className="mt-3 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1F] transition-colors"
                  >
                    Choose Different Service
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Time Selection */}
          {selectedBarber && (
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-6 border border-[#444444]/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Available Times</h3>
                <span className="text-sm text-gray-400">Today - {new Date().toLocaleDateString()}</span>
              </div>
              
              {timeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#FF8C42] font-medium">No available times today</p>
                  <p className="text-gray-400 text-sm mt-1">Please try again tomorrow</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg font-semibold text-center transition-all duration-200 border text-sm ${
                          slot.available
                            ? selectedTime === slot.time
                              ? 'bg-[#FF8C42] text-white border-[#FF8C42]'
                              : 'bg-[#1A1A1A]/50 text-white border-[#444444]/50 hover:border-[#FF8C42]/50'
                            : 'bg-gray-600/30 text-gray-500 border-gray-600/30 cursor-not-allowed'
                        }`}
                        title={slot.available ? `Book at ${slot.displayTime}` : `${slot.displayTime} - ${slot.reason === 'past' ? 'Past time' : 'Already booked'}`}
                      >
                        {slot.displayTime}
                      </button>
                    ))}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded bg-[#1A1A1A]/50 border border-[#444444]/50"></div>
                      <span className="text-gray-400">Available</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded bg-[#FF8C42]"></div>
                      <span className="text-gray-400">Selected</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded bg-gray-600/30"></div>
                      <span className="text-gray-400">Unavailable</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 px-4 border border-[#444444] text-gray-300 rounded-xl hover:bg-[#1A1A1A]/50 transition-all duration-200"
            >
              ← Back to Services
            </button>
            {selectedTime && selectedBarber && (
               <button
                 onClick={() => setStep(3)}
                 className="flex-1 py-3 px-4 bg-[#FF8C42] text-white font-bold rounded-xl hover:bg-[#E67A1F] transition-all duration-200"
               >
                 Continue to Customer Info
               </button>
             )}
          </div>
        </div>
      )}

      {step === 3 && (
         /* Customer Information */
         <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-6 border border-[#444444]/50">
           <div className="text-center mb-6">
             <h2 className="text-2xl font-bold text-white mb-2">Customer Information</h2>
             <p className="text-gray-300">Please provide your contact details</p>
           </div>

           <div className="space-y-4 mb-6">
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">
                 Full Name <span className="text-red-400">*</span>
               </label>
               <input
                 type="text"
                 value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
                 placeholder="Enter your full name"
                 className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C42] focus:ring-1 focus:ring-[#FF8C42] transition-colors"
                 required
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">
                 Phone Number (Optional)
               </label>
               <input
                 type="tel"
                 value={customerPhone}
                 onChange={(e) => setCustomerPhone(e.target.value)}
                 placeholder="Enter your phone number"
                 className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C42] focus:ring-1 focus:ring-[#FF8C42] transition-colors"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">
                 Email Address (Optional)
               </label>
               <input
                 type="email"
                 value={customerEmail}
                 onChange={(e) => setCustomerEmail(e.target.value)}
                 placeholder="Enter your email address"
                 className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C42] focus:ring-1 focus:ring-[#FF8C42] transition-colors"
               />
             </div>
           </div>

           <div className="flex space-x-4">
             <button
               onClick={() => setStep(2)}
               className="flex-1 py-3 px-4 border border-[#444444] text-gray-300 rounded-xl hover:bg-[#1A1A1A]/50 transition-all duration-200"
             >
               ← Back to Time Selection
             </button>
             {customerName.trim() && (
               <button
                 onClick={() => setStep(4)}
                 className="flex-1 py-3 px-4 bg-[#FF8C42] text-white font-bold rounded-xl hover:bg-[#E67A1F] transition-all duration-200"
               >
                 Continue to Confirmation
               </button>
             )}
           </div>
         </div>
       )}

       {step === 4 && (
         /* Confirmation */
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-6 border border-[#444444]/50">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Confirm Your Booking</h2>
            <p className="text-gray-300">Please review your appointment details</p>
          </div>

          <div className="space-y-4 mb-6">
             <div className="flex justify-between items-center py-3 border-b border-[#444444]/50">
               <span className="text-gray-400">Customer:</span>
               <span className="font-bold text-white">{customerName}</span>
             </div>
             {customerPhone && (
               <div className="flex justify-between items-center py-3 border-b border-[#444444]/50">
                 <span className="text-gray-400">Phone:</span>
                 <span className="font-bold text-white">{customerPhone}</span>
               </div>
             )}
             {customerEmail && (
               <div className="flex justify-between items-center py-3 border-b border-[#444444]/50">
                 <span className="text-gray-400">Email:</span>
                 <span className="font-bold text-white">{customerEmail}</span>
               </div>
             )}
             <div className="flex justify-between items-center py-3 border-b border-[#444444]/50">
               <span className="text-gray-400">Service:</span>
               <span className="font-bold text-white">{selectedService?.name}</span>
             </div>
             <div className="flex justify-between items-center py-3 border-b border-[#444444]/50">
               <span className="text-gray-400">Barber:</span>
               <span className="font-bold text-white">{selectedBarber?.full_name || selectedBarber?.name}</span>
             </div>
             <div className="flex justify-between items-center py-3 border-b border-[#444444]/50">
               <span className="text-gray-400">Date:</span>
               <span className="font-bold text-white">Today - {new Date().toLocaleDateString()}</span>
             </div>
             <div className="flex justify-between items-center py-3 border-b border-[#444444]/50">
               <span className="text-gray-400">Time:</span>
               <span className="font-bold text-white">{timeSlots.find(slot => slot.time === selectedTime)?.displayTime}</span>
             </div>
             <div className="flex justify-between items-center py-3">
               <span className="text-gray-400">Price:</span>
               <span className="font-bold text-[#FF8C42] text-xl">₱{selectedService?.price.toLocaleString()}</span>
             </div>
           </div>

           <div className="flex space-x-4">
             <button
               onClick={() => setStep(3)}
               className="flex-1 py-3 px-4 border border-[#444444] text-gray-300 rounded-xl hover:bg-[#1A1A1A]/50 transition-all duration-200"
             >
               ← Back to Customer Info
             </button>
            <button
              onClick={handleCreateBooking}
              disabled={isGeneratingBooking}
              className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-all duration-200 ${
                isGeneratingBooking ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#FF8C42] hover:bg-[#E67A1F]'
              }`}
            >
              {isGeneratingBooking ? (
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Creating Booking...</span>
                </div>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
         /* Success */
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-8 text-center border border-[#444444]/50">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl bg-green-500">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold mb-2 text-white">Booking Confirmed!</h2>
          <p className="text-lg mb-6 text-green-400">Your appointment has been scheduled</p>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4 text-[#36454F]">Your Booking QR Code</h3>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-2xl border-2 border-[#E0E0E0] shadow-sm">
                <div className="relative w-48 h-48">
                  {(qrCodeLoading || !getBookingById?.booking_code) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                      <div className="text-center space-y-3">
                        <div className="animate-spin w-8 h-8 border-3 border-[#FF8C42] border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-sm text-[#8B8B8B]">
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
              <div className="text-lg font-bold text-[#36454F]">
                Booking Code: {getBookingById?.booking_code ? getBookingById.booking_code : 
                  <span className="inline-flex items-center space-x-2">
                    <span>Generating...</span>
                    <div className="animate-pulse w-2 h-2 bg-[#FF8C42] rounded-full"></div>
                  </span>
                }
              </div>
              <p className="text-sm text-[#8B8B8B]">
                Show this QR code when you arrive
              </p>
            </div>
          </div>

          {/* Booking Summary */}
           <div className="bg-[#FF8C42]/10 border border-[#FF8C42]/30 rounded-xl p-6 mb-6">
             <div className="space-y-3">
               <div className="flex justify-between">
                 <span className="font-medium text-gray-300">Customer:</span>
                 <span className="font-bold text-white">{customerName}</span>
               </div>
               {customerPhone && (
                 <div className="flex justify-between">
                   <span className="font-medium text-gray-300">Phone:</span>
                   <span className="font-bold text-white">{customerPhone}</span>
                 </div>
               )}
               <div className="flex justify-between">
                 <span className="font-medium text-gray-300">Service:</span>
                 <span className="font-bold text-white">{selectedService?.name}</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-medium text-gray-300">Barber:</span>
                 <span className="font-bold text-white">{selectedBarber?.full_name || selectedBarber?.name}</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-medium text-gray-300">Date & Time:</span>
                 <span className="font-bold text-white">
                   Today, {timeSlots.find(slot => slot.time === selectedTime)?.displayTime}
                 </span>
               </div>
               <div className="flex justify-between border-t border-[#FF8C42]/30 pt-3">
                 <span className="font-bold text-gray-300">Total:</span>
                 <span className="font-bold text-[#FF8C42] text-xl">₱{selectedService?.price.toLocaleString()}</span>
               </div>
             </div>
           </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={printQRCode}
              className="flex-1 py-3 px-4 bg-[#1A1A1A] border border-[#444444] text-white font-bold rounded-xl hover:bg-[#2A2A2A] transition-all duration-200"
            >
              Print QR Code
            </button>
            <button
              onClick={resetBooking}
              className="flex-1 py-3 px-4 bg-[#FF8C42] text-white font-bold rounded-xl hover:bg-[#E67A1F] transition-all duration-200"
            >
              Book Another Service
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingQRGenerator
