import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Grid,
  Heart,
  Sparkles,
  RotateCcw,
  Save,
  X,
  ChevronDown,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import useFaceMesh from '../../../hooks/useFaceMesh';
import useFaceShape from '../../../hooks/useFaceShape';
import {
  renderFrame,
  generateCompositeImage,
  loadOverlayImage,
  calculateOverlayPosition,
} from '../../../services/mirrorOverlayService';
import { useEnsureClerkUser } from '../../../hooks/useEnsureClerkUser';
import FaceShapeIndicator from './FaceShapeIndicator';
import HairstyleCatalogPanel from './HairstyleCatalogPanel';
import SaveLookModal from './SaveLookModal';

const STATES = {
  SCANNING: 'scanning',
  DETECTED: 'detected',
  BROWSING: 'browsing',
};

export default function AIMirrorPage() {
  const navigate = useNavigate();
  const { user } = useEnsureClerkUser();
  const userId = user?._id;

  // ─── State ───────────────────────────────────────────────────────────
  const [mirrorState, setMirrorState] = useState(STATES.SCANNING);
  const [stableFaceData, setStableFaceData] = useState(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [compositeUrl, setCompositeUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  // ─── Refs ────────────────────────────────────────────────────────────
  const animFrame = useRef(null);
  const overlayImageRef = useRef(null);
  const detectedTimerRef = useRef(null);
  const stableCheckRef = useRef(null);

  // ─── Hooks ───────────────────────────────────────────────────────────
  const {
    videoRef,
    canvasRef,
    landmarks,
    faceDetected,
    isLoading,
    error,
    cameraActive,
    startCamera,
    stopCamera,
  } = useFaceMesh();

  const { instantResult, getStableShape, resetHistory } = useFaceShape(landmarks);

  // ─── Convex queries & mutations ──────────────────────────────────────
  const hairstyles = useQuery(
    api.services.aiMirror.getHairstylesForFaceShape,
    stableFaceData ? { face_shape: stableFaceData.shape } : 'skip'
  );

  const generateUploadUrl = useMutation(api.services.aiMirror.generateUploadUrl);
  const saveLookMutation = useMutation(api.services.aiMirror.saveLook);
  const saveUserFaceProfile = useMutation(api.services.aiMirror.saveUserFaceProfile);
  const incrementTryCount = useMutation(api.services.aiMirror.incrementTryCount);

  // ─── Camera startup ──────────────────────────────────────────────────
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (detectedTimerRef.current) clearTimeout(detectedTimerRef.current);
      if (stableCheckRef.current) clearInterval(stableCheckRef.current);
    };
  }, [startCamera, stopCamera]);

  // ─── Face shape stabilization check ──────────────────────────────────
  useEffect(() => {
    if (mirrorState !== STATES.SCANNING || !cameraActive) return;

    stableCheckRef.current = setInterval(() => {
      const stable = getStableShape();
      if (stable) {
        setStableFaceData(stable);
        setMirrorState(STATES.DETECTED);
        clearInterval(stableCheckRef.current);
        stableCheckRef.current = null;
      }
    }, 200);

    return () => {
      if (stableCheckRef.current) {
        clearInterval(stableCheckRef.current);
        stableCheckRef.current = null;
      }
    };
  }, [mirrorState, cameraActive, getStableShape]);

  // ─── Detected → Browsing auto-transition ─────────────────────────────
  useEffect(() => {
    if (mirrorState !== STATES.DETECTED) return;

    // Save face profile to backend
    if (userId && stableFaceData) {
      saveUserFaceProfile({
        user_id: userId,
        face_shape: stableFaceData.shape,
        measurements: stableFaceData.measurements,
        confidence: stableFaceData.confidence,
      }).catch(() => {});
    }

    detectedTimerRef.current = setTimeout(() => {
      setMirrorState(STATES.BROWSING);
      setCatalogOpen(true);
    }, 3000);

    return () => {
      if (detectedTimerRef.current) {
        clearTimeout(detectedTimerRef.current);
        detectedTimerRef.current = null;
      }
    };
  }, [mirrorState, userId, stableFaceData, saveUserFaceProfile]);

  // ─── Render loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        renderFrame(ctx, video, canvas, landmarks, overlayImageRef.current);
      }
      animFrame.current = requestAnimationFrame(loop);
    };

    if (cameraActive) loop();

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [cameraActive, landmarks]);

  // ─── Hairstyle selection handler ─────────────────────────────────────
  const handleSelectHairstyle = useCallback(
    async (style) => {
      setSelectedHairstyle(style);
      setOverlayLoading(true);

      try {
        const img = await loadOverlayImage(style.overlayUrl);
        overlayImageRef.current = img;

        incrementTryCount({ hairstyle_id: style._id }).catch(() => {});
      } catch (err) {
        console.error('Failed to load hairstyle overlay:', err);
        overlayImageRef.current = null;
      } finally {
        setOverlayLoading(false);
      }
    },
    [incrementTryCount]
  );

  // ─── Capture composite for saving ────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !landmarks) return;

    try {
      const blob = await generateCompositeImage(
        videoRef.current,
        landmarks,
        overlayImageRef.current,
        videoRef.current.videoWidth || 640,
        videoRef.current.videoHeight || 480
      );

      if (blob) {
        const url = URL.createObjectURL(blob);
        setCompositeUrl(url);
        setSaveModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to capture composite:', err);
    }
  }, [landmarks]);

  // ─── Save look to Convex ─────────────────────────────────────────────
  const handleSaveLook = useCallback(
    async (notes) => {
      if (!userId || !selectedHairstyle || !stableFaceData || !compositeUrl) return;

      setSaving(true);
      try {
        const response = await fetch(compositeUrl);
        const blob = await response.blob();

        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': blob.type },
          body: blob,
        });
        const { storageId } = await uploadResult.json();

        await saveLookMutation({
          user_id: userId,
          hairstyle_id: selectedHairstyle._id,
          composite_image_id: storageId,
          face_shape: stableFaceData.shape,
          compatibility_score: selectedHairstyle.compatibilityScore,
          notes: notes || undefined,
        });

        setSaveModalOpen(false);
        if (compositeUrl) URL.revokeObjectURL(compositeUrl);
        setCompositeUrl(null);
      } catch (err) {
        console.error('Failed to save look:', err);
      } finally {
        setSaving(false);
      }
    },
    [userId, selectedHairstyle, stableFaceData, compositeUrl, generateUploadUrl, saveLookMutation]
  );

  // ─── Book style redirect ────────────────────────────────────────────
  const handleBookStyle = useCallback(
    (hairstyleName) => {
      navigate('/book', { state: { preferredStyle: hairstyleName } });
    },
    [navigate]
  );

  // ─── Reset / rescan ──────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setMirrorState(STATES.SCANNING);
    setStableFaceData(null);
    setSelectedHairstyle(null);
    setCatalogOpen(false);
    overlayImageRef.current = null;
    resetHistory();
  }, [resetHistory]);

  // ─── Cleanup composite URL on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      if (compositeUrl) URL.revokeObjectURL(compositeUrl);
    };
  }, [compositeUrl]);

  // ─── Scanning overlay ────────────────────────────────────────────────
  const renderScanningOverlay = () => {
    if (mirrorState !== STATES.SCANNING) return null;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        {faceDetected && (
          <div className="relative w-48 h-48 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-pulse" />
            <div
              className="absolute inset-2 rounded-full border-2 border-white/20"
              style={{ animation: 'pulse 2s ease-in-out infinite 0.3s' }}
            />
            <div
              className="absolute inset-4 rounded-full border-2 border-white/10"
              style={{ animation: 'pulse 2s ease-in-out infinite 0.6s' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={28} className="text-white/60 animate-pulse" />
            </div>
          </div>
        )}

        <div className="bg-black/60 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/10">
          <p className="text-white text-sm font-medium text-center">
            {!faceDetected ? 'Position your face in the frame' : 'Analyzing your face shape'}
            <span className="inline-flex ml-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </span>
          </p>
        </div>

        {!faceDetected && (
          <p className="text-white/40 text-xs mt-3 text-center max-w-[200px]">
            Make sure your face is well-lit and centered in the camera
          </p>
        )}
      </div>
    );
  };

  // ─── Detected reveal overlay ─────────────────────────────────────────
  const renderDetectedOverlay = () => {
    if (mirrorState !== STATES.DETECTED || !stableFaceData) return null;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-fade-in">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        <div className="relative z-10 flex flex-col items-center px-6">
          <div className="mb-4 relative">
            <div className="absolute -inset-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Sparkles
                  key={i}
                  size={10 + Math.random() * 8}
                  className="absolute text-yellow-300/70"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animation: `sparkle ${1 + Math.random()}s ease-in-out infinite ${Math.random() * 0.5}s`,
                  }}
                />
              ))}
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/20 flex items-center justify-center text-3xl">
              {stableFaceData.info?.icon || ''}
            </div>
          </div>

          <h2 className="text-white text-2xl font-bold text-center mb-1">
            You have a{' '}
            <span className="bg-gradient-to-r from-yellow-200 to-amber-300 bg-clip-text text-transparent uppercase">
              {stableFaceData.info?.label || stableFaceData.shape}
            </span>{' '}
            face!
          </h2>

          <p className="text-white/50 text-sm text-center mb-5 max-w-[260px]">
            {stableFaceData.info?.description || ''}
          </p>

          <div className="w-full max-w-xs">
            <FaceShapeIndicator
              shape={stableFaceData.shape}
              confidence={stableFaceData.confidence}
              showDetails={true}
            />
          </div>

          <p className="text-white/30 text-xs mt-4 animate-pulse">
            Finding your best hairstyles...
          </p>
        </div>
      </div>
    );
  };

  // ─── Browsing UI ─────────────────────────────────────────────────────
  const renderBrowsingUI = () => {
    if (mirrorState !== STATES.BROWSING) return null;

    return (
      <>
        {/* Face shape badge */}
        {stableFaceData && (
          <div className="absolute top-16 right-3 z-20">
            <FaceShapeIndicator
              shape={stableFaceData.shape}
              confidence={stableFaceData.confidence}
              size="compact"
            />
          </div>
        )}

        {/* Overlay loading indicator */}
        {overlayLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10">
              <p className="text-white text-xs font-medium animate-pulse">Loading style...</p>
            </div>
          </div>
        )}

        {/* Selected style name */}
        {selectedHairstyle && !overlayLoading && (
          <div className="absolute top-16 left-3 z-20">
            <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10 flex items-center gap-2">
              <span className="text-white text-xs font-medium truncate max-w-[140px]">
                {selectedHairstyle.name}
              </span>
              {selectedHairstyle.compatibilityScore != null && (
                <span className="text-[10px] text-yellow-400 font-medium">
                  {selectedHairstyle.compatibilityScore}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bottom action bar */}
        <div className="absolute bottom-0 inset-x-0 z-20">
          {!catalogOpen && (
            <div className="flex items-center justify-center gap-3 px-4 pb-5 pt-2">
              <button
                onClick={handleReset}
                className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
                aria-label="Rescan face"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={handleCapture}
                disabled={!selectedHairstyle}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-white/20"
                aria-label="Capture photo"
              >
                <Camera size={24} className="text-black" />
              </button>

              <button
                onClick={() => setSaveModalOpen(true)}
                disabled={!selectedHairstyle}
                className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors disabled:opacity-30"
                aria-label="Save look"
              >
                <Heart size={18} />
              </button>
            </div>
          )}

          {/* Catalog toggle when closed */}
          {!catalogOpen && (
            <button
              onClick={() => setCatalogOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-[#1A1A1A]/90 backdrop-blur-md border-t border-white/10 text-white/50 hover:text-white/70 transition-colors"
            >
              <ChevronDown size={14} className="rotate-180" />
              <span className="text-xs font-medium">Browse Hairstyles</span>
            </button>
          )}
        </div>

        {/* Catalog panel */}
        <HairstyleCatalogPanel
          hairstyles={hairstyles || []}
          selectedId={selectedHairstyle?._id}
          onSelect={handleSelectHairstyle}
          faceShape={stableFaceData?.info?.label}
          isOpen={catalogOpen}
          onClose={() => setCatalogOpen(false)}
        />
      </>
    );
  };

  // ─── Loading & error states ──────────────────────────────────────────
  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0F0F0F] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <Camera size={28} className="text-red-400" />
        </div>
        <h2 className="text-white text-lg font-semibold mb-2 text-center">Camera Access Required</h2>
        <p className="text-white/50 text-sm text-center max-w-xs mb-6">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/15 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={startCamera}
            className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#0F0F0F] flex flex-col overflow-hidden">
      {/* Custom animations */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>

      {/* Top bar */}
      <div className="relative z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-yellow-300" />
          <h1 className="text-white font-semibold text-base">AI Mirror</h1>
        </div>

        <button
          onClick={() => {
            if (mirrorState === STATES.BROWSING) {
              setCatalogOpen((prev) => !prev);
            }
          }}
          disabled={mirrorState !== STATES.BROWSING}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30"
          aria-label="Browse hairstyles"
        >
          <Grid size={18} />
        </button>
      </div>

      {/* Camera view area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Hidden video element (FaceMesh reads from this) */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
          autoPlay
          playsInline
          muted
        />

        {/* Visible canvas (render loop draws here) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F0F0F] z-20">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-white/60 animate-spin mb-4" />
            <p className="text-white/50 text-sm">Starting camera...</p>
          </div>
        )}

        {/* State-specific overlays */}
        {renderScanningOverlay()}
        {renderDetectedOverlay()}
        {renderBrowsingUI()}
      </div>

      {/* Save look modal */}
      <SaveLookModal
        isOpen={saveModalOpen}
        onClose={() => {
          setSaveModalOpen(false);
          if (compositeUrl) {
            URL.revokeObjectURL(compositeUrl);
            setCompositeUrl(null);
          }
        }}
        onSave={handleSaveLook}
        onBookStyle={handleBookStyle}
        compositeUrl={compositeUrl}
        hairstyleName={selectedHairstyle?.name}
        compatibilityScore={selectedHairstyle?.compatibilityScore}
        saving={saving}
      />
    </div>
  );
}
