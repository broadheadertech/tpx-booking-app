import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useFaceDetection } from '../../hooks/useFaceDetection'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { Camera, Check, X, AlertCircle, Loader2, ArrowLeft, Clock, Scan, ShieldCheck, UserX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATES = {
  LOADING: 'loading',
  IDLE: 'idle',
  DETECTING: 'detecting',
  LIVENESS: 'liveness',
  MATCHING: 'matching',
  GREETING: 'greeting',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  MANUAL: 'manual',
}

const FaceCheckIn = () => {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const branchId = user?.branch_id

  const [state, setState] = useState(STATES.LOADING)
  const [matchResult, setMatchResult] = useState(null) // { barber_id, barber_name, confidence, ... }
  const [clockResult, setClockResult] = useState(null) // { status, clockInTime, ... }
  const [livenessStep, setLivenessStep] = useState('blink') // blink | turn
  const [turnDirection, setTurnDirection] = useState('left')
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const loopRef = useRef(null)
  const stableCountRef = useRef(0)
  const livenessTimeoutRef = useRef(null)
  const confirmTimeoutRef = useRef(null)

  const {
    videoRef, isLoading, error: modelError,
    startCamera, stopCamera, detectFace, findBestMatch,
    capturePhoto, checkBlink, checkHeadTurn, resetLiveness,
  } = useFaceDetection()

  // Queries
  const enrollments = useQuery(api.services.faceAttendance.getEnrollmentsByBranch, branchId ? { branch_id: branchId } : 'skip')
  const config = useQuery(api.services.faceAttendance.getAttendanceConfig, branchId ? { branch_id: branchId } : 'skip')
  const barberStatuses = useQuery(api.services.timeAttendance.getBarberStatusForBranch, branchId ? { branch_id: branchId } : 'skip')

  // Mutations
  const clockInFR = useMutation(api.services.faceAttendance.clockInWithFR)
  const clockOutFR = useMutation(api.services.faceAttendance.clockOutWithFR)
  const generateUploadUrl = useMutation(api.services.faceAttendance.generateUploadUrl)
  const clockInManual = useMutation(api.services.faceAttendance.clockInManualFallback)

  // Clock update
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Initialize camera when models load
  useEffect(() => {
    if (!isLoading && !modelError && branchId) {
      startCamera().then((ok) => {
        if (ok) setState(STATES.IDLE)
      })
    }
    return () => {
      stopCamera()
      if (loopRef.current) cancelAnimationFrame(loopRef.current)
      if (livenessTimeoutRef.current) clearTimeout(livenessTimeoutRef.current)
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    }
  }, [isLoading, modelError, branchId])

  // IDLE: background face detection loop
  useEffect(() => {
    if (state !== STATES.IDLE || !enrollments) return

    stableCountRef.current = 0

    const loop = async () => {
      const result = await detectFace()
      if (result && result.score > 0.7) {
        stableCountRef.current++
        if (stableCountRef.current >= 3) {
          setState(STATES.DETECTING)
          return
        }
      } else {
        stableCountRef.current = 0
      }
      loopRef.current = setTimeout(loop, 500) // ~2 FPS
    }

    loop()
    return () => { if (loopRef.current) clearTimeout(loopRef.current) }
  }, [state, enrollments, detectFace])

  // DETECTING: stable face detection for 1 second
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

  // LIVENESS: blink + head turn checks
  useEffect(() => {
    if (state !== STATES.LIVENESS) return

    // 20-second timeout for both blink + turn
    livenessTimeoutRef.current = setTimeout(() => {
      setError('Liveness check timed out. Please try again.')
      setState(STATES.IDLE)
    }, 20000)

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

  // MATCHING: extract descriptor + find best match (multiple attempts)
  useEffect(() => {
    if (state !== STATES.MATCHING || !enrollments) return

    const match = async () => {
      // Wait briefly for user to return to neutral position after liveness
      await new Promise((r) => setTimeout(r, 800))

      // Take multiple detection attempts and use the best match
      const MAX_ATTEMPTS = 5
      let overallBest = null

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const result = await detectFace()
        if (!result) {
          await new Promise((r) => setTimeout(r, 300))
          continue
        }

        const candidate = findBestMatch(result.descriptor, enrollments)
        if (candidate) {
          console.log(`[FaceCheckIn] Attempt ${i + 1}: matched ${candidate.barber_name}, distance=${candidate.distance.toFixed(3)}, confidence=${(candidate.confidence * 100).toFixed(1)}%`)
          if (!overallBest || candidate.confidence > overallBest.confidence) {
            overallBest = candidate
          }
        } else {
          console.log(`[FaceCheckIn] Attempt ${i + 1}: no match candidate`)
        }

        // Short delay between attempts
        if (i < MAX_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 400))
      }

      if (!overallBest) {
        console.log('[FaceCheckIn] No face detected across all attempts')
        setError('No face detected during matching.')
        setState(STATES.IDLE)
        return
      }

      // Standard face-api.js match: distance < 0.6 = confidence 0.50
      // Use admin_review_threshold from config (default 0.50 = distance 0.6)
      const matchThreshold = config?.admin_review_threshold ?? 0.50
      console.log(`[FaceCheckIn] Best match: ${overallBest.barber_name}, confidence=${(overallBest.confidence * 100).toFixed(1)}%, threshold=${(matchThreshold * 100).toFixed(1)}%`)

      if (overallBest.confidence < matchThreshold) {
        console.log('[FaceCheckIn] REJECTED — below threshold')
        setState(STATES.REJECTED)
        return
      }

      const best = overallBest

      setMatchResult(best)

      // Upload photo
      try {
        const blob = await capturePhoto()
        const uploadUrl = await generateUploadUrl()
        const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
        const { storageId } = await res.json()

        // Check if person is currently clocked in
        const personStatus = barberStatuses?.find((b) =>
          best.barber_id ? b.barber_id === best.barber_id : b.user_id === best.user_id
        )
        const isClockedIn = personStatus?.isClockedIn

        // Build polymorphic ID args
        const idArgs = best.barber_id
          ? { barber_id: best.barber_id }
          : { user_id: best.user_id }

        if (isClockedIn) {
          // Clock out
          const result = await clockOutFR({
            ...idArgs,
            confidence_score: best.confidence,
            photo_storage_id: storageId,
            liveness_passed: true,
          })
          setClockResult({ ...result, action: 'clock_out', barberName: best.barber_name })
        } else {
          // Clock in
          const result = await clockInFR({
            ...idArgs,
            branch_id: branchId,
            confidence_score: best.confidence,
            photo_storage_id: storageId,
            liveness_passed: true,
          })
          setClockResult({ ...result, action: 'clock_in', barberName: best.barber_name })
        }

        setState(STATES.GREETING)
      } catch (err) {
        setError(err.data?.message || err.message || 'Clock-in failed')
        setState(STATES.REJECTED)
      }
    }

    match()
  }, [state, enrollments, config, barberStatuses, branchId])

  // GREETING → CONFIRMED after 2 sec
  useEffect(() => {
    if (state !== STATES.GREETING) return
    confirmTimeoutRef.current = setTimeout(() => setState(STATES.CONFIRMED), 2000)
    return () => { if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current) }
  }, [state])

  // CONFIRMED → IDLE after 4 sec
  useEffect(() => {
    if (state !== STATES.CONFIRMED) return
    const t = setTimeout(() => {
      setMatchResult(null)
      setClockResult(null)
      setError(null)
      setState(STATES.IDLE)
    }, 4000)
    return () => clearTimeout(t)
  }, [state])

  // REJECTED → IDLE after 8 sec
  useEffect(() => {
    if (state !== STATES.REJECTED) return
    const t = setTimeout(() => {
      setMatchResult(null)
      setError(null)
      setState(STATES.IDLE)
    }, 8000)
    return () => clearTimeout(t)
  }, [state])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  }

  const formatDuration = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  // Loading / error states
  if (isLoading || !branchId) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading facial recognition...</p>
        </div>
      </div>
    )
  }

  if (modelError) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Failed to Load</p>
          <p className="text-gray-400 mb-4">{modelError}</p>
          <button onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl bg-[#2A2A2A] text-white">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#2A2A2A] text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-white font-medium text-sm">Face Attendance</p>
          <p className="text-gray-500 text-xs">{formatTime(currentTime)}</p>
        </div>
        <div className="w-9" />
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

        {/* State overlays */}
        {state === STATES.IDLE && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-56 h-72 border-2 border-dashed border-white/30 rounded-[50%] mx-auto mb-4" />
              <p className="text-white/70 text-sm">Position your face in the oval</p>
            </div>
          </div>
        )}

        {state === STATES.DETECTING && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="text-center">
              <Scan className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-3 animate-pulse" />
              <p className="text-white font-medium">Face Detected</p>
              <p className="text-white/70 text-sm">Hold still...</p>
            </div>
          </div>
        )}

        {state === STATES.LIVENESS && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-[#1A1A1A]/90 rounded-2xl p-6 text-center mx-4 max-w-sm border border-[#2A2A2A]">
              <ShieldCheck className="w-10 h-10 text-[var(--color-primary)] mx-auto mb-3" />
              <p className="text-white font-semibold text-lg mb-1">Liveness Check</p>
              {livenessStep === 'blink' ? (
                <p className="text-gray-300">Please <span className="text-[var(--color-primary)] font-medium">blink your eyes</span></p>
              ) : (
                <p className="text-gray-300">Please turn your head <span className="text-[var(--color-primary)] font-medium">{turnDirection}</span></p>
              )}
            </div>
          </div>
        )}

        {state === STATES.MATCHING && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mx-auto mb-3" />
              <p className="text-white font-medium">Verifying identity...</p>
              <p className="text-white/60 text-sm mt-1">Look straight at the camera</p>
            </div>
          </div>
        )}

        {(state === STATES.GREETING || state === STATES.CONFIRMED) && matchResult && clockResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-[#1A1A1A]/95 rounded-2xl p-8 text-center mx-4 max-w-sm border border-green-500/30">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-white font-semibold text-xl mb-1">
                {clockResult.action === 'clock_in' ? 'Good morning' : 'Goodbye'}, {matchResult.barber_name}!
              </p>
              <p className="text-gray-400 text-sm mb-3">
                {clockResult.action === 'clock_in'
                  ? `Clocked in at ${formatTime(new Date(clockResult.clockInTime))}`
                  : `Clocked out. Shift: ${formatDuration(clockResult.shiftDuration)}`
                }
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  clockResult.autoApproved ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {clockResult.autoApproved ? 'Auto-approved' : 'Pending review'}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                  {Math.round(matchResult.confidence * 100)}% match
                </span>
              </div>
              {state === STATES.CONFIRMED && (
                <p className="text-gray-500 text-xs mt-4">Returning to idle...</p>
              )}
            </div>
          </div>
        )}

        {state === STATES.REJECTED && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-[#1A1A1A]/95 rounded-2xl p-8 text-center mx-4 max-w-sm border border-red-500/30">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <UserX className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-white font-semibold text-lg mb-1">Could Not Verify</p>
              <p className="text-gray-400 text-sm mb-4">
                {error || 'Face not recognized. Please try again or use manual check-in.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setError(null); setMatchResult(null); setState(STATES.IDLE) }}
                  className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-white font-medium hover:bg-[#2A2A2A]"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setState(STATES.MANUAL)}
                  className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-500"
                >
                  Manual
                </button>
              </div>
            </div>
          </div>
        )}

        {state === STATES.MANUAL && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <ManualFallback
              branchId={branchId}
              barberStatuses={barberStatuses}
              onDone={() => { setState(STATES.CONFIRMED); setClockResult({ action: 'clock_in', autoApproved: false }) }}
              onCancel={() => setState(STATES.IDLE)}
              clockInManual={clockInManual}
              generateUploadUrl={generateUploadUrl}
              capturePhoto={capturePhoto}
            />
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="px-4 py-3 bg-[#1A1A1A] border-t border-[#2A2A2A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${state === STATES.IDLE ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-gray-400 text-xs">
            {state === STATES.IDLE && 'Ready — Waiting for face'}
            {state === STATES.DETECTING && 'Face detected...'}
            {state === STATES.LIVENESS && 'Liveness check...'}
            {state === STATES.MATCHING && 'Matching...'}
            {state === STATES.GREETING && 'Welcome!'}
            {state === STATES.CONFIRMED && 'Recorded'}
            {state === STATES.REJECTED && 'Not recognized'}
            {state === STATES.MANUAL && 'Manual mode'}
          </span>
        </div>
        <span className="text-gray-500 text-xs">
          {enrollments?.length ?? 0} enrolled
        </span>
      </div>
    </div>
  )
}

/** Manual fallback: select barber/staff from list + capture photo */
const ManualFallback = ({ branchId, barberStatuses, onDone, onCancel, clockInManual, generateUploadUrl, capturePhoto }) => {
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedPerson) return
    setSubmitting(true)
    try {
      const blob = await capturePhoto()
      let storageId = undefined
      if (blob) {
        const url = await generateUploadUrl()
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
        const data = await res.json()
        storageId = data.storageId
      }

      const idArgs = selectedPerson.barber_id
        ? { barber_id: selectedPerson.barber_id }
        : { user_id: selectedPerson.user_id }

      await clockInManual({
        ...idArgs,
        branch_id: branchId,
        photo_storage_id: storageId,
      })
      onDone()
    } catch (err) {
      alert(err.data?.message || err.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const personKey = (p) => p.barber_id || p.user_id

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] mx-4 p-5 max-w-sm w-full max-h-[70vh] flex flex-col">
      <h3 className="text-white font-semibold mb-3">Manual Clock-In</h3>
      <p className="text-gray-400 text-sm mb-3">Select your name:</p>

      <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
        {barberStatuses?.filter((b) => !b.isClockedIn).map((person) => (
          <button
            key={personKey(person)}
            onClick={() => setSelectedPerson(person)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
              selectedPerson && personKey(selectedPerson) === personKey(person)
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A]'
            }`}
          >
            {person.barber_name}
            {person.person_type === 'staff' && (
              <span className="ml-2 text-[10px] text-blue-300 opacity-70">(Staff)</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#2A2A2A] text-gray-400 text-sm">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedPerson || submitting}
          className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Clock In (Pending)'}
        </button>
      </div>
    </div>
  )
}

export default FaceCheckIn
