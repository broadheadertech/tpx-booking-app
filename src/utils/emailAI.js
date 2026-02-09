/**
 * Email Marketing AI Utilities
 * FREE-tier algorithms using rule-based logic, statistics, and heuristics
 * No external AI APIs - $0/month cost
 */

// ============================================================================
// 1. SUBJECT LINE SUGGESTER (Template Bank)
// ============================================================================

const SUBJECT_TEMPLATES = {
  promotional: [
    "{discount}% OFF - This {dayName} Only!",
    "{firstName}, your exclusive {discount}% discount awaits",
    "Limited Time: Save {discount}% on your next visit",
    "Flash Sale: {discount}% off all services today!",
    "VIP Deal: {discount}% discount just for you, {firstName}",
    "Don't miss out - {discount}% off ends soon!",
  ],
  reminder: [
    "Time for a fresh cut, {firstName}?",
    "It's been {daysSinceVisit} days - we miss you!",
    "{firstName}, your style is calling!",
    "Ready for your next grooming session?",
    "Hey {firstName}, looking a bit shaggy?",
    "Your barber misses you, {firstName}!",
  ],
  winback: [
    "We miss you, {firstName}! Come back for {discount}% off",
    "{firstName}, it's been a while - here's a special offer",
    "Long time no see! {discount}% off to welcome you back",
    "Hey {firstName}, let's reconnect with {discount}% savings",
    "We haven't seen you in {daysSinceVisit} days - here's why you should return",
  ],
  loyalty: [
    "{firstName}, you've earned {points} points!",
    "Congratulations! You're now a {tierName} member",
    "Your loyalty rewards are waiting, {firstName}",
    "You're {pointsToNext} points away from your next reward!",
    "{firstName}, redeem your {points} points for amazing rewards",
  ],
  newsletter: [
    "What's new at {brandName} this {monthName}",
    "{firstName}, check out our latest styles",
    "This month's top trends at {brandName}",
    "Your {monthName} grooming guide is here",
    "Fresh looks, fresh feels - {monthName} edition",
  ],
  birthday: [
    "Happy Birthday, {firstName}! Here's a special gift",
    "It's your day, {firstName}! Enjoy {discount}% off",
    "{firstName}, celebrate your birthday with us!",
    "Birthday treat: {discount}% off your next service",
  ],
  appointment: [
    "Reminder: Your appointment is tomorrow, {firstName}",
    "{firstName}, see you {dayName} at {time}!",
    "Don't forget: {serviceName} with {barberName} on {date}",
    "Your grooming session is coming up!",
  ],
}

/**
 * Suggests subject lines based on campaign type and customer data
 * @param {string} campaignType - promotional, reminder, winback, loyalty, newsletter, birthday, appointment
 * @param {Object} customerData - Customer info for personalization
 * @returns {Array<string>} Array of suggested subject lines
 */
export function suggestSubjectLines(campaignType, customerData = {}) {
  const templates = SUBJECT_TEMPLATES[campaignType] || SUBJECT_TEMPLATES.promotional
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const now = new Date()
  const defaults = {
    firstName: customerData.firstName || 'Valued Customer',
    discount: customerData.discount || 20,
    daysSinceVisit: customerData.daysSinceVisit || 30,
    points: customerData.points || 0,
    pointsToNext: customerData.pointsToNext || 100,
    tierName: customerData.tierName || 'Member',
    brandName: customerData.brandName || 'Our Salon',
    monthName: monthNames[now.getMonth()],
    dayName: dayNames[now.getDay()],
    serviceName: customerData.serviceName || 'Service',
    barberName: customerData.barberName || 'Your Barber',
    date: customerData.date || 'your appointment date',
    time: customerData.time || 'scheduled time',
  }

  return templates.map(template => {
    let result = template
    Object.entries(defaults).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
    return result
  })
}

// ============================================================================
// 2. SMART EMAIL TEMPLATES (Variable Merge)
// ============================================================================

const EMAIL_BODY_TEMPLATES = {
  promotional: {
    subject: "{discount}% OFF - Limited Time Offer",
    greeting: "Hi {firstName},",
    body: `Great news! We're offering you an exclusive {discount}% discount on your next visit.

This special offer is just for our valued customers like you. Whether you need a fresh haircut, a beard trim, or a full grooming session, now is the perfect time to treat yourself.

Use code: {promoCode}
Valid until: {expiryDate}`,
    cta: "Book Now",
    footer: "See you soon at {brandName}!",
  },
  reminder: {
    subject: "It's time for your next visit, {firstName}!",
    greeting: "Hey {firstName},",
    body: `It's been {daysSinceVisit} days since your last visit - your style is probably calling for some attention!

Our team is ready to help you look your best. Don't let another day go by feeling less than fresh.`,
    cta: "Book Your Appointment",
    footer: "Your friends at {brandName}",
  },
  winback: {
    subject: "We miss you, {firstName}! Here's {discount}% off",
    greeting: "Hi {firstName},",
    body: `We noticed it's been a while since we've seen you, and we wanted to reach out.

Life gets busy, we understand! But looking good shouldn't have to wait. As a special welcome back gift, here's {discount}% off your next service.

Use code: {promoCode}
This offer expires in 7 days.`,
    cta: "Claim Your Discount",
    footer: "We'd love to see you again at {brandName}!",
  },
  loyalty: {
    subject: "You've earned {points} points, {firstName}!",
    greeting: "Congratulations {firstName}!",
    body: `Your loyalty is paying off! You've accumulated {points} points in our rewards program.

Current Tier: {tierName}
Points Balance: {points}
Points to Next Tier: {pointsToNext}

Your points can be redeemed for discounts, free services, and exclusive perks. Check out what's available in your rewards dashboard!`,
    cta: "View My Rewards",
    footer: "Thank you for being a loyal {brandName} customer!",
  },
  birthday: {
    subject: "Happy Birthday, {firstName}!",
    greeting: "Happy Birthday {firstName}!",
    body: `On your special day, we want to celebrate YOU!

As a birthday gift from the {brandName} family, enjoy {discount}% off any service this month. You deserve to look and feel amazing!

Birthday Code: {promoCode}
Valid for the entire birthday month.`,
    cta: "Redeem Birthday Gift",
    footer: "Wishing you an amazing year ahead!",
  },
}

/**
 * Generates a complete email from template
 * @param {string} templateType - promotional, reminder, winback, loyalty, birthday
 * @param {Object} data - Variables to merge into template
 * @returns {Object} Complete email object with subject, body, etc.
 */
export function generateEmailFromTemplate(templateType, data = {}) {
  const template = EMAIL_BODY_TEMPLATES[templateType] || EMAIL_BODY_TEMPLATES.promotional

  const defaults = {
    firstName: 'Valued Customer',
    discount: 20,
    daysSinceVisit: 30,
    points: 0,
    pointsToNext: 100,
    tierName: 'Member',
    brandName: 'Our Salon',
    promoCode: 'WELCOME20',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    ...data,
  }

  const mergeVariables = (text) => {
    let result = text
    Object.entries(defaults).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
    return result
  }

  return {
    subject: mergeVariables(template.subject),
    greeting: mergeVariables(template.greeting),
    body: mergeVariables(template.body),
    cta: template.cta,
    footer: mergeVariables(template.footer),
    fullText: `${mergeVariables(template.greeting)}\n\n${mergeVariables(template.body)}\n\n${mergeVariables(template.footer)}`,
  }
}

// ============================================================================
// 3. SEND TIME OPTIMIZER (Historical Statistics)
// ============================================================================

// Industry benchmarks for barbershop email engagement
const DEFAULT_ENGAGEMENT_BY_HOUR = {
  0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.02, 5: 0.03,
  6: 0.05, 7: 0.08, 8: 0.12, 9: 0.15, 10: 0.14, 11: 0.12,
  12: 0.10, 13: 0.11, 14: 0.10, 15: 0.09, 16: 0.08, 17: 0.10,
  18: 0.13, 19: 0.15, 20: 0.14, 21: 0.10, 22: 0.06, 23: 0.03,
}

const DEFAULT_ENGAGEMENT_BY_DAY = {
  0: 0.08, // Sunday
  1: 0.12, // Monday
  2: 0.15, // Tuesday
  3: 0.14, // Wednesday
  4: 0.16, // Thursday
  5: 0.13, // Friday
  6: 0.10, // Saturday
}

/**
 * Analyzes historical email data to find optimal send times
 * @param {Array} emailHistory - Array of past emails with open/click data
 * @returns {Object} Optimal send times and analysis
 */
export function analyzeSendTimes(emailHistory = []) {
  // If no history, return industry defaults
  if (!emailHistory || emailHistory.length < 10) {
    return {
      hasEnoughData: false,
      optimalHours: [9, 19, 10, 18, 8], // Morning and evening peaks
      optimalDays: [4, 2, 3, 1, 5], // Thu, Tue, Wed, Mon, Fri
      recommendations: [
        { day: 'Thursday', time: '9:00 AM', score: 0.95, reason: 'Industry best for barbershop emails' },
        { day: 'Tuesday', time: '7:00 PM', score: 0.90, reason: 'High after-work engagement' },
        { day: 'Wednesday', time: '10:00 AM', score: 0.88, reason: 'Mid-week mid-morning peak' },
      ],
      insight: 'Using industry benchmarks. Send at least 10 campaigns to get personalized recommendations.',
    }
  }

  // Analyze actual engagement data
  const hourlyEngagement = {}
  const dailyEngagement = {}

  emailHistory.forEach(email => {
    if (!email.sentAt || !email.opened) return

    const sentDate = new Date(email.sentAt)
    const hour = sentDate.getHours()
    const day = sentDate.getDay()
    const engagement = email.opened ? (email.clicked ? 2 : 1) : 0

    if (!hourlyEngagement[hour]) hourlyEngagement[hour] = { total: 0, count: 0 }
    hourlyEngagement[hour].total += engagement
    hourlyEngagement[hour].count++

    if (!dailyEngagement[day]) dailyEngagement[day] = { total: 0, count: 0 }
    dailyEngagement[day].total += engagement
    dailyEngagement[day].count++
  })

  // Calculate average engagement per hour/day
  const hourScores = Object.entries(hourlyEngagement)
    .map(([hour, data]) => ({ hour: parseInt(hour), score: data.total / data.count }))
    .sort((a, b) => b.score - a.score)

  const dayScores = Object.entries(dailyEngagement)
    .map(([day, data]) => ({ day: parseInt(day), score: data.total / data.count }))
    .sort((a, b) => b.score - a.score)

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return {
    hasEnoughData: true,
    optimalHours: hourScores.slice(0, 5).map(h => h.hour),
    optimalDays: dayScores.slice(0, 5).map(d => d.day),
    recommendations: [
      {
        day: dayNames[dayScores[0]?.day || 4],
        time: `${hourScores[0]?.hour || 9}:00`,
        score: (dayScores[0]?.score || 0) * (hourScores[0]?.score || 0) / 2,
        reason: 'Best performing combination from your data',
      },
      {
        day: dayNames[dayScores[1]?.day || 2],
        time: `${hourScores[1]?.hour || 19}:00`,
        score: (dayScores[1]?.score || 0) * (hourScores[1]?.score || 0) / 2,
        reason: 'Second best combination',
      },
    ],
    insight: `Based on ${emailHistory.length} campaigns. Best engagement on ${dayNames[dayScores[0]?.day || 4]}s at ${hourScores[0]?.hour || 9}:00.`,
    hourlyData: hourScores,
    dailyData: dayScores.map(d => ({ ...d, dayName: dayNames[d.day] })),
  }
}

/**
 * Gets recommended send time for a specific campaign
 * @param {string} campaignType - Type of campaign
 * @param {Object} audienceData - Audience characteristics
 * @returns {Object} Recommended send time
 */
export function getRecommendedSendTime(campaignType, audienceData = {}) {
  // Campaign-specific timing heuristics
  const campaignTimings = {
    promotional: { hour: 10, day: 4, reason: 'Promotional emails work best mid-morning on weekdays' },
    reminder: { hour: 9, day: 2, reason: 'Reminders are most effective early week, morning' },
    winback: { hour: 19, day: 3, reason: 'Win-back emails get attention in evening hours' },
    loyalty: { hour: 14, day: 1, reason: 'Loyalty updates work well Monday afternoon' },
    newsletter: { hour: 8, day: 0, reason: 'Newsletters get read on Sunday mornings' },
    birthday: { hour: 8, day: null, reason: 'Birthday emails should arrive first thing in the morning' },
  }

  const timing = campaignTimings[campaignType] || campaignTimings.promotional
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Adjust for audience if data available
  let adjustedHour = timing.hour
  if (audienceData.avgAge && audienceData.avgAge > 40) {
    adjustedHour = Math.max(7, timing.hour - 1) // Older audiences engage earlier
  }

  return {
    hour: adjustedHour,
    day: timing.day,
    dayName: timing.day !== null ? dayNames[timing.day] : 'On their birthday',
    formatted: `${adjustedHour}:00 ${adjustedHour < 12 ? 'AM' : 'PM'}`,
    reason: timing.reason,
  }
}

// ============================================================================
// 4. CHURN RISK SCORING (Recency Calculation)
// ============================================================================

/**
 * Calculates churn risk for a customer based on visit patterns
 * @param {Object} customer - Customer data
 * @returns {Object} Churn risk assessment
 */
export function calculateChurnRisk(customer) {
  const { lastVisit, avgDaysBetweenVisits, totalVisits, totalSpent } = customer

  // Calculate days since last visit
  const daysSinceVisit = lastVisit
    ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Use customer's own pattern or industry default (30 days for barbershop)
  const avgInterval = avgDaysBetweenVisits || 30

  // Risk scoring based on recency relative to their pattern
  let risk, score, action, urgency

  if (daysSinceVisit < avgInterval) {
    risk = 'low'
    score = Math.max(10, Math.round(20 * (daysSinceVisit / avgInterval)))
    action = 'No action needed - customer is on track'
    urgency = 'none'
  } else if (daysSinceVisit < avgInterval * 1.5) {
    risk = 'medium'
    score = Math.round(30 + 20 * ((daysSinceVisit - avgInterval) / (avgInterval * 0.5)))
    action = 'Send friendly reminder email'
    urgency = 'low'
  } else if (daysSinceVisit < avgInterval * 2) {
    risk = 'high'
    score = Math.round(50 + 25 * ((daysSinceVisit - avgInterval * 1.5) / (avgInterval * 0.5)))
    action = 'Send win-back offer with discount'
    urgency = 'medium'
  } else if (daysSinceVisit < avgInterval * 3) {
    risk = 'critical'
    score = Math.round(75 + 20 * ((daysSinceVisit - avgInterval * 2) / avgInterval))
    action = 'Send urgent win-back with significant discount'
    urgency = 'high'
  } else {
    risk = 'churned'
    score = 95 + Math.min(5, Math.floor((daysSinceVisit - avgInterval * 3) / avgInterval))
    action = 'Last attempt re-activation or mark as inactive'
    urgency = 'critical'
  }

  // Adjust score based on customer value
  const valueMultiplier = totalSpent > 5000 ? 1.2 : totalSpent > 2000 ? 1.1 : 1

  return {
    risk,
    score: Math.min(100, Math.round(score * valueMultiplier)),
    daysSinceVisit,
    expectedInterval: avgInterval,
    daysOverdue: Math.max(0, daysSinceVisit - avgInterval),
    action,
    urgency,
    suggestedDiscount: risk === 'critical' ? 25 : risk === 'high' ? 20 : risk === 'medium' ? 10 : 0,
    emailType: risk === 'churned' ? 'winback' : risk === 'critical' ? 'winback' : risk === 'high' ? 'winback' : 'reminder',
    customerValue: totalSpent > 5000 ? 'VIP' : totalSpent > 2000 ? 'High' : totalSpent > 500 ? 'Medium' : 'Standard',
  }
}

/**
 * Batch calculate churn risk for multiple customers
 * @param {Array} customers - Array of customer data
 * @returns {Object} Categorized customers by risk level
 */
export function segmentByChurnRisk(customers) {
  const segments = {
    low: [],
    medium: [],
    high: [],
    critical: [],
    churned: [],
  }

  customers.forEach(customer => {
    const assessment = calculateChurnRisk(customer)
    segments[assessment.risk].push({
      ...customer,
      churnAssessment: assessment,
    })
  })

  // Sort each segment by score (highest risk first)
  Object.keys(segments).forEach(key => {
    segments[key].sort((a, b) => b.churnAssessment.score - a.churnAssessment.score)
  })

  return {
    segments,
    summary: {
      total: customers.length,
      low: segments.low.length,
      medium: segments.medium.length,
      high: segments.high.length,
      critical: segments.critical.length,
      churned: segments.churned.length,
      atRisk: segments.medium.length + segments.high.length + segments.critical.length,
      atRiskPercentage: Math.round((segments.medium.length + segments.high.length + segments.critical.length) / customers.length * 100),
    },
  }
}

// ============================================================================
// 5. RFM SMART SEGMENTS (Scoring Algorithm)
// ============================================================================

/**
 * Score recency (days since last visit)
 * @param {number} days - Days since last visit
 * @returns {number} Score 1-5
 */
function scoreRecency(days) {
  if (days <= 14) return 5
  if (days <= 30) return 4
  if (days <= 60) return 3
  if (days <= 90) return 2
  return 1
}

/**
 * Score frequency (total visits in last year)
 * @param {number} visits - Number of visits
 * @returns {number} Score 1-5
 */
function scoreFrequency(visits) {
  if (visits >= 24) return 5 // Twice a month
  if (visits >= 12) return 4 // Monthly
  if (visits >= 6) return 3 // Every 2 months
  if (visits >= 3) return 2 // Quarterly
  return 1
}

/**
 * Score monetary (total spent)
 * @param {number} amount - Total amount spent
 * @returns {number} Score 1-5
 */
function scoreMonetary(amount) {
  if (amount >= 10000) return 5
  if (amount >= 5000) return 4
  if (amount >= 2000) return 3
  if (amount >= 500) return 2
  return 1
}

// RFM Segment definitions
const RFM_SEGMENTS = {
  '555': { name: 'Champions', description: 'Best customers - very recent, frequent, high spenders', color: '#22C55E', priority: 1 },
  '554': { name: 'Loyal Customers', description: 'Great customers who visit often', color: '#10B981', priority: 2 },
  '553': { name: 'Loyal Customers', description: 'Great customers who visit often', color: '#10B981', priority: 2 },
  '545': { name: 'Loyal Customers', description: 'Great customers who visit often', color: '#10B981', priority: 2 },
  '544': { name: 'Potential Loyalists', description: 'Recent customers with potential', color: '#3B82F6', priority: 3 },
  '543': { name: 'Potential Loyalists', description: 'Recent customers with potential', color: '#3B82F6', priority: 3 },
  '534': { name: 'Potential Loyalists', description: 'Recent customers with potential', color: '#3B82F6', priority: 3 },
  '533': { name: 'Potential Loyalists', description: 'Recent customers with potential', color: '#3B82F6', priority: 3 },
  '525': { name: 'New Customers', description: 'Recently acquired, high value potential', color: '#6366F1', priority: 4 },
  '524': { name: 'New Customers', description: 'Recently acquired, high value potential', color: '#6366F1', priority: 4 },
  '523': { name: 'New Customers', description: 'Recently acquired, high value potential', color: '#6366F1', priority: 4 },
  '515': { name: 'New Customers', description: 'Recently acquired, high value potential', color: '#6366F1', priority: 4 },
  '514': { name: 'New Customers', description: 'Recently acquired, high value potential', color: '#6366F1', priority: 4 },
  '513': { name: 'New Customers', description: 'Recently acquired, high value potential', color: '#6366F1', priority: 4 },
  '512': { name: 'New Customers', description: 'Recently acquired, low value so far', color: '#8B5CF6', priority: 5 },
  '511': { name: 'New Customers', description: 'Recently acquired, low value so far', color: '#8B5CF6', priority: 5 },
  '455': { name: 'About to Sleep', description: 'Once great, decreasing activity', color: '#F59E0B', priority: 6 },
  '454': { name: 'About to Sleep', description: 'Once great, decreasing activity', color: '#F59E0B', priority: 6 },
  '445': { name: 'About to Sleep', description: 'Once great, decreasing activity', color: '#F59E0B', priority: 6 },
  '355': { name: 'At Risk', description: 'High value but slipping away', color: '#EF4444', priority: 7 },
  '354': { name: 'At Risk', description: 'High value but slipping away', color: '#EF4444', priority: 7 },
  '345': { name: 'At Risk', description: 'High value but slipping away', color: '#EF4444', priority: 7 },
  '344': { name: 'At Risk', description: 'High value but slipping away', color: '#EF4444', priority: 7 },
  '255': { name: "Can't Lose Them", description: 'High value customers going dormant', color: '#DC2626', priority: 8 },
  '254': { name: "Can't Lose Them", description: 'High value customers going dormant', color: '#DC2626', priority: 8 },
  '245': { name: "Can't Lose Them", description: 'High value customers going dormant', color: '#DC2626', priority: 8 },
  '155': { name: "Can't Lose Them", description: 'High value customers going dormant', color: '#DC2626', priority: 8 },
  '154': { name: "Can't Lose Them", description: 'High value customers going dormant', color: '#DC2626', priority: 8 },
  '145': { name: "Can't Lose Them", description: 'High value customers going dormant', color: '#DC2626', priority: 8 },
  '333': { name: 'Need Attention', description: 'Average customers needing engagement', color: '#F97316', priority: 9 },
  '332': { name: 'Need Attention', description: 'Average customers needing engagement', color: '#F97316', priority: 9 },
  '323': { name: 'Need Attention', description: 'Average customers needing engagement', color: '#F97316', priority: 9 },
  '322': { name: 'Need Attention', description: 'Average customers needing engagement', color: '#F97316', priority: 9 },
  '233': { name: 'Hibernating', description: 'Inactive customers, low recent engagement', color: '#6B7280', priority: 10 },
  '232': { name: 'Hibernating', description: 'Inactive customers, low recent engagement', color: '#6B7280', priority: 10 },
  '223': { name: 'Hibernating', description: 'Inactive customers, low recent engagement', color: '#6B7280', priority: 10 },
  '222': { name: 'Hibernating', description: 'Inactive customers, low recent engagement', color: '#6B7280', priority: 10 },
  '111': { name: 'Lost Customers', description: 'Inactive for extended period', color: '#374151', priority: 11 },
  '112': { name: 'Lost Customers', description: 'Inactive for extended period', color: '#374151', priority: 11 },
  '121': { name: 'Lost Customers', description: 'Inactive for extended period', color: '#374151', priority: 11 },
  '122': { name: 'Lost Customers', description: 'Inactive for extended period', color: '#374151', priority: 11 },
  '211': { name: 'Lost Customers', description: 'Inactive for extended period', color: '#374151', priority: 11 },
  '212': { name: 'Lost Customers', description: 'Inactive for extended period', color: '#374151', priority: 11 },
  '221': { name: 'Lost Customers', description: 'Inactive for extended period', color: '#374151', priority: 11 },
}

// Marketing strategies per segment
const SEGMENT_STRATEGIES = {
  'Champions': {
    emailType: 'loyalty',
    discount: 0,
    message: 'Reward their loyalty, ask for reviews and referrals',
    actions: ['Send VIP perks', 'Ask for referrals', 'Request reviews', 'Early access to new services'],
  },
  'Loyal Customers': {
    emailType: 'loyalty',
    discount: 5,
    message: 'Upsell higher value services, loyalty program promotions',
    actions: ['Promote loyalty rewards', 'Upsell premium services', 'Birthday rewards'],
  },
  'Potential Loyalists': {
    emailType: 'promotional',
    discount: 10,
    message: 'Offer membership, engage with valuable content',
    actions: ['Loyalty program invite', 'Service recommendations', 'Personalized tips'],
  },
  'New Customers': {
    emailType: 'promotional',
    discount: 15,
    message: 'Build relationship with onboarding sequence',
    actions: ['Welcome series', 'First-time visitor tips', 'Style consultation offer'],
  },
  'About to Sleep': {
    emailType: 'reminder',
    discount: 15,
    message: 'Re-engage with personalized offers before they leave',
    actions: ['Time-limited discount', 'We miss you message', 'New service announcement'],
  },
  'At Risk': {
    emailType: 'winback',
    discount: 20,
    message: 'Strong win-back campaign with urgency',
    actions: ['Significant discount', 'Personal outreach', 'Feedback request'],
  },
  "Can't Lose Them": {
    emailType: 'winback',
    discount: 25,
    message: 'Aggressive reactivation for high-value customers',
    actions: ['Best offer available', 'Personal call', 'VIP treatment promise'],
  },
  'Need Attention': {
    emailType: 'reminder',
    discount: 10,
    message: 'Create engagement with limited offers',
    actions: ['Engagement campaign', 'Preference survey', 'Service spotlight'],
  },
  'Hibernating': {
    emailType: 'winback',
    discount: 20,
    message: 'Attempt reactivation with compelling offer',
    actions: ['Win-back campaign', 'Feedback survey', 'Major discount'],
  },
  'Lost Customers': {
    emailType: 'winback',
    discount: 30,
    message: 'Last attempt before marking inactive',
    actions: ['Final win-back attempt', 'Exit survey', 'Remove from active list if no response'],
  },
}

/**
 * Calculate RFM score and segment for a customer
 * @param {Object} customer - Customer with lastVisit, totalVisits, totalSpent
 * @returns {Object} RFM analysis
 */
export function calculateRFM(customer) {
  const { lastVisit, totalVisits, totalSpent } = customer

  // Calculate days since last visit
  const daysSinceVisit = lastVisit
    ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Calculate individual scores
  const recency = scoreRecency(daysSinceVisit)
  const frequency = scoreFrequency(totalVisits || 0)
  const monetary = scoreMonetary(totalSpent || 0)

  // Create RFM string
  const rfmScore = `${recency}${frequency}${monetary}`

  // Get segment info
  const segmentInfo = RFM_SEGMENTS[rfmScore] || {
    name: 'Regular',
    description: 'Standard customer',
    color: '#6B7280',
    priority: 10
  }

  // Get strategy
  const strategy = SEGMENT_STRATEGIES[segmentInfo.name] || SEGMENT_STRATEGIES['Need Attention']

  return {
    rfmScore,
    scores: { recency, frequency, monetary },
    segment: segmentInfo.name,
    description: segmentInfo.description,
    color: segmentInfo.color,
    priority: segmentInfo.priority,
    strategy,
    metrics: {
      daysSinceVisit,
      totalVisits: totalVisits || 0,
      totalSpent: totalSpent || 0,
    },
  }
}

/**
 * Segment all customers by RFM
 * @param {Array} customers - Array of customer objects
 * @returns {Object} Customers grouped by segment
 */
export function segmentByRFM(customers) {
  const segments = {}
  const allAnalyzed = []

  customers.forEach(customer => {
    const analysis = calculateRFM(customer)
    const segmentName = analysis.segment

    if (!segments[segmentName]) {
      segments[segmentName] = {
        name: segmentName,
        description: analysis.description,
        color: analysis.color,
        strategy: analysis.strategy,
        customers: [],
        totalValue: 0,
      }
    }

    segments[segmentName].customers.push({
      ...customer,
      rfmAnalysis: analysis,
    })
    segments[segmentName].totalValue += customer.totalSpent || 0

    allAnalyzed.push({
      ...customer,
      rfmAnalysis: analysis,
    })
  })

  // Sort segments by priority
  const sortedSegments = Object.values(segments).sort((a, b) => {
    const aPriority = SEGMENT_STRATEGIES[a.name]?.priority || 99
    const bPriority = SEGMENT_STRATEGIES[b.name]?.priority || 99
    return aPriority - bPriority
  })

  // Calculate summary statistics
  const summary = {
    total: customers.length,
    segments: sortedSegments.map(s => ({
      name: s.name,
      count: s.customers.length,
      percentage: Math.round(s.customers.length / customers.length * 100),
      totalValue: s.totalValue,
      color: s.color,
    })),
    topSegments: sortedSegments.slice(0, 5).map(s => s.name),
    atRiskCount: (segments['At Risk']?.customers.length || 0) +
                 (segments["Can't Lose Them"]?.customers.length || 0) +
                 (segments['Hibernating']?.customers.length || 0),
    championsCount: segments['Champions']?.customers.length || 0,
  }

  return {
    segments,
    sortedSegments,
    allAnalyzed,
    summary,
  }
}

// ============================================================================
// 6. A/B TEST SIGNIFICANCE CALCULATOR
// ============================================================================

/**
 * Calculate statistical significance for A/B test
 * @param {Object} variantA - { opens, sends } for variant A
 * @param {Object} variantB - { opens, sends } for variant B
 * @returns {Object} Statistical analysis
 */
export function calculateABSignificance(variantA, variantB) {
  const rateA = variantA.opens / variantA.sends
  const rateB = variantB.opens / variantB.sends

  // Pooled proportion
  const pooledRate = (variantA.opens + variantB.opens) / (variantA.sends + variantB.sends)

  // Standard error
  const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / variantA.sends + 1 / variantB.sends))

  // Z-score
  const zScore = se > 0 ? (rateA - rateB) / se : 0

  // P-value approximation (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  // Determine winner
  const isSignificant = pValue < 0.05
  const winner = isSignificant ? (rateA > rateB ? 'A' : 'B') : 'none'
  const lift = rateA > rateB
    ? ((rateA - rateB) / rateB * 100).toFixed(1)
    : ((rateB - rateA) / rateA * 100).toFixed(1)

  return {
    variantA: { rate: (rateA * 100).toFixed(2), sends: variantA.sends, opens: variantA.opens },
    variantB: { rate: (rateB * 100).toFixed(2), sends: variantB.sends, opens: variantB.opens },
    zScore: zScore.toFixed(3),
    pValue: pValue.toFixed(4),
    isSignificant,
    confidenceLevel: isSignificant ? '95%' : 'Not significant',
    winner,
    lift: `${lift}%`,
    recommendation: isSignificant
      ? `Variant ${winner} wins with ${lift}% higher open rate. Use this version.`
      : 'No significant difference yet. Need more data or the variants perform similarly.',
    minimumSampleSize: Math.ceil(16 * pooledRate * (1 - pooledRate) / Math.pow(0.05, 2)),
  }
}

// Helper: Normal CDF approximation
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp(-x * x / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

// ============================================================================
// 7. EMAIL PERFORMANCE SCORING
// ============================================================================

/**
 * Score email campaign performance
 * @param {Object} campaign - Campaign metrics
 * @returns {Object} Performance score and analysis
 */
export function scoreEmailPerformance(campaign) {
  const { sent, delivered, opened, clicked, unsubscribed, bounced } = campaign

  // Calculate rates
  const deliveryRate = sent > 0 ? delivered / sent : 0
  const openRate = delivered > 0 ? opened / delivered : 0
  const clickRate = opened > 0 ? clicked / opened : 0
  const ctr = delivered > 0 ? clicked / delivered : 0
  const unsubRate = delivered > 0 ? unsubscribed / delivered : 0
  const bounceRate = sent > 0 ? bounced / sent : 0

  // Industry benchmarks for service industry
  const benchmarks = {
    deliveryRate: 0.95,
    openRate: 0.22,
    clickRate: 0.15,
    ctr: 0.033,
    unsubRate: 0.002,
    bounceRate: 0.02,
  }

  // Score each metric (0-100)
  const scores = {
    delivery: Math.min(100, Math.round(deliveryRate / benchmarks.deliveryRate * 100)),
    opens: Math.min(100, Math.round(openRate / benchmarks.openRate * 100)),
    clicks: Math.min(100, Math.round(clickRate / benchmarks.clickRate * 100)),
    engagement: Math.min(100, Math.round(ctr / benchmarks.ctr * 100)),
    health: Math.max(0, 100 - Math.round(unsubRate / benchmarks.unsubRate * 100)),
  }

  // Overall score (weighted average)
  const overallScore = Math.round(
    scores.delivery * 0.15 +
    scores.opens * 0.30 +
    scores.clicks * 0.25 +
    scores.engagement * 0.20 +
    scores.health * 0.10
  )

  // Grade
  const grade = overallScore >= 90 ? 'A' :
                overallScore >= 80 ? 'B' :
                overallScore >= 70 ? 'C' :
                overallScore >= 60 ? 'D' : 'F'

  // Recommendations
  const recommendations = []
  if (scores.opens < 70) {
    recommendations.push({
      area: 'Subject Lines',
      issue: 'Low open rate',
      action: 'Test different subject lines, personalization, or send times',
    })
  }
  if (scores.clicks < 70) {
    recommendations.push({
      area: 'Content',
      issue: 'Low click-through rate',
      action: 'Improve call-to-action, content relevance, or email design',
    })
  }
  if (scores.health < 70) {
    recommendations.push({
      area: 'List Health',
      issue: 'High unsubscribe rate',
      action: 'Review email frequency, content relevance, and segmentation',
    })
  }
  if (scores.delivery < 90) {
    recommendations.push({
      area: 'Deliverability',
      issue: 'Delivery issues',
      action: 'Clean email list, check spam scores, verify sender reputation',
    })
  }

  return {
    rates: {
      deliveryRate: (deliveryRate * 100).toFixed(1),
      openRate: (openRate * 100).toFixed(1),
      clickRate: (clickRate * 100).toFixed(1),
      ctr: (ctr * 100).toFixed(2),
      unsubRate: (unsubRate * 100).toFixed(2),
      bounceRate: (bounceRate * 100).toFixed(2),
    },
    scores,
    overallScore,
    grade,
    benchmarks: {
      deliveryRate: (benchmarks.deliveryRate * 100).toFixed(0),
      openRate: (benchmarks.openRate * 100).toFixed(0),
      clickRate: (benchmarks.clickRate * 100).toFixed(0),
      ctr: (benchmarks.ctr * 100).toFixed(1),
    },
    recommendations,
    summary: `Campaign scored ${grade} (${overallScore}/100). ${
      recommendations.length > 0
        ? `Focus on: ${recommendations.map(r => r.area).join(', ')}`
        : 'Great performance across all metrics!'
    }`,
  }
}

// ============================================================================
// 8. CONTENT ANALYZER (Spam Score)
// ============================================================================

const SPAM_TRIGGERS = [
  { pattern: /free/gi, weight: 1 },
  { pattern: /act now/gi, weight: 3 },
  { pattern: /limited time/gi, weight: 2 },
  { pattern: /click here/gi, weight: 2 },
  { pattern: /buy now/gi, weight: 2 },
  { pattern: /winner/gi, weight: 3 },
  { pattern: /congratulations/gi, weight: 2 },
  { pattern: /!!+/g, weight: 2 },
  { pattern: /\$\$+/g, weight: 3 },
  { pattern: /100%/gi, weight: 2 },
  { pattern: /guarantee/gi, weight: 1 },
  { pattern: /urgent/gi, weight: 2 },
  { pattern: /expires/gi, weight: 1 },
  { pattern: /ALL CAPS WORDS/g, weight: 1 },
]

/**
 * Analyze email content for spam triggers
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {Object} Spam analysis
 */
export function analyzeEmailContent(subject, body) {
  const content = `${subject} ${body}`
  let spamScore = 0
  const triggers = []

  // Check for spam triggers
  SPAM_TRIGGERS.forEach(({ pattern, weight }) => {
    const matches = content.match(pattern)
    if (matches) {
      spamScore += weight * matches.length
      triggers.push({ trigger: pattern.source, count: matches.length, weight })
    }
  })

  // Check for ALL CAPS in subject
  const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.length
  if (capsRatio > 0.5) {
    spamScore += 3
    triggers.push({ trigger: 'Excessive capitals in subject', count: 1, weight: 3 })
  }

  // Check subject length
  if (subject.length > 60) {
    spamScore += 1
    triggers.push({ trigger: 'Long subject line', count: 1, weight: 1 })
  }

  // Normalize score (0-100)
  const normalizedScore = Math.min(100, spamScore * 5)

  // Risk level
  const riskLevel = normalizedScore < 20 ? 'low' :
                    normalizedScore < 40 ? 'medium' :
                    normalizedScore < 60 ? 'high' : 'critical'

  // Recommendations
  const recommendations = []
  if (triggers.length > 0) {
    recommendations.push(`Avoid or reduce: ${triggers.map(t => t.trigger).join(', ')}`)
  }
  if (capsRatio > 0.3) {
    recommendations.push('Use sentence case in subject line')
  }
  if (subject.length > 50) {
    recommendations.push('Keep subject line under 50 characters')
  }

  return {
    spamScore: normalizedScore,
    riskLevel,
    triggers,
    subjectLength: subject.length,
    recommendations,
    verdict: riskLevel === 'low' ? 'Good to send' :
             riskLevel === 'medium' ? 'Consider revisions' :
             riskLevel === 'high' ? 'High spam risk - revise content' :
             'Critical - do not send without major changes',
  }
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export default {
  // Subject Lines
  suggestSubjectLines,

  // Templates
  generateEmailFromTemplate,
  EMAIL_BODY_TEMPLATES,

  // Send Time
  analyzeSendTimes,
  getRecommendedSendTime,

  // Churn
  calculateChurnRisk,
  segmentByChurnRisk,

  // RFM
  calculateRFM,
  segmentByRFM,

  // A/B Testing
  calculateABSignificance,

  // Performance
  scoreEmailPerformance,

  // Content
  analyzeEmailContent,
}
