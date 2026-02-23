import { useRef, useState, useCallback, useEffect } from 'react';

// Lazy-loaded MediaPipe modules
let FaceMesh = null;
let Camera = null;
let loadingPromise = null;

async function ensureMediaPipeLoaded() {
  if (FaceMesh && Camera) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [faceMeshMod, cameraMod] = await Promise.all([
      import('@mediapipe/face_mesh'),
      import('@mediapipe/camera_utils'),
    ]);
    FaceMesh = faceMeshMod.FaceMesh;
    Camera = cameraMod.Camera;
  })();

  return loadingPromise;
}

/**
 * useFaceMesh — MediaPipe Face Mesh hook (468 landmarks, 30fps)
 * Returns videoRef, canvasRef, landmarks, isLoading, error, start/stop camera
 */
export default function useFaceMesh({ onResults: externalOnResults } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [landmarks, setLandmarks] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const onResultsRef = useRef(externalOnResults);
  onResultsRef.current = externalOnResults;

  const handleResults = useCallback((results) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const faceLandmarks = results.multiFaceLandmarks[0];
      setLandmarks(faceLandmarks);
      setFaceDetected(true);
    } else {
      setLandmarks(null);
      setFaceDetected(false);
    }

    // Forward to external callback
    if (onResultsRef.current) {
      onResultsRef.current(results);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await ensureMediaPipeLoaded();

      if (!videoRef.current) {
        throw new Error('Video element not ready');
      }

      // Initialize FaceMesh
      const faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults(handleResults);
      faceMeshRef.current = faceMesh;

      // Initialize Camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
        facingMode: 'user',
      });

      await camera.start();
      cameraRef.current = camera;
      setCameraActive(true);
      setIsLoading(false);
    } catch (err) {
      console.error('useFaceMesh: Camera start error:', err);
      setError(err.message || 'Failed to start camera');
      setIsLoading(false);
    }
  }, [handleResults]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    setLandmarks(null);
    setFaceDetected(false);
    setCameraActive(false);
  }, []);

  // Capture a photo from the canvas
  const capturePhoto = useCallback(() => {
    return new Promise((resolve) => {
      if (!canvasRef.current) {
        resolve(null);
        return;
      }
      canvasRef.current.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.85
      );
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    landmarks,
    faceDetected,
    isLoading,
    error,
    cameraActive,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}
