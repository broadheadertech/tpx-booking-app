import React, { useState, useEffect, useCallback } from "react";
import DashboardHeader from "../../components/staff/DashboardHeader";
import QuickActions from "../../components/staff/QuickActions";
import StatsCards from "../../components/staff/StatsCards";
import RecentActivity from "../../components/staff/RecentActivity";
import TabNavigation from "../../components/staff/TabNavigation";
import ReportsManagement from "../../components/staff/ReportsManagement";
// Hub components - consolidated navigation
import BookingsHub from "../../components/staff/hubs/BookingsHub";
import TeamHub from "../../components/staff/hubs/TeamHub";
import CustomersHub from "../../components/staff/hubs/CustomersHub";
import ProductsHub from "../../components/staff/hubs/ProductsHub";
import FinanceHub from "../../components/staff/hubs/FinanceHub";
import MarketingHub from "../../components/staff/hubs/MarketingHub";
import BranchSettings from "../../components/staff/BranchSettings";
import MorningBriefing from "../../components/staff/MorningBriefing";
import DashboardFooter from "../../components/common/DashboardFooter";
import {
  NotificationModal,
  NotificationBell,
} from "../../components/common/NotificationSystem";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotifications } from "../../hooks/useRealtimeNotifications";
import { useBookingNotificationListener } from "../../utils/bookingNotifications";
import WalkthroughOverlay from "../../components/common/WalkthroughOverlay";
import { getStepsForRole } from "../../config/walkthroughSteps";
import { HelpCircle } from "lucide-react";

function StaffDashboard() {
  // Use unified hook that supports both Clerk and legacy auth
  const { user, logout } = useCurrentUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    // Restore active tab from localStorage on component mount
    return localStorage.getItem("staff_dashboard_active_tab") || "overview";
  });
  const [activeModal, setActiveModal] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const markTutorialComplete = useMutation(api.services.auth.markTutorialComplete);

  // Hook for real-time notifications with toast alerts
  const { unreadCount } = useRealtimeNotifications();

  // Hook for booking notification events
  useBookingNotificationListener();

  // Show walkthrough tutorial for first-time users
  useEffect(() => {
    if (user?._id && !user.has_seen_tutorial && activeTab === "overview") {
      const timer = setTimeout(() => setShowWalkthrough(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user, activeTab]);

  const handleWalkthroughDone = useCallback(async () => {
    setShowWalkthrough(false);
    if (user?._id) {
      try { await markTutorialComplete({ user_id: user._id }); } catch (e) { console.error("[Walkthrough]", e); }
    }
  }, [user?._id, markTutorialComplete]);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("staff_dashboard_active_tab", activeTab);
  }, [activeTab]);

  // Convex queries for data - adjust based on user role
  // Added pagination limits to avoid Convex byte limit errors
  const bookingsData =
    user?.role === "super_admin"
      ? useQuery(api.services.bookings.getAllBookings, { limit: 100 })
      : user?.branch_id
        ? useQuery(api.services.bookings.getBookingsByBranch, {
          branch_id: user.branch_id,
          limit: 100,
        })
        : undefined;
  const bookings = bookingsData?.bookings || [];

  const services =
    user?.role === "super_admin"
      ? useQuery(api.services.services.getAllServices)
      : user?.branch_id
        ? useQuery(api.services.services.getServicesByBranch, {
          branch_id: user.branch_id,
        })
        : undefined;

  const barbers =
    user?.role === "super_admin"
      ? useQuery(api.services.barbers.getAllBarbers)
      : user?.branch_id
        ? useQuery(api.services.barbers.getBarbersByBranch, {
          branch_id: user.branch_id,
        })
        : undefined;

  const vouchers =
    user?.role === "super_admin"
      ? useQuery(api.services.vouchers.getAllVouchers)
      : user?.branch_id
        ? useQuery(api.services.vouchers.getVouchersByBranch, {
          branch_id: user.branch_id,
        })
        : undefined;
  const events =
    user?.role === "super_admin"
      ? useQuery(api.services.events.getAllEvents)
      : user?.branch_id
        ? useQuery(api.services.events.getEventsByBranch, {
          branch_id: user.branch_id,
        })
        : undefined;
  // Customers are system-wide (not branch-specific), so always fetch all customers
  // regardless of the logged-in user's role. The getAllUsers query supports role filtering.
  const customers = useQuery(api.services.auth.getAllUsers, { roles: ["customer"] });

  // Get customer wallets for wallet monitoring
  const customerWallets = useQuery(api.services.wallet.getAllCustomerWallets, {});

  // Get walk-ins data for queue badge
  const allWalkInsData = useQuery(api.services.walkIn.getAllWalkIns, {}) || [];

  // Expiry alerts for branch users
  const expiryAlerts = useQuery(
    api.services.products.getExpiryAlertSummary,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  );

  // Get pending cash advances count for badge (branch admins only)
  const pendingAdvancesCount = useQuery(
    api.services.cashAdvance.getPendingAdvancesCount,
    user?.branch_id && (user?.role === "branch_admin" || user?.role === "super_admin")
      ? { branch_id: user.branch_id }
      : "skip"
  ) || 0;

  // Calculate incomplete bookings count (pending, booked, confirmed - not completed or cancelled)
  const incompleteBookingsCount = bookings
    ? bookings.filter(
      (booking) =>
        booking.status !== "completed" && booking.status !== "cancelled"
    ).length
    : 0;

  // Calculate waiting walk-ins count for queue badge (only today's waiting status)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTimestamp = todayStart.getTime();

  const waitingWalkInsCount = allWalkInsData
    ? allWalkInsData.filter(
      (walkIn) => walkIn.status === "waiting" && walkIn.createdAt >= todayStartTimestamp
    ).length
    : 0;

  // Helper functions for refresh actions
  const refreshData = () => {
    // Convex queries will automatically refresh through their real-time subscriptions
    // No page reload needed - let the data update naturally
    console.log("Data refresh triggered - Convex will handle updates");
  };

  // Calculate stats from Convex data
  const calculateStats = () => {
    if (!bookings || !services || !vouchers || !barbers || !customers) {
      return null;
    }

    return {
      totalBookings: bookings.filter(b => b.status !== 'cancelled').length,
      totalServices: services.length,
      totalVouchers: vouchers.length,
      totalBarbers: barbers.length,
      totalCustomers: customers.length,
      todayBookings: bookings.filter((b) => {
        const today = new Date().toDateString();
        return new Date(b.date).toDateString() === today;
      }).length,
      activeVouchers: vouchers.filter((v) => v.is_active).length,
      activeServices: services.filter((s) => s.is_active).length,
      activeBarbers: barbers.filter((b) => b.is_active).length,
    };
  };

  const stats = calculateStats();

  // Render overview stats
  const renderOverview = () => {
    if (!stats) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading dashboard data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <MorningBriefing user={user} />
        {expiryAlerts && expiryAlerts.total > 0 && (
          <div
            className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 cursor-pointer hover:brightness-110 transition-all ${
              expiryAlerts.expired > 0
                ? "bg-red-500/10 border-red-500/30"
                : expiryAlerts.critical > 0
                ? "bg-orange-500/10 border-orange-500/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            }`}
            onClick={() => setActiveTab("products")}
            title="Go to Products to review expiring stock"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-white text-sm font-semibold">Expiring Stock Alert</p>
                <p className="text-gray-400 text-xs">
                  {[
                    expiryAlerts.expired > 0 && `${expiryAlerts.expired} expired`,
                    expiryAlerts.critical > 0 && `${expiryAlerts.critical} critical (<7d)`,
                    expiryAlerts.warning > 0 && `${expiryAlerts.warning} expiring (<30d)`,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <span className="text-gray-500 text-xs whitespace-nowrap">View Products →</span>
          </div>
        )}
        <StatsCards
          stats={[
            {
              label: "Total Bookings",
              value: stats.totalBookings,
              icon: "calendar",
            },
            {
              label: "Today's Bookings",
              value: stats.todayBookings,
              icon: "clock",
            },
            {
              label: "Active Services",
              value: stats.activeServices,
              icon: "scissors",
            },
            {
              label: "Active Barbers",
              value: stats.activeBarbers,
              icon: "user",
            },
            {
              label: "Total Customers",
              value: stats.totalCustomers,
              icon: "users",
            },
            {
              label: "Active Vouchers",
              value: stats.activeVouchers,
              icon: "gift",
            },
          ]}
        />
        <RecentActivity />
      </div>
    );
  };

  // Handle refresh for components - no page reload needed
  const handleRefresh = () => {
    // Convex queries automatically update through real-time subscriptions
    console.log("Refresh triggered - data will update automatically");
  };

  // Render different tab content based on Convex data
  const renderTabContent = () => {
    // Story 11-4: Permission check for tab content
    // Super admins and admin_staff bypass all checks
    if (user?.role !== "super_admin" && user?.role !== "admin_staff") {
      // Always allow always-accessible tabs
      if (!alwaysAccessiblePages.includes(activeTab)) {
        // branch_admin: bypass only if no explicit permissions are set
        if (user?.role === "branch_admin" && (!user?.page_access_v2 || Object.keys(user.page_access_v2).length === 0)) {
          // No explicit permissions — full access (backward compat)
        } else {
          // Check page_access_v2 first
          if (user?.page_access_v2) {
            if (!user.page_access_v2[activeTab]?.view) {
              return renderOverview();
            }
          }
          // Fallback to legacy page_access
          else if (user?.page_access && user.page_access.length > 0) {
            if (!user.page_access.includes(activeTab)) {
              return renderOverview();
            }
          }
        }
      }
    }

    switch (activeTab) {
      case "overview":
        return renderOverview();

      case "reports":
        return <ReportsManagement onRefresh={handleRefresh} user={user} />;

      case "bookings":
        return (
          <BookingsHub
            user={user}
            onRefresh={handleRefresh}
            incompleteBookingsCount={incompleteBookingsCount}
            waitingWalkInsCount={waitingWalkInsCount}
          />
        );

      case "team":
        return (
          <TeamHub
            user={user}
            barbers={barbers || []}
            onRefresh={handleRefresh}
          />
        );

      case "customers":
        return (
          <CustomersHub
            user={user}
            customers={customers || []}
            wallets={customerWallets || []}
            onRefresh={handleRefresh}
          />
        );

      case "products":
        return (
          <ProductsHub
            user={user}
            services={services || []}
            vouchers={vouchers || []}
            onRefresh={handleRefresh}
            onCreateVoucher={() => setActiveModal("voucher")}
          />
        );

      case "finance":
        return (
          <FinanceHub
            user={user}
            onRefresh={handleRefresh}
            pendingAdvancesCount={pendingAdvancesCount}
          />
        );

      case "marketing":
        return (
          <MarketingHub
            user={user}
            events={events || []}
            onRefresh={handleRefresh}
          />
        );

      case "settings":
        return <BranchSettings user={user} onRefresh={handleRefresh} />;

      default:
        return renderOverview();
    }
  };

  // Placeholder functions for actions (to be implemented)
  const handleCreateBooking = () => {
    // TODO: Implement create booking modal
    console.log("Create booking clicked");
  };

  const handleCreateVoucher = () => {
    // TODO: Implement create voucher modal
    console.log("Create voucher clicked");
  };

  const handleAddCustomer = () => {
    // TODO: Implement add customer modal
    console.log("Add customer clicked");
  };

  const handleVoucherScanned = () => {
    // TODO: Implement voucher scanning
    console.log("Voucher scanned");
  };

  const handleBookingScanned = () => {
    // TODO: Implement booking scanning
    console.log("Booking scanned");
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Force navigation even if logout fails
      navigate("/auth/login");
    }
  };

  // Tab configuration for staff - Consolidated navigation
  const baseTabs = [
    { id: "overview", label: "Overview", icon: "layout-dashboard" },
    { id: "reports", label: "Reports", icon: "bar-chart-3" },
    { id: "bookings", label: "Bookings", icon: "calendar" },
    { id: "pos", label: "POS", icon: "credit-card" },
    { id: "team", label: "Team", icon: "users" },
    { id: "customers", label: "Customers", icon: "user-check" },
    { id: "products", label: "Products", icon: "package" },
    { id: "finance", label: "Finance", icon: "dollar-sign" },
    { id: "marketing", label: "Marketing", icon: "megaphone" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  // Always accessible pages (bypass permission checks)
  const alwaysAccessiblePages = ["overview"];

  // Filter tabs based on user permissions (Story 11-4: Navigation Filtering)
  // Priority: page_access_v2 (new) > page_access (legacy) > role defaults
  const getFilteredTabs = () => {
    // super_admin and admin_staff have full access
    if (user?.role === "super_admin" || user?.role === "admin_staff") {
      return baseTabs;
    }

    // branch_admin: full access by default, but respect explicit permissions if set
    if (user?.role === "branch_admin") {
      if (user?.page_access_v2 && Object.keys(user.page_access_v2).length > 0) {
        return baseTabs.filter((t) => {
          if (alwaysAccessiblePages.includes(t.id)) return true;
          return user.page_access_v2[t.id]?.view === true;
        });
      }
      return baseTabs;
    }

    // Check page_access_v2 first (new RBAC system)
    if (user?.page_access_v2) {
      return baseTabs.filter((t) => {
        // Always include always-accessible pages
        if (alwaysAccessiblePages.includes(t.id)) return true;
        // Check if view permission is granted
        return user.page_access_v2[t.id]?.view === true;
      });
    }

    // Fallback to legacy page_access array
    if (user?.page_access && user.page_access.length > 0) {
      return baseTabs.filter(
        (t) => user.page_access.includes(t.id) || alwaysAccessiblePages.includes(t.id)
      );
    }

    // Default: show all tabs for roles without explicit permissions
    return baseTabs;
  };

  const tabs = getFilteredTabs();

  // Redirect if current active tab is not allowed (Story 11-4: Navigation Filtering)
  useEffect(() => {
    const allowedTabIds = tabs.map((t) => t.id);
    if (!allowedTabIds.includes(activeTab) && !alwaysAccessiblePages.includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [tabs, activeTab]);

  console.log("StaffDashboard - User:", user);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <DashboardHeader
        onLogout={handleLogout}
        user={user}
        onOpenNotifications={() => setShowNotifications(true)}
      />

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
          <div className="space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-12">
            {/* {user?.role !== "branch_admin" && (
              <QuickActions
                onAddCustomer={handleAddCustomer}
                onCreateBooking={handleCreateBooking}
                onCreateVoucher={handleCreateVoucher}
                onVoucherScanned={handleVoucherScanned}
                onBookingScanned={handleBookingScanned}
                activeModal={activeModal}
                setActiveModal={setActiveModal}
              />
            )} */}
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabId) => {
                if (tabId === "pos") {
                  navigate("/staff/pos");
                } else {
                  setActiveTab(tabId);
                }
              }}
              incompleteBookingsCount={incompleteBookingsCount}
              waitingWalkInsCount={waitingWalkInsCount}
              pendingAdvancesCount={pendingAdvancesCount}
            />
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl border border-[#2A2A2A]/50 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 backdrop-blur-sm overflow-hidden">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      <DashboardFooter />

      {/* Notification Modal */}
      <NotificationModal
        userId={user?._id}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userRole={user?.role}
      />

      {/* Walkthrough Tutorial */}
      <WalkthroughOverlay
        steps={getStepsForRole(user?.role)}
        isVisible={showWalkthrough}
        onComplete={handleWalkthroughDone}
        onSkip={handleWalkthroughDone}
      />

      {/* Help button to re-trigger tutorial */}
      {!showWalkthrough && user?.has_seen_tutorial && (
        <button
          onClick={() => setShowWalkthrough(true)}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all shadow-lg shadow-black/40"
          title="Show tutorial"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default StaffDashboard;
