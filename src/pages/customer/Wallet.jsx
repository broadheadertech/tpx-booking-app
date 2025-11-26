import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Wallet as WalletIcon, ArrowLeft, PlusCircle, CreditCard, Send, Download, Banknote, CheckCircle, Clock, Gift, Star } from 'lucide-react'
import Button from '../../components/common/Button'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useToast } from '../../components/common/ToastNotification'

function Wallet() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { branding } = useBranding()
  const toast = useToast()
  
  // Branding colors with fallbacks
  const primaryColor = branding?.primary_color || '#F68B24'
  const accentColor = branding?.accent_color || '#E67E22'
  const bgColor = branding?.bg_color || '#0A0A0A'
  const mutedColor = branding?.muted_color || '#6B7280'
  const wallet = useQuery(api.services.wallet.getWallet, user?._id ? { userId: user._id } : 'skip')
  const txs = useQuery(api.services.wallet.listTransactions, user?._id ? { userId: user._id, limit: 50 } : 'skip')
  const ensureWallet = useMutation(api.services.wallet.ensureWallet)
  const finalizeTopUp = useAction(api.services.paymongo.captureSourceAndCreditWallet)

  const iconForTx = (type) => {
    if (type === 'Top-up') return Banknote
    if (type === 'Payment') return CreditCard
    if (type === 'Refund') return Download
    return Send
  }

  // Status colors - using CSS variables for consistency
  const getStatusStyle = (status) => {
    if (status === 'completed') return { color: '#22C55E' } // green
    if (status === 'pending') return { color: primaryColor } // use primary for pending
    return { color: '#EF4444' } // red for failed
  }

  const goToTopUp = () => {
    navigate('/customer/wallet/topup')
  }

  React.useEffect(() => {
    if (user?._id) {
      ensureWallet({ userId: user._id }).catch(() => {})
    }
  }, [user, ensureWallet])

  React.useEffect(() => {
    const topupResult = searchParams.get('topup')
    if (topupResult === 'success' && user?._id && txs) {
      const pendingSources = txs.filter(t => t.status === 'pending' && !!t.source_id)
      pendingSources.forEach(async (t) => {
        try {
          await finalizeTopUp({ sourceId: t.source_id, userId: user._id })
          toast.success('Wallet updated', `Top-up of ₱${t.amount} completed`)
        } catch (e) {}
      })
    }
  }, [searchParams, user, txs, finalizeTopUp, toast])

  return (
    <div className="min-h-screen bg-transparent relative">
      <div className="relative z-10">
        <div className="sticky top-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-2xl border-b border-[#1A1A1A]">
          <div className="max-w-md mx-auto px-4">
            <div className="flex justify-between items-center py-5">
              <button 
                onClick={() => navigate('/customer/dashboard')} 
                className="flex items-center space-x-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 rounded-2xl border border-[#2A2A2A] active:scale-95 transition-all"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Back</span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                  <WalletIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-black text-white">Wallet</h1>
              </div>
              <div className="w-[72px]" />
            </div>
          </div>
        </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Balance Card - Modern Wallet Design */}
        <div 
          className="relative overflow-hidden rounded-[28px] shadow-xl"
          style={{ backgroundColor: bgColor, borderWidth: '2px', borderStyle: 'solid', borderColor: primaryColor }}
        >
          <img
            src="/carousel/IMG_0155-min.JPG"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <img
                  src="/img/tipuno_x_logo_white.avif"
                  alt={branding?.display_name || 'TipunoX'}
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <div className="text-xs font-semibold" style={{ color: mutedColor }}>{branding?.display_name || 'TipunoX'}</div>
                  <div className="text-sm text-white font-black">Wallet</div>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs font-bold text-gray-300">Active</span>
              </div>
            </div>
            
            {/* Balance */}
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>Available Balance</div>
              <div className="text-5xl font-black text-white mb-2">₱{(wallet?.balance || 0).toLocaleString()}</div>
              <div className="flex items-center space-x-2 text-xs" style={{ color: mutedColor }}>
                <Clock className="w-3.5 h-3.5" />
                <span>Last updated {new Date(wallet?.updatedAt || Date.now()).toLocaleString('en-PH')}</span>
              </div>
            </div>
            
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <div className="text-sm font-bold text-white">{user?.nickname || user?.username || 'User'}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={goToTopUp} 
            className="group p-3 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
          >
            <div className="flex flex-col items-center">
              <PlusCircle className="w-6 h-6 text-white" />
              <span className="mt-2 text-xs font-bold text-white">Add Funds</span>
            </div>
          </button>
        </div>

        {/* Payment Methods - Modern Cards */}
        

        {/* Recent Activity - Modern List */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-black text-white">Recent Activity</h3>
            <button 
              className="text-xs font-bold transition-colors"
              style={{ color: primaryColor }}
              onMouseEnter={(e) => e.target.style.color = accentColor}
              onMouseLeave={(e) => e.target.style.color = primaryColor}
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {!txs || txs.length === 0 ? (
              <div className="rounded-[20px] bg-[#0A0A0A] border border-[#1A1A1A] p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No transactions yet</p>
                <p className="text-xs text-gray-600 mt-1">Your transaction history will appear here</p>
              </div>
            ) : (
              txs.map((t) => {
                const TxIcon = iconForTx(t.type === 'topup' ? 'Top-up' : t.type === 'refund' ? 'Refund' : 'Payment')
                const isPositive = t.type === 'topup' || t.amount >= 0
                return (
                  <div 
                    key={t._id} 
                    className="relative overflow-hidden rounded-[20px] p-4 transition-all group"
                    style={{ 
                      backgroundColor: bgColor, 
                      border: '1px solid #1A1A1A',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = `${primaryColor}33`}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <TxIcon className="w-6 h-6 text-white" />
                        <div>
                          <div className="text-sm font-bold text-white">{t.type === 'topup' ? 'Top-up' : t.type}</div>
                          <div className="text-xs" style={{ color: mutedColor }}>{new Date(t.createdAt).toLocaleString('en-PH')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div 
                          className="text-base font-black"
                          style={{ color: isPositive ? '#22C55E' : 'white' }}
                        >
                          {isPositive ? `+₱${t.amount.toLocaleString()}` : `-₱${Math.abs(t.amount).toLocaleString()}`}
                        </div>
                        <div 
                          className="text-xs font-semibold capitalize"
                          style={getStatusStyle(t.status)}
                        >
                          {t.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Vouchers Link */}
        <button 
          onClick={() => navigate('/customer/dashboard')} 
          className="w-full rounded-[20px] bg-[#0A0A0A] border border-[#1A1A1A] p-5 hover:border-white/20 active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">My Vouchers</div>
                <div className="text-xs text-gray-500">View and manage rewards</div>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        
      </div>
      </div>
    </div>
  )
}

export default Wallet
