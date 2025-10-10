import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDashboard } from '../../components/common/NotificationDashboard';
import { ArrowLeft, Bell, Settings, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotificationsPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#141414]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#FF8C42]"></div>
          <p className="text-gray-400 text-sm">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#141414] text-white px-4">
        <div className="max-w-md w-full bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-2xl p-8 shadow-2xl border border-gray-800">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-[#FF8C42]/10 rounded-2xl">
              <Bell size={48} className="text-[#FF8C42]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-center">Authentication Required</h2>
          <p className="text-gray-400 text-center mb-6">Please log in to view your notifications.</p>
          <Link
            to="/login"
            className="block w-full bg-gradient-to-r from-[#FF8C42] to-[#FF9D5C] text-white font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-[#FF8C42]/20 transition-all duration-300 text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#141414] to-[#1A1A1A]">
      {/* Enhanced Header */}
      <div className="relative bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] shadow-2xl overflow-hidden">
        {/* Animated background overlay */}
        <div className="absolute inset-0">
          <div
            className="h-full bg-cover bg-center bg-no-repeat opacity-5 animate-pulse"
            style={{
              backgroundImage: `url(/img/pnglog.png)`,
              filter: 'brightness(0.3) contrast(1.2)'
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF8C42]/5 via-transparent to-[#FF8C42]/5"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-8 gap-6">
            {/* Left Section - Enhanced */}
            <div className="flex items-center space-x-4">
              <Link
                to="/staff/dashboard"
                className="group flex items-center text-gray-400 hover:text-white transition-all duration-300"
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/10 group-hover:from-[#FF8C42]/20 group-hover:to-[#FF8C42]/10 transition-all duration-300 border border-white/10 group-hover:border-[#FF8C42]/30">
                  <ArrowLeft size={20} className="group-hover:scale-110 transition-transform duration-200" />
                </div>
                <span className="ml-3 text-sm font-semibold hidden sm:inline tracking-wide">Back to Dashboard</span>
              </Link>

              <div className="hidden sm:block h-12 w-px bg-gradient-to-b from-transparent via-[#FF8C42]/50 to-transparent"></div>

              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#FF8C42] via-[#FF9D5C] to-[#FF8C42] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#FF8C42]/30 animate-pulse">
                    <BellRing className="text-white" size={24} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1A1A1A] animate-pulse"></div>
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Notification Center
                  </h1>
                  <p className="text-sm text-[#FF8C42] font-medium tracking-wide">
                    Stay updated with real-time alerts & updates
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-[#FF8C42] rounded-full animate-pulse"></div>
                    <span>Live notifications enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Enhanced */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-4 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">2.0</div>
                  <div className="text-xs text-gray-400">v2.0.0</div>
                </div>
                <div className="h-8 w-px bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#FF8C42]">Live</div>
                  <div className="text-xs text-gray-400">Real-time</div>
                </div>
              </div>

              <Link
                to="/staff/settings"
                className="group flex items-center space-x-2 p-3 text-gray-400 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/20"
                title="Notification Settings"
              >
                <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                <span className="hidden lg:inline text-sm font-medium">Settings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF8C42]/50 to-transparent"></div>
      </div>

      {/* Main Content - Enhanced */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-[#2A2A2A]/50 to-[#333333]/50 backdrop-blur-sm rounded-2xl border border-[#444444]/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Welcome to your Notification Hub</h2>
                <p className="text-gray-400 text-sm">
                  Manage all your notifications, stay informed about bookings, payments, and system updates.
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#FF8C42]">24/7</div>
                  <div className="text-xs text-gray-400">Monitoring</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">Real-time</div>
                  <div className="text-xs text-gray-400">Updates</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Dashboard */}
          <NotificationDashboard userId={user._id} />
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
