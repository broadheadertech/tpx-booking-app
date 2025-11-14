import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet as WalletIcon, ArrowLeft, PlusCircle, CreditCard, Smartphone, Send, Download, Banknote, CheckCircle, Clock, X, Gift } from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

function Wallet() {
  const navigate = useNavigate()
  const [balance, setBalance] = useState(1250)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString('en-PH'))
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [showManageModal, setShowManageModal] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 'pm_card', type: 'Card', label: 'Visa', masked: '•••• 4242' },
    { id: 'pm_gcash', type: 'GCash', label: 'GCash', masked: 'Linked' },
    { id: 'pm_maya', type: 'Maya', label: 'Maya', masked: 'Linked' }
  ])
  const [transactions, setTransactions] = useState([
    { id: 'tx_001', type: 'Top-up', amount: 500, status: 'completed', timestamp: new Date(Date.now() - 3600_000).toLocaleString('en-PH') },
    { id: 'tx_002', type: 'Payment', amount: -250, status: 'completed', timestamp: new Date(Date.now() - 7200_000).toLocaleString('en-PH') },
    { id: 'tx_003', type: 'Refund', amount: 100, status: 'pending', timestamp: new Date(Date.now() - 86400_000).toLocaleString('en-PH') }
  ])

  const iconForMethod = (type) => {
    if (type === 'Card') return CreditCard
    return Smartphone
  }

  const iconForTx = (type) => {
    if (type === 'Top-up') return Banknote
    if (type === 'Payment') return CreditCard
    if (type === 'Refund') return Download
    return Send
  }

  const statusColor = (status) => {
    if (status === 'completed') return 'text-green-400'
    if (status === 'pending') return 'text-amber-400'
    return 'text-red-400'
  }

  const handleConfirmTopUp = () => {
    const amount = parseFloat(topUpAmount)
    if (!isNaN(amount) && amount > 0) {
      setBalance((b) => b + amount)
      setLastUpdated(new Date().toLocaleString('en-PH'))
      const tx = { id: `tx_${Date.now()}`, type: 'Top-up', amount, status: 'completed', timestamp: new Date().toLocaleString('en-PH') }
      setTransactions((list) => [tx, ...list])
      setTopUpAmount('')
      setShowTopUpModal(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center">
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
        <div className="relative overflow-hidden rounded-[28px] bg-[#0A0A0A] border-2 border-[#FF8C42]/40 shadow-2xl">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF8C42]/5 to-transparent pointer-events-none" />
          
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#FF8C42]/10 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#FF7A2B]/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center">
                  <WalletIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-semibold">TipunoX</div>
                  <div className="text-sm text-white font-black">Wallet</div>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[#FF8C42]/10 border border-[#FF8C42]/30 flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-[#FF8C42] animate-pulse" />
                <span className="text-xs font-bold text-[#FF8C42]">Active</span>
              </div>
            </div>
            
            {/* Balance */}
            <div className="mb-6">
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Available Balance</div>
              <div className="text-5xl font-black text-white mb-2">₱{balance.toLocaleString()}</div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Last updated {lastUpdated}</span>
              </div>
            </div>
            
            {/* Points Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF8C42]/20 to-[#FF7A2B]/20 border border-[#FF8C42]/30">
              <div className="text-lg">⭐</div>
              <div className="text-sm font-bold text-white">120 Points</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Modern Design */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => setShowTopUpModal(true)} 
            className="relative overflow-hidden rounded-[20px] bg-[#0A0A0A] border-2 border-[#FF8C42]/40 p-5 active:scale-95 transition-all duration-200 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF8C42]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold text-white">Add Funds</span>
            </div>
          </button>
          
          <button disabled className="rounded-[20px] bg-[#0A0A0A] border border-[#1A1A1A] p-5 opacity-40 cursor-not-allowed">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
                <Download className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs font-bold text-gray-600">Withdraw</span>
            </div>
          </button>
          
          <button disabled className="rounded-[20px] bg-[#0A0A0A] border border-[#1A1A1A] p-5 opacity-40 cursor-not-allowed">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
                <Send className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs font-bold text-gray-600">Transfer</span>
            </div>
          </button>
        </div>

        {/* Payment Methods - Modern Cards */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-black text-white">Payment Methods</h3>
            <button 
              onClick={() => setShowManageModal(true)} 
              className="text-xs font-bold text-[#FF8C42] hover:text-[#FF7A2B] transition-colors"
            >
              Manage →
            </button>
          </div>
          <div className="space-y-3">
            {paymentMethods.map((m) => {
              const Icon = iconForMethod(m.type)
              return (
                <div 
                  key={m.id} 
                  className="relative overflow-hidden rounded-[20px] bg-[#0A0A0A] border border-[#1A1A1A] p-4 hover:border-[#FF8C42]/30 transition-all group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF8C42]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8C42]/20 to-[#FF7A2B]/20 flex items-center justify-center border border-[#FF8C42]/30">
                        <Icon className="w-6 h-6 text-[#FF8C42]" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{m.label}</div>
                        <div className="text-xs text-gray-500">{m.type} • {m.masked}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-semibold text-gray-500">Default</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity - Modern List */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-black text-white">Recent Activity</h3>
            <button className="text-xs font-bold text-[#FF8C42] hover:text-[#FF7A2B] transition-colors">
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="rounded-[20px] bg-[#0A0A0A] border border-[#1A1A1A] p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No transactions yet</p>
                <p className="text-xs text-gray-600 mt-1">Your transaction history will appear here</p>
              </div>
            ) : (
              transactions.map((t) => {
                const TxIcon = iconForTx(t.type)
                const isPositive = t.amount >= 0
                return (
                  <div 
                    key={t.id} 
                    className="relative overflow-hidden rounded-[20px] bg-[#0A0A0A] border border-[#1A1A1A] p-4 hover:border-[#FF8C42]/20 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                          isPositive 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-red-500/10 border-red-500/30'
                        }`}>
                          <TxIcon className={`w-6 h-6 ${isPositive ? 'text-green-400' : 'text-red-400'}`} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{t.type}</div>
                          <div className="text-xs text-gray-500">{t.timestamp}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-base font-black ${isPositive ? 'text-green-400' : 'text-white'}`}>
                          {isPositive ? `+₱${t.amount.toLocaleString()}` : `-₱${Math.abs(t.amount).toLocaleString()}`}
                        </div>
                        <div className={`text-xs font-semibold capitalize ${statusColor(t.status)}`}>
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
          className="w-full rounded-[20px] bg-[#0A0A0A] border-2 border-[#FF8C42]/40 p-5 hover:border-[#FF8C42] active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">My Vouchers</div>
                <div className="text-xs text-gray-500">View and manage rewards</div>
              </div>
            </div>
            <svg className="w-5 h-5 text-[#FF8C42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {showTopUpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTopUpModal(false)}></div>
            <div
              className="relative bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-sm w-full p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="topup-title"
              tabIndex="-1"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 id="topup-title" className="text-white font-semibold">Add Funds</h4>
                <button aria-label="Close modal" onClick={() => setShowTopUpModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <label htmlFor="topup-amount" className="block text-xs font-medium text-gray-400">Amount</label>
                <input
                  id="topup-amount"
                  type="number"
                  min="1"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Enter amount"
                  aria-describedby="topup-help"
                  className="w-full px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                />
                <p id="topup-help" className="text-xs text-gray-500">Minimum ₱1.00</p>
                <Button onClick={handleConfirmTopUp} className="w-full bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white">Confirm</Button>
              </div>
            </div>
          </div>
        )}

        {showManageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowManageModal(false)}></div>
            <div
              className="relative bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-sm w-full p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="manage-title"
              tabIndex="-1"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 id="manage-title" className="text-white font-semibold">Manage Methods</h4>
                <button aria-label="Close modal" onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {paymentMethods.map((m) => {
                  const Icon = iconForMethod(m.type)
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-[#2A2A2A] bg-[#121212]">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-[#FF8C42]" />
                        <div className="text-sm text-white">{m.label} {m.masked}</div>
                      </div>
                      <button disabled className="px-2 py-1 text-xs rounded-lg bg-white/10 text-gray-300 cursor-not-allowed">Edit</button>
                    </div>
                  )
                })}
                <Button onClick={() => setShowManageModal(false)} className="w-full bg-[#1A1A1A] text-white border border-[#2A2A2A] focus:ring-2 focus:ring-[#FF8C42]">Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Wallet
