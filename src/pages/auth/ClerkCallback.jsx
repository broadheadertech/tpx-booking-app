/**
 * ClerkCallback Page
 * Story 10.4: Complete Login Experience
 *
 * Handles post-login redirect after Clerk authentication.
 * Waits for webhook to create Convex user, then redirects to role-appropriate dashboard.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getRoleRedirectPath } from "../../utils/roleRedirect";
import { useBranding } from "../../context/BrandingContext";

function ClerkCallback() {
  const navigate = useNavigate();
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const convex = useConvex();
  const { branding } = useBranding();

  const [status, setStatus] = useState("loading"); // loading, polling, creating, error, redirecting
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const isCreatingRef = useRef(false);

  // Mutation to create user if webhook hasn't processed yet
  const ensureUserFromClerk = useMutation(api.services.auth.ensureUserFromClerk);

  const MAX_POLLS = 3; // Reduced - we'll create user if not found after 3 polls
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
      console.error("[ClerkCallback] Error querying user:", err?.message || err);
      return null;
    }
  }, [clerkUser?.id, convex]);

  // Create user directly using ensureUserFromClerk mutation
  const createUserDirectly = useCallback(async () => {
    if (!clerkUser?.id || isCreatingRef.current) return null;

    isCreatingRef.current = true;
    setStatus("creating");

    try {
      // Get email from multiple sources (Google OAuth may use emailAddresses array)
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        `${clerkUser.id}@clerk.local`;

      console.log("[ClerkCallback] Creating user directly via ensureUserFromClerk...", {
        clerk_user_id: clerkUser.id,
        email,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
      });

      const user = await ensureUserFromClerk({
        clerk_user_id: clerkUser.id,
        email,
        first_name: clerkUser.firstName || undefined,
        last_name: clerkUser.lastName || undefined,
        image_url: clerkUser.imageUrl || undefined,
      });
      console.log("[ClerkCallback] User created successfully:", user);
      return user;
    } catch (err) {
      console.error("[ClerkCallback] Error creating user:", err);
      return { _error: err?.message || err?.data?.message || "Unable to set up your account. Please try again." };
    } finally {
      isCreatingRef.current = false;
    }
  }, [clerkUser, ensureUserFromClerk]);

  useEffect(() => {
    // Wait for Clerk to load
    if (!clerkLoaded) {
      setStatus("loading");
      return;
    }

    // If not signed in, redirect to login
    if (!isSignedIn) {
      navigate("/auth/login", { replace: true });
      return;
    }

    // Guard: prevent double-execution from StrictMode
    let cancelled = false;
    let timeoutId = null;
    setStatus("polling");
    setPollCount(0);

    const poll = async () => {
      if (cancelled) return;

      const user = await pollForUser();
      if (cancelled) return;

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
          // Webhook hasn't processed yet - create user directly
          console.log("[ClerkCallback] User not found after polling, creating directly...");

          createUserDirectly().then((result) => {
            if (cancelled) return;
            if (result && !result._error) {
              setStatus("redirecting");
              const redirectPath = getRoleRedirectPath(result.role || "customer");
              console.log("[ClerkCallback] User created, redirecting to:", redirectPath);
              navigate(redirectPath, { replace: true });
            } else {
              setStatus("error");
              setError(result?._error || "Unable to set up your account. Please try again.");
            }
          });

          return newCount;
        }

        // Continue polling
        if (!cancelled) {
          timeoutId = setTimeout(poll, POLL_INTERVAL);
        }
        return newCount;
      });
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [clerkLoaded, isSignedIn, clerkUser?.id, navigate, pollForUser, createUserDirectly]);

  // Handle retry
  const handleRetry = () => {
    setPollCount(0);
    setError(null);
    setStatus("polling");
  };

  // Handle go to login
  const handleGoToLogin = () => {
    navigate("/auth/login", { replace: true });
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
          {(status === "loading" || status === "polling" || status === "creating") && (
            <div className="text-center">
              {/* Spinner */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">
                {status === "loading" ? "Loading..." :
                 status === "creating" ? "Creating your account..." :
                 "Setting up your account"}
              </h2>

              <p className="text-gray-400 text-sm">
                {(status === "polling" || status === "creating") && (
                  <>
                    Please wait while we prepare your dashboard
                  </>
                )}
              </p>

              {/* Progress indicator */}
              {(status === "polling" || status === "creating") && (
                <div className="mt-6">
                  <div className="w-full bg-[#2A2A2A] rounded-full h-1.5">
                    <div
                      className="bg-[var(--color-primary)] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: status === "creating" ? "100%" : `${(pollCount / MAX_POLLS) * 100}%` }}
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
                  className="w-full h-12 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110 text-white font-semibold rounded-2xl transition-all duration-200"
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
          <a href="mailto:support@tipunox.com" className="text-[var(--color-primary)] hover:text-[var(--color-accent)]">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default ClerkCallback;
