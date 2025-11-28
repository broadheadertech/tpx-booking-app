import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Download,
  ArrowLeft,
  Shield,
  Star,
  Check,
  Smartphone,
  Calendar,
  Users,
  Scissors,
  Sparkles,
} from "lucide-react";
import { downloadService } from "../services/downloadService";

const DownloadApp = () => {
  const navigate = useNavigate();
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const startDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadComplete(false);

      await downloadService.downloadAPK({
        onProgress: (progress) => {
          setDownloadProgress(progress);
        },
        onComplete: () => {
          setIsDownloading(false);
          setDownloadComplete(true);
        },
        onError: (error) => {
          setIsDownloading(false);
          console.error("Download failed:", error);
        },
      });
    } catch (error) {
      setIsDownloading(false);
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("/landing/4.webp")`,
        }}
      ></div>

      {/* Dark overlay with opacity */}
      <div className="absolute inset-0 bg-gray-900/90"></div>

      {/* Content wrapper with z-index */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src=""
                alt="Barbershop"
                className="w-8 h-8 object-contain"
              />
              <span className="text-white font-bold text-lg">
                Barbershop
              </span>
            </Link>

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full">
            {/* App Icon and Title */}
            <div className="text-center mb-12">
              <div className="flex justify-center items-center gap-8 mb-6">
                <img
                  src=""
                  alt="Barbershop"
                  className="w-60 h-24 object-contain"
                />
              </div>

              <div className="inline-flex items-center gap-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
                Android App
              </div>

              <h1 className="text-4xl font-bold text-white mb-4">
                Download Barbershop
              </h1>

              <p className="text-gray-400 text-lg max-w-md mx-auto">
                Book appointments, get AI recommendations, and manage your
                loyalty points
              </p>
            </div>

            {/* Download Section */}
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-xl">
              {/* Download Button */}
              <button
                onClick={startDownload}
                disabled={isDownloading || downloadComplete}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-700 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              >
                {isDownloading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Downloading... {Math.round(downloadProgress)}%
                  </>
                ) : downloadComplete ? (
                  <>
                    <Check className="w-6 h-6" />
                    Download Complete
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" />
                    Download APK (11.2 MB)
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {isDownloading && (
                <div className="mb-6">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* App Info */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-gray-700/50 rounded-xl">
                  <div className="text-2xl font-bold text-white mb-1">4.9</div>
                  <div className="text-sm text-gray-400 flex items-center justify-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                    Rating
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-700/50 rounded-xl">
                  <div className="text-2xl font-bold text-white mb-1">10K+</div>
                  <div className="text-sm text-gray-400">Downloads</div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                <h3 className="text-white font-semibold text-lg mb-4">
                  App Features
                </h3>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-gray-300">
                    Easy appointment booking
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-gray-300">
                    AI style recommendations
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-gray-300">Loyalty rewards program</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
                    <Scissors className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-gray-300">
                    Service history tracking
                  </span>
                </div>
              </div>

              {/* Requirements */}
              <div className="pt-6 border-t border-gray-700">
                <h3 className="text-white font-semibold mb-3">Requirements</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400" />
                    Android 6.0 or higher
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400" />
                    50MB storage space
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400" />
                    Internet connection for setup
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-6 p-4 bg-gray-700/30 rounded-xl border border-gray-600">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-orange-400" />
                  <div>
                    <div className="text-white font-medium">100% Secure</div>
                    <div className="text-gray-400 text-sm">
                      Scanned for viruses and malware
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Version Info */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              Version 1.0 • Compatible with Android 6.0+
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DownloadApp;
