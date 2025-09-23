import React from 'react'
import { render } from '@react-email/components'
import {
  MarketingEmailTemplate,
  PromotionalTemplate,
  // Newsletter uses marketing base
} from '../components/email/EmailTemplates'

const TEMPLATE_MAP = {
  marketing: MarketingEmailTemplate,
  promotional: PromotionalTemplate,
  newsletter: MarketingEmailTemplate,
}

export async function renderTemplateHtml({ templateType, subject, templateData = {}, fallbackHtml = '' }) {
  if (!templateType || templateType === 'custom') {
    return fallbackHtml || ''
  }

  const TemplateComponent = TEMPLATE_MAP[templateType]
  if (!TemplateComponent) {
    return fallbackHtml || ''
  }

  const props = { subject, ...templateData }
  const element = React.createElement(TemplateComponent, props)
  const html = await render(element)
  return typeof html === 'string' ? html : ''
}

export function buildTemplateDataFromCampaign(campaign) {
  if (!campaign) return { templateType: 'custom', templateData: {}, fallbackHtml: campaign?.body_html || '' }

  let templateType = campaign.template_type || 'custom'
  let templateData = {}
  let fallbackHtml = campaign.body_html || ''

  if (campaign.body_html && campaign.body_html.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(campaign.body_html)
      if (parsed.template_type) {
        templateType = parsed.template_type
      }
      if (parsed.templateData) {
        templateData = parsed.templateData
      }
      if (parsed.fallbackHtml) {
        fallbackHtml = parsed.fallbackHtml
      }
    } catch (error) {
      // Ignore parse errors and use existing values
    }
  }

  return { templateType, templateData, fallbackHtml }
}
