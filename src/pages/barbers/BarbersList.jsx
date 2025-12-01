import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Star,
  Scissors,
  ArrowLeft,
  Calendar,
  Search,
  Clock,
  Users,
  Sparkles,
} from "lucide-react";
import { useBranding } from "../../context/BrandingContext";
import { useAuth } from "../../context/AuthContext";

const BarbersList = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const barbers = useQuery(api.services.portfolio.getPublicBarbers, {});

  // Handle booking (general - no specific barber)
  const handleBookAppointment = () => {
    if (isAuthenticated) {
      navigate("/customer/booking");
    } else {
      navigate("/guest/booking");
    }
  };

  const filteredBarbers = barbers?.filter(
    (barber) =>
      barber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barber.specialties?.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="w-10 h-10 flex items-center justify-center bg-[#1A1A1A] rounded-xl hover:bg-[#2A2A2A] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Our Team</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Expert barbers ready to serve you</p>
              </div>
            </div>
            <Link to="/" className="flex items-center">
              <img
                src={branding?.logo_light_url || "/img/tipuno_x_logo_white.avif"}
                alt="Logo"
                className="h-8 object-contain"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Meet Our <span className="text-[var(--color-primary)]">Barbers</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto">
            Choose from our talented team of professional barbers
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search barbers..."
              className="w-full h-12 pl-12 pr-4 bg-[#111111] border border-[#1A1A1A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
            />
          </div>
        </div>

        {/* Stats */}
        {barbers && (
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{barbers.length}</p>
              <p className="text-xs text-gray-500">Barbers</p>
            </div>
            <div className="w-px h-8 bg-[#1A1A1A]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {barbers.filter(b => b.is_accepting_bookings).length}
              </p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </div>
        )}
      </div>

      {/* Barbers Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        {!barbers ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-[#111111] rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[3/4] bg-[#1A1A1A]" />
              </div>
            ))}
          </div>
        ) : filteredBarbers?.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-[#111111] flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Barbers Found</h2>
            <p className="text-gray-500 text-sm">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBarbers?.map((barber) => (
              <div
                key={barber._id}
                onClick={() => navigate(`/barbers/${barber._id}`)}
                className="group bg-[#111111] rounded-xl overflow-hidden border border-[#1A1A1A] hover:border-[var(--color-primary)]/50 transition-all duration-300 cursor-pointer"
              >
                {/* Image Container */}
                <div className="relative aspect-[3/4] overflow-hidden">
                  {barber.avatarUrl || barber.featuredImageUrl ? (
                    <img
                      src={barber.avatarUrl || barber.featuredImageUrl}
                      alt={barber.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center">
                      <span className="text-5xl font-bold text-[var(--color-primary)]/30">
                        {barber.name?.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/20 to-transparent" />

                  {/* Status Badge */}
                  {barber.is_accepting_bookings && (
                    <div className="absolute top-3 right-3">
                      <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-500/30" />
                    </div>
                  )}

                  {/* Portfolio Count */}
                  {barber.portfolioCount > 0 && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[var(--color-primary)]" />
                      <span className="text-xs text-white font-medium">{barber.portfolioCount}</span>
                    </div>
                  )}

                  {/* Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-base font-bold text-white mb-1 truncate">
                      {barber.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                        <span className="text-white font-medium">{barber.rating?.toFixed(1) || "5.0"}</span>
                      </div>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400">{barber.experience || "Expert"}</span>
                    </div>

                    {/* Specialties */}
                    {barber.specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {barber.specialties.slice(0, 2).map((specialty, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] font-medium bg-white/10 text-white/80 rounded"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-50">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBookAppointment}
            className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white font-bold rounded-xl transition-all shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Bottom Padding */}
      <div className="h-24" />
    </div>
  );
};

export default BarbersList;
