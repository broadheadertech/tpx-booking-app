import { useEffect, useState } from 'react';

// Platform detection utility
export const usePlatform = () => {
  const [platform, setPlatform] = useState({
    isNativeApp: false,
    isMobile: false,
    isAndroid: false,
    isIOS: false,
    isDesktop: false,
    isWebView: false,
  });

  useEffect(() => {
    const detectPlatform = () => {
      // Check if running in Capacitor (native app)
      const isNativeApp = typeof window !== "undefined" && window.Capacitor;

      // Check user agent for mobile detection
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent,
        );

      // Specific platform detection
      const isAndroid = /Android/i.test(userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      const isDesktop = !isMobile;

      // Check if running in a web view (common for mobile apps)
      const isWebView =
        isNativeApp ||
        (isMobile && /; wv\)|Instagram|FBAN|FBAV|Twitter/i.test(userAgent));

      setPlatform({
        isNativeApp,
        isMobile,
        isAndroid,
        isIOS,
        isDesktop,
        isWebView,
      });
    };

    if (typeof window !== "undefined") {
      detectPlatform();
    }
  }, []);

  return platform;
};

// Helper function for quick platform checks
export const getPlatform = () => {
  if (typeof window === "undefined") {
    return {
      isNativeApp: false,
      isMobile: false,
      isAndroid: false,
      isIOS: false,
      isDesktop: false,
      isWebView: false,
    };
  }

  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isNativeApp = typeof window.Capacitor !== "undefined";
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isDesktop = !isMobile;
  const isWebView =
    isNativeApp ||
    (isMobile && /; wv\)|Instagram|FBAN|FBAV|Twitter/i.test(userAgent));

  return {
    isNativeApp,
    isMobile,
    isAndroid,
    isIOS,
    isDesktop,
    isWebView,
  };
};

// Route helper function
export const getInitialRoute = () => {
  const platform = getPlatform();

  if (platform.isNativeApp) {
    // Native Android app - redirect to login
    return "/auth/login";
  } else {
    // Web browser (desktop or mobile) - show landing page
    return "/";
  }
};
