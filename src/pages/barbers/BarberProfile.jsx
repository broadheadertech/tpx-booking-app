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
  Award,
  MapPin,
  CheckCircle,
  Trophy,
  Medal,
  GraduationCap,
  Target,
  ChevronRight,
  Sparkles,
  Sparkle,
} from "lucide-react";
import { useBranding } from "../../context/BrandingContext";

const BarberProfile = () => {
  const navigate = useNavigate();
  const { barberId } = useParams();
  const { branding } = useBranding();
  const { isAuthenticated } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);

  // Handle booking with this barber
  const handleBookWithBarber = () => {
    // Store barber ID in sessionStorage for booking page to pick up
    sessionStorage.setItem("preSelectedBarber", JSON.stringify({
      barberId: barberId,
      barberName: barberProfile?.name
    }));

    // Navigate to appropriate booking page based on auth status
    if (isAuthenticated) {
      navigate("/customer/booking");
    } else {
      navigate("/guest/booking");
    }
  };

  const barberProfile = useQuery(
    api.services.portfolio.getPublicBarberProfile,
    barberId ? { barber_id: barberId } : "skip"
  );

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAchievementIcon = (type) => {
    switch (type) {
      case "certification": return GraduationCap;
      case "award": return Trophy;
      case "milestone": return Target;
      case "training": return Medal;
      default: return Award;
    }
  };

  const days = [
    { key: "monday", label: "Mon" },
    { key: "tuesday", label: "Tue" },
    { key: "wednesday", label: "Wed" },
    { key: "thursday", label: "Thu" },
    { key: "friday", label: "Fri" },
    { key: "saturday", label: "Sat" },
    { key: "sunday", label: "Sun" },
  ];

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
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/barbers")}
              className="w-10 h-10 flex items-center justify-center bg-[#1A1A1A] rounded-xl hover:bg-[#2A2A2A] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleBookWithBarber}
              className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white text-sm font-semibold rounded-xl transition-all"
            >
              Book Now
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {/* Profile Section */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden ring-4 ring-[var(--color-primary)]/20 bg-[#1A1A1A]">
                {barberProfile.avatarUrl ? (
                  <img
                    src={barberProfile.avatarUrl}
                    alt={barberProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20">
                    <span className="text-4xl md:text-5xl font-bold text-[var(--color-primary)]">
                      {barberProfile.name?.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {barberProfile.name}
              </h1>

              {/* Stats Row */}
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <Star className="w-5 h-5 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                  <span className="text-white font-semibold">{barberProfile.rating?.toFixed(1) || "5.0"}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-gray-400">{barberProfile.totalBookings || 0} bookings</span>
                <div className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-gray-400">{barberProfile.experience}</span>
              </div>

              {/* Specialties */}
              {barberProfile.specialties?.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  {barberProfile.specialties.map((specialty, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-sm font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}

              {/* Status */}
              {barberProfile.is_accepting_bookings && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-green-400 font-medium">Available for booking</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Schedule Section */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Working Hours</h2>
          <div className="bg-[#111111] rounded-xl border border-[#1A1A1A] overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-[#1A1A1A]">
              {days.map(({ key, label }) => {
                const schedule = barberProfile.schedule?.[key];
                const isAvailable = schedule?.available ?? false;
                return (
                  <div key={key} className="p-3 text-center">
                    <p className={`text-xs font-medium mb-2 ${isAvailable ? "text-white" : "text-gray-600"}`}>
                      {label}
                    </p>
                    <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${isAvailable ? "bg-green-500" : "bg-gray-700"}`} />
                    <p className={`text-xs ${isAvailable ? "text-gray-400" : "text-gray-700"}`}>
                      {isAvailable ? formatTime(schedule.start)?.replace(" ", "") : "Off"}
                    </p>
                    {isAvailable && (
                      <p className="text-xs text-gray-500">
                        {formatTime(schedule.end)?.replace(" ", "")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        {barberProfile.portfolio?.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Portfolio</h2>
              <span className="text-sm text-gray-500">{barberProfile.portfolio.length} works</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {barberProfile.portfolio.map((item, idx) => (
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
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  {item.is_featured && (
                    <div className="absolute top-2 right-2">
                      <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Services Section */}
        {barberProfile.services?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barberProfile.services.map((service, idx) => (
                <div
                  key={idx}
                  className="bg-[#111111] rounded-xl p-4 border border-[#1A1A1A] hover:border-[var(--color-primary)]/30 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center group-hover:bg-[var(--color-primary)]/20 transition-colors">
                        <Sparkle className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{service.name}</h4>
                        <p className="text-xs text-gray-500">{service.duration_minutes} mins</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-primary)]">
                        {service.hide_price ? "---" : `₱${service.price}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        {barberProfile.reviews?.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Reviews</h2>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                <span className="text-sm font-semibold text-white">{barberProfile.rating?.toFixed(1) || "5.0"}</span>
                <span className="text-sm text-gray-500">({barberProfile.reviews.length})</span>
              </div>
            </div>
            <div className="space-y-3">
              {barberProfile.reviews.slice(0, 5).map((review, idx) => (
                <div
                  key={idx}
                  className="bg-[#111111] rounded-xl p-4 border border-[#1A1A1A]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                      {review.customerAvatar ? (
                        <img src={review.customerAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-gray-400">
                          {review.customerName?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{review.customerName}</p>
                        <span className="text-xs text-gray-600 flex-shrink-0">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.rating
                                ? "text-[var(--color-primary)] fill-[var(--color-primary)]"
                                : "text-gray-700"
                            }`}
                          />
                        ))}
                      </div>
                      {review.feedback && (
                        <p className="text-sm text-gray-400 leading-relaxed">{review.feedback}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Achievements Section */}
        {barberProfile.achievements?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barberProfile.achievements.map((achievement, idx) => {
                const Icon = getAchievementIcon(achievement.achievement_type);
                return (
                  <div
                    key={idx}
                    className="bg-[#111111] rounded-xl p-4 border border-[#1A1A1A] flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white truncate">{achievement.title}</h4>
                      </div>
                      {achievement.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{achievement.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                        <span className="px-2 py-0.5 bg-[#1A1A1A] rounded capitalize">{achievement.achievement_type}</span>
                        {achievement.date_earned && <span>{achievement.date_earned}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Floating Book Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-50">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={handleBookWithBarber}
            className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white font-bold rounded-xl transition-all shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Book with {barberProfile.name?.split(" ")[0]}
          </button>
        </div>
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
