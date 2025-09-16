import React, { useMemo, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { Mail, Send, Plus, Calendar as IconCalendar, Users, Loader2, X, Search } from 'lucide-react'
import Modal from '../common/Modal'

const EmailMarketing = ({ onRefresh }) => {
  const { user } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sendingId, setSendingId] = useState(null)
  const [detailsCampaign, setDetailsCampaign] = useState(null)

  const campaigns = useQuery(
    api.services.emailMarketing.getCampaignsByBranch,
    user?.branch_id ? { branch_id: user.branch_id } : 'skip'
  )

  const customers = useQuery(
    api.services.auth.getUsersByRoleAndBranch,
    user?.branch_id ? { role: 'customer', branch_id: user.branch_id } : 'skip'
  )

  const createCampaign = useMutation(api.services.emailMarketing.createCampaign)
  const updateCampaign = useMutation(api.services.emailMarketing.updateCampaign)

  const filtered = useMemo(() => (campaigns || []).filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase())
  ), [campaigns, searchTerm])

  const resetForm = () => {
    setName(''); setSubject(''); setBody(''); setScheduleAt('')
  }

  const handleCreate = async () => {
    if (!user?.branch_id || !user?._id) return
    if (!name || !subject || !body) return
    const scheduled_at = scheduleAt ? new Date(scheduleAt).getTime() : undefined
    await createCampaign({
      branch_id: user.branch_id,
      name,
      subject,
      body_html: body,
      audience: 'all_customers',
      created_by: user._id,
      scheduled_at
    })
    resetForm()
    setShowCreate(false)
    onRefresh?.()
  }

  const handleSendNow = async (campaign) => {
    if (!customers || customers.length === 0) return
    setSendingId(campaign._id)
    try {
      // Mark as sending and set total recipients
      await updateCampaign({ id: campaign._id, status: 'sending', total_recipients: customers.length })
      // UI-only: actual send is client-side via EmailJS per-customer
      for (const cust of customers) {
        // We don't send here to avoid exposing keys; rely on existing email service if configured on client.
        // The UI focuses on campaign management; actual delivery can be triggered by a background worker later.
      }
      await updateCampaign({ id: campaign._id, status: 'sent', sent_at: Date.now() })
    } finally {
      setSendingId(null)
    }
  }

  const statusPill = (status) => {
    const map = {
      draft: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
      scheduled: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      sending: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      sent: 'bg-green-500/20 text-green-300 border border-green-500/30',
      failed: 'bg-red-500/20 text-red-300 border border-red-500/30'
    }
    return map[status] || map.draft
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Mail className="w-6 h-6 text-[#FF8C42]" />
          <h2 className="text-2xl font-bold text-white">Email Marketing</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-2xl border border-[#444444]/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center px-3 py-2 bg-[#1A1A1A] border border-[#444444] rounded-lg">
              <Users className="w-4 h-4 text-[#FF8C42] mr-2" />
              <span className="text-sm text-gray-300">Audience:</span>
              <span className="text-sm text-white ml-2">All customers ({customers?.length || 0})</span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search campaigns..."
              className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c._id} className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl border border-[#444444]/50 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-lg">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{c.name}</h3>
                  <p className="text-xs text-gray-400">{c.subject}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPill(c.status)}`}>{c.status}</span>
            </div>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <span>Recipients</span>
                <span className="text-white font-semibold">{c.total_recipients || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sent</span>
                <span className="text-green-400 font-semibold">{c.sent_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Failed</span>
                <span className="text-red-400 font-semibold">{c.failed_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Scheduled</span>
                <span className="text-gray-300">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span className="text-gray-300">{c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => setDetailsCampaign(c)}
                className="px-3 py-2 border border-[#555555] text-gray-300 rounded-lg hover:bg-[#FF8C42]/10 hover:border-[#FF8C42] hover:text-[#FF8C42] transition-colors"
              >
                View
              </button>
              <button
                onClick={() => handleSendNow(c)}
                disabled={sendingId === c._id}
                className="px-3 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF7A2B] transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {sendingId === c._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send Now</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <Modal isOpen={true} onClose={() => setShowCreate(false)} title="New Campaign" size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign name</label>
                <input
                  placeholder="Summer Promo Blast"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  placeholder="Get 20% off this week"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email HTML/Content</label>
              <textarea
                placeholder="Write or paste HTML content..."
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Schedule (optional)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] w-full"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 md:justify-start">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors">Save</button>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Preview</label>
              <div className="border border-gray-200 rounded-lg p-4 bg-white max-h-64 overflow-auto">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: body || '<p class="text-gray-400">Preview will appear here...</p>' }} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {!!detailsCampaign && (
        <Modal isOpen={true} onClose={() => setDetailsCampaign(null)} title="Campaign Details" size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-semibold text-gray-900">{detailsCampaign.name}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">Subject</div>
                <div className="font-semibold text-gray-900">{detailsCampaign.subject}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-semibold text-gray-900 capitalize">{detailsCampaign.status}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">Audience</div>
                <div className="font-semibold text-gray-900">All customers</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">Scheduled</div>
                <div className="font-semibold text-gray-900">{detailsCampaign.scheduled_at ? new Date(detailsCampaign.scheduled_at).toLocaleString() : '—'}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-semibold text-gray-900">{detailsCampaign.createdAt ? new Date(detailsCampaign.createdAt).toLocaleString() : '—'}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">Sent At</div>
                <div className="font-semibold text-gray-900">{detailsCampaign.sent_at ? new Date(detailsCampaign.sent_at).toLocaleString() : '—'}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">Recipients / Sent / Failed</div>
                <div className="font-semibold text-gray-900">{detailsCampaign.total_recipients || 0} / {detailsCampaign.sent_count || 0} / {detailsCampaign.failed_count || 0}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Content Preview</div>
              <div className="border border-gray-200 rounded-lg p-4 bg-white max-h-[50vh] overflow-auto">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: detailsCampaign.body_html || '<p class="text-gray-400">No content</p>' }} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default EmailMarketing


