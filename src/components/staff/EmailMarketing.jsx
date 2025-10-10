import React, { useMemo, useState, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import {
  Mail,
  Send,
  Plus,
  Calendar as IconCalendar,
  Users,
  Loader2,
  X,
  Search,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Clock,
  Target,
  Zap,
  FileText,
  Palette,
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  PieChart,
  Activity,
  Filter,
  Tag,
  Star,
  Crown,
  User,
  UserCheck,
  UserPlus,
  Copy,
  TestTube,
  Type,
  Image,
  Link,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Save,
  RotateCcw
} from 'lucide-react'
import Modal from '../common/Modal'
import { renderTemplateHtml, buildTemplateDataFromCampaign } from '../../utils/emailTemplates'

// Memoized Template Preview Component
const TemplatePreview = memo(({ selectedTemplate, campaignForm }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [renderedHtml, setRenderedHtml] = useState('')
  const templateDataKey = useMemo(() => JSON.stringify(campaignForm.templateData || {}), [campaignForm.templateData])

  useEffect(() => {
    let isMounted = true

    const renderPreview = async () => {
      if (!selectedTemplate?.id || selectedTemplate.id === 'custom') {
        setRenderedHtml('')
        return
      }

      setIsLoading(true)
      try {
        const htmlString = await renderTemplateHtml({
          templateType: selectedTemplate.id,
          subject: campaignForm.subject || 'Email Subject',
          templateData: campaignForm.templateData,
          fallbackHtml: campaignForm.body_html || ''
        })

        if (isMounted) {
          setRenderedHtml(htmlString)
        }
      } catch (error) {
        console.error('Template rendering error:', error)
        if (isMounted) {
          setRenderedHtml('')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    renderPreview()

    return () => {
      isMounted = false
    }
  }, [selectedTemplate, campaignForm.subject, templateDataKey, campaignForm.body_html])

  if (!selectedTemplate || !selectedTemplate.component) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-600 mb-2">No Template Selected</h4>
          <p className="text-sm text-gray-500">Choose a template to see the preview</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8C42] mb-4"></div>
        <p className="text-gray-500 text-sm">Loading template preview...</p>
      </div>
    )
  }

  if (!renderedHtml) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-500 text-sm">Preview not available</p>
        <p className="text-gray-400 text-xs mt-1">Template will render correctly when sent</p>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-4 rounded-[30px] shadow-inner border border-gray-200/60">
        <div className="bg-white rounded-[22px] shadow-2xl overflow-hidden border border-gray-200 w-[360px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 truncate">
              {campaignForm.subject || 'Email Subject'}
            </span>
          </div>
          <iframe
            title="Email preview"
            srcDoc={renderedHtml}
            className="w-full"
            style={{ height: 600, border: 'none', backgroundColor: '#f4f4f4' }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
})

TemplatePreview.displayName = 'TemplatePreview'

// Memoized Template Card Component
const TemplateCard = memo(({ template, isSelected, onSelect }) => (
  <button
    key={template.id}
    type="button"
    onClick={() => onSelect(template)}
    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
      isSelected
        ? 'border-[#FF8C42] bg-[#FF8C42]/10 shadow-lg shadow-[#FF8C42]/20'
        : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#2A2A2A] hover:bg-[#222222]'
    }`}
  >
    <div className="flex items-center space-x-3 mb-2">
      {(() => { const Icon = template.icon; return <Icon className="w-5 h-5 text-[#FF8C42]" /> })()}
      <span className="text-sm font-semibold text-white">{template.name}</span>
      {isSelected && (
        <div className="ml-auto w-2 h-2 bg-[#FF8C42] rounded-full"></div>
      )}
    </div>
    <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{template.description}</p>
  </button>
))

TemplateCard.displayName = 'TemplateCard'

const DEFAULT_FROM_EMAIL = 'noreply@tpxbarber.com' // Will be handled by EmailJS

const EmailMarketing = memo(({ onRefresh }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('campaigns')
  const [showCreate, setShowCreate] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showDraftPreview, setShowDraftPreview] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [sendingCampaign, setSendingCampaign] = useState(null)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 })
  const [showRecipientModal, setShowRecipientModal] = useState(false)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientFilter, setRecipientFilter] = useState('all_customers')
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [recipientModalContext, setRecipientModalContext] = useState('create')

  // Form states
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    body_html: '', // kept for backend schema; will store serialized template data when using templates
    audience: 'all_customers',
    template_type: 'custom',
    from_email: '',
    scheduled_at: '',
    tags: [],
    templateData: {}
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [audienceFilter, setAudienceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [testEmail, setTestEmail] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(undefined)

  // Queries
  const campaigns = useQuery(
    api.services.emailMarketing.getCampaignsByBranch,
    user?.branch_id ? { branch_id: user.branch_id } : 'skip'
  )

  const customers = useQuery(
    api.services.auth.getUsersByRoleAndBranch,
    user?.branch_id ? { role: 'customer', branch_id: user.branch_id } : 'skip'
  )

  // Mutations
  const createCampaign = useMutation(api.services.emailMarketing.createCampaign)
  const updateCampaign = useMutation(api.services.emailMarketing.updateCampaign)
  const deleteCampaignMutation = useMutation(api.services.emailMarketing.deleteCampaign)
  const logCampaignSend = useMutation(api.services.emailMarketing.logCampaignSend)

  // Audience data
  const audienceStats = useMemo(() => {
    if (!customers) return { all_customers: 0, new_customers: 0, returning_customers: 0, vip_customers: 0 }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      all_customers: customers.length,
      new_customers: customers.filter(c => new Date(c.createdAt) > thirtyDaysAgo).length,
      returning_customers: customers.filter(c => {
        // Placeholder logic: customers created before 30 days
        return c.createdAt < thirtyDaysAgo.getTime()
      }).length,
      vip_customers: customers.filter(c => {
        // TODO: Replace with actual VIP logic (e.g., high booking count)
        return false
      }).length
    }
  }, [customers])

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return []

    return campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.subject.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesAudience = audienceFilter === 'all' || campaign.audience === audienceFilter
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
      const matchesTemplate = templateFilter === 'all' || campaign.template_type === templateFilter

      return matchesSearch && matchesAudience && matchesStatus && matchesTemplate
    })
  }, [campaigns, searchTerm, audienceFilter, statusFilter, templateFilter])

  // Campaign statistics
  const campaignStats = useMemo(() => {
    if (!campaigns) return { total: 0, sent: 0, scheduled: 0, draft: 0 }

    return campaigns.reduce((acc, campaign) => ({
      total: acc.total + 1,
      sent: acc.sent + (campaign.status === 'sent' ? 1 : 0),
      scheduled: acc.scheduled + (campaign.status === 'scheduled' ? 1 : 0),
      draft: acc.draft + (campaign.status === 'draft' ? 1 : 0)
    }), { total: 0, sent: 0, scheduled: 0, draft: 0 })
  }, [campaigns])

  // Reset form
  const resetForm = () => {
    setCampaignForm({
      name: '',
      subject: '',
      body_html: '',
      audience: 'all_customers',
      template_type: 'custom',
      from_email: '',
      scheduled_at: '',
      tags: [],
      templateData: {}
    })
    setSelectedTemplate(null)
    setSelectedRecipients([])
  }

  // Handle campaign creation
  const handleCreateCampaign = async () => {
    if (!user?.branch_id || !user?._id) return
    if (!campaignForm.name || !campaignForm.subject) return

    const scheduled_at = campaignForm.scheduled_at ? new Date(campaignForm.scheduled_at).getTime() : undefined

    const allowedAudiences = ['all_customers', 'new_customers', 'returning_customers', 'vip_customers']
    const normalizedAudience = allowedAudiences.includes(campaignForm.audience)
      ? campaignForm.audience
      : 'all_customers'

    // If a template is selected, serialize its data into body_html field
    const isTemplated = selectedTemplate && selectedTemplate.id !== 'custom'
    const templateType = isTemplated ? selectedTemplate.id : (campaignForm.template_type || 'custom')
    const bodyHtmlToStore = isTemplated
      ? JSON.stringify({ template_type: selectedTemplate.id, templateData: campaignForm.templateData || {} })
      : (campaignForm.body_html || '')

    try {
    await createCampaign({
      branch_id: user.branch_id,
        name: campaignForm.name,
        subject: campaignForm.subject,
        body_html: bodyHtmlToStore,
        audience: normalizedAudience,
        template_type: templateType,
        from_email: DEFAULT_FROM_EMAIL, // Always use verified Resend domain
      created_by: user._id,
        scheduled_at,
        tags: campaignForm.tags
    })

    resetForm()
    setShowCreate(false)
    onRefresh?.()
    } catch (error) {
      console.error('Failed to create campaign:', error)
    }
  }

  // Handle campaign sending
  const sendCampaignToRecipients = async (campaign, recipients) => {
    if (!campaign || !recipients || recipients.length === 0) return

    setShowRecipientModal(false)
    setSendingCampaign(campaign)
    setSendProgress({ current: 0, total: recipients.length, sent: 0, failed: 0 })

    try {
      await updateCampaign({
        id: campaign._id,
        status: 'sending',
        total_recipients: recipients.length
      })

      const html = await generateHtmlForCampaign(campaign)

      // Use EmailJS to send emails (client-side)
      console.log('📧 Campaign email payload:', {
        campaign_id: campaign._id,
        subject: campaign.subject,
        recipients_count: recipients.length
      })

      // Import EmailJS service
      const { sendCampaignEmails } = await import('../../services/emailjsService.js')

      // Send emails using EmailJS
      const sendResult = await sendCampaignEmails({
        campaignData: {
          name: campaign.name,
          subject: campaign.subject,
          html_content: html,
          text_content: html.replace(/<[^>]*>/g, '') // Simple HTML to text conversion
        },
        recipients: recipients.map(r => ({
          email: r.email,
          username: r.username || r.email,
          _id: r._id
        })),
        onProgress: (progress) => {
          setSendProgress({
            current: progress.current,
            total: progress.total,
            sent: progress.sent,
            failed: progress.failed
          })
        }
      })

      // Log individual sends to database
      for (const recipient of recipients) {
        const wasSuccessful = sendResult.errors.find(e => e.email === recipient.email) === undefined
        await logCampaignSend({
          campaign_id: campaign._id,
          recipient_email: recipient.email,
          recipient_id: recipient._id,
          status: wasSuccessful ? 'sent' : 'failed',
          error: wasSuccessful ? undefined : sendResult.errors.find(e => e.email === recipient.email)?.error
        })
      }

      setSendProgress({ current: recipients.length, total: recipients.length, sent: sendResult.sent, failed: sendResult.failed })

      await updateCampaign({
        id: campaign._id,
        status: sendResult.failed > 0 && sendResult.sent === 0 ? 'failed' : 'sent',
        sent_at: Date.now(),
        sent_count: sendResult.sent,
        failed_count: sendResult.failed
      })

      const failedSet = new Set((sendResult.errors || []).map((e) => e.email))
      for (const customer of recipients) {
        const status = failedSet.has(customer.email) ? 'failed' : 'sent'
        await logCampaignSend({
          campaign_id: campaign._id,
          recipient_email: customer.email,
          recipient_id: customer._id,
          status
        })
      }

      if (sendResult.failed > 0) {
        const message = sendResult.errors?.map(e => `${e.email}: ${e.error}`).join('\n') || 'Some emails failed to send.'
        alert(`Campaign sent with ${sendResult.failed} failures.\n${message}`)
      } else {
        alert(`Campaign sent to ${sendResult.sent} recipients!`)
      }

    } catch (error) {
      console.error('Failed to send campaign:', error)
      await updateCampaign({
        id: campaign._id,
        status: 'failed'
      })
    } finally {
      setSendingCampaign(null)
      setSendProgress({ current: 0, total: 0, sent: 0, failed: 0 })
      setSelectedRecipients([])
      setRecipientSearch('')
      setRecipientModalContext('create')
    }
  }

  const handleSendCampaign = async (campaign, bypassSelection = false) => {
    if (!customers || customers.length === 0 || !campaign) return

    if (!bypassSelection) {
      const audience = campaign.audience || 'all_customers'
      setRecipientModalContext('send')
      setRecipientFilter(audience)
      setRecipientSearch('')
      const preselected = filterCustomers(customers, audience, '')
      setSelectedRecipients(preselected)
      setSendingCampaign(campaign)
      setShowRecipientModal(true)
      return
    }

    const recipients = selectedRecipients.length
      ? [...selectedRecipients]
      : filterCustomers(customers, campaign.audience || 'all_customers', '')

    await sendCampaignToRecipients(campaign, recipients)
  }

  const closeRecipientModal = () => {
    setShowRecipientModal(false)
    if (recipientModalContext === 'send') {
      setRecipientModalContext('create')
      setSendingCampaign(null)
    }
  }

  // Filter customers helper
  const filterCustomers = useCallback((list, filter, search) => {
    if (!list) return []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    let filtered = list
    if (filter === 'new_customers') {
      filtered = list.filter(c => new Date(c.createdAt) > thirtyDaysAgo)
    } else if (filter === 'returning_customers' || filter === 'regular_customers') {
      filtered = list.filter(c => c.createdAt < thirtyDaysAgo.getTime())
    } else if (filter === 'vip_customers') {
      filtered = []
    }
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(c => (c.username || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
    }
    return filtered
  }, [])

  const generateHtmlForCampaign = useCallback(async (campaign) => {
    if (!campaign) return ''
    const { templateType, templateData, fallbackHtml } = buildTemplateDataFromCampaign(campaign)
    try {
      const html = await renderTemplateHtml({
        templateType,
        subject: campaign.subject,
        templateData,
        fallbackHtml
      })
      if (html) return html
    } catch (error) {
      console.error('Failed to render campaign template:', error)
    }
    if (fallbackHtml) return fallbackHtml
    return `<div style="font-family:Arial,sans-serif;padding:20px"><h1>${campaign.name || 'Campaign'}</h1><p>${campaign.subject || ''}</p></div>`
  }, [])

  const generateHtmlForForm = useCallback(async () => {
    const templateType = selectedTemplate?.id || campaignForm.template_type || 'custom'
    const fallbackHtml = templateType === 'custom' ? (campaignForm.body_html || '') : ''
    try {
      const html = await renderTemplateHtml({
        templateType,
        subject: campaignForm.subject || 'Email Subject',
        templateData: campaignForm.templateData,
        fallbackHtml
      })
      if (html) return html
    } catch (error) {
      console.error('Failed to render form template:', error)
    }
    if (fallbackHtml) return fallbackHtml
    return `<div style="font-family:Arial,sans-serif;padding:20px"><h1>${campaignForm.name || 'Campaign'}</h1><p>${campaignForm.subject || ''}</p></div>`
  }, [selectedTemplate, campaignForm.template_type, campaignForm.body_html, campaignForm.subject, campaignForm.name, campaignForm.templateData])

  // Handle test email
  const handleSendTest = async () => {
    if (!testEmail) return

    try {
      const targetCampaign = selectedCampaign || {
        _id: undefined,
        name: campaignForm.name || 'Test Campaign',
        subject: campaignForm.subject || 'Test Email',
        from_email: campaignForm.from_email,
        template_type: selectedTemplate?.id || campaignForm.template_type,
        body_html: campaignForm.body_html,
      }

      const html = selectedCampaign
        ? await generateHtmlForCampaign(selectedCampaign)
        : await generateHtmlForForm()

      const campaignPayload = targetCampaign._id
        ? {
            id: targetCampaign._id,
            name: targetCampaign.name || 'Test Campaign',
            subject: targetCampaign.subject || 'Test Email',
            from: targetCampaign.from_email || DEFAULT_FROM_EMAIL
          }
        : {
            name: targetCampaign.name || 'Test Campaign',
            subject: targetCampaign.subject || 'Test Email',
            from: targetCampaign.from_email || DEFAULT_FROM_EMAIL
          }

      // Send test email using EmailJS (client-side)
      console.log('📧 Test email payload:', {
        to: testEmail,
        subject: campaignPayload.subject,
        hasHtml: !!html
      })

      // Import EmailJS service
      const { sendEmailViaEmailJS } = await import('../../services/emailjsService.js')

      const result = await sendEmailViaEmailJS({
        to: testEmail,
        to_name: 'Test User',
        subject: campaignPayload.subject,
        html_content: html,
        text_content: html.replace(/<[^>]*>/g, '') // Simple HTML to text conversion
      })

      if (result.success) {
        alert('Test email sent successfully!')
      } else {
        alert('Failed to send test email: ' + result.error)
      }
    } catch (error) {
      console.error('Test email failed:', error)
      alert('Failed to send test email')
    }
  }

  const handleDeleteCampaign = useCallback(async (campaign) => {
    if (!campaign) return
    const confirmed = window.confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteCampaignMutation({ id: campaign._id })
      if (selectedCampaign?._id === campaign._id) {
        setSelectedCampaign(null)
      }
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete campaign:', error)
      alert('Failed to delete campaign. Please try again.')
    }
  }, [deleteCampaignMutation, onRefresh, selectedCampaign])

  // Template selection
  const templates = [
    { id: 'marketing', name: 'Marketing', description: 'General announcements & offers', icon: Mail },
    { id: 'promotional', name: 'Promotional', description: 'Discount-focused campaigns', icon: Crown },
    { id: 'newsletter', name: 'Newsletter', description: 'Share updates & content', icon: FileText }
  ]

  const defaultTemplateData = (id) => {
    switch (id) {
      case 'marketing':
        return { mainContent: 'We have an amazing offer just for you.', buttonText: 'Book Now', buttonUrl: '#', branchName: 'TPX Barber', branchAddress: '123 Main St, City', branchPhone: '+1234567890', footerText: 'Thank you for choosing us!' }
      case 'promotional':
        return { discountPercentage: '25', promoCode: 'SUMMER25', validUntil: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10), bookingUrl: '#' }
      case 'newsletter':
        return { mainContent: 'Welcome to our latest updates and news!', buttonText: 'Read More', buttonUrl: '#', footerText: 'Thanks for reading!' }
      default:
        return {}
    }
  }

  const handleTemplateSelect = useCallback((template) => {
    // Prevent rapid template switching
    if (selectedTemplate && selectedTemplate.id === template?.id) {
      setShowTemplate(false)
      return
    }

    if (template && template.component) {
      setSelectedTemplate(template) // Store the entire template object, not just the component
      setCampaignForm(prev => ({
        ...prev,
        template_type: template.id,
        body_html: '', // We will store serialized template data on submit
        templateData: defaultTemplateData(template.id)
      }))
    } else {
      // Handle custom HTML template
      setSelectedTemplate(null)
      setCampaignForm(prev => ({
        ...prev,
        template_type: 'custom',
        body_html: prev.body_html || '',
        templateData: {}
      }))
    }
    setShowTemplate(false)
  }, [selectedTemplate])

  // Status styling
  const getStatusStyle = (status) => {
    const styles = {
      draft: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
      scheduled: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      sending: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      sent: 'bg-green-500/20 text-green-300 border border-green-500/30',
      failed: 'bg-red-500/20 text-red-300 border border-red-500/30'
    }
    return styles[status] || styles.draft
  }

  // Audience styling
  const getAudienceIcon = (audience) => {
    const icons = {
      all_customers: Users,
      new_customers: UserPlus,
      returning_customers: UserCheck,
      vip_customers: Crown
    }
    return icons[audience] || Users
  }

  const getAudienceLabel = (audience) => {
    const labels = {
      all_customers: 'All Customers',
      new_customers: 'New Customers',
      returning_customers: 'Regular Customers',
      vip_customers: 'VIP Customers'
    }
    return labels[audience] || 'All Customers'
  }

  const getAudienceCount = useCallback((audience) => {
    if (!audienceStats) return 0
    return audienceStats[audience] || 0
  }, [audienceStats])

  const isSendContext = recipientModalContext === 'send' && !!sendingCampaign

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-xl">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
          <h2 className="text-2xl font-bold text-white">Email Marketing</h2>
            <p className="text-gray-400 text-sm">Manage and send email campaigns to your customers</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className="px-4 py-2 bg-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#333333] transition-colors flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Campaigns</p>
              <p className="text-2xl font-bold text-white">{campaignStats.total}</p>
            </div>
            <div className="p-2 bg-[#FF8C42]/20 rounded-lg">
              <Mail className="w-6 h-6 text-[#FF8C42]" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Sent</p>
              <p className="text-2xl font-bold text-green-400">{campaignStats.sent}</p>
            </div>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Scheduled</p>
              <p className="text-2xl font-bold text-blue-400">{campaignStats.scheduled}</p>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Audience Size</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{audienceStats.all_customers}</p>
            </div>
            <div className="p-2 bg-[#FF8C42]/20 rounded-lg">
              <Users className="w-6 h-6 text-[#FF8C42]" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          {/* Analytics Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Campaign Analytics</h2>
                <p className="text-gray-400 text-sm">Detailed performance metrics and insights</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('campaigns')}
              className="px-4 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#FF8C42]/10 hover:border-[#FF8C42] hover:text-[#FF8C42] transition-colors flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Back to Campaigns</span>
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-sm">Total Sent</p>
                  <p className="text-2xl font-bold text-white">
                    {campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0}
                  </p>
                </div>
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Send className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">+12% from last month</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-sm">Open Rate</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {campaigns?.length > 0 ?
                      Math.round((campaigns.reduce((sum, c) => sum + (c.open_count || 0), 0) /
                        campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)) * 100) || 0 : 0}%
                  </p>
                </div>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400">Industry avg: 22%</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-sm">Click Rate</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {campaigns?.length > 0 ?
                      Math.round((campaigns.reduce((sum, c) => sum + (c.click_count || 0), 0) /
                        campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)) * 100) || 0 : 0}%
                  </p>
                </div>
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400">Industry avg: 3.2%</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-sm">Avg Revenue</p>
                  <p className="text-2xl font-bold text-[#FF8C42]">
                    $2,450
                  </p>
                </div>
                <div className="p-2 bg-[#FF8C42]/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-[#FF8C42]" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">+$320 from last month</span>
              </div>
            </div>
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campaign Performance */}
            <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A]/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Campaign Performance</h3>
                <BarChart3 className="w-5 h-5 text-[#FF8C42]" />
              </div>
              <div className="space-y-4">
                {campaigns?.slice(0, 5).map((campaign, index) => {
                  const sent = campaign.sent_count || 0
                  const total = campaign.total_recipients || 0
                  const openRate = total > 0 ? Math.round((campaign.open_count || 0) / sent * 100) : 0
                  const clickRate = total > 0 ? Math.round((campaign.click_count || 0) / sent * 100) : 0

                  return (
                    <div key={campaign._id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium">{campaign.name}</span>
                        <span className="text-gray-400 text-xs">{sent} sent</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Opens</span>
                          <span className="text-blue-400">{openRate}%</span>
                        </div>
                        <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(openRate * 3, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Clicks</span>
                          <span className="text-purple-400">{clickRate}%</span>
                        </div>
                        <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${Math.min(clickRate * 10, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Audience Engagement */}
            <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A]/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Audience Engagement</h3>
                <Users className="w-5 h-5 text-[#FF8C42]" />
              </div>
              <div className="space-y-4">
                {Object.entries(audienceStats).map(([key, count]) => {
                  const IconComponent = getAudienceIcon(key)
                  const labels = {
                    all: 'All Customers',
                    new: 'New Customers',
                    returning: 'Returning',
                    vip: 'VIP Customers'
                  }
                  const engagementRates = {
                    all: { opens: 24, clicks: 3.2 },
                    new: { opens: 28, clicks: 4.1 },
                    returning: { opens: 22, clicks: 3.8 },
                    vip: { opens: 32, clicks: 5.2 }
                  }
                  const rate = engagementRates[key]

                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
          <div className="flex items-center space-x-3">
                        <div className="p-2 bg-[#FF8C42]/20 rounded-lg">
                          <IconComponent className="w-4 h-4 text-[#FF8C42]" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{labels[key]}</p>
                          <p className="text-gray-400 text-xs">{count} contacts</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 text-sm font-semibold">{rate.opens}% open</p>
                        <p className="text-purple-400 text-xs">{rate.clicks}% click</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Campaign Timeline */}
          <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A]/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Campaigns</h3>
              <Clock className="w-5 h-5 text-[#FF8C42]" />
            </div>
            <div className="space-y-4">
              {campaigns?.slice(0, 5).map((campaign, index) => {
                const statusColor = {
                  sent: 'text-green-400',
                  scheduled: 'text-blue-400',
                  sending: 'text-amber-400',
                  failed: 'text-red-400',
                  draft: 'text-gray-400'
                }[campaign.status] || 'text-gray-400'

                return (
                  <div key={campaign._id} className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-[#FF8C42] rounded-full"></div>
                      <div>
                        <p className="text-white font-medium">{campaign.name}</p>
                        <p className="text-gray-400 text-sm">{campaign.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`text-sm font-medium ${statusColor}`}>
                          {campaign.status}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString() :
                           campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleDateString() :
                           'Not sent'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">{campaign.sent_count || 0} sent</p>
                        <p className="text-blue-400 text-xs">{campaign.open_count || 0} opens</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Audience Overview */}
          <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Audience Segments</h3>
              <Target className="w-5 h-5 text-[#FF8C42]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(audienceStats).map(([key, count]) => {
                const IconComponent = getAudienceIcon(key)
                const labels = {
                  all: 'All Customers',
                  new: 'New Customers',
                  returning: 'Returning',
                  vip: 'VIP Customers'
                }
                return (
                  <div key={key} className="text-center">
                    <div className="p-2 bg-[#1A1A1A] rounded-lg inline-block mb-2">
                      <IconComponent className="w-4 h-4 text-[#FF8C42]" />
                    </div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-xs text-gray-400">{labels[key]}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Filters and Search */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#2A2A2A]/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Filters:</span>
            </div>

            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            >
              <option value="all">All Audiences</option>
              <option value="all_customers">All Customers</option>
              <option value="new_customers">New Customers</option>
              <option value="returning_customers">Returning Customers</option>
              <option value="vip_customers">VIP Customers</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
              <option value="sending">Sending</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            >
              <option value="all">All Templates</option>
              <option value="marketing">Marketing</option>
              <option value="promotional">Promotional</option>
              <option value="newsletter">Newsletter</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search campaigns..."
              className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            />
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map(campaign => {
          const AudienceIcon = getAudienceIcon(campaign.audience)
          const isSending = sendingCampaign?._id === campaign._id

          return (
            <div key={campaign._id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]/50 p-5 hover:border-[#FF8C42]/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-lg">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h3 className="text-white font-semibold">{campaign.name}</h3>
                    <p className="text-xs text-gray-400">{campaign.subject}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>

              <div className="flex items-center space-x-2 mb-3">
                <AudienceIcon className="w-4 h-4 text-[#FF8C42]" />
                <span className="text-xs text-gray-400 capitalize">
                  {campaign.audience.replace('_', ' ')}
                </span>
                {campaign.template_type && (
                  <>
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 capitalize">
                      {campaign.template_type}
                    </span>
                  </>
                )}
            </div>

              <div className="space-y-2 text-sm text-gray-300 mb-4">
              <div className="flex items-center justify-between">
                <span>Recipients</span>
                  <span className="text-white font-semibold">{campaign.total_recipients || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sent</span>
                  <span className="text-green-400 font-semibold">{campaign.sent_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Failed</span>
                  <span className="text-red-400 font-semibold">{campaign.failed_count || 0}</span>
                </div>
                {campaign.open_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Opens</span>
                    <span className="text-blue-400 font-semibold">{campaign.open_count}</span>
              </div>
                )}
                {campaign.click_count > 0 && (
              <div className="flex items-center justify-between">
                    <span>Clicks</span>
                    <span className="text-purple-400 font-semibold">{campaign.click_count}</span>
                  </div>
                )}
              </div>

              {isSending && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                    <span>Sending progress</span>
                    <span>{sendProgress.current}/{sendProgress.total}</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                    <div
                      className="bg-[#FF8C42] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${sendProgress.total > 0 ? (sendProgress.current / sendProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteCampaign(campaign)}
                    className="px-3 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#FF4D4F]/10 hover:border-[#FF4D4F] hover:text-[#FF4D4F] transition-colors"
                    title="Delete campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
              <button
                    onClick={() => {
                      setSelectedCampaign(campaign)
                      setShowPreview(true)
                    }}
                    className="px-3 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#FF8C42]/10 hover:border-[#FF8C42] hover:text-[#FF8C42] transition-colors"
                  >
                    <Eye className="w-4 h-4" />
              </button>
              <button
                    onClick={() => {
                      setSelectedCampaign(campaign)
                      setShowTest(true)
                    }}
                    className="px-3 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#FF8C42]/10 hover:border-[#FF8C42] hover:text-[#FF8C42] transition-colors"
                  >
                    <TestTube className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleSendCampaign(campaign)}
                      disabled={isSending}
                className="px-3 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF7A2B] transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Send</span>
                    </button>
                  )}

                  {campaign.status === 'scheduled' && (
                    <button
                      onClick={() => updateCampaign({ id: campaign._id, status: 'draft' })}
                      className="px-3 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#FF8C42]/10 hover:border-[#FF8C42] hover:text-[#FF8C42] transition-colors"
                    >
                      <Pause className="w-4 h-4" />
              </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Campaign Modal - Modern Professional Design */}
      {showCreate && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setShowCreate(false)}
            />
            <div className="relative w-full max-w-7xl max-h-[95vh] overflow-hidden transform rounded-3xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50 bg-[#0A0A0A]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF6B1A] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create Email Campaign</h2>
                    <p className="text-sm text-gray-400">Design and send professional email campaigns</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-10 h-10 rounded-xl bg-[#333333] hover:bg-[#FF8C42]/20 flex items-center justify-center transition-all duration-200 group"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-[#FF8C42] transition-colors" />
                </button>
              </div>

              {/* Main Content */}
              <div className="h-[calc(95vh-120px)] overflow-y-auto">
                {/* Campaign Builder */}
                <div className="p-6">
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateCampaign(); }} className="space-y-6">
                    {/* Campaign Details Section */}
                    <div className="bg-[#222222] rounded-2xl p-6 border border-[#2A2A2A]/50">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
                          <Settings className="w-4 h-4 text-[#FF8C42]" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Campaign Details</h3>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-gray-300 font-medium text-sm mb-2">
                              Campaign Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Summer Promo Blast"
                              value={campaignForm.name}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                              required
                              className="w-full h-12 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-300 font-medium text-sm mb-2">
                              Subject Line <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Get 20% off this week!"
                              value={campaignForm.subject}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
                              required
                              className="w-full h-12 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-gray-300 font-medium text-sm mb-2">Recipients</label>
                            <button
                              type="button"
                              onClick={() => {
                                const initial = campaignForm.audience || 'all_customers'
                                setRecipientModalContext('create')
                                setRecipientFilter(initial)
                                setRecipientSearch('')
                                if (!selectedRecipients.length) {
                                  const pre = filterCustomers(customers || [], initial, '')
                                  setSelectedRecipients(pre)
                                }
                                setSendingCampaign(null)
                                setShowRecipientModal(true)
                              }}
                              className="w-full h-12 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl text-sm text-left hover:border-[#FF8C42] focus:outline-none focus:ring-2 focus:ring-[#FF8C42] transition-all duration-200"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span>{getAudienceLabel(campaignForm.audience)}</span>
                                  <span className="text-xs text-gray-400">({selectedRecipients.length || getAudienceCount(campaignForm.audience || 'all_customers')})</span>
                                </div>
                                <span className="text-[#FF8C42] font-medium">Change</span>
                              </div>
                            </button>
                          </div>

                          <div>
                            <label className="block text-gray-300 font-medium text-sm mb-2">
                              From Email (Handled by EmailJS)
                            </label>
                            <input
                              type="email"
                              placeholder="noreply@tpxbarber.com"
                              value={campaignForm.from_email || DEFAULT_FROM_EMAIL}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, from_email: e.target.value }))}
                              className="w-full h-12 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                              disabled
                            />
                            <p className="text-xs text-gray-400 mt-2">
                              From email is configured in your EmailJS template settings.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Template Selection Section */}
                    <div className="bg-[#222222] rounded-2xl p-6 border border-[#2A2A2A]/50">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-[#FF8C42]" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Email Template</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {templates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            isSelected={selectedTemplate && selectedTemplate.name === template.name}
                            onSelect={handleTemplateSelect}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Template Content Inputs (no rich text) */}
                    <div className="bg-[#222222] rounded-2xl p-6 border border-[#2A2A2A]/50">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
                          <Type className="w-4 h-4 text-[#FF8C42]" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Template Content</h3>
                      </div>

                      {!selectedTemplate && (
                        <div className="text-sm text-gray-400">Select a template above to customize its content.</div>
                      )}

                      {selectedTemplate?.id === 'marketing' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Main Content</label>
                            <textarea
                              rows={4}
                              value={campaignForm.templateData?.mainContent || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, mainContent: e.target.value }}))}
                              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                              placeholder="We have an amazing offer just for you."
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Button Text</label>
                            <input
                              type="text"
                              value={campaignForm.templateData?.buttonText || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, buttonText: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Button URL</label>
                            <input
                              type="url"
                              value={campaignForm.templateData?.buttonUrl || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, buttonUrl: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                              placeholder="#"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Footer Text</label>
                            <input
                              type="text"
                              value={campaignForm.templateData?.footerText || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, footerText: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                            />
                          </div>
                        </div>
                      )}

                      {selectedTemplate?.id === 'promotional' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Discount %</label>
                            <input
                              type="number"
                              value={campaignForm.templateData?.discountPercentage || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, discountPercentage: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                              min="1"
                              max="90"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Promo Code</label>
                            <input
                              type="text"
                              value={campaignForm.templateData?.promoCode || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, promoCode: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Valid Until</label>
                            <input
                              type="date"
                              value={campaignForm.templateData?.validUntil || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, validUntil: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Booking URL</label>
                            <input
                              type="url"
                              value={campaignForm.templateData?.bookingUrl || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, bookingUrl: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                              placeholder="#"
                            />
                          </div>
                        </div>
                      )}

                      {selectedTemplate?.id === 'newsletter' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-gray-300 text-sm mb-2">Intro</label>
                            <textarea
                              rows={4}
                              value={campaignForm.templateData?.mainContent || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, mainContent: e.target.value }}))}
                              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                              placeholder="Welcome to our latest updates and news!"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Button Text</label>
                            <input
                              type="text"
                              value={campaignForm.templateData?.buttonText || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, buttonText: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Button URL</label>
                            <input
                              type="url"
                              value={campaignForm.templateData?.buttonUrl || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, buttonUrl: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-gray-300 text-sm mb-2">Footer Text</label>
                            <input
                              type="text"
                              value={campaignForm.templateData?.footerText || ''}
                              onChange={(e)=>setCampaignForm(p=>({...p, templateData: { ...p.templateData, footerText: e.target.value }}))}
                              className="w-full h-10 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Scheduling Section */}
                    <div className="bg-[#222222] rounded-2xl p-6 border border-[#2A2A2A]/50">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-[#FF8C42]" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Schedule Campaign</h3>
                      </div>

                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => setCampaignForm(prev => ({ ...prev, scheduled_at: null }))}
                          className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                            !campaignForm.scheduled_at
                              ? 'bg-[#FF8C42] text-white shadow-lg shadow-[#FF8C42]/20'
                              : 'bg-[#333333] text-gray-300 hover:bg-[#444444]'
                          }`}
                        >
                          <Play className="w-4 h-4 mr-2 inline" />
                          Send Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setCampaignForm(prev => ({ ...prev, scheduled_at: Date.now() + 3600000 }))}
                          className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                            campaignForm.scheduled_at
                              ? 'bg-[#FF8C42] text-white shadow-lg shadow-[#FF8C42]/20'
                              : 'bg-[#333333] text-gray-300 hover:bg-[#444444]'
                          }`}
                        >
                          <Clock className="w-4 h-4 mr-2 inline" />
                          Schedule
                        </button>
                      </div>

                      {campaignForm.scheduled_at && (
                        <div className="mt-4">
                          <input
                            type="datetime-local"
                            value={new Date(campaignForm.scheduled_at).toISOString().slice(0, 16)}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduled_at: new Date(e.target.value).getTime() }))}
                            className="w-full h-12 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-6 border-t border-[#2A2A2A]/50">
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="px-6 py-3 bg-[#333333] hover:bg-[#444444] text-gray-300 rounded-xl text-sm font-medium transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <div className="flex items-center space-x-3">
                        {/* Select Recipients moved to Recipients field above */}
                        <button
                          type="button"
                          onClick={() => setShowDraftPreview(true)}
                          className="px-6 py-3 border border-[#2A2A2A] hover:border-[#FF8C42] hover:bg-[#FF8C42]/10 text-gray-200 rounded-xl text-sm font-medium transition-all duration-200"
                        >
                          Preview Email
                        </button>
                        <button
                          type="button"
                          className="px-6 py-3 bg-[#444444] hover:bg-[#555555] text-gray-300 rounded-xl text-sm font-medium transition-all duration-200 flex items-center"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Draft
                        </button>
                        <button
                          type="submit"
                          className="px-8 py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF6B1A] hover:from-[#FF6B1A] hover:to-[#FF8C42] text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-[#FF8C42]/20 flex items-center"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Create Campaign
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Draft Preview Modal (for Create flow) */}
      {showDraftPreview && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowDraftPreview(false)}
            />
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]/50">
                <h2 className="text-lg font-bold text-white">Email Preview</h2>
                <button
                  onClick={() => setShowDraftPreview(false)}
                  className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
                </button>
              </div>
              <div className="p-4">
                <div className="min-h-[400px] bg-white rounded-xl overflow-hidden border border-gray-200">
                  <TemplatePreview selectedTemplate={selectedTemplate} campaignForm={campaignForm} />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Template Selection Modal - Modern Design */}
      {showTemplate && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setShowTemplate(false)}
            />
            <div className="relative w-full max-w-4xl transform rounded-3xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50 bg-[#0A0A0A]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF6B1A] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Choose Email Template</h2>
                    <p className="text-sm text-gray-400">Select a professional template or create custom HTML</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplate(false)}
                  className="w-10 h-10 rounded-xl bg-[#333333] hover:bg-[#FF8C42]/20 flex items-center justify-center transition-all duration-200 group"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-[#FF8C42] transition-colors" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map(template => {
                    const IconComponent = template.icon
                    const isSelected = selectedTemplate && selectedTemplate.name === template.name
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`p-6 bg-[#222222] border-2 rounded-2xl transition-all duration-200 text-left group ${
                          isSelected 
                            ? 'border-[#FF8C42] bg-[#FF8C42]/5' 
                            : 'border-[#2A2A2A] hover:border-[#FF8C42] hover:bg-[#FF8C42]/5'
                        }`}
                      >
                        <div className="flex items-center space-x-4 mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-[#FF8C42]/30' : 'bg-[#FF8C42]/20 group-hover:bg-[#FF8C42]/30'
                          }`}>
                            <IconComponent className="w-6 h-6 text-[#FF8C42]" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg">{template.name}</h3>
                            <p className="text-gray-400 text-sm">Pre-designed template</p>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 bg-[#FF8C42] rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {template.description}
                        </p>
                        <div className="mt-4 flex items-center text-[#FF8C42] text-sm font-medium">
                          <span>{isSelected ? 'Selected' : 'Select Template'}</span>
                          <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Recipient Selection Modal */}
      {showRecipientModal && createPortal(
        <div className="fixed inset-0 z-[10050] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeRecipientModal} />
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl z-[10051]">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]/50">
                <h2 className="text-lg font-bold text-white">Select Recipients</h2>
                <button onClick={closeRecipientModal} className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Filters */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    {[
                      {id:'all_customers',label:'All'},
                      {id:'new_customers',label:'New'},
                      {id:'returning_customers',label:'Regular'},
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setRecipientFilter(f.id)
                          if (recipientModalContext === 'create') {
                            setCampaignForm(prev => ({ ...prev, audience: f.id }))
                          }
                          const pre = filterCustomers(customers, f.id, recipientSearch)
                          setSelectedRecipients(pre)
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg border ${recipientFilter===f.id? 'border-[#FF8C42] text-[#FF8C42] bg-[#FF8C42]/10':'border-[#2A2A2A] text-gray-300 hover:bg-[#444444]/50'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-x-2">
                    <button onClick={()=>{ const list = filterCustomers(customers, recipientFilter, recipientSearch); setSelectedRecipients(list) }} className="text-xs px-3 py-1.5 border border-[#FF8C42] text-[#FF8C42] rounded-lg hover:bg-[#FF8C42]/10">Select All</button>
                    <button onClick={()=>setSelectedRecipients([])} className="text-xs px-3 py-1.5 border border-[#6B6B6B] text-[#6B6B6B] rounded-lg hover:bg-[#6B6B6B]/10">Clear</button>
                  </div>
                </div>
                {/* Search */}
                <div className="relative">
                  <input value={recipientSearch} onChange={(e)=>{setRecipientSearch(e.target.value)}} placeholder="Search customers..." className="w-full h-10 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] pr-10" />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {/* Selected chips */}
                {selectedRecipients.length>0 && (
                  <div className="border border-[#2A2A2A] rounded-xl p-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipients.map(u => (
                        <div key={u._id || u.id} className="flex items-center space-x-1 bg-[#FF8C42]/10 border border-[#FF8C42]/20 rounded-lg px-2 py-1 text-xs">
                          <span className="text-white">{u.username || u.email}</span>
                          <button onClick={()=> setSelectedRecipients(prev => prev.filter(p => (p._id||p.id)!==(u._id||u.id)))} className="text-[#FF8C42] hover:text-[#FF7A2B]"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* List */}
                <div className="border border-[#2A2A2A] rounded-xl max-h-72 overflow-y-auto p-2">
                  {filterCustomers(customers, recipientFilter, recipientSearch).map(c => {
                    const id = c._id || c.id
                    const isSel = selectedRecipients.find(u => (u._id||u.id)===id)
                    return (
                      <button key={id} onClick={()=>{
                        setSelectedRecipients(prev => isSel ? prev.filter(u => (u._id||u.id)!==id) : [...prev, c])
                      }} className={`w-full flex items-center text-left space-x-3 p-2 rounded-lg ${isSel? 'bg-[#FF8C42]/10 border border-[#FF8C42]/20':'hover:bg-[#222222]'} `}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSel? 'bg-[#FF8C42] border-[#FF8C42]':'border-[#2A2A2A]'}`}>{isSel && <CheckCircle className="w-3 h-3 text-white" />}</div>
                        <div className="flex-1">
                          <div className="text-sm text-white">{c.username || c.email}</div>
                          <div className="text-xs text-gray-400">{c.email}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t border-[#2A2A2A]/50">
                  <button
                    onClick={closeRecipientModal}
                    className="flex-1 px-3 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg text-sm hover:bg-[#555555]/70"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (isSendContext) {
                        await handleSendCampaign(sendingCampaign, true)
                      } else {
                        closeRecipientModal()
                      }
                    }}
                    disabled={!selectedRecipients.length}
                    className="flex-1 px-3 py-2 bg-[#FF8C42] text-white rounded-lg text-sm hover:bg-[#FF8C42]/90 disabled:opacity-50"
                  >
                    {isSendContext ? `Send to ${selectedRecipients.length}` : 'Done'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Campaign Preview Modal */}
      {showPreview && selectedCampaign && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowPreview(false)}
            />
            <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]/50">
                <h2 className="text-lg font-bold text-white">Campaign Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 max-h-[calc(85vh-120px)] overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-3 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-[#FF8C42]" />
                        Campaign Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-white">{selectedCampaign.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Subject:</span>
                          <span className="text-white">{selectedCampaign.subject}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Audience:</span>
                          <span className="text-white capitalize">{selectedCampaign.audience.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(selectedCampaign.status)}`}>
                            {selectedCampaign.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Created:</span>
                          <span className="text-gray-300">{selectedCampaign.createdAt ? new Date(selectedCampaign.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-3 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-[#FF8C42]" />
                        Performance
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Recipients:</span>
                          <span className="text-white">{selectedCampaign.total_recipients || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Sent:</span>
                          <span className="text-green-400">{selectedCampaign.sent_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Opens:</span>
                          <span className="text-blue-400">{selectedCampaign.open_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Clicks:</span>
                          <span className="text-purple-400">{selectedCampaign.click_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Failed:</span>
                          <span className="text-red-400">{selectedCampaign.failed_count || 0}</span>
                        </div>
                      </div>
                    </div>
              </div>

                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Eye className="w-4 h-4 mr-2 text-[#FF8C42]" />
                      Email Preview
                    </h3>
                    <div className="bg-white border border-[#2A2A2A] rounded-lg p-4 max-h-96 overflow-auto">
                      {(() => {
                        try {
                          const template = templates.find(t => t.id === selectedCampaign.template_type)
                          if (template) {
                            let data = {}
                            if (selectedCampaign.body_html && selectedCampaign.body_html.trim().startsWith('{')) {
                              const parsed = JSON.parse(selectedCampaign.body_html)
                              data = parsed?.templateData || {}
                            }
                            const Comp = template.component
                            return <div className="transform scale-75 origin-top-left w-[133%]"><Comp {...data} subject={selectedCampaign.subject} /></div>
                          }
                        } catch (e) {}
                        return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedCampaign.body_html || '<p class=\"text-gray-400\">No content</p>' }} />
                      })()}
                    </div>
              </div>
              </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Test Email Modal */}
      {showTest && selectedCampaign && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowTest(false)}
            />
            <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]/50">
                <h2 className="text-lg font-bold text-white">Send Test Email</h2>
                <button
                  onClick={() => setShowTest(false)}
                  className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="space-y-4">
            <div>
                    <label className="block text-gray-300 font-medium text-sm mb-2">
                      Test Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>

                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 flex items-center">
                      <TestTube className="w-4 h-4 mr-2 text-[#FF8C42]" />
                      Campaign: {selectedCampaign.name}
                    </h4>
                    <p className="text-gray-400 text-sm">Subject: {selectedCampaign.subject}</p>
                    <p className="text-gray-400 text-xs mt-1">Audience: {selectedCampaign.audience.replace('_', ' ')}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4 border-t border-[#2A2A2A]/50">
                    <button
                      type="button"
                      onClick={() => setShowTest(false)}
                      className="flex-1 px-3 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg text-sm hover:bg-[#555555]/70 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={!testEmail}
                      className="flex-1 px-3 py-2 bg-[#FF8C42] text-white rounded-lg text-sm hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send Test
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
})

EmailMarketing.displayName = 'EmailMarketing'

export default EmailMarketing
