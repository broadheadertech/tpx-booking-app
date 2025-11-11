import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDashboard } from '../../components/common/NotificationDashboard';
import { ArrowLeft, Bell, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotificationsPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1A1A1A]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#FF8C42] border-t-transparent"></div>
          <p className="text-gray-400 text-sm">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A1A] text-white px-4">
        <div className="max-w-md w-full bg-[#2A2A2A] rounded-xl p-6 border border-[#444444]">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-[#FF8C42]/10 rounded-xl">
              <Bell size={40} className="text-[#FF8C42]" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2 text-center">Authentication Required</h2>
          <p className="text-gray-400 text-center mb-4 text-sm">Please log in to view your notifications.</p>
          <Link
            to="/login"
            className="block w-full bg-[#FF8C42] text-white font-semibold py-2.5 rounded-lg hover:bg-[#FF8C42]/90 transition-colors text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Compact Header */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] border-b border-[#444444]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <Link
                to="/staff/dashboard"
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <div className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#FF8C42]/20 transition-colors border border-[#444444] hover:border-[#FF8C42]/30">
                  <ArrowLeft size={18} />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Back</span>
              </Link>

              <div className="h-6 w-px bg-[#444444] hidden sm:block"></div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#FF8C42]/10 rounded-lg">
                  <Bell className="text-[#FF8C42]" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Notification Center</h1>
                  <p className="text-xs text-gray-400">Stay updated with real-time alerts</p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <Link
              to="/staff/settings"
              className="flex items-center space-x-2 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#1A1A1A]"
              title="Settings"
            >
              <Settings size={18} />
              <span className="hidden lg:inline text-sm font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <NotificationDashboard userId={user._id} />
      </div>
    </div>
  );
};

export default NotificationsPage;
