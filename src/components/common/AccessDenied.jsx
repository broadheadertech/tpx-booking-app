/**
 * AccessDenied Component
 * Story 11-5: Access Denied Handling
 *
 * Displays a consistent access denied message when users
 * try to access content they don't have permission for.
 */

import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";

/**
 * Get dashboard path based on user role
 */
function getDashboardPath(role) {
  switch (role) {
    case "super_admin":
      return "/admin/dashboard";
    case "admin_staff":
    case "branch_admin":
    case "admin":
    case "staff":
      return "/staff/dashboard";
    case "barber":
      return "/barber/home";
    case "customer":
    default:
      return "/customer/dashboard";
  }
}

/**
 * AccessDenied - Shows access denied message with navigation options
 *
 * @param {Object} props
 * @param {string} props.message - Custom message to display
 * @param {boolean} props.showBackButton - Show back button (default: true)
 * @param {boolean} props.showHomeButton - Show home/dashboard button (default: true)
 * @param {boolean} props.compact - Use compact styling for inline use (default: false)
 */
function AccessDenied({
  message = "You don't have permission to access this page.",
  showBackButton = true,
  showHomeButton = true,
  compact = false,
}) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const dashboardPath = user ? getDashboardPath(user.role) : "/";

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(dashboardPath);
    }
  };

  const handleGoHome = () => {
    navigate(dashboardPath);
  };

  // Compact version for inline use
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
          <ShieldX className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Access Denied</h3>
        <p className="text-sm text-gray-400 max-w-xs">{message}</p>
        {(showBackButton || showHomeButton) && (
          <div className="flex gap-3 mt-4">
            {showBackButton && (
              <button
                onClick={handleGoBack}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Go Back
              </button>
            )}
            {showHomeButton && (
              <button
                onClick={handleGoHome}
                className="px-4 py-2 text-sm bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67E3C] transition-colors"
              >
                Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full page version
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-400" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        {(showBackButton || showHomeButton) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBackButton && (
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            )}
            {showHomeButton && (
              <button
                onClick={handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF8C42] to-[#E67E3C] text-white font-semibold rounded-xl hover:brightness-110 transition-all"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            )}
          </div>
        )}

        {/* Help text */}
        <p className="text-center text-xs text-gray-500 mt-8">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
}

export default AccessDenied;
