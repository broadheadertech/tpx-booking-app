import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAppModal } from '../../context/AppModalContext'
import Modal from '../common/Modal'
import { FileText, Printer, RefreshCw, AlertTriangle, Lock, Calendar } from 'lucide-react'

/**
 * BIR X / Z Readings for the current branch.
 *  - X-Reading: interim, no reset (live query).
 *  - Z-Reading: end-of-day close — records the period and resets. Confirmed.
 * Both print a 58mm thermal reading slip.
 */
const peso = (v) => `₱${(Number(v) || 0).toFixed(2)}`
const dt = (ts) => (ts ? new Date(ts).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
// Shape a stored z_readings row for the print builders (add type + sub_total).
const mapStoredZ = (z) => ({ ...z, type: 'Z', sub_total: (z.gross_sales || 0) - (z.returns_total || 0) })

const ReadingsModal = ({ isOpen, onClose, branchInfo, staffInfo }) => {
  const { showAlert, showConfirm } = useAppModal()
  const [mode, setMode] = useState('menu') // 'menu' | 'x' | 'zdone' | 'range'
  const [zResult, setZResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const _today = new Date()
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const [startDate, setStartDate] = useState(isoDate(new Date(_today.getFullYear(), _today.getMonth(), 1)))
  const [endDate, setEndDate] = useState(isoDate(_today))

  const xReading = useQuery(
    api.services.posReadings.getXReading,
    isOpen && mode === 'x' && branchInfo?._id ? { branch_id: branchInfo._id } : 'skip'
  )
  const rangeReading = useQuery(
    api.services.posReadings.getRangeReading,
    isOpen && mode === 'range' && branchInfo?._id && startDate && endDate
      ? { branch_id: branchInfo._id, start_date: startDate, end_date: endDate }
      : 'skip'
  )
  const [selectedZ, setSelectedZ] = useState(null)
  const pastZ = useQuery(
    api.services.posReadings.listZReadings,
    isOpen && mode === 'history' && branchInfo?._id ? { branch_id: branchInfo._id, limit: 50 } : 'skip'
  )
  const performZ = useMutation(api.services.posReadings.performZReading)

  const close = () => { setMode('menu'); setZResult(null); setSelectedZ(null); onClose() }

  const handleZ = async () => {
    if (!branchInfo?._id || !staffInfo?._id) return
    const ok = typeof showConfirm === 'function'
      ? await showConfirm({ title: 'Run Z-Reading (close day)?', message: 'This permanently records the day, increments the Z-counter, and resets daily totals. Continue?' })
      : window.confirm('Run Z-Reading? This closes the day and resets daily totals.')
    if (!ok) return
    setBusy(true)
    try {
      const result = await performZ({ branch_id: branchInfo._id, actor_id: staffInfo._id })
      setZResult(result)
      setMode('zdone')
    } catch (e) {
      showAlert({ title: 'Z-Reading failed', message: e?.message || 'Error', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const printReading = (r) => {
    const html = generateReadingHTML(r, branchInfo, staffInfo)
    const w = window.open('', '_blank')
    if (!w) { showAlert({ title: 'Popups Blocked', message: 'Allow popups to print the reading.', type: 'warning' }); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 250)
  }

  const renderReading = (r, title, onBack) => (
    <div className="space-y-3">
      <div className="bg-[#0D0D0D] border border-[#333] rounded-lg p-4 font-mono text-xs text-gray-300 max-h-72 overflow-y-auto whitespace-pre-wrap">
        {readingText(r, branchInfo, staffInfo)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => printReading(r)} className="py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl flex items-center justify-center gap-2">
          <Printer className="w-5 h-5" /> Print {title}
        </button>
        <button onClick={onBack || (() => { setMode('menu'); setZResult(null); setSelectedZ(null) })} className="py-3 border border-[#555] text-gray-300 font-semibold rounded-xl hover:bg-[#2A2A2A]">
          Back
        </button>
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={close} title="BIR Readings (X / Z)" size="md" variant="dark">
      {mode === 'menu' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            <strong className="text-white">X-Reading</strong> shows running sales without resetting — run it anytime.
            <br />
            <strong className="text-white">Z-Reading</strong> closes the day: it permanently records totals, bumps the Z-counter, and resets.
          </p>
          <button onClick={() => setMode('x')} className="w-full flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#333] rounded-xl hover:border-[var(--color-primary)]/40 text-left">
            <FileText className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-white font-semibold">X-Reading</p>
              <p className="text-gray-500 text-xs">Interim report · no reset</p>
            </div>
          </button>
          <button onClick={handleZ} disabled={busy} className="w-full flex items-center gap-3 p-4 bg-[#1A1A1A] border border-amber-500/30 rounded-xl hover:border-amber-500/60 text-left disabled:opacity-50">
            <Lock className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-white font-semibold">{busy ? 'Closing…' : 'Z-Reading (End of Day)'}</p>
              <p className="text-gray-500 text-xs">Records + resets · increments Z-counter</p>
            </div>
          </button>
          <button onClick={() => setMode('range')} className="w-full flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#333] rounded-xl hover:border-[var(--color-primary)]/40 text-left">
            <Calendar className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-white font-semibold">Date-Range Sales Report</p>
              <p className="text-gray-500 text-xs">Summary for any period · no reset</p>
            </div>
          </button>
          <button onClick={() => setMode('history')} className="w-full flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#333] rounded-xl hover:border-[var(--color-primary)]/40 text-left">
            <FileText className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="text-white font-semibold">Past Z-Readings</p>
              <p className="text-gray-500 text-xs">Browse &amp; reprint previous closes</p>
            </div>
          </button>
          <div className="flex items-start gap-2 text-[11px] text-gray-500 pt-1">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Z-Reading is permanent and sequential — only run it at end of day.
          </div>
        </div>
      )}

      {mode === 'x' && (
        xReading === undefined ? (
          <div className="p-10 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-[var(--color-primary)] animate-spin" /></div>
        ) : renderReading(xReading, 'X-Reading')
      )}

      {mode === 'zdone' && zResult && (
        <div className="space-y-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-300 text-sm">
            Z-Reading #{zResult.z_counter} recorded. Day closed.
          </div>
          {renderReading(zResult, 'Z-Reading')}
        </div>
      )}

      {mode === 'range' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-[#333] rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-[#333] rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          </div>
          {rangeReading === undefined ? (
            <div className="p-10 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-[var(--color-primary)] animate-spin" /></div>
          ) : (
            renderReading(rangeReading, 'Report')
          )}
        </div>
      )}

      {mode === 'history' && (
        selectedZ ? (
          renderReading(mapStoredZ(selectedZ), 'Z-Reading', () => setSelectedZ(null))
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Tap a past Z-Reading to view and reprint it.</p>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-[#333] divide-y divide-[#333]">
              {pastZ === undefined ? (
                <div className="p-8 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-[var(--color-primary)] animate-spin" /></div>
              ) : pastZ.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No Z-Readings recorded yet.</div>
              ) : (
                pastZ.map((z) => (
                  <button key={z._id} onClick={() => setSelectedZ(z)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#252525] transition-colors">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">Z #{String(z.z_counter).padStart(8, '0')}</p>
                      <p className="text-gray-500 text-xs truncate">{z.business_date} · {z.transaction_count} txns · {z.performed_by_name || 'Staff'}</p>
                    </div>
                    <span className="text-green-400 text-sm font-semibold flex-shrink-0">{peso(z.gross_sales)}</span>
                  </button>
                ))
              )}
            </div>
            <button onClick={() => setMode('menu')} className="w-full py-3 border border-[#555] text-gray-300 font-semibold rounded-xl hover:bg-[#2A2A2A]">Back</button>
          </div>
        )
      )}
    </Modal>
  )
}

// ── Shared formatting helpers ───────────────────────────────────────────────
const amt = (v) => (Number(v) || 0).toFixed(2)               // BIR Z-reads omit the ₱ sign
const pad8 = (n) => String(Math.max(0, Number(n) || 0)).padStart(8, '0')
const phDate = (ts) => new Date(ts).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: '2-digit', day: '2-digit', year: 'numeric' })
const phTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false })

function readingMeta(r) {
  const isZ = r.type === 'Z'
  const isRange = r.type === 'RANGE'
  return {
    isZ,
    isRange,
    title1: isRange ? 'Sales Report' : isZ ? 'End Of Day Report' : 'Interim Sales Report',
    title2: isRange ? `(${r.range_start} to ${r.range_end})` : isZ ? '(Z-Read)' : '(X-Read)',
    zCounter: pad8(isZ ? r.z_counter : r.next_z_counter),
  }
}

// On-screen monospace preview (the printed slip is generateReadingHTML below).
function readingText(r, branchInfo, staffInfo) {
  const W = 40
  const c = (t) => { const s = String(t ?? ''); return ' '.repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s }
  const lr = (l, rt) => { const a = String(l ?? ''), b = String(rt ?? ''); return a + ' '.repeat(Math.max(1, W - a.length - b.length)) + b }
  const sep = '='.repeat(W), dash = '-'.repeat(W)
  const m = readingMeta(r)
  const L = []
  L.push(c(branchInfo?.business_name || branchInfo?.name || 'Branch'))
  if (branchInfo?.registered_address || branchInfo?.address) L.push(c((branchInfo.registered_address || branchInfo.address).substring(0, W)))
  if (branchInfo?.tin) L.push(c(`${branchInfo?.vat_registered ? 'VAT Registered' : 'NON-VAT'} TIN: ${branchInfo.tin}`))
  if (r.machine_serial || r.machine_min) L.push(c(`SN: ${r.machine_serial || '—'}  MIN: ${r.machine_min || '—'}`))
  L.push('')
  L.push(c(m.title1)); L.push(c(m.title2)); L.push('')
  if (m.isRange) {
    L.push(lr('Period', `${r.range_start} to ${r.range_end}`))
  } else {
    L.push(lr('Reset Counter No.', 'Non-Resettable'))
    L.push(lr('Z-Counter', m.zCounter))
  }
  L.push(lr('Store Code', r.store_code || '—'))
  L.push(lr('Terminal No.', r.terminal_no || '1'))
  L.push(lr('System Log Date', phDate(r.reading_datetime)))
  L.push(lr('Computer Date/Time', `${phDate(r.reading_datetime)} ${phTime(r.reading_datetime)}`))
  L.push(lr('Beginning SI Number', r.beginning_or_number || '—'))
  L.push(lr('Ending SI Number', r.ending_or_number || '—'))
  L.push(lr('Sales Invoice Counter', String(r.transaction_count)))
  L.push(''); L.push(c('TRANSACTION SUMMARY'))
  L.push(lr(`Gross Sales        ${r.transaction_count}`, amt(r.gross_sales)))
  L.push(lr(' Less: Returns', amt(r.returns_total)))
  L.push(dash)
  L.push(lr('Sub-Total:', amt(r.sub_total)))
  L.push(' Less:')
  L.push(lr('  SC Discounts', amt(r.sc_discount)))
  L.push(lr('  PWD Discounts', amt(r.pwd_discount)))
  L.push(lr('  Others (Regular)', amt(r.regular_discount)))
  L.push(lr('  VAT Adjustments', amt(0)))
  L.push(dash)
  L.push(lr('Net Sales:', amt(r.net_sales)))
  L.push(''); L.push(c('TENDER SUMMARY'))
  ;(r.payment_breakdown || []).forEach((p) => L.push(lr(`${p.method.toUpperCase()}        ${p.count}`, amt(p.amount))))
  L.push(dash)
  L.push(lr('Grand Total', amt(r.gross_sales)))
  const dc = r.detail_counts || {}
  L.push(''); L.push(c('TRANSACTION DETAILS'))
  L.push(lr('Sales Transaction Count', String(r.transaction_count)))
  L.push(lr('Items Sold Count', String(r.items_sold_count || 0)))
  L.push(lr('No Sales Transaction', String(dc.no_sale || 0)))
  L.push(lr('Transaction Reprint Count', String(dc.transaction_reprint || 0)))
  L.push(lr('Line Voids Count', String(dc.line_void || 0)))
  L.push(lr('Cancelled Transaction Count', String(dc.cancelled_transaction || 0)))
  L.push(lr('Price Overrides', String(dc.price_override || 0)))
  L.push(lr('SC Transaction Count', String(r.sc_txn_count || 0)))
  L.push(lr('PWD Transaction Count', String(r.pwd_txn_count || 0)))
  L.push(''); L.push(c('VAT COMPUTATIONS'))
  L.push(lr('VATable Sales', amt(r.vatable_sales)))
  L.push(lr('VAT Amount', amt(r.vat_amount)))
  L.push(lr('VAT-Exempt Sales', amt(r.vat_exempt_sales)))
  L.push(lr('Zero-Rated Sales', amt(r.zero_rated_sales)))
  if (!m.isRange) {
    L.push(dash)
    L.push(lr('Accum. Grand Total Beg.', amt(r.accumulated_grand_total_beginning)))
    L.push(lr('Accum. Grand Total End.', amt(r.accumulated_grand_total_ending)))
  }
  L.push(sep)
  if (!r.is_bir_accredited) { L.push(c('*** NOT BIR ACCREDITED ***')); L.push(c('FOR INTERNAL USE ONLY')) }
  L.push(c(`Printed by: ${r.performed_by_name || staffInfo?.username || 'Staff'}`))
  return L.join('\n')
}

function generateReadingHTML(r, branchInfo, staffInfo) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const m = readingMeta(r)
  const dc = r.detail_counts || {}
  const kv = (l, v) => `<tr><td>${esc(l)}</td><td class="r">${esc(v)}</td></tr>`
  const kv3 = (l, c2, v) => `<tr><td>${esc(l)}</td><td class="r" style="padding:1px 2mm;">${esc(c2)}</td><td class="r">${esc(v)}</td></tr>`
  const sectionHead = (t) => `<div class="c b" style="margin:1.5mm 0 0.5mm;">${esc(t)}</div>`
  const pays = (r.payment_breakdown || []).map((p) => kv3(p.method.toUpperCase(), p.count, amt(p.amount))).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${m.title2}</title><style>
    @page { size: 58mm auto; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    html { width:58mm; background:#fff; }
    body { width:48mm; max-width:48mm; margin:0 auto; padding:2mm 1mm; font-family:'Courier New',monospace; font-size:11px; line-height:1.3; color:#000; background:#fff; overflow-wrap:break-word; word-break:break-word; }
    .c { text-align:center; } .b { font-weight:bold; } .r { text-align:right; }
    .line { border-bottom:1px dashed #000; margin:1.2mm 0; }
    .line2 { border-bottom:1px solid #000; margin:1.2mm 0; }
    table { width:100%; border-collapse:collapse; } td { padding:1px 0; vertical-align:top; } td.r { text-align:right; }
  </style></head><body>
    <div class="c b" style="font-size:12px;">${esc(branchInfo?.business_name || branchInfo?.name || 'Branch')}</div>
    ${(branchInfo?.registered_address || branchInfo?.address) ? `<div class="c" style="font-size:10px;">${esc(branchInfo.registered_address || branchInfo.address)}</div>` : ''}
    ${branchInfo?.tin ? `<div class="c" style="font-size:10px;">${branchInfo?.vat_registered ? 'VAT Registered' : 'NON-VAT'} TIN: ${esc(branchInfo.tin)}</div>` : ''}
    ${(r.machine_serial || r.machine_min) ? `<div class="c" style="font-size:10px;">SN: ${esc(r.machine_serial || '—')}  MIN: ${esc(r.machine_min || '—')}</div>` : ''}

    <div class="c b" style="font-size:13px; margin-top:2mm;">${esc(m.title1)}</div>
    <div class="c b" style="font-size:12px;">${esc(m.title2)}</div>
    <div class="line"></div>

    <table>
      ${m.isRange
        ? kv('Period', `${r.range_start} to ${r.range_end}`)
        : kv('Reset Counter No.', 'Non-Resettable') + kv('Z-Counter', m.zCounter)}
      ${kv('Store Code', r.store_code || '—')}
      ${kv('Terminal No.', r.terminal_no || '1')}
      ${kv('System Log Date', phDate(r.reading_datetime))}
      ${kv('Computer Date/Time', `${phDate(r.reading_datetime)} ${phTime(r.reading_datetime)}`)}
      ${kv('Beginning SI Number', r.beginning_or_number || '—')}
      ${kv('Ending SI Number', r.ending_or_number || '—')}
      ${kv('Sales Invoice Counter', String(r.transaction_count))}
    </table>

    ${sectionHead('TRANSACTION SUMMARY')}
    <table>
      ${kv3('Gross Sales', r.transaction_count, amt(r.gross_sales))}
      ${kv(' Less: Returns', amt(r.returns_total))}
    </table>
    <div class="line"></div>
    <table>${kv('Sub-Total:', amt(r.sub_total))}</table>
    <div style="margin-top:0.5mm;"> Less:</div>
    <table>
      ${kv('  SC Discounts', amt(r.sc_discount))}
      ${kv('  PWD Discounts', amt(r.pwd_discount))}
      ${kv('  Others (Regular)', amt(r.regular_discount))}
      ${kv('  VAT Adjustments', amt(0))}
    </table>
    <div class="line"></div>
    <table>${kv('Net Sales:', amt(r.net_sales))}</table>

    ${sectionHead('TENDER SUMMARY')}
    <table>${pays}</table>
    <div class="line"></div>
    <table>${kv('Grand Total', amt(r.gross_sales))}</table>

    ${sectionHead('TRANSACTION DETAILS')}
    <table>
      ${kv('Sales Transaction Count', String(r.transaction_count))}
      ${kv('Items Sold Count', String(r.items_sold_count || 0))}
      ${kv('No Sales Transaction', String(dc.no_sale || 0))}
      ${kv('Transaction Reprint Count', String(dc.transaction_reprint || 0))}
      ${kv('Cash Deposit Reprint Count', String(dc.cash_deposit_reprint || 0))}
      ${kv('Withdrawal Reprint Count', String(dc.withdrawal_reprint || 0))}
      ${kv('Line Voids Count', String(dc.line_void || 0))}
      ${kv('Cancelled Transaction Count', String(dc.cancelled_transaction || 0))}
      ${kv('Price Overrides', String(dc.price_override || 0))}
      ${kv('SC Transaction Count', String(r.sc_txn_count || 0))}
      ${kv('PWD Transaction Count', String(r.pwd_txn_count || 0))}
    </table>

    ${sectionHead('VAT COMPUTATIONS')}
    <table>
      ${kv('VATable Sales', amt(r.vatable_sales))}
      ${kv('VAT Amount', amt(r.vat_amount))}
      ${kv('VAT-Exempt Sales', amt(r.vat_exempt_sales))}
      ${kv('Zero-Rated Sales', amt(r.zero_rated_sales))}
    </table>
    ${!m.isRange ? `
    <div class="line"></div>
    <table>
      ${kv('Accum. Grand Total Beg.', amt(r.accumulated_grand_total_beginning))}
      ${kv('Accum. Grand Total End.', amt(r.accumulated_grand_total_ending))}
    </table>` : ''}
    <div class="line2"></div>
    ${!r.is_bir_accredited ? `<div class="c b" style="font-size:10px;">*** NOT BIR ACCREDITED ***</div><div class="c" style="font-size:9px;">FOR INTERNAL USE ONLY</div>` : ''}
    <div class="c" style="font-size:10px; margin-top:1mm;">Printed by: ${esc(r.performed_by_name || staffInfo?.username || 'Staff')}</div>
  </body></html>`
}

export default ReadingsModal
