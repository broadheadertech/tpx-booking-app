import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Calendar,
  Building,
  Search,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserX,
  CreditCard,
  Banknote,
  Repeat,
  Award,
} from "lucide-react";

const formatPHP = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

const STATUS_COLORS = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  booked: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  completed: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/40",
  no_show: "bg-amber-500/15 text-amber-300 border-amber-500/40",
};

const PAYMENT_COLORS = {
  paid: "text-emerald-400",
  unpaid: "text-gray-500",
  partial: "text-amber-400",
  refunded: "text-red-400",
};

const StatCard = ({ label, value, sub, icon: Icon, color = "orange" }) => {
  const colors = {
    orange: "text-[var(--color-primary)] bg-[var(--color-primary)]/10",
    blue: "text-blue-400 bg-blue-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    red: "text-red-400 bg-red-500/10",
  };
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
};

const STATUS_BADGE = {
  new: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  at_risk: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  churned: "bg-red-500/15 text-red-300 border-red-500/40",
  win_back: "bg-purple-500/15 text-purple-300 border-purple-500/40",
};

const BranchBookingsOverview = () => {
  const branches = useQuery(api.services.branches.getAllBranches) || [];
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [view, setView] = useState("bookings"); // 'bookings' | 'customers'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);

  // Customers-view state
  const [customerStatusFilter, setCustomerStatusFilter] = useState("");
  const [customerSort, setCustomerSort] = useState("visits"); // 'visits' | 'spent' | 'recent'
  const [customerSearch, setCustomerSearch] = useState("");

  // Both queries skip until a branch is picked → zero network traffic at idle
  const summary = useQuery(
    api.services.bookings.getBranchBookingsSummary,
    selectedBranchId
      ? { branch_id: selectedBranchId, start_date: startDate, end_date: endDate }
      : "skip"
  );

  const list = useQuery(
    api.services.bookings.getBookingsByBranchFiltered,
    selectedBranchId && view === "bookings"
      ? {
          branch_id: selectedBranchId,
          start_date: startDate,
          end_date: endDate,
          status: statusFilter || undefined,
          payment_status: paymentFilter || undefined,
          limit,
        }
      : "skip"
  );

  // Customers (visit-count) — uses customer_branch_activity (already tracks
  // total_bookings, total_spent, last_visit_date per customer per branch)
  const branchCustomers = useQuery(
    api.services.customerBranchActivity.getBranchCustomers,
    selectedBranchId && view === "customers"
      ? {
          branchId: selectedBranchId,
          status: customerStatusFilter || undefined,
          limit: 500,
        }
      : "skip"
  );

  const sortedCustomers = useMemo(() => {
    if (!branchCustomers) return [];
    const term = customerSearch.toLowerCase();
    let rows = term
      ? branchCustomers.filter(
          (c) =>
            c.customer_name?.toLowerCase().includes(term) ||
            c.customer_email?.toLowerCase().includes(term) ||
            c.customer_phone?.toLowerCase().includes(term)
        )
      : branchCustomers.slice();
    if (customerSort === "visits") {
      rows.sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0));
    } else if (customerSort === "spent") {
      rows.sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
    } else if (customerSort === "recent") {
      rows.sort((a, b) => (b.last_visit_date || 0) - (a.last_visit_date || 0));
    }
    return rows;
  }, [branchCustomers, customerSearch, customerSort]);

  const customerStats = useMemo(() => {
    if (!branchCustomers) return null;
    const stats = {
      total: branchCustomers.length,
      totalVisits: 0,
      totalSpent: 0,
      avgVisitsPerCustomer: 0,
      repeatCustomers: 0,
      byStatus: { new: 0, active: 0, at_risk: 0, churned: 0, win_back: 0 },
    };
    for (const c of branchCustomers) {
      stats.totalVisits += c.total_bookings || 0;
      stats.totalSpent += c.total_spent || 0;
      if ((c.total_bookings || 0) >= 2) stats.repeatCustomers++;
      if (stats.byStatus[c.status] !== undefined) stats.byStatus[c.status]++;
    }
    stats.avgVisitsPerCustomer =
      stats.total > 0 ? stats.totalVisits / stats.total : 0;
    return stats;
  }, [branchCustomers]);

  const filteredList = useMemo(() => {
    if (!list?.bookings) return [];
    const term = search.toLowerCase();
    if (!term) return list.bookings;
    return list.bookings.filter(
      (b) =>
        b.booking_code?.toLowerCase().includes(term) ||
        b.customer_name?.toLowerCase().includes(term) ||
        b.customer_email?.toLowerCase().includes(term) ||
        b.service_name?.toLowerCase().includes(term) ||
        b.barber_name?.toLowerCase().includes(term)
    );
  }, [list, search]);

  const selectedBranch = branches.find((b) => b._id === selectedBranchId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
            Branch Bookings Overview
          </h2>
          <p className="text-gray-400 text-sm">
            Branch-scoped, on-demand. Pick a branch to load its data — nothing is fetched until you do.
          </p>
        </div>
        <div className="flex bg-[#252525] border border-[#333] rounded-lg p-1">
          <button
            onClick={() => setView("bookings")}
            className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 ${
              view === "bookings"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Bookings
          </button>
          <button
            onClick={() => setView("customers")}
            className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 ${
              view === "customers"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            Customers · Visits
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Building className="w-3 h-3" />
              Branch
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">— Select a branch —</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} {b.is_active ? "" : "(inactive)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
        </div>

        {/* Quick range buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Today", days: 0 },
            { label: "7 days", days: 7 },
            { label: "30 days", days: 30 },
            { label: "90 days", days: 90 },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                const end = new Date();
                const start = new Date(end.getTime() - opt.days * 24 * 60 * 60 * 1000);
                setEndDate(end.toISOString().slice(0, 10));
                setStartDate(start.toISOString().slice(0, 10));
              }}
              className="text-xs px-2.5 py-1 rounded-md bg-[#252525] hover:bg-[#2A2A2A] border border-[#333] text-gray-300"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!selectedBranchId && (
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-12 text-center text-gray-400">
          <Building className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-base text-gray-300">Pick a branch above to see its bookings.</p>
          <p className="text-xs text-gray-500 mt-1">
            Data only loads after you select a branch — keeps things fast even with many branches.
          </p>
        </div>
      )}

      {/* Loading state */}
      {selectedBranchId && view === "bookings" && summary === undefined && (
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-8 text-center text-gray-400">
          Loading bookings for {selectedBranch?.name}…
        </div>
      )}
      {selectedBranchId && view === "customers" && branchCustomers === undefined && (
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-8 text-center text-gray-400">
          Loading customers for {selectedBranch?.name}…
        </div>
      )}

      {/* Summary */}
      {selectedBranchId && view === "bookings" && summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Total in window"
              value={summary.total}
              sub={`${summary.window.start} → ${summary.window.end}`}
              icon={Calendar}
              color="orange"
            />
            <StatCard
              label="Today"
              value={summary.today}
              icon={Clock}
              color="blue"
            />
            <StatCard
              label="Last 7 days"
              value={summary.last_7_days}
              icon={TrendingUp}
              color="emerald"
            />
            <StatCard
              label="Revenue (paid)"
              value={formatPHP(summary.revenue_in_window)}
              sub={`${summary.by_payment.paid} paid`}
              icon={DollarSign}
              color="emerald"
            />
            <StatCard
              label="Paid online"
              value={summary.paid_online_count}
              sub="PayMongo / wallet"
              icon={CreditCard}
              color="purple"
            />
            <StatCard
              label="Paid cash"
              value={summary.cash_count}
              icon={Banknote}
              color="amber"
            />
          </div>

          {/* Status pills */}
          <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">By status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.by_status).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() =>
                    setStatusFilter((prev) => (prev === status ? "" : status))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    statusFilter === status
                      ? "bg-[var(--color-primary)] text-white border-transparent"
                      : `${STATUS_COLORS[status] || "bg-[#252525] text-gray-300 border-[#333]"} hover:opacity-80`
                  }`}
                >
                  {status.replace("_", "-")}: <span className="font-bold ml-1">{count}</span>
                </button>
              ))}
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter("")}
                  className="text-xs text-gray-400 hover:text-white px-2"
                >
                  Clear ×
                </button>
              )}
            </div>
          </div>

          {/* Bookings table */}
          <div className="bg-[#1A1A1A] border border-[#333] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-[#333] flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code / customer / service…"
                  className="w-full bg-[#252525] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-white text-sm"
                />
              </div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-[#252525] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs"
              >
                <option value="">All payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="refunded">Refunded</option>
              </select>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="bg-[#252525] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#252525] text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2 px-3">Code</th>
                    <th className="text-left py-2 px-3">When</th>
                    <th className="text-left py-2 px-3">Customer</th>
                    <th className="text-left py-2 px-3">Service</th>
                    <th className="text-left py-2 px-3">Barber</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Payment</th>
                    <th className="text-right py-2 px-3">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        No bookings in this window.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((b) => (
                      <tr
                        key={b._id}
                        className="border-t border-[#252525] hover:bg-[#252525]"
                      >
                        <td className="py-2 px-3 text-white font-mono text-xs">
                          #{b.booking_code}
                        </td>
                        <td className="py-2 px-3 text-gray-300">
                          {b.date}
                          <span className="text-gray-500 text-xs ml-1">{b.time}</span>
                        </td>
                        <td className="py-2 px-3">
                          <p className="text-white">{b.customer_name}</p>
                          {b.customer_email && (
                            <p className="text-gray-500 text-xs">{b.customer_email}</p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-300">{b.service_name}</td>
                        <td className="py-2 px-3 text-gray-400 text-xs">
                          {b.barber_name}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                              STATUS_COLORS[b.status] || "border-gray-500"
                            }`}
                          >
                            {b.status?.replace("_", "-")}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs ${PAYMENT_COLORS[b.payment_status] || "text-gray-400"}`}>
                            {b.payment_status || "—"}
                            {b.payment_method && (
                              <span className="text-gray-500 ml-1">
                                ({b.payment_method})
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-white font-medium">
                          {formatPHP(b.final_price ?? b.price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {list?.truncated && (
              <div className="p-2 text-center text-xs text-amber-400 bg-amber-500/5 border-t border-[#333]">
                Showing first {limit} matches — narrow the date range or status to see more.
              </div>
            )}
          </div>
        </>
      )}

      {/* CUSTOMERS · VISITS VIEW */}
      {selectedBranchId && view === "customers" && customerStats && (
        <>
          {/* Customer stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Unique customers"
              value={customerStats.total}
              icon={Users}
              color="orange"
            />
            <StatCard
              label="Total visits"
              value={customerStats.totalVisits}
              sub="completed bookings"
              icon={Repeat}
              color="blue"
            />
            <StatCard
              label="Repeat customers"
              value={customerStats.repeatCustomers}
              sub={`${customerStats.total > 0 ? Math.round((customerStats.repeatCustomers / customerStats.total) * 100) : 0}% of base`}
              icon={Award}
              color="emerald"
            />
            <StatCard
              label="Avg visits / customer"
              value={customerStats.avgVisitsPerCustomer.toFixed(1)}
              icon={TrendingUp}
              color="purple"
            />
            <StatCard
              label="Total spend"
              value={formatPHP(customerStats.totalSpent)}
              icon={DollarSign}
              color="emerald"
            />
            <StatCard
              label="At risk + churned"
              value={customerStats.byStatus.at_risk + customerStats.byStatus.churned}
              sub={`${customerStats.byStatus.at_risk} at risk, ${customerStats.byStatus.churned} churned`}
              icon={AlertCircle}
              color="amber"
            />
          </div>

          {/* Status pills (customer-side) */}
          <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">By engagement status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(customerStats.byStatus).map(([s, count]) => (
                <button
                  key={s}
                  onClick={() =>
                    setCustomerStatusFilter((prev) => (prev === s ? "" : s))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    customerStatusFilter === s
                      ? "bg-[var(--color-primary)] text-white border-transparent"
                      : `${STATUS_BADGE[s] || "bg-[#252525] text-gray-300 border-[#333]"} hover:opacity-80`
                  }`}
                >
                  {s.replace("_", "-")}: <span className="font-bold ml-1">{count}</span>
                </button>
              ))}
              {customerStatusFilter && (
                <button
                  onClick={() => setCustomerStatusFilter("")}
                  className="text-xs text-gray-400 hover:text-white px-2"
                >
                  Clear ×
                </button>
              )}
            </div>
          </div>

          {/* Customers table */}
          <div className="bg-[#1A1A1A] border border-[#333] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-[#333] flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name, email, phone…"
                  className="w-full bg-[#252525] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-white text-sm"
                />
              </div>
              <select
                value={customerSort}
                onChange={(e) => setCustomerSort(e.target.value)}
                className="bg-[#252525] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs"
              >
                <option value="visits">Most visits</option>
                <option value="spent">Highest spend</option>
                <option value="recent">Most recent visit</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#252525] text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2 px-3">Customer</th>
                    <th className="text-right py-2 px-3">Visits</th>
                    <th className="text-right py-2 px-3">Total Spent</th>
                    <th className="text-left py-2 px-3">Last Visit</th>
                    <th className="text-left py-2 px-3">First Visit</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No customers have visited this branch yet.
                      </td>
                    </tr>
                  ) : (
                    sortedCustomers.map((c) => {
                      const visits = c.total_bookings || 0;
                      const isLoyal = visits >= 5;
                      return (
                        <tr
                          key={c._id}
                          className="border-t border-[#252525] hover:bg-[#252525]"
                        >
                          <td className="py-2 px-3">
                            <p className="text-white flex items-center gap-1.5">
                              {c.customer_name}
                              {isLoyal && (
                                <Award className="w-3.5 h-3.5 text-yellow-400" title="Loyal customer (5+ visits)" />
                              )}
                              {c.is_guest && (
                                <span className="text-[10px] uppercase text-gray-500 bg-[#252525] px-1.5 py-0.5 rounded">
                                  guest
                                </span>
                              )}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {c.customer_email || c.customer_phone || "—"}
                            </p>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-white font-bold text-base">{visits}</span>
                            {visits >= 10 && (
                              <span className="text-[10px] text-yellow-400 ml-1">★</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-400 font-medium">
                            {formatPHP(c.total_spent || 0)}
                          </td>
                          <td className="py-2 px-3 text-gray-300">
                            {c.last_visit_date
                              ? new Date(c.last_visit_date).toLocaleDateString()
                              : "—"}
                            {c.days_since_last_visit !== undefined && (
                              <p className="text-gray-500 text-xs">
                                {c.days_since_last_visit}d ago
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-400 text-xs">
                            {c.first_visit_date
                              ? new Date(c.first_visit_date).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                                STATUS_BADGE[c.status] || "border-gray-500"
                              }`}
                            >
                              {c.status?.replace("_", "-")}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BranchBookingsOverview;
