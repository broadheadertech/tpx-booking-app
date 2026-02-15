import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useFaceDetection } from '../../hooks/useFaceDetection'
import { Camera, Check, X, Shield, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'

const CAPTURE_STEPS = [
  { id: 'front', label: 'Look Straight', instruction: 'Look directly at the camera with a neutral expression' },
  { id: 'left', label: 'Slight Left', instruction: 'Turn your head slightly to the left' },
  { id: 'right', label: 'Slight Right', instruction: 'Turn your head slightly to the right' },
  { id: 'up', label: 'Slight Up', instruction: 'Tilt your head slightly upward' },
  { id: 'down', label: 'Slight Down', instruction: 'Tilt your head slightly downward' },
]

const FaceEnrollment = ({ isOpen, onClose, barberId, userId, barberName, branchId }) => {
  const [stage, setStage] = useState('consent') // consent | capturing | processing | confirm | saved
  const [currentStep, setCurrentStep] = useState(0)
  const [captures, setCaptures] = useState([]) // { blob, thumbnail, descriptor }[]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const detectionLoopRef = useRef(null)

  const {
    videoRef, isLoading, error: modelError,
    startCamera, stopCamera, detectFace, checkFaceQuality, capturePhoto,
  } = useFaceDetection()

  const generateUploadUrl = useMutation(api.services.faceAttendance.generateUploadUrl)
  const saveEnrollment = useMutation(api.services.faceAttendance.saveEnrollment)

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      setStage('consent')
      setCurrentStep(0)
      setCaptures([])
      setError(null)
      if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)
    }
  }, [isOpen, stopCamera])

  // Start detection loop during capture
  const startDetectionLoop = useCallback(() => {
    if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)

    const loop = async () => {
      if (stage !== 'capturing') return

      const result = await detectFace()
      if (result) {
        const video = videoRef.current
        const quality = checkFaceQuality(result.detection, video.videoWidth, video.videoHeight)

        if (quality.isGood && result.score > 0.9) {
          // Auto-capture this angle
          const blob = await capturePhoto()
          const thumbnail = URL.createObjectURL(blob)

          setCaptures((prev) => {
            const updated = [...prev, { blob, thumbnail, descriptor: result.descriptor }]

            if (updated.length >= CAPTURE_STEPS.length) {
              // All 5 angles captured
              setStage('confirm')
            } else {
              setCurrentStep(updated.length)
            }

            return updated
          })

          // Pause briefly before next angle
          await new Promise((r) => setTimeout(r, 1000))
        }
      }

      detectionLoopRef.current = requestAnimationFrame(loop)
    }

    detectionLoopRef.current = requestAnimationFrame(loop)
  }, [stage, detectFace, checkFaceQuality, capturePhoto, videoRef])

  const handleConsent = async () => {
    setStage('capturing')
    const ok = await startCamera()
    if (ok) {
      // Small delay to let camera warm up
      setTimeout(() => startDetectionLoop(), 500)
    }
  }

  const handleRetake = () => {
    setCaptures([])
    setCurrentStep(0)
    setStage('capturing')
    startDetectionLoop()
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      // Upload all 5 photos to Convex storage
      const photoStorageIds = []
      for (const capture of captures) {
        const uploadUrl = await generateUploadUrl()
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: capture.blob,
        })
        const { storageId } = await res.json()
        photoStorageIds.push(storageId)
      }

      // Save enrollment with embeddings
      const enrollmentArgs = {
        branch_id: branchId,
        embeddings: captures.map((c) => c.descriptor),
        enrollment_photos: photoStorageIds,
        consent_given: true,
      }
      if (userId) {
        enrollmentArgs.user_id = userId
      } else {
        enrollmentArgs.barber_id = barberId
      }
      await saveEnrollment(enrollmentArgs)

      stopCamera()
      setStage('saved')
    } catch (err) {
      setError(err.message || 'Failed to save enrollment')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <div>
            <h2 className="text-white font-semibold text-lg">Face Enrollment</h2>
            <p className="text-gray-400 text-sm">{barberName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
              <p className="text-gray-400">Loading face detection models...</p>
            </div>
          )}

          {modelError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{modelError}</p>
            </div>
          )}

          {/* CONSENT STAGE */}
          {!isLoading && !modelError && stage === 'consent' && (
            <div className="space-y-4">
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-[var(--color-primary)]" />
                  <h3 className="text-white font-medium">Data Privacy Consent</h3>
                </div>
                <div className="text-gray-400 text-sm space-y-2">
                  <p>By proceeding, you agree that:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>5 photos of your face will be captured from different angles</li>
                    <li>Face embeddings (numerical data) will be stored for attendance verification</li>
                    <li>Photos are stored securely and used only for attendance</li>
                    <li>You can request deletion of your face data at any time</li>
                    <li>Your face data will never be shared with third parties</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleConsent}
                className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                I Agree — Start Enrollment
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CAPTURING STAGE */}
          {stage === 'capturing' && (
            <div className="space-y-4">
              {/* Progress */}
              <div className="flex gap-1.5">
                {CAPTURE_STEPS.map((step, i) => (
                  <div
                    key={step.id}
                    className={`flex-1 h-1.5 rounded-full ${
                      i < currentStep ? 'bg-green-500' : i === currentStep ? 'bg-[var(--color-primary)]' : 'bg-[#2A2A2A]'
                    }`}
                  />
                ))}
              </div>

              {/* Camera feed */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                  playsInline
                  muted
                />
                {/* Oval guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-60 border-2 border-dashed border-[var(--color-primary)]/50 rounded-[50%]" />
                </div>
              </div>

              {/* Instruction */}
              <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl p-3 text-center">
                <p className="text-white font-medium">{CAPTURE_STEPS[currentStep]?.label}</p>
                <p className="text-gray-400 text-sm mt-1">{CAPTURE_STEPS[currentStep]?.instruction}</p>
              </div>

              <p className="text-gray-500 text-xs text-center">
                Photo {currentStep + 1} of {CAPTURE_STEPS.length} — Hold still, auto-capturing...
              </p>
            </div>
          )}

          {/* CONFIRM STAGE */}
          {stage === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-white font-medium">All 5 angles captured!</p>
                <p className="text-gray-400 text-sm">Review the photos below</p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {captures.map((capture, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-[#2A2A2A]">
                    <img src={capture.thumbnail} alt={CAPTURE_STEPS[i]?.label} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-gray-400 font-medium hover:bg-[#2A2A2A] transition-colors"
                >
                  Retake
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-green-500 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          )}

          {/* SAVED STAGE */}
          {stage === 'saved' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Enrollment Complete!</p>
                <p className="text-gray-400 mt-1">{barberName} can now use facial recognition to clock in.</p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FaceEnrollment
