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
  Sun,
  Moon,
  Lightbulb,
  Flame,
  Gift,
  Repeat,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import BarberBookings from "./BarberBookings";
import BarberProfile from "./BarberProfile";
import TimeOffManager from "./TimeOffManager";
import CashAdvanceSection from "./CashAdvanceSection";
import LoadingSpinner from "../common/LoadingSpinner";
import ClockButton from "../common/ClockButton";
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
  const { user, loading: authLoading } = useCurrentUser();
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
    finance: "finance",
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

  // Get transactions - with pagination limits to avoid byte limit errors
  const transactionsData = user?.branch_id
    ? useQuery(api.services.transactions.getTransactionsByBranch, { branch_id: user.branch_id, limit: 100 })
    : useQuery(api.services.transactions.getAllTransactions, { limit: 100 });
  const allTransactions = transactionsData?.transactions || [];

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

  // Get branch info for the barber
  const barberBranch = useQuery(
    api.services.branches.getBranchById,
    currentBarber?.branch_id ? { id: currentBarber.branch_id } : "skip"
  );

  // Get cover photo URL from storage
  const coverUrl = useQuery(
    api.services.barbers.getImageUrl,
    currentBarber?.coverPhotoStorageId ? { storageId: currentBarber.coverPhotoStorageId } : "skip"
  );

  // Get stats by period (for booking counts, unique customers, etc.)
  const periodStats = useQuery(
    api.services.barbers.getBarberStatsByPeriod,
    currentBarber ? { barberId: currentBarber._id, period: statsPeriod } : "skip"
  );

  // Calculate period timestamps for payroll earnings query
  const periodTimestamps = React.useMemo(() => {
    const now = new Date();
    let startDate;
    switch (statsPeriod) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "weekly": {
        const day = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        break;
      }
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "all_time":
      default:
        startDate = new Date(0);
        break;
    }
    return { period_start: startDate.getTime(), period_end: now.getTime() };
  }, [statsPeriod]);

  // Use payroll's calculateBarberEarnings for earnings (guaranteed same formula)
  const payrollEarnings = useQuery(
    api.services.payroll.calculateBarberEarnings,
    currentBarber ? {
      barber_id: currentBarber._id,
      ...periodTimestamps
    } : "skip"
  );

  // Weekly timestamps for earnings goal progress bar
  const weeklyTimestamps = React.useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    return { period_start: startOfWeek.getTime(), period_end: now.getTime() };
  }, []);

  // Always fetch weekly payroll earnings for goal progress bar
  const weeklyPayrollEarnings = useQuery(
    api.services.payroll.calculateBarberEarnings,
    currentBarber && statsPeriod !== "weekly"
      ? { barber_id: currentBarber._id, ...weeklyTimestamps }
      : "skip"
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

  // Get cash advance deductions for payroll view
  const cashAdvanceDeductions = useQuery(
    api.services.payroll.getCashAdvanceDeductions,
    currentBarber ? { barber_id: currentBarber._id } : "skip"
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
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const coverInputRef = React.useRef(null);
  const avatarInputRef = React.useRef(null);

  // Reviews state
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Expandable sections state for compact dashboard
  const [expandedSections, setExpandedSections] = useState({
    insights: false,
    schedule: true, // Default expanded
    records: false,
    commissionBreakdown: false, // Earnings tab - collapsible commission details
  });

  // Earnings tab state
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [ringExpanded, setRingExpanded] = useState(false);
  const [earningsPop, setEarningsPop] = useState(false);
  const prevEarningsRef = React.useRef(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  // ============================================
  // NEW: Enhanced Analytics & Insights
  // ============================================

  // Smart Timeline: sorted schedule with focus index and progress
  const smartTimeline = React.useMemo(() => {
    const sorted = [...todayBookings]
      .filter(b => b.time)
      .sort((a, b) => {
        const [aH, aM] = a.time.split(':').map(Number);
        const [bH, bM] = b.time.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find the focused booking: first non-completed upcoming, or current one
    let focusIndex = -1;
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i];
      const [h, m] = b.time.split(':').map(Number);
      const bookingMins = h * 60 + m;
      if (b.status === 'completed' || b.status === 'cancelled') continue;
      // First active booking at or after now, or the next one coming
      if (bookingMins + (b.service_duration || 30) > currentMinutes) {
        focusIndex = i;
        break;
      }
    }
    // If none found, focus on the last non-completed
    if (focusIndex === -1) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].status !== 'completed' && sorted[i].status !== 'cancelled') {
          focusIndex = i;
          break;
        }
      }
    }

    const completed = sorted.filter(b => b.status === 'completed').length;
    const total = sorted.filter(b => b.status !== 'cancelled').length;

    return { bookings: sorted, focusIndex, completed, total, currentMinutes };
  }, [todayBookings]);

  // Get customer IDs from today's bookings for last-visit lookup
  const todayCustomerIds = React.useMemo(() => {
    return [...new Set(todayBookings.filter(b => b.customer).map(b => b.customer))];
  }, [todayBookings]);

  const customerLastVisits = useQuery(
    api.services.bookings.getCustomerLastVisit,
    currentBarber && todayCustomerIds.length > 0
      ? { barberId: currentBarber._id, customerIds: todayCustomerIds }
      : "skip"
  );

  // Smart Insights based on patterns
  const smartInsights = React.useMemo(() => {
    if (!barberBookings || barberBookings.length === 0) return [];

    const insights = [];
    const completedBookings = barberBookings.filter(b => b.status === 'completed');

    // Analyze busiest day
    const dayCount = {};
    completedBookings.forEach(b => {
      const day = new Date(b.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    const busiestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    if (busiestDay && busiestDay[1] >= 3) {
      insights.push({
        type: 'pattern',
        icon: 'Calendar',
        title: `${busiestDay[0]}s are your busiest`,
        description: `You get ${Math.round(busiestDay[1] / Math.max(completedBookings.length, 1) * 100)}% of bookings on ${busiestDay[0]}s`,
        color: 'blue'
      });
    }

    // Analyze service popularity
    const serviceCount = {};
    completedBookings.forEach(b => {
      if (b.service_name) {
        serviceCount[b.service_name] = (serviceCount[b.service_name] || 0) + 1;
      }
    });
    const topService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0];
    if (topService && topService[1] >= 3) {
      insights.push({
        type: 'specialty',
        icon: 'Scissors',
        title: `${topService[0]} is your specialty`,
        description: `${topService[1]} customers chose this service`,
        color: 'purple'
      });
    }

    // Analyze rating trend
    if (ratingAnalytics && ratingAnalytics.averageRating >= 4.5) {
      insights.push({
        type: 'excellence',
        icon: 'Star',
        title: 'Top performer!',
        description: `Your ${ratingAnalytics.averageRating} rating puts you in the top tier`,
        color: 'gold'
      });
    }

    // Analyze returning customers
    const customerBookings = {};
    completedBookings.forEach(b => {
      if (b.customer) {
        customerBookings[b.customer] = (customerBookings[b.customer] || 0) + 1;
      }
    });
    const returningCustomers = Object.values(customerBookings).filter(c => c > 1).length;
    const totalCustomers = Object.keys(customerBookings).length;
    const returnRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0;
    if (returnRate >= 30) {
      insights.push({
        type: 'loyalty',
        icon: 'Heart',
        title: `${returnRate}% return rate`,
        description: `${returningCustomers} customers have come back for more`,
        color: 'pink'
      });
    }

    // Time preference insight
    const morningBookings = completedBookings.filter(b => {
      const hour = parseInt(b.time?.split(':')[0] || '12');
      return hour < 12;
    }).length;
    const afternoonBookings = completedBookings.filter(b => {
      const hour = parseInt(b.time?.split(':')[0] || '12');
      return hour >= 12 && hour < 17;
    }).length;
    if (morningBookings > afternoonBookings * 1.5) {
      insights.push({
        type: 'time',
        icon: 'Sun',
        title: 'Morning specialist',
        description: 'Most of your clients prefer morning slots',
        color: 'amber'
      });
    } else if (afternoonBookings > morningBookings * 1.5) {
      insights.push({
        type: 'time',
        icon: 'Moon',
        title: 'Afternoon specialist',
        description: 'Most of your clients prefer afternoon slots',
        color: 'indigo'
      });
    }

    return insights.slice(0, 3); // Max 3 insights
  }, [barberBookings, ratingAnalytics]);

  // Client Loyalty Stats
  const clientStats = React.useMemo(() => {
    if (!barberBookings || barberBookings.length === 0) {
      return { newClients: 0, returningClients: 0, totalClients: 0, returnRate: 0 };
    }

    const completedBookings = barberBookings.filter(b => b.status === 'completed');
    const customerBookings = {};

    completedBookings.forEach(b => {
      if (b.customer) {
        customerBookings[b.customer] = (customerBookings[b.customer] || 0) + 1;
      }
    });

    const totalClients = Object.keys(customerBookings).length;
    const returningClients = Object.values(customerBookings).filter(c => c > 1).length;
    const newClients = totalClients - returningClients;
    const returnRate = totalClients > 0 ? Math.round((returningClients / totalClients) * 100) : 0;

    // This month's new vs returning
    const thisMonthBookings = completedBookings.filter(b =>
      new Date(b.date).toISOString().slice(0, 7) === thisMonth
    );
    const thisMonthCustomers = {};
    const firstTimeCustomers = new Set();

    thisMonthBookings.forEach(b => {
      if (b.customer) {
        // Check if customer had bookings before this month
        const hadPreviousBookings = completedBookings.some(prev =>
          prev.customer === b.customer &&
          new Date(prev.date).toISOString().slice(0, 7) < thisMonth
        );
        if (!hadPreviousBookings) {
          firstTimeCustomers.add(b.customer);
        }
        thisMonthCustomers[b.customer] = true;
      }
    });

    return {
      newClients,
      returningClients,
      totalClients,
      returnRate,
      thisMonthNew: firstTimeCustomers.size,
      thisMonthTotal: Object.keys(thisMonthCustomers).length
    };
  }, [barberBookings, thisMonth]);

  // Personal Bests / Records
  const personalBests = React.useMemo(() => {
    if (!barberBookings || barberBookings.length === 0) return null;

    const completedBookings = barberBookings.filter(b => b.status === 'completed');
    if (completedBookings.length < 3) return null;

    // Most bookings in a single day
    const bookingsByDate = {};
    completedBookings.forEach(b => {
      bookingsByDate[b.date] = (bookingsByDate[b.date] || 0) + 1;
    });
    const maxBookingsDay = Math.max(...Object.values(bookingsByDate), 0);
    const maxBookingsDate = Object.entries(bookingsByDate).find(([, v]) => v === maxBookingsDay)?.[0];

    // Highest earning day
    const earningsByDate = {};
    barberTransactions.forEach(t => {
      const date = new Date(t.createdAt).toISOString().split('T')[0];
      earningsByDate[date] = (earningsByDate[date] || 0) + t.total_amount;
    });
    const maxEarningsDay = Math.max(...Object.values(earningsByDate), 0);

    // Current streak (consecutive days with at least 1 booking)
    let currentStreak = 0;
    const sortedDates = Object.keys(bookingsByDate).sort().reverse();
    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      let checkDate = new Date(today);

      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (bookingsByDate[dateStr]) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0) {
          // Today doesn't have bookings yet, check yesterday
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Best rated service
    const serviceRatings = {};
    const serviceRatingCounts = {};
    if (ratingAnalytics?.recentRatings) {
      ratingAnalytics.recentRatings.forEach(r => {
        if (r.service_name) {
          serviceRatings[r.service_name] = (serviceRatings[r.service_name] || 0) + r.rating;
          serviceRatingCounts[r.service_name] = (serviceRatingCounts[r.service_name] || 0) + 1;
        }
      });
    }
    const bestService = Object.entries(serviceRatings)
      .map(([name, total]) => ({ name, avg: total / serviceRatingCounts[name], count: serviceRatingCounts[name] }))
      .filter(s => s.count >= 2)
      .sort((a, b) => b.avg - a.avg)[0];

    return {
      maxBookingsDay,
      maxBookingsDate,
      maxEarningsDay,
      currentStreak,
      bestService,
      totalCompleted: completedBookings.length
    };
  }, [barberBookings, barberTransactions, ratingAnalytics]);

  // Earnings Goal - uses payroll's calculateBarberEarnings (100% same formula)
  const earningsGoal = React.useMemo(() => {
    const weeklyTarget = currentBarber?.weekly_goal || 15000; // Barber-set goal or default

    // Always use weekly data for goal tracking
    const weeklyData = statsPeriod === "weekly" ? payrollEarnings : weeklyPayrollEarnings;
    const weeklyEarnings = weeklyData?.daily_pay ?? 0;

    const weeklyProgress = weeklyTarget > 0
      ? Math.min(Math.round((weeklyEarnings / weeklyTarget) * 100), 100)
      : 0;

    const weeklyRemaining = Math.max(weeklyTarget - weeklyEarnings, 0);

    // Days left in week
    const now = new Date();
    const daysLeftInWeek = 7 - now.getDay();

    return {
      weeklyTarget,
      weeklyEarnings,
      weeklyProgress,
      weeklyRemaining,
      daysLeftInWeek
    };
  }, [payrollEarnings, weeklyPayrollEarnings, statsPeriod, currentBarber?.weekly_goal]);

  // Daily Scoreboard: cuts completed today, earnings today, products sold today
  const dailyScoreboard = React.useMemo(() => {
    const todayCuts = todayBookings.filter(b => b.status === 'completed').length;
    const todayEarnings = todayRevenue;
    // Count products from today's transactions
    const todayTx = barberTransactions.filter(
      t => new Date(t.createdAt).toISOString().split("T")[0] === today
    );
    const todayProducts = todayTx.reduce((sum, t) => {
      if (t.products && Array.isArray(t.products)) {
        return sum + t.products.reduce((ps, p) => ps + (p.quantity || 0), 0);
      }
      return sum;
    }, 0);

    return { todayCuts, todayEarnings, todayProducts };
  }, [todayBookings, todayRevenue, barberTransactions, today]);

  // AI Pace Calculator + Gap Translator
  const paceInsights = React.useMemo(() => {
    const completedBookings = barberBookings.filter(b => b.status === 'completed');
    if (completedBookings.length < 3) return null;

    // Calculate average revenue per completed service from recent transactions
    const recentTx = barberTransactions.slice(0, 50);
    const avgRevenuePerService = recentTx.length > 0
      ? recentTx.reduce((sum, t) => sum + t.total_amount, 0) / recentTx.length
      : 0;

    if (avgRevenuePerService <= 0) return null;

    const remaining = earningsGoal.weeklyRemaining;
    const daysLeft = earningsGoal.daysLeftInWeek;

    // Gap Translator: how many services to reach goal
    const servicesNeeded = remaining > 0 ? Math.ceil(remaining / avgRevenuePerService) : 0;

    // Daily pace: services per remaining day
    const dailyPace = daysLeft > 0 && servicesNeeded > 0
      ? Math.ceil(servicesNeeded / daysLeft)
      : 0;

    // Yesterday's earnings for pace comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayEarnings = barberTransactions
      .filter(t => new Date(t.createdAt).toISOString().split('T')[0] === yesterdayStr)
      .reduce((sum, t) => sum + t.total_amount, 0);

    return {
      avgRevenuePerService: Math.round(avgRevenuePerService),
      servicesNeeded,
      dailyPace,
      yesterdayEarnings,
      todayEarnings: todayRevenue,
      isAheadOfYesterday: todayRevenue >= yesterdayEarnings,
    };
  }, [barberBookings, barberTransactions, earningsGoal, todayRevenue]);

  // Earnings Coach Tips (contextual, data-driven)
  const coachTips = React.useMemo(() => {
    const tips = [];
    const completedBookings = barberBookings.filter(b => b.status === 'completed');
    if (completedBookings.length < 5) return tips;

    // Best day of week analysis
    const dayTotals = {};
    const dayCounts = {};
    completedBookings.forEach(b => {
      const dayName = new Date(b.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayTotals[dayName] = (dayTotals[dayName] || 0) + 1;
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
    });
    const bestDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) {
      tips.push({ icon: 'calendar', text: `${bestDay[0]}s are your busiest day with ${bestDay[1]} clients` });
    }

    // Product upsell nudge
    if (paceInsights && paceInsights.servicesNeeded > 0 && paceInsights.avgRevenuePerService > 0) {
      const productTx = barberTransactions.filter(t => t.products && t.products.length > 0);
      const avgProductRevenue = productTx.length > 0
        ? productTx.reduce((s, t) => s + t.products.reduce((ps, p) => ps + p.price * p.quantity, 0), 0) / productTx.length
        : 0;
      if (avgProductRevenue > 0) {
        const productSalesNeeded = Math.ceil(earningsGoal.weeklyRemaining / avgProductRevenue);
        if (productSalesNeeded > 0 && productSalesNeeded < 20) {
          tips.push({ icon: 'product', text: `${productSalesNeeded} product sales could close your goal gap` });
        }
      }
    }

    // Goal progress encouragement
    const progress = earningsGoal.weeklyProgress;
    if (progress >= 75 && progress < 100) {
      tips.push({ icon: 'fire', text: `Almost there! Just ${earningsGoal.weeklyRemaining.toLocaleString()} more to hit your goal` });
    } else if (progress >= 50) {
      tips.push({ icon: 'target', text: `Halfway there! Keep the momentum going` });
    } else if (progress > 0 && earningsGoal.daysLeftInWeek <= 2) {
      tips.push({ icon: 'alert', text: `${earningsGoal.daysLeftInWeek} day${earningsGoal.daysLeftInWeek > 1 ? 's' : ''} left — push for extra bookings!` });
    }

    return tips.slice(0, 2); // Max 2 tips
  }, [barberBookings, barberTransactions, earningsGoal, paceInsights]);

  // Weekly Streak Bar (Mon-Sun, did barber earn on each day?)
  const weeklyStreak = React.useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sun, 1=Mon...
    // Start of week (Monday)
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((currentDay + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const streak = days.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      const isFuture = dateStr > todayStr;
      const isCurrentDay = dateStr === todayStr;

      // Check if barber had completed bookings on this day
      const dayBookings = barberBookings.filter(
        b => b.date === dateStr && b.status === 'completed'
      ).length;

      // Check earnings from transactions
      const dayEarnings = barberTransactions
        .filter(t => new Date(t.createdAt).toISOString().split('T')[0] === dateStr)
        .reduce((sum, t) => sum + t.total_amount, 0);

      return {
        label,
        dateStr,
        isFuture,
        isCurrentDay,
        hasActivity: dayBookings > 0,
        earnings: dayEarnings,
        bookings: dayBookings,
      };
    });

    const activeDays = streak.filter(d => d.hasActivity).length;
    return { days: streak, activeDays };
  }, [barberBookings, barberTransactions]);

  // Product Upsell Nudge - dedicated card data
  const productUpsell = React.useMemo(() => {
    if (!paceInsights || earningsGoal.weeklyRemaining <= 0) return null;

    // Calculate avg product revenue from transactions with products
    const productTx = barberTransactions.filter(t => t.products && t.products.length > 0);
    if (productTx.length === 0) return null;

    const totalProductRevenue = productTx.reduce((s, t) =>
      s + t.products.reduce((ps, p) => ps + p.price * p.quantity, 0), 0
    );
    const avgProductSaleValue = totalProductRevenue / productTx.length;
    if (avgProductSaleValue <= 0) return null;

    const salesNeeded = Math.ceil(earningsGoal.weeklyRemaining / avgProductSaleValue);
    // Only show if reasonable number
    if (salesNeeded > 30) return null;

    // Find top selling product
    const productCounts = {};
    productTx.forEach(t => {
      t.products.forEach(p => {
        productCounts[p.product_name] = (productCounts[p.product_name] || 0) + p.quantity;
      });
    });
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      salesNeeded,
      avgValue: Math.round(avgProductSaleValue),
      topProduct: topProduct ? topProduct[0] : null,
    };
  }, [barberTransactions, earningsGoal, paceInsights]);

  // Animated Earnings Pop - trigger when earnings increase
  React.useEffect(() => {
    const currentEarnings = payrollEarnings?.daily_pay ?? 0;
    if (prevEarningsRef.current !== null && currentEarnings > prevEarningsRef.current) {
      setEarningsPop(true);
      const timer = setTimeout(() => setEarningsPop(false), 1500);
      return () => clearTimeout(timer);
    }
    prevEarningsRef.current = currentEarnings;
  }, [payrollEarnings?.daily_pay]);

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
    { id: "overview", urlPath: "home", label: "Home", icon: Home },
    { id: "bookings", urlPath: "bookings", label: "Bookings", icon: Calendar },
    { id: "portfolio", urlPath: "portfolio", label: "Portfolio", icon: Image },
    { id: "finance", urlPath: "finance", label: "Finance", icon: Wallet },
    { id: "schedule", urlPath: "schedule", label: "Schedule", icon: CalendarDays },
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

  // Render Overview Tab - COMPACT DESIGN (Uber/Grab Driver inspired)
  const renderOverview = () => (
    <div className="px-4 pb-6 space-y-3 max-w-4xl mx-auto">
      {/* COMPACT HEADER - Avatar + Greeting + Quick Stats inline */}
      <div className="bg-[#1A1A1A] rounded-2xl p-4 md:p-5 border border-[#2A2A2A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-[#2A2A2A] flex items-center justify-center overflow-hidden border border-[#3A3A3A]">
              {currentBarber?.avatar ? (
                <img src={currentBarber.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-base md:text-lg font-bold text-[var(--color-primary)]">
                  {currentBarber?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                </span>
              )}
            </div>
            <div>
              <p className="text-base md:text-lg font-bold text-white">{currentBarber?.full_name?.split(' ')[0] || 'Barber'}</p>
              <div className="flex items-center space-x-2 text-xs md:text-sm">
                {currentBarber?.rating > 0 && (
                  <span className="flex items-center text-gray-400">
                    <Star className="w-3 h-3 md:w-4 md:h-4 fill-[var(--color-primary)] text-[var(--color-primary)] mr-0.5" />
                    {currentBarber.rating}
                  </span>
                )}
                {personalBests?.currentStreak > 0 && (
                  <span className="flex items-center text-orange-400">
                    <Flame className="w-3 h-3 md:w-4 md:h-4 mr-0.5" />
                    {personalBests.currentStreak}d
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Time Clock Mini */}
          <ClockButton
            barberId={currentBarber?._id}
            barberName={currentBarber?.full_name}
            branchId={currentBarber?.branch_id}
            compact={true}
          />
        </div>
      </div>

      {/* STATS GRID - Today, Pending, Rating, Clients */}
      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
        <div className="bg-[#1A1A1A] rounded-xl p-2.5 md:p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-center mb-0.5">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white text-center">{todayBookings.length}</p>
          <p className="text-[9px] md:text-xs text-gray-500 text-center">Today</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-2.5 md:p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-center mb-0.5">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white text-center">{pendingBookings.length}</p>
          <p className="text-[9px] md:text-xs text-gray-500 text-center">Pending</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-2.5 md:p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-center mb-0.5">
            <Star className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-primary)]" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white text-center">{ratingAnalytics?.averageRating || currentBarber?.rating || '0.0'}</p>
          <p className="text-[9px] md:text-xs text-gray-500 text-center">Rating</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-2.5 md:p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-center mb-0.5">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white text-center">{clientStats?.totalClients || 0}</p>
          <p className="text-[9px] md:text-xs text-gray-500 text-center">Clients</p>
        </div>
        {/* These 2 show on tablet+ only */}
        <div className="hidden md:block bg-[#1A1A1A] rounded-xl p-2.5 md:p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-center mb-0.5">
            <Heart className="w-4 h-4 md:w-5 md:h-5 text-pink-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white text-center">{clientStats?.returnRate || 0}%</p>
          <p className="text-[9px] md:text-xs text-gray-500 text-center">Return</p>
        </div>
        <div className="hidden md:block bg-[#1A1A1A] rounded-xl p-2.5 md:p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-center mb-0.5">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white text-center">{personalBests?.totalCompleted || 0}</p>
          <p className="text-[9px] md:text-xs text-gray-500 text-center">Total</p>
        </div>
      </div>

      {/* EARNINGS */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        {/* Big Earnings Number */}
        <div className="p-4 md:p-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide mb-1">Earnings</p>
              <p className="text-3xl md:text-4xl font-black text-white">
                ₱{(payrollEarnings?.daily_pay ?? 0).toLocaleString()}
              </p>
            </div>
            {earningsGoal && (
              <div className="text-right">
                <p className={`text-lg md:text-xl font-bold ${
                  earningsGoal.weeklyProgress >= 100 ? 'text-green-400' :
                  earningsGoal.weeklyProgress >= 70 ? 'text-[var(--color-primary)]' : 'text-gray-400'
                }`}>
                  {earningsGoal.weeklyProgress}%
                </p>
                <p className="text-[10px] md:text-xs text-gray-500">of weekly goal</p>
              </div>
            )}
          </div>
          {/* Progress Bar */}
          {earningsGoal && (
            <div className="mt-3">
              <div className="h-2 md:h-2.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    earningsGoal.weeklyProgress >= 100 ? 'bg-green-500' :
                    earningsGoal.weeklyProgress >= 70 ? 'bg-[var(--color-primary)]' :
                    'bg-gray-500'
                  }`}
                  style={{ width: `${Math.min(earningsGoal.weeklyProgress, 100)}%` }}
                />
              </div>
              <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                {earningsGoal.weeklyProgress >= 100
                  ? '✓ Weekly goal achieved!'
                  : `₱${earningsGoal.weeklyRemaining.toLocaleString()} to go • ${earningsGoal.daysLeftInWeek}d left`}
              </p>
            </div>
          )}
        </div>
        {/* Period Tabs */}
        <div className="flex border-t border-[#2A2A2A]">
          {periodOptions.slice(0, 4).map((option) => (
            <button
              key={option.value}
              onClick={() => setStatsPeriod(option.value)}
              className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors ${
                statsPeriod === option.value
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-t-2 border-[var(--color-primary)]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* SMART TIMELINE - Today's Schedule with Now-Line */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        {/* Header with Progress Counter */}
        <div className="p-3 md:p-4 flex items-center justify-between border-b border-[#2A2A2A]">
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-primary)]" />
            <span className="text-sm md:text-base font-medium text-white">Today's Schedule</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs md:text-sm font-bold text-[var(--color-primary)]">
              {smartTimeline.completed} of {smartTimeline.total}
            </span>
            <span className="text-xs text-gray-500">done</span>
          </div>
        </div>

        {/* Timeline */}
        {smartTimeline.bookings.length === 0 ? (
          <div className="p-6 md:p-8 text-center">
            <Calendar className="w-8 h-8 md:w-10 md:h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm md:text-base text-gray-400">No appointments today</p>
          </div>
        ) : (
          <div className="relative">
            {smartTimeline.bookings.map((booking, index) => {
              const isFocused = index === smartTimeline.focusIndex;
              const isPast = booking.status === 'completed';
              const isCancelled = booking.status === 'cancelled';
              const [bH, bM] = booking.time.split(':').map(Number);
              const bookingMins = bH * 60 + bM;

              // Determine if the now-line should appear before this booking
              const prevBooking = index > 0 ? smartTimeline.bookings[index - 1] : null;
              const prevMins = prevBooking ? prevBooking.time.split(':').map(Number).reduce((h, m) => h * 60 + m) : 0;
              const showNowLine = !isPast && !isCancelled &&
                smartTimeline.currentMinutes >= (prevBooking ? prevMins : 0) &&
                smartTimeline.currentMinutes < bookingMins &&
                index === smartTimeline.focusIndex;

              const lastVisit = booking.customer && customerLastVisits?.[booking.customer];

              return (
                <div key={booking._id}>
                  {/* Now Line */}
                  {showNowLine && (
                    <div className="relative flex items-center px-3 md:px-4 py-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <div className="flex-1 h-[2px] bg-red-500 ml-1" />
                      <span className="text-[10px] text-red-400 font-medium ml-2 shrink-0">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Booking Card */}
                  <div className={`px-3 md:px-4 transition-all ${
                    isFocused
                      ? 'py-3 md:py-4 bg-[var(--color-primary)]/5 border-l-2 border-[var(--color-primary)]'
                      : 'py-2.5 md:py-3'
                  } ${isPast ? 'opacity-40' : ''} ${isCancelled ? 'opacity-25' : ''} ${
                    index < smartTimeline.bookings.length - 1 ? 'border-b border-[#2A2A2A]/50' : ''
                  }`}>
                    <div className="flex items-center space-x-3">
                      {/* Time Column */}
                      <div className={`w-12 md:w-14 text-center shrink-0 ${isFocused ? '' : ''}`}>
                        <p className={`font-bold ${isFocused ? 'text-sm md:text-base text-white' : 'text-xs md:text-sm text-gray-400'}`}>
                          {formatTime(booking.time).split(" ")[0]}
                        </p>
                        <p className={`${isFocused ? 'text-[10px] md:text-xs text-gray-400' : 'text-[9px] md:text-[10px] text-gray-600'}`}>
                          {formatTime(booking.time).split(" ")[1]}
                        </p>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${
                          isFocused ? 'text-sm md:text-base text-white' : 'text-xs md:text-sm text-gray-300'
                        }`}>
                          {booking.customer_name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className={`truncate ${
                            isFocused ? 'text-xs md:text-sm text-gray-400' : 'text-[10px] md:text-xs text-gray-500'
                          }`}>
                            {booking.service_name}
                          </p>
                          {isFocused && booking.service_duration > 0 && (
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {booking.service_duration}min
                            </span>
                          )}
                        </div>
                        {/* Last Visit - only on focused card */}
                        {isFocused && lastVisit && (
                          <p className="text-[10px] md:text-xs text-[var(--color-primary)]/70 mt-1">
                            Last visit: {lastVisit.days_ago === 1 ? 'yesterday' :
                              lastVisit.days_ago < 7 ? `${lastVisit.days_ago} days ago` :
                              lastVisit.days_ago < 30 ? `${Math.floor(lastVisit.days_ago / 7)} weeks ago` :
                              `${Math.floor(lastVisit.days_ago / 30)} months ago`
                            } — {lastVisit.service_name}
                          </p>
                        )}
                      </div>

                      {/* Right - Duration/Status */}
                      <div className="text-right shrink-0">
                        {isPast ? (
                          <CheckCircle className="w-4 h-4 text-green-500/50" />
                        ) : isCancelled ? (
                          <XCircle className="w-4 h-4 text-red-500/50" />
                        ) : isFocused ? (
                          <p className="text-sm md:text-base font-bold text-[var(--color-primary)]">
                            {formatTime(booking.time)}
                          </p>
                        ) : (
                          <p className="text-[10px] md:text-xs text-gray-500">
                            {booking.service_duration > 0 ? `${booking.service_duration}min` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Now line at bottom if all bookings are past */}
            {smartTimeline.focusIndex === -1 && smartTimeline.bookings.length > 0 && (
              <div className="relative flex items-center px-3 md:px-4 py-1">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 h-[2px] bg-red-500 ml-1" />
                <span className="text-[10px] text-red-400 font-medium ml-2 shrink-0">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* COLLAPSIBLE: Performance Insights */}
      {smartInsights && smartInsights.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <button
            onClick={() => toggleSection('insights')}
            className="w-full p-4 md:p-5 flex items-center justify-between"
          >
            <div className="flex items-center">
              <Lightbulb className="w-4 h-4 md:w-5 md:h-5 mr-2 text-amber-400" />
              <span className="text-sm md:text-base font-medium text-white">Performance Insights</span>
            </div>
            {expandedSections.insights ? (
              <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            )}
          </button>
          {expandedSections.insights && (
            <div className="border-t border-[#2A2A2A] divide-y divide-[#2A2A2A] md:divide-y-0 md:grid md:grid-cols-3">
              {smartInsights.map((insight, index) => {
                const IconComponent = insight.icon === 'Calendar' ? Calendar :
                                     insight.icon === 'Scissors' ? Scissors :
                                     insight.icon === 'Star' ? Star :
                                     insight.icon === 'Heart' ? Heart :
                                     insight.icon === 'Sun' ? Sun :
                                     insight.icon === 'Moon' ? Moon : Sparkles;
                return (
                  <div key={index} className="p-3 md:p-4 flex items-center space-x-3 md:border-r md:border-[#2A2A2A] md:last:border-r-0">
                    <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm md:text-base text-white">{insight.title}</p>
                      <p className="text-xs md:text-sm text-gray-500">{insight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COLLAPSIBLE: Your Records */}
      {personalBests && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <button
            onClick={() => toggleSection('records')}
            className="w-full p-4 md:p-5 flex items-center justify-between"
          >
            <div className="flex items-center">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 mr-2 text-amber-400" />
              <span className="text-sm md:text-base font-medium text-white">Your Records</span>
            </div>
            {expandedSections.records ? (
              <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            )}
          </button>
          {expandedSections.records && (
            <div className="border-t border-[#2A2A2A]">
              <div className="grid grid-cols-4 divide-x divide-[#2A2A2A]">
                <div className="p-3 md:p-4 text-center">
                  <p className="text-lg md:text-xl font-bold text-blue-400">{personalBests.maxBookingsDay}</p>
                  <p className="text-[9px] md:text-xs text-gray-500">Max/Day</p>
                </div>
                <div className="p-3 md:p-4 text-center">
                  <p className="text-lg md:text-xl font-bold text-green-400">₱{(personalBests.maxEarningsDay / 1000).toFixed(1)}k</p>
                  <p className="text-[9px] md:text-xs text-gray-500">Best Day</p>
                </div>
                <div className="p-3 md:p-4 text-center">
                  <p className="text-lg md:text-xl font-bold text-orange-400">{personalBests.currentStreak}</p>
                  <p className="text-[9px] md:text-xs text-gray-500">Streak</p>
                </div>
                <div className="p-3 md:p-4 text-center">
                  <p className="text-lg md:text-xl font-bold text-purple-400">{personalBests.totalCompleted}</p>
                  <p className="text-[9px] md:text-xs text-gray-500">Total</p>
                </div>
              </div>
              {personalBests.bestService && (
                <div className="p-3 md:p-4 border-t border-[#2A2A2A] flex items-center justify-between">
                  <span className="text-xs md:text-sm text-gray-500">Top Rated:</span>
                  <span className="text-xs md:text-sm font-medium text-white">{personalBests.bestService.name} ({personalBests.bestService.avg.toFixed(1)}★)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );

  // Handle weekly goal save
  const handleSaveGoal = async () => {
    const amount = parseInt(goalInput);
    if (!amount || amount < 1000 || !currentBarber) return;
    setGoalSaving(true);
    try {
      await updateBarberMutation({ id: currentBarber._id, weekly_goal: amount });
      setShowGoalEditor(false);
      setGoalInput("");
    } catch (e) {
      console.error("Failed to save goal:", e);
    }
    setGoalSaving(false);
  };

  // Render Earnings Tab - GOAL-FIRST LAYOUT
  const renderEarnings = () => {
    const progress = earningsGoal.weeklyProgress;
    const circumference = 2 * Math.PI * 54; // radius=54
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    // Color based on progress
    const ringColor = progress >= 100 ? '#22c55e' : progress >= 75 ? '#22c55e' : progress >= 50 ? 'var(--color-primary)' : progress >= 25 ? '#f59e0b' : '#ef4444';

    return (
    <div className="px-4 pb-6 space-y-3 max-w-4xl mx-auto">

      {/* ====== 1. GOAL PROGRESS RING HERO ====== */}
      <div
        className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A] cursor-pointer select-none"
        onClick={() => setRingExpanded(!ringExpanded)}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Weekly Goal</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-medium text-white">₱{earningsGoal.weeklyTarget.toLocaleString()}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setGoalInput(String(earningsGoal.weeklyTarget)); setShowGoalEditor(true); }}
                className="p-1 rounded-lg hover:bg-[#2A2A2A] transition-colors"
              >
                <Edit3 className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{earningsGoal.daysLeftInWeek} days left</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {earningsGoal.weeklyRemaining > 0
                ? `₱${earningsGoal.weeklyRemaining.toLocaleString()} to go`
                : 'Goal reached!'
              }
            </p>
          </div>
        </div>

        {/* SVG Progress Ring with centered amount */}
        <div className="flex justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              {/* Background ring */}
              <circle cx="60" cy="60" r="54" fill="none" stroke="#2A2A2A" strokeWidth="8" />
              {/* Progress ring */}
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center content */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-transform ${earningsPop ? 'scale-110' : 'scale-100'}`}>
              <p className={`text-2xl font-bold text-white transition-all ${earningsPop ? 'text-green-400' : ''}`}>
                ₱{earningsGoal.weeklyEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{progress}%</p>
              {progress >= 100 && (
                <Trophy className="w-4 h-4 text-yellow-400 mt-1" />
              )}
            </div>
            {/* Earnings pop burst */}
            {earningsPop && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full border-2 border-green-400/50 animate-ping" />
              </div>
            )}
          </div>
        </div>

        {/* Milestone Checkpoints */}
        <div className="flex items-center justify-between mt-4 px-2">
          {[25, 50, 75, 100].map((milestone) => {
            const reached = progress >= milestone;
            return (
              <div key={milestone} className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                  reached
                    ? milestone === 100
                      ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40'
                      : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40'
                    : 'bg-[#2A2A2A] text-gray-600'
                }`}>
                  {reached ? <Check className="w-3 h-3" /> : `${milestone}`}
                </div>
                <span className={`text-[9px] ${reached ? 'text-gray-300' : 'text-gray-600'}`}>{milestone}%</span>
              </div>
            );
          })}
        </div>

        {/* Expanded details (tap to reveal) */}
        {ringExpanded && (
          <div className="mt-4 pt-3 border-t border-[#2A2A2A] space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Total Revenue</span>
              <span className="text-gray-300">₱{((payrollEarnings?.total_service_revenue ?? 0) + (payrollEarnings?.total_product_revenue ?? 0)).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Days Worked</span>
              <span className="text-gray-300">{payrollEarnings?.days_worked ?? 0}</span>
            </div>
            {payrollEarnings?.tax_deduction > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Tax</span>
                <span className="text-red-400">-₱{payrollEarnings.tax_deduction.toLocaleString()}</span>
              </div>
            )}
            {payrollEarnings?.tax_deduction > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Net Pay</span>
                <span className="text-green-400 font-medium">₱{(payrollEarnings.net_pay ?? 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-gray-600 text-center mt-3">
          {ringExpanded ? 'Tap to collapse' : 'Tap for details'}
        </p>
      </div>

      {/* Goal Editor Modal */}
      {showGoalEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowGoalEditor(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A] w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Set Weekly Goal</h3>
              <button onClick={() => setShowGoalEditor(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#2A2A2A]">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">How much do you want to earn this week?</p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg text-gray-400">₱</span>
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="15000"
                min="1000"
                step="500"
                className="flex-1 bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-lg font-medium outline-none focus:border-[var(--color-primary)] transition-colors"
                autoFocus
              />
            </div>
            {/* Quick presets */}
            <div className="flex gap-2 mb-4">
              {[10000, 15000, 20000, 25000].map(amount => (
                <button
                  key={amount}
                  onClick={() => setGoalInput(String(amount))}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                    goalInput === String(amount)
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'
                  }`}
                >
                  {(amount / 1000)}k
                </button>
              ))}
            </div>
            <button
              onClick={handleSaveGoal}
              disabled={goalSaving || !goalInput || parseInt(goalInput) < 1000}
              className="w-full py-3 rounded-xl font-medium text-white bg-[var(--color-primary)] disabled:opacity-40 transition-opacity"
            >
              {goalSaving ? 'Saving...' : 'Set Goal'}
            </button>
          </div>
        </div>
      )}

      {/* ====== 2. DAILY SCOREBOARD ====== */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#1A1A1A] rounded-2xl p-3 border border-[#2A2A2A] text-center">
          <Scissors className="w-4 h-4 text-[var(--color-primary)] mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{dailyScoreboard.todayCuts}</p>
          <p className="text-[10px] text-gray-500">Cuts Today</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl p-3 border border-[#2A2A2A] text-center">
          <Wallet className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">₱{dailyScoreboard.todayEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">Earned Today</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl p-3 border border-[#2A2A2A] text-center">
          <Gift className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{dailyScoreboard.todayProducts}</p>
          <p className="text-[10px] text-gray-500">Products Sold</p>
        </div>
      </div>

      {/* ====== 2b. AI PACE CALCULATOR + GAP TRANSLATOR ====== */}
      {paceInsights && earningsGoal.weeklyRemaining > 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-medium text-white">Pace Calculator</h3>
          </div>
          <div className="space-y-2.5">
            {/* Gap Translator - services needed */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Services to goal</span>
              <span className="text-sm font-bold text-[var(--color-primary)]">
                {paceInsights.servicesNeeded} more
              </span>
            </div>
            {/* Daily pace */}
            {paceInsights.dailyPace > 0 && earningsGoal.daysLeftInWeek > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Daily pace needed</span>
                <span className="text-sm font-medium text-white">
                  ~{paceInsights.dailyPace}/day for {earningsGoal.daysLeftInWeek} day{earningsGoal.daysLeftInWeek > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {/* Avg revenue per service */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Avg. per service</span>
              <span className="text-xs text-gray-500">₱{paceInsights.avgRevenuePerService.toLocaleString()}</span>
            </div>
            {/* Yesterday vs Today comparison */}
            <div className="mt-1 pt-2 border-t border-[#2A2A2A] flex items-center justify-between">
              <span className="text-xs text-gray-400">Today vs Yesterday</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">₱{paceInsights.yesterdayEarnings.toLocaleString()}</span>
                <span className="text-gray-600">→</span>
                <span className={`text-xs font-medium ${paceInsights.isAheadOfYesterday ? 'text-green-400' : 'text-amber-400'}`}>
                  ₱{paceInsights.todayEarnings.toLocaleString()}
                </span>
                {paceInsights.isAheadOfYesterday
                  ? <ArrowUpRight className="w-3 h-3 text-green-400" />
                  : <ArrowDownRight className="w-3 h-3 text-amber-400" />
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== 2c. EARNINGS COACH TIPS ====== */}
      {coachTips.length > 0 && (
        <div className="space-y-2">
          {coachTips.map((tip, i) => (
            <div key={i} className="bg-[#1A1A1A] rounded-xl px-3 py-2.5 border border-[#2A2A2A] flex items-center gap-2.5">
              {tip.icon === 'calendar' && <CalendarDays className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              {tip.icon === 'product' && <Gift className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
              {tip.icon === 'fire' && <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
              {tip.icon === 'target' && <Target className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />}
              {tip.icon === 'alert' && <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              <p className="text-xs text-gray-300">{tip.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ====== 2d. WEEKLY STREAK BAR ====== */}
      <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            Weekly Streak
          </h3>
          <span className="text-[10px] text-gray-500">{weeklyStreak.activeDays}/7 active</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          {weeklyStreak.days.map((day) => (
            <div key={day.label} className="flex-1 text-center">
              <div
                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                  day.hasActivity
                    ? 'bg-[var(--color-primary)] text-white'
                    : day.isCurrentDay
                      ? 'bg-[#2A2A2A] ring-1 ring-[var(--color-primary)] text-white'
                      : day.isFuture
                        ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-600'
                        : 'bg-[#2A2A2A] text-gray-500'
                }`}
              >
                {day.hasActivity ? <Check className="w-3 h-3" /> : day.label.charAt(0)}
              </div>
              <p className={`text-[9px] mt-1 ${day.isCurrentDay ? 'text-[var(--color-primary)] font-medium' : 'text-gray-600'}`}>
                {day.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ====== 3. PERIOD FILTER ====== */}
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

      {/* ====== 4. COLLAPSIBLE COMMISSION BREAKDOWN ====== */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <button
          onClick={() => toggleSection('commissionBreakdown')}
          className="w-full p-4 flex items-center justify-between"
        >
          <h3 className="text-sm font-medium text-white flex items-center">
            <Wallet className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Commission Breakdown
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">₱{(payrollEarnings?.daily_pay ?? 0).toLocaleString()}</span>
            {expandedSections.commissionBreakdown
              ? <ChevronUp className="w-4 h-4 text-gray-500" />
              : <ChevronDown className="w-4 h-4 text-gray-500" />
            }
          </div>
        </button>
        {expandedSections.commissionBreakdown && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#2A2A2A] pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                <span className="text-sm text-gray-400">Service Commission</span>
              </div>
              <span className="text-sm font-medium text-white">₱{(payrollEarnings?.service_commission ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-400">Product Commission</span>
              </div>
              <span className="text-sm font-medium text-white">₱{(payrollEarnings?.product_commission ?? 0).toLocaleString()}</span>
            </div>
            {(payrollEarnings?.barber_booking_fees > 0 || payrollEarnings?.barber_late_fees > 0 || payrollEarnings?.barber_convenience_fees > 0) && (
              <>
                {payrollEarnings?.barber_booking_fees > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-sm text-gray-400">Booking Fees</span>
                    </div>
                    <span className="text-sm font-medium text-white">₱{payrollEarnings.barber_booking_fees.toLocaleString()}</span>
                  </div>
                )}
                {payrollEarnings?.barber_late_fees > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm text-gray-400">Late Fees</span>
                    </div>
                    <span className="text-sm font-medium text-white">₱{payrollEarnings.barber_late_fees.toLocaleString()}</span>
                  </div>
                )}
                {payrollEarnings?.barber_convenience_fees > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-sm text-gray-400">Convenience Fees</span>
                    </div>
                    <span className="text-sm font-medium text-white">₱{payrollEarnings.barber_convenience_fees.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
            <div className="border-t border-[#2A2A2A] pt-3 flex items-center justify-between">
              <span className="text-sm text-gray-400">Daily Rate</span>
              <span className="text-sm text-gray-500">₱{(payrollEarnings?.daily_rate ?? 0).toLocaleString()}/day</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Commission Rate</span>
              <span className="text-sm text-gray-500">{(payrollEarnings?.commission_rate ?? 0)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ====== 5. CASH ADVANCE DEDUCTIONS (unchanged) ====== */}
      {cashAdvanceDeductions && cashAdvanceDeductions.advances && cashAdvanceDeductions.advances.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center">
            <DollarSign className="w-4 h-4 mr-2 text-red-400" />
            Upcoming Deductions
          </h3>
          <div className="space-y-3">
            {cashAdvanceDeductions.advances.map((advance, index) => (
              <div key={index} className="bg-[#0D0D0D] rounded-xl p-3 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Cash Advance</span>
                  <span className="text-sm font-medium text-red-400">
                    -₱{(advance.installment_amount || advance.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Total: ₱{advance.amount.toLocaleString()}</span>
                  {advance.repayment_terms > 1 && (
                    <span>Installment {(advance.installments_paid || 0) + 1} of {advance.repayment_terms}</span>
                  )}
                </div>
                {advance.repayment_terms > 1 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                        style={{ width: `${((advance.installments_paid || 0) / advance.repayment_terms) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="border-t border-[#2A2A2A] pt-3 flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Next Payroll Deduction</span>
              <span className="text-sm font-bold text-red-400">
                -₱{cashAdvanceDeductions.installmentTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ====== 6. EARNINGS STATS ====== */}
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

      {/* ====== 7. PERSONAL RECORDS ====== */}
      {personalBests && (
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
          <h3 className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mb-3">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            Personal Records
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0D0D0D] rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-blue-400">{personalBests.maxBookingsDay}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Most Cuts/Day</p>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-green-400">₱{(personalBests.maxEarningsDay / 1000).toFixed(1)}k</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Best Day</p>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-orange-400">{personalBests.currentStreak}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Day Streak</p>
            </div>
          </div>
          {personalBests.bestService && (
            <div className="mt-2 flex items-center justify-between bg-[#0D0D0D] rounded-xl px-3 py-2">
              <span className="text-[10px] text-gray-500">Top Rated Service</span>
              <span className="text-xs font-medium text-purple-400">{personalBests.bestService.name} ({personalBests.bestService.avg.toFixed(1)}★)</span>
            </div>
          )}
        </div>
      )}

      {/* ====== 8. PRODUCT UPSELL NUDGE ====== */}
      {productUpsell && earningsGoal.weeklyRemaining > 0 && (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-white">Product Sales Boost</h3>
          </div>
          <p className="text-xs text-gray-300 mb-2">
            <span className="text-purple-400 font-bold">{productUpsell.salesNeeded} product sale{productUpsell.salesNeeded > 1 ? 's' : ''}</span> could close your ₱{earningsGoal.weeklyRemaining.toLocaleString()} gap
          </p>
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>Avg. sale: ₱{productUpsell.avgValue.toLocaleString()}</span>
            {productUpsell.topProduct && (
              <span>Top seller: {productUpsell.topProduct}</span>
            )}
          </div>
        </div>
      )}

      {/* ====== 9. RECENT TRANSACTIONS ====== */}
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
  };

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
    { key: 'monday', label: 'Monday', short: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' },
  ];

  // ============================================
  // SCHEDULE TAB: Data Computations
  // ============================================

  // Today's Schedule Hero - day progress, next booking
  const todayScheduleHero = React.useMemo(() => {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = dayNames[now.getDay()];
    const todaySchedule = scheduleData[todayKey];
    const isWorkingDay = todaySchedule?.available ?? false;

    if (!isWorkingDay) {
      return { isWorkingDay: false, dayLabel: todayKey.charAt(0).toUpperCase() + todayKey.slice(1) };
    }

    const startTime = todaySchedule?.start || '09:00';
    const endTime = todaySchedule?.end || '17:00';
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const totalWorkMinutes = endMinutes - startMinutes;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const elapsedMinutes = Math.max(0, Math.min(currentMinutes - startMinutes, totalWorkMinutes));
    const progress = totalWorkMinutes > 0 ? Math.round((elapsedMinutes / totalWorkMinutes) * 100) : 0;
    const remainingMinutes = Math.max(0, endMinutes - currentMinutes);
    const hoursLeft = Math.floor(remainingMinutes / 60);
    const minsLeft = remainingMinutes % 60;

    // Find next upcoming booking
    const upcomingBookings = todayBookings
      .filter(b => b.time && b.status !== 'completed' && b.status !== 'cancelled')
      .map(b => {
        const [h, m] = b.time.split(':').map(Number);
        return { ...b, bookingMins: h * 60 + m };
      })
      .filter(b => b.bookingMins > currentMinutes)
      .sort((a, b) => a.bookingMins - b.bookingMins);

    const nextBooking = upcomingBookings[0] || null;
    const nextCountdown = nextBooking ? nextBooking.bookingMins - currentMinutes : null;

    const beforeWork = currentMinutes < startMinutes;
    const afterWork = currentMinutes >= endMinutes;

    return {
      isWorkingDay: true,
      dayLabel: todayKey.charAt(0).toUpperCase() + todayKey.slice(1),
      startTime, endTime, progress: Math.min(progress, 100),
      hoursLeft, minsLeft,
      nextBooking, nextCountdown,
      beforeWork, afterWork,
      completedToday: todayBookings.filter(b => b.status === 'completed').length,
      totalToday: todayBookings.filter(b => b.status !== 'cancelled').length,
    };
  }, [scheduleData, todayBookings]);

  // Today's Appointments Timeline
  const todayTimeline = React.useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const entries = todayBookings
      .filter(b => b.time)
      .map(b => {
        const [h, m] = b.time.split(':').map(Number);
        const bookingMins = h * 60 + m;
        const duration = b.service_duration || 30;
        const endMins = bookingMins + duration;
        const isCurrent = currentMinutes >= bookingMins && currentMinutes < endMins && b.status !== 'completed' && b.status !== 'cancelled';
        const isNext = !isCurrent && bookingMins > currentMinutes && b.status !== 'completed' && b.status !== 'cancelled';
        const customerName = b.customer_name || 'Walk-in';
        const shortName = customerName.split(' ')[0] + (customerName.split(' ')[1] ? ' ' + customerName.split(' ')[1][0] + '.' : '');

        return {
          ...b,
          bookingMins, endMins, duration, isCurrent, isNext,
          shortName,
          services: b.service_name || b.services?.map(s => s.name).join(', ') || 'Service',
          timeDisplay: formatScheduleTime(b.time),
        };
      })
      .sort((a, b) => a.bookingMins - b.bookingMins);

    // Mark only the first "isNext" as truly next
    let foundNext = false;
    entries.forEach(e => {
      if (e.isNext && !foundNext) {
        foundNext = true;
      } else {
        e.isNext = false;
      }
    });

    return entries;
  }, [todayBookings]);

  // Weekly Calendar Data
  const weeklyCalendarData = React.useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sun, 1=Mon...
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((currentDay + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayShorts = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const blockedPeriods = currentBarber?.blocked_periods || [];

    return dayShorts.map((short, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      const daySchedule = scheduleData[dayKeys[i]];
      const isWorking = daySchedule?.available ?? false;
      const hasTimeOff = blockedPeriods.some(p => p.date === dateStr);
      const bookingCount = barberBookings.filter(b => b.date === dateStr && b.status !== 'cancelled').length;
      const dateNum = date.getDate();

      return { short, dateStr, dateNum, isToday, isWorking, hasTimeOff, bookingCount };
    });
  }, [scheduleData, barberBookings, currentBarber?.blocked_periods]);

  // Schedule Summary Stats
  const scheduleSummary = React.useMemo(() => {
    const workingDays = days.filter(d => scheduleData[d.key]?.available).length;

    // Total weekly hours
    let totalMinutes = 0;
    days.forEach(d => {
      const ds = scheduleData[d.key];
      if (ds?.available) {
        const [sH, sM] = (ds.start || '09:00').split(':').map(Number);
        const [eH, eM] = (ds.end || '17:00').split(':').map(Number);
        totalMinutes += (eH * 60 + eM) - (sH * 60 + sM);
      }
    });
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    // Time-off count this month
    const now = new Date();
    const monthStr = now.toISOString().slice(0, 7);
    const blockedPeriods = currentBarber?.blocked_periods || [];
    const monthTimeOff = blockedPeriods.filter(p => p.date.startsWith(monthStr)).length;

    // This week's booking count
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((currentDay + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];
    const weekBookings = barberBookings.filter(
      b => b.date >= mondayStr && b.date <= sundayStr && b.status !== 'cancelled'
    ).length;

    return { workingDays, totalHours, monthTimeOff, weekBookings };
  }, [scheduleData, currentBarber?.blocked_periods, barberBookings, days]);

  // Render Schedule Tab
  const renderSchedule = () => {
    // SVG ring calculations
    const ringSize = 140;
    const strokeWidth = 10;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const schedProgress = todayScheduleHero.isWorkingDay ? todayScheduleHero.progress : 0;
    const strokeDashoffset = circumference - (schedProgress / 100) * circumference;

    const statusColors = {
      pending: 'bg-amber-500',
      confirmed: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
      'no-show': 'bg-gray-500',
    };

    return (
    <div className="px-4 pb-6 space-y-4">
      {/* Section 1: Today's Schedule Hero */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A]">
        {todayScheduleHero.isWorkingDay ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500">Today - {todayScheduleHero.dayLabel}</p>
                <h2 className="text-lg font-bold text-white">Your Workday</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Schedule</p>
                <p className="text-sm font-medium text-gray-300">
                  {formatScheduleTime(todayScheduleHero.startTime)} - {formatScheduleTime(todayScheduleHero.endTime)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                  <circle cx={ringSize/2} cy={ringSize/2} r={radius} fill="none" stroke="#2A2A2A" strokeWidth={strokeWidth} />
                  <circle cx={ringSize/2} cy={ringSize/2} r={radius} fill="none"
                    stroke={todayScheduleHero.afterWork ? '#22c55e' : 'var(--color-primary)'}
                    strokeWidth={strokeWidth} strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {todayScheduleHero.afterWork ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400 mb-1" />
                      <p className="text-xs font-bold text-green-400">Done!</p>
                    </>
                  ) : todayScheduleHero.beforeWork ? (
                    <>
                      <Sun className="w-5 h-5 text-amber-400 mb-1" />
                      <p className="text-xs font-medium text-amber-400">Starting soon</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-white">{schedProgress}%</p>
                      <p className="text-[10px] text-gray-400">
                        {todayScheduleHero.hoursLeft > 0 ? `${todayScheduleHero.hoursLeft}h ${todayScheduleHero.minsLeft}m left` : `${todayScheduleHero.minsLeft}m left`}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Today's count */}
            <div className="flex justify-center gap-6 mb-3">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{todayScheduleHero.completedToday}</p>
                <p className="text-[10px] text-gray-500">Completed</p>
              </div>
              <div className="w-px bg-[#2A2A2A]" />
              <div className="text-center">
                <p className="text-xl font-bold text-white">{todayScheduleHero.totalToday}</p>
                <p className="text-[10px] text-gray-500">Total Booked</p>
              </div>
            </div>

            {/* Next booking countdown */}
            {todayScheduleHero.nextBooking && (
              <div className="bg-[#2A2A2A] rounded-xl p-3 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Next appointment</p>
                  <p className="text-sm font-medium text-white truncate">
                    {todayScheduleHero.nextBooking.customer_name || 'Walk-in'} - {todayScheduleHero.nextBooking.service_name || 'Service'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--color-primary)]">
                    {todayScheduleHero.nextCountdown < 60 ? `${todayScheduleHero.nextCountdown}m` : `${Math.floor(todayScheduleHero.nextCountdown / 60)}h ${todayScheduleHero.nextCountdown % 60}m`}
                  </p>
                  <p className="text-[10px] text-gray-500">away</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <Moon className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Day Off</h2>
            <p className="text-sm text-gray-500">{todayScheduleHero.dayLabel} - Enjoy your rest!</p>
          </div>
        )}
      </div>

      {/* Section 2: Today's Appointments Timeline */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
          <h3 className="text-sm font-medium text-white flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Today's Appointments
          </h3>
          <span className="text-xs text-gray-500">{todayTimeline.length} booked</span>
        </div>

        {todayTimeline.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No appointments today</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]/50 max-h-72 overflow-y-auto">
            {todayTimeline.map((entry, index) => (
              <div key={entry._id || index}
                className={`p-3 flex items-center space-x-3 transition-colors ${
                  entry.isCurrent ? 'bg-[var(--color-primary)]/5 border-l-2 border-[var(--color-primary)]' :
                  entry.isNext ? 'bg-blue-500/5 border-l-2 border-blue-500' : ''
                }`}
              >
                {/* Time column */}
                <div className="w-14 shrink-0 text-center">
                  <p className={`text-xs font-bold ${entry.isCurrent ? 'text-[var(--color-primary)]' : entry.isNext ? 'text-blue-400' : entry.status === 'completed' ? 'text-gray-600' : 'text-gray-300'}`}>
                    {entry.timeDisplay}
                  </p>
                  <p className="text-[10px] text-gray-600">{entry.duration}min</p>
                </div>

                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColors[entry.status] || 'bg-gray-500'} ${entry.isCurrent ? 'ring-2 ring-[var(--color-primary)]/30' : ''}`} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${entry.status === 'completed' ? 'text-gray-500' : 'text-white'}`}>
                    {entry.shortName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{entry.services}</p>
                </div>

                {/* Status */}
                <div className="shrink-0">
                  {entry.isCurrent && (
                    <span className="px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-bold rounded-full">NOW</span>
                  )}
                  {entry.isNext && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full">NEXT</span>
                  )}
                  {entry.status === 'completed' && (
                    <CheckCircle className="w-4 h-4 text-green-500/50" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Weekly Calendar View */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center">
          <CalendarDays className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
          This Week
        </h3>
        <div className="grid grid-cols-7 gap-1.5">
          {weeklyCalendarData.map((day) => (
            <div key={day.dateStr}
              className={`text-center py-2 px-1 rounded-xl transition-colors relative ${
                day.isToday ? 'bg-[var(--color-primary)]/15 ring-1 ring-[var(--color-primary)]/40' :
                day.isWorking ? 'bg-[#2A2A2A]' : 'bg-[#1A1A1A]'
              }`}
            >
              <p className={`text-[10px] font-medium ${day.isToday ? 'text-[var(--color-primary)]' : day.isWorking ? 'text-gray-400' : 'text-gray-600'}`}>
                {day.short}
              </p>
              <p className={`text-sm font-bold ${day.isToday ? 'text-white' : day.isWorking ? 'text-gray-300' : 'text-gray-600'}`}>
                {day.dateNum}
              </p>
              {day.bookingCount > 0 && (
                <span className={`text-[9px] font-bold ${day.isToday ? 'text-[var(--color-primary)]' : 'text-gray-500'}`}>
                  {day.bookingCount}
                </span>
              )}
              {day.hasTimeOff && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
              {!day.isWorking && !day.hasTimeOff && (
                <span className="text-[9px] text-gray-600">off</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Working Hours (view-only, collapsible) */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <button
          onClick={() => toggleSection('schedule')}
          className="w-full p-4 flex justify-between items-center"
        >
          <h3 className="text-sm font-medium text-white flex items-center">
            <Clock className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Working Hours
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Set by staff</span>
            {expandedSections.schedule ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </button>
        {expandedSections.schedule && (
          <div className="divide-y divide-[#2A2A2A] border-t border-[#2A2A2A]">
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
        )}
      </div>

      {/* Section 6: Schedule Summary */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
          Schedule Summary
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[#2A2A2A] rounded-xl p-2.5 text-center">
            <Calendar className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{scheduleSummary.workingDays}</p>
            <p className="text-[10px] text-gray-500">Work Days</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-2.5 text-center">
            <Clock className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{scheduleSummary.totalHours}</p>
            <p className="text-[10px] text-gray-500">Hrs/Week</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-2.5 text-center">
            <Moon className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{scheduleSummary.monthTimeOff}</p>
            <p className="text-[10px] text-gray-500">Time Off</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-2.5 text-center">
            <Users className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{scheduleSummary.weekBookings}</p>
            <p className="text-[10px] text-gray-500">This Week</p>
          </div>
        </div>
      </div>
    </div>
    );
  };

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

  // Handle cover photo upload
  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentBarber) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    setIsUploadingCover(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateBarberMutation({ id: currentBarber._id, coverPhotoStorageId: storageId });
    } catch (error) {
      console.error("Failed to upload cover photo:", error);
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Handle avatar upload from portfolio tab
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentBarber) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    setIsUploadingAvatar(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateBarberMutation({ id: currentBarber._id, avatarStorageId: storageId });
    } catch (error) {
      console.error("Failed to upload avatar:", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Render Portfolio Tab - Instagram-like Design
  const renderPortfolio = () => (
    <div className="pb-6">
      {/* Hidden file inputs for cover & avatar */}
      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />

      {/* Cover Photo */}
      <div className="relative h-44 overflow-hidden rounded-b-3xl mx-1">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] via-[#151515] to-[#0D0D0D]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D]/80 via-transparent to-transparent" />
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={isUploadingCover}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white text-[11px] hover:bg-black/70 transition-colors disabled:opacity-50"
        >
          {isUploadingCover ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-3 h-3" />
          )}
          {coverUrl ? "Edit" : "Add"}
        </button>

        {/* Name overlay on cover */}
        <div className="absolute bottom-3 left-24 right-3">
          <h3 className="text-lg font-bold text-white drop-shadow-lg">{currentBarber?.full_name}</h3>
          {barberBranch && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-white/60 flex-shrink-0" />
              <p className="text-xs text-white/70 drop-shadow truncate">
                {barberBranch.name}{barberBranch.address ? ` · ${barberBranch.address}` : ""}
              </p>
            </div>
          )}
          {currentBarber?.specialties?.length > 0 && (
            <p className="text-[11px] text-white/50 drop-shadow mt-0.5">
              {currentBarber.specialties.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Avatar — overlaps cover */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="relative w-[76px]">
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="w-[76px] h-[76px] rounded-full overflow-hidden border-[3px] border-[#0D0D0D] cursor-pointer shadow-xl"
            style={{ boxShadow: "0 0 0 2px var(--color-primary), 0 4px 12px rgba(0,0,0,0.5)" }}
          >
            {isUploadingAvatar ? (
              <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (avatarUrl || currentBarber?.avatar) ? (
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
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center border-2 border-[#0D0D0D] shadow-lg disabled:opacity-50"
          >
            <Camera className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-1 bg-[#1A1A1A] rounded-2xl p-3 border border-[#2A2A2A]">
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-white leading-none">{portfolioItems?.length || 0}</p>
            <p className="text-[10px] text-gray-500 mt-1">Posts</p>
          </div>
          <div className="w-px h-8 bg-[#2A2A2A]" />
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-white leading-none">{currentBarber?.totalBookings || 0}</p>
            <p className="text-[10px] text-gray-500 mt-1">Clients</p>
          </div>
          <div className="w-px h-8 bg-[#2A2A2A]" />
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-white leading-none">{currentBarber?.rating?.toFixed(1) || "5.0"}</p>
            <p className="text-[10px] text-gray-500 mt-1">Rating</p>
          </div>
        </div>
      </div>

      {/* Portfolio Section Header */}
      <div className="px-4 mt-5 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-white">My Work</span>
          {portfolioItems?.length > 0 && (
            <span className="text-xs text-gray-500">({portfolioItems.length})</span>
          )}
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Photo
        </button>
      </div>

      {/* Portfolio Grid */}
      {portfolioItems?.length === 0 ? (
        <div className="mx-4 py-12 text-center bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#2A2A2A] flex items-center justify-center">
            <Camera className="w-7 h-7 text-gray-600" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Share Your Work</h3>
          <p className="text-gray-500 text-xs max-w-[200px] mx-auto mb-4">
            Upload photos of your best cuts to build your portfolio
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Upload First Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 mx-1 rounded-xl overflow-hidden">
          {portfolioItems?.map((item) => (
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
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <div className="flex items-center gap-1 text-white text-xs">
                  <Heart className="w-4 h-4 fill-white" />
                  <span className="font-medium">{item.likes_count || 0}</span>
                </div>
              </div>
              {/* Featured Badge */}
              {item.is_featured && (
                <div className="absolute top-1.5 right-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 drop-shadow-lg" />
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
      case "finance": return renderFinanceHub();
      case "schedule": return renderSchedule();
      case "profile": return <BarberProfile />;
      default: return renderOverview();
    }
  };

  // Finance Hub — combines Earnings + Cash Advance
  const [financeTab, setFinanceTab] = useState("earnings");
  const renderFinanceHub = () => (
    <div>
      {/* Sub-tabs */}
      <div className="px-4 mb-4 max-w-4xl mx-auto">
        <div className="flex gap-1 bg-[#1A1A1A] rounded-xl p-1 border border-[#2A2A2A]">
          <button
            onClick={() => setFinanceTab("earnings")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              financeTab === "earnings"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Earnings
          </button>
          <button
            onClick={() => setFinanceTab("advance")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              financeTab === "advance"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Cash Advance
          </button>
        </div>
      </div>
      {/* Content */}
      {financeTab === "earnings" ? renderEarnings() : <CashAdvanceSection />}
    </div>
  );

  // Loading state
  if (authLoading || barbers === undefined || user === undefined) {
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
    <div className="min-h-screen bg-[#0D0D0D] pb-20 md:pb-24">
      {/* Header - Responsive */}
      <div className="bg-[#0D0D0D] border-b border-[#1A1A1A] sticky top-0 z-20">
        <div className="px-4 py-3 md:px-6 md:py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-bold text-white">
              {activeTab === "overview" ? "Dashboard" :
               activeTab === "bookings" ? "Bookings" :
               activeTab === "portfolio" ? "Portfolio" :
               activeTab === "finance" ? "Finance" :
               activeTab === "schedule" ? "Schedule" :
               activeTab === "profile" ? "Profile" : "Dashboard"}
            </h1>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Edit Profile Button - only show on profile tab */}
              {activeTab === "profile" && (
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggleBarberProfileEdit'));
                  }}
                  className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-[#1A1A1A] rounded-xl active:scale-95 transition-transform"
                >
                  <Edit3 className="w-[18px] h-[18px] md:w-5 md:h-5 text-gray-400" />
                </button>
              )}
              {/* Notification Button */}
              <button
                onClick={() => setShowNotifications(true)}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-[#1A1A1A] rounded-xl relative active:scale-95 transition-transform"
              >
                <Bell className="w-[18px] h-[18px] md:w-5 md:h-5 text-gray-400" />
                {(notificationUnreadCount > 0 || pendingBookings.length > 0) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-[var(--color-primary)] text-white text-[10px] md:text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                    {notificationUnreadCount > 0 ? notificationUnreadCount : pendingBookings.length}
                  </span>
                )}
              </button>
              {/* Profile Button */}
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl active:scale-95 transition-transform overflow-hidden ${
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
                  <UserCircle className={`w-[18px] h-[18px] md:w-5 md:h-5 ${
                    activeTab === "profile" ? "text-white" : "text-gray-400"
                  }`} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-4 md:pt-6">{renderContent()}</div>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={user?._id}
      />

      {/* All Reviews Modal */}
      {showAllReviews && ratingAnalytics?.recentRatings && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
            onClick={() => setShowAllReviews(false)}
          />

          {/* Modal Panel */}
          <div className="fixed top-0 right-0 bottom-20 w-full max-w-md bg-[#0D0D0D] z-50 animate-slide-in-right flex flex-col border-l border-[#2A2A2A]">
            {/* Header */}
            <div className="px-4 py-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#0D0D0D]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">All Reviews</h2>
                  <p className="text-xs text-gray-500">
                    {ratingAnalytics.totalRatings} total • {ratingAnalytics.averageRating} avg
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllReviews(false)}
                className="p-2 bg-[#1A1A1A] rounded-xl hover:bg-[#2A2A2A] transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Rating Summary */}
            <div className="px-4 py-3 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-white">{ratingAnalytics.averageRating}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(ratingAnalytics.averageRating)
                            ? "text-[var(--color-primary)] fill-[var(--color-primary)]"
                            : "text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{ratingAnalytics.totalRatings}</p>
                  <p className="text-xs text-gray-500">Total Reviews</p>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                {ratingAnalytics.recentRatings.map((review, index) => (
                  <div key={index} className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Customer Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {review.customer_avatar ? (
                          <img src={review.customer_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white truncate">
                            {review.customer_name || 'Customer'}
                          </p>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatActivityTime(review.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? "text-[var(--color-primary)] fill-[var(--color-primary)]"
                                    : "text-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            review.rating === 5 ? 'bg-green-500/20 text-green-400' :
                            review.rating === 4 ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' :
                            review.rating === 3 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {review.rating === 5 ? 'Excellent' :
                             review.rating === 4 ? 'Great' :
                             review.rating === 3 ? 'Good' :
                             review.rating === 2 ? 'Fair' : 'Poor'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review Content */}
                    {review.feedback ? (
                      <p className="text-sm text-gray-300 leading-relaxed">{review.feedback}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No written feedback provided</p>
                    )}

                    {/* Service & Date Info */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2A2A2A]">
                      {review.service_name && (
                        <span className="text-xs text-gray-400 bg-[#2A2A2A] px-2 py-1 rounded">
                          {review.service_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Navigation - Responsive */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-5 p-1 pb-2 md:p-2 md:pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(`/barber/${tab.urlPath}`, { replace: true })}
                  className={`flex flex-col items-center justify-center py-2 md:py-3 transition-colors ${
                    isActive ? "text-[var(--color-primary)]" : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs mt-1 font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarberDashboard;
