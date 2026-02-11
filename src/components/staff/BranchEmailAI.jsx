/**
 * Branch Email AI Dashboard
 * AI-powered email marketing scoped to branch visiting customers
 * Uses customerBranchActivity for branch-specific data
 */
import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useBranding } from '../../context/BrandingContext'
import {
  Mail,
  Brain,
  Sparkles,
  Clock,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
  Send,
  FileText,
  ChevronRight,
  Copy,
  Wand2,
  Lightbulb,
  Activity,
  UserMinus,
  Crown,
  Star,
  Timer,
  Percent,
  Rocket,
  Eye,
  Play,
  X,
  Loader2,
} from 'lucide-react'
import {
  suggestSubjectLines,
  generateEmailFromTemplate,
  analyzeSendTimes,
  getRecommendedSendTime,
  segmentByChurnRisk,
  segmentByRFM,
  analyzeEmailContent,
} from '../../utils/emailAI'

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================

const AIInsightCard = ({ title, icon: Icon, children, color = 'purple' }) => (
  <div className="bg-gradient-to-br from-[#1E1E1E] to-[#252525] rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-${color}-500/20`}>
          <Icon className={`w-5 h-5 text-${color}-400`} />
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
    </div>
    {children}
  </div>
)

const MetricBadge = ({ value, label, good = true }) => (
  <div className="flex items-center gap-2">
    <span className="text-2xl font-bold text-white">{value}</span>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  </div>
)

// ============================================================================
// SUBJECT LINE SUGGESTER
// ============================================================================

const SubjectLineSuggester = ({ brandName }) => {
  const [campaignType, setCampaignType] = useState('promotional')
  const [customerData, setCustomerData] = useState({
    firstName: 'Customer',
    discount: 20,
    daysSinceVisit: 30,
    points: 500,
  })
  const [copiedIndex, setCopiedIndex] = useState(null)

  const suggestions = useMemo(() => {
    return suggestSubjectLines(campaignType, { ...customerData, brandName })
  }, [campaignType, customerData, brandName])

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const campaignTypes = [
    { id: 'promotional', label: 'Promo', icon: Zap },
    { id: 'reminder', label: 'Reminder', icon: Clock },
    { id: 'winback', label: 'Win-back', icon: UserMinus },
    { id: 'loyalty', label: 'Loyalty', icon: Crown },
    { id: 'newsletter', label: 'Newsletter', icon: FileText },
    { id: 'birthday', label: 'Birthday', icon: Star },
  ]

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Campaign Type</label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {campaignTypes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCampaignType(id)}
              className={`p-3 rounded-xl border text-center transition-all ${
                campaignType === id
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">First Name</label>
          <input
            type="text"
            value={customerData.firstName}
            onChange={(e) => setCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Discount %</label>
          <input
            type="number"
            value={customerData.discount}
            onChange={(e) => setCustomerData(prev => ({ ...prev, discount: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Days Since Visit</label>
          <input
            type="number"
            value={customerData.daysSinceVisit}
            onChange={(e) => setCustomerData(prev => ({ ...prev, daysSinceVisit: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Points Balance</label>
          <input
            type="number"
            value={customerData.points}
            onChange={(e) => setCustomerData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">AI-Suggested Subject Lines</h3>
          <span className="text-xs text-gray-500">({suggestions.length} options)</span>
        </div>
        <div className="space-y-2">
          {suggestions.map((subject, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <span className="text-gray-200">{subject}</span>
              <button
                onClick={() => handleCopy(subject, index)}
                className="p-2 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedIndex === index ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SEND TIME OPTIMIZER
// ============================================================================

const SendTimeOptimizer = () => {
  const [campaignType, setCampaignType] = useState('promotional')

  const analysis = useMemo(() => analyzeSendTimes([]), [])
  const recommendation = useMemo(() => getRecommendedSendTime(campaignType), [campaignType])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Campaign Type</label>
        <select
          value={campaignType}
          onChange={(e) => setCampaignType(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
        >
          <option value="promotional">Promotional</option>
          <option value="reminder">Reminder</option>
          <option value="winback">Win-back</option>
          <option value="loyalty">Loyalty Update</option>
          <option value="newsletter">Newsletter</option>
          <option value="birthday">Birthday</option>
        </select>
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-purple-500/30">
            <Timer className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Recommended Send Time</h3>
            <p className="text-sm text-gray-400">Based on industry benchmarks for barbershops</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-black/30">
            <p className="text-sm text-gray-400 mb-1">Best Day</p>
            <p className="text-2xl font-bold text-white">{recommendation.dayName}</p>
          </div>
          <div className="p-4 rounded-xl bg-black/30">
            <p className="text-sm text-gray-400 mb-1">Best Time</p>
            <p className="text-2xl font-bold text-white">{recommendation.formatted}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-300">
          <Lightbulb className="w-4 h-4 inline mr-2 text-yellow-400" />
          {recommendation.reason}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-4">Engagement Heatmap (Industry Benchmark)</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-1">
            <div className="w-12" />
            {dayNames.map(day => (
              <div key={day} className="w-8 text-center text-xs text-gray-500">{day}</div>
            ))}
          </div>
          {[8, 9, 10, 11, 12, 13, 14, 17, 18, 19, 20].map(hour => (
            <div key={hour} className="flex gap-1 mt-1">
              <div className="w-12 text-xs text-gray-500 text-right pr-2">{hour}:00</div>
              {dayNames.map((_, dayIndex) => {
                const intensity = (analysis.optimalHours.includes(hour) ? 0.5 : 0.2) +
                                 (analysis.optimalDays.includes(dayIndex) ? 0.3 : 0.1)
                return (
                  <div
                    key={dayIndex}
                    className="w-8 h-6 rounded"
                    style={{
                      backgroundColor: `rgba(168, 85, 247, ${Math.min(intensity, 0.9)})`,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-purple-500/20" /> Low
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-purple-500/50" /> Medium
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-purple-500/90" /> High
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CHURN RISK ANALYZER
// ============================================================================

const ChurnRiskAnalyzer = ({ customers }) => {
  const churnSegments = useMemo(() => {
    if (!customers || customers.length === 0) return null

    const mappedCustomers = customers.map(c => ({
      ...c,
      name: c.customer_name,
      email: c.customer_email,
      lastVisit: c.last_visit_date,
      avgDaysBetweenVisits: c.total_bookings > 1
        ? Math.floor((Date.now() - c.first_visit_date) / (c.total_bookings * 86400000))
        : 30,
      totalVisits: c.total_bookings || 1,
      totalSpent: c.total_spent || 0,
    }))

    return segmentByChurnRisk(mappedCustomers)
  }, [customers])

  if (!churnSegments) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Customer Data</h3>
        <p className="text-gray-400">No visiting customers found for this branch yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(churnSegments.summary).filter(([key]) => key !== 'total' && key !== 'atRisk' && key !== 'atRiskPercentage').map(([key, value]) => (
          <div
            key={key}
            className={`p-4 rounded-xl border ${
              key === 'critical' || key === 'churned' ? 'border-red-500/30 bg-red-500/10' :
              key === 'high' ? 'border-orange-500/30 bg-orange-500/10' :
              key === 'medium' ? 'border-yellow-500/30 bg-yellow-500/10' :
              'border-green-500/30 bg-green-500/10'
            }`}
          >
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 capitalize">{key} Risk</p>
          </div>
        ))}
      </div>

      {churnSegments.summary.atRisk > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-white">
              {churnSegments.summary.atRisk} Customers At Risk ({churnSegments.summary.atRiskPercentage}%)
            </h4>
            <p className="text-sm text-gray-400 mt-1">
              These customers need immediate attention. Consider sending win-back campaigns with personalized offers.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {['critical', 'high', 'medium'].map(risk => {
          const segment = churnSegments.segments[risk]
          if (!segment || segment.length === 0) return null

          return (
            <div key={risk} className="rounded-xl border border-white/10 overflow-hidden">
              <div className={`px-4 py-3 ${
                risk === 'critical' ? 'bg-red-500/20' :
                risk === 'high' ? 'bg-orange-500/20' :
                'bg-yellow-500/20'
              }`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white capitalize">{risk} Risk ({segment.length})</h4>
                  <span className="text-xs text-gray-300">
                    Recommended: {segment[0]?.churnAssessment?.action}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-white/5">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {segment.slice(0, 10).map((customer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-black/30"
                    >
                      <div>
                        <p className="text-white font-medium">{customer.name || customer.email || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">
                          Last visit: {customer.churnAssessment.daysSinceVisit} days ago |
                          Score: {customer.churnAssessment.score}/100
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          customer.churnAssessment.suggestedDiscount > 20 ? 'bg-red-500/20 text-red-300' :
                          customer.churnAssessment.suggestedDiscount > 10 ? 'bg-orange-500/20 text-orange-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          Offer {customer.churnAssessment.suggestedDiscount}% off
                        </span>
                      </div>
                    </div>
                  ))}
                  {segment.length > 10 && (
                    <p className="text-center text-sm text-gray-500 pt-2">
                      +{segment.length - 10} more customers
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// RFM SEGMENTS
// ============================================================================

const RFMSegments = ({ customers }) => {
  const rfmData = useMemo(() => {
    if (!customers || customers.length === 0) return null

    const mappedCustomers = customers.map(c => ({
      ...c,
      name: c.customer_name,
      email: c.customer_email,
      lastVisit: c.last_visit_date,
      totalVisits: c.total_bookings || 1,
      totalSpent: c.total_spent || 0,
    }))

    return segmentByRFM(mappedCustomers)
  }, [customers])

  if (!rfmData) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Customer Data</h3>
        <p className="text-gray-400">No visiting customers found for this branch yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Champions</span>
          </div>
          <p className="text-2xl font-bold text-white">{rfmData.summary.championsCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-white">{rfmData.summary.atRiskCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Total Segments</span>
          </div>
          <p className="text-2xl font-bold text-white">{rfmData.summary.segments.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Customers</span>
          </div>
          <p className="text-2xl font-bold text-white">{rfmData.summary.total}</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="font-semibold text-white mb-4">Segment Distribution</h3>
        <div className="space-y-3">
          {rfmData.summary.segments.map((segment, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-sm text-gray-300">{segment.name}</span>
                </div>
                <span className="text-sm text-gray-400">{segment.count} ({segment.percentage}%)</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: segment.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rfmData.sortedSegments.slice(0, 6).map((segment, index) => (
          <div
            key={index}
            className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <h4 className="font-semibold text-white">{segment.name}</h4>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300">
                {segment.customers.length} customers
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-3">{segment.description}</p>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Recommended Actions:</p>
              <div className="flex flex-wrap gap-2">
                {segment.strategy?.actions.slice(0, 2).map((action, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
            {segment.strategy?.discount > 0 && (
              <p className="mt-3 text-xs text-yellow-400">
                <Percent className="w-3 h-3 inline mr-1" />
                Suggested discount: {segment.strategy.discount}% off
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// AI CAMPAIGN GENERATOR
// ============================================================================

const AICampaignGenerator = ({ customers, brandName, brandColor }) => {
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [generatedCampaign, setGeneratedCampaign] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 })
  const [sendComplete, setSendComplete] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const sendMarketingEmail = useAction(api.services.resendEmail.sendMarketingEmail)
  const generateEmailHtml = useAction(api.services.resendEmail.generateEmailHtml)

  // Build segments from branch customer data
  const segments = useMemo(() => {
    if (!customers || customers.length === 0) return []

    const mappedCustomers = customers.map(c => ({
      ...c,
      name: c.customer_name,
      email: c.customer_email,
      lastVisit: c.last_visit_date,
      avgDaysBetweenVisits: c.total_bookings > 1
        ? Math.floor((Date.now() - c.first_visit_date) / (c.total_bookings * 86400000))
        : 30,
      totalVisits: c.total_bookings || 1,
      totalSpent: c.total_spent || 0,
    }))

    const churnData = segmentByChurnRisk(mappedCustomers)
    const rfmData = segmentByRFM(mappedCustomers)

    const campaignSegments = []

    if (churnData.segments.critical.length > 0) {
      campaignSegments.push({
        id: 'critical_churn',
        name: 'Critical Churn Risk',
        description: 'Customers about to leave - urgent win-back needed',
        customers: churnData.segments.critical,
        count: churnData.segments.critical.length,
        color: '#EF4444',
        campaignType: 'winback',
        suggestedDiscount: 25,
        urgency: 'critical',
        emailType: 'winback',
      })
    }

    if (churnData.segments.high.length > 0) {
      campaignSegments.push({
        id: 'high_churn',
        name: 'High Churn Risk',
        description: 'Customers slipping away - needs attention',
        customers: churnData.segments.high,
        count: churnData.segments.high.length,
        color: '#F97316',
        campaignType: 'winback',
        suggestedDiscount: 20,
        urgency: 'high',
        emailType: 'winback',
      })
    }

    if (churnData.segments.medium.length > 0) {
      campaignSegments.push({
        id: 'medium_churn',
        name: 'Medium Risk - Reminder',
        description: 'Time for a friendly reminder',
        customers: churnData.segments.medium,
        count: churnData.segments.medium.length,
        color: '#EAB308',
        campaignType: 'reminder',
        suggestedDiscount: 10,
        urgency: 'medium',
        emailType: 'reminder',
      })
    }

    const champions = rfmData.segments['Champions']
    if (champions && champions.customers.length > 0) {
      campaignSegments.push({
        id: 'champions',
        name: 'Champions - VIP Reward',
        description: 'Reward your best customers',
        customers: champions.customers,
        count: champions.customers.length,
        color: '#22C55E',
        campaignType: 'loyalty',
        suggestedDiscount: 0,
        urgency: 'low',
        emailType: 'loyalty',
      })
    }

    const potentialLoyalists = rfmData.segments['Potential Loyalists']
    if (potentialLoyalists && potentialLoyalists.customers.length > 0) {
      campaignSegments.push({
        id: 'potential_loyalists',
        name: 'Potential Loyalists - Promo',
        description: 'Convert them into regulars',
        customers: potentialLoyalists.customers,
        count: potentialLoyalists.customers.length,
        color: '#3B82F6',
        campaignType: 'promotional',
        suggestedDiscount: 15,
        urgency: 'medium',
        emailType: 'promotional',
      })
    }

    return campaignSegments
  }, [customers])

  const handleGenerateCampaign = useCallback((segment) => {
    setSelectedSegment(segment)

    const sendTime = getRecommendedSendTime(segment.emailType)
    const email = generateEmailFromTemplate(segment.emailType, {
      brandName,
      discount: segment.suggestedDiscount,
      firstName: '{firstName}',
    })

    const promoCode = `${segment.id.toUpperCase().slice(0, 6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    setGeneratedCampaign({
      segment,
      subject: email.subject,
      greeting: email.greeting,
      body: email.body,
      cta: email.cta,
      footer: email.footer,
      promoCode,
      sendTime,
      recipients: segment.customers.filter(c => c.email || c.customer_email),
    })
    setShowPreview(true)
    setSendComplete(false)
    setTestResult(null)
  }, [brandName])

  const handleSendTest = async () => {
    if (!testEmail || !generatedCampaign) return

    setTestSending(true)
    setTestResult(null)

    try {
      const { html } = await generateEmailHtml({
        templateType: generatedCampaign.segment.emailType,
        brandName,
        brandColor: brandColor || '#8B5CF6',
        subject: generatedCampaign.subject,
        greeting: generatedCampaign.greeting.replace('{firstName}', 'Test User'),
        body: generatedCampaign.body.replace(/{firstName}/g, 'Test User'),
        ctaText: generatedCampaign.cta,
        ctaUrl: 'https://tipunox.broadheader.com/customer/booking',
        footer: generatedCampaign.footer,
      })

      const result = await sendMarketingEmail({
        to: testEmail,
        toName: 'Test User',
        subject: `[TEST] ${generatedCampaign.subject}`,
        htmlContent: html,
        tags: ['test', 'branch-ai-campaign'],
      })

      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: error.message })
    } finally {
      setTestSending(false)
    }
  }

  const handleSendCampaign = async () => {
    if (!generatedCampaign) return

    setSending(true)
    setSendProgress({ sent: 0, failed: 0, total: generatedCampaign.recipients.length })

    const results = { sent: 0, failed: 0 }

    for (let i = 0; i < generatedCampaign.recipients.length; i++) {
      const recipient = generatedCampaign.recipients[i]
      const recipientEmail = recipient.email || recipient.customer_email
      const recipientName = recipient.name || recipient.customer_name || 'Valued Customer'
      const firstName = recipientName.split(' ')[0] || 'Valued Customer'

      try {
        const { html } = await generateEmailHtml({
          templateType: generatedCampaign.segment.emailType,
          brandName,
          brandColor: brandColor || '#8B5CF6',
          subject: generatedCampaign.subject.replace('{firstName}', firstName),
          greeting: generatedCampaign.greeting.replace('{firstName}', firstName),
          body: generatedCampaign.body.replace(/{firstName}/g, firstName),
          ctaText: generatedCampaign.cta,
          ctaUrl: 'https://tipunox.broadheader.com/customer/booking',
          footer: generatedCampaign.footer,
        })

        const result = await sendMarketingEmail({
          to: recipientEmail,
          toName: recipientName,
          subject: generatedCampaign.subject.replace('{firstName}', firstName),
          htmlContent: html,
          tags: ['branch-ai-campaign', generatedCampaign.segment.id],
        })

        if (result.success) {
          results.sent++
        } else {
          results.failed++
        }
      } catch (error) {
        results.failed++
      }

      setSendProgress({ sent: results.sent, failed: results.failed, total: generatedCampaign.recipients.length })

      if (i < generatedCampaign.recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    }

    setSending(false)
    setSendComplete(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Rocket className="w-6 h-6 text-purple-400" />
          AI Campaign Generator
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Target your branch's visiting customers with AI-composed emails
        </p>
      </div>

      {!showPreview && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-300">Select Target Audience</h4>
          {segments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No segments available. More customer visits needed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {segments.map((segment) => (
                <button
                  key={segment.id}
                  onClick={() => handleGenerateCampaign(segment)}
                  className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <h5 className="font-semibold text-white">{segment.name}</h5>
                    </div>
                    <span className="text-sm font-bold text-white bg-white/10 px-3 py-1 rounded-full">
                      {segment.count}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{segment.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {segment.suggestedDiscount > 0 && (
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {segment.suggestedDiscount}% off suggested
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded ${
                      segment.urgency === 'critical' ? 'bg-red-500/20 text-red-300' :
                      segment.urgency === 'high' ? 'bg-orange-500/20 text-orange-300' :
                      segment.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {segment.urgency} priority
                    </span>
                  </div>
                  <div className="mt-3 flex items-center text-purple-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <Wand2 className="w-4 h-4 mr-1" />
                    Click to generate campaign
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showPreview && generatedCampaign && (
        <div className="space-y-6">
          <button
            onClick={() => {
              setShowPreview(false)
              setGeneratedCampaign(null)
              setSelectedSegment(null)
            }}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            ← Back to segments
          </button>

          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: generatedCampaign.segment.color }}
                />
                <div>
                  <h4 className="font-semibold text-white">{generatedCampaign.segment.name}</h4>
                  <p className="text-sm text-gray-400">
                    {generatedCampaign.recipients.length} recipients with valid email
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Recommended Send Time</p>
                <p className="text-sm font-semibold text-white">
                  {generatedCampaign.sendTime.dayName} at {generatedCampaign.sendTime.formatted}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-400" />
                Email Preview
              </h4>
              <span className="text-xs text-gray-500">AI Generated</span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Subject</p>
                <p className="text-white font-medium">{generatedCampaign.subject}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Greeting</p>
                <p className="text-gray-300">{generatedCampaign.greeting}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Body</p>
                <p className="text-gray-300 whitespace-pre-line">{generatedCampaign.body}</p>
              </div>
              {generatedCampaign.cta && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Call to Action</p>
                  <span className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg font-medium">
                    {generatedCampaign.cta}
                  </span>
                </div>
              )}
              {generatedCampaign.footer && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Footer</p>
                  <p className="text-gray-400 text-sm">{generatedCampaign.footer}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              Send Test Email
            </h4>
            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter your email for testing..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
              <button
                onClick={handleSendTest}
                disabled={!testEmail || testSending}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Test
              </button>
            </div>
            {testResult && (
              <div className={`mt-3 p-3 rounded-lg ${
                testResult.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {testResult.success ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Test email sent successfully!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Failed: {testResult.error}
                  </span>
                )}
              </div>
            )}
          </div>

          {!sendComplete ? (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-green-400" />
                    Ready to Send
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">
                    {generatedCampaign.recipients.length} emails will be sent via Resend
                  </p>
                </div>
                <button
                  onClick={handleSendCampaign}
                  disabled={sending || generatedCampaign.recipients.length === 0}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Send Campaign
                    </>
                  )}
                </button>
              </div>

              {sending && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{sendProgress.sent + sendProgress.failed} / {sendProgress.total}</span>
                  </div>
                  <div className="h-3 rounded-full bg-black/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-green-400">{sendProgress.sent} sent</span>
                    {sendProgress.failed > 0 && (
                      <span className="text-red-400">{sendProgress.failed} failed</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-green-500/20 border border-green-500/30 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h4 className="text-xl font-bold text-white mb-2">Campaign Sent!</h4>
              <p className="text-gray-300">
                Successfully sent {sendProgress.sent} emails
                {sendProgress.failed > 0 && ` (${sendProgress.failed} failed)`}
              </p>
              <button
                onClick={() => {
                  setShowPreview(false)
                  setGeneratedCampaign(null)
                  setSelectedSegment(null)
                  setSendComplete(false)
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Create Another Campaign
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CONTENT ANALYZER
// ============================================================================

const ContentAnalyzer = () => {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [analysis, setAnalysis] = useState(null)

  const handleAnalyze = () => {
    if (!subject.trim()) return
    const result = analyzeEmailContent(subject, body)
    setAnalysis(result)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter your email subject line..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email Body (optional)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste your email content to analyze..."
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none"
          />
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!subject.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Wand2 className="w-5 h-5" />
          Analyze Content
        </button>
      </div>

      {analysis && (
        <div className="space-y-4">
          <div className={`p-6 rounded-2xl border ${
            analysis.riskLevel === 'low' ? 'border-green-500/30 bg-green-500/10' :
            analysis.riskLevel === 'medium' ? 'border-yellow-500/30 bg-yellow-500/10' :
            analysis.riskLevel === 'high' ? 'border-orange-500/30 bg-orange-500/10' :
            'border-red-500/30 bg-red-500/10'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Spam Score</h3>
              <span className={`text-2xl font-bold ${
                analysis.riskLevel === 'low' ? 'text-green-400' :
                analysis.riskLevel === 'medium' ? 'text-yellow-400' :
                analysis.riskLevel === 'high' ? 'text-orange-400' :
                'text-red-400'
              }`}>
                {analysis.spamScore}/100
              </span>
            </div>
            <div className="h-3 rounded-full bg-black/30 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  analysis.riskLevel === 'low' ? 'bg-green-500' :
                  analysis.riskLevel === 'medium' ? 'bg-yellow-500' :
                  analysis.riskLevel === 'high' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${analysis.spamScore}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-white">{analysis.verdict}</p>
          </div>

          {analysis.triggers.length > 0 && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="font-medium text-white mb-3">Spam Triggers Detected</h4>
              <div className="space-y-2">
                {analysis.triggers.map((trigger, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-red-500/10"
                  >
                    <span className="text-sm text-gray-300">{trigger.trigger}</span>
                    <span className="text-xs text-red-400">
                      Found {trigger.count}x (weight: {trigger.weight})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="font-medium text-white mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                    <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-medium text-white mb-3">Subject Line Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Character Count</p>
                <p className={`text-lg font-semibold ${
                  analysis.subjectLength <= 50 ? 'text-green-400' :
                  analysis.subjectLength <= 60 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {analysis.subjectLength}/50 recommended
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Risk Level</p>
                <p className={`text-lg font-semibold capitalize ${
                  analysis.riskLevel === 'low' ? 'text-green-400' :
                  analysis.riskLevel === 'medium' ? 'text-yellow-400' :
                  analysis.riskLevel === 'high' ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {analysis.riskLevel}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BranchEmailAI({ user }) {
  const { branding } = useBranding()
  const [activeTab, setActiveTab] = useState('overview')

  // Get branch customers from customerBranchActivity
  const branchCustomers = useQuery(
    api.services.customerBranchActivity.getBranchCustomers,
    user?.branch_id ? { branchId: user.branch_id } : 'skip'
  ) || []

  const churnMetrics = useQuery(
    api.services.customerBranchActivity.getBranchChurnMetrics,
    user?.branch_id ? { branchId: user.branch_id } : 'skip'
  )

  // Brand info
  const brandName = branding?.display_name || 'TipunoX Barber'
  const brandColor = branding?.primary_color || '#8B5CF6'

  // Filter to customers with email (exclude guests without email)
  const emailableCustomers = useMemo(() => {
    return branchCustomers.filter(c => c.customer_email && c.customer_email.trim() !== '')
  }, [branchCustomers])

  // Overview stats
  const overviewStats = useMemo(() => {
    if (!branchCustomers.length) return null

    const mappedCustomers = branchCustomers.map(c => ({
      ...c,
      lastVisit: c.last_visit_date,
      avgDaysBetweenVisits: c.total_bookings > 1
        ? Math.floor((Date.now() - c.first_visit_date) / (c.total_bookings * 86400000))
        : 30,
      totalVisits: c.total_bookings || 1,
      totalSpent: c.total_spent || 0,
    }))

    const churnData = segmentByChurnRisk(mappedCustomers)
    const rfmData = segmentByRFM(mappedCustomers)

    return {
      totalCustomers: branchCustomers.length,
      emailableCustomers: emailableCustomers.length,
      atRiskCustomers: churnData.summary.atRisk,
      atRiskPercentage: churnData.summary.atRiskPercentage,
      champions: rfmData.summary.championsCount,
    }
  }, [branchCustomers, emailableCustomers])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'campaigns', label: 'AI Campaigns', icon: Rocket },
    { id: 'subjects', label: 'Subject Lines', icon: Sparkles },
    { id: 'sendtime', label: 'Send Time', icon: Clock },
    { id: 'churn', label: 'Churn Risk', icon: AlertTriangle },
    { id: 'rfm', label: 'RFM Segments', icon: Target },
    { id: 'content', label: 'Content Analyzer', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold mb-1">
            <Brain className="w-4 h-4" />
            AI-POWERED
          </div>
          <h2 className="text-2xl font-bold text-white">Email Marketing AI</h2>
          <p className="text-gray-400 text-sm mt-1">
            Smart email campaigns for your branch's visiting customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">{emailableCustomers.length} emailable</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-300 text-sm font-medium">$0/month</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === id
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#222222] rounded-2xl border border-white/10 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {overviewStats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <AIInsightCard title="Branch Customers" icon={Users} color="blue">
                    <MetricBadge value={overviewStats.totalCustomers} label="total visitors" />
                  </AIInsightCard>
                  <AIInsightCard title="At Risk" icon={AlertTriangle} color="red">
                    <MetricBadge
                      value={overviewStats.atRiskCustomers}
                      label={`${overviewStats.atRiskPercentage}% of total`}
                      good={false}
                    />
                  </AIInsightCard>
                  <AIInsightCard title="Champions" icon={Crown} color="green">
                    <MetricBadge value={overviewStats.champions} label="VIP customers" />
                  </AIInsightCard>
                  <AIInsightCard title="Emailable" icon={Mail} color="purple">
                    <MetricBadge value={overviewStats.emailableCustomers} label="with email" />
                  </AIInsightCard>
                </div>

                {churnMetrics && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="font-semibold text-white mb-3">Branch Health</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-400">{churnMetrics.active_rate}%</p>
                        <p className="text-xs text-gray-400">Active</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{churnMetrics.at_risk_rate}%</p>
                        <p className="text-xs text-gray-400">At Risk</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-400">{churnMetrics.churn_rate}%</p>
                        <p className="text-xs text-gray-400">Churned</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-400">{churnMetrics.win_back_rate}%</p>
                        <p className="text-xs text-gray-400">Won Back</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('campaigns')}
                  className="w-full p-6 rounded-2xl bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-green-500/30 border border-purple-500/50 hover:border-purple-400 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500">
                        <Rocket className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">AI Campaign Generator</h3>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">
                      Target your branch's customers with AI-composed personalized emails
                    </p>
                    <div className="flex items-center text-purple-300 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                      <Wand2 className="w-4 h-4 mr-2" />
                      Start Generating Campaigns
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('subjects')}
                    className="p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 hover:border-purple-500/50 transition-all text-left group"
                  >
                    <Sparkles className="w-6 h-6 text-purple-400 mb-2" />
                    <h3 className="font-semibold text-white mb-1 text-sm">Subject Lines</h3>
                    <p className="text-xs text-gray-400">AI-powered suggestions</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('churn')}
                    className="p-5 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 hover:border-red-500/50 transition-all text-left group"
                  >
                    <AlertTriangle className="w-6 h-6 text-red-400 mb-2" />
                    <h3 className="font-semibold text-white mb-1 text-sm">At-Risk Customers</h3>
                    <p className="text-xs text-gray-400">Prevent churn with win-backs</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('rfm')}
                    className="p-5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 hover:border-blue-500/50 transition-all text-left group"
                  >
                    <Target className="w-6 h-6 text-blue-400 mb-2" />
                    <h3 className="font-semibold text-white mb-1 text-sm">Smart Segments</h3>
                    <p className="text-xs text-gray-400">RFM-based targeting</p>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Customer Data Yet</h3>
                <p className="text-gray-400">
                  Customer data will appear here once visitors complete bookings at your branch.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && <AICampaignGenerator customers={emailableCustomers} brandName={brandName} brandColor={brandColor} />}
        {activeTab === 'subjects' && <SubjectLineSuggester brandName={brandName} />}
        {activeTab === 'sendtime' && <SendTimeOptimizer />}
        {activeTab === 'churn' && <ChurnRiskAnalyzer customers={branchCustomers} />}
        {activeTab === 'rfm' && <RFMSegments customers={branchCustomers} />}
        {activeTab === 'content' && <ContentAnalyzer />}
      </div>
    </div>
  )
}
