import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Search, Printer, RefreshCw, Receipt as ReceiptIcon } from 'lucide-react'
import Modal from '../common/Modal'
import ReceiptModal from './ReceiptModal'

/**
 * ReprintReceiptsModal — lists recent transactions for the branch and lets staff
 * re-open any past receipt to print it again. Handy for testing the thermal
 * printer without having to ring up a new sale.
 *
 * Stored transactions already carry the full receipt snapshot (services,
 * products, totals, BIR *_snapshot fields, cash/change, etc.), so we just map a
 * couple of fields and feed it straight into the existing ReceiptModal.
 */
const ReprintReceiptsModal = ({ isOpen, onClose, branchInfo, staffInfo }) => {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const data = useQuery(
    api.services.transactions.getTransactionsByBranch,
    isOpen && branchInfo?._id ? { branch_id: branchInfo._id, limit: 50 } : 'skip'
  )
  const transactions = data?.transactions || []

  const filtered = transactions.filter((t) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (t.receipt_number || '').toLowerCase().includes(q) ||
      (t.transaction_id || '').toLowerCase().includes(q) ||
      (t.customer_name || t.customer_display || '').toLowerCase().includes(q)
    )
  })

  const formatPeso = (v) => `₱${(Number(v) || 0).toFixed(2)}`
  const formatWhen = (ts) =>
    ts
      ? new Date(ts).toLocaleString('en-PH', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—'

  // Map a stored transaction to the shape ReceiptModal expects.
  const toReceiptData = (t) => ({
    ...t,
    timestamp: t._creationTime, // print the ORIGINAL date/time, not now
    customer_name: t.customer_name || t.customer_display || 'Walk-in Customer',
    barber_name: t.barber
      ? t.barber_name
      : t.transaction_type === 'retail'
        ? 'Retail Sale'
        : 'N/A',
  })

  // When a receipt is selected, render the (fixed) ReceiptModal for reprinting.
  // Keep the original cashier on the reprint for BIR accuracy.
  if (selected) {
    return (
      <ReceiptModal
        isOpen={true}
        onClose={() => setSelected(null)}
        transactionData={toReceiptData(selected)}
        branchInfo={branchInfo}
        staffInfo={{ username: selected.processed_by_name || staffInfo?.username || 'Staff' }}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reprint Receipt" size="md" variant="dark">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Select a past transaction to re-open its receipt and print again — useful for testing the thermal printer.
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt # or customer..."
            className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#333] rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto rounded-lg border border-[#333] divide-y divide-[#333]">
          {data === undefined ? (
            <div className="p-8 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              <ReceiptIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              {search ? 'No receipts match your search.' : 'No transactions found for this branch.'}
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t._id}
                onClick={() => setSelected(t)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#252525] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium font-mono truncate">
                    {t.receipt_number || t.transaction_id}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {(t.customer_name || t.customer_display || 'Walk-in Customer')} • {formatWhen(t._creationTime)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-green-400 text-sm font-semibold">{formatPeso(t.total_amount)}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                    <Printer className="w-3.5 h-3.5" />
                    Reprint
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 border border-[#555] text-gray-300 font-semibold rounded-xl hover:bg-[#2A2A2A] hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default ReprintReceiptsModal
