/**
 * Security Settings Page
 * Story 10-5: Multi-Factor Authentication Setup
 *
 * Uses Clerk's UserProfile component for MFA management.
 * Provides access to security settings including:
 * - Multi-factor authentication (TOTP)
 * - Password management
 * - Active sessions
 */

import { UserProfile } from "@clerk/clerk-react";
import { ArrowLeft, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getRoleRedirectPath } from "../../utils/roleRedirect";
import { useBranding } from "../../context/BrandingContext";

function SecuritySettings() {
  const navigate = useNavigate();
  const { user, loading } = useCurrentUser();
  const { branding } = useBranding();

  // Get back path based on user role
  const getBackPath = () => {
    if (!user?.role) return "/";
    return getRoleRedirectPath(user.role);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#FF8C42] border-t-transparent"></div>
          <p className="text-gray-400 text-sm">Loading security settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#050505] border-b border-[#1A1A1A]/30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(getBackPath())}
              className="w-10 h-10 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-xl flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#FF8C42]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Security Settings
                </h1>
                <p className="text-xs text-gray-500">
                  Manage MFA, password, and sessions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Info Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-1">
                Secure Your Account
              </h3>
              <p className="text-xs text-gray-400">
                Enable two-factor authentication (2FA) to add an extra layer of
                security. You'll need an authenticator app like Google
                Authenticator or Authy.
              </p>
            </div>
          </div>
        </div>

        {/* Clerk UserProfile Component */}
        <div className="clerk-security-container">
          <UserProfile
            appearance={{
              variables: {
                colorPrimary: "#FF8C42",
                colorBackground: "#1A1A1A",
                colorInputBackground: "#2A2A2A",
                colorInputText: "#FFFFFF",
                colorText: "#FFFFFF",
                colorTextSecondary: "#9CA3AF",
                colorDanger: "#EF4444",
                borderRadius: "1rem",
                fontFamily: "inherit",
              },
              elements: {
                rootBox: "w-full",
                card: "bg-[#1A1A1A] shadow-none border border-[#2A2A2A] rounded-2xl",
                navbar: "hidden", // Hide navbar to show only security section
                navbarMobileMenuRow: "hidden",
                headerTitle: "text-white text-lg font-semibold",
                headerSubtitle: "text-gray-400",
                profileSectionTitle: "text-white font-medium",
                profileSectionTitleText: "text-white",
                profileSectionContent: "bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]",
                formFieldLabel: "text-gray-300 text-sm",
                formFieldInput:
                  "bg-[#2A2A2A] border-[#3A3A3A] text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42]",
                formButtonPrimary:
                  "bg-gradient-to-r from-[#FF8C42] to-[#E67E3C] hover:brightness-110 text-white font-semibold rounded-xl",
                formButtonReset: "text-gray-400 hover:text-white",
                badge: "bg-[#FF8C42]/10 text-[#FF8C42]",
                avatarBox: "border-2 border-[#FF8C42]",
                accordionTriggerButton: "text-white hover:bg-[#2A2A2A]",
                accordionContent: "bg-[#0A0A0A]",
                menuButton: "text-gray-400 hover:text-white hover:bg-[#2A2A2A]",
                menuList: "bg-[#1A1A1A] border border-[#2A2A2A]",
                menuItem: "text-white hover:bg-[#2A2A2A]",
                activeDevice: "bg-[#FF8C42]/10 border-[#FF8C42]",
                identityPreview: "bg-[#0A0A0A] border border-[#2A2A2A]",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-[#FF8C42]",
                alert: "bg-red-900/20 border-red-500/50",
                alertText: "text-red-400",
              },
            }}
            routing="hash"
          />
        </div>

        {/* Back to Dashboard Link */}
        <div className="mt-8 text-center">
          <Link
            to={getBackPath()}
            className="text-sm text-gray-500 hover:text-[#FF8C42] transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SecuritySettings;
