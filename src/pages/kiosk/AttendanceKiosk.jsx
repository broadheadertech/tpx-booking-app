import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useFaceDetection } from '../../hooks/useFaceDetection'
import { BrandingProvider } from '../../context/BrandingContext'
import { getDeviceFingerprint } from '../../lib/deviceFingerprint'
import { createVideoSource, parseVideoSourceFromURL } from '../../lib/videoSources'
import { Check, X, AlertCircle, Loader2, Scan, ShieldCheck, Clock, Camera } from 'lucide-react'

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000
const COOLDOWN_MS = 30000
const STABLE_FRAMES = 3
const GREETING_DURATION = 3000
const CONFIRMED_DURATION = 5000
const REJECTED_DURATION = 5000
const LIVENESS_TIMEOUT = 20000

const STATES = {
  LOADING: 'loading',
  IDLE: 'idle',
  DETECTING: 'detecting',
  LIVENESS: 'liveness',
  MATCHING: 'matching',
  GREETING: 'greeting',
  CONFIRMED: 'confirmed',
  LOW_CONFIDENCE: 'low_confidence',
  REJECTED: 'rejected',
  ERROR: 'error',
}

function formatTime(date) {
  return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function formatDuration(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

function AttendanceKioskInner() {
  const urlParams = new URLSearchParams(window.location.search)
  const branchCode = urlParams.get('branch')
  const videoSourceConfig = useRef(parseVideoSourceFromURL(urlParams))
  const videoSourceRef = useRef(null)

  const [state, setState] = useState(STATES.LOADING)
  const [matchResult, setMatchResult] = useState(null)
  const [clockResult, setClockResult] = useState(null)
  const [livenessStep, setLivenessStep] = useState('blink')
  const [turnDirection, setTurnDirection] = useState('left')
  const [errorMsg, setErrorMsg] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const loopRef = useRef(null)
  const stableCountRef = useRef(0)
  const livenessTimeoutRef = useRef(null)
  const confirmTimeoutRef = useRef(null)
  const cooldownMapRef = useRef(new Map())
  const deviceFP = useRef(getDeviceFingerprint())

  const {
    videoRef, isLoading, error: modelError,
    startCamera, stopCamera, detectFace, findBestMatch,
    capturePhoto, checkBlink, checkHeadTurn, resetLiveness,
  } = useFaceDetection()

  // Resolve branch
  const branch = useQuery(
    api.services.branches.getBranchByCode,
    branchCode ? { branch_code: branchCode } : 'skip'
  )
  const branchId = branch?._id

  // Convex queries
  const enrollments = useQuery(
    api.services.faceAttendance.getEnrollmentsByBranch,
    branchId ? { branch_id: branchId } : 'skip'
  )
  const config = useQuery(
    api.services.faceAttendance.getAttendanceConfig,
    branchId ? { branch_id: branchId } : 'skip'
  )
  const barberStatuses = useQuery(
    api.services.timeAttendance.getBarberStatusForBranch,
    branchId ? { branch_id: branchId } : 'skip'
  )
  const deviceCheck = useQuery(
    api.services.faceAttendance.checkDeviceRegistered,
    branchId ? { branch_id: branchId, device_fingerprint: deviceFP.current } : 'skip'
  )

  // Mutations
  const clockInFR = useMutation(api.services.faceAttendance.clockInWithFR)
  const clockOutFR = useMutation(api.services.faceAttendance.clockOutWithFR)
  const generateUploadUrl = useMutation(api.services.faceAttendance.generateUploadUrl)

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Error checks on load
  useEffect(() => {
    if (!branchCode) {
      setErrorMsg('Branch code required. Add ?branch=YOUR_CODE to the URL.')
      setState(STATES.ERROR)
      return
    }
    if (branch === null) {
      setErrorMsg(`Branch "${branchCode}" not found. Check the branch code.`)
      setState(STATES.ERROR)
    }
  }, [branchCode, branch])

  // Check FR enabled
  useEffect(() => {
    if (config && config.fr_enabled === false) {
      setErrorMsg('Face recognition is not enabled for this branch. Contact your administrator.')
      setState(STATES.ERROR)
    }
  }, [config])

  // Check device registration
  useEffect(() => {
    if (deviceCheck && !deviceCheck.registered && state !== STATES.ERROR) {
      setErrorMsg(`This device is not registered for attendance.\n\nDevice ID: ${deviceFP.current}\n\nAsk your administrator to register this device in the attendance settings.`)
      setState(STATES.ERROR)
    }
  }, [deviceCheck])

  // Initialize camera when ready
  useEffect(() => {
    if (isLoading || modelError || !branchId || state === STATES.ERROR) return
    if (enrollments === undefined || config === undefined || deviceCheck === undefined) return

    if (enrollments && enrollments.length === 0) {
      setErrorMsg('No barbers enrolled for face recognition at this branch.')
      setState(STATES.ERROR)
      return
    }

    // Use video source abstraction — supports browser camera, MJPEG, etc.
    const { type, options } = videoSourceConfig.current
    if (type === 'browser') {
      // Default: use the useFaceDetection hook's built-in camera
      startCamera().then((ok) => {
        if (ok) setState(STATES.IDLE)
      })
    } else {
      // External source (MJPEG, RTSP, device SDK)
      const source = createVideoSource(type, options)
      videoSourceRef.current = source
      source.start(videoRef.current)
        .then(() => setState(STATES.IDLE))
        .catch((err) => {
          setErrorMsg(`Video source error (${type}): ${err.message}`)
          setState(STATES.ERROR)
        })
    }

    return () => {
      if (videoSourceRef.current) {
        videoSourceRef.current.stop()
        videoSourceRef.current = null
      }
      stopCamera()
      if (loopRef.current) clearTimeout(loopRef.current)
      if (livenessTimeoutRef.current) clearTimeout(livenessTimeoutRef.current)
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    }
  }, [isLoading, modelError, branchId, enrollments, config])

  // Clean expired cooldowns periodically
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now()
      for (const [key, ts] of cooldownMapRef.current) {
        if (now - ts > COOLDOWN_MS) cooldownMapRef.current.delete(key)
      }
    }, 5000)
    return () => clearInterval(t)
  }, [])

  // Helper: get cooldown key for a person
  const getCooldownKey = (match) => match.barber_id || match.user_id || 'unknown'

  // IDLE: continuous face detection loop
  useEffect(() => {
    if (state !== STATES.IDLE || !enrollments) return
    stableCountRef.current = 0

    const loop = async () => {
      const result = await detectFace()
      if (result && result.score > 0.7) {
        stableCountRef.current++
        if (stableCountRef.current >= STABLE_FRAMES) {
          // Quick check if this face is in cooldown
          const candidate = findBestMatch(result.descriptor, enrollments)
          if (candidate && cooldownMapRef.current.has(getCooldownKey(candidate))) {
            stableCountRef.current = 0
            loopRef.current = setTimeout(loop, 500)
            return
          }
          setState(STATES.DETECTING)
          return
        }
      } else {
        stableCountRef.current = 0
      }
      loopRef.current = setTimeout(loop, 500)
    }

    loop()
    return () => { if (loopRef.current) clearTimeout(loopRef.current) }
  }, [state, enrollments, detectFace, findBestMatch])

  // DETECTING: 1-second stabilization
  useEffect(() => {
    if (state !== STATES.DETECTING) return

    const timer = setTimeout(() => {
      if (config?.liveness_required !== false) {
        setLivenessStep('blink')
        setTurnDirection(Math.random() > 0.5 ? 'left' : 'right')
        resetLiveness()
        setState(STATES.LIVENESS)
      } else {
        setState(STATES.MATCHING)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [state, config, resetLiveness])

  // LIVENESS: blink + head turn
  useEffect(() => {
    if (state !== STATES.LIVENESS) return

    livenessTimeoutRef.current = setTimeout(() => {
      setErrorMsg('Liveness check timed out. Please try again.')
      setState(STATES.REJECTED)
    }, LIVENESS_TIMEOUT)

    const loop = async () => {
      if (livenessStep === 'blink') {
        const blinked = await checkBlink()
        if (blinked) {
          setLivenessStep('turn')
          loopRef.current = setTimeout(loop, 150)
          return
        }
      } else if (livenessStep === 'turn') {
        const turned = await checkHeadTurn(turnDirection)
        if (turned) {
          if (livenessTimeoutRef.current) clearTimeout(livenessTimeoutRef.current)
          setState(STATES.MATCHING)
          return
        }
      }
      loopRef.current = setTimeout(loop, 150)
    }

    loop()
    return () => {
      if (loopRef.current) clearTimeout(loopRef.current)
      if (livenessTimeoutRef.current) clearTimeout(livenessTimeoutRef.current)
    }
  }, [state, livenessStep, turnDirection, checkBlink, checkHeadTurn])

  // MATCHING: extract descriptor + find match + clock in/out
  useEffect(() => {
    if (state !== STATES.MATCHING || !enrollments) return

    const match = async () => {
      await new Promise((r) => setTimeout(r, 800))

      const MAX_ATTEMPTS = 5
      let overallBest = null

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const result = await detectFace()
        if (!result) {
          await new Promise((r) => setTimeout(r, 300))
          continue
        }

        const candidate = findBestMatch(result.descriptor, enrollments)
        if (candidate && (!overallBest || candidate.confidence > overallBest.confidence)) {
          overallBest = candidate
        }
        if (i < MAX_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 400))
      }

      if (!overallBest) {
        setErrorMsg('No face detected during matching.')
        setState(STATES.REJECTED)
        return
      }

      const matchThreshold = config?.admin_review_threshold ?? 0.50
      const autoApproveThreshold = config?.auto_approve_threshold ?? 0.65

      if (overallBest.confidence < matchThreshold) {
        setState(STATES.REJECTED)
        return
      }

      setMatchResult(overallBest)

      try {
        const blob = await capturePhoto()
        const uploadUrl = await generateUploadUrl()
        const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
        const { storageId } = await res.json()

        const personStatus = barberStatuses?.find((b) =>
          overallBest.barber_id ? b.barber_id === overallBest.barber_id : b.user_id === overallBest.user_id
        )
        const isClockedIn = personStatus?.isClockedIn

        const idArgs = overallBest.barber_id
          ? { barber_id: overallBest.barber_id }
          : { user_id: overallBest.user_id }

        let result
        if (isClockedIn) {
          result = await clockOutFR({
            ...idArgs,
            confidence_score: overallBest.confidence,
            photo_storage_id: storageId,
            liveness_passed: true,
            device_fingerprint: deviceFP.current,
          })
          setClockResult({ ...result, action: 'clock_out', barberName: overallBest.barber_name })
        } else {
          result = await clockInFR({
            ...idArgs,
            branch_id: branchId,
            confidence_score: overallBest.confidence,
            photo_storage_id: storageId,
            liveness_passed: true,
            device_fingerprint: deviceFP.current,
          })
          setClockResult({ ...result, action: 'clock_in', barberName: overallBest.barber_name })
        }

        // Add to cooldown
        cooldownMapRef.current.set(getCooldownKey(overallBest), Date.now())

        if (overallBest.confidence < autoApproveThreshold) {
          setState(STATES.LOW_CONFIDENCE)
        } else {
          setState(STATES.GREETING)
        }
      } catch (err) {
        setErrorMsg(err.data?.message || err.message || 'Clock action failed')
        setState(STATES.REJECTED)
      }
    }

    match()
  }, [state, enrollments, config, barberStatuses, branchId])

  // GREETING → CONFIRMED
  useEffect(() => {
    if (state !== STATES.GREETING) return
    confirmTimeoutRef.current = setTimeout(() => setState(STATES.CONFIRMED), GREETING_DURATION)
    return () => { if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current) }
  }, [state])

  // CONFIRMED → IDLE
  useEffect(() => {
    if (state !== STATES.CONFIRMED) return
    const t = setTimeout(() => {
      setMatchResult(null)
      setClockResult(null)
      setErrorMsg(null)
      setState(STATES.IDLE)
    }, CONFIRMED_DURATION)
    return () => clearTimeout(t)
  }, [state])

  // REJECTED → IDLE
  useEffect(() => {
    if (state !== STATES.REJECTED) return
    const t = setTimeout(() => {
      setMatchResult(null)
      setErrorMsg(null)
      setState(STATES.IDLE)
    }, REJECTED_DURATION)
    return () => clearTimeout(t)
  }, [state])

  // LOW_CONFIDENCE → IDLE
  useEffect(() => {
    if (state !== STATES.LOW_CONFIDENCE) return
    const t = setTimeout(() => {
      setMatchResult(null)
      setClockResult(null)
      setErrorMsg(null)
      setState(STATES.IDLE)
    }, REJECTED_DURATION)
    return () => clearTimeout(t)
  }, [state])

  // LOADING screen
  if (state === STATES.LOADING && !errorMsg) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
        <div className="text-center">
          <Loader2 className="w-14 h-14 text-[var(--color-primary)] animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading facial recognition...</p>
          {branchCode && <p className="text-gray-600 text-sm mt-2">Branch: {branchCode}</p>}
        </div>
      </div>
    )
  }

  // ERROR screen
  if (state === STATES.ERROR || modelError) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center p-6" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
        <div className="text-center max-w-md">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <p className="text-white font-semibold text-xl mb-3">Kiosk Error</p>
          <p className="text-gray-400 text-base whitespace-pre-line">{modelError || errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1A1A1A]/90 border-b border-[#2A2A2A] backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[var(--color-primary)]" />
          <p className="text-white font-semibold text-base">{branch?.name || branchCode}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-mono text-lg">{formatTime(currentTime)}</p>
        </div>
      </div>

      {/* Camera feed */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />

        {/* IDLE overlay */}
        {state === STATES.IDLE && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-56 h-72 border-2 border-dashed border-white/30 rounded-[50%] mx-auto mb-4" />
              <p className="text-white/70 text-base">Stand in front of camera</p>
            </div>
          </div>
        )}

        {/* DETECTING overlay */}
        {state === STATES.DETECTING && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="text-center">
              <Scan className="w-14 h-14 text-[var(--color-primary)] mx-auto mb-3 animate-pulse" />
              <p className="text-white font-semibold text-lg">Face Detected</p>
              <p className="text-white/70 text-sm">Hold still...</p>
            </div>
          </div>
        )}

        {/* LIVENESS overlay */}
        {state === STATES.LIVENESS && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-[#1A1A1A]/90 rounded-2xl p-8 text-center mx-4 max-w-sm border border-[#2A2A2A]">
              <ShieldCheck className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-3" />
              <p className="text-white font-semibold text-xl mb-2">Liveness Check</p>
              {livenessStep === 'blink' ? (
                <p className="text-gray-300 text-lg">Please <span className="text-[var(--color-primary)] font-medium">blink your eyes</span></p>
              ) : (
                <p className="text-gray-300 text-lg">Please turn your head <span className="text-[var(--color-primary)] font-medium">{turnDirection}</span></p>
              )}
            </div>
          </div>
        )}

        {/* MATCHING overlay */}
        {state === STATES.MATCHING && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin mx-auto mb-3" />
              <p className="text-white font-semibold text-lg">Verifying identity...</p>
              <p className="text-white/60 text-sm mt-1">Look straight at the camera</p>
            </div>
          </div>
        )}

        {/* GREETING / CONFIRMED overlay */}
        {(state === STATES.GREETING || state === STATES.CONFIRMED) && matchResult && clockResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-[#1A1A1A]/95 rounded-2xl p-8 text-center mx-4 max-w-md border border-green-500/30">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                {matchResult.barber_avatar ? (
                  <img src={matchResult.barber_avatar} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <Check className="w-10 h-10 text-green-500" />
                )}
              </div>
              <p className="text-white font-semibold text-2xl mb-1">
                {clockResult.action === 'clock_in' ? 'Good morning' : 'Goodbye'}, {matchResult.barber_name}!
              </p>
              <p className="text-gray-400 text-base mb-3">
                {clockResult.action === 'clock_in'
                  ? `Clocked in at ${formatTime(new Date(clockResult.clockInTime))}`
                  : `Clocked out. Shift: ${formatDuration(clockResult.shiftDuration)}`
                }
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-400 text-xs font-medium">
                  {clockResult.autoApproved ? 'Auto-approved' : 'Pending review'}
                </span>
              </div>
              {state === STATES.CONFIRMED && (
                <p className="text-gray-600 text-xs mt-3">Returning to idle...</p>
              )}
            </div>
          </div>
        )}

        {/* LOW_CONFIDENCE overlay */}
        {state === STATES.LOW_CONFIDENCE && matchResult && clockResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-[#1A1A1A]/95 rounded-2xl p-8 text-center mx-4 max-w-md border border-amber-500/30">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <p className="text-white font-semibold text-xl mb-1">
                {clockResult.action === 'clock_in' ? 'Clocked In' : 'Clocked Out'}, {matchResult.barber_name}
              </p>
              <p className="text-gray-400 text-sm mb-3">
                {clockResult.action === 'clock_in'
                  ? `At ${formatTime(new Date(clockResult.clockInTime))}`
                  : `Shift: ${formatDuration(clockResult.shiftDuration)}`
                }
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-400 text-xs font-medium">Pending admin review</span>
              </div>
              <p className="text-gray-600 text-xs mt-3">Returning to idle...</p>
            </div>
          </div>
        )}

        {/* REJECTED overlay */}
        {state === STATES.REJECTED && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-[#1A1A1A]/95 rounded-2xl p-8 text-center mx-4 max-w-md border border-red-500/30">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <p className="text-white font-semibold text-xl mb-2">
                {errorMsg || 'Face not recognized'}
              </p>
              <p className="text-gray-400 text-sm">
                Please contact your manager if you need assistance.
              </p>
              <p className="text-gray-600 text-xs mt-3">Returning to idle...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1A1A1A]/90 border-t border-[#2A2A2A] backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${state === STATES.IDLE ? 'bg-green-500' : state === STATES.ERROR ? 'bg-red-500' : 'bg-amber-500'}`} />
          <p className="text-gray-500 text-xs">
            {state === STATES.IDLE ? 'Ready — Scanning' : state === STATES.ERROR ? 'Error' : 'Processing'}
          </p>
        </div>
        <p className="text-gray-600 text-xs">
          {videoSourceConfig.current.type !== 'browser' && `Source: ${videoSourceConfig.current.type} · `}
          Enrolled: {enrollments?.length ?? 0}
        </p>
      </div>
    </div>
  )
}

export default function AttendanceKiosk() {
  const branchCode = new URLSearchParams(window.location.search).get('branch')
  return (
    <BrandingProvider branchCode={branchCode || undefined}>
      <AttendanceKioskInner />
    </BrandingProvider>
  )
}
