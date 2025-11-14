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
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <button onClick={() => navigate('/customer/dashboard')} className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <WalletIcon className="w-5 h-5 text-white" />
              <h1 className="text-lg font-bold text-white">Wallet</h1>
            </div>
            <div className="w-8" />
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
        <Card className="bg-[#1A1A1A] border border-[#2A2A2A] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Current Balance</div>
              <div className="text-3xl font-bold text-white">₱{balance.toLocaleString()}</div>
              <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                <Clock className="w-3 h-3" />
                <span>Updated {lastUpdated}</span>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-medium">Points 120</div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => setShowTopUpModal(true)} className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white font-bold shadow-lg hover:shadow-xl transition-all">
            <div className="flex flex-col items-center">
              <PlusCircle className="w-6 h-6 mb-1" />
              <span className="text-xs">Add Funds</span>
            </div>
          </button>
          <button disabled className="w-full p-4 rounded-2xl bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A] cursor-not-allowed">
            <Download className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">Withdraw</span>
          </button>
          <button disabled className="w-full p-4 rounded-2xl bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A] cursor-not-allowed">
            <Send className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">Transfer</span>
          </button>
        </div>

        <Card className="bg-[#1A1A1A] border border-[#2A2A2A]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
            <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
            <button onClick={() => setShowManageModal(true)} className="px-3 py-1 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition">Manage</button>
          </div>
          <div className="p-4 space-y-3">
            {paymentMethods.map((m) => {
              const Icon = iconForMethod(m.type)
              return (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-[#2A2A2A] bg-[#121212]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF8C42]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#FF8C42]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{m.label}</div>
                      <div className="text-xs text-gray-400">{m.type} {m.masked}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">Default</div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="bg-[#1A1A1A] border border-[#2A2A2A]">
          <div className="px-4 py-3 border-b border-[#2A2A2A]">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="p-4 space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-6">No recent transactions</div>
            ) : (
              transactions.map((t) => {
                const TxIcon = iconForTx(t.type)
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-[#2A2A2A] bg-[#121212]">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF8C42]/10 flex items-center justify-center">
                        <TxIcon className="w-5 h-5 text-[#FF8C42]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{t.type}</div>
                        <div className="text-xs text-gray-400">{t.timestamp}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-white'}`}>{t.amount >= 0 ? `+₱${t.amount.toLocaleString()}` : `₱${Math.abs(t.amount).toLocaleString()}`}</div>
                      <div className={`text-xs ${statusColor(t.status)}`}>{t.status}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        <button onClick={() => navigate('/customer/dashboard')} className="w-full p-4 rounded-2xl bg-[#1A1A1A] text-white border border-[#2A2A2A] hover:border-[#FF8C42] transition">
          <div className="flex items-center justify-center space-x-2">
            <Gift className="w-5 h-5 text-[#FF8C42]" />
            <span className="text-sm">Manage Vouchers</span>
          </div>
        </button>

        {showTopUpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTopUpModal(false)}></div>
            <div className="relative bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-semibold">Add Funds</h4>
                <button onClick={() => setShowTopUpModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <input type="number" min="1" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="Enter amount" className="w-full px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:border-[#FF8C42]" />
                <Button onClick={handleConfirmTopUp} className="w-full bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white">Confirm</Button>
              </div>
            </div>
          </div>
        )}

        {showManageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowManageModal(false)}></div>
            <div className="relative bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-semibold">Manage Methods</h4>
                <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
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
                <Button onClick={() => setShowManageModal(false)} className="w-full bg-[#1A1A1A] text-white border border-[#2A2A2A]">Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Wallet
