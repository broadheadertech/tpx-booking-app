import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  ChevronDown,
  ChevronUp,
  Building,
  PieChart,
  FileText,
  Percent,
  Package,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  Info,
  Wallet,
  Landmark,
  Pencil,
  HelpCircle,
} from "lucide-react";
import { useAppModal } from "../../context/AppModalContext";
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { plDashboardSteps } from '../../config/walkthroughSteps'

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Summary Card Component
const MetricCard = ({ title, value, icon: Icon, color, subtitle, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl p-4 sm:p-6 border border-[#333333] animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-[#333333] rounded w-24"></div>
          <div className="w-10 h-10 bg-[#333333] rounded-lg"></div>
        </div>
        <div className="h-8 bg-[#333333] rounded w-32 mb-2"></div>
        <div className="h-3 bg-[#333333] rounded w-20"></div>
      </div>
    );
  }

  const colorClasses = {
    green: "text-green-400 bg-green-500/10",
    red: "text-red-400 bg-red-500/10",
    orange: "text-[var(--color-primary)] bg-[var(--color-primary)]/10",
    blue: "text-blue-400 bg-blue-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-4 sm:p-6 border border-[#333333] hover:border-[var(--color-primary)]/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.orange}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
        {formatCurrency(value)}
      </div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
};

// Breakdown Card Component
const BreakdownCard = ({ title, icon: Icon, items, total, isExpanded, onToggle, isLoading, color = "orange" }) => {
  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] animate-pulse">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#333333] rounded-lg"></div>
            <div className="h-5 bg-[#333333] rounded w-32"></div>
          </div>
          <div className="h-6 bg-[#333333] rounded w-20"></div>
        </div>
      </div>
    );
  }

  const colorClasses = {
    orange: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    blue: "bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-[#252525] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">{formatCurrency(total)}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isExpanded && items.length > 0 && (
        <div className="border-t border-[#333333] p-4 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{item.label}</span>
              <span className={`font-medium ${item.value < 0 ? 'text-red-400' : 'text-white'}`}>
                {item.value < 0 ? '-' : ''}{formatCurrency(Math.abs(item.value))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Branch Income Row
const BranchIncomeRow = ({ branch, type, maxAmount }) => {
  const percentage = maxAmount > 0 ? (branch.amount / maxAmount) * 100 : 0;
  const colorClass = type === "royalty" ? "from-yellow-500 to-yellow-600" : "from-blue-500 to-blue-600";
  const iconBg = type === "royalty" ? "bg-yellow-500/20" : "bg-blue-500/20";
  const iconText = type === "royalty" ? "text-yellow-400" : "text-blue-400";

  return (
    <div className="p-3 bg-[#252525] rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
            <Building className={`w-4 h-4 ${iconText}`} />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{branch.branch_name}</p>
            <p className="text-gray-500 text-xs">{branch.count} payment(s)</p>
          </div>
        </div>
        <p className={`font-bold ${iconText}`}>{formatCurrency(branch.amount)}</p>
      </div>
      <div className="w-full bg-[#333333] rounded-full h-1.5">
        <div
          className={`bg-gradient-to-r ${colorClass} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Date Range Picker
const DateRangePicker = ({ selectedRange, onRangeChange, customStart, customEnd, onCustomChange }) => {
  const ranges = [
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "this_quarter", label: "This Quarter" },
    { id: "this_year", label: "This Year" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-2">
        {ranges.map((range) => (
          <button
            key={range.id}
            onClick={() => onRangeChange(range.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedRange === range.id
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#333333]"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      {selectedRange === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomChange("start", e.target.value)}
            className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded-lg text-white text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomChange("end", e.target.value)}
            className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded-lg text-white text-sm"
          />
        </div>
      )}
    </div>
  );
};

// Add/Edit Entry Modal
const AddEntryModal = ({ type, onClose, onSave, isLoading, editEntry }) => {
  // Determine initial payment source from edit entry (for expenses)
  const getInitialPaymentSource = () => {
    if (!editEntry) return "none";
    if (editEntry.paid_from_sales_cash) return "sales_cash";
    if (editEntry.paid_from_asset_id) return editEntry.paid_from_asset_id;
    return "none";
  };

  // Determine initial payment destination from edit entry (for revenue)
  const getInitialPaymentDestination = () => {
    if (!editEntry) return "none";
    if (editEntry.received_to_sales_cash) return "sales_cash";
    if (editEntry.received_to_asset_id) return editEntry.received_to_asset_id;
    return "none";
  };

  const [formData, setFormData] = useState({
    category: editEntry?.category || (type === "revenue" ? "consulting" : "office_rent"),
    expense_type: editEntry?.expense_type || "fixed",
    description: editEntry?.description || "",
    amount: editEntry?.amount?.toString() || "",
    date: editEntry
      ? new Date(editEntry.expense_date || editEntry.revenue_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    notes: editEntry?.notes || "",
    is_recurring: editEntry?.is_recurring || false,
    payment_source: getInitialPaymentSource(),
    payment_destination: getInitialPaymentDestination(),
  });

  const isEditing = !!editEntry;

  // Query payment sources for expenses
  const paymentSources = useQuery(
    api.services.accounting.getExpensePaymentSources,
    type === "expense" ? {} : "skip"
  );

  // Query payment destinations for revenue
  const paymentDestinations = useQuery(
    api.services.accounting.getRevenuePaymentDestinations,
    type === "revenue" ? {} : "skip"
  );

  const revenueCategories = [
    { value: "consulting", label: "Consulting Fees" },
    { value: "franchise_fee", label: "Franchise Fees" },
    { value: "training_fee", label: "Training Fees" },
    { value: "marketing_fee", label: "Marketing Fees" },
    { value: "other", label: "Other Revenue" },
  ];

  const expenseCategories = [
    { value: "office_rent", label: "Office Rent" },
    { value: "utilities", label: "Utilities" },
    { value: "insurance", label: "Insurance" },
    { value: "salaries", label: "HQ Salaries" },
    { value: "subscriptions", label: "Subscriptions" },
    { value: "supplies", label: "Supplies" },
    { value: "travel", label: "Travel" },
    { value: "marketing", label: "Marketing" },
    { value: "legal_accounting", label: "Legal & Accounting" },
    { value: "training_costs", label: "Training Costs" },
    { value: "warehouse_costs", label: "Warehouse Costs" },
    { value: "miscellaneous", label: "Miscellaneous" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      date: new Date(formData.date).getTime(),
    };

    // Include entry ID if editing
    if (isEditing) {
      submitData.id = editEntry._id;
    }

    // Handle payment source for expenses (where money comes FROM)
    if (type === "expense") {
      if (formData.payment_source === "sales_cash") {
        submitData.paid_from_sales_cash = true;
        submitData.paid_from_asset_id = undefined;
        submitData.clear_payment_source = false;
      } else if (formData.payment_source !== "none") {
        submitData.paid_from_asset_id = formData.payment_source;
        submitData.paid_from_sales_cash = undefined;
        submitData.clear_payment_source = false;
      } else {
        // Clear payment source if set to "none"
        submitData.clear_payment_source = true;
      }
    }

    // Handle payment destination for revenue (where money goes TO)
    if (type === "revenue") {
      if (formData.payment_destination === "sales_cash") {
        submitData.received_to_sales_cash = true;
        submitData.received_to_asset_id = undefined;
        submitData.clear_payment_destination = false;
      } else if (formData.payment_destination !== "none") {
        submitData.received_to_asset_id = formData.payment_destination;
        submitData.received_to_sales_cash = undefined;
        submitData.clear_payment_destination = false;
      } else {
        // Clear payment destination if set to "none"
        submitData.clear_payment_destination = true;
      }
    }

    onSave(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {isEditing ? "Edit" : "Add"} {type === "revenue" ? "Revenue" : "Expense"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white"
            >
              {(type === "revenue" ? revenueCategories : expenseCategories).map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {type === "expense" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Expense Type</label>
              <select
                value={formData.expense_type}
                onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white"
              >
                <option value="fixed">Fixed (Monthly)</option>
                <option value="operating">Operating (Variable)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white"
              placeholder="Enter description..."
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount (PHP)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white"
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          {type === "revenue" && (
            <>
              {/* Payment Destination - Where does the money go to? */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Landmark className="w-4 h-4" />
                    Received To (Asset Destination)
                  </span>
                </label>
                <select
                  value={formData.payment_destination}
                  onChange={(e) => setFormData({ ...formData, payment_destination: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white"
                >
                  <option value="none">-- Not tracked (won't affect Balance Sheet) --</option>
                  {paymentDestinations && (
                    <>
                      <option value="sales_cash" className="text-green-400">
                        Sales Cash Pool - Balance: {formatCurrency(paymentDestinations.sales_cash?.balance || 0)}
                      </option>
                      {paymentDestinations.manual_assets?.length > 0 && (
                        <optgroup label="Manual Assets">
                          {paymentDestinations.manual_assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.name} - Balance: {formatCurrency(asset.balance)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.payment_destination === "none"
                    ? "Revenue will only affect P&L (Retained Earnings), not cash assets"
                    : "Revenue will increase this asset AND increase Retained Earnings (double-entry)"}
                </p>
              </div>
            </>
          )}

          {type === "expense" && (
            <>
              {/* Payment Source - Where did the money come from? */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Wallet className="w-4 h-4" />
                    Paid From (Asset Source)
                  </span>
                </label>
                <select
                  value={formData.payment_source}
                  onChange={(e) => setFormData({ ...formData, payment_source: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white"
                >
                  <option value="none">-- Not tracked (won't affect Balance Sheet) --</option>
                  {paymentSources && (
                    <>
                      <option value="sales_cash" className="text-green-400">
                        Sales Cash (Royalties + Orders) - Available: {formatCurrency(paymentSources.sales_cash?.available || 0)}
                      </option>
                      {paymentSources.manual_assets?.length > 0 && (
                        <optgroup label="Manual Assets">
                          {paymentSources.manual_assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.name} - Available: {formatCurrency(asset.available)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.payment_source === "none"
                    ? "Expense will only affect P&L (Retained Earnings), not cash assets"
                    : "Expense will deduct from this asset AND reduce Retained Earnings (double-entry)"}
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="w-4 h-4 rounded border-[#333333]"
                />
                <span className="text-sm text-gray-400">Recurring Monthly</span>
              </label>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? "Saving..." : isEditing ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export Functions
const exportToCSV = (data, filename) => {
  const rows = [
    ["SUPER ADMIN P&L REPORT", ""],
    ["", ""],
    ["REVENUE", ""],
    ["Royalty Income", data.revenue_breakdown.royalty_income],
    ["Product Order Income", data.revenue_breakdown.product_order_income],
    ["Commission Income", data.revenue_breakdown.commission_income || 0],
    ["Other Revenue", data.revenue_breakdown.other_revenue],
    ["Total Revenue", data.total_revenue],
    ["", ""],
    ["EXPENSES", ""],
    ["Fixed Expenses", data.expense_breakdown.fixed_expenses],
    ["Operating Expenses", data.expense_breakdown.operating_expenses],
    ["Total Expenses", data.total_expenses],
    ["", ""],
    ["SUMMARY", ""],
    ["Net Income", data.net_income],
    ["Gross Margin", `${data.gross_margin.toFixed(2)}%`],
    ["Net Margin", `${data.net_margin.toFixed(2)}%`],
  ];

  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

const exportToPDF = (data, period) => {
  const printWindow = window.open("", "_blank");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Super Admin P&L Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: var(--color-primary); border-bottom: 2px solid var(--color-primary); padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .amount { text-align: right; }
        .total { font-weight: bold; background-color: #f5f5f5; }
        .positive { color: green; }
        .negative { color: red; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .period { color: #666; }
        .highlight { background-color: #fff8f0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Super Admin Profit & Loss Report</h1>
        <div class="period">${period}</div>
      </div>
      <p><em>Note: This is Super Admin's own P&L, not a branch consolidation.</em></p>

      <h2>Revenue</h2>
      <table>
        <tr><th>Category</th><th class="amount">Amount</th></tr>
        <tr class="highlight"><td>Royalty Income</td><td class="amount">${formatCurrency(data.revenue_breakdown.royalty_income)}</td></tr>
        <tr class="highlight"><td>Product Order Income</td><td class="amount">${formatCurrency(data.revenue_breakdown.product_order_income)}</td></tr>
        <tr class="highlight"><td>Commission Income</td><td class="amount">${formatCurrency(data.revenue_breakdown.commission_income || 0)}</td></tr>
        <tr><td>Other Revenue</td><td class="amount">${formatCurrency(data.revenue_breakdown.other_revenue)}</td></tr>
        <tr class="total"><td>Total Revenue</td><td class="amount">${formatCurrency(data.total_revenue)}</td></tr>
      </table>

      <h2>Expenses</h2>
      <table>
        <tr><th>Category</th><th class="amount">Amount</th></tr>
        <tr><td>Fixed Expenses</td><td class="amount">${formatCurrency(data.expense_breakdown.fixed_expenses)}</td></tr>
        <tr><td>Operating Expenses</td><td class="amount">${formatCurrency(data.expense_breakdown.operating_expenses)}</td></tr>
        <tr class="total"><td>Total Expenses</td><td class="amount">${formatCurrency(data.expense_breakdown.total)}</td></tr>
      </table>

      <h2>Summary</h2>
      <table>
        <tr><th>Metric</th><th class="amount">Value</th></tr>
        <tr class="total"><td>Net Income</td><td class="amount ${data.net_income >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.net_income)}</td></tr>
        <tr><td>Gross Margin</td><td class="amount">${data.gross_margin.toFixed(2)}%</td></tr>
        <tr><td>Net Margin</td><td class="amount">${data.net_margin.toFixed(2)}%</td></tr>
      </table>

      <p style="margin-top: 40px; color: #999; font-size: 12px;">
        Generated on ${new Date().toLocaleString()}
      </p>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
};

// Main Component
const SuperAdminPLDashboard = () => {
  const { user } = useCurrentUser();
  const { showAlert, showConfirm } = useAppModal();
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])
  const [selectedRange, setSelectedRange] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedCards, setExpandedCards] = useState({
    revenue: true,
    expenses: true,
  });
  const [showAddModal, setShowAddModal] = useState(null); // 'revenue' | 'expense' | null
  const [editingExpense, setEditingExpense] = useState(null); // expense entry being edited
  const [editingRevenue, setEditingRevenue] = useState(null); // revenue entry being edited
  const [showHistoryTables, setShowHistoryTables] = useState(false); // Toggle history view
  const [isSaving, setIsSaving] = useState(false);

  // Mutations
  const addRevenue = useMutation(api.services.accounting.addSuperAdminRevenue);
  const addExpense = useMutation(api.services.accounting.addSuperAdminExpense);
  const updateExpense = useMutation(api.services.accounting.updateSuperAdminExpense);
  const updateRevenue = useMutation(api.services.accounting.updateSuperAdminRevenue);
  const deleteRevenue = useMutation(api.services.accounting.deleteSuperAdminRevenue);
  const deleteExpense = useMutation(api.services.accounting.deleteSuperAdminExpense);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const now = new Date();
    let start, end;

    switch (selectedRange) {
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "this_quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStartMonth = currentQuarter * 3;
        start = new Date(now.getFullYear(), quarterStartMonth, 1);
        end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
        break;
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case "custom":
        start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
        end = customEnd ? new Date(customEnd + "T23:59:59.999") : new Date();
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return {
      start_date: start.getTime(),
      end_date: end.getTime(),
      label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
    };
  }, [selectedRange, customStart, customEnd]);

  // Query P&L data
  const plSummary = useQuery(
    api.services.accounting.getConsolidatedPLSummary,
    {
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    }
  );

  // Query royalty income summary
  const royaltySummary = useQuery(
    api.services.accounting.getRoyaltyIncomeSummary,
    {
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    }
  );

  // Query manual entries for display (filtered by date range)
  const revenueEntries = useQuery(api.services.accounting.getSuperAdminRevenueEntries, {
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });

  const expenseEntries = useQuery(api.services.accounting.getSuperAdminExpenseEntries, {
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });

  // Query ALL entries for history table (no date filter)
  const allRevenueEntries = useQuery(api.services.accounting.getSuperAdminRevenueEntries, {});
  const allExpenseEntries = useQuery(api.services.accounting.getSuperAdminExpenseEntries, {});

  // Debug query for product order payment status
  const orderPaymentDebug = useQuery(api.services.productOrders.getPaymentStatusDebug);

  const isLoading = plSummary === undefined;

  const handleCustomChange = (field, value) => {
    if (field === "start") setCustomStart(value);
    if (field === "end") setCustomEnd(value);
  };

  const toggleCard = (card) => {
    setExpandedCards((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  const handleAddEntry = async (data) => {
    setIsSaving(true);
    try {
      if (showAddModal === "revenue" && editingRevenue) {
        // Editing existing revenue
        await updateRevenue({
          id: editingRevenue._id,
          category: data.category,
          description: data.description,
          amount: data.amount,
          revenue_date: data.date,
          notes: data.notes || undefined,
          // Payment destination tracking
          received_to_asset_id: data.received_to_asset_id || undefined,
          received_to_sales_cash: data.received_to_sales_cash || undefined,
          clear_payment_destination: data.clear_payment_destination || undefined,
        });
      } else if (showAddModal === "revenue") {
        // Adding new revenue
        await addRevenue({
          category: data.category,
          description: data.description,
          amount: data.amount,
          revenue_date: data.date,
          notes: data.notes || undefined,
          // Payment destination tracking (double-entry accounting)
          received_to_asset_id: data.received_to_asset_id || undefined,
          received_to_sales_cash: data.received_to_sales_cash || undefined,
          created_by: user._id,
        });
      } else if (editingExpense) {
        // Editing existing expense
        await updateExpense({
          id: editingExpense._id,
          expense_type: data.expense_type,
          category: data.category,
          description: data.description,
          amount: data.amount,
          expense_date: data.date,
          notes: data.notes || undefined,
          is_recurring: data.is_recurring,
          // Payment source tracking
          paid_from_asset_id: data.paid_from_asset_id || undefined,
          paid_from_sales_cash: data.paid_from_sales_cash || undefined,
          clear_payment_source: data.clear_payment_source || undefined,
        });
      } else {
        // Adding new expense
        await addExpense({
          expense_type: data.expense_type,
          category: data.category,
          description: data.description,
          amount: data.amount,
          expense_date: data.date,
          notes: data.notes || undefined,
          is_recurring: data.is_recurring,
          // Payment source tracking (double-entry accounting)
          paid_from_asset_id: data.paid_from_asset_id || undefined,
          paid_from_sales_cash: data.paid_from_sales_cash || undefined,
          created_by: user._id,
        });
      }
      setShowAddModal(null);
      setEditingExpense(null);
      setEditingRevenue(null);
    } catch (error) {
      console.error("Error saving entry:", error);
      showAlert({ title: 'Error', message: "Error: " + error.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRevenue = async (id) => {
    const confirmed = await showConfirm({ title: 'Delete Revenue', message: "Delete this revenue entry?", type: 'warning' });
    if (confirmed) {
      await deleteRevenue({ id });
    }
  };

  const handleDeleteExpense = async (id) => {
    const confirmed = await showConfirm({ title: 'Delete Expense', message: "Delete this expense entry?", type: 'warning' });
    if (confirmed) {
      await deleteExpense({ id });
    }
  };

  // Build breakdown items
  const revenueItems = plSummary
    ? [
        { label: "Royalty Income (Auto)", value: plSummary.revenue_breakdown.royalty_income },
        { label: "Product Orders (Auto)", value: plSummary.revenue_breakdown.product_order_income },
        { label: "Commission Income (Auto)", value: plSummary.revenue_breakdown.commission_income || 0 },
        { label: "Other Revenue (Manual)", value: plSummary.revenue_breakdown.other_revenue },
      ]
    : [];

  const expenseItems = plSummary
    ? [
        { label: "Fixed Expenses", value: plSummary.expense_breakdown.fixed_expenses },
        { label: "Operating Expenses", value: plSummary.expense_breakdown.operating_expenses },
      ]
    : [];

  const maxRoyaltyAmount = plSummary?.royalty_by_branch?.length > 0
    ? Math.max(...plSummary.royalty_by_branch.map(b => b.amount))
    : 0;

  const maxOrderAmount = plSummary?.orders_by_branch?.length > 0
    ? Math.max(...plSummary.orders_by_branch.map(b => b.amount))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="pl-header" className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <PieChart className="w-6 h-6 text-[var(--color-primary)]" />
              Super Admin P&L
            </h2>
            <p className="text-gray-400 text-sm">{dateRange.label}</p>
          </div>
          <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Add Entry Buttons */}
          <button
            onClick={() => setShowAddModal("revenue")}
            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Revenue</span>
          </button>
          <button
            onClick={() => setShowAddModal("expense")}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Expense</span>
          </button>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => plSummary && exportToCSV(plSummary, `super-admin-pl-${dateRange.label}`)}
              disabled={isLoading}
              className="p-2 bg-[#1A1A1A] border border-[#333333] rounded-lg hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
              title="Export to CSV"
            >
              <Download className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => plSummary && exportToPDF(plSummary, dateRange.label)}
              disabled={isLoading}
              className="p-2 bg-[#1A1A1A] border border-[#333333] rounded-lg hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
              title="Export to PDF"
            >
              <FileText className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Picker */}
      <div data-tour="pl-date-range">
        <DateRangePicker
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={handleCustomChange}
        />
      </div>

      {/* Summary Cards */}
      <div data-tour="pl-summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Royalty Income"
          value={plSummary?.revenue_breakdown?.royalty_income || 0}
          icon={Percent}
          color="yellow"
          subtitle={`${plSummary?.royalty_payment_count || 0} payments`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Product Order Income"
          value={plSummary?.revenue_breakdown?.product_order_income || 0}
          icon={Package}
          color="blue"
          subtitle={`${plSummary?.product_order_count || 0} orders`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Commission Income"
          value={plSummary?.revenue_breakdown?.commission_income || 0}
          icon={Wallet}
          color="green"
          subtitle={`${plSummary?.revenue_breakdown?.commission_count || 0} settlements`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Expenses"
          value={plSummary?.total_expenses || 0}
          icon={TrendingDown}
          color="red"
          subtitle={`${plSummary?.expense_count || 0} entries`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Net Income"
          value={plSummary?.net_income || 0}
          icon={DollarSign}
          color={plSummary?.net_income >= 0 ? "green" : "red"}
          subtitle={`${(plSummary?.net_margin || 0).toFixed(1)}% margin`}
          isLoading={isLoading}
        />
      </div>

      {/* Debug Info - Order Payment Status */}
      {orderPaymentDebug && (orderPaymentDebug.summary.receivedButUnpaid > 0 || orderPaymentDebug.summary.total === 0) && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-blue-400 font-medium">Product Order Payment Status</p>
              <div className="text-gray-400 text-sm mt-2 space-y-1">
                <p>Total Orders: <span className="text-white">{orderPaymentDebug.summary.total}</span></p>
                <p>Paid (with date): <span className="text-green-400">{orderPaymentDebug.summary.paidWithPaidAt}</span></p>
                <p>Paid (no date): <span className="text-yellow-400">{orderPaymentDebug.summary.paidWithoutPaidAt}</span></p>
                <p>Received but NOT Paid: <span className="text-red-400">{orderPaymentDebug.summary.receivedButUnpaid}</span></p>
                <p>Pending Payment (approved/shipped): <span className="text-[var(--color-primary)]">{orderPaymentDebug.summary.pendingPayment}</span></p>
              </div>
              {orderPaymentDebug.summary.receivedButUnpaid > 0 && (
                <p className="text-[var(--color-primary)] text-sm mt-3">
                  ⚠️ Go to <strong>Product Catalog → Branch Orders</strong> tab and click "Mark All Received as Paid" to include these in P&L.
                </p>
              )}
              {orderPaymentDebug.summary.total === 0 && (
                <p className="text-gray-400 text-sm mt-3">
                  No product orders found. Create orders in the Product Catalog.
                </p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                Current period: {new Date(dateRange.start_date).toLocaleDateString()} - {new Date(dateRange.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Metrics */}
      <div data-tour="pl-secondary" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <span className="text-gray-400 text-xs">Total Revenue</span>
          <p className="text-lg font-bold text-white">
            {isLoading ? "..." : formatCurrency(plSummary?.total_revenue || 0)}
          </p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <span className="text-gray-400 text-xs">Other Revenue</span>
          <p className="text-lg font-bold text-white">
            {isLoading ? "..." : formatCurrency(plSummary?.revenue_breakdown?.other_revenue || 0)}
          </p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <span className="text-gray-400 text-xs">Gross Margin</span>
          <p className="text-lg font-bold text-white">
            {isLoading ? "..." : `${(plSummary?.gross_margin || 0).toFixed(1)}%`}
          </p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <span className="text-gray-400 text-xs">Net Margin</span>
          <p className="text-lg font-bold text-white">
            {isLoading ? "..." : `${(plSummary?.net_margin || 0).toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard
          title="Revenue Breakdown"
          icon={TrendingUp}
          items={revenueItems}
          total={plSummary?.total_revenue || 0}
          isExpanded={expandedCards.revenue}
          onToggle={() => toggleCard("revenue")}
          isLoading={isLoading}
          color="green"
        />
        <BreakdownCard
          title="Expense Breakdown"
          icon={TrendingDown}
          items={expenseItems}
          total={plSummary?.expense_breakdown?.total || 0}
          isExpanded={expandedCards.expenses}
          onToggle={() => toggleCard("expenses")}
          isLoading={isLoading}
          color="red"
        />
      </div>

      {/* Royalty Income by Branch */}
      {plSummary?.royalty_by_branch?.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-5 h-5 text-yellow-400" />
            <h3 className="font-medium text-white">Royalty Income by Branch</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plSummary.royalty_by_branch.map((branch, idx) => (
              <BranchIncomeRow
                key={idx}
                branch={branch}
                type="royalty"
                maxAmount={maxRoyaltyAmount}
              />
            ))}
          </div>
          {royaltySummary?.total_pending > 0 && (
            <div className="mt-4 p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg">
              <p className="text-[var(--color-primary)] text-sm">
                <span className="font-medium">Pending Royalties: </span>
                {formatCurrency(royaltySummary.total_pending)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Product Order Income by Branch */}
      {plSummary?.orders_by_branch?.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-400" />
            <h3 className="font-medium text-white">Product Order Income by Branch</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plSummary.orders_by_branch.map((branch, idx) => (
              <BranchIncomeRow
                key={idx}
                branch={branch}
                type="order"
                maxAmount={maxOrderAmount}
              />
            ))}
          </div>
        </div>
      )}

      {/* Manual Revenue Entries */}
      {revenueEntries?.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="font-medium text-white">Manual Revenue Entries</h3>
            </div>
          </div>
          <div className="space-y-2">
            {revenueEntries.filter(e => !e.is_automated).map((entry) => (
              <div key={entry._id} className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                <div>
                  <p className="text-white font-medium">{entry.description}</p>
                  <p className="text-gray-500 text-xs">
                    {entry.category} • {new Date(entry.revenue_date).toLocaleDateString()}
                  </p>
                  {/* Show payment destination */}
                  {(entry.received_to_sales_cash || entry.received_to_asset_id) && (
                    <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                      <Landmark className="w-3 h-3" />
                      Received to: {entry.received_to_sales_cash ? "Sales Cash" : "Manual Asset"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 font-bold">{formatCurrency(entry.amount)}</span>
                  <button
                    onClick={() => {
                      setEditingRevenue(entry);
                      setShowAddModal("revenue");
                    }}
                    className="p-1 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                    title="Edit revenue"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRevenue(entry._id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete revenue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Expense Entries */}
      {expenseEntries?.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <h3 className="font-medium text-white">Manual Expense Entries</h3>
            </div>
          </div>
          <div className="space-y-2">
            {expenseEntries.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                <div>
                  <p className="text-white font-medium">{entry.description}</p>
                  <p className="text-gray-500 text-xs">
                    {entry.category} ({entry.expense_type}) • {new Date(entry.expense_date).toLocaleDateString()}
                    {entry.is_recurring && " • Recurring"}
                  </p>
                  {/* Show payment source */}
                  {(entry.paid_from_sales_cash || entry.paid_from_asset_id) && (
                    <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      Paid from: {entry.paid_from_sales_cash ? "Sales Cash" : "Manual Asset"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-red-400 font-bold">{formatCurrency(entry.amount)}</span>
                  <button
                    onClick={() => {
                      setEditingExpense(entry);
                      setShowAddModal("expense");
                    }}
                    className="p-1 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                    title="Edit expense"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(entry._id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Tables Toggle */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
        <button
          onClick={() => setShowHistoryTables(!showHistoryTables)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="font-medium text-white">Transaction History</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              {(allRevenueEntries?.filter(e => !e.is_automated)?.length || 0) + (allExpenseEntries?.length || 0)} total entries
            </span>
            {showHistoryTables ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {showHistoryTables && (
          <div className="mt-4 space-y-6">
            {/* Revenue History Table */}
            <div>
              <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Revenue History
              </h4>
              {allRevenueEntries?.filter(e => !e.is_automated)?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#333333]">
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Date</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Category</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Description</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Received To</th>
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">Amount</th>
                        <th className="text-center py-2 px-3 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRevenueEntries.filter(e => !e.is_automated).map((entry) => (
                        <tr key={entry._id} className="border-b border-[#252525] hover:bg-[#252525]">
                          <td className="py-2 px-3 text-white">
                            {new Date(entry.revenue_date).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-gray-300 capitalize">
                            {entry.category.replace(/_/g, " ")}
                          </td>
                          <td className="py-2 px-3 text-white">{entry.description}</td>
                          <td className="py-2 px-3 text-blue-400 text-xs">
                            {entry.received_to_sales_cash ? "Sales Cash" : entry.received_to_asset_id ? "Manual Asset" : "-"}
                          </td>
                          <td className="py-2 px-3 text-green-400 font-medium text-right">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingRevenue(entry);
                                  setShowAddModal("revenue");
                                }}
                                className="p-1 text-gray-400 hover:text-[var(--color-primary)]"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRevenue(entry._id)}
                                className="p-1 text-gray-400 hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No manual revenue entries found.</p>
              )}
            </div>

            {/* Expense History Table */}
            <div>
              <h4 className="text-red-400 font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Expense History
              </h4>
              {allExpenseEntries?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#333333]">
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Date</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Type</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Category</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Description</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Paid From</th>
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">Amount</th>
                        <th className="text-center py-2 px-3 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allExpenseEntries.map((entry) => (
                        <tr key={entry._id} className="border-b border-[#252525] hover:bg-[#252525]">
                          <td className="py-2 px-3 text-white">
                            {new Date(entry.expense_date).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-gray-300 capitalize">
                            {entry.expense_type}
                          </td>
                          <td className="py-2 px-3 text-gray-300 capitalize">
                            {entry.category.replace(/_/g, " ")}
                          </td>
                          <td className="py-2 px-3 text-white">{entry.description}</td>
                          <td className="py-2 px-3 text-blue-400 text-xs">
                            {entry.paid_from_sales_cash ? "Sales Cash" : entry.paid_from_asset_id ? "Manual Asset" : "-"}
                          </td>
                          <td className="py-2 px-3 text-red-400 font-medium text-right">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingExpense(entry);
                                  setShowAddModal("expense");
                                }}
                                className="p-1 text-gray-400 hover:text-[var(--color-primary)]"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(entry._id)}
                                className="p-1 text-gray-400 hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No expense entries found.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Entry Modal */}
      {showAddModal && (
        <AddEntryModal
          type={showAddModal}
          onClose={() => {
            setShowAddModal(null);
            setEditingExpense(null);
            setEditingRevenue(null);
          }}
          onSave={handleAddEntry}
          isLoading={isSaving}
          editEntry={showAddModal === "expense" ? editingExpense : editingRevenue}
        />
      )}

      {showTutorial && (
        <WalkthroughOverlay steps={plDashboardSteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
      )}
    </div>
  );
};

export default SuperAdminPLDashboard;
