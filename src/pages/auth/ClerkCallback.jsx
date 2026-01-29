/**
 * ClerkCallback Page
 * Story 10.4: Complete Login Experience
 *
 * Handles post-login redirect after Clerk authentication.
 * Waits for webhook to create Convex user, then redirects to role-appropriate dashboard.
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getRoleRedirectPath } from "../../utils/roleRedirect";
import { useBranding } from "../../context/BrandingContext";

function ClerkCallback() {
  const navigate = useNavigate();
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const convex = useConvex();
  const { branding } = useBranding();

  const [status, setStatus] = useState("loading"); // loading, polling, error, redirecting
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const MAX_POLLS = 10; // 10 polls * 500ms = 5 seconds
  const POLL_INTERVAL = 500;

  // Poll for user with retry logic
  const pollForUser = useCallback(async () => {
    if (!clerkUser?.id) return null;

    try {
      const user = await convex.query(api.services.auth.getUserByClerkId, {
        clerk_user_id: clerkUser.id,
      });
      return user;
    } catch (err) {
      console.error("[ClerkCallback] Error querying user:", err);
      return null;
    }
  }, [clerkUser?.id, convex]);

  useEffect(() => {
    // Wait for Clerk to load
    if (!clerkLoaded) {
      setStatus("loading");
      return;
    }

    // If not signed in, redirect to login
    if (!isSignedIn) {
      navigate("/auth/clerk-login", { replace: true });
      return;
    }

    // Start polling for user
    setStatus("polling");

    const poll = async () => {
      const user = await pollForUser();

      if (user) {
        // User found - redirect to appropriate dashboard
        setStatus("redirecting");
        const redirectPath = getRoleRedirectPath(user.role);

        console.log("[ClerkCallback] User found, redirecting to:", redirectPath, {
          userId: user._id,
          role: user.role,
        });

        navigate(redirectPath, { replace: true });
        return;
      }

      // User not found yet
      setPollCount((prev) => {
        const newCount = prev + 1;

        if (newCount >= MAX_POLLS) {
          // Timeout - show error
          setStatus("error");
          setError(
            "Your account is being set up. Please wait a moment and try again."
          );
          return newCount;
        }

        // Continue polling
        setTimeout(poll, POLL_INTERVAL);
        return newCount;
      });
    };

    poll();
  }, [clerkLoaded, isSignedIn, clerkUser?.id, navigate, pollForUser]);

  // Handle retry
  const handleRetry = () => {
    setPollCount(0);
    setError(null);
    setStatus("polling");
  };

  // Handle go to login
  const handleGoToLogin = () => {
    navigate("/auth/clerk-login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={branding?.logo_light_url || "/img/tipuno_x_logo_white.avif"}
            alt="Logo"
            className="w-40 h-24 object-contain"
          />
        </div>

        {/* Status Card */}
        <div className="bg-[#1A1A1A] rounded-3xl shadow-2xl border border-[#2A2A2A]/50 p-8">
          {/* Loading State */}
          {(status === "loading" || status === "polling") && (
            <div className="text-center">
              {/* Spinner */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 border-4 border-[#FF8C42]/30 border-t-[#FF8C42] rounded-full animate-spin"></div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">
                {status === "loading" ? "Loading..." : "Setting up your account"}
              </h2>

              <p className="text-gray-400 text-sm">
                {status === "polling" && (
                  <>
                    Please wait while we prepare your dashboard
                    {pollCount > 3 && (
                      <span className="block mt-2 text-gray-500">
                        This may take a few moments...
                      </span>
                    )}
                  </>
                )}
              </p>

              {/* Progress indicator */}
              {status === "polling" && (
                <div className="mt-6">
                  <div className="w-full bg-[#2A2A2A] rounded-full h-1.5">
                    <div
                      className="bg-[#FF8C42] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(pollCount / MAX_POLLS) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="text-center">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">
                Account Setup in Progress
              </h2>

              <p className="text-gray-400 text-sm mb-6">{error}</p>

              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full h-12 bg-gradient-to-r from-[#FF8C42] to-[#E67E3C] hover:from-[#E67E3C] hover:brightness-110 text-white font-semibold rounded-2xl transition-all duration-200"
                >
                  Try Again
                </button>

                <button
                  onClick={handleGoToLogin}
                  className="w-full h-12 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white font-medium rounded-2xl transition-all duration-200"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}

          {/* Redirecting State */}
          {status === "redirecting" && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">
                Welcome back!
              </h2>

              <p className="text-gray-400 text-sm">
                Redirecting to your dashboard...
              </p>
            </div>
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Having trouble?{" "}
          <a href="/auth/login" className="text-[#FF8C42] hover:text-[#E67E3C]">
            Try legacy login
          </a>
        </p>
      </div>
    </div>
  );
}

export default ClerkCallback;
