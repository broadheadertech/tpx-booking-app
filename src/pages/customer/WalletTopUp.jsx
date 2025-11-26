import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wallet as WalletIcon, CreditCard, Smartphone } from 'lucide-react'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/ToastNotification'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function WalletTopUp() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { branding } = useBranding()
  
  // Branding colors with fallbacks
  const primaryColor = branding?.primary_color || '#F68B24'
  const accentColor = branding?.accent_color || '#E67E22'
  const bgColor = branding?.bg_color || '#0A0A0A'
  const mutedColor = branding?.muted_color || '#6B7280'
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('gcash')
  const [loading, setLoading] = useState(false)
  const [card, setCard] = useState({
    name: '',
    number: '',
    expMonth: '',
    expYear: '',
    cvc: ''
  })

  const createSource = useAction(api.services.paymongo.createEwalletSource)
  const attachCard = useAction(api.services.paymongo.createCardPaymentIntentAndAttach)

  const presets = [100, 200, 500, 1000]

  const handleContinue = async () => {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      toast.error('Invalid amount', 'Please enter an amount greater than ₱0')
      return
    }

    // Check if user is authenticated
    if (!user?._id) {
      toast.error('Authentication required', 'Please log in to top up your wallet')
      navigate('/auth/login')
      return
    }

    setLoading(true)
    try {
      // Get current origin (domain) for redirect URLs
      const origin = window.location.origin
      
      if (method === 'gcash' || method === 'paymaya') {
        const res = await createSource({ 
          amount: value, 
          type: method, 
          description: 'Wallet Top-up', 
          userId: user._id,
          origin // Pass the current domain
        })
        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl
        } else {
          toast.error('Unable to start payment', 'No checkout URL returned')
        }
      } else if (method === 'card') {
        const pub = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY
        if (!pub) {
          toast.error('Missing configuration', 'PAYMONGO public key is not set')
          return
        }

        const pmRes = await fetch('https://api.paymongo.com/v1/payment_methods', {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + btoa(pub + ':'),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              attributes: {
                type: 'card',
                details: {
                  card_number: card.number.replace(/\s+/g, ''),
                  exp_month: parseInt(card.expMonth || '0'),
                  exp_year: parseInt(card.expYear || '0'),
                  cvc: card.cvc
                },
                billing: { name: card.name }
              }
            }
          })
        })
        const pmData = await pmRes.json()
        if (!pmRes.ok) {
          const msg = pmData?.errors?.[0]?.detail || 'Failed to create payment method'
          toast.error('Card error', msg)
          return
        }

        const paymentMethodId = pmData.data.id
        const result = await attachCard({ 
          amount: value, 
          paymentMethodId, 
          userId: user._id,
          origin // Pass the current domain
        })
        if (result?.status === 'succeeded') {
          toast.success('Top-up successful', `₱${value.toLocaleString()} added to wallet`)
          navigate('/customer/wallet')
        } else if (result?.nextAction?.type === 'redirect') {
          window.location.href = result.nextAction.redirect?.url || '/booking/payment/success'
        } else {
          toast.info('Payment processing', 'Please follow any additional steps')
        }
      }
    } catch (err) {
      toast.error('Payment failed', err?.message || 'Please try again')
    } finally {
      setLoading(false)
    }
  }

  // Input focus style helper
  const inputFocusStyle = {
    '--tw-ring-color': primaryColor,
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <div className="sticky top-0 z-40 backdrop-blur-2xl border-b border-[#1A1A1A]" style={{ backgroundColor: `${bgColor}f8` }}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-5">
            <button 
              onClick={() => navigate('/customer/wallet')} 
              className="flex items-center space-x-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 rounded-2xl border border-[#2A2A2A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${accentColor})` }}
              >
                <WalletIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-black text-white">Add Funds</h1>
            </div>
            <div className="w-[72px]" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="rounded-[28px] border border-[#1A1A1A] p-6" style={{ backgroundColor: bgColor }}>
          <div className="mb-3">
            <img src="/wallet/PayMongo_Logo.svg.png" alt="PayMongo" className="h-8 object-contain opacity-90" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: mutedColor }}>Amount</div>
          <div className="space-y-3">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor }}
              onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}`}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
            <div className="grid grid-cols-4 gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  className="px-3 py-2 rounded-xl bg-[#121212] border text-white text-sm active:scale-95 transition-all"
                  style={{ borderColor: amount === String(p) ? primaryColor : '#2A2A2A' }}
                  onMouseEnter={(e) => e.target.style.borderColor = `${primaryColor}66`}
                  onMouseLeave={(e) => e.target.style.borderColor = amount === String(p) ? primaryColor : '#2A2A2A'}
                >
                  ₱{p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#1A1A1A] p-6" style={{ backgroundColor: bgColor }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: mutedColor }}>Payment Method</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button 
              onClick={() => setMethod('gcash')} 
              className="px-3 py-2 rounded-xl border text-sm bg-[#121212] active:scale-95 transition-all"
              style={{ 
                borderColor: method === 'gcash' ? primaryColor : '#2A2A2A',
                color: method === 'gcash' ? 'white' : '#D1D5DB'
              }}
            >
              GCash
            </button>
            <button 
              onClick={() => setMethod('paymaya')} 
              className="px-3 py-2 rounded-xl border text-sm bg-[#121212] active:scale-95 transition-all"
              style={{ 
                borderColor: method === 'paymaya' ? primaryColor : '#2A2A2A',
                color: method === 'paymaya' ? 'white' : '#D1D5DB'
              }}
            >
              Maya
            </button>
            <button 
              onClick={() => setMethod('card')} 
              className="px-3 py-2 rounded-xl border text-sm bg-[#121212] active:scale-95 transition-all"
              style={{ 
                borderColor: method === 'card' ? primaryColor : '#2A2A2A',
                color: method === 'card' ? 'white' : '#D1D5DB'
              }}
            >
              Card
            </button>
          </div>

          {method === 'card' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <input 
                  value={card.name} 
                  onChange={(e) => setCard({...card, name: e.target.value})} 
                  placeholder="Name on card" 
                  className="px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none"
                  onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}`}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
                <input 
                  value={card.number} 
                  onChange={(e) => setCard({...card, number: e.target.value})} 
                  placeholder="Card number" 
                  className="px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none"
                  onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}`}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    value={card.expMonth} 
                    onChange={(e) => setCard({...card, expMonth: e.target.value})} 
                    placeholder="MM" 
                    className="px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none"
                    onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}`}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  />
                  <input 
                    value={card.expYear} 
                    onChange={(e) => setCard({...card, expYear: e.target.value})} 
                    placeholder="YYYY" 
                    className="px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none"
                    onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}`}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  />
                  <input 
                    value={card.cvc} 
                    onChange={(e) => setCard({...card, cvc: e.target.value})} 
                    placeholder="CVC" 
                    className="px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none"
                    onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}`}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  />
                </div>
              </div>
              <p className="text-xs" style={{ color: mutedColor }}>Card details are sent securely to PayMongo using your public key.</p>
            </div>
          )}
        </div>

        <button 
          onClick={handleContinue} 
          disabled={loading} 
          className="w-full py-3 px-4 rounded-xl font-bold text-white active:scale-95 transition-all disabled:opacity-50"
          style={{ 
            backgroundColor: primaryColor,
            boxShadow: `0 10px 25px -5px ${primaryColor}33`
          }}
          onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = accentColor)}
          onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = primaryColor)}
        >
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

export default WalletTopUp