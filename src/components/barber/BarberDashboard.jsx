import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  Star,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Wallet,
  CalendarDays,
  User,
  Settings,
  Bell,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Scissors,
  Target,
  Award,
  Trophy,
  Crown,
  Medal,
  Zap,
  Eye,
  MoreHorizontal,
  Filter,
  Search,
  Phone,
  MapPin,
  AlertCircle,
  Home,
  UserCircle,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../context/AuthContext";
import BarberBookings from "./BarberBookings";
import BarberProfile from "./BarberProfile";
import TimeOffManager from "./TimeOffManager";
import LoadingSpinner from "../common/LoadingSpinner";
import { formatTime } from "../../utils/dateUtils";
import { useBranding } from "../../context/BrandingContext";

// Tier Badge Component
const TierBadge = ({ tier, size = "sm" }) => {
  const tierConfig = {
    platinum: { bg: "bg-white/20", text: "text-white", icon: Crown },
    gold: { bg: "bg-[var(--color-primary)]/20", text: "text-[var(--color-primary)]", icon: Trophy },
    silver: { bg: "bg-gray-500/20", text: "text-gray-300", icon: Medal },
    bronze: { bg: "bg-gray-600/20", text: "text-gray-400", icon: Award },
  };
  const config = tierConfig[tier] || tierConfig.bronze;
  const Icon = config.icon;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <Icon className={size === "sm" ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1.5"} />
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ icon: Icon, label, onClick, badge }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-3 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all duration-200 active:scale-95 relative"
  >
    {badge && (
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-primary)] text-white text-xs rounded-full flex items-center justify-center font-bold">
        {badge}
      </span>
    )}
    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-2 bg-[#2A2A2A]">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-xs font-medium text-gray-400">{label}</span>
  </button>
);

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subValue, trend, trendUp }) => (
  <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] relative overflow-hidden">
    <div className="absolute top-2 right-2 opacity-20">
      <Icon className="w-12 h-12 text-gray-500" />
    </div>
    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
    <div className="flex items-baseline space-x-1">
      <p className="text-2xl font-bold text-white">{value}</p>
      {subValue && <span className="text-[10px] text-gray-500">{subValue}</span>}
    </div>
    {trend && (
      <div className={`mt-2 flex items-center text-xs ${
        trendUp ? "text-[var(--color-primary)]" : "text-gray-500"
      }`}>
        {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
        <span>{trend}</span>
      </div>
    )}
  </div>
);

const BarberDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { branding } = useBranding();
  const [activeTab, setActiveTab] = useState("overview");
  const [statsPeriod, setStatsPeriod] = useState("monthly");

  // Check if we're on the barber dashboard route
  const isOnBarberDashboard = location.pathname === "/barber/dashboard";
  if (!isOnBarberDashboard) return null;

  // Get barber data
  const barbers = user?.branch_id
    ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
    : useQuery(api.services.barbers.getAllBarbers);
  const currentBarber = barbers?.find((barber) => barber.user === user?._id);

  // Mutations
  const updateBarberMutation = useMutation(api.services.barbers.updateBarber);
  const createBarberProfile = useMutation(api.services.barbers.createBarberProfile);

  // Auto-create barber profile
  useEffect(() => {
    if (user?.role === "barber" && barbers && !currentBarber && user._id && user.branch_id) {
      createBarberProfile({ userId: user._id, branch_id: user.branch_id }).catch(console.error);
    }
  }, [user, barbers, currentBarber, createBarberProfile]);

  // Get transactions
  const allTransactions = user?.branch_id
    ? useQuery(api.services.transactions.getTransactionsByBranch, { branch_id: user.branch_id })
    : useQuery(api.services.transactions.getAllTransactions);

  // Get bookings for this barber
  const barberBookings = useQuery(
    api.services.bookings.getBookingsByBarber,
    currentBarber ? { barberId: currentBarber._id } : "skip"
  ) || [];

  // Get rating analytics
  const ratingAnalytics = useQuery(
    api.services.ratings.getBarberRatingsAnalytics,
    currentBarber ? { barberId: currentBarber._id } : "skip"
  );

  // Get stats by period
  const periodStats = useQuery(
    api.services.barbers.getBarberStatsByPeriod,
    currentBarber ? { barberId: currentBarber._id, period: statsPeriod } : "skip"
  );

  // Get top barbers
  const topBarbers = useQuery(
    api.services.barbers.getTopBarbers,
    user?.branch_id ? { branch_id: user.branch_id, limit: 5, period: "monthly" } : "skip"
  );

  // Get activities
  const barberActivities = useQuery(
    api.services.barbers.getBarberActivities,
    currentBarber ? { barberId: currentBarber._id, limit: 10 } : "skip"
  );

  // Filter transactions for this barber
  const barberTransactions = allTransactions?.filter(
    (t) => t.barber === currentBarber?._id && t.payment_status === "completed"
  ) || [];

  // Calculate today's stats
  const today = new Date().toISOString().split("T")[0];
  const todayBookings = barberBookings.filter((b) => b.date === today);
  const pendingBookings = barberBookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const todayRevenue = barberTransactions
    .filter((t) => new Date(t.createdAt).toISOString().split("T")[0] === today)
    .reduce((sum, t) => sum + t.total_amount, 0);

  // Calculate this month's stats
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = barberTransactions
    .filter((t) => new Date(t.createdAt).toISOString().slice(0, 7) === thisMonth)
    .reduce((sum, t) => sum + t.total_amount, 0);

  // Period options
  const periodOptions = [
    { value: "daily", label: "Today" },
    { value: "weekly", label: "Week" },
    { value: "monthly", label: "Month" },
    { value: "yearly", label: "Year" },
    { value: "all_time", label: "All" },
  ];

  // Tab configuration - 5 tabs for bottom nav
  const tabs = [
    { id: "overview", label: "Home", icon: Home },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "earnings", label: "Earnings", icon: Wallet },
    { id: "schedule", label: "Schedule", icon: Clock },
    { id: "profile", label: "Profile", icon: UserCircle },
  ];

  // Format activity time
  const formatActivityTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get activity icon
  const getActivityIcon = (type) => {
    switch (type) {
      case "booking": return Calendar;
      case "transaction": return CreditCard;
      case "rating": return Star;
      default: return Activity;
    }
  };

  // Render Overview Tab
  const renderOverview = () => (
    <div className="px-4 pb-6 space-y-4">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A] border border-[var(--color-primary)]/50">
        <div className="relative p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-[#2A2A2A] flex items-center justify-center overflow-hidden border border-[#3A3A3A]">
                {currentBarber?.avatar ? (
                  <img src={currentBarber.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-[var(--color-primary)]">
                    {currentBarber?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},</p>
                <h2 className="text-lg font-bold text-white">{currentBarber?.full_name?.split(' ')[0] || 'Barber'}!</h2>
              </div>
            </div>
            {currentBarber?.rating > 0 && (
              <div className="flex items-center space-x-1 bg-[#2A2A2A] rounded-lg px-2 py-1 border border-[#3A3A3A]">
                <Star className="w-3 h-3 fill-[var(--color-primary)] text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-white">{currentBarber.rating}</span>
              </div>
            )}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#2A2A2A] rounded-xl p-3 text-center border border-[#3A3A3A]">
              <div className="text-xl font-bold text-white">{todayBookings.length}</div>
              <div className="text-xs text-gray-500">Today</div>
            </div>
            <div className="bg-[#2A2A2A] rounded-xl p-3 text-center border border-[#3A3A3A]">
              <div className="text-xl font-bold text-white">{pendingBookings.length}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="bg-[#2A2A2A] rounded-xl p-3 text-center border border-[#3A3A3A]">
              <div className="text-xl font-bold text-[var(--color-primary)]">₱{todayRevenue.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Earned</div>
            </div>
          </div>

          {/* Status Message */}
          <div className="mt-3 bg-[#2A2A2A] rounded-xl p-2.5 border border-[#3A3A3A]">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-400">
                {todayBookings.length === 0 ? "No appointments yet - time to shine!" :
                 todayBookings.length <= 2 ? "Great start! Keep up the momentum!" :
                 todayBookings.length <= 4 ? "Busy day ahead! You're doing great!" :
                 "Fully booked! You're on fire today!"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
          <Zap className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <QuickActionButton
            icon={Calendar}
            label="Bookings"
            onClick={() => setActiveTab("bookings")}
            badge={pendingBookings.length > 0 ? pendingBookings.length : null}
          />
          <QuickActionButton
            icon={Wallet}
            label="Earnings"
            onClick={() => setActiveTab("earnings")}
          />
          <QuickActionButton
            icon={Clock}
            label="Schedule"
            onClick={() => setActiveTab("schedule")}
          />
          <QuickActionButton
            icon={Users}
            label="Clients"
            onClick={() => setActiveTab("clients")}
          />
        </div>
      </div>

      {/* Stats Period Filter */}
      <div className="flex items-center justify-between bg-[#1A1A1A] rounded-2xl p-3 border border-[#2A2A2A]">
        <span className="text-xs text-gray-400 font-medium">Statistics</span>
        <div className="flex gap-1">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatsPeriod(option.value)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                statsPeriod === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[#2A2A2A] text-gray-400 hover:bg-[#333333]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Calendar}
          label="Bookings"
          value={periodStats?.totalBookings ?? barberBookings.length}
          subValue={periodOptions.find(p => p.value === statsPeriod)?.label.toLowerCase()}
          trend={`${periodStats?.completedBookings ?? 0} done`}
          trendUp={true}
        />
        <StatCard
          icon={Star}
          label="Rating"
          value={ratingAnalytics?.averageRating || currentBarber?.rating || "0.0"}
          subValue="/5"
          trend={`${ratingAnalytics?.totalRatings || 0} reviews`}
          trendUp={true}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={`₱${(periodStats?.totalRevenue ?? monthlyRevenue).toLocaleString()}`}
          trend={`${periodStats?.uniqueCustomers ?? 0} customers`}
          trendUp={true}
        />
        <StatCard
          icon={Users}
          label="Clients"
          value={periodStats?.uniqueCustomers ?? 0}
          subValue="unique"
          trend={`${periodStats?.cancelledBookings ?? 0} cancelled`}
          trendUp={false}
        />
      </div>

      {/* Today's Appointments */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
          <h3 className="text-sm font-medium text-white flex items-center">
            <CalendarDays className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Today's Schedule
          </h3>
          <button
            onClick={() => setActiveTab("bookings")}
            className="text-xs text-gray-400 hover:text-white"
          >
            View All
          </button>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {todayBookings.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-[#2A2A2A] rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-white font-medium mb-1">No appointments today</p>
              <p className="text-gray-500 text-sm">Time to relax or prepare for tomorrow!</p>
            </div>
          ) : (
            todayBookings.slice(0, 4).map((booking) => (
              <div key={booking._id} className="p-4 flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 bg-[#2A2A2A] rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] text-gray-500">{formatTime(booking.time).split(" ")[1]}</span>
                  <span className="text-sm font-bold text-white">{formatTime(booking.time).split(" ")[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{booking.customer_name}</p>
                  <p className="text-xs text-gray-400 truncate">{booking.service_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">₱{booking.price}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    booking.status === 'confirmed' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' :
                    booking.status === 'completed' ? 'bg-white/10 text-white' :
                    booking.status === 'pending' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {barberActivities && barberActivities.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A]">
            <h3 className="text-sm font-medium text-white flex items-center">
              <Activity className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {barberActivities.slice(0, 5).map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={index} className="p-3 flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-[#2A2A2A]">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{activity.title}</p>
                    <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">{formatActivityTime(activity.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Barbers Leaderboard */}
      {topBarbers && topBarbers.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
            <h3 className="text-sm font-medium text-white flex items-center">
              <Trophy className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
              Leaderboard
            </h3>
            <span className="text-xs text-gray-500">This Month</span>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {topBarbers.slice(0, 3).map((barber, index) => {
              const isCurrentBarber = currentBarber && barber._id === currentBarber._id;
              return (
                <div key={barber._id} className={`p-3 flex items-center space-x-3 ${isCurrentBarber ? "bg-[#2A2A2A]" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    index === 0 ? "bg-[var(--color-primary)] text-white" :
                    "bg-[#2A2A2A] text-gray-400"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#2A2A2A]">
                    {barber.avatar ? (
                      <img src={barber.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrentBarber ? "text-[var(--color-primary)]" : "text-white"}`}>
                      {barber.full_name}
                      {isCurrentBarber && <span className="text-xs text-gray-500 ml-1">(You)</span>}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Star className="w-3 h-3 text-[var(--color-primary)] fill-[var(--color-primary)] mr-0.5" />
                        {barber.rating || 0}
                      </span>
                      <span>{barber.completedBookings} jobs</span>
                    </div>
                  </div>
                  <TierBadge tier={barber.tier} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rating Analytics */}
      {ratingAnalytics && ratingAnalytics.totalRatings > 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white flex items-center">
              <Star className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
              Customer Reviews
            </h3>
            <div className="flex items-center space-x-1 bg-[var(--color-primary)]/20 px-2 py-1 rounded-lg">
              <Star className="w-3 h-3 text-[var(--color-primary)] fill-[var(--color-primary)]" />
              <span className="text-sm font-bold text-[var(--color-primary)]">{ratingAnalytics.averageRating}</span>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2 mb-4">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingAnalytics.ratingBreakdown[rating] || 0;
              const percentage = ratingAnalytics.totalRatings > 0 ? (count / ratingAnalytics.totalRatings) * 100 : 0;
              return (
                <div key={rating} className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 w-3">{rating}</span>
                  <Star className="w-3 h-3 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                  <div className="flex-1 bg-[#2A2A2A] rounded-full h-1.5">
                    <div className="bg-[var(--color-primary)] h-1.5 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Recent Reviews */}
          {ratingAnalytics.recentRatings?.length > 0 && (
            <div className="border-t border-[#2A2A2A] pt-3">
              <p className="text-xs text-gray-500 mb-2">Recent Reviews</p>
              <div className="space-y-2">
                {ratingAnalytics.recentRatings.slice(0, 2).map((review, index) => (
                  <div key={index} className="bg-[#2A2A2A] rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= review.rating ? "text-[var(--color-primary)] fill-[var(--color-primary)]" : "text-gray-600"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    {review.feedback && <p className="text-xs text-gray-400 line-clamp-2">{review.feedback}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render Earnings Tab
  const renderEarnings = () => (
    <div className="px-4 pb-6 space-y-4">
      {/* Earnings Hero */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A]">
        <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
        <h2 className="text-3xl font-bold text-white mb-3">₱{(periodStats?.totalRevenue ?? monthlyRevenue).toLocaleString()}</h2>
        <div className="flex items-center text-[var(--color-primary)] text-sm">
          <ArrowUpRight className="w-4 h-4 mr-1" />
          <span>+12% vs last period</span>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex items-center justify-between bg-[#1A1A1A] rounded-2xl p-3 border border-[#2A2A2A]">
        <span className="text-xs text-gray-500 font-medium">Period</span>
        <div className="flex gap-1">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatsPeriod(option.value)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                statsPeriod === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[#2A2A2A] text-gray-400 hover:bg-[#333333]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Earnings Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Completed</span>
          </div>
          <p className="text-xl font-bold text-white">{periodStats?.completedBookings ?? 0}</p>
          <p className="text-xs text-gray-500">services</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Avg. Value</span>
          </div>
          <p className="text-xl font-bold text-white">₱{Math.round(periodStats?.averageBookingValue ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500">per booking</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A]">
          <h3 className="text-sm font-medium text-white flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Recent Transactions
          </h3>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {barberTransactions.slice(0, 5).map((transaction, index) => (
            <div key={index} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Service Payment</p>
                <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--color-primary)]">+₱{transaction.total_amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{transaction.payment_method}</p>
              </div>
            </div>
          ))}
          {barberTransactions.length === 0 && (
            <div className="p-8 text-center">
              <Wallet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Schedule Tab
  const renderSchedule = () => (
    <div className="px-4 pb-6 space-y-4">
      {/* Schedule Header */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A]">
        <p className="text-sm text-gray-500 mb-1">Your Schedule</p>
        <h2 className="text-xl font-bold text-white mb-1">Manage Availability</h2>
        <p className="text-sm text-gray-500">Set your working hours and days off</p>
      </div>

      {/* Working Hours */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
          <h3 className="text-sm font-medium text-white flex items-center">
            <Clock className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Working Hours
          </h3>
          <button className="text-xs text-gray-400 hover:text-white">Edit</button>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
            const isWorkDay = index < 6; // Mon-Sat
            return (
              <div key={day} className="p-3 flex items-center justify-between">
                <span className={`text-sm ${isWorkDay ? 'text-white' : 'text-gray-600'}`}>{day}</span>
                <span className={`text-sm ${isWorkDay ? 'text-gray-400' : 'text-gray-600'}`}>
                  {isWorkDay ? '9:00 AM - 8:00 PM' : 'Day Off'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Time Off */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
          <h3 className="text-sm font-medium text-white flex items-center">
            <CalendarDays className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Time Off
          </h3>
          <button className="text-xs bg-[var(--color-primary)] text-white px-3 py-1 rounded-lg">
            + Request
          </button>
        </div>
        <div className="p-8 text-center">
          <CalendarDays className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No upcoming time off scheduled</p>
          <p className="text-gray-500 text-xs mt-1">Request time off for vacations or personal days</p>
        </div>
      </div>
    </div>
  );

  // Render Clients Tab (placeholder)
  const renderClients = () => (
    <div className="px-4 pb-6 space-y-4">
      <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A]">
        <p className="text-sm text-gray-500 mb-1">Your Clients</p>
        <h2 className="text-xl font-bold text-white mb-1">{periodStats?.uniqueCustomers ?? 0} Customers</h2>
        <p className="text-sm text-gray-500">Build lasting relationships</p>
      </div>

      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8 text-center">
        <Users className="w-10 h-10 text-gray-600 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">Client Management</h3>
        <p className="text-gray-500 text-sm">Track your regular clients and their preferences</p>
        <p className="text-xs text-gray-600 mt-2">Coming soon</p>
      </div>
    </div>
  );

  // Main render content
  const renderContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "bookings": return <BarberBookings />;
      case "earnings": return renderEarnings();
      case "schedule": return renderSchedule();
      case "clients": return renderClients();
      case "profile": return <BarberProfile />;
      default: return renderOverview();
    }
  };

  // Loading state
  if (barbers === undefined || user === undefined) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  // No barber profile state
  if (!currentBarber) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="text-center">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Setting Up Profile</h2>
          <p className="text-gray-500 text-sm">Please wait while we set up your barber profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-20">
      {/* Mobile Header */}
      <div className="bg-[#0D0D0D] border-b border-[#1A1A1A] sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white">
              {activeTab === "overview" ? "Dashboard" :
               activeTab === "bookings" ? "Bookings" :
               activeTab === "earnings" ? "Earnings" :
               activeTab === "schedule" ? "Schedule" :
               activeTab === "clients" ? "Clients" :
               activeTab === "profile" ? "Profile" : "Dashboard"}
            </h1>
            <button className="p-2 bg-[#1A1A1A] rounded-xl relative">
              <Bell className="w-5 h-5 text-gray-400" />
              {pendingBookings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-primary)] text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {pendingBookings.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-4">{renderContent()}</div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom">
        <div className="grid grid-cols-5 p-1 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2 transition-colors ${
                  isActive ? "text-[var(--color-primary)]" : "text-gray-600"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BarberDashboard;
