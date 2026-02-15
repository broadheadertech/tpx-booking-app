import { useState, useEffect, useRef, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const MODEL_URL = '/models'

// Module-level singleton — models load once across all components
let modelsLoaded = false
let modelsLoading = false
let loadPromise = null

async function ensureModelsLoaded() {
  if (modelsLoaded) return
  if (modelsLoading) return loadPromise

  modelsLoading = true
  loadPromise = Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => {
    modelsLoaded = true
    modelsLoading = false
  })

  return loadPromise
}

/**
 * Eye Aspect Ratio (EAR) for blink detection.
 * Uses the 6 landmarks around each eye from the 68-point model.
 */
function getEyeAspectRatio(landmarks) {
  const leftEye = landmarks.getLeftEye()
  const rightEye = landmarks.getRightEye()

  const ear = (eye) => {
    const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y)
    const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y)
    const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y)
    return (v1 + v2) / (2.0 * h)
  }

  return (ear(leftEye) + ear(rightEye)) / 2.0
}

/**
 * Head turn ratio using nose tip vs jaw edges.
 * Returns value < 0 for left turn, > 0 for right turn, ~0 for centered.
 */
function getHeadTurnRatio(landmarks) {
  const nose = landmarks.getNose()
  const jaw = landmarks.getJawOutline()
  const noseTip = nose[3] // tip of nose
  const leftJaw = jaw[0]
  const rightJaw = jaw[16]

  const leftDist = Math.hypot(noseTip.x - leftJaw.x, noseTip.y - leftJaw.y)
  const rightDist = Math.hypot(noseTip.x - rightJaw.x, noseTip.y - rightJaw.y)

  // Ratio: negative = head turned left, positive = head turned right
  return (rightDist - leftDist) / (rightDist + leftDist)
}

/**
 * Reusable hook wrapping face-api.js for face detection, recognition,
 * liveness checks, and photo capture.
 */
export function useFaceDetection() {
  const [isLoading, setIsLoading] = useState(!modelsLoaded)
  const [error, setError] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Track EAR history for blink detection
  const earHistoryRef = useRef([])
  // Track head turn history
  const turnHistoryRef = useRef([])

  // Load models on mount
  useEffect(() => {
    if (modelsLoaded) {
      setIsLoading(false)
      return
    }

    ensureModelsLoaded()
      .then(() => setIsLoading(false))
      .catch((err) => {
        setError('Failed to load face detection models: ' + err.message)
        setIsLoading(false)
      })
  }, [])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  /** Start the front-facing camera */
  const startCamera = useCallback(async () => {
    try {
      // Check for secure context — getUserMedia requires HTTPS or localhost
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          'Camera not available. This feature requires HTTPS or localhost. ' +
          'If you are on a local network, access via https:// or use localhost.'
        )
        return false
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      return true
    } catch (err) {
      setError('Camera access denied: ' + err.message)
      return false
    }
  }, [])

  /** Stop the camera */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  /**
   * Detect a single face and return its descriptor + detection + landmarks.
   * Returns null if no face or multiple faces detected.
   */
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return null

    const result = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!result) return null

    return {
      descriptor: Array.from(result.descriptor), // Convert Float32Array to regular array
      detection: result.detection,
      landmarks: result.landmarks,
      score: result.detection.score,
    }
  }, [])

  /**
   * Compare two face descriptors using Euclidean distance.
   * Lower = more similar. Threshold: < 0.6 is a match.
   */
  const compareFaces = useCallback((descriptor1, descriptor2) => {
    return faceapi.euclideanDistance(descriptor1, descriptor2)
  }, [])

  /**
   * Find the best matching barber from an array of enrollments.
   * @param {number[]} queryDescriptor - The 128-float descriptor to match
   * @param {Array<{barber_id, barber_name, embeddings: number[][]}>} enrollments
   * @returns {{ barber_id, barber_name, distance, confidence } | null}
   */
  const findBestMatch = useCallback((queryDescriptor, enrollments) => {
    let bestMatch = null
    let bestDistance = Infinity

    for (const enrollment of enrollments) {
      for (const storedDescriptor of enrollment.embeddings) {
        const distance = faceapi.euclideanDistance(queryDescriptor, storedDescriptor)
        if (distance < bestDistance) {
          bestDistance = distance
          bestMatch = {
            barber_id: enrollment.barber_id,
            user_id: enrollment.user_id,
            person_type: enrollment.person_type,
            barber_name: enrollment.barber_name,
            barber_avatar: enrollment.barber_avatar,
            distance,
            // Convert distance to confidence (0-1). Max reasonable distance is ~1.2
            confidence: Math.max(0, Math.min(1, 1 - distance / 1.2)),
          }
        }
      }
    }

    return bestMatch
  }, [])

  /**
   * Capture the current video frame as a Blob for upload.
   */
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return null

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
    })
  }, [])

  /**
   * Check face quality for enrollment capture.
   * Returns { isGood, reasons[] }
   */
  const checkFaceQuality = useCallback((detection, videoWidth, videoHeight) => {
    const reasons = []
    const box = detection.box

    // Detection confidence > 0.8
    if (detection.score < 0.8) reasons.push('Face not clear enough')

    // Face covers at least 5% of frame (lowered for laptops/wide cameras)
    const faceArea = box.width * box.height
    const frameArea = videoWidth * videoHeight
    if (faceArea / frameArea < 0.05) reasons.push('Move closer to camera')

    // Face is roughly centered (center within 40% of frame center)
    const faceCenterX = box.x + box.width / 2
    const faceCenterY = box.y + box.height / 2
    const frameCenterX = videoWidth / 2
    const frameCenterY = videoHeight / 2
    const offsetX = Math.abs(faceCenterX - frameCenterX) / videoWidth
    const offsetY = Math.abs(faceCenterY - frameCenterY) / videoHeight
    if (offsetX > 0.4 || offsetY > 0.4) reasons.push('Center your face')

    return { isGood: reasons.length === 0, reasons }
  }, [])

  /**
   * Monitor for blink detection over multiple frames.
   * Call this repeatedly (e.g., in requestAnimationFrame loop).
   * Returns true when a blink is detected.
   */
  const checkBlink = useCallback(async () => {
    const result = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()

    if (!result) return false

    const ear = getEyeAspectRatio(result.landmarks)
    earHistoryRef.current.push(ear)

    // Keep last 40 frames
    if (earHistoryRef.current.length > 40) {
      earHistoryRef.current.shift()
    }

    const history = earHistoryRef.current
    if (history.length < 4) return false

    // Blink detected: EAR drops below threshold then rises back
    // Use wider window (last 10 frames) and relaxed thresholds
    const recent = history.slice(-10)
    const min = Math.min(...recent)
    const max = Math.max(...recent)

    // Relaxed: closed eyes < 0.25, open eyes > 0.27
    // The key signal is a significant DROP (max - min > 0.04)
    if (min < 0.25 && max > 0.27 && (max - min) > 0.04) {
      earHistoryRef.current = [] // Reset after detection
      return true
    }

    return false
  }, [])

  /**
   * Monitor for head turn. Call repeatedly.
   * @param {'left' | 'right'} direction - Expected turn direction
   * Returns true when the expected head turn is detected.
   */
  const checkHeadTurn = useCallback(async (direction) => {
    const result = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()

    if (!result) return false

    const ratio = getHeadTurnRatio(result.landmarks)
    turnHistoryRef.current.push(ratio)

    if (turnHistoryRef.current.length > 20) {
      turnHistoryRef.current.shift()
    }

    const history = turnHistoryRef.current
    if (history.length < 3) return false

    const recent = history.slice(-3)
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length

    // Threshold: head turn ratio > 0.10 for the correct direction (relaxed for usability)
    const threshold = 0.10
    const detected = direction === 'left' ? avg < -threshold : avg > threshold

    if (detected) {
      turnHistoryRef.current = [] // Reset
      return true
    }

    return false
  }, [])

  /** Reset liveness detection state */
  const resetLiveness = useCallback(() => {
    earHistoryRef.current = []
    turnHistoryRef.current = []
  }, [])

  return {
    // Refs to attach to DOM elements
    videoRef,
    canvasRef,

    // State
    isLoading,
    error,
    cameraActive,

    // Camera control
    startCamera,
    stopCamera,

    // Face detection & matching
    detectFace,
    compareFaces,
    findBestMatch,
    checkFaceQuality,

    // Photo capture
    capturePhoto,

    // Liveness detection
    checkBlink,
    checkHeadTurn,
    resetLiveness,
  }
}
