import React, { useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppModal } from '../../context/AppModalContext';
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  Users,
  Package,
  Scissors,
  CreditCard,
  Wallet,
  Banknote,
  Building2,
  PieChart,
  BarChart3,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Receipt,
  Landmark,
} from "lucide-react";

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// ============================================================================
// MetricCard Component - Displays summary metrics with skeleton loading
// ============================================================================
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

// ============================================================================
// BreakdownCard Component - Expandable card for detailed breakdowns
// ============================================================================
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
            <div
              key={idx}
              className={`flex items-center justify-between text-sm ${
                item.isSubItem ? 'pl-4 text-xs' : ''
              } ${
                item.isHeader ? 'font-medium border-t border-[#333333] pt-2 mt-2' : ''
              } ${
                item.isTotal ? 'border-t border-[#333333] pt-2 font-semibold' : ''
              }`}
            >
              <span className={item.isCapital ? "text-blue-400" : item.isSubItem ? "text-gray-500" : "text-gray-400"}>
                {item.label}
              </span>
              <span className={`font-medium ${
                item.value < 0 ? 'text-red-400' :
                item.isCapital ? 'text-blue-400' :
                item.isTotal ? 'text-[var(--color-primary)]' :
                item.isSubItem ? 'text-gray-400' : 'text-white'
              }`}>
                {item.value < 0 ? '-' : ''}{formatCurrency(Math.abs(item.value))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// BarberRevenueCard Component - Shows revenue by barber
// ============================================================================
const BarberRevenueCard = ({ barbers, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 animate-pulse">
        <div className="h-5 bg-[#333333] rounded w-40 mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#333333] rounded-full"></div>
            <div className="flex-1 h-4 bg-[#333333] rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[var(--color-primary)]" />
        <h3 className="font-medium text-white">Revenue by Barber</h3>
      </div>
      <div className="space-y-3">
        {barbers.length === 0 ? (
          <p className="text-gray-500 text-sm">No revenue data available</p>
        ) : (
          barbers.slice(0, 5).map((barber, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{barber.barber_name}</span>
                <span className="text-white font-medium">
                  {formatCurrency(barber.total_revenue)}
                </span>
              </div>
              <div className="w-full bg-[#333333] rounded-full h-2">
                <div
                  className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${barber.percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{barber.transaction_count} transactions</span>
                <span>{barber.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PaymentMethodCard Component - Shows payment method breakdown
// ============================================================================
const PaymentMethodCard = ({ methods, isLoading }) => {
  const methodIcons = {
    cash: Banknote,
    card: CreditCard,
    digital_wallet: Wallet,
    bank_transfer: Building2,
  };

  const methodLabels = {
    cash: "Cash",
    card: "Card",
    digital_wallet: "Digital Wallet",
    bank_transfer: "Bank Transfer",
  };

  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 animate-pulse">
        <div className="h-5 bg-[#333333] rounded w-40 mb-4"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 bg-[#333333] rounded"></div>
            <div className="flex-1 h-4 bg-[#333333] rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-[var(--color-primary)]" />
        <h3 className="font-medium text-white">Payment Methods</h3>
      </div>
      <div className="space-y-3">
        {methods.map((method, idx) => {
          const Icon = methodIcons[method.method] || CreditCard;
          return (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{methodLabels[method.method] || method.method}</span>
              </div>
              <div className="text-right">
                <span className="text-white font-medium">{formatCurrency(method.amount)}</span>
                <span className="text-gray-500 ml-2">({method.count})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// DateRangePicker Component
// ============================================================================
const DateRangePicker = ({ selectedRange, onRangeChange, customStart, customEnd, onCustomChange }) => {
  const ranges = [
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "this_year", label: "This Year" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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

// ============================================================================
// AddEntryModal Component - For adding/editing revenue or expense
// ============================================================================
const AddEntryModal = ({ type, onClose, onSave, isLoading, editEntry, branchId }) => {
  // Determine initial payment destination from edit entry (for revenue)
  const getInitialPaymentDestination = () => {
    if (!editEntry) return "none";
    if (editEntry.received_to_cash) return "cash";
    if (editEntry.received_to_asset_id) return editEntry.received_to_asset_id;
    return "none";
  };

  // Determine initial payment source from edit entry (for expenses)
  const getInitialPaymentSource = () => {
    if (!editEntry) return "none";
    if (editEntry.paid_from_asset_id) return editEntry.paid_from_asset_id;
    return "none";
  };

  const [formData, setFormData] = useState({
    category: editEntry?.category || (type === "revenue" ? "service_tips" : "supplies"),
    expense_type: editEntry?.expense_type || "operating",
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

  // Query payment assets for expenses and revenue
  const paymentAssets = useQuery(
    api.services.expenses.getPaymentAssets,
    branchId ? { branch_id: branchId } : "skip"
  );

  const revenueCategories = [
    { value: "service_tips", label: "Service Tips" },
    { value: "product_sales", label: "Additional Product Sales" },
    { value: "event_income", label: "Event Income" },
    { value: "gift_card_sales", label: "Gift Card Sales" },
    { value: "rental_income", label: "Rental Income" },
    { value: "training_income", label: "Training Income" },
    { value: "other", label: "Other Revenue" },
  ];

  const expenseCategories = [
    { value: "rent", label: "Rent" },
    { value: "utilities", label: "Utilities" },
    { value: "insurance", label: "Insurance" },
    { value: "salaries", label: "Fixed Salaries" },
    { value: "subscriptions", label: "Subscriptions" },
    { value: "supplies", label: "Supplies" },
    { value: "maintenance", label: "Maintenance" },
    { value: "marketing", label: "Marketing" },
    { value: "equipment", label: "Equipment" },
    { value: "transportation", label: "Transportation" },
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

    // Handle payment source for expenses
    if (type === "expense") {
      if (formData.payment_source !== "none") {
        submitData.paid_from_asset_id = formData.payment_source;
      } else {
        submitData.clear_payment_source = true;
      }
    }

    // Handle payment destination for revenue
    if (type === "revenue") {
      if (formData.payment_destination === "cash") {
        submitData.received_to_cash = true;
        submitData.received_to_asset_id = undefined;
      } else if (formData.payment_destination !== "none") {
        submitData.received_to_asset_id = formData.payment_destination;
        submitData.received_to_cash = undefined;
      } else {
        submitData.clear_payment_destination = true;
      }
    }

    onSave(submitData);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-md border border-[#333333] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#333333]">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? "Edit" : "Add"} {type === "revenue" ? "Revenue" : "Expense"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#333333] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
            >
              {(type === "revenue" ? revenueCategories : expenseCategories).map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Expense Type (only for expenses) */}
          {type === "expense" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Expense Type</label>
              <select
                value={formData.expense_type}
                onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="fixed">Fixed (Monthly)</option>
                <option value="operating">Operating (Variable)</option>
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
              placeholder="Enter description..."
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Amount (PHP)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none resize-none"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          {/* Payment Destination for Revenue */}
          {type === "revenue" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                <span className="flex items-center gap-1">
                  <Landmark className="w-4 h-4" />
                  Received To (Asset Destination)
                </span>
              </label>
              <select
                value={formData.payment_destination}
                onChange={(e) => setFormData({ ...formData, payment_destination: e.target.value })}
                className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="none">-- Not tracked (won't affect Balance Sheet) --</option>
                <option value="cash">Cash on Hand</option>
                {paymentAssets && paymentAssets.length > 0 && (
                  <>
                    {paymentAssets.map((asset) => (
                      <option key={asset._id} value={asset._id}>
                        {asset.name} - Balance: {formatCurrency(asset.current_value)}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.payment_destination === "none"
                  ? "Revenue will only affect P&L, not cash assets"
                  : "Revenue will increase this asset (double-entry)"}
              </p>
            </div>
          )}

          {/* Payment Source for Expense */}
          {type === "expense" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Wallet className="w-4 h-4" />
                    Paid From (Asset Source)
                  </span>
                </label>
                <select
                  value={formData.payment_source}
                  onChange={(e) => setFormData({ ...formData, payment_source: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="none">-- Not tracked (won't affect Balance Sheet) --</option>
                  {paymentAssets && paymentAssets.length > 0 && (
                    <>
                      {paymentAssets.map((asset) => (
                        <option key={asset._id} value={asset._id}>
                          {asset.name} - Available: {formatCurrency(asset.current_value)}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.payment_source === "none"
                    ? "Expense will only affect P&L, not cash assets"
                    : "Expense will deduct from this asset (double-entry)"}
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

          {/* Submit Button */}
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
              className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Saving..." : isEditing ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Export Functions
// ============================================================================
const exportToCSV = (data, filename) => {
  const headers = ["Category", "Amount"];
  const payrollBreakdown = data.expense_breakdown?.payroll_breakdown || {};
  const rows = [
    ["Revenue", ""],
    ["Services", data.revenue_breakdown?.services || 0],
    ["Products", data.revenue_breakdown?.products || 0],
    ["Booking Fees", data.revenue_breakdown?.booking_fees || 0],
    ["Late Fees", data.revenue_breakdown?.late_fees || 0],
    ["Discounts", -(data.revenue_breakdown?.discounts || 0)],
    ["Manual Revenue", data.manual_revenue_total || 0],
    ["Wallet Top-Ups (Capital)", data.wallet_topup_total || 0],
    ["Net Revenue", data.revenue_breakdown?.net_revenue || 0],
    ["", ""],
    ["Expenses", ""],
    ["Cost of Goods Sold", data.expense_breakdown?.cost_of_goods_sold || 0],
    ["Payroll", data.expense_breakdown?.payroll || 0],
    ["Fixed Expenses", data.expense_breakdown?.fixed_expenses || 0],
    ["Operating Expenses", data.expense_breakdown?.operating_expenses || 0],
    ["Total Expenses", data.expense_breakdown?.total || 0],
    ["", ""],
    ["Summary", ""],
    ["Gross Profit", data.gross_profit || 0],
    ["Net Income", data.net_income || 0],
    ["Gross Margin", `${(data.gross_margin || 0).toFixed(2)}%`],
    ["Net Margin", `${(data.net_margin || 0).toFixed(2)}%`],
  ];

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

const exportToPDF = (data, branchName, period) => {
  const printWindow = window.open("", "_blank");
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>P&L Report - ${branchName}</title>
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
      </style>
    </head>
    <body>
      <h1>Profit & Loss Report</h1>
      <p><strong>Branch:</strong> ${branchName}</p>
      <p><strong>Period:</strong> ${period}</p>

      <h2>Revenue</h2>
      <table>
        <tr><th>Category</th><th class="amount">Amount</th></tr>
        <tr><td>Services</td><td class="amount">₱${(data.revenue_breakdown?.services || 0).toLocaleString()}</td></tr>
        <tr><td>Products</td><td class="amount">₱${(data.revenue_breakdown?.products || 0).toLocaleString()}</td></tr>
        <tr><td>Manual Revenue</td><td class="amount">₱${(data.manual_revenue_total || 0).toLocaleString()}</td></tr>
        <tr class="total"><td>Total Revenue</td><td class="amount">₱${(data.total_revenue || 0).toLocaleString()}</td></tr>
      </table>

      <h2>Capital (Non-Operating)</h2>
      <table>
        <tr><th>Category</th><th class="amount">Amount</th></tr>
        <tr><td>Wallet Top-Ups</td><td class="amount" style="color: #3b82f6;">₱${(data.wallet_topup_total || 0).toLocaleString()}</td></tr>
      </table>

      <h2>Expenses</h2>
      <table>
        <tr><th>Category</th><th class="amount">Amount</th></tr>
        <tr><td>Cost of Goods Sold</td><td class="amount">₱${(data.expense_breakdown?.cost_of_goods_sold || 0).toLocaleString()}</td></tr>
        <tr><td>Payroll</td><td class="amount">₱${(data.expense_breakdown?.payroll || 0).toLocaleString()}</td></tr>
        <tr><td>Fixed Expenses</td><td class="amount">₱${(data.expense_breakdown?.fixed_expenses || 0).toLocaleString()}</td></tr>
        <tr><td>Operating Expenses</td><td class="amount">₱${(data.expense_breakdown?.operating_expenses || 0).toLocaleString()}</td></tr>
        <tr class="total"><td>Total Expenses</td><td class="amount">₱${(data.expense_breakdown?.total || 0).toLocaleString()}</td></tr>
      </table>

      <h2>Summary</h2>
      <table>
        <tr class="total"><td>Net Income</td><td class="amount ${(data.net_income || 0) >= 0 ? 'positive' : 'negative'}">₱${(data.net_income || 0).toLocaleString()}</td></tr>
        <tr><td>Net Margin</td><td class="amount">${(data.net_margin || 0).toFixed(2)}%</td></tr>
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

// ============================================================================
// Main AccountingDashboard Component
// ============================================================================
const AccountingDashboard = ({ user, onRefresh }) => {
  const { showAlert, showConfirm } = useAppModal();
  const [selectedRange, setSelectedRange] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedCards, setExpandedCards] = useState({
    revenue: true,
    expenses: true,
  });
  const [showAddModal, setShowAddModal] = useState(null); // 'revenue' | 'expense' | null
  const [editingEntry, setEditingEntry] = useState(null);
  const [showHistoryTables, setShowHistoryTables] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    api.services.accounting.getPLSummary,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        }
      : "skip"
  );

  const revenueByBarber = useQuery(
    api.services.accounting.getRevenueByBarber,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        }
      : "skip"
  );

  const paymentMethods = useQuery(
    api.services.accounting.getPaymentMethodBreakdown,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        }
      : "skip"
  );

  // Get branch name for export
  const branch = useQuery(
    api.services.branches.getBranchById,
    user?.branch_id ? { id: user.branch_id } : "skip"
  );

  // Sync bookings to transactions
  const syncPreview = useQuery(
    api.services.accounting.previewSyncBookings,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        }
      : "skip"
  );

  const syncBookings = useMutation(api.services.accounting.syncBookingsToTransactions);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Revenue queries and mutations
  const revenueEntries = useQuery(
    api.services.expenses.getRevenueByBranch,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        }
      : "skip"
  );

  const allRevenueEntries = useQuery(
    api.services.expenses.getRevenueByBranch,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  );

  const addRevenue = useMutation(api.services.expenses.addRevenue);
  const updateRevenue = useMutation(api.services.expenses.updateRevenue);
  const deleteRevenue = useMutation(api.services.expenses.deleteRevenue);

  // Expense queries and mutations
  const expenseEntries = useQuery(
    api.services.expenses.getExpensesByBranch,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        }
      : "skip"
  );

  const allExpenseEntries = useQuery(
    api.services.expenses.getExpensesByBranch,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  );

  const addExpense = useMutation(api.services.expenses.addExpense);
  const updateExpense = useMutation(api.services.expenses.updateExpense);
  const deleteExpense = useMutation(api.services.expenses.deleteExpense);

  // Payment assets for dropdown
  const paymentAssets = useQuery(
    api.services.expenses.getPaymentAssets,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  );

  const handleSync = async () => {
    if (!user?.branch_id) return;

    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncBookings({
        branch_id: user.branch_id,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        synced_by: user._id,
      });
      setSyncResult(result);
    } catch (error) {
      console.error("Sync error:", error);
      setSyncResult({ success: false, message: error.message || "Failed to sync bookings" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddEntry = async (data) => {
    setIsSaving(true);
    try {
      if (showAddModal === "revenue") {
        if (data.id) {
          // Editing existing revenue
          await updateRevenue({
            revenue_id: data.id,
            category: data.category,
            description: data.description,
            amount: data.amount,
            revenue_date: data.date,
            notes: data.notes || undefined,
            received_to_asset_id: data.received_to_asset_id || undefined,
            received_to_cash: data.received_to_cash || undefined,
            clear_payment_destination: data.clear_payment_destination || undefined,
          });
        } else {
          // Adding new revenue
          await addRevenue({
            branch_id: user.branch_id,
            category: data.category,
            description: data.description,
            amount: data.amount,
            revenue_date: data.date,
            notes: data.notes || undefined,
            received_to_asset_id: data.received_to_asset_id || undefined,
            received_to_cash: data.received_to_cash || undefined,
            created_by: user._id,
          });
        }
      } else {
        if (data.id) {
          // Editing existing expense
          await updateExpense({
            expense_id: data.id,
            expense_type: data.expense_type,
            category: data.category,
            description: data.description,
            amount: data.amount,
            expense_date: data.date,
            notes: data.notes || undefined,
            is_recurring: data.is_recurring,
            paid_from_asset_id: data.paid_from_asset_id || undefined,
          });
        } else {
          // Adding new expense
          await addExpense({
            branch_id: user.branch_id,
            expense_type: data.expense_type,
            category: data.category,
            description: data.description,
            amount: data.amount,
            expense_date: data.date,
            notes: data.notes || undefined,
            is_recurring: data.is_recurring,
            paid_from_asset_id: data.paid_from_asset_id || undefined,
            created_by: user._id,
          });
        }
      }
      setShowAddModal(null);
      setEditingEntry(null);
    } catch (error) {
      console.error("Error saving entry:", error);
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRevenue = async (id) => {
    const confirmed = await showConfirm({ title: 'Delete Revenue', message: 'Delete this revenue entry?', type: 'warning' });
    if (confirmed) {
      await deleteRevenue({ revenue_id: id });
    }
  };

  const handleDeleteExpense = async (id) => {
    const confirmed = await showConfirm({ title: 'Delete Expense', message: 'Delete this expense entry?', type: 'warning' });
    if (confirmed) {
      await deleteExpense({ expense_id: id });
    }
  };

  const isLoading = plSummary === undefined;
  const hasError = plSummary === null;

  const handleCustomChange = (field, value) => {
    if (field === "start") setCustomStart(value);
    if (field === "end") setCustomEnd(value);
  };

  const toggleCard = (card) => {
    setExpandedCards((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  // Calculate manual revenue total (excluding wallet top-ups)
  const walletTopupEntries = revenueEntries?.filter((r) => r.category === "wallet_topup") || [];
  const otherRevenueEntries = revenueEntries?.filter((r) => r.category !== "wallet_topup") || [];
  const walletTopupTotal = walletTopupEntries.reduce((sum, r) => sum + r.amount, 0);
  const manualRevenueTotal = otherRevenueEntries.reduce((sum, r) => sum + r.amount, 0);

  // Build revenue breakdown items
  const revenueItems = plSummary
    ? [
        { label: "Services (Auto)", value: plSummary.revenue_breakdown.services },
        { label: "Products (Auto)", value: plSummary.revenue_breakdown.products },
        { label: "Booking Fees (Auto)", value: plSummary.revenue_breakdown.booking_fees },
        { label: "Manual Revenue", value: manualRevenueTotal },
        { label: "Wallet Top-Ups (Capital)", value: walletTopupTotal, isCapital: true },
        { label: "Discounts", value: -plSummary.revenue_breakdown.discounts },
      ]
    : [];

  // Build expense breakdown items
  const expenseItems = plSummary
    ? [
        { label: "Cost of Goods Sold", value: plSummary.expense_breakdown.cost_of_goods_sold },
        { label: "Payroll", value: plSummary.expense_breakdown.payroll },
        { label: "Fixed Expenses", value: plSummary.expense_breakdown.fixed_expenses || 0 },
        { label: "Operating Expenses", value: plSummary.expense_breakdown.operating_expenses || 0 },
      ]
    : [];

  if (!user?.branch_id) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Branch Selected</h2>
        <p className="text-gray-400">Please select a branch to view P&L reports.</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error Loading Data</h2>
        <p className="text-gray-400">There was an error loading the P&L data. Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-[var(--color-primary)]" />
            Profit & Loss
          </h2>
          <p className="text-gray-400 text-sm">{dateRange.label}</p>
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
              onClick={() => plSummary && exportToCSV({ ...plSummary, manual_revenue_total: manualRevenueTotal, wallet_topup_total: walletTopupTotal }, `pl-report-${dateRange.label}`)}
              disabled={isLoading}
              className="p-2 bg-[#1A1A1A] border border-[#333333] rounded-lg hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
              title="Export to CSV"
            >
              <Download className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => plSummary && exportToPDF({ ...plSummary, manual_revenue_total: manualRevenueTotal, wallet_topup_total: walletTopupTotal }, branch?.name || "Branch", dateRange.label)}
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
      <DateRangePicker
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        customStart={customStart}
        customEnd={customEnd}
        onCustomChange={handleCustomChange}
      />

      {/* Sync Bookings Section */}
      {syncPreview && syncPreview.bookings_to_sync > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-yellow-500/30 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <RefreshCw className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Sync Completed Bookings</h3>
                <p className="text-sm text-gray-400">
                  Found <span className="text-yellow-400 font-medium">{syncPreview.bookings_to_sync}</span> completed bookings
                  not in transactions ({formatCurrency(syncPreview.total_amount)})
                </p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync to P&L
                </>
              )}
            </button>
          </div>
          {syncResult && (
            <div className={`mt-3 p-3 rounded-lg ${syncResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              <p className="text-sm">{syncResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={(plSummary?.total_revenue || 0) + manualRevenueTotal}
          icon={TrendingUp}
          color="green"
          subtitle={`${plSummary?.transaction_count || 0} transactions + ${otherRevenueEntries.length} manual`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Wallet Top-Ups"
          value={walletTopupTotal}
          icon={Wallet}
          color="blue"
          subtitle={`${walletTopupEntries.length} top-up${walletTopupEntries.length !== 1 ? "s" : ""} (Capital)`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Expenses"
          value={plSummary?.total_expenses || 0}
          icon={TrendingDown}
          color="red"
          subtitle={`${expenseEntries?.length || 0} entries`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Net Income"
          value={(plSummary?.net_income || 0) + manualRevenueTotal}
          icon={DollarSign}
          color={(plSummary?.net_income || 0) + manualRevenueTotal >= 0 ? "green" : "red"}
          subtitle={`${(((plSummary?.net_income || 0) + manualRevenueTotal) / ((plSummary?.total_revenue || 1) + manualRevenueTotal) * 100).toFixed(1)}% margin`}
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <span className="text-gray-400 text-xs">Gross Profit</span>
          <p className="text-lg font-bold text-white">
            {isLoading ? "..." : formatCurrency(plSummary?.gross_profit || 0)}
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
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <span className="text-gray-400 text-xs">Transactions</span>
          <p className="text-lg font-bold text-white">
            {isLoading ? "..." : plSummary?.transaction_count || 0}
          </p>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard
          title="Revenue Breakdown"
          icon={TrendingUp}
          items={revenueItems}
          total={(plSummary?.revenue_breakdown?.net_revenue || 0) + manualRevenueTotal + walletTopupTotal}
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

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarberRevenueCard
          barbers={revenueByBarber?.barbers || []}
          isLoading={!revenueByBarber}
        />
        <PaymentMethodCard
          methods={paymentMethods?.methods || []}
          isLoading={!paymentMethods}
        />
      </div>

      {/* Wallet Top-Up Entries */}
      {walletTopupEntries.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-blue-500/30 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-white">Wallet Top-Ups (Capital)</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Auto-tracked</span>
            </div>
            <span className="text-blue-400 font-bold text-sm">{formatCurrency(walletTopupTotal)}</span>
          </div>
          <div className="space-y-2">
            {walletTopupEntries.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between p-3 bg-[#252525] rounded-lg border border-blue-500/10">
                <div>
                  <p className="text-white font-medium">{entry.description}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(entry.revenue_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {entry.notes && ` • ${entry.notes}`}
                  </p>
                </div>
                <span className="text-blue-400 font-bold">{formatCurrency(entry.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Revenue Entries */}
      {otherRevenueEntries.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="font-medium text-white">Manual Revenue Entries</h3>
            </div>
          </div>
          <div className="space-y-2">
            {otherRevenueEntries.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
                <div>
                  <p className="text-white font-medium">{entry.description}</p>
                  <p className="text-gray-500 text-xs">
                    {entry.category.replace(/_/g, " ")} • {new Date(entry.revenue_date).toLocaleDateString()}
                  </p>
                  {(entry.received_to_cash || entry.received_to_asset_id) && (
                    <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                      <Landmark className="w-3 h-3" />
                      Received to: {entry.received_to_cash ? "Cash" : "Asset"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 font-bold">{formatCurrency(entry.amount)}</span>
                  <button
                    onClick={() => {
                      setEditingEntry(entry);
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
                  {entry.paid_from_asset_id && (
                    <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      Paid from: Asset
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-red-400 font-bold">{formatCurrency(entry.amount)}</span>
                  <button
                    onClick={() => {
                      setEditingEntry(entry);
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
              {(allRevenueEntries?.length || 0) + (allExpenseEntries?.length || 0)} total entries
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
              {allRevenueEntries?.length > 0 ? (
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
                      {allRevenueEntries.map((entry) => {
                        const isWalletTopup = entry.category === "wallet_topup";
                        return (
                        <tr key={entry._id} className={`border-b border-[#252525] hover:bg-[#252525] ${isWalletTopup ? "bg-blue-500/5" : ""}`}>
                          <td className="py-2 px-3 text-white">
                            {new Date(entry.revenue_date).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-gray-300 capitalize">
                            {isWalletTopup ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                <Wallet className="w-3 h-3" /> Capital
                              </span>
                            ) : entry.category.replace(/_/g, " ")}
                          </td>
                          <td className="py-2 px-3 text-white">{entry.description}</td>
                          <td className="py-2 px-3 text-blue-400 text-xs">
                            {isWalletTopup ? "Wallet" : entry.received_to_cash ? "Cash" : entry.received_to_asset_id ? "Asset" : "-"}
                          </td>
                          <td className={`py-2 px-3 font-medium text-right ${isWalletTopup ? "text-blue-400" : "text-green-400"}`}>
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isWalletTopup ? (
                              <span className="text-xs text-gray-500">Auto</span>
                            ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingEntry(entry);
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
                            )}
                          </td>
                        </tr>
                        );
                      })}
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
                            {entry.category}
                          </td>
                          <td className="py-2 px-3 text-white">{entry.description}</td>
                          <td className="py-2 px-3 text-blue-400 text-xs">
                            {entry.paid_from_asset_id ? "Asset" : "-"}
                          </td>
                          <td className="py-2 px-3 text-red-400 font-medium text-right">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingEntry(entry);
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
            setEditingEntry(null);
          }}
          onSave={handleAddEntry}
          isLoading={isSaving}
          editEntry={editingEntry}
          branchId={user?.branch_id}
        />
      )}
    </div>
  );
};

export default AccountingDashboard;
