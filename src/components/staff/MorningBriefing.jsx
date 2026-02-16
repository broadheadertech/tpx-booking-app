import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Sparkles,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Package,
  Truck,
  Clock,
  Users,
  Star,
  ChevronRight,
} from 'lucide-react'

const URGENCY_STYLES = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const ACTION_ICONS = {
  stock: Package,
  order: Truck,
  settlement: TrendingUp,
  damage: AlertTriangle,
}

const MorningBriefing = ({ user }) => {
  const briefing = useQuery(
    api.services.morningBriefing.getMorningBriefing,
    user?.branch_id && user?._id
      ? { branch_id: user.branch_id, user_id: user._id }
      : 'skip'
  )

  if (!briefing) return null

  const TrendIcon = briefing.trends.direction === 'up'
    ? TrendingUp
    : briefing.trends.direction === 'down'
      ? TrendingDown
      : Minus

  const trendColor = briefing.trends.direction === 'up'
    ? 'text-green-400'
    : briefing.trends.direction === 'down'
      ? 'text-red-400'
      : 'text-gray-400'

  return (
    <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-[#1A1A1A] rounded-2xl border border-purple-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">
                AI Morning Briefing
              </span>
            </div>
            <h2 className="text-white text-xl font-bold">{briefing.greeting}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{briefing.date}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            <span className={`text-xs font-medium ${trendColor}`}>
              {briefing.trends.direction === 'up' ? 'Trending Up' : briefing.trends.direction === 'down' ? 'Trending Down' : 'Stable'}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Today's Schedule */}
        <div className="bg-[#1A1A1A]/80 rounded-xl p-3 border border-[#2A2A2A]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-400 text-[10px] font-medium">Today's Bookings</span>
          </div>
          <div className="text-white text-2xl font-bold">{briefing.schedule.total_bookings}</div>
          {briefing.schedule.first_booking && (
            <p className="text-gray-500 text-[10px] mt-0.5">
              {briefing.schedule.first_booking} — {briefing.schedule.last_booking}
            </p>
          )}
          {briefing.schedule.is_above_average && (
            <span className="text-green-400 text-[10px]">Above average for {briefing.date.split(',')[0]}</span>
          )}
        </div>

        {/* Yesterday Revenue */}
        <div className="bg-[#1A1A1A]/80 rounded-xl p-3 border border-[#2A2A2A]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-gray-400 text-[10px] font-medium">Yesterday</span>
          </div>
          <div className="text-white text-lg font-bold">
            ₱{briefing.yesterday.revenue.toLocaleString()}
          </div>
          <p className="text-gray-500 text-[10px] mt-0.5">
            {briefing.yesterday.transactions} transactions
          </p>
          {briefing.yesterday.vs_avg_percent !== 0 && (
            <span className={`text-[10px] font-medium ${briefing.yesterday.vs_avg_percent > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {briefing.yesterday.vs_avg_percent > 0 ? '+' : ''}{briefing.yesterday.vs_avg_percent}% vs 7-day avg
            </span>
          )}
        </div>

        {/* Today So Far */}
        <div className="bg-[#1A1A1A]/80 rounded-xl p-3 border border-[#2A2A2A]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-gray-400 text-[10px] font-medium">Today So Far</span>
          </div>
          <div className="text-white text-lg font-bold">
            ₱{briefing.today_so_far.revenue.toLocaleString()}
          </div>
          <p className="text-gray-500 text-[10px] mt-0.5">
            {briefing.today_so_far.transactions} transaction{briefing.today_so_far.transactions !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Staff */}
        <div className="bg-[#1A1A1A]/80 rounded-xl p-3 border border-[#2A2A2A]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-gray-400 text-[10px] font-medium">Active Barbers</span>
          </div>
          <div className="text-white text-2xl font-bold">
            {briefing.staff.active_barbers}
            <span className="text-gray-500 text-sm font-normal">/{briefing.staff.total_barbers}</span>
          </div>
          {briefing.yesterday.top_service && (
            <p className="text-gray-500 text-[10px] mt-0.5 truncate" title={briefing.yesterday.top_service.name}>
              <Star className="w-2.5 h-2.5 inline text-yellow-400 mr-0.5" />
              {briefing.yesterday.top_service.name}
            </p>
          )}
        </div>
      </div>

      {/* Action Items */}
      {(briefing.action_items.length > 0 || briefing.inventory.out_of_stock > 0) && (
        <div className="px-5 pb-4">
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-3">
            <h4 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2">
              Action Items
            </h4>
            <div className="space-y-1.5">
              {briefing.action_items.map((item, idx) => {
                const Icon = ACTION_ICONS[item.type] || AlertTriangle
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${URGENCY_STYLES[item.urgency]}`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1">{item.message}</span>
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Insight Footer */}
      {briefing.trends.is_busiest_day && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-[var(--color-primary)] text-xs font-medium">
              Today is your busiest day of the week — expect higher traffic!
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MorningBriefing
