import React, { useState } from 'react'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Package,
  Users,
  BarChart3,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'

/**
 * AI Analytics Dashboard
 *
 * Free AI-powered analytics using statistical methods:
 * - Template-based P&L Summary with insights
 * - Statistical anomaly detection
 * - Branch health score (weighted algorithm)
 * - Product reorder alerts (threshold rules)
 * - Sales forecasting (moving averages)
 * - Customer segmentation (RFM-based)
 *
 * No paid API costs - all computation done locally
 */
const AIAnalyticsDashboard = ({ branchId }) => {
  const { user } = useCurrentUser()
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    health: true,
    anomalies: false,
    forecast: false,
    inventory: true,
    customers: false
  })

  // Date range for P&L (default: this month)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime()

  // Queries
  const plSummary = useQuery(
    api.services.aiAnalytics.generatePLSummary,
    branchId ? { branch_id: branchId, start_date: startOfMonth, end_date: endOfDay } : 'skip'
  )

  const healthScore = useQuery(
    api.services.aiAnalytics.getBranchHealthScore,
    branchId ? { branch_id: branchId } : 'skip'
  )

  const anomalies = useQuery(
    api.services.aiAnalytics.detectAnomalies,
    branchId ? { branch_id: branchId, days: 30 } : 'skip'
  )

  const forecast = useQuery(
    api.services.aiAnalytics.getSalesForecast,
    branchId ? { branch_id: branchId, forecast_days: 7 } : 'skip'
  )

  const reorderAlerts = useQuery(
    api.services.aiAnalytics.getReorderAlerts,
    branchId ? { branch_id: branchId } : 'skip'
  )

  const customerInsights = useQuery(
    api.services.aiAnalytics.getCustomerInsights,
    branchId ? { branch_id: branchId } : 'skip'
  )

  // Format currency
  const formatPeso = (amount) => {
    if (amount === undefined || amount === null) return '₱0'
    return `₱${amount.toLocaleString('en-PH')}`
  }

  // Toggle section
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Get health color
  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getHealthBg = (score) => {
    if (score >= 80) return 'bg-green-500/20'
    if (score >= 60) return 'bg-blue-500/20'
    if (score >= 40) return 'bg-yellow-500/20'
    return 'bg-red-500/20'
  }

  // Loading state
  if (!branchId) {
    return (
      <div className="bg-[#1E1E1E] rounded-xl p-6 border border-[#2A2A2A]">
        <div className="text-center text-gray-400 py-8">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a branch to view AI analytics</p>
        </div>
      </div>
    )
  }

  const isLoading = !plSummary || !healthScore

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            AI Analytics
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">FREE</span>
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-400" />
          AI Analytics
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">FREE</span>
        </h2>
        <div className="text-xs text-gray-500">
          Powered by statistical analysis • No API costs
        </div>
      </div>

      {/* Branch Health Score - Prominent Display */}
      <div className={`${getHealthBg(healthScore.health_score)} rounded-xl p-6 border border-[#2A2A2A]`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getHealthBg(healthScore.health_score)} border-2 ${getHealthColor(healthScore.health_score).replace('text-', 'border-')}`}>
              <span className={`text-2xl font-bold ${getHealthColor(healthScore.health_score)}`}>
                {healthScore.health_score}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Branch Health Score</h3>
              <p className={`text-sm ${getHealthColor(healthScore.health_score)}`}>
                {healthScore.status}
              </p>
            </div>
          </div>
          <Activity className={`w-8 h-8 ${getHealthColor(healthScore.health_score)}`} />
        </div>

        {/* Health Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          {Object.entries(healthScore.breakdown).map(([key, data]) => (
            <div key={key} className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-gray-400 capitalize mb-1">{key}</div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">{Math.round(data.score)}</span>
                <span className="text-xs text-gray-500">{data.weight}%</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 truncate">{data.details}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {healthScore.alerts?.length > 0 && (
          <div className="mt-4 space-y-2">
            {healthScore.alerts.map((alert, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {alert}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* P&L Summary Section */}
      <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold text-white">AI Insights - This Month</span>
          </div>
          {expandedSections.summary ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSections.summary && (
          <div className="p-4 pt-0 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#252525] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Total Revenue</div>
                <div className="text-lg font-semibold text-white">
                  {formatPeso(plSummary.summary.total_revenue)}
                </div>
                <div className={`text-xs flex items-center gap-1 ${plSummary.summary.revenue_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {plSummary.summary.revenue_change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {plSummary.summary.revenue_change.toFixed(1)}% vs last period
                </div>
              </div>
              <div className="bg-[#252525] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Services</div>
                <div className="text-lg font-semibold text-white">
                  {formatPeso(plSummary.summary.service_revenue)}
                </div>
                <div className={`text-xs flex items-center gap-1 ${plSummary.summary.service_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {plSummary.summary.service_change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {plSummary.summary.service_change.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#252525] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Products</div>
                <div className="text-lg font-semibold text-white">
                  {formatPeso(plSummary.summary.product_revenue)}
                </div>
                <div className={`text-xs flex items-center gap-1 ${plSummary.summary.product_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {plSummary.summary.product_change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {plSummary.summary.product_change.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#252525] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Transactions</div>
                <div className="text-lg font-semibold text-white">
                  {plSummary.summary.transaction_count}
                </div>
                <div className={`text-xs flex items-center gap-1 ${plSummary.summary.txn_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {plSummary.summary.txn_change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {plSummary.summary.txn_change.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">Insights</h4>
              {plSummary.insights.map((insight, idx) => (
                <div key={idx} className="bg-[#252525] rounded-lg px-4 py-2 text-sm text-gray-300">
                  {insight}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {plSummary.recommendations?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Recommendations</h4>
                {plSummary.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-purple-500/10 rounded-lg px-4 py-2 text-sm text-purple-300">
                    <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {rec}
                  </div>
                ))}
              </div>
            )}

            {/* Top Performers */}
            <div className="grid grid-cols-2 gap-3">
              {plSummary.top_performers.service && (
                <div className="bg-[#252525] rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">⭐ Top Service</div>
                  <div className="text-sm font-medium text-white">{plSummary.top_performers.service.name}</div>
                  <div className="text-xs text-gray-500">
                    {plSummary.top_performers.service.count} bookings • {formatPeso(plSummary.top_performers.service.revenue)}
                  </div>
                </div>
              )}
              {plSummary.top_performers.product && (
                <div className="bg-[#252525] rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">🏆 Top Product</div>
                  <div className="text-sm font-medium text-white">{plSummary.top_performers.product.name}</div>
                  <div className="text-xs text-gray-500">
                    {plSummary.top_performers.product.count} sold • {formatPeso(plSummary.top_performers.product.revenue)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inventory Alerts Section */}
      {reorderAlerts && (
        <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <button
            onClick={() => toggleSection('inventory')}
            className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-orange-400" />
              <span className="font-semibold text-white">Inventory Alerts</span>
              {reorderAlerts.summary.out_of_stock + reorderAlerts.summary.critical > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                  {reorderAlerts.summary.out_of_stock + reorderAlerts.summary.critical} urgent
                </span>
              )}
            </div>
            {expandedSections.inventory ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.inventory && (
            <div className="p-4 pt-0 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-red-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{reorderAlerts.summary.out_of_stock}</div>
                  <div className="text-xs text-gray-400">Out of Stock</div>
                </div>
                <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">{reorderAlerts.summary.critical}</div>
                  <div className="text-xs text-gray-400">Critical</div>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{reorderAlerts.summary.low_stock}</div>
                  <div className="text-xs text-gray-400">Low Stock</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{reorderAlerts.summary.adequate}</div>
                  <div className="text-xs text-gray-400">Adequate</div>
                </div>
              </div>

              {/* Reorder List */}
              {reorderAlerts.alerts.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reorderAlerts.alerts.slice(0, 10).map((alert, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                        alert.urgency === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                        alert.urgency === 'high' ? 'bg-orange-500/10 border border-orange-500/30' :
                        'bg-yellow-500/10 border border-yellow-500/30'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{alert.product_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            alert.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                            alert.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {alert.urgency}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{alert.reason}</div>
                        <div className="text-xs text-gray-500">{alert.sales_velocity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Stock: {alert.current_stock}</div>
                        <div className="text-sm text-green-400">Order: {alert.suggested_order}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  All products have adequate stock
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sales Forecast Section */}
      {forecast && (
        <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <button
            onClick={() => toggleSection('forecast')}
            className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">7-Day Forecast</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                forecast.statistics.trend === 'upward' ? 'bg-green-500/20 text-green-400' :
                forecast.statistics.trend === 'downward' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {forecast.statistics.trend}
              </span>
            </div>
            {expandedSections.forecast ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.forecast && (
            <div className="p-4 pt-0 space-y-4">
              {/* Forecast Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#252525] rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Predicted (7 days)</div>
                  <div className="text-lg font-semibold text-blue-400">
                    {formatPeso(forecast.total_forecast)}
                  </div>
                </div>
                <div className="bg-[#252525] rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Daily Avg (7-day)</div>
                  <div className="text-lg font-semibold text-white">
                    {formatPeso(forecast.statistics.avg_daily_7day)}
                  </div>
                </div>
                <div className="bg-[#252525] rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Trend vs 30-day</div>
                  <div className={`text-lg font-semibold ${
                    parseFloat(forecast.statistics.trend_percentage) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {parseFloat(forecast.statistics.trend_percentage) >= 0 ? '+' : ''}{forecast.statistics.trend_percentage}%
                  </div>
                </div>
              </div>

              {/* Daily Forecast */}
              <div className="grid grid-cols-7 gap-2">
                {forecast.forecast.map((day, idx) => (
                  <div key={idx} className="bg-[#252525] rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-400">{day.day_of_week}</div>
                    <div className="text-sm font-medium text-white mt-1">
                      {formatPeso(day.predicted_revenue)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Day Patterns */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Best Days (by historical avg)</h4>
                <div className="flex flex-wrap gap-2">
                  {[...forecast.day_patterns]
                    .sort((a, b) => b.average_revenue - a.average_revenue)
                    .slice(0, 3)
                    .map((day, idx) => (
                      <div key={idx} className="bg-green-500/10 rounded-lg px-3 py-1 text-sm">
                        <span className="text-white">{day.day}</span>
                        <span className="text-green-400 ml-2">{formatPeso(day.average_revenue)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Anomaly Detection Section */}
      {anomalies && (
        <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <button
            onClick={() => toggleSection('anomalies')}
            className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-white">Anomaly Detection</span>
              {(anomalies.transaction_anomalies?.length > 0 || anomalies.volume_anomalies?.length > 0) && (
                <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
                  {(anomalies.transaction_anomalies?.length || 0) + (anomalies.volume_anomalies?.length || 0)} detected
                </span>
              )}
            </div>
            {expandedSections.anomalies ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.anomalies && (
            <div className="p-4 pt-0 space-y-4">
              {anomalies.message ? (
                <div className="text-center py-4 text-gray-400">
                  {anomalies.message}
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#252525] rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Avg Transaction</div>
                      <div className="text-lg font-semibold text-white">
                        {formatPeso(anomalies.statistics.mean_transaction)}
                      </div>
                    </div>
                    <div className="bg-[#252525] rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Std Deviation</div>
                      <div className="text-lg font-semibold text-white">
                        {formatPeso(anomalies.statistics.std_deviation)}
                      </div>
                    </div>
                    <div className="bg-[#252525] rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Analyzed</div>
                      <div className="text-lg font-semibold text-white">
                        {anomalies.statistics.total_analyzed}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Anomalies */}
                  {anomalies.transaction_anomalies?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Unusual Transactions</h4>
                      {anomalies.transaction_anomalies.slice(0, 5).map((anom, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg px-4 py-2 text-sm ${
                            anom.type === 'unusually_high' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{formatPeso(anom.amount)}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(anom.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{anom.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Volume Anomalies */}
                  {anomalies.volume_anomalies?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Unusual Volume Days</h4>
                      {anomalies.volume_anomalies.slice(0, 5).map((anom, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg px-4 py-2 text-sm ${
                            anom.type === 'high_volume' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'
                          }`}
                        >
                          {anom.reason}
                        </div>
                      ))}
                    </div>
                  )}

                  {anomalies.transaction_anomalies?.length === 0 && anomalies.volume_anomalies?.length === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      No anomalies detected - all transactions within normal range
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer Insights Section */}
      {customerInsights && (
        <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <button
            onClick={() => toggleSection('customers')}
            className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold text-white">Customer Insights</span>
              <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full">
                {customerInsights.total_customers} customers
              </span>
            </div>
            {expandedSections.customers ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.customers && (
            <div className="p-4 pt-0 space-y-4">
              {/* Segment Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {customerInsights.segments.map((seg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 text-center ${
                      seg.segment === 'vip' ? 'bg-purple-500/10' :
                      seg.segment === 'loyal' ? 'bg-green-500/10' :
                      seg.segment === 'regular' ? 'bg-blue-500/10' :
                      seg.segment === 'at_risk' ? 'bg-red-500/10' :
                      'bg-cyan-500/10'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${
                      seg.segment === 'vip' ? 'text-purple-400' :
                      seg.segment === 'loyal' ? 'text-green-400' :
                      seg.segment === 'regular' ? 'text-blue-400' :
                      seg.segment === 'at_risk' ? 'text-red-400' :
                      'text-cyan-400'
                    }`}>
                      {seg.count}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{seg.segment.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatPeso(seg.total_revenue)}</div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              {customerInsights.insights?.length > 0 && (
                <div className="space-y-2">
                  {customerInsights.insights.map((insight, idx) => (
                    <div key={idx} className="bg-[#252525] rounded-lg px-4 py-2 text-sm text-gray-300">
                      {insight}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {customerInsights.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Recommendations</h4>
                  {customerInsights.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-cyan-500/10 rounded-lg px-4 py-2 text-sm text-cyan-300">
                      <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AIAnalyticsDashboard
