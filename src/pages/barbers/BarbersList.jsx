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
  MapPin,
  ChevronRight,
  Sparkles,
  Award,
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

  // Convert name to URL-friendly slug
  const slugify = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
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
      <header className="sticky top-0 z-50 bg-[#0A0A0A] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-white">Our Barbers</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Search Section */}
      <div className="px-4 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or specialty..."
              className="w-full h-12 pl-12 pr-4 bg-[#111111] border border-[#1A1A1A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#D4A853] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {barbers && (
        <div className="px-4 pb-6">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{barbers.length}</p>
              <p className="text-xs text-gray-500">Barbers</p>
            </div>
            <div className="w-px h-10 bg-[#1A1A1A]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[#D4A853]">
                {barbers.filter(b => b.is_accepting_bookings).length}
              </p>
              <p className="text-xs text-gray-500">Available Today</p>
            </div>
          </div>
        </div>
      )}

      {/* Barbers List */}
      <div className="px-4 pb-32">
        <div className="max-w-2xl mx-auto space-y-4">
          {!barbers ? (
            // Loading skeletons
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-[#111111] rounded-2xl p-4 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#1A1A1A]" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-[#1A1A1A] rounded w-32" />
                    <div className="h-4 bg-[#1A1A1A] rounded w-24" />
                    <div className="h-3 bg-[#1A1A1A] rounded w-40" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredBarbers?.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-[#111111] flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Barbers Found</h2>
              <p className="text-gray-500 text-sm">Try adjusting your search</p>
            </div>
          ) : (
            filteredBarbers?.map((barber) => (
              <div
                key={barber._id}
                onClick={() => navigate(`/barbers/${slugify(barber.name)}`)}
                className="group bg-[#111111] rounded-2xl p-4 border border-[#1A1A1A] hover:border-[#D4A853]/30 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar Section */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-[#1A1A1A] ring-2 ring-[#1A1A1A] group-hover:ring-[#D4A853]/30 transition-all">
                      {barber.avatarUrl || barber.featuredImageUrl ? (
                        <img
                          src={barber.avatarUrl || barber.featuredImageUrl}
                          alt={barber.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A]">
                          <span className="text-2xl font-bold text-gray-500">
                            {barber.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Availability dot */}
                    <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-[#111111] ${
                      barber.is_accepting_bookings ? "bg-green-500" : "bg-gray-500"
                    }`} />
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 min-w-0">
                    {/* Name and Arrow */}
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold text-white truncate pr-2">
                        {barber.name}
                      </h3>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#D4A853] transition-colors flex-shrink-0" />
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-[#D4A853] fill-[#D4A853]" />
                        <span className="text-white font-medium">{barber.rating?.toFixed(1) || "5.0"}</span>
                      </div>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">{barber.totalBookings || 0} bookings</span>
                      {barber.experience && (
                        <>
                          <span className="text-gray-600">•</span>
                          <div className="flex items-center gap-1">
                            <Scissors className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-gray-400">{barber.experience}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Availability Status */}
                    <p className={`text-xs mb-2 ${barber.is_accepting_bookings ? "text-green-500" : "text-gray-500"}`}>
                      {barber.is_accepting_bookings ? "Available for booking" : "Not available"}
                    </p>

                    {/* Specialties */}
                    {barber.specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {barber.specialties.slice(0, 3).map((specialty, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs font-medium bg-[#1A1A1A] text-gray-400 rounded-lg border border-[#2A2A2A]"
                          >
                            {specialty}
                          </span>
                        ))}
                        {barber.specialties.length > 3 && (
                          <span className="px-2.5 py-1 text-xs font-medium text-[#D4A853]">
                            +{barber.specialties.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Portfolio indicator */}
                    {barber.portfolioCount > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                        <Sparkles className="w-3.5 h-3.5 text-[#D4A853]" />
                        <span>{barber.portfolioCount} portfolio items</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Book Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-50">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleBookAppointment}
            className="w-full py-4 bg-[#D4A853] hover:bg-[#C49843] text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarbersList;
