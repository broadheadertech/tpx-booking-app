import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useBranding } from '../../context/BrandingContext'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  Mail,
  RefreshCw,
  Save,
  Undo2,
  Eye,
  AlertCircle,
  CheckCircle,
  FileText,
  Gift,
  Calendar,
  Bell,
  UserPlus,
  HelpCircle
} from 'lucide-react'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { emailTemplatesSteps } from '../../config/walkthroughSteps'

const TEMPLATE_CONFIG = {
  password_reset: {
    label: 'Password Reset',
    icon: FileText,
    description: 'Sent when a user requests to reset their password',
    variables: ['{{brand_name}}', '{{reset_url}}'],
  },
  voucher: {
    label: 'Voucher Email',
    icon: Gift,
    description: 'Sent when a voucher is assigned or redeemed',
    variables: ['{{brand_name}}', '{{recipient_name}}', '{{voucher_code}}', '{{voucher_value}}', '{{points_required}}', '{{expires_at}}'],
  },
  booking_confirmation: {
    label: 'Booking Confirmation',
    icon: Calendar,
    description: 'Sent when a booking is confirmed',
    variables: ['{{brand_name}}', '{{customer_name}}', '{{service_name}}', '{{date}}', '{{time}}', '{{barber_name}}'],
  },
  booking_reminder: {
    label: 'Booking Reminder',
    icon: Bell,
    description: 'Sent as a reminder before the appointment',
    variables: ['{{brand_name}}', '{{customer_name}}', '{{service_name}}', '{{date}}', '{{time}}'],
  },
  welcome: {
    label: 'Welcome Email',
    icon: UserPlus,
    description: 'Sent when a new user registers',
    variables: ['{{brand_name}}', '{{user_name}}'],
  },
}

const TextInput = ({ label, value, onChange, disabled, placeholder, error }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-gray-300">{label}</span>
    <input
      type="text"
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 disabled:opacity-60 ${
        error
          ? 'border-red-500/50 bg-red-500/10 focus:ring-red-500/60'
          : 'border-white/10 bg-white/5 focus:ring-[var(--color-primary)]/60'
      }`}
    />
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
  </label>
)

const TextAreaInput = ({ label, value, onChange, disabled, placeholder, rows = 4, error }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-gray-300">{label}</span>
    <textarea
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full rounded-xl border px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 disabled:opacity-60 resize-none ${
        error
          ? 'border-red-500/50 bg-red-500/10 focus:ring-red-500/60'
          : 'border-white/10 bg-white/5 focus:ring-[var(--color-primary)]/60'
      }`}
    />
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
  </label>
)

export default function EmailNotificationSettings() {
  // Use unified auth hook for user data (supports both Clerk and legacy auth)
  const { user: currentUser, isAuthenticated, sessionToken } = useCurrentUser()
  const { branding } = useBranding()
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])

  const isSuperAdmin = currentUser?.role === 'super_admin'

  // Query templates - backend now supports both Clerk and legacy auth
  const templates = useQuery(
    isSuperAdmin && isAuthenticated ? api.services.emailTemplates.getAllTemplates : null,
    isSuperAdmin && isAuthenticated ? { sessionToken: sessionToken || undefined } : 'skip'
  )
  const upsertTemplate = useMutation(api.services.emailTemplates.upsertTemplate)
  const resetToDefault = useMutation(api.services.emailTemplates.resetToDefault)
  
  const [selectedType, setSelectedType] = useState('password_reset')
  const [form, setForm] = useState({
    subject: '',
    heading: '',
    body_text: '',
    cta_text: '',
    footer_text: '',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Load template data when selection changes
  useEffect(() => {
    if (templates) {
      const template = templates.find(t => t.template_type === selectedType)
      if (template) {
        setForm({
          subject: template.subject || '',
          heading: template.heading || '',
          body_text: template.body_text || '',
          cta_text: template.cta_text || '',
          footer_text: template.footer_text || '',
        })
      }
    }
  }, [templates, selectedType])

  const currentConfig = TEMPLATE_CONFIG[selectedType]
  const IconComponent = currentConfig?.icon || Mail

  const handleSave = async () => {
    if (!isAuthenticated) return

    setSaving(true)
    setStatus(null)

    try {
      await upsertTemplate({
        sessionToken: sessionToken || undefined, // Pass sessionToken if available (for legacy auth), otherwise undefined (for Clerk auth)
        template_type: selectedType,
        subject: form.subject,
        heading: form.heading,
        body_text: form.body_text,
        cta_text: form.cta_text,
        footer_text: form.footer_text,
        is_active: true,
      })
      setStatus({ type: 'success', message: 'Email template saved successfully!' })
      setIsEditing(false)
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save template' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!isAuthenticated) return

    setSaving(true)
    setStatus(null)

    try {
      await resetToDefault({
        sessionToken: sessionToken || undefined, // Pass sessionToken if available (for legacy auth), otherwise undefined (for Clerk auth)
        template_type: selectedType,
      })
      setStatus({ type: 'success', message: 'Template reset to default!' })
      setIsEditing(false)
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to reset template' })
    } finally {
      setSaving(false)
    }
  }

  // Generate preview HTML with branding colors
  const previewHtml = useMemo(() => {
    const primaryColor = branding?.primary_color || '#000000'
    const accentColor = branding?.accent_color || '#000000'
    const bgColor = branding?.bg_color || '#0A0A0A'
    const brandName = branding?.display_name || ''
    
    // Replace variables for preview and convert newlines to <br>
    const subject = form.subject.replace(/\{\{brand_name\}\}/g, brandName)
    const heading = form.heading.replace(/\{\{brand_name\}\}/g, brandName)
    const bodyText = form.body_text
      .replace(/\{\{brand_name\}\}/g, brandName)
      .replace(/\{\{recipient_name\}\}/g, 'John Doe')
      .replace(/\{\{customer_name\}\}/g, 'John Doe')
      .replace(/\{\{user_name\}\}/g, 'John Doe')
      .replace(/\{\{voucher_code\}\}/g, 'VOUCHER123')
      .replace(/\{\{voucher_value\}\}/g, '₱100')
      .replace(/\{\{points_required\}\}/g, '500')
      .replace(/\{\{expires_at\}\}/g, '2024-12-31')
      .replace(/\{\{service_name\}\}/g, 'Haircut')
      .replace(/\{\{date\}\}/g, '2024-12-15')
      .replace(/\{\{time\}\}/g, '2:00 PM')
      .replace(/\{\{barber_name\}\}/g, 'Mike')
      .replace(/\n/g, '<br>')
    const ctaText = form.cta_text || 'Click Here'
    const footerText = (form.footer_text || '').replace(/\n/g, '<br>')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: ${bgColor};
            color: #ffffff;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #333;
          }
          .header {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
            padding: 24px;
            text-align: center;
          }
          .header h1 {
            font-size: 24px;
            margin: 0;
            color: white;
          }
          .body {
            padding: 32px 24px;
          }
          .title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 16px;
            color: ${primaryColor};
            text-align: center;
          }
          .text {
            color: #ccc;
            margin-bottom: 24px;
            text-align: center;
          }
          .cta-button {
            display: block;
            width: fit-content;
            margin: 0 auto 24px;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
          }
          .footer-text {
            background: ${primaryColor}1a;
            border-left: 4px solid ${primaryColor};
            border-radius: 8px;
            padding: 16px;
            font-size: 13px;
            color: #bbb;
          }
          .footer {
            background: #1A1A1A;
            border-top: 1px solid #333;
            padding: 16px 24px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${brandName}</h1>
          </div>
          <div class="body">
            <h2 class="title">${heading}</h2>
            <p class="text">${bodyText}</p>
            ${ctaText ? `<a href="#" class="cta-button">${ctaText}</a>` : ''}
            ${footerText ? `<div class="footer-text"><strong style="display:block;margin-bottom:8px;color:#fff;">How to Use</strong>${footerText}</div>` : ''}
          </div>
          <div class="footer">
            <p>© 2024 ${brandName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }, [form, branding])

  if (!templates) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="mt-4 text-sm text-gray-400">Loading email templates...</p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-8">
      {/* Header */}
      <header data-tour="email-templates-header" className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wide">Email Customization</p>
          <div className="flex items-center gap-3">
            <h2 className="mt-2 flex items-center gap-3 text-3xl font-extrabold text-white">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg">
                <Mail className="h-6 w-6" />
              </span>
              Email Notification Settings
            </h2>
            <button onClick={() => setShowTutorial(true)} className="mt-2 w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Customize the content of system emails. Colors are automatically applied from your branding settings.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
              showPreview 
                ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                : 'border-white/10 text-white hover:border-white/30'
            }`}
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </header>

      {/* Status Message */}
      {status && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            status.type === 'success'
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {status.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Template Selector */}
        <div data-tour="email-templates-selector" className="rounded-3xl border border-white/10 bg-[var(--color-bg)]/40 p-6 shadow-xl">
          <p className="text-sm font-semibold text-gray-400 mb-4">Email Templates</p>
          <div className="space-y-2">
            {Object.entries(TEMPLATE_CONFIG).map(([type, config]) => {
              const Icon = config.icon
              const isSelected = selectedType === type
              return (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type)
                    setIsEditing(false)
                    setStatus(null)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{config.label}</p>
                    <p className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                      {config.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Editor Panel */}
        <div data-tour="email-templates-editor" className="lg:col-span-2 space-y-6">
          {/* Template Info */}
          <div className="rounded-3xl border border-white/10 bg-[var(--color-bg)]/40 p-6 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                  <IconComponent className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">{currentConfig?.label}</h3>
                  <p className="text-sm text-gray-400">{currentConfig?.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        // Reload template data
                        const template = templates?.find(t => t.template_type === selectedType)
                        if (template) {
                          setForm({
                            subject: template.subject || '',
                            heading: template.heading || '',
                            body_text: template.body_text || '',
                            cta_text: template.cta_text || '',
                            footer_text: template.footer_text || '',
                          })
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
                    >
                      <Undo2 className="h-4 w-4" />
                      Reset
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Edit Template
                  </button>
                )}
              </div>
            </div>

            {/* Available Variables */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Available Variables</p>
              <div className="flex flex-wrap gap-2">
                {currentConfig?.variables.map(variable => (
                  <code 
                    key={variable} 
                    className="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs rounded font-mono"
                  >
                    {variable}
                  </code>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              <TextInput
                label="Email Subject"
                value={form.subject}
                onChange={(v) => setForm(prev => ({ ...prev, subject: v }))}
                disabled={!isEditing}
                placeholder="Enter email subject line"
              />
              <TextInput
                label="Email Heading"
                value={form.heading}
                onChange={(v) => setForm(prev => ({ ...prev, heading: v }))}
                disabled={!isEditing}
                placeholder="Main heading displayed in email"
              />
              <TextAreaInput
                label="Body Text (use variables like {{voucher_value}}, {{recipient_name}})"
                value={form.body_text}
                onChange={(v) => setForm(prev => ({ ...prev, body_text: v }))}
                disabled={!isEditing}
                placeholder="Main content of the email. Use Enter for new lines."
                rows={8}
              />
              <TextInput
                label="Call-to-Action Button Text"
                value={form.cta_text}
                onChange={(v) => setForm(prev => ({ ...prev, cta_text: v }))}
                disabled={!isEditing}
                placeholder="e.g., Reset Password, View Booking, Redeem Now"
              />
              <TextAreaInput
                label="Footer Text / How to Use Instructions"
                value={form.footer_text}
                onChange={(v) => setForm(prev => ({ ...prev, footer_text: v }))}
                disabled={!isEditing}
                placeholder="Additional instructions or disclaimer. Use Enter for new lines."
                rows={4}
              />
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="rounded-3xl border border-white/10 bg-[var(--color-bg)]/40 p-6 shadow-xl">
              <p className="text-sm font-semibold text-gray-400 mb-4">Email Preview</p>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  className="w-full h-[600px] bg-[#0A0A0A]"
                />
              </div>
              <p className="mt-3 text-xs text-gray-500 text-center">
                Colors are pulled from your global branding settings
              </p>
            </div>
          )}
        </div>
      </div>

      {showTutorial && (
        <WalkthroughOverlay steps={emailTemplatesSteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
      )}
    </section>
  )
}
