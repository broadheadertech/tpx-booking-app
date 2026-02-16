import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
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
  Share2,
  MapPin,
  Home,
  ShoppingBag,
  Wallet,
  User,
  Award,
  Users,
} from "lucide-react";
import { useBranding } from "../../context/BrandingContext";
import { normalizeCerts } from "../../utils/certifications";
import CertificationTag from "../../components/common/CertificationTag";
import CertificationLightbox from "../../components/common/CertificationLightbox";

const NAV_SECTIONS = [
  { id: 'home', label: 'Home', icon: Home, path: '/customer/dashboard' },
  { id: 'booking', label: 'Book', icon: Scissors, path: '/customer/booking' },
  { id: 'wallet', label: 'Pay', icon: Wallet, path: '/customer/wallet' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, path: '/customer/shop' },
  { id: 'profile', label: 'Account', icon: User, path: '/customer/profile' },
];

const BarberProfile = () => {
  const navigate = useNavigate();
  const { barberSlug } = useParams();
  const { branding } = useBranding();
  const { isAuthenticated } = useCurrentUser();
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  const primaryColor = branding?.primary_color || 'var(--color-primary)';

  // Fetch barber profile using slug
  const barberProfile = useQuery(
    api.services.portfolio.getPublicBarberProfileBySlug,
    barberSlug ? { slug: barberSlug } : "skip"
  );

  // Get branch info for the barber
  const barberBranch = useQuery(
    api.services.branches.getBranchById,
    barberProfile?.branch_id ? { id: barberProfile.branch_id } : "skip"
  );

  // Hide bottom nav on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current + 10) {
        setIsNavHidden(true);
      } else if (currentScrollY < lastScrollY.current - 10) {
        setIsNavHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: barberProfile?.name,
          text: `Check out ${barberProfile?.name}`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(window.location.href);
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
    { id: "portfolio", label: "Portfolio" },
    { id: "services", label: "Services" },
    { id: "hours", label: "Hours" },
    { id: "reviews", label: "Reviews" },
  ];

  const getTodayKey = () => {
    const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return daysMap[new Date().getDay()];
  };

  const isAvailableToday = () => {
    if (!barberProfile) return false;
    if (barberProfile.is_accepting_bookings === false) return false;
    const todayKey = getTodayKey();
    const todaySchedule = barberProfile.schedule?.[todayKey];
    if (!todaySchedule?.available) return false;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (todaySchedule.start && todaySchedule.end) {
      return currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
    }
    return true;
  };

  const getYearsExperience = () => {
    if (barberProfile?.years_of_experience != null) {
      return `${barberProfile.years_of_experience} year${barberProfile.years_of_experience !== 1 ? 's' : ''}`;
    }
    if (!barberProfile?.experience) return "0 years";
    const exp = barberProfile.experience.toLowerCase();
    if (exp.includes("year")) return barberProfile.experience;
    return `${barberProfile.experience} years`;
  };

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
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-24 h-24 rounded-full bg-[#1A1A1A] mx-auto" />
          <div className="h-6 bg-[#1A1A1A] rounded w-48 mx-auto" />
          <div className="h-4 bg-[#1A1A1A] rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Back Button + Favorite — floating over cover */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="flex items-center justify-center w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
      </div>

      {/* Cover Area */}
      <div className="h-44 md:h-56 bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] overflow-hidden relative">
        {barberProfile.coverPhotoUrl ? (
          <img
            src={barberProfile.coverPhotoUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}20 0%, #0D0D0D 100%)`
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/30 to-transparent" />
      </div>

      {/* Profile + Identity + Actions */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="relative -mt-14 md:-mt-16 flex flex-col items-center">
          {/* Circular Profile Pic with glow ring */}
          <div className="relative">
            <div
              className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-[#1A1A1A] overflow-hidden shadow-xl"
              style={{
                boxShadow: `0 0 0 4px #0D0D0D, 0 0 0 6px ${primaryColor}40`
              }}
            >
              {barberProfile.avatarUrl ? (
                <img
                  src={barberProfile.avatarUrl}
                  alt={barberProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {barberProfile.name?.charAt(0)}
                </div>
              )}
            </div>
            {/* Availability dot */}
            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-3 border-[#0D0D0D] ${
              isAvailableToday() ? "bg-green-500" : "bg-gray-500"
            }`} />
          </div>

          {/* Identity Stack */}
          <div className="mt-3 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {barberProfile.name}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-xs text-gray-400 font-medium">
                Barber
              </span>
              {barberProfile.specialties?.length > 0 && (
                <>
                  <span className="text-[#2A2A2A]">·</span>
                  <span className="text-gray-400 text-sm">{barberProfile.specialties[0]}</span>
                </>
              )}
            </div>
            {/* Branch Location */}
            {barberBranch && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-sm text-gray-400">
                  {barberBranch.name}{barberBranch.address ? ` · ${barberBranch.address}` : ""}
                </span>
              </div>
            )}
            {/* Availability Status */}
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <div className={`w-2 h-2 rounded-full ${isAvailableToday() ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-medium ${isAvailableToday() ? 'text-green-400' : 'text-red-400'}`}>
                {isAvailableToday() ? 'Available Today' : 'Not Available Today'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4 w-full max-w-sm">
            <button
              onClick={handleBookWithBarber}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Calendar className="w-4 h-4" />
              Book Now
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-10 h-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white hover:border-[var(--color-primary)] transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Social Proof Bar */}
          <div className="flex items-center justify-center gap-4 mt-4 pb-2 text-sm">
            <span className="text-gray-400 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[var(--color-primary)] fill-[var(--color-primary)]" />
              <span className="text-white font-semibold">{barberProfile.rating?.toFixed(1) || "5.0"}</span>
              <span className="text-gray-500">({barberProfile.reviews?.length || 0})</span>
            </span>
            <span className="text-[#2A2A2A]">·</span>
            <span className="text-gray-400">
              <span className="text-white font-semibold">{barberProfile.totalBookings || 0}</span> bookings
            </span>
            <span className="text-[#2A2A2A]">·</span>
            <span className="text-gray-400">
              <span className="text-white font-semibold">{getYearsExperience()}</span>
            </span>
          </div>

          {/* Bio */}
          {barberProfile.bio && (
            <p className="text-gray-400 text-sm text-center max-w-md leading-relaxed">
              {barberProfile.bio}
            </p>
          )}

          {/* Specialties */}
          {barberProfile.specialties?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {barberProfile.specialties.map((specialty, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 bg-[#1A1A1A] text-gray-300 rounded-full text-xs border border-[#2A2A2A] font-medium"
                >
                  <Scissors className="w-3 h-3 mr-1 text-[var(--color-primary)]" />
                  {specialty}
                </span>
              ))}
            </div>
          )}

          {/* Certifications */}
          {barberProfile.certifications?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2 pb-4">
              {normalizeCerts(barberProfile.certifications).map((cert, i) => (
                <CertificationTag
                  key={i}
                  cert={cert}
                  size="sm"
                  onClick={setSelectedCert}
                  className="rounded-full"
                />
              ))}
            </div>
          )}

          {!barberProfile.bio && (!barberProfile.specialties || barberProfile.specialties.length === 0) && (!barberProfile.certifications || barberProfile.certifications.length === 0) && (
            <div className="pb-4" />
          )}
        </div>
      </div>

      {/* Tab Navigation — sticky */}
      <div className="sticky top-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-sm border-b border-[#1A1A1A]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-center gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div>
            {barberProfile.portfolio?.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Armchair className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No portfolio items yet</p>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <div>
            {barberProfile.services?.length > 0 ? (
              <div className="space-y-0">
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
                        <span className="text-[#2A2A2A]">·</span>
                        <span className="text-[var(--color-primary)] font-semibold">
                          {service.hide_price ? "---" : `₱${service.price}`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBookWithBarber()}
                      className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center ml-4 hover:opacity-90 transition-opacity"
                    >
                      <Calendar className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No services listed</p>
              </div>
            )}
          </div>
        )}

        {/* Working Hours Tab */}
        {activeTab === "hours" && (
          <div>
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

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div>
            {barberProfile.reviews?.length > 0 ? (
              <div className="space-y-4">
                {barberProfile.reviews.map((review, idx) => (
                  <div key={idx} className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                                    ? "text-[var(--color-primary)] fill-[var(--color-primary)]"
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
              <div className="text-center py-16">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No reviews yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom transition-transform duration-300 ease-in-out ${isNavHidden ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-5 p-1 pb-2 md:p-2 md:pb-3">
            {NAV_SECTIONS.map((section) => {
              const IconComponent = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => navigate(section.path)}
                  className="flex flex-col items-center justify-center py-2 md:py-3 transition-colors text-gray-600 hover:text-gray-400"
                >
                  <IconComponent className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs mt-1 font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>
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

      {/* Certification Lightbox */}
      {selectedCert && (
        <CertificationLightbox cert={selectedCert} onClose={() => setSelectedCert(null)} />
      )}
    </div>
  );
};

export default BarberProfile;
