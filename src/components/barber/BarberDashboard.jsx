import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  X,
  BellRing,
  Check,
  Edit3,
  Image,
  Plus,
  Trash2,
  Camera,
  Grid3X3,
  Heart,
  MessageCircle,
  Bookmark,
  MoreVertical,
  Sparkles,
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

// Notification Panel Component
const NotificationPanel = ({ isOpen, onClose, userId }) => {
  const notifications = useQuery(
    api.services.notifications.getUserNotifications,
    userId ? { userId, limit: 20 } : "skip"
  );
  const unreadCount = useQuery(
    api.services.notifications.getUnreadCount,
    userId ? { userId } : "skip"
  );
  const markAsRead = useMutation(api.services.notifications.markAsRead);
  const markAllAsRead = useMutation(api.services.notifications.markAllAsRead);
  const clearAllNotifications = useMutation(api.services.notifications.clearAllNotifications);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead({ notificationId, userId });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({ userId });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications({ userId });
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  const formatNotificationTime = (timestamp) => {
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

  const getNotificationIcon = (type, priority) => {
    if (priority === "high" || priority === "urgent") {
      return <AlertCircle className="w-5 h-5 text-[var(--color-primary)]" />;
    }
    switch (type) {
      case "booking":
        return <Calendar className="w-5 h-5 text-[var(--color-primary)]" />;
      case "payment":
        return <CreditCard className="w-5 h-5 text-green-500" />;
      case "reminder":
        return <Clock className="w-5 h-5 text-blue-500" />;
      case "alert":
        return <BellRing className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-20 w-full max-w-md bg-[#0D0D0D] z-50 animate-slide-in-right flex flex-col border-l border-[#2A2A2A]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#0D0D0D]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Notifications</h2>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-[#1A1A1A] rounded-xl hover:bg-[#2A2A2A] transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Actions */}
        {notifications && notifications.length > 0 && (
          <div className="px-4 py-2 border-b border-[#2A2A2A] flex items-center justify-between">
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
            >
              <Check className="w-3 h-3" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-400 hover:text-red-400 flex items-center space-x-1"
            >
              <X className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {!notifications ? (
            <div className="flex items-center justify-center h-40">
              <LoadingSpinner size="md" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-white font-medium mb-2">No notifications</h3>
              <p className="text-gray-500 text-sm">
                You're all caught up! New booking notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1A1A1A]">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification._id)}
                  className={`p-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer ${
                    !notification.is_read ? "bg-[#1A1A1A]/50 border-l-2 border-[var(--color-primary)]" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-xl ${
                      !notification.is_read ? "bg-[var(--color-primary)]/20" : "bg-[#2A2A2A]"
                    }`}>
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium ${
                          !notification.is_read ? "text-white" : "text-gray-300"
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full flex-shrink-0 mt-1.5 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                        {notification.priority === "high" || notification.priority === "urgent" ? (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full">
                            {notification.priority}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

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
  const navigate = useNavigate();
  const { tab } = useParams();
  const { branding } = useBranding();
  const [statsPeriod, setStatsPeriod] = useState("monthly");
  const [showNotifications, setShowNotifications] = useState(false);

  // Map URL tab to internal tab names
  const tabMapping = {
    home: "overview",
    bookings: "bookings",
    portfolio: "portfolio",
    earnings: "earnings",
    schedule: "schedule",
    profile: "profile",
  };

  // Get active tab from URL or default to overview
  const activeTab = tabMapping[tab] || "overview";

  // Function to change tab (updates URL)
  const setActiveTab = (newTab) => {
    const urlTab = Object.keys(tabMapping).find(key => tabMapping[key] === newTab) || "home";
    navigate(`/barber/${urlTab}`, { replace: true });
  };

  // Get notification unread count
  const notificationUnreadCount = useQuery(
    api.services.notifications.getUnreadCount,
    user?._id ? { userId: user._id } : "skip"
  );

  // Check if we're on the barber route
  const isOnBarberRoute = location.pathname.startsWith("/barber");
  if (!isOnBarberRoute) return null;

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

  // Get avatar URL from storage
  const avatarUrl = useQuery(
    api.services.barbers.getImageUrl,
    currentBarber?.avatarStorageId ? { storageId: currentBarber.avatarStorageId } : "skip"
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

  // Get portfolio items
  const portfolioItems = useQuery(
    api.services.portfolio.getBarberPortfolio,
    currentBarber ? { barber_id: currentBarber._id } : "skip"
  );

  // Portfolio mutations
  const addPortfolioItem = useMutation(api.services.portfolio.addPortfolioItem);
  const deletePortfolioItem = useMutation(api.services.portfolio.deletePortfolioItem);
  const generateUploadUrl = useMutation(api.services.barbers.generateUploadUrl);

  // Portfolio state
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
  const [portfolioCaption, setPortfolioCaption] = useState("");
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

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

  // Tab configuration - 5 tabs for bottom nav (Profile moved to header)
  const tabs = [
    { id: "overview", urlPath: "home", label: "Home", icon: Home },
    { id: "bookings", urlPath: "bookings", label: "Bookings", icon: Calendar },
    { id: "portfolio", urlPath: "portfolio", label: "Portfolio", icon: Image },
    { id: "earnings", urlPath: "earnings", label: "Earnings", icon: Wallet },
    { id: "schedule", urlPath: "schedule", label: "Schedule", icon: Clock },
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
          label="Earnings"
          value={`₱${(periodStats?.totalEarnings ?? 0).toLocaleString()}`}
          trend={`${periodStats?.commissionRate ?? 0}% commission`}
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
        <p className="text-sm text-gray-500 mb-1">Your Earnings</p>
        <h2 className="text-3xl font-bold text-white mb-3">₱{(periodStats?.totalEarnings ?? 0).toLocaleString()}</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-400 text-xs">
            <span>Gross Revenue: ₱{(periodStats?.totalRevenue ?? monthlyRevenue).toLocaleString()}</span>
          </div>
          <div className="flex items-center text-[var(--color-primary)] text-xs">
            <span>{periodStats?.daysWorked ?? 0} days worked</span>
          </div>
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

      {/* Commission Breakdown */}
      <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center">
          <Wallet className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
          Commission Breakdown
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
              <span className="text-sm text-gray-400">Service Commission</span>
            </div>
            <span className="text-sm font-medium text-white">₱{(periodStats?.serviceCommission ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-400">Product Commission</span>
            </div>
            <span className="text-sm font-medium text-white">₱{(periodStats?.productCommission ?? 0).toLocaleString()}</span>
          </div>
          <div className="border-t border-[#2A2A2A] pt-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Daily Rate</span>
            <span className="text-sm text-gray-500">₱{(periodStats?.dailyRate ?? 0).toLocaleString()}/day</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Commission Rate</span>
            <span className="text-sm text-gray-500">{(periodStats?.commissionRate ?? 0)}%</span>
          </div>
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
            <span className="text-xs text-gray-500">Avg. Earning</span>
          </div>
          <p className="text-xl font-bold text-white">₱{Math.round((periodStats?.totalEarnings ?? 0) / Math.max(periodStats?.daysWorked ?? 1, 1)).toLocaleString()}</p>
          <p className="text-xs text-gray-500">per day</p>
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

  // Format time from 24h to 12h format
  const formatScheduleTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get schedule data from barber
  const scheduleData = currentBarber?.schedule || {};
  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  // Render Schedule Tab
  const renderSchedule = () => (
    <div className="px-4 pb-6 space-y-4">
      {/* Schedule Header */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A]">
        <p className="text-sm text-gray-500 mb-1">Your Schedule</p>
        <h2 className="text-xl font-bold text-white mb-1">Working Hours</h2>
        <p className="text-sm text-gray-500">Your weekly availability schedule</p>
      </div>

      {/* Working Hours */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
          <h3 className="text-sm font-medium text-white flex items-center">
            <Clock className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Weekly Schedule
          </h3>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {days.map(({ key, label }) => {
            const daySchedule = scheduleData[key];
            const isAvailable = daySchedule?.available ?? false;
            const startTime = daySchedule?.start || '09:00';
            const endTime = daySchedule?.end || '17:00';

            return (
              <div key={key} className="p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className={`text-sm ${isAvailable ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                </div>
                <span className={`text-sm ${isAvailable ? 'text-gray-400' : 'text-gray-600'}`}>
                  {isAvailable ? `${formatScheduleTime(startTime)} - ${formatScheduleTime(endTime)}` : 'Day Off'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center">
          <CalendarDays className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
          Schedule Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#2A2A2A] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">
              {days.filter(d => scheduleData[d.key]?.available).length}
            </p>
            <p className="text-xs text-gray-500">Working Days</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">
              {days.filter(d => !scheduleData[d.key]?.available).length}
            </p>
            <p className="text-xs text-gray-500">Days Off</p>
          </div>
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

  // Handle portfolio upload
  const handlePortfolioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentBarber) return;

    setIsUploadingPortfolio(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // Add portfolio item
      await addPortfolioItem({
        barber_id: currentBarber._id,
        branch_id: currentBarber.branch_id,
        image_storage_id: storageId,
        caption: portfolioCaption || "",
        tags: [],
        is_featured: false,
      });

      setPortfolioCaption("");
    } catch (error) {
      console.error("Failed to upload portfolio image:", error);
    } finally {
      setIsUploadingPortfolio(false);
    }
  };

  // Handle delete portfolio item
  const handleDeletePortfolio = async (itemId) => {
    if (!confirm("Delete this portfolio image?")) return;
    try {
      await deletePortfolioItem({ id: itemId });
    } catch (error) {
      console.error("Failed to delete portfolio item:", error);
    }
  };

  // Render Portfolio Tab - Instagram-like Design
  const renderPortfolio = () => (
    <div className="pb-6 px-4">
      {/* Instagram-style Profile Header */}
      <div className="pt-2 pb-4">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[#0D0D0D]">
              {(avatarUrl || currentBarber?.avatar) ? (
                <img
                  src={avatarUrl || currentBarber?.avatar}
                  alt={currentBarber?.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {currentBarber?.full_name?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            {/* Add Story Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--color-primary)] rounded-full flex items-center justify-center border-2 border-[#0D0D0D] shadow-lg"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{portfolioItems?.length || 0}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{currentBarber?.totalBookings || 0}</p>
              <p className="text-xs text-gray-500">Clients</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{currentBarber?.rating?.toFixed(1) || "5.0"}</p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mt-4">
          <h3 className="text-base font-bold text-white">{currentBarber?.full_name}</h3>
          <p className="text-sm text-[var(--color-primary)] font-medium">Professional Barber</p>
          {currentBarber?.specialties?.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              {currentBarber.specialties.slice(0, 3).join(" • ")}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className="flex-1 py-2.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white font-semibold rounded-xl transition-colors border border-[#2A2A2A]"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-t border-[#1A1A1A] flex -mx-4">
        <button className="flex-1 py-3 flex items-center justify-center gap-2 border-b-2 border-white text-white">
          <Grid3X3 className="w-5 h-5" />
          <span className="text-sm font-medium">Grid</span>
        </button>
        <button className="flex-1 py-3 flex items-center justify-center gap-2 border-b-2 border-transparent text-gray-500">
          <Bookmark className="w-5 h-5" />
          <span className="text-sm font-medium">Saved</span>
        </button>
      </div>

      {/* Portfolio Grid - Instagram Style */}
      {portfolioItems?.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-gray-700 flex items-center justify-center">
            <Camera className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Share Photos</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
            When you share photos, they will appear on your profile.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="text-[var(--color-primary)] font-semibold text-sm hover:text-[var(--color-accent)]"
          >
            Share your first photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 -mx-4 mt-2">
          {portfolioItems?.map((item, index) => (
            <div
              key={item._id}
              onClick={() => setSelectedPortfolioItem(item)}
              className="relative aspect-square cursor-pointer group"
            >
              <img
                src={item.imageUrl}
                alt={item.caption || "Portfolio"}
                className="w-full h-full object-cover"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                <div className="flex items-center gap-1.5 text-white">
                  <Heart className="w-5 h-5 fill-white" />
                  <span className="font-semibold">{item.likes_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white">
                  <MessageCircle className="w-5 h-5 fill-white" />
                  <span className="font-semibold">0</span>
                </div>
              </div>
              {/* Featured Badge */}
              {item.is_featured && (
                <div className="absolute top-2 right-2">
                  <Sparkles className="w-4 h-4 text-yellow-400 drop-shadow-lg" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              if (!isUploadingPortfolio) {
                setShowUploadModal(false);
                setSelectedFile(null);
                setFilePreview(null);
              }
            }}
          />
          <div className="relative w-full max-w-xl mx-4 bg-[#1A1A1A] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
              <button
                onClick={() => {
                  if (!isUploadingPortfolio) {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setFilePreview(null);
                  }
                }}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isUploadingPortfolio}
              >
                Cancel
              </button>
              <h3 className="text-base font-semibold text-white">New Post</h3>
              <div className="w-12" />
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Upload Area / Preview */}
              <div className={`aspect-video rounded-2xl overflow-hidden ${
                filePreview ? "" : "border-2 border-dashed border-[#3A3A3A]"
              } bg-[#0D0D0D] transition-all flex flex-col items-center justify-center`}>
                {isUploadingPortfolio ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">Uploading...</span>
                  </div>
                ) : filePreview ? (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Select a photo to upload</p>
                  </div>
                )}
              </div>

              {/* Caption Input */}
              <input
                type="text"
                value={portfolioCaption}
                onChange={(e) => setPortfolioCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full h-12 px-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent text-sm"
                disabled={isUploadingPortfolio}
              />

              {/* Tips */}
              <div className="flex items-start gap-3 p-3 bg-[#0D0D0D] rounded-xl">
                <Sparkles className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  Pro tip: Upload high-quality photos of your best work to attract more clients
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                {/* Select Photo Button */}
                <label className={`flex-1 ${selectedFile ? "" : "flex-[2]"}`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setFilePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                    disabled={isUploadingPortfolio}
                  />
                  <div className={`w-full py-4 rounded-xl font-semibold text-center cursor-pointer transition-all ${
                    isUploadingPortfolio
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : selectedFile
                        ? "bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-[#3A3A3A]"
                        : "bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white"
                  }`}>
                    {selectedFile ? "Change Photo" : "Select Photo"}
                  </div>
                </label>

                {/* Upload Button - Only show when file is selected */}
                {selectedFile && (
                  <button
                    onClick={async () => {
                      if (!selectedFile || isUploadingPortfolio) return;

                      // Create a fake event object to pass to the existing handler
                      const fakeEvent = { target: { files: [selectedFile] } };
                      await handlePortfolioUpload(fakeEvent);

                      // Reset and close
                      setSelectedFile(null);
                      setFilePreview(null);
                      setShowUploadModal(false);
                    }}
                    disabled={isUploadingPortfolio}
                    className={`flex-[2] py-4 rounded-xl font-semibold text-center transition-all ${
                      isUploadingPortfolio
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white"
                    }`}
                  >
                    {isUploadingPortfolio ? "Uploading..." : "Upload"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Image Modal */}
      {selectedPortfolioItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/95"
            onClick={() => setSelectedPortfolioItem(null)}
          />
          <div className="relative w-full max-w-lg mx-4">
            {/* Post Card */}
            <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden">
              {/* Post Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {(avatarUrl || currentBarber?.avatar) ? (
                      <img
                        src={avatarUrl || currentBarber?.avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {currentBarber?.full_name?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{currentBarber?.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(selectedPortfolioItem.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPortfolioItem(null)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#2A2A2A] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Post Image */}
              <div className="aspect-square">
                <img
                  src={selectedPortfolioItem.imageUrl}
                  alt={selectedPortfolioItem.caption || "Portfolio"}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Post Actions */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <button className="hover:opacity-70 transition-opacity">
                      <Heart className="w-6 h-6 text-white" />
                    </button>
                    <button className="hover:opacity-70 transition-opacity">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      handleDeletePortfolio(selectedPortfolioItem._id);
                      setSelectedPortfolioItem(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

                {/* Likes */}
                <p className="text-sm font-semibold text-white mb-2">
                  {selectedPortfolioItem.likes_count || 0} likes
                </p>

                {/* Caption */}
                {selectedPortfolioItem.caption && (
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-white mr-2">{currentBarber?.full_name?.split(' ')[0]}</span>
                    {selectedPortfolioItem.caption}
                  </p>
                )}

                {/* Tags */}
                {selectedPortfolioItem.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedPortfolioItem.tags.map((tag, i) => (
                      <span key={i} className="text-sm text-[var(--color-primary)]">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );

  // Main render content
  const renderContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "bookings": return <BarberBookings />;
      case "portfolio": return renderPortfolio();
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
               activeTab === "portfolio" ? "Portfolio" :
               activeTab === "earnings" ? "Earnings" :
               activeTab === "schedule" ? "Schedule" :
               activeTab === "clients" ? "Clients" :
               activeTab === "profile" ? "Profile" : "Dashboard"}
            </h1>
            <div className="flex items-center gap-2">
              {/* Edit Profile Button - only show on profile tab */}
              {activeTab === "profile" && (
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggleBarberProfileEdit'));
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-[#1A1A1A] rounded-xl active:scale-95 transition-transform"
                >
                  <Edit3 className="w-[18px] h-[18px] text-gray-400" />
                </button>
              )}
              {/* Notification Button */}
              <button
                onClick={() => setShowNotifications(true)}
                className="w-9 h-9 flex items-center justify-center bg-[#1A1A1A] rounded-xl relative active:scale-95 transition-transform"
              >
                <Bell className="w-[18px] h-[18px] text-gray-400" />
                {(notificationUnreadCount > 0 || pendingBookings.length > 0) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-primary)] text-white text-[10px] rounded-full flex items-center justify-center font-medium animate-pulse">
                    {notificationUnreadCount > 0 ? notificationUnreadCount : pendingBookings.length}
                  </span>
                )}
              </button>
              {/* Profile Button */}
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform overflow-hidden ${
                  activeTab === "profile"
                    ? "bg-[var(--color-primary)] ring-2 ring-[var(--color-primary)]"
                    : "bg-[#1A1A1A]"
                }`}
              >
                {(avatarUrl || currentBarber?.avatar) ? (
                  <img
                    src={avatarUrl || currentBarber.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className={`w-[18px] h-[18px] ${
                    activeTab === "profile" ? "text-white" : "text-gray-400"
                  }`} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-4">{renderContent()}</div>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={user?._id}
      />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom">
        <div className="grid grid-cols-5 p-1 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(`/barber/${tab.urlPath}`, { replace: true })}
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
