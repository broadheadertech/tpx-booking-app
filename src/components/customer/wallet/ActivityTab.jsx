import { useState } from 'react'
import { Clock, Banknote, CreditCard, Download, Gift, Filter, ChevronDown } from 'lucide-react'

/**
 * ActivityTab - Full transaction history view
 *
 * Contains:
 * - Filter options (All, Top-ups, Payments, Refunds)
 * - Complete transaction list
 * - Transaction details
 */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'topup', label: 'Top-ups' },
  { id: 'payment', label: 'Payments' },
  { id: 'refund', label: 'Refunds' }
]

function ActivityTab({ user, transactions }) {
  const [activeFilter, setActiveFilter] = useState('all')

  const iconForTx = (type) => {
    if (type === 'topup' || type === 'Top-up') return Banknote
    if (type === 'Payment' || type === 'payment') return CreditCard
    if (type === 'Refund' || type === 'refund') return Download
    return CreditCard
  }

  // Filter transactions
  const filteredTxs = transactions?.filter(t => {
    if (activeFilter === 'all') return true
    const txType = t.type?.toLowerCase()
    if (activeFilter === 'topup') return txType === 'topup' || txType === 'top-up'
    if (activeFilter === 'payment') return txType === 'payment'
    if (activeFilter === 'refund') return txType === 'refund'
    return true
  }) || []

  // Group transactions by date
  const groupedTxs = filteredTxs.reduce((groups, tx) => {
    const date = new Date(tx.createdAt).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(tx)
    return groups
  }, {})

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              activeFilter === filter.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {Object.keys(groupedTxs).length === 0 ? (
        <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-400">No transactions yet</p>
          <p className="text-xs text-gray-500 mt-1">
            {activeFilter === 'all'
              ? 'Your wallet activity will appear here'
              : `No ${activeFilter}s found`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTxs).map(([date, txs]) => (
            <div key={date}>
              {/* Date Header */}
              <p className="text-xs font-semibold text-gray-500 mb-2 px-1">{date}</p>

              {/* Transactions for this date */}
              <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden">
                <div className="divide-y divide-[#2A2A2A]">
                  {txs.map((t) => {
                    const TxIcon = iconForTx(t.type)
                    const isPositive = t.type === 'topup' || t.type === 'refund' || t.type === 'Top-up' || t.type === 'Refund'
                    const displayAmount = typeof t.amount === 'number' ? t.amount : 0
                    const reference = t.payment_id || t.reference_id

                    return (
                      <div key={t._id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isPositive ? 'bg-green-500/20' : 'bg-[#2A2A2A]'
                          }`}>
                            <TxIcon className={`w-5 h-5 ${isPositive ? 'text-green-400' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white capitalize">
                              {t.type === 'topup' ? 'Top Up' : t.type}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(t.createdAt).toLocaleTimeString('en-PH', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {reference && (t.type === 'topup' || t.type === 'Top-up') && (
                              <p className="text-[10px] text-gray-600 font-mono truncate max-w-[140px]" title={reference}>
                                Ref: {reference.slice(-12)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-white'}`}>
                            {isPositive ? '+' : '-'}₱{Math.abs(displayAmount).toLocaleString()}
                          </p>
                          {(t.type === 'topup' || t.type === 'Top-up') && t.bonus_amount > 0 && (
                            <p className="text-xs text-yellow-400 font-medium flex items-center justify-end gap-1">
                              <Gift className="w-3 h-3" />
                              +₱{t.bonus_amount.toLocaleString()} bonus
                            </p>
                          )}
                          <p className={`text-xs font-medium capitalize ${
                            t.status === 'completed' ? 'text-green-400' :
                            t.status === 'pending' ? 'text-[var(--color-primary)]' : 'text-red-400'
                          }`}>
                            {t.status}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {filteredTxs.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] p-4">
          <p className="text-xs text-gray-500 text-center">
            Showing {filteredTxs.length} transaction{filteredTxs.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' && ` (${activeFilter}s only)`}
          </p>
        </div>
      )}
    </div>
  )
}

export default ActivityTab
