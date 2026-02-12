/**
 * ClerkLogin Page
 * Story 10.4: Complete Login Experience
 *
 * Clerk-powered login page with email/password and Google SSO.
 * Styled to match existing dark theme.
 */

import { useMemo } from "react";
import { SignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useBranding } from "../../context/BrandingContext";
import { APP_VERSION } from "../../config/version";
import bannerImage from "../../assets/img/banner.jpg";

function ClerkLogin() {
  const navigate = useNavigate();
  const { branding } = useBranding();

  // Handle guest login - same as existing Login.jsx
  const handleGuestLogin = () => {
    navigate("/guest/booking");
  };

  // Derive rgba from branding hex for subtle gradients
  const primaryHex = branding?.primary_color || "#000000";
  const toRgba = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  // Memoize Clerk appearance to prevent re-renders from creating new objects,
  // which can cause Clerk to re-initialize mid-flow and send duplicate codes.
  const clerkAppearance = useMemo(() => ({
    variables: {
      colorPrimary: branding?.primary_color || "#000000",
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
      rootBox: "mx-auto w-full",
      card: "bg-[#1A1A1A] shadow-2xl border border-[#2A2A2A]/50 rounded-3xl",
      headerTitle: "text-white text-xl font-semibold",
      headerSubtitle: "text-gray-400",
      socialButtonsBlockButton:
        "bg-[#2A2A2A] border-[#3A3A3A] text-white hover:bg-[#3A3A3A] rounded-2xl h-12",
      socialButtonsBlockButtonText: "text-white font-medium",
      dividerLine: "bg-[#3A3A3A]",
      dividerText: "text-gray-500",
      formFieldLabel: "text-gray-300 text-sm",
      formFieldInput:
        "bg-[#2A2A2A] border-[#3A3A3A] text-white placeholder-gray-500 rounded-2xl h-14 focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]",
      formButtonPrimary:
        "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110 text-white font-semibold rounded-2xl h-14 shadow-lg hover:shadow-xl transition-all duration-200",
      footerActionLink:
        "text-[var(--color-primary)] hover:text-[var(--color-accent)] font-semibold",
      identityPreviewEditButton: "text-[var(--color-primary)]",
      formFieldInputShowPasswordButton: "text-gray-400",
      alert: "bg-red-900/20 border-red-500/50 text-red-400",
      alertText: "text-red-400",
    },
  }), [branding?.primary_color]);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 20%, ${toRgba(primaryHex, 0.03)}, transparent 50%)` }}></div>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 80%, ${toRgba(primaryHex, 0.02)}, transparent 50%)` }}></div>
        <div
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(${bannerImage})`,
            filter: "brightness(0.3)",
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            {/* Logo */}
            <div className="flex justify-center mb-1">
              <img
                src={branding?.logo_light_url || "/img/tipuno_x_logo_white.avif"}
                alt="Barbershop Logo"
                className="w-52 h-32 object-contain"
              />
            </div>

            <p className="text-sm font-light text-gray-400">
              Welcome back! Please sign in to continue.
            </p>
          </div>

          {/* Clerk SignIn Component */}
          <div className="clerk-login-container">
            <SignIn
              appearance={clerkAppearance}
              forceRedirectUrl="/auth/clerk-callback"
              routing="path"
              path="/auth/login"
              signUpUrl="/auth/register"
            />
          </div>

          {/* Guest Button - Below Clerk SignIn */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full h-12 bg-[#2A2A2A] hover:bg-[#3A3A3A] active:brightness-95 text-white font-semibold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 text-sm"
            >
              Book as Guest
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Limited access — your data won't be saved
            </p>
          </div>

          {/* Help Link */}
          <div className="text-center mt-3">
            <span className="text-xs text-gray-500">
              Need help?{" "}
              <a
                href="mailto:support@tipunox.com"
                className="text-[var(--color-primary)] hover:text-[var(--color-accent)] font-medium"
              >
                Contact support
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* Version Display */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-500 text-right">
        <p>v{APP_VERSION}</p>
        <p className="text-gray-600">Barbershop</p>
      </div>
    </div>
  );
}

export default ClerkLogin;
