import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Banknote,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  X,
  RefreshCw
} from 'lucide-react';

/**
 * PaymentHistory Component (Story 9.2 - FR30)
 * Branch admin view of payment transaction history
 */
export default function PaymentHistory() {
  const { user } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all'); // all, today, week, month, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const pageSize = 20;

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let start = null;
    let end = now.getTime();

    switch (dateRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
        break;
      case 'custom':
        if (customStartDate) start = new Date(customStartDate).getTime();
        if (customEndDate) end = new Date(customEndDate).setHours(23, 59, 59, 999);
        break;
      default:
        start = null;
        end = null;
    }

    return { start, end };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Query payment audit logs
  const auditData = useQuery(
    api.services.paymentAudit.getAuditLogByBranch,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          limit: pageSize,
          offset: currentPage * pageSize,
          event_type_filter: eventTypeFilter,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }
      : 'skip'
  );

  // Query booking audit trail when a booking is selected
  const bookingAuditData = useQuery(
    api.services.paymentAudit.getAuditLogByBooking,
    selectedBookingId ? { booking_id: selectedBookingId } : 'skip'
  );

  // Query payment statistics
  const statsData = useQuery(
    api.services.paymentAudit.getPaymentStatistics,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }
      : 'skip'
  );

  // Filter logs by search term (client-side)
  const filteredLogs = auditData?.logs?.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.booking_info?.booking_code?.toLowerCase().includes(search) ||
      log.booking_info?.customer_name?.toLowerCase().includes(search)
    );
  }) || [];

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (timestamp) => {
    return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
  };

  const getEventTypeLabel = (eventType) => {
    const labels = {
      link_created: 'Link Created',
      checkout_session_created: 'Checkout Created',
      payment_initiated: 'Payment Started',
      payment_completed: 'Payment Completed',
      payment_failed: 'Payment Failed',
      cash_collected: 'Cash Collected',
      booking_completed: 'Booking Completed',
    };
    return labels[eventType] || eventType;
  };

  const getEventTypeColor = (eventType) => {
    const colors = {
      link_created: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      checkout_session_created: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      payment_initiated: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      payment_completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      payment_failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      cash_collected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      booking_completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[eventType] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'payment_completed':
      case 'cash_collected':
        return <CheckCircle className="w-4 h-4" />;
      case 'payment_failed':
        return <XCircle className="w-4 h-4" />;
      case 'link_created':
      case 'checkout_session_created':
      case 'payment_initiated':
        return <CreditCard className="w-4 h-4" />;
      case 'booking_completed':
        return <Receipt className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPaymentForLabel = (paymentFor) => {
    const labels = {
      full_service: 'Full Service + Fee',
      convenience_fee: 'Convenience Fee',
      remaining_balance: 'Remaining Balance',
      full_cash: 'Full Cash Payment',
      partial: 'Partial Payment',
    };
    return labels[paymentFor] || '-';
  };

  const getPaymentForColor = (paymentFor) => {
    const colors = {
      full_service: 'bg-green-500/20 text-green-400 border-green-500/30',
      convenience_fee: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      remaining_balance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      full_cash: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      partial: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[paymentFor] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const totalPages = Math.ceil((auditData?.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Payment History</h2>
          <p className="text-gray-400 text-sm mt-1">
            View and track all payment transactions for your branch
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl p-4 border border-[#333333]">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Today's Revenue</p>
            <p className="text-2xl font-bold text-white">₱{statsData.today?.revenue?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{statsData.today?.transactions || 0} transactions</p>
          </div>
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl p-4 border border-[#333333]">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-400">₱{statsData.totalRevenue?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{statsData.totalTransactions || 0} transactions</p>
          </div>
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl p-4 border border-[#333333]">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">PayMongo</p>
            <p className="text-2xl font-bold text-blue-400">₱{statsData.paymongoRevenue?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{statsData.successfulPayments || 0} successful</p>
          </div>
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl p-4 border border-[#333333]">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Cash Collected</p>
            <p className="text-2xl font-bold text-emerald-400">₱{statsData.cashRevenue?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{statsData.successRate?.toFixed(1) || 100}% success rate</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl p-4 border border-[#333333]">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by booking code or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Event Type Filter */}
          <div className="relative">
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="appearance-none w-full md:w-48 pl-4 pr-10 py-2 bg-[#0A0A0A] border border-[#333333] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
            >
              <option value="all">All Events</option>
              <option value="payment_completed">Completed</option>
              <option value="payment_failed">Failed</option>
              <option value="cash_collected">Cash Collected</option>
              <option value="link_created">Link Created</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Date Range Filter */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setCurrentPage(0);
              }}
              className="appearance-none w-full md:w-40 pl-4 pr-10 py-2 bg-[#0A0A0A] border border-[#333333] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-4 border-t border-[#333333]">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(0);
                }}
                className="px-3 py-2 bg-[#0A0A0A] border border-[#333333] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(0);
                }}
                className="px-3 py-2 bg-[#0A0A0A] border border-[#333333] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transaction Table */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl border border-[#333333] overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date/Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Booking</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment For</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No payment records found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-[#252525] cursor-pointer transition-colors"
                    onClick={() => log.booking_id && setSelectedBookingId(log.booking_id)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{formatDate(log.created_at)}</p>
                      <p className="text-gray-500 text-xs">{formatTime(log.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">
                        {log.booking_info?.booking_code || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">
                        {log.booking_info?.customer_name || '-'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {log.booking_info?.service_name || ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${getEventTypeColor(log.event_type)}`}>
                        {getEventTypeIcon(log.event_type)}
                        {getEventTypeLabel(log.event_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.payment_for ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getPaymentForColor(log.payment_for)}`}>
                          {getPaymentForLabel(log.payment_for)}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm capitalize">
                        {log.payment_method || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className={`text-sm font-semibold ${log.event_type === 'payment_completed' || log.event_type === 'cash_collected' ? 'text-green-400' : 'text-white'}`}>
                        {log.amount ? `₱${log.amount.toLocaleString()}` : '-'}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-[#333333]">
          {filteredLogs.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              No payment records found
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log._id}
                className="p-4 hover:bg-[#252525] transition-colors"
                onClick={() => log.booking_id && setSelectedBookingId(log.booking_id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">
                      {log.booking_info?.booking_code || 'No Booking'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {log.booking_info?.customer_name || '-'}
                    </p>
                  </div>
                  <p className={`font-semibold ${log.event_type === 'payment_completed' || log.event_type === 'cash_collected' ? 'text-green-400' : 'text-white'}`}>
                    {log.amount ? `₱${log.amount.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${getEventTypeColor(log.event_type)}`}>
                      {getEventTypeIcon(log.event_type)}
                      {getEventTypeLabel(log.event_type)}
                    </span>
                    {log.payment_for && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getPaymentForColor(log.payment_for)}`}>
                        {getPaymentForLabel(log.payment_for)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">{formatDateTime(log.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-t border-[#333333]">
            <p className="text-sm text-gray-400">
              Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, auditData?.total || 0)} of {auditData?.total || 0}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white text-sm">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Audit Trail Modal */}
      {selectedBookingId && bookingAuditData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[#333333]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#333333]">
              <div>
                <h3 className="text-lg font-bold text-white">Payment Audit Trail</h3>
                {bookingAuditData.booking && (
                  <p className="text-sm text-gray-400">
                    Booking #{bookingAuditData.booking.booking_code}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedBookingId(null)}
                className="p-2 hover:bg-[#333333] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Booking Info */}
            {bookingAuditData.booking && (
              <div className="p-4 bg-[#0A0A0A] border-b border-[#333333]">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Customer</p>
                    <p className="text-white font-medium">{bookingAuditData.booking.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Service</p>
                    <p className="text-white font-medium">{bookingAuditData.booking.service_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Service Amount</p>
                    <p className="text-white font-medium">₱{bookingAuditData.booking.service_price?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Status</p>
                    <p className={`font-medium capitalize ${
                      bookingAuditData.booking.payment_status === 'paid' ? 'text-green-400' :
                      bookingAuditData.booking.payment_status === 'partial' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>
                      {bookingAuditData.booking.payment_status || 'Unpaid'}
                    </p>
                  </div>
                  {bookingAuditData.booking.convenience_fee_paid > 0 && (
                    <div>
                      <p className="text-gray-400">Convenience Fee Paid</p>
                      <p className="text-green-400 font-medium">₱{(bookingAuditData.booking.convenience_fee_paid || 0).toLocaleString()}</p>
                    </div>
                  )}
                  {bookingAuditData.booking.booking_fee > 0 && (
                    <div>
                      <p className="text-gray-400">Booking Fee</p>
                      <p className="text-blue-400 font-medium">₱{bookingAuditData.booking.booking_fee?.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="p-4 overflow-y-auto max-h-[400px]">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#333333]" />

                {/* Timeline events */}
                <div className="space-y-4">
                  {bookingAuditData.logs.map((log, index) => (
                    <div key={log._id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                        log.event_type === 'payment_completed' || log.event_type === 'cash_collected'
                          ? 'bg-green-500 border-green-500'
                          : log.event_type === 'payment_failed'
                          ? 'bg-red-500 border-red-500'
                          : 'bg-[#333333] border-[#444444]'
                      }`} />

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getEventTypeColor(log.event_type)}`}>
                            {getEventTypeIcon(log.event_type)}
                            {getEventTypeLabel(log.event_type)}
                          </span>
                          {log.amount > 0 && (
                            <span className="text-green-400 text-sm font-semibold">
                              ₱{log.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs">
                          {formatDateTime(log.created_at)}
                        </p>
                        {log.payment_method && (
                          <p className="text-gray-400 text-xs mt-1 capitalize">
                            via {log.payment_method}
                          </p>
                        )}
                        {log.error_message && (
                          <p className="text-red-400 text-xs mt-1">
                            Error: {log.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
