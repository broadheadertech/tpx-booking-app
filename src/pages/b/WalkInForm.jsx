import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  ArrowLeft,
  Scissors,
  User,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
  Users,
  RotateCcw,
} from 'lucide-react'

function WalkInForm() {
  const { slug } = useParams()

  // Steps: 1=barber, 2=service, 3=info, 4=success
  const [step, setStep] = useState(1)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Resolve slug → branch
  const branch = useQuery(api.services.branchProfile.getBySlug, slug ? { slug } : 'skip')

  // Fetch barbers
  const barbers = useQuery(
    api.services.branchProfile.getBranchBarbers,
    branch?._id ? { branchId: branch._id } : 'skip'
  )

  // Fetch services
  const servicesData = useQuery(
    api.services.branchProfile.getBranchServices,
    branch?._id ? { branchId: branch._id } : 'skip'
  )

  const createWalkIn = useMutation(api.services.walkIn.createWalkIn)

  // Loading state
  if (branch === undefined) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mx-auto" />
          <p className="mt-3 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Branch not found
  if (!branch) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Scissors className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Branch Not Found</h1>
          <p className="text-gray-400 mb-4">This branch doesn't exist or is currently inactive.</p>
          <Link to="/" className="text-[var(--color-primary)] hover:underline text-sm">
            Go to homepage
          </Link>
        </div>
      </div>
    )
  }

  const handleSelectBarber = (barber) => {
    setSelectedBarber(barber)
    setStep(2)
  }

  const handleSelectService = (service) => {
    setSelectedService(service)
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !selectedBarber) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await createWalkIn({
        name: name.trim(),
        number: phone.trim(),
        barberId: selectedBarber._id,
        service_id: selectedService?._id,
      })

      if (res.success) {
        setResult(res)
        setStep(4)
      } else {
        setError(res.message || 'Failed to join queue')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setSelectedBarber(null)
    setSelectedService(null)
    setName('')
    setPhone('')
    setError(null)
    setResult(null)
  }

  const stepLabels = ['Barber', 'Service', 'Info', 'Done']

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step < 4 ? (
                <button
                  onClick={() => step > 1 ? setStep(step - 1) : null}
                  className="p-2 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <Link
                  to={`/b/${slug}`}
                  className="p-2 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              )}
              <div>
                <h1 className="text-lg font-bold text-white">{branch.name}</h1>
                <p className="text-sm text-gray-400">Walk-In</p>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          {step < 4 && (
            <div className="flex items-center gap-2 mt-4">
              {stepLabels.slice(0, 3).map((label, i) => (
                <div key={label} className="flex-1 flex flex-col items-center">
                  <div className={`w-full h-1 rounded-full ${i + 1 <= step ? 'bg-[var(--color-primary)]' : 'bg-[#2A2A2A]'}`} />
                  <span className={`text-[10px] mt-1 ${i + 1 <= step ? 'text-[var(--color-primary)]' : 'text-gray-600'}`}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Step 1: Select Barber */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Choose your barber</h2>
              <p className="text-gray-400 text-sm mt-1">Select who you'd like to be served by</p>
            </div>

            {barbers === undefined ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 text-[var(--color-primary)] animate-spin" />
              </div>
            ) : barbers?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No barbers available right now</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {barbers.map((barber) => (
                  <button
                    key={barber._id}
                    onClick={() => handleSelectBarber(barber)}
                    className={`p-4 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      selectedBarber?._id === barber._id
                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/15 flex items-center justify-center mb-3">
                      {barber.avatar ? (
                        <img src={barber.avatar} alt={barber.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <span className="text-[var(--color-primary)] font-bold text-lg">
                          {barber.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium text-sm truncate">{barber.name}</p>
                    {barber.specialties?.length > 0 && (
                      <p className="text-gray-500 text-xs mt-1 truncate">{barber.specialties.join(', ')}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Service */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Choose a service</h2>
              <p className="text-gray-400 text-sm mt-1">What would you like done today?</p>
            </div>

            {servicesData === undefined ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 text-[var(--color-primary)] animate-spin" />
              </div>
            ) : servicesData?.categories?.length === 0 ? (
              <div className="text-center py-12">
                <Scissors className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No services available</p>
              </div>
            ) : (
              <div className="space-y-5">
                {servicesData.categories.map((category) => (
                  <div key={category}>
                    <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">{category}</h3>
                    <div className="space-y-2">
                      {servicesData.grouped[category].map((service) => (
                        <button
                          key={service._id}
                          onClick={() => handleSelectService(service)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all active:scale-[0.98] ${
                            selectedService?._id === service._id
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]'
                              : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium text-sm">{service.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {service.duration && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {service.duration} min
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[var(--color-primary)] font-bold text-sm">
                              ₱{service.price?.toLocaleString('en-PH')}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Info + Time */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white font-semibold text-lg">Your information</h2>
              <p className="text-gray-400 text-sm mt-1">Enter your details to join the queue</p>
            </div>

            {/* Selected summary */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Barber</span>
                <span className="text-white text-sm font-medium">{selectedBarber?.name}</span>
              </div>
              {selectedService && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Service</span>
                  <span className="text-white text-sm font-medium">{selectedService.name}</span>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XX XXX XXXX"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !phone.trim()}
              className="w-full py-3.5 rounded-xl font-medium text-white bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining queue...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Join Queue
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && result && (
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">You're in the queue!</h2>
              <p className="text-gray-400 mt-2">Your queue number is</p>
            </div>

            <div className="inline-flex items-center justify-center w-24 h-24 bg-[var(--color-primary)]/15 border-2 border-[var(--color-primary)] rounded-2xl">
              <span className="text-4xl font-bold text-[var(--color-primary)]">{result.queueNumber}</span>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 text-left space-y-2 max-w-xs mx-auto">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Name</span>
                <span className="text-white text-sm font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Barber</span>
                <span className="text-white text-sm font-medium">{selectedBarber?.name}</span>
              </div>
              {selectedService && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Service</span>
                  <span className="text-white text-sm font-medium">{selectedService.name}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Link
                to={`/b/${slug}/queue`}
                className="w-full py-3 rounded-xl font-medium text-white bg-[var(--color-primary)] hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Users className="h-4 w-4" />
                View Live Queue
              </Link>

              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl font-medium text-gray-300 bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#222222] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Add Another Walk-In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WalkInForm
