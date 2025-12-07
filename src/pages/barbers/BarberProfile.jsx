import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../context/AuthContext";
import {
  Star,
  Scissors,
  ArrowLeft,
  Calendar,
  Clock,
  Heart,
  Armchair,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useBranding } from "../../context/BrandingContext";

const BarberProfile = () => {
  const navigate = useNavigate();
  const { barberSlug } = useParams();
  const { branding } = useBranding();
  const { isAuthenticated } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch barber profile using slug (URL-friendly name)
  const barberProfile = useQuery(
    api.services.portfolio.getPublicBarberProfileBySlug,
    barberSlug ? { slug: barberSlug } : "skip"
  );

  // Handle booking with this barber
  const handleBookWithBarber = () => {
    sessionStorage.setItem("preSelectedBarber", JSON.stringify({
      barberId: barberProfile?._id,
      barberName: barberProfile?.name,
      branchId: barberProfile?.branch_id,
      customBookingEnabled: barberProfile?.custom_booking_enabled || false
    }));

    if (isAuthenticated) {
      navigate("/customer/booking");
    } else {
      navigate("/guest/booking");
    }
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes.padStart(2, "0")} ${ampm}`;
  };

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  const tabs = [
    { id: "portfolio", icon: Armchair, label: "Portfolio" },
    { id: "hours", icon: Scissors, label: "Hours" },
    { id: "services", icon: Clock, label: "Services" },
    { id: "reviews", icon: MessageSquare, label: "Reviews" },
  ];

  // Get today's day key
  const getTodayKey = () => {
    const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return daysMap[new Date().getDay()];
  };

  // Check if barber is available today
  const isAvailableToday = () => {
    if (!barberProfile) return false;

    // First check if barber is accepting bookings at all
    if (barberProfile.is_accepting_bookings === false) return false;

    // Then check today's schedule
    const todayKey = getTodayKey();
    const todaySchedule = barberProfile.schedule?.[todayKey];

    if (!todaySchedule?.available) return false;

    // Optionally check if current time is within working hours
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // If we have start/end times, check if within range
    if (todaySchedule.start && todaySchedule.end) {
      return currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
    }

    return true;
  };

  // Calculate years of experience
  const getYearsExperience = () => {
    if (!barberProfile?.experience) return "0 years";
    const exp = barberProfile.experience.toLowerCase();
    if (exp.includes("year")) return barberProfile.experience;
    return `${barberProfile.experience} years`;
  };

  // Format relative time for reviews
  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInDays / 365)} year${Math.floor(diffInDays / 365) > 1 ? 's' : ''} ago`;
  };

  if (!barberProfile) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-24 h-24 rounded-full bg-[#1A1A1A] mx-auto" />
          <div className="h-6 bg-[#1A1A1A] rounded w-48 mx-auto" />
          <div className="h-4 bg-[#1A1A1A] rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A] px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="w-10 h-10 flex items-center justify-center text-white"
          >
            <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </div>
      </header>

      <div className="px-4 pb-32">
        {/* Profile Header */}
        <div className="text-center mb-6">
          {/* Avatar with availability indicator */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#1A1A1A] ring-4 ring-[#1A1A1A]">
              {barberProfile.avatarUrl ? (
                <img
                  src={barberProfile.avatarUrl}
                  alt={barberProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A]">
                  <span className="text-3xl font-bold text-gray-400">
                    {barberProfile.name?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            {/* Availability dot - green if available today, gray if not */}
            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-[#0A0A0A] ${
              isAvailableToday() ? "bg-green-500" : "bg-gray-500"
            }`} />
          </div>

          {/* Name */}
          <h1 className="text-xl font-bold text-white mb-2">
            {barberProfile.name}
          </h1>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-2 text-sm mb-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#D4A853] fill-[#D4A853]" />
              <span className="text-white font-medium">{barberProfile.rating?.toFixed(1) || "5.0"}</span>
              <span className="text-gray-500">({barberProfile.reviews?.length || 0})</span>
            </div>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">{barberProfile.totalBookings || 0} Bookings</span>
            <span className="text-gray-600">•</span>
            <div className="flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">{getYearsExperience()}</span>
            </div>
          </div>

          {/* Availability Status */}
          <p className={`text-sm ${isAvailableToday() ? "text-green-500" : "text-gray-500"}`}>
            {isAvailableToday() ? "Available Today" : "Not Available Today"}
          </p>

          {/* Bio */}
          <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            {barberProfile.bio ||
              (barberProfile.specialties?.length > 0
                ? `Specialized in ${barberProfile.specialties.join(", ").toLowerCase()}. Passionate about creating unique looks tailored to each client.`
                : "Specialized in modern fades, classic cuts, and beard styling. Passionate about creating unique looks tailored to each client."
              )
            }
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-6 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-[#1A1A1A] text-white"
                  : "text-gray-500 hover:text-gray-400"
              }`}
            >
              <tab.icon className="w-6 h-6" />
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Portfolio Tab */}
          {activeTab === "portfolio" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Portfolio of Work</h2>
                {barberProfile.portfolio?.length > 6 && (
                  <button className="text-[#D4A853] text-sm font-medium">View All</button>
                )}
              </div>

              {barberProfile.portfolio?.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {barberProfile.portfolio.slice(0, 6).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(item)}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-[#1A1A1A]"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.caption || "Portfolio"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Armchair className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-500">No portfolio items yet</p>
                </div>
              )}
            </div>
          )}

          {/* Working Hours Tab */}
          {activeTab === "hours" && (
            <div>
              <h2 className="text-white font-semibold mb-4">Working Hours</h2>
              <div className="space-y-0">
                {days.map(({ key, label }) => {
                  const schedule = barberProfile.schedule?.[key];
                  const isAvailable = schedule?.available ?? false;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-4 border-b border-[#1A1A1A]"
                    >
                      <div>
                        <p className={`font-medium ${isAvailable ? "text-white" : "text-gray-500"}`}>
                          {label}
                        </p>
                        <p className={`text-sm ${isAvailable ? "text-gray-400" : "text-gray-600"}`}>
                          {isAvailable
                            ? `${formatTime(schedule.start)} - ${formatTime(schedule.end)}`
                            : "Day off"
                          }
                        </p>
                      </div>
                      {isAvailable ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <div>
              <h2 className="text-white font-semibold mb-4">Services</h2>
              {barberProfile.services?.length > 0 ? (
                <div className="space-y-3">
                  {barberProfile.services.map((service, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-4 border-b border-[#1A1A1A]"
                    >
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{service.name}</h4>
                        {service.description && (
                          <p className="text-gray-500 text-sm mb-1">{service.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-gray-400">{service.duration_minutes} min</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-[#D4A853] font-semibold">
                            {service.hide_price ? "---" : `₱${service.price}`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookWithBarber()}
                        className="w-8 h-8 bg-[#D4A853] rounded-full flex items-center justify-center ml-4 hover:bg-[#C49843] transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-black" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scissors className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-500">No services listed</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Reviews</h2>
                {barberProfile.reviews?.length > 5 && (
                  <button className="text-[#D4A853] text-sm font-medium">View All</button>
                )}
              </div>

              {barberProfile.reviews?.length > 0 ? (
                <div className="space-y-4">
                  {barberProfile.reviews.slice(0, 5).map((review, idx) => (
                    <div
                      key={idx}
                      className="bg-[#111111] rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {review.customerAvatar ? (
                            <img src={review.customerAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-gray-400">
                              {review.customerName?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium text-sm">{review.customerName}</p>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < review.rating
                                      ? "text-[#D4A853] fill-[#D4A853]"
                                      : "text-gray-700"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-600">
                              {getRelativeTime(review.created_at)}
                            </span>
                          </div>
                          {review.feedback && (
                            <p className="text-gray-400 text-sm leading-relaxed">{review.feedback}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-500">No reviews yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Book Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-50">
        <button
          onClick={handleBookWithBarber}
          className="w-full py-4 bg-[#D4A853] hover:bg-[#C49843] text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          Book Now
        </button>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <span className="text-white text-2xl">&times;</span>
          </button>
          <img
            src={selectedImage.imageUrl}
            alt={selectedImage.caption || "Portfolio"}
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {selectedImage.caption && (
            <div className="absolute bottom-8 left-4 right-4 text-center">
              <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg inline-block">
                {selectedImage.caption}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BarberProfile;
