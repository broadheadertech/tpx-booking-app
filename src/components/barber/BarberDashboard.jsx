import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  Star,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../context/AuthContext";
import BarberBookings from "./BarberBookings";
import BarberProfile from "./BarberProfile";
import TimeOffManager from "./TimeOffManager";

import LoadingSpinner from "../common/LoadingSpinner";
import AlertModal from "../common/AlertModal";
import { formatTime } from "../../utils/dateUtils";
import { useBranding } from "../../context/BrandingContext";

const BarberDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { branding } = useBranding();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAcceptingBookings, setIsAcceptingBookings] = useState(true);
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  // Check if we're on the barber dashboard route (main dashboard only)
  const isOnBarberDashboard = location.pathname === "/barber/dashboard";

  // Early return if not on barber dashboard - prevents navigation conflicts
  if (!isOnBarberDashboard) {
    return null;
  }

  // Get barber data - only for current user's branch
  const barbers = user?.branch_id
    ? useQuery(api.services.barbers.getBarbersByBranch, {
        branch_id: user.branch_id,
      })
    : useQuery(api.services.barbers.getAllBarbers);

  const currentBarber = barbers?.find((barber) => barber.user === user?._id);

  const updateBarberMutation = useMutation(api.services.barbers.updateBarber);

  // Mutation to create barber profile
  const createBarberProfile = useMutation(
    api.services.barbers.createBarberProfile
  );

  // Initialize acceptance status when barber data loads
  React.useEffect(() => {
    if (currentBarber) {
      setIsAcceptingBookings(currentBarber.is_accepting_bookings !== false);
    }
  }, [currentBarber]);

  const handleToggleBookings = async (newValue) => {
    if (!currentBarber?._id) return;

    setIsAcceptingBookings(newValue);

    try {
      await updateBarberMutation({
        id: currentBarber._id,
        is_accepting_bookings: newValue,
      });
    } catch (error) {
      console.error("Failed to update availability:", error);
      setIsAcceptingBookings(!newValue); // Revert on error
      setAlertState({
        isOpen: true,
        type: "error",
        title: "Update Failed",
        message: "Failed to update availability status. Please try again.",
      });
    }
  };

  // Auto-create barber profile if user has barber role but no profile
  React.useEffect(() => {
    if (
      user?.role === "barber" &&
      barbers &&
      !currentBarber &&
      user._id &&
      user.branch_id
    ) {
      createBarberProfile({
        userId: user._id,
        branch_id: user.branch_id,
      })
        .then(() => {
          // Profile created, data will refresh automatically
        })
        .catch((error) => {
          console.error("Failed to create barber profile:", error);
        });
    }
  }, [user, barbers, currentBarber, createBarberProfile]);

  // Get bookings and transactions for overview - only for current branch
  const allTransactions = user?.branch_id
    ? useQuery(api.services.transactions.getTransactionsByBranch, {
        branch_id: user.branch_id,
      })
    : useQuery(api.services.transactions.getAllTransactions);

  // Get bookings specifically for this barber
  const barberBookings =
    useQuery(
      api.services.bookings.getBookingsByBarber,
      currentBarber ? { barberId: currentBarber._id } : "skip"
    ) || [];

  // Get rating analytics for current barber - always call the hook but skip if no barber
  const ratingAnalytics = useQuery(
    api.services.ratings.getBarberRatingsAnalytics,
    currentBarber ? { barberId: currentBarber._id } : "skip"
  );

  // Get all bookings for debugging - only from current branch
  const allBookings = user?.branch_id
    ? useQuery(api.services.bookings.getBookingsByBranch, {
        branch_id: user.branch_id,
      })
    : useQuery(api.services.bookings.getAllBookings);

  // Debug logging
  console.log("Debug - currentBarber:", currentBarber);
  console.log("Debug - currentBarber._id:", currentBarber?._id);
  console.log("Debug - barberBookings from specific query:", barberBookings);
  console.log("Debug - allBookings:", allBookings);

  // Check if any bookings have barber field populated
  if (allBookings) {
    console.log(
      "Debug - Bookings with barber field:",
      allBookings.filter((b) => b.barber)
    );
    console.log(
      "Debug - All barber field values:",
      allBookings.map((b) => ({ id: b._id, barber: b.barber }))
    );
  }

  const barberTransactions =
    allTransactions?.filter(
      (transaction) =>
        transaction.barber === currentBarber?._id &&
        transaction.payment_status === "completed"
    ) || [];

  // Calculate today's stats
  const today = new Date().toISOString().split("T")[0];
  const todayBookings = barberBookings.filter(
    (booking) => booking.date === today
  );
  const todayRevenue = barberTransactions
    .filter((transaction) => {
      const transactionDate = new Date(transaction.createdAt)
        .toISOString()
        .split("T")[0];
      return transactionDate === today;
    })
    .reduce((sum, transaction) => sum + transaction.total_amount, 0);

  // Calculate this month's stats
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyBookings = barberBookings.filter((booking) =>
    booking.date.startsWith(thisMonth)
  );
  const monthlyRevenue = barberTransactions
    .filter((transaction) => {
      const transactionDate = new Date(transaction.createdAt)
        .toISOString()
        .slice(0, 7);
      return transactionDate === thisMonth;
    })
    .reduce((sum, transaction) => sum + transaction.total_amount, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const primaryTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "profile", label: "Profile", icon: Users },
  ];

  const moreTabs = [];

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "profile", label: "Profile", icon: Users },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "bookings":
        return <BarberBookings />;
      case "profile":
        return <BarberProfile />;
      default:
        return (
          <>
            {/* Desktop Header - Hidden on Mobile */}
            <div className="hidden md:block relative z-10 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-6 flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Welcome back, {currentBarber?.full_name || user?.username}
                      !
                    </h1>
                    <p className="text-gray-400 mt-1">
                      Here's your performance overview
                    </p>
                  </div>
                  {/* Availability Toggle Desktop */}
                  <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-3 flex items-center space-x-3">
                    <span
                      className={`text-sm font-medium ${isAcceptingBookings ? "text-green-400" : "text-gray-400"}`}
                    >
                      {isAcceptingBookings
                        ? "Accepting Bookings"
                        : "Bookings Paused"}
                    </span>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isAcceptingBookings}
                          onChange={(e) =>
                            handleToggleBookings(e.target.checked)
                          }
                        />
                        <div
                          className={`block w-10 h-6 rounded-full transition-colors ${isAcceptingBookings ? "bg-green-500" : "bg-gray-600"}`}
                        ></div>
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAcceptingBookings ? "transform translate-x-4" : ""}`}
                        ></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8 py-4 md:py-6">
              {/* Mobile Welcome Section with Toggle */}
              <div className="md:hidden mb-4 space-y-4">
                <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col space-y-1">
                    <h2 className="text-xl font-bold">Welcome back!</h2>
                    <p className="text-sm opacity-90">
                      Ready to make today amazing?
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs opacity-80 font-medium bg-white/20 px-2 py-1 rounded-lg">
                        Today,{" "}
                        {new Date().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Availability Toggle Mobile */}
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Booking Status
                    </p>
                    <p
                      className={`text-xs ${isAcceptingBookings ? "text-green-400" : "text-gray-400"}`}
                    >
                      {isAcceptingBookings
                        ? "You are visible to clients"
                        : "You appear as busy"}
                    </p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isAcceptingBookings}
                        onChange={(e) => handleToggleBookings(e.target.checked)}
                      />
                      <div
                        className={`block w-12 h-7 rounded-full transition-colors ${isAcceptingBookings ? "bg-green-500" : "bg-gray-600"}`}
                      ></div>
                      <div
                        className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm ${isAcceptingBookings ? "transform translate-x-5" : ""}`}
                      ></div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Stats Cards - Redesigned */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Total Bookings Card */}
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Calendar className="w-12 h-12 text-[var(--color-primary)]" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                    Total Bookings
                  </p>
                  <div className="flex items-baseline space-x-1">
                    <p className="text-2xl font-bold text-[var(--color-primary)]">
                      {barberBookings.length}
                    </p>
                    <span className="text-[10px] text-gray-500">lifetime</span>
                  </div>
                  <div className="mt-2 flex items-center text-xs text-green-400 bg-green-400/10 w-fit px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    <span>+2 this week</span>
                  </div>
                </div>

                {/* Rating Card */}
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Star className="w-12 h-12 text-yellow-400" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                    Rating
                  </p>
                  <div className="flex items-baseline space-x-1">
                    <p className="text-2xl font-bold text-yellow-400">
                      {ratingAnalytics?.averageRating ||
                        currentBarber?.rating ||
                        0}
                    </p>
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Based on {ratingAnalytics?.totalRatings || 0} reviews
                  </div>
                </div>
              </div>

              {/* Today's Appointments - Redesigned */}
              <div className="bg-[#1A1A1A] rounded-xl p-0 border border-[#2A2A2A] overflow-hidden mb-4">
                <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">
                    Today's Appointments
                  </h3>
                  <div className="bg-[#2A2A2A] px-2 py-1 rounded text-xs font-medium text-gray-300">
                    {todayBookings.length} Total
                  </div>
                </div>

                <div className="p-4">
                  {todayBookings.length === 0 ? (
                    <div className="text-center py-8 flex flex-col items-center">
                      <div className="w-12 h-12 bg-[#2A2A2A] rounded-full flex items-center justify-center mb-3">
                        <Calendar className="w-6 h-6 text-gray-500" />
                      </div>
                      <p className="text-gray-300 text-sm font-medium">
                        No appointments today
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Enjoy your free time! 🎉
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayBookings.slice(0, 3).map((booking) => (
                        <div
                          key={booking._id}
                          className="flex items-center p-3 bg-[#222222] rounded-xl border border-[#333333]"
                        >
                          <div className="flex-shrink-0 w-12 h-12 bg-[#333333] rounded-lg flex flex-col items-center justify-center border border-[#444444]">
                            <span className="text-[10px] text-gray-400 font-medium">
                              {formatTime(booking.time).split(" ")[1]}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {formatTime(booking.time).split(" ")[0]}
                            </span>
                          </div>

                          <div className="ml-3 flex-1 min-w-0">
                            <p className="font-bold text-white text-sm truncate">
                              {booking.customer_name}
                            </p>
                            <p className="text-xs text-[var(--color-primary)] truncate">
                              {booking.service_name}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-white">
                              ₱{booking.price}
                            </p>
                            <div className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded inline-block mt-1">
                              Confirmed
                            </div>
                          </div>
                        </div>
                      ))}

                      {todayBookings.length > 3 && (
                        <button
                          onClick={() => setActiveTab("bookings")}
                          className="w-full py-3 bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 rounded-xl transition-colors font-medium text-xs"
                        >
                          View All {todayBookings.length} Appointments
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Rating Analytics - Redesigned */}
              {ratingAnalytics && ratingAnalytics.totalRatings > 0 && (
                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">
                      Customer Ratings
                    </h3>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-yellow-400 font-medium">
                        {ratingAnalytics.averageRating}/5
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Rating Summary */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <=
                                Math.round(ratingAnalytics.averageRating)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-500"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-white font-medium">
                          {ratingAnalytics.averageRating}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {ratingAnalytics.totalRatings} reviews
                      </span>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="space-y-1">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count =
                          ratingAnalytics.ratingBreakdown[rating] || 0;
                        const percentage =
                          ratingAnalytics.totalRatings > 0
                            ? (count / ratingAnalytics.totalRatings) * 100
                            : 0;

                        return (
                          <div
                            key={rating}
                            className="flex items-center space-x-2"
                          >
                            <span className="text-xs text-gray-400 w-2">
                              {rating}
                            </span>
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-400 w-6 text-right">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Recent Reviews */}
                    {ratingAnalytics.recentRatings &&
                      ratingAnalytics.recentRatings.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <h4 className="text-xs font-medium text-gray-400 mb-2">
                            Recent Reviews
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {ratingAnalytics.recentRatings
                              .slice(0, 3)
                              .map((review, index) => (
                                <div
                                  key={index}
                                  className="bg-[#1A1A1A] rounded-md p-2"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3 h-3 ${
                                            star <= review.rating
                                              ? "text-yellow-400 fill-yellow-400"
                                              : "text-gray-500"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(
                                        review.created_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {review.feedback && (
                                    <p className="text-xs text-gray-300 line-clamp-2">
                                      {review.feedback}
                                    </p>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Time Off Manager */}
              <TimeOffManager barber={currentBarber} />
            </div>
          </>
        );
    }
  };

  // Show loading spinner while data is fetching
  if (barbers === undefined || user === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  if (!currentBarber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Barber Profile Not Found
          </h2>
          <p className="text-gray-400">
            Please contact admin to set up your barber profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] pb-20 md:pb-0">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: branding?.logo_dark_url
              ? `url(${branding.logo_dark_url})`
              : 'url(/img/pnglog.png)',
            filter: 'brightness(0.2)'
          }}
        ></div>
      </div>

      {/* Mobile Header - Compact Design */}
      <div className="relative z-10 bg-gradient-to-r from-[#1A1A1A]/95 to-[#2A2A2A]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={branding?.logo_light_url || '/img/tipuno_x_logo_white.avif'}
                alt=" Barbershop Logo"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-sm font-bold text-white">Dashboard</h1>
                <p className="text-xs text-gray-400 truncate max-w-[120px]">
                  {currentBarber?.full_name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Today</div>
              <div className="text-sm font-semibold text-[var(--color-primary)]">
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tab Navigation - Hidden on Mobile */}
      <div className="hidden md:block relative z-10 bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl border-b border-[#555555]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-3">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg"
                      : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Compact Design */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#1A1A1A]/95 to-[#2A2A2A]/95 backdrop-blur-xl border-t border-[#444444]/30">
        <div className="grid grid-cols-3 gap-1 p-2">
          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg scale-95"
                    : "text-gray-400 hover:text-gray-300 hover:bg-white/5 active:scale-95"
                }`}
              >
                <div
                  className={`p-1 rounded-md ${activeTab === tab.id ? "bg-white/20" : "bg-transparent"}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium mt-1 truncate">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">{renderContent()}</div>
    </div>
  );
};

export default BarberDashboard;
