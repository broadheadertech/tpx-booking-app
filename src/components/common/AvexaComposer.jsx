import React, { useState, useRef, useMemo } from 'react'
import { useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Sparkles, Send, RotateCcw, Check, Copy, Lightbulb, Loader2,
  AlertCircle, Wand2, Ticket, Mail, Users, Search, CheckCircle,
  ChevronDown, ChevronUp, UserCheck, QrCode, BookmarkPlus, Clock,
} from 'lucide-react'

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'exciting', label: 'Exciting' },
  { id: 'warm', label: 'Warm' },
]

const MODELS = [
  { id: 'gemini-2.5-flash', label: '2.5 Flash', desc: '5 RPM' },
  { id: 'gemini-2.5-flash-lite', label: '2.5 Lite', desc: '10 RPM' },
  { id: 'gemini-3-flash', label: '3 Flash', desc: '5 RPM' },
]

const AUDIENCES = [
  { id: 'all_customers', label: 'All' },
  { id: 'new_customers', label: 'New' },
  { id: 'returning_customers', label: 'Returning' },
  { id: 'vip_customers', label: 'VIP' },
]

export default function AvexaComposer({
  onApply, brandName, brandColor, businessType, className = '',
  branchId, userId, customers,
  enableVoucher = false, enableSend = false,
  enableSaveTemplate = false, enableDraftSave = false,
}) {
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState('professional')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [applied, setApplied] = useState(false)
  const previewRef = useRef(null)

  // Voucher config (configured BEFORE generation)
  const [includeVoucher, setIncludeVoucher] = useState(false)
  const [voucherForm, setVoucherForm] = useState({
    value: 50, codePrefix: '',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  // Send state
  const [showSend, setShowSend] = useState(false)
  const [sendMode, setSendMode] = useState('audience')
  const [audienceType, setAudienceType] = useState('all_customers')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 })
  const [sendComplete, setSendComplete] = useState(false)

  // Template save state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  const generateEmail = useAction(api.services.avexa.generateEmail)
  const batchCreateVouchers = useMutation(api.services.vouchers.batchCreateVouchers)
  const assignVoucherByCode = useMutation(api.services.vouchers.assignVoucherByCode)
  const sendMarketingEmail = useAction(api.services.resendEmail.sendMarketingEmail)
  const createCampaign = useMutation(api.services.emailMarketing.createCampaign)
  const updateCampaignMut = useMutation(api.services.emailMarketing.updateCampaign)
  const logCampaignSend = useMutation(api.services.emailMarketing.logCampaignSend)
  const saveTemplateMut = useMutation(api.services.emailMarketing.saveTemplate)

  const filterByAudience = (list, audience) => {
    if (!list) return []
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    let filtered = list.filter(c => (c.email || c.customer_email || '').trim())
    if (audience === 'new_customers') filtered = filtered.filter(c => (c.createdAt || c.first_visit_date || 0) > thirtyDaysAgo)
    else if (audience === 'returning_customers') filtered = filtered.filter(c => (c.createdAt || c.first_visit_date || Date.now()) < thirtyDaysAgo)
    else if (audience === 'vip_customers') filtered = filtered.filter(c => (c.total_bookings || 0) >= 5)
    return filtered
  }

  const audienceCounts = useMemo(() => {
    if (!customers) return {}
    return AUDIENCES.reduce((acc, a) => { acc[a.id] = filterByAudience(customers, a.id).length; return acc }, {})
  }, [customers])

  const filteredRecipients = useMemo(() => {
    if (!customers) return []
    let list = customers.filter(c => (c.email || c.customer_email || '').trim())
    if (recipientSearch) {
      const q = recipientSearch.toLowerCase()
      list = list.filter(c => {
        const name = (c.username || c.customer_name || '').toLowerCase()
        const email = (c.email || c.customer_email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    }
    return list
  }, [customers, recipientSearch])

  // Check if generated email has voucher placeholders
  const hasVoucherPlaceholders = result?.body_html?.includes('{{VOUCHER_CODE}}')

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setShowSend(false)
    setSendComplete(false)

    try {
      const res = await generateEmail({
        prompt: prompt.trim(),
        brandName: brandName || undefined,
        brandColor: brandColor || undefined,
        businessType: businessType || undefined,
        tone, model,
        voucherValue: includeVoucher ? Number(voucherForm.value) : undefined,
      })
      setResult(res)
    } catch (err) {
      setError(err.message || 'Failed to generate email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (result && onApply) {
      onApply({ subject: result.subject, body_html: result.body_html })
      setApplied(true)
      setTimeout(() => setApplied(false), 2500)
    }
  }

  const handleCopyHtml = async () => {
    if (!result?.body_html) return
    try {
      await navigator.clipboard.writeText(result.body_html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* */ }
  }

  const handleSaveTemplate = async () => {
    if (!result || !branchId || !userId || !templateName.trim()) return
    setSavingTemplate(true)
    try {
      await saveTemplateMut({
        branch_id: branchId, name: templateName.trim(),
        subject: result.subject, body_html: result.body_html,
        created_by: userId,
      })
      setTemplateSaved(true)
      setShowSaveTemplateModal(false)
      setTemplateName('')
      setTimeout(() => setTemplateSaved(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save template.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!result || !branchId || !userId) return
    setSavingDraft(true)
    try {
      await createCampaign({
        branch_id: branchId, name: `Draft: ${result.subject}`,
        subject: result.subject, body_html: result.body_html,
        audience: 'all_customers', template_type: 'custom', created_by: userId,
      })
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save draft.')
    } finally {
      setSavingDraft(false)
    }
  }

  // Build QR code URL for a voucher
  const buildQrUrl = (code, value) => {
    const payload = JSON.stringify({ code, value, type: 'voucher', brand: brandName || '' })
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(payload)}`
  }

  // Personalize email HTML for a specific recipient's voucher
  const personalizeEmail = (html, voucherCode, voucherValue) => {
    const qrUrl = buildQrUrl(voucherCode, voucherValue)
    return html
      .replace(/\{\{VOUCHER_CODE\}\}/g, voucherCode)
      .replace(/\{\{VOUCHER_QR\}\}/g, qrUrl)
  }

  // ── Send handler with per-recipient unique vouchers ──
  const handleSendEmails = async () => {
    if (!result || !branchId || !userId) return
    const recipients = sendMode === 'audience'
      ? filterByAudience(customers, audienceType)
      : selectedRecipients
    if (recipients.length === 0) return

    setSending(true)
    setSendProgress({ current: 0, total: recipients.length, sent: 0, failed: 0 })
    setError(null)

    try {
      // Step 1: Create batch vouchers if voucher is included
      let voucherCodes = []
      if (includeVoucher && hasVoucherPlaceholders) {
        const expiresAt = new Date(voucherForm.expiresAt).getTime()
        const batchResult = await batchCreateVouchers({
          quantity: recipients.length,
          value: Number(voucherForm.value),
          points_required: 0,
          expires_at: expiresAt,
          description: `Avexa campaign: ${result.subject}`,
          code_prefix: voucherForm.codePrefix || undefined,
          branch_id: branchId,
          created_by: userId,
        })
        voucherCodes = batchResult.vouchers // [{ _id, code }]
      }

      // Step 2: Create campaign record
      const campaignId = await createCampaign({
        branch_id: branchId, name: `Avexa: ${result.subject}`,
        subject: result.subject, body_html: result.body_html,
        audience: sendMode === 'audience' ? audienceType : 'all_customers',
        template_type: 'custom', created_by: userId,
      })
      await updateCampaignMut({ id: campaignId, status: 'sending', total_recipients: recipients.length })

      // Step 3: Send to each recipient with personalized voucher
      let sent = 0, failed = 0
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i]
        const email = r.email || r.customer_email
        const name = r.username || r.customer_name || 'Valued Customer'

        try {
          let emailHtml = result.body_html

          // Personalize with unique voucher code + QR
          if (voucherCodes[i]) {
            const vc = voucherCodes[i]

            // Try to assign voucher to user if they have an ID
            let code = vc.code
            if (r._id) {
              try {
                const assignment = await assignVoucherByCode({
                  code: vc.code, user_id: r._id, assigned_by: userId,
                })
                code = assignment.assignmentCode || vc.code
              } catch {
                // Assignment failed (e.g. user not in users table), use raw code
              }
            }

            emailHtml = personalizeEmail(emailHtml, code, voucherForm.value)
          }

          const res = await sendMarketingEmail({
            to: email, toName: name, subject: result.subject,
            htmlContent: emailHtml, tags: ['avexa-composer'],
          })
          if (res.success) sent++; else failed++
          await logCampaignSend({
            campaign_id: campaignId, recipient_email: email,
            recipient_id: r._id || undefined,
            status: res.success ? 'sent' : 'failed',
            error: res.success ? undefined : res.error,
          })
        } catch (err) {
          failed++
          await logCampaignSend({
            campaign_id: campaignId, recipient_email: email,
            status: 'failed', error: err.message,
          })
        }
        setSendProgress({ current: i + 1, total: recipients.length, sent, failed })
        if (i < recipients.length - 1) await new Promise(r => setTimeout(r, 150))
      }

      await updateCampaignMut({
        id: campaignId, status: 'sent', sent_at: Date.now(),
        sent_count: sent, failed_count: failed,
      })
      setSendComplete(true)
    } catch (err) {
      setError(err.message || 'Failed to send emails')
    } finally {
      setSending(false)
    }
  }

  const toggleRecipient = (customer) => {
    setSelectedRecipients(prev => {
      const id = customer._id
      return prev.find(r => r._id === id) ? prev.filter(r => r._id !== id) : [...prev, customer]
    })
  }

  // Preview HTML with sample voucher code
  const previewHtml = useMemo(() => {
    if (!result?.body_html) return ''
    if (!hasVoucherPlaceholders) return result.body_html
    const sampleCode = voucherForm.codePrefix ? `${voucherForm.codePrefix.toUpperCase()}-XXXXXXXX` : 'XXXXXXXX'
    return personalizeEmail(result.body_html, sampleCode, voucherForm.value)
  }, [result, hasVoucherPlaceholders, voucherForm])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Ask Avexa</h3>
          <p className="text-gray-400 text-xs">AI-powered email composer</p>
        </div>
      </div>

      {/* ── Step 1: Voucher Config (BEFORE prompt) ── */}
      {enableVoucher && branchId && (
        <div className="rounded-xl bg-[#222222] border border-[#2A2A2A] overflow-hidden">
          <label className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#2A2A2A]/50 transition-colors">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-white">Include Voucher</span>
              {includeVoucher && <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">Each recipient gets a unique code + QR</span>}
            </div>
            <div className="relative">
              <input type="checkbox" checked={includeVoucher} onChange={(e) => setIncludeVoucher(e.target.checked)}
                className="sr-only peer" />
              <div className="w-9 h-5 bg-[#333] peer-checked:bg-amber-500 rounded-full transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </div>
          </label>
          {includeVoucher && (
            <div className="px-4 pb-4 border-t border-[#2A2A2A]">
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Value (₱)</label>
                  <input type="number" min="1" value={voucherForm.value}
                    onChange={(e) => setVoucherForm(p => ({ ...p, value: e.target.value }))}
                    className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Code Prefix</label>
                  <input type="text" placeholder="e.g. LOVE" value={voucherForm.codePrefix}
                    onChange={(e) => setVoucherForm(p => ({ ...p, codePrefix: e.target.value }))}
                    className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 uppercase" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Expires</label>
                  <input type="date" value={voucherForm.expiresAt}
                    onChange={(e) => setVoucherForm(p => ({ ...p, expiresAt: e.target.value }))}
                    className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Prompt Input ── */}
      <div className="relative">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder={includeVoucher
            ? `e.g., Compose a Valentine's Day email with our ₱${voucherForm.value} voucher offer. Make it exciting and romantic...`
            : "e.g., Compose a Valentine's Day email offering 10% off all haircuts and styling services..."}
          rows={3}
          className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none placeholder:text-gray-500"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
        />
        <div className="absolute bottom-2 right-2 text-gray-600 text-xs">Ctrl+Enter</div>
      </div>

      {/* Tone + Model selectors */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-400 text-xs font-medium">Tone:</span>
          {TONES.map((t) => (
            <button key={t.id} type="button" onClick={() => setTone(t.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                tone === t.id ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A] hover:border-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-400 text-xs font-medium">Model:</span>
          {MODELS.map((m) => (
            <button key={m.id} type="button" onClick={() => setModel(m.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                model === m.id ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A] hover:border-gray-500'}`}>
              {m.label} <span className="text-[10px] opacity-60 ml-1">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button type="button" onClick={handleGenerate} disabled={loading || !prompt.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20">
        {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Avexa is writing...</>)
          : (<><Wand2 className="w-4 h-4" />Generate Email{includeVoucher ? ' with Voucher' : ''}</>)}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* ── Step 3: Result / Preview ── */}
      {result && (
        <div className="space-y-4">
          {/* Subject Line */}
          <div className="p-4 rounded-xl bg-[#222222] border border-[#2A2A2A]">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Subject Line</span>
            <p className="text-white font-medium mt-1">{result.subject}</p>
          </div>

          {/* Voucher info badge */}
          {hasVoucherPlaceholders && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <QrCode className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-xs">Each recipient will receive a unique voucher code + QR code (₱{voucherForm.value})</span>
            </div>
          )}

          {/* Email Preview */}
          <div className="rounded-xl bg-[#222222] border border-[#2A2A2A] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A] bg-[#1A1A1A]">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                Email Preview {hasVoucherPlaceholders && '(sample code shown)'}
              </span>
              <button type="button" onClick={handleCopyHtml}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#333333] transition-all">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy HTML'}
              </button>
            </div>
            <div ref={previewRef} className="p-4 max-h-[400px] overflow-y-auto bg-white rounded-b-xl">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 text-sm font-medium">Avexa's Suggestions</span>
              </div>
              <ul className="space-y-2">
                {result.suggestions.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <span className="text-amber-400 mt-0.5">•</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Step 4: Send Section ── */}
          {enableSend && branchId && userId && customers && (
            <div className="rounded-xl bg-[#222222] border border-[#2A2A2A] overflow-hidden">
              <button type="button" onClick={() => setShowSend(!showSend)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#2A2A2A]/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">
                    Send Email{hasVoucherPlaceholders ? ' with Unique Vouchers' : ''}
                  </span>
                  {sendComplete && <span className="text-xs text-green-400 ml-1">(Sent)</span>}
                </div>
                {showSend ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showSend && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#2A2A2A]">
                  {/* Mode toggle */}
                  <div className="flex gap-2 pt-3">
                    <button type="button" onClick={() => setSendMode('audience')}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        sendMode === 'audience' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A]'}`}>
                      <Users className="w-3 h-3 inline mr-1" /> By Audience
                    </button>
                    <button type="button" onClick={() => setSendMode('specific')}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        sendMode === 'specific' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A]'}`}>
                      <UserCheck className="w-3 h-3 inline mr-1" /> Specific
                    </button>
                  </div>

                  {/* Audience selector */}
                  {sendMode === 'audience' && (
                    <div className="flex gap-2 flex-wrap">
                      {AUDIENCES.map(a => (
                        <button key={a.id} type="button" onClick={() => setAudienceType(a.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            audienceType === a.id ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A]'}`}>
                          {a.label} <span className="text-[10px] opacity-60 ml-1">({audienceCounts[a.id] || 0})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Specific recipients */}
                  {sendMode === 'specific' && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                        <input type="text" placeholder="Search customers..." value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          className="w-full h-8 pl-8 pr-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                      {selectedRecipients.length > 0 && (
                        <div className="text-xs text-blue-300">{selectedRecipients.length} selected</div>
                      )}
                      <div className="max-h-[150px] overflow-y-auto space-y-1">
                        {filteredRecipients.slice(0, 50).map(c => {
                          const email = c.email || c.customer_email
                          const name = c.username || c.customer_name || email
                          const isSelected = selectedRecipients.some(r => r._id === c._id)
                          return (
                            <label key={c._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#2A2A2A] cursor-pointer">
                              <input type="checkbox" checked={isSelected} onChange={() => toggleRecipient(c)}
                                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500/50" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs truncate">{name}</p>
                                <p className="text-gray-500 text-[10px] truncate">{email}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Voucher creation notice */}
                  {hasVoucherPlaceholders && !sendComplete && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <Ticket className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-amber-300/80 text-[11px]">
                        {sendMode === 'audience' ? audienceCounts[audienceType] || 0 : selectedRecipients.length} vouchers (₱{voucherForm.value} each) will be auto-created and assigned
                      </span>
                    </div>
                  )}

                  {/* Send button / Progress */}
                  {!sendComplete ? (
                    <>
                      {sending && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{hasVoucherPlaceholders ? 'Creating vouchers & sending...' : 'Sending...'}</span>
                            <span>{sendProgress.current}/{sendProgress.total}</span>
                          </div>
                          <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                              style={{ width: `${sendProgress.total ? (sendProgress.current / sendProgress.total) * 100 : 0}%` }} />
                          </div>
                          {sendProgress.failed > 0 && <p className="text-red-400 text-xs">{sendProgress.failed} failed</p>}
                        </div>
                      )}
                      <button type="button" onClick={handleSendEmails}
                        disabled={sending || (sendMode === 'specific' && selectedRecipients.length === 0)}
                        className="w-full py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                          : <><Send className="w-4 h-4" />Send to {sendMode === 'audience' ? `${audienceCounts[audienceType] || 0} recipients` : `${selectedRecipients.length} selected`}</>}
                      </button>
                    </>
                  ) : (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                      <p className="text-green-300 text-sm font-medium">Emails Sent Successfully</p>
                      <p className="text-green-200 text-xs">
                        {sendProgress.sent} sent{sendProgress.failed > 0 ? `, ${sendProgress.failed} failed` : ''}
                        {hasVoucherPlaceholders ? ` — ${sendProgress.sent} unique vouchers created` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {onApply && !enableSend && (
              <button type="button" onClick={handleApply}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  applied ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'}`}>
                {applied ? <><CheckCircle className="w-4 h-4" /> Applied!</> : <><Check className="w-4 h-4" /> Use This Email</>}
              </button>
            )}
            {enableSaveTemplate && branchId && userId && (
              <button type="button" onClick={() => { setTemplateName(''); setShowSaveTemplateModal(true) }}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  templateSaved ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-[#2A2A2A] text-gray-200 border border-[#3A3A3A] hover:border-purple-500/50 hover:bg-purple-500/10'}`}>
                <BookmarkPlus className="w-4 h-4" />
                {templateSaved ? 'Saved!' : 'Save as Template'}
              </button>
            )}
            {enableDraftSave && branchId && userId && (
              <button type="button" onClick={handleSaveDraft} disabled={savingDraft}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  draftSaved ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-[#2A2A2A] text-gray-200 border border-[#3A3A3A] hover:border-blue-500/50 hover:bg-blue-500/10'}`}>
                <Clock className="w-4 h-4" />
                {draftSaved ? 'Saved as Draft!' : savingDraft ? 'Saving...' : 'Save for Later'}
              </button>
            )}
            <button type="button" onClick={handleGenerate} disabled={loading}
              className="px-4 py-2.5 rounded-xl font-medium text-sm bg-[#2A2A2A] text-gray-300 hover:bg-[#333333] transition-all flex items-center gap-2 disabled:opacity-50">
              <RotateCcw className="w-4 h-4" /> Regenerate
            </button>
          </div>

          {/* Save as Template mini-modal */}
          {showSaveTemplateModal && (
            <div className="p-4 rounded-xl bg-[#222222] border border-purple-500/30 space-y-3">
              <p className="text-purple-300 text-sm font-medium flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4" /> Name this template
              </p>
              <input type="text" placeholder="e.g. Valentine's Day Promo" value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate() }}
                autoFocus
                className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowSaveTemplateModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm bg-[#333] text-gray-400 hover:bg-[#3A3A3A] transition-all">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                  className="flex-1 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingTemplate ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookmarkPlus className="w-3 h-3" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
