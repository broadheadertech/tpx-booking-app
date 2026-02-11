import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import App from "./App.jsx";
import "./styles/index.css";
import "./styles/print.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Determine if Clerk is properly configured
const isClerkConfigured =
  clerkPubKey && clerkPubKey !== "pk_test_YOUR_PUBLISHABLE_KEY_HERE";

// Log warning if Clerk is not configured
if (!isClerkConfigured) {
  console.warn(
    "[Clerk] VITE_CLERK_PUBLISHABLE_KEY not configured. Running without Clerk authentication.",
    "\nTo enable Clerk, add your publishable key to .env.local"
  );
}

// Register service worker for PWA + notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[SW] Registered:', reg.scope);
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isClerkConfigured ? (
      <ClerkProvider
        publishableKey={clerkPubKey}
        allowedRedirectOrigins={["https://broadheader.com", "https://localhost", "capacitor://localhost", "http://localhost"]}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <App />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    ) : (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    )}
  </StrictMode>
);
