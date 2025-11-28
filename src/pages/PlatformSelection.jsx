import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Globe, ArrowLeft, Download, Star } from "lucide-react";

const PlatformSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user came from "Book Now" or "Sign In"
  const actionType = location.state?.action || "signin";
  const isBooking = actionType === "booking";

  const handleWebVersion = () => {
    if (isBooking) {
      navigate("/auth/register");
    } else {
      navigate("/auth/login");
    }
  };

  const handleAppDownload = () => {
    // Navigate to download page for Android app
    navigate("/download-app");
  };

  return (
    <div className="min-h-screen relative bg-gray-900 overflow-hidden flex items-center justify-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("/landing/4.webp")`,
        }}
      ></div>

      {/* Dark overlay with opacity */}
      <div className="absolute inset-0 bg-gray-900/90"></div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-900/95"></div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      {/* Main Content */}
      <div className="relative z-10 px-4 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src="/img/tipuno_x_logo_white.avif"
              alt="Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {isBooking ? "Ready to Book?" : "Welcome Back"}
          </h1>
          <p className="text-gray-300">Choose your preferred way to continue</p>
        </div>

        {/* Platform Options */}
        <div className="space-y-4 mb-8">
          {/* Mobile App Option */}
          <button
            onClick={handleAppDownload}
            className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 hover:border-orange-500/50 transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                <img
                  src="/img/android.png"
                  alt="Android"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-white">
                    Android App
                  </span>
                  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  AI assistant & premium features
                </p>
              </div>
              <Download className="w-5 h-5 text-orange-400" />
            </div>
          </button>

          {/* Web Version Option */}
          <button
            onClick={handleWebVersion}
            className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/30 transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-6 h-6 text-gray-300" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-lg font-bold text-white block mb-1">
                  Web Browser
                </span>
                <p className="text-sm text-gray-400">
                  Quick access, no download
                </p>
              </div>
              <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
            </div>
          </button>
        </div>

        {/* Bottom Info */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-white font-semibold">4.9</span>
            <span>• 2,500+ customers</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSelection;
