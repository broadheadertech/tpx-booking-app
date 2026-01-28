import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  CreditCard,
  Wallet,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Save,
  FileText,
  PiggyBank,
  Landmark,
  Briefcase,
  Car,
  Monitor,
  Home,
  Package,
  Receipt,
  Clock,
  Calculator,
  RefreshCw,
  Link2,
  Info,
  Calendar,
  Lock,
  Unlock,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Category display mappings
const ASSET_CATEGORIES = {
  cash: { label: "Cash on Hand", icon: DollarSign, type: "current" },
  bank_accounts: { label: "Bank Accounts", icon: Landmark, type: "current" },
  accounts_receivable: { label: "Accounts Receivable", icon: Receipt, type: "current" },
  inventory: { label: "Inventory", icon: Package, type: "current" },
  prepaid_expenses: { label: "Prepaid Expenses", icon: Clock, type: "current" },
  equipment: { label: "Equipment", icon: Briefcase, type: "fixed" },
  furniture: { label: "Furniture", icon: Home, type: "fixed" },
  leasehold_improvements: { label: "Leasehold Improvements", icon: Building2, type: "fixed" },
  vehicles: { label: "Vehicles", icon: Car, type: "fixed" },
  software: { label: "Software", icon: Monitor, type: "intangible" },
  deposits: { label: "Deposits", icon: PiggyBank, type: "intangible" },
  other: { label: "Other", icon: FileText, type: "intangible" },
};

const LIABILITY_CATEGORIES = {
  accounts_payable: { label: "Accounts Payable", type: "current" },
  wages_payable: { label: "Wages Payable", type: "current" },
  taxes_payable: { label: "Taxes Payable", type: "current" },
  unearned_revenue: { label: "Unearned Revenue", type: "current" },
  credit_card: { label: "Credit Card", type: "current" },
  short_term_loan: { label: "Short-term Loan", type: "current" },
  accrued_expenses: { label: "Accrued Expenses", type: "current" },
  bank_loan: { label: "Bank Loan", type: "long_term" },
  equipment_financing: { label: "Equipment Financing", type: "long_term" },
  lease_obligations: { label: "Lease Obligations", type: "long_term" },
  owner_loan: { label: "Owner Loan", type: "long_term" },
  other: { label: "Other", type: "long_term" },
};

const EQUITY_TYPES = {
  owner_capital: { label: "Owner's Capital", description: "Initial or ongoing investment by owner", manual: true },
  retained_earnings: { label: "Retained Earnings", description: "Auto-calculated from P&L (Revenue - Expenses)", manual: false },
  drawings: { label: "Drawings", description: "Owner withdrawals (enters as negative)", manual: true },
  additional_investment: { label: "Additional Investment", description: "Extra capital contributions", manual: true },
  other: { label: "Other", description: "Other equity transactions", manual: true },
};

// Filter for manual entry types only
const MANUAL_EQUITY_TYPES = Object.fromEntries(
  Object.entries(EQUITY_TYPES).filter(([, info]) => info.manual)
);

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Summary Card Component
const SummaryCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    purple: "bg-purple-500/10 text-purple-400",
    amber: "bg-amber-500/10 text-amber-400",
    orange: "bg-[#FF8C42]/10 text-[#FF8C42]",
  };

  const valueColors = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    orange: "text-[#FF8C42]",
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${valueColors[color] || "text-white"}`}>{formatCurrency(value)}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
};

// Ratio Card Component
const RatioCard = ({ title, value, description, status }) => {
  const statusColors = {
    good: "text-green-400 bg-green-500/10",
    warning: "text-amber-400 bg-amber-500/10",
    danger: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <Calculator size={16} className="text-gray-500" />
      </div>
      <div className={`text-xl font-bold ${statusColors[status] || "text-white"} rounded px-2 py-1 inline-block`}>
        {value !== null ? value.toFixed(2) : "N/A"}
      </div>
      <div className="text-xs text-gray-500 mt-2">{description}</div>
    </div>
  );
};

// Item Card Component (for assets/liabilities)
const ItemCard = ({ item, type, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  const getCategoryInfo = () => {
    if (type === "asset") {
      return ASSET_CATEGORIES[item.category] || { label: item.category, icon: FileText };
    }
    return LIABILITY_CATEGORIES[item.category] || { label: item.category };
  };

  const categoryInfo = getCategoryInfo();
  const Icon = categoryInfo.icon || CreditCard;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${type === "asset" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="font-medium text-white">{item.name}</div>
            <div className="text-xs text-gray-500">{categoryInfo.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`font-semibold ${type === "asset" ? "text-green-400" : "text-red-400"}`}>
              {formatCurrency(type === "asset" ? item.current_value : item.current_balance)}
            </div>
            {type === "liability" && item.monthly_payment && (
              <div className="text-xs text-gray-500">{formatCurrency(item.monthly_payment)}/mo</div>
            )}
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#333333] space-y-2 text-sm">
          {type === "asset" ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Purchase Value:</span>
                <span className="text-gray-300">{formatCurrency(item.purchase_value)}</span>
              </div>
              {item.purchase_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Purchase Date:</span>
                  <span className="text-gray-300">{formatDate(item.purchase_date)}</span>
                </div>
              )}
              {item.depreciation_rate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Depreciation Rate:</span>
                  <span className="text-gray-300">{item.depreciation_rate}%/year</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Original Amount:</span>
                <span className="text-gray-300">{formatCurrency(item.original_amount)}</span>
              </div>
              {item.interest_rate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Interest Rate:</span>
                  <span className="text-gray-300">{item.interest_rate}%</span>
                </div>
              )}
              {item.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date:</span>
                  <span className="text-gray-300">{formatDate(item.due_date)}</span>
                </div>
              )}
              {item.creditor && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Creditor:</span>
                  <span className="text-gray-300">{item.creditor}</span>
                </div>
              )}
            </>
          )}
          {item.notes && (
            <div className="mt-2">
              <span className="text-gray-500">Notes:</span>
              <p className="text-gray-400 mt-1">{item.notes}</p>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onEdit(item)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={() => onDelete(item._id)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Equity Entry Card
const EquityCard = ({ entry, onEdit, onDelete }) => {
  const typeInfo = EQUITY_TYPES[entry.equity_type] || { label: entry.equity_type };
  const isNegative = entry.amount < 0;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-colors group">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-white">{entry.description}</div>
          <div className="text-xs text-gray-500">{typeInfo.label}</div>
          <div className="text-xs text-gray-600 mt-1">{formatDate(entry.transaction_date)}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`font-semibold ${isNegative ? "text-red-400" : "text-purple-400"}`}>
            {formatCurrency(entry.amount)}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(entry)}
              className="p-1.5 hover:bg-[#333333] rounded text-gray-400 hover:text-blue-400"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onDelete(entry._id)}
              className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add/Edit Asset Modal
const AssetModal = ({ isOpen, onClose, asset, branchId, userId }) => {
  const getInitialData = () => ({
    asset_type: "current",
    category: "cash",
    name: "",
    purchase_value: 0,
    current_value: 0,
    purchase_date: Date.now(),
    depreciation_rate: 0,
    notes: "",
  });

  const [formData, setFormData] = useState(getInitialData());

  useEffect(() => {
    if (isOpen) {
      setFormData(asset || getInitialData());
    }
  }, [asset, isOpen]);

  const addAsset = useMutation(api.services.balanceSheet.addAsset);
  const updateAsset = useMutation(api.services.balanceSheet.updateAsset);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (asset) {
        await updateAsset({
          asset_id: asset._id,
          ...formData,
        });
      } else {
        await addAsset({
          branch_id: branchId,
          created_by: userId,
          ...formData,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving asset:", error);
    }
  };

  if (!isOpen) return null;

  const currentCategories = Object.entries(ASSET_CATEGORIES).filter(
    ([, info]) => info.type === formData.asset_type
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#333333]">
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{asset ? "Edit Asset" : "Add Asset"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Asset Type</label>
              <select
                value={formData.asset_type}
                onChange={(e) => {
                  const type = e.target.value;
                  const firstCategory = Object.entries(ASSET_CATEGORIES).find(([, info]) => info.type === type)?.[0] || "other";
                  setFormData({ ...formData, asset_type: type, category: firstCategory });
                }}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              >
                <option value="current">Current Assets</option>
                <option value="fixed">Fixed Assets</option>
                <option value="intangible">Intangible Assets</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              >
                {currentCategories.map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Asset Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              placeholder="e.g., Barber Chair #1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Purchase Value</label>
              <input
                type="number"
                value={formData.purchase_value}
                onChange={(e) => setFormData({ ...formData, purchase_value: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Current Value</label>
              <input
                type="number"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchase_date ? new Date(formData.purchase_date).toISOString().split("T")[0] : ""}
                onChange={(e) => setFormData({ ...formData, purchase_date: new Date(e.target.value).getTime() })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Depreciation Rate (%/yr)</label>
              <input
                type="number"
                value={formData.depreciation_rate || 0}
                onChange={(e) => setFormData({ ...formData, depreciation_rate: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#333333] rounded-lg text-gray-300 hover:bg-[#333333] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={16} />
              {asset ? "Update" : "Add"} Asset
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Add/Edit Liability Modal
const LiabilityModal = ({ isOpen, onClose, liability, branchId, userId }) => {
  const getInitialData = () => ({
    liability_type: "current",
    category: "accounts_payable",
    name: "",
    original_amount: 0,
    current_balance: 0,
    interest_rate: 0,
    due_date: null,
    payment_frequency: "monthly",
    monthly_payment: 0,
    creditor: "",
    notes: "",
  });

  const [formData, setFormData] = useState(getInitialData());

  useEffect(() => {
    if (isOpen) {
      setFormData(liability || getInitialData());
    }
  }, [liability, isOpen]);

  const addLiability = useMutation(api.services.balanceSheet.addLiability);
  const updateLiability = useMutation(api.services.balanceSheet.updateLiability);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (liability) {
        await updateLiability({
          liability_id: liability._id,
          ...formData,
        });
      } else {
        await addLiability({
          branch_id: branchId,
          created_by: userId,
          ...formData,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving liability:", error);
    }
  };

  if (!isOpen) return null;

  const currentCategories = Object.entries(LIABILITY_CATEGORIES).filter(
    ([, info]) => info.type === formData.liability_type
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#333333]">
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{liability ? "Edit Liability" : "Add Liability"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Liability Type</label>
              <select
                value={formData.liability_type}
                onChange={(e) => {
                  const type = e.target.value;
                  const firstCategory = Object.entries(LIABILITY_CATEGORIES).find(([, info]) => info.type === type)?.[0] || "other";
                  setFormData({ ...formData, liability_type: type, category: firstCategory });
                }}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              >
                <option value="current">Current (Due within 1 year)</option>
                <option value="long_term">Long-term (Due after 1 year)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              >
                {currentCategories.map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              placeholder="e.g., Equipment Loan - Bank ABC"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Original Amount</label>
              <input
                type="number"
                value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Current Balance</label>
              <input
                type="number"
                value={formData.current_balance}
                onChange={(e) => setFormData({ ...formData, current_balance: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Interest Rate (%)</label>
              <input
                type="number"
                value={formData.interest_rate || 0}
                onChange={(e) => setFormData({ ...formData, interest_rate: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Monthly Payment</label>
              <input
                type="number"
                value={formData.monthly_payment || 0}
                onChange={(e) => setFormData({ ...formData, monthly_payment: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date ? new Date(formData.due_date).toISOString().split("T")[0] : ""}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value ? new Date(e.target.value).getTime() : null })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Creditor</label>
              <input
                type="text"
                value={formData.creditor || ""}
                onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                placeholder="Bank, supplier, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#333333] rounded-lg text-gray-300 hover:bg-[#333333] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={16} />
              {liability ? "Update" : "Add"} Liability
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Add/Edit Equity Modal
const EquityModal = ({ isOpen, onClose, equity, branchId, userId }) => {
  const getInitialData = () => ({
    equity_type: "owner_capital",
    description: "",
    amount: 0,
    transaction_date: Date.now(),
    notes: "",
  });

  const [formData, setFormData] = useState(getInitialData());

  useEffect(() => {
    if (isOpen) {
      setFormData(equity || getInitialData());
    }
  }, [equity, isOpen]);

  const addEquity = useMutation(api.services.balanceSheet.addEquity);
  const updateEquity = useMutation(api.services.balanceSheet.updateEquity);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (equity) {
        await updateEquity({
          equity_id: equity._id,
          ...formData,
        });
      } else {
        await addEquity({
          branch_id: branchId,
          created_by: userId,
          ...formData,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving equity:", error);
    }
  };

  if (!isOpen) return null;

  const selectedType = MANUAL_EQUITY_TYPES[formData.equity_type] || EQUITY_TYPES[formData.equity_type];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-lg border border-[#333333]">
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{equity ? "Edit Equity Entry" : "Add Equity Entry"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Equity Type</label>
            <select
              value={formData.equity_type}
              onChange={(e) => setFormData({ ...formData, equity_type: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
            >
              {Object.entries(MANUAL_EQUITY_TYPES).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
            {selectedType && (
              <p className="text-xs text-gray-500 mt-1">{selectedType.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              placeholder="e.g., Initial capital investment"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Amount {formData.equity_type === "drawings" && "(negative for withdrawals)"}
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Transaction Date</label>
              <input
                type="date"
                value={formData.transaction_date ? new Date(formData.transaction_date).toISOString().split("T")[0] : ""}
                onChange={(e) => setFormData({ ...formData, transaction_date: new Date(e.target.value).getTime() })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#333333] rounded-lg text-gray-300 hover:bg-[#333333] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={16} />
              {equity ? "Update" : "Add"} Entry
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Period Status Badge
const PeriodStatusBadge = ({ status }) => {
  const statusConfig = {
    open: { label: "Open", bg: "bg-green-500/20", text: "text-green-400", icon: Unlock },
    closing: { label: "Closing", bg: "bg-amber-500/20", text: "text-amber-400", icon: Clock },
    closed: { label: "Closed", bg: "bg-gray-500/20", text: "text-gray-400", icon: Lock },
  };

  const config = statusConfig[status] || statusConfig.open;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

// Period Card Component
const PeriodCard = ({ period, onClose, onReopen, onDelete, onCompare }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${period.status === "closed" ? "bg-gray-500/20 text-gray-400" : "bg-blue-500/20 text-blue-400"}`}>
            <Calendar size={18} />
          </div>
          <div>
            <div className="font-medium text-white">{period.period_name}</div>
            <div className="text-xs text-gray-500">
              {formatDate(period.start_date)} - {formatDate(period.end_date)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodStatusBadge status={period.status} />
          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#333333]">
          {period.snapshot ? (
            <div className="space-y-4">
              {/* Snapshot Summary */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                  <div className="text-green-400 text-xs">Assets</div>
                  <div className="font-bold text-green-400">{formatCurrency(period.snapshot.total_assets)}</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  <div className="text-red-400 text-xs">Liabilities</div>
                  <div className="font-bold text-red-400">{formatCurrency(period.snapshot.total_liabilities)}</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                  <div className="text-purple-400 text-xs">Equity</div>
                  <div className="font-bold text-purple-400">{formatCurrency(period.snapshot.total_equity)}</div>
                </div>
              </div>

              {/* P&L for Period */}
              <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#333333]">
                <div className="text-xs text-gray-500 mb-2">Period P&L</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Revenue:</span>
                    <span className="ml-2 font-medium text-green-400">{formatCurrency(period.snapshot.revenue)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expenses:</span>
                    <span className="ml-2 font-medium text-red-400">{formatCurrency(period.snapshot.expenses)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Net Income:</span>
                    <span className={`ml-2 font-bold ${period.snapshot.net_income >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatCurrency(period.snapshot.net_income)}
                    </span>
                  </div>
                </div>
              </div>

              {period.closed_at && (
                <div className="text-xs text-gray-600">
                  Closed on {formatDate(period.closed_at)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Period is still open. Close to capture snapshot data.
            </div>
          )}

          {period.notes && (
            <div className="mt-3 text-sm">
              <span className="text-gray-500">Notes:</span>
              <p className="text-gray-400 mt-1">{period.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {period.status === "open" && (
              <button
                onClick={() => onClose(period)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/80 transition-colors"
              >
                <Lock size={14} />
                Close Period
              </button>
            )}
            {period.status === "closed" && (
              <>
                <button
                  onClick={() => onReopen(period)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                >
                  <Unlock size={14} />
                  Reopen
                </button>
                <button
                  onClick={() => onCompare(period)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  <BarChart3 size={14} />
                  Compare
                </button>
              </>
            )}
            {period.status !== "closed" && (
              <button
                onClick={() => onDelete(period._id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Create Period Modal
const CreatePeriodModal = ({ isOpen, onClose, branchId, userId }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [customMode, setCustomMode] = useState(false);
  const [formData, setFormData] = useState({
    period_name: "",
    period_type: "monthly",
    start_date: Date.now(),
    end_date: Date.now(),
    notes: "",
  });

  const suggestedPeriods = useQuery(
    api.services.balanceSheet.getSuggestedPeriods,
    { branch_id: branchId, year: selectedYear }
  );

  const createPeriod = useMutation(api.services.balanceSheet.createAccountingPeriod);

  const handleCreateSuggested = async (suggestion) => {
    try {
      await createPeriod({
        branch_id: branchId,
        period_name: suggestion.period_name,
        period_type: suggestion.period_type,
        start_date: suggestion.start_date,
        end_date: suggestion.end_date,
        created_by: userId,
      });
      onClose();
    } catch (error) {
      console.error("Error creating period:", error);
      alert(error.message || "Failed to create period");
    }
  };

  const handleCreateCustom = async (e) => {
    e.preventDefault();
    try {
      await createPeriod({
        branch_id: branchId,
        ...formData,
        created_by: userId,
      });
      onClose();
    } catch (error) {
      console.error("Error creating period:", error);
      alert(error.message || "Failed to create period");
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#333333]">
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Create Accounting Period</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCustomMode(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!customMode ? "bg-[#FF8C42] text-white" : "bg-[#333333] text-gray-400 hover:text-white"}`}
            >
              Quick Select
            </button>
            <button
              onClick={() => setCustomMode(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${customMode ? "bg-[#FF8C42] text-white" : "bg-[#333333] text-gray-400 hover:text-white"}`}
            >
              Custom Period
            </button>
          </div>

          {!customMode ? (
            <>
              {/* Year Selector */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="p-2 hover:bg-[#333333] rounded-lg text-gray-400"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-lg font-semibold text-white">{selectedYear}</span>
                <button
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="p-2 hover:bg-[#333333] rounded-lg text-gray-400"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Suggested Periods */}
              {suggestedPeriods && (
                <div className="space-y-4">
                  {/* Monthly */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Monthly Periods</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {suggestedPeriods
                        .filter((p) => p.period_type === "monthly")
                        .map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => !suggestion.exists && handleCreateSuggested(suggestion)}
                            disabled={suggestion.exists}
                            className={`p-2 rounded-lg text-sm border transition-colors ${
                              suggestion.exists
                                ? "bg-[#0A0A0A] text-gray-600 cursor-not-allowed border-[#333333]"
                                : "bg-[#0A0A0A] text-gray-300 hover:bg-[#FF8C42]/20 hover:border-[#FF8C42]/50 border-[#333333]"
                            }`}
                          >
                            {suggestion.period_name.split(" ")[0].substring(0, 3)}
                            {suggestion.exists && <span className="ml-1 text-xs text-green-500">✓</span>}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Quarterly */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Quarterly Periods</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {suggestedPeriods
                        .filter((p) => p.period_type === "quarterly")
                        .map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => !suggestion.exists && handleCreateSuggested(suggestion)}
                            disabled={suggestion.exists}
                            className={`p-2 rounded-lg text-sm border transition-colors ${
                              suggestion.exists
                                ? "bg-[#0A0A0A] text-gray-600 cursor-not-allowed border-[#333333]"
                                : "bg-[#0A0A0A] text-gray-300 hover:bg-[#FF8C42]/20 hover:border-[#FF8C42]/50 border-[#333333]"
                            }`}
                          >
                            {suggestion.period_name}
                            {suggestion.exists && <span className="ml-1 text-xs text-green-500">✓</span>}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Yearly */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Fiscal Year</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {suggestedPeriods
                        .filter((p) => p.period_type === "yearly")
                        .map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => !suggestion.exists && handleCreateSuggested(suggestion)}
                            disabled={suggestion.exists}
                            className={`p-2 rounded-lg text-sm border transition-colors ${
                              suggestion.exists
                                ? "bg-[#0A0A0A] text-gray-600 cursor-not-allowed border-[#333333]"
                                : "bg-[#0A0A0A] text-gray-300 hover:bg-[#FF8C42]/20 hover:border-[#FF8C42]/50 border-[#333333]"
                            }`}
                          >
                            {suggestion.period_name}
                            {suggestion.exists && <span className="ml-1 text-xs text-green-500">✓</span>}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Custom Period Form */
            <form onSubmit={handleCreateCustom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Period Name</label>
                <input
                  type="text"
                  value={formData.period_name}
                  onChange={(e) => setFormData({ ...formData, period_name: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                  placeholder="e.g., January 2026, Q1 2026"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Period Type</label>
                <select
                  value={formData.period_type}
                  onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date ? new Date(formData.start_date).toISOString().split("T")[0] : ""}
                    onChange={(e) => setFormData({ ...formData, start_date: new Date(e.target.value).getTime() })}
                    className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date ? new Date(formData.end_date).toISOString().split("T")[0] : ""}
                    onChange={(e) => setFormData({ ...formData, end_date: new Date(e.target.value).getTime() })}
                    className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-[#333333] rounded-lg text-gray-300 hover:bg-[#333333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/80 transition-colors"
                >
                  Create Period
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Close Period Confirmation Modal
const ClosePeriodModal = ({ isOpen, onClose, period, branchId, userId }) => {
  const [notes, setNotes] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const closePeriod = useMutation(api.services.balanceSheet.closeAccountingPeriod);

  const handleClose = async () => {
    setIsClosing(true);
    try {
      const result = await closePeriod({
        period_id: period._id,
        notes: notes || undefined,
        closed_by: userId,
      });
      alert("Period closed successfully!");
      onClose();
    } catch (error) {
      console.error("Error closing period:", error);
      alert(error.message || "Failed to close period");
    } finally {
      setIsClosing(false);
    }
  };

  if (!isOpen || !period) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-md border border-[#333333]">
        <div className="p-4 border-b border-[#333333]">
          <h3 className="text-lg font-semibold text-white">Close Accounting Period</h3>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-400 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-amber-400">Confirm Period Close</h4>
                <p className="text-sm text-amber-400/80 mt-1">
                  Closing "{period.period_name}" will:
                </p>
                <ul className="text-sm text-amber-400/80 mt-2 list-disc list-inside space-y-1">
                  <li>Create a frozen snapshot of all financial data</li>
                  <li>Record Revenue, Expenses, and Net Income for this period</li>
                  <li>Lock the period from further changes</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Closing Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
              rows={2}
              placeholder="Any notes for this period close..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              disabled={isClosing}
              className="flex-1 px-4 py-2 border border-[#333333] rounded-lg text-gray-300 hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleClose}
              disabled={isClosing}
              className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/80 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isClosing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Lock size={16} />
              )}
              {isClosing ? "Closing..." : "Close Period"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Reopen Period Modal
const ReopenPeriodModal = ({ isOpen, onClose, period, userId }) => {
  const [reason, setReason] = useState("");

  const reopenPeriod = useMutation(api.services.balanceSheet.reopenAccountingPeriod);

  const handleReopen = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for reopening");
      return;
    }

    try {
      await reopenPeriod({
        period_id: period._id,
        reason: reason,
        reopened_by: userId,
      });
      alert("Period reopened successfully");
      onClose();
    } catch (error) {
      console.error("Error reopening period:", error);
      alert(error.message || "Failed to reopen period");
    }
  };

  if (!isOpen || !period) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-md border border-[#333333]">
        <div className="p-4 border-b border-[#333333]">
          <h3 className="text-lg font-semibold text-white">Reopen Period</h3>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-red-400">Warning</h4>
                <p className="text-sm text-red-400/80 mt-1">
                  Reopening a closed period should only be done for corrections.
                  This action will be logged.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Reason for Reopening <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
              rows={3}
              placeholder="Explain why this period needs to be reopened..."
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#333333] rounded-lg text-gray-300 hover:bg-[#333333] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReopen}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Unlock size={16} />
              Reopen Period
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Period Comparison Modal
const PeriodComparisonModal = ({ isOpen, onClose, period, branchId }) => {
  const [compareToPeriodId, setCompareToPeriodId] = useState(null);

  const allPeriods = useQuery(
    api.services.balanceSheet.getAccountingPeriods,
    { branch_id: branchId, status: "closed" }
  );

  const comparison = useQuery(
    api.services.balanceSheet.comparePeriods,
    compareToPeriodId && period
      ? { period_id_1: compareToPeriodId, period_id_2: period._id }
      : "skip"
  );

  const otherPeriods = allPeriods?.filter((p) => p._id !== period?._id) || [];

  if (!isOpen || !period) return null;

  const renderChange = (change) => {
    if (!change) return null;
    const isPositive = change.change >= 0;
    const percentStr = change.change_percent !== null
      ? `(${isPositive ? "+" : ""}${change.change_percent.toFixed(1)}%)`
      : "";

    return (
      <div className={`text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
        {isPositive ? "+" : ""}{formatCurrency(change.change)} {percentStr}
      </div>
    );
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#333333]">
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Compare Periods</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Period Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Compare "{period.period_name}" with:
            </label>
            <select
              value={compareToPeriodId || ""}
              onChange={(e) => setCompareToPeriodId(e.target.value || null)}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
            >
              <option value="">Select a period to compare</option>
              {otherPeriods.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.period_name}
                </option>
              ))}
            </select>
          </div>

          {comparison && (
            <div className="space-y-4">
              {/* Period Headers */}
              <div className="grid grid-cols-3 gap-4 text-sm font-medium">
                <div></div>
                <div className="text-center text-gray-400">{comparison.period_1.name}</div>
                <div className="text-center text-[#FF8C42]">{comparison.period_2.name}</div>
              </div>

              {/* Comparison Rows */}
              <div className="space-y-2">
                {[
                  { label: "Total Assets", key: "total_assets", color: "green" },
                  { label: "Total Liabilities", key: "total_liabilities", color: "red" },
                  { label: "Total Equity", key: "total_equity", color: "purple" },
                  { label: "Revenue", key: "revenue", color: "green" },
                  { label: "Expenses", key: "expenses", color: "red" },
                  { label: "Net Income", key: "net_income", color: "blue" },
                  { label: "Working Capital", key: "working_capital", color: "blue" },
                ].map(({ label, key, color }) => {
                  const data = comparison.comparison[key];
                  if (!data) return null;

                  return (
                    <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-[#333333]">
                      <div className="text-sm text-gray-500">{label}</div>
                      <div className="text-center font-medium text-gray-300">{formatCurrency(data.value_1)}</div>
                      <div className="text-center">
                        <div className="font-medium text-white">{formatCurrency(data.value_2)}</div>
                        {renderChange(data)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!compareToPeriodId && otherPeriods.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No other closed periods available for comparison.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Main Balance Sheet Dashboard
export default function BalanceSheetDashboard({ branchId, userId }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [assetModal, setAssetModal] = useState({ open: false, item: null });
  const [liabilityModal, setLiabilityModal] = useState({ open: false, item: null });
  const [equityModal, setEquityModal] = useState({ open: false, item: null });
  const [createPeriodModal, setCreatePeriodModal] = useState(false);
  const [closePeriodModal, setClosePeriodModal] = useState({ open: false, period: null });
  const [reopenPeriodModal, setReopenPeriodModal] = useState({ open: false, period: null });
  const [comparisonModal, setComparisonModal] = useState({ open: false, period: null });

  // Queries
  const balanceSheetSummary = useQuery(api.services.balanceSheet.getBalanceSheetSummary, { branch_id: branchId });
  const assets = useQuery(api.services.balanceSheet.getAssetsByBranch, { branch_id: branchId });
  const liabilities = useQuery(api.services.balanceSheet.getLiabilitiesByBranch, { branch_id: branchId });
  const equityEntries = useQuery(api.services.balanceSheet.getEquityByBranch, { branch_id: branchId });
  const accountingPeriods = useQuery(api.services.balanceSheet.getAccountingPeriods, { branch_id: branchId });
  const currentOpenPeriod = useQuery(api.services.balanceSheet.getCurrentOpenPeriod, { branch_id: branchId });

  // Mutations
  const deleteAsset = useMutation(api.services.balanceSheet.deleteAsset);
  const deleteLiability = useMutation(api.services.balanceSheet.deleteLiability);
  const deleteEquity = useMutation(api.services.balanceSheet.deleteEquity);
  const saveSnapshot = useMutation(api.services.balanceSheet.saveBalanceSheetSnapshot);
  const deletePeriod = useMutation(api.services.balanceSheet.deleteAccountingPeriod);

  // Group assets by type
  const groupedAssets = useMemo(() => {
    if (!assets) return { current: [], fixed: [], intangible: [] };
    return {
      current: assets.filter((a) => a.asset_type === "current"),
      fixed: assets.filter((a) => a.asset_type === "fixed"),
      intangible: assets.filter((a) => a.asset_type === "intangible"),
    };
  }, [assets]);

  // Group liabilities by type
  const groupedLiabilities = useMemo(() => {
    if (!liabilities) return { current: [], long_term: [] };
    return {
      current: liabilities.filter((l) => l.liability_type === "current"),
      long_term: liabilities.filter((l) => l.liability_type === "long_term"),
    };
  }, [liabilities]);

  const handleSaveSnapshot = async () => {
    try {
      await saveSnapshot({
        branch_id: branchId,
        created_by: userId,
        notes: `Snapshot taken on ${new Date().toLocaleDateString()}`,
      });
      alert("Balance sheet snapshot saved successfully!");
    } catch (error) {
      console.error("Error saving snapshot:", error);
      alert("Failed to save snapshot");
    }
  };

  // Loading state
  if (!balanceSheetSummary) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#333333] rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[#1A1A1A] border border-[#333333] rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get ratio status
  const getRatioStatus = (ratio, type) => {
    if (ratio === null) return "warning";
    if (type === "current_ratio") {
      if (ratio >= 2) return "good";
      if (ratio >= 1) return "warning";
      return "danger";
    }
    if (type === "debt_to_equity") {
      if (ratio <= 1) return "good";
      if (ratio <= 2) return "warning";
      return "danger";
    }
    return "good";
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "assets", label: "Assets" },
    { id: "liabilities", label: "Liabilities" },
    { id: "equity", label: "Equity" },
    { id: "periods", label: "Period Close" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Balance Sheet</h2>
          <p className="text-sm text-gray-400">As of {new Date().toLocaleDateString()}</p>
        </div>
        <button
          onClick={handleSaveSnapshot}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-colors"
        >
          <Save size={16} />
          Save Snapshot
        </button>
      </div>

      {/* Balance Check Alert */}
      {!balanceSheetSummary.is_balanced && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-400 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-amber-400">Balance Sheet Not Balanced</h4>
            <p className="text-sm text-amber-300/80 mt-1">
              Assets ({formatCurrency(balanceSheetSummary.assets.total)}) should equal Liabilities + Equity (
              {formatCurrency(balanceSheetSummary.liabilities.total + balanceSheetSummary.equity.total)}).
              Difference: {formatCurrency(balanceSheetSummary.balance_difference)}
            </p>
          </div>
        </div>
      )}

      {balanceSheetSummary.is_balanced && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="text-green-400 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-green-400">Balance Sheet Balanced</h4>
            <p className="text-sm text-green-300/80">Assets = Liabilities + Equity</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Assets"
          value={balanceSheetSummary.assets.total}
          subtitle={`Auto-balanced: Cash + Inventory`}
          icon={Wallet}
          color="green"
        />
        <SummaryCard
          title="Total Liabilities"
          value={balanceSheetSummary.liabilities.total}
          subtitle={`${balanceSheetSummary.counts.liabilities} items`}
          icon={CreditCard}
          color="red"
        />
        <SummaryCard
          title="Total Equity"
          value={balanceSheetSummary.equity.total}
          subtitle="Incl. retained earnings from P&L"
          icon={PiggyBank}
          color="purple"
        />
        <SummaryCard
          title="Working Capital"
          value={balanceSheetSummary.ratios.working_capital}
          subtitle="Current Assets - Current Liabilities"
          icon={TrendingUp}
          color={balanceSheetSummary.ratios.working_capital >= 0 ? "blue" : "amber"}
        />
      </div>

      {/* P&L Integration Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Link2 className="text-blue-400 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="font-medium text-blue-400 flex items-center gap-2">
              P&L Integration Active
              <RefreshCw size={14} className="text-blue-500 animate-spin" />
            </h4>
            <p className="text-sm text-blue-300/70 mt-1">
              Cash & Equivalents, Retained Earnings, and Inventory are auto-calculated. The balance sheet is automatically balanced.
            </p>

            {/* Revenue & Net Income Row */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="bg-[#0A0A0A] rounded-lg p-2">
                <span className="text-blue-400 text-xs">Cumulative Revenue</span>
                <div className="font-semibold text-green-400">{formatCurrency(balanceSheetSummary.auto_calculated?.revenue_to_date || 0)}</div>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg p-2">
                <span className="text-blue-400 text-xs">Cumulative Expenses</span>
                <div className="font-semibold text-red-400">{formatCurrency(balanceSheetSummary.auto_calculated?.expenses_to_date || 0)}</div>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg p-2">
                <span className="text-blue-400 text-xs">Cash & Equivalents</span>
                <div className={`font-semibold ${(balanceSheetSummary.auto_calculated?.cash_and_equivalents || balanceSheetSummary.auto_calculated?.cash_from_operations || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(balanceSheetSummary.auto_calculated?.cash_and_equivalents || balanceSheetSummary.auto_calculated?.cash_from_operations || 0)}
                </div>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg p-2">
                <span className="text-blue-400 text-xs">Retained Earnings</span>
                <div className={`font-semibold ${(balanceSheetSummary.auto_calculated?.retained_earnings || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(balanceSheetSummary.auto_calculated?.retained_earnings || 0)}
                </div>
              </div>
              <div className="bg-[#0A0A0A] rounded-lg p-2">
                <span className="text-blue-400 text-xs">Inventory Value</span>
                <div className="font-semibold text-white">{formatCurrency(balanceSheetSummary.auto_calculated?.inventory_value || 0)}</div>
              </div>
            </div>

            {/* Expense Breakdown Row */}
            <div className="mt-3 pt-3 border-t border-blue-500/20">
              <span className="text-xs text-blue-300/60 mb-2 block">Expense Breakdown</span>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                <div className="bg-[#0A0A0A] rounded-lg p-2">
                  <span className="text-orange-400 text-xs">COGS</span>
                  <div className="font-semibold text-red-400">{formatCurrency(balanceSheetSummary.auto_calculated?.cogs || 0)}</div>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg p-2">
                  <span className="text-orange-400 text-xs">Gross Payroll</span>
                  <div className="font-semibold text-red-400">{formatCurrency(balanceSheetSummary.auto_calculated?.payroll_breakdown?.gross_payroll || balanceSheetSummary.auto_calculated?.payroll_expense || 0)}</div>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg p-2">
                  <span className="text-orange-400 text-xs">Salary</span>
                  <div className="font-semibold text-red-400">{formatCurrency(balanceSheetSummary.auto_calculated?.payroll_breakdown?.salary || 0)}</div>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg p-2">
                  <span className="text-orange-400 text-xs">Commission</span>
                  <div className="font-semibold text-red-400">{formatCurrency(balanceSheetSummary.auto_calculated?.payroll_breakdown?.commission || 0)}</div>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg p-2">
                  <span className="text-orange-400 text-xs">Bonus + Allowance</span>
                  <div className="font-semibold text-red-400">{formatCurrency((balanceSheetSummary.auto_calculated?.payroll_breakdown?.bonus || 0) + (balanceSheetSummary.auto_calculated?.payroll_breakdown?.allowance || 0))}</div>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg p-2">
                  <span className="text-orange-400 text-xs">Other Expenses</span>
                  <div className="font-semibold text-red-400">{formatCurrency(balanceSheetSummary.auto_calculated?.manual_expenses || 0)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RatioCard
          title="Current Ratio"
          value={balanceSheetSummary.ratios.current_ratio}
          description="Current Assets / Current Liabilities. Ideal: > 2.0"
          status={getRatioStatus(balanceSheetSummary.ratios.current_ratio, "current_ratio")}
        />
        <RatioCard
          title="Quick Ratio"
          value={balanceSheetSummary.ratios.quick_ratio}
          description="(Current Assets - Inventory) / Current Liabilities"
          status={getRatioStatus(balanceSheetSummary.ratios.quick_ratio, "current_ratio")}
        />
        <RatioCard
          title="Debt-to-Equity Ratio"
          value={balanceSheetSummary.ratios.debt_to_equity_ratio}
          description="Total Liabilities / Total Equity. Ideal: < 1.0"
          status={getRatioStatus(balanceSheetSummary.ratios.debt_to_equity_ratio, "debt_to_equity")}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-[#333333]">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#FF8C42] text-[#FF8C42]"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assets Summary */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-green-400" />
              Assets
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Assets</span>
                <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.assets.current)}</span>
              </div>
              {/* Current Assets Breakdown */}
              {balanceSheetSummary.assets.current_breakdown && (
                <div className="ml-4 space-y-1 text-sm border-l-2 border-green-500/30 pl-3">
                  {(balanceSheetSummary.assets.current_breakdown.manual_non_cash || balanceSheetSummary.assets.current_breakdown.manual || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Other Current Assets</span>
                      <span className="text-gray-400">{formatCurrency(balanceSheetSummary.assets.current_breakdown.manual_non_cash || balanceSheetSummary.assets.current_breakdown.manual || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1">
                      Inventory
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">Auto</span>
                    </span>
                    <span className="text-gray-400">{formatCurrency(balanceSheetSummary.assets.current_breakdown.inventory)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1">
                      Cash & Equivalents
                      <span className="text-xs bg-green-500/20 text-green-400 px-1 py-0.5 rounded">Balanced</span>
                    </span>
                    <span className={`${(balanceSheetSummary.assets.current_breakdown.cash_and_equivalents || balanceSheetSummary.assets.current_breakdown.cash_from_operations || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatCurrency(balanceSheetSummary.assets.current_breakdown.cash_and_equivalents || balanceSheetSummary.assets.current_breakdown.cash_from_operations || 0)}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Fixed Assets</span>
                <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.assets.fixed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Intangible Assets</span>
                <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.assets.intangible)}</span>
              </div>
              <div className="border-t border-[#333333] pt-3 flex justify-between font-semibold">
                <span className="text-white">Total Assets</span>
                <span className="text-green-400">{formatCurrency(balanceSheetSummary.assets.total)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities Summary */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-red-400" />
              Liabilities
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Liabilities</span>
                <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.liabilities.current)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Long-term Liabilities</span>
                <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.liabilities.long_term)}</span>
              </div>
              <div className="border-t border-[#333333] pt-3 flex justify-between font-semibold">
                <span className="text-white">Total Liabilities</span>
                <span className="text-red-400">{formatCurrency(balanceSheetSummary.liabilities.total)}</span>
              </div>
            </div>
          </div>

          {/* Equity Summary */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <PiggyBank size={18} className="text-purple-400" />
              Equity
            </h3>
            <div className="space-y-3">
              {/* Manual Equity Entries */}
              {balanceSheetSummary.equity.owner_capital > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Owner's Capital</span>
                  <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.equity.owner_capital)}</span>
                </div>
              )}
              {balanceSheetSummary.equity.additional_investment > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Additional Investment</span>
                  <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.equity.additional_investment)}</span>
                </div>
              )}
              {balanceSheetSummary.equity.drawings !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Drawings</span>
                  <span className="font-medium text-red-400">{formatCurrency(balanceSheetSummary.equity.drawings)}</span>
                </div>
              )}
              {/* Auto-calculated Retained Earnings */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1">
                  Retained Earnings
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Auto</span>
                </span>
                <span className={`font-medium ${(balanceSheetSummary.equity.calculated_retained_earnings || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(balanceSheetSummary.equity.calculated_retained_earnings || 0)}
                </span>
              </div>
              <div className="border-t border-[#333333] pt-3 flex justify-between font-semibold">
                <span className="text-white">Total Equity</span>
                <span className="text-purple-400">{formatCurrency(balanceSheetSummary.equity.total)}</span>
              </div>
              <div className="border-t border-[#333333] pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-white">Liabilities + Equity</span>
                  <span className="text-[#FF8C42]">{formatCurrency(balanceSheetSummary.liabilities.total + balanceSheetSummary.equity.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "assets" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setAssetModal({ open: true, item: null })}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              Add Asset
            </button>
          </div>

          {/* Current Assets */}
          <div>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              Current Assets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedAssets.current.map((asset) => (
                <ItemCard
                  key={asset._id}
                  item={asset}
                  type="asset"
                  onEdit={(item) => setAssetModal({ open: true, item })}
                  onDelete={(id) => deleteAsset({ asset_id: id })}
                />
              ))}
              {groupedAssets.current.length === 0 && (
                <p className="text-gray-500 text-sm">No current assets recorded</p>
              )}
            </div>
          </div>

          {/* Fixed Assets */}
          <div>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              Fixed Assets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedAssets.fixed.map((asset) => (
                <ItemCard
                  key={asset._id}
                  item={asset}
                  type="asset"
                  onEdit={(item) => setAssetModal({ open: true, item })}
                  onDelete={(id) => deleteAsset({ asset_id: id })}
                />
              ))}
              {groupedAssets.fixed.length === 0 && (
                <p className="text-gray-500 text-sm">No fixed assets recorded</p>
              )}
            </div>
          </div>

          {/* Intangible Assets */}
          <div>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              Intangible Assets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedAssets.intangible.map((asset) => (
                <ItemCard
                  key={asset._id}
                  item={asset}
                  type="asset"
                  onEdit={(item) => setAssetModal({ open: true, item })}
                  onDelete={(id) => deleteAsset({ asset_id: id })}
                />
              ))}
              {groupedAssets.intangible.length === 0 && (
                <p className="text-gray-500 text-sm">No intangible assets recorded</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "liabilities" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setLiabilityModal({ open: true, item: null })}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus size={16} />
              Add Liability
            </button>
          </div>

          {/* Current Liabilities */}
          <div>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              Current Liabilities
              <span className="text-xs text-gray-500 font-normal">(Due within 1 year)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedLiabilities.current.map((liability) => (
                <ItemCard
                  key={liability._id}
                  item={liability}
                  type="liability"
                  onEdit={(item) => setLiabilityModal({ open: true, item })}
                  onDelete={(id) => deleteLiability({ liability_id: id })}
                />
              ))}
              {groupedLiabilities.current.length === 0 && (
                <p className="text-gray-500 text-sm">No current liabilities recorded</p>
              )}
            </div>
          </div>

          {/* Long-term Liabilities */}
          <div>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400"></div>
              Long-term Liabilities
              <span className="text-xs text-gray-500 font-normal">(Due after 1 year)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedLiabilities.long_term.map((liability) => (
                <ItemCard
                  key={liability._id}
                  item={liability}
                  type="liability"
                  onEdit={(item) => setLiabilityModal({ open: true, item })}
                  onDelete={(id) => deleteLiability({ liability_id: id })}
                />
              ))}
              {groupedLiabilities.long_term.length === 0 && (
                <p className="text-gray-500 text-sm">No long-term liabilities recorded</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "equity" && (
        <div className="space-y-6">
          {/* Auto-calculated Retained Earnings Card */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Calculator size={20} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-300">Retained Earnings (Auto-calculated from P&L)</h4>
                <p className="text-sm text-purple-300/70 mt-1">
                  This value is automatically calculated from your cumulative Net Income (Revenue - Expenses).
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <div className="bg-[#0A0A0A] rounded-lg px-4 py-2 border border-[#333333]">
                    <div className="text-xs text-purple-400">Cumulative Revenue</div>
                    <div className="font-bold text-lg text-green-400">
                      {formatCurrency(balanceSheetSummary.auto_calculated?.revenue_to_date || 0)}
                    </div>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg px-4 py-2 border border-[#333333]">
                    <div className="text-xs text-purple-400">Cumulative Expenses</div>
                    <div className="font-bold text-lg text-red-400">
                      {formatCurrency(balanceSheetSummary.auto_calculated?.expenses_to_date || 0)}
                    </div>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg px-4 py-2 border border-[#333333]">
                    <div className="text-xs text-purple-400">= Retained Earnings</div>
                    <div className={`font-bold text-lg ${(balanceSheetSummary.auto_calculated?.retained_earnings || 0) >= 0 ? "text-purple-400" : "text-red-400"}`}>
                      {formatCurrency(balanceSheetSummary.auto_calculated?.retained_earnings || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Equity Entries */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Manual Equity Entries</h3>
            <button
              onClick={() => setEquityModal({ open: true, item: null })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus size={16} />
              Add Equity Entry
            </button>
          </div>

          {/* Info about what to add manually */}
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-3 flex items-start gap-2">
            <Info size={16} className="text-gray-500 mt-0.5" />
            <p className="text-sm text-gray-400">
              Add manual entries for: Owner's Capital, Additional Investments, Drawings (withdrawals), and other equity changes not captured in P&L.
            </p>
          </div>

          <div className="space-y-3">
            {equityEntries?.filter(e => e.equity_type !== "retained_earnings").map((entry) => (
              <EquityCard
                key={entry._id}
                entry={entry}
                onEdit={(item) => setEquityModal({ open: true, item })}
                onDelete={(id) => deleteEquity({ equity_id: id })}
              />
            ))}
            {(!equityEntries || equityEntries.filter(e => e.equity_type !== "retained_earnings").length === 0) && (
              <p className="text-gray-500 text-sm">No manual equity entries recorded. Retained earnings are auto-calculated from P&L.</p>
            )}
          </div>

          {/* Total Equity Summary */}
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4">
            <h4 className="font-medium text-white mb-3">Equity Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Manual Entries Total</span>
                <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.equity.manual_total || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Retained Earnings (Auto)</span>
                <span className="font-medium text-gray-200">{formatCurrency(balanceSheetSummary.equity.calculated_retained_earnings || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-[#333333] pt-2 font-semibold">
                <span className="text-white">Total Equity</span>
                <span className="text-purple-400">{formatCurrency(balanceSheetSummary.equity.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "periods" && (
        <div className="space-y-6">
          {/* Current Open Period Alert */}
          {currentOpenPeriod && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Calendar className="text-blue-400 mt-0.5" size={20} />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-400">Current Open Period</h4>
                  <p className="text-sm text-blue-300/70 mt-1">
                    <span className="font-semibold">{currentOpenPeriod.period_name}</span>
                    {" "}({formatDate(currentOpenPeriod.start_date)} - {formatDate(currentOpenPeriod.end_date)})
                  </p>
                  <button
                    onClick={() => setClosePeriodModal({ open: true, period: currentOpenPeriod })}
                    className="mt-2 flex items-center gap-1 px-3 py-1.5 text-sm bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-colors"
                  >
                    <Lock size={14} />
                    Close This Period
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Accounting Periods</h3>
              <p className="text-sm text-gray-500">Close periods to create frozen financial snapshots</p>
            </div>
            <button
              onClick={() => setCreatePeriodModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-colors"
            >
              <Plus size={16} />
              Create Period
            </button>
          </div>

          {/* Info Card */}
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-gray-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-white">Why Close Periods?</h4>
                <ul className="text-sm text-gray-400 mt-1 space-y-1">
                  <li>• <strong className="text-gray-300">Historical Record:</strong> Creates a frozen snapshot of your financial position</li>
                  <li>• <strong className="text-gray-300">Period Comparison:</strong> Compare performance between different periods</li>
                  <li>• <strong className="text-gray-300">Audit Trail:</strong> Your accountant will appreciate the organized monthly/quarterly records</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Period Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-green-500/30 transition-colors">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Unlock size={14} className="text-green-400" />
                Open Periods
              </div>
              <div className="text-2xl font-bold text-green-400">
                {accountingPeriods?.filter((p) => p.status === "open").length || 0}
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Clock size={14} className="text-amber-400" />
                Closing
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {accountingPeriods?.filter((p) => p.status === "closing").length || 0}
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-gray-400/30 transition-colors">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Lock size={14} className="text-gray-400" />
                Closed
              </div>
              <div className="text-2xl font-bold text-gray-400">
                {accountingPeriods?.filter((p) => p.status === "closed").length || 0}
              </div>
            </div>
          </div>

          {/* Period List */}
          <div className="space-y-3">
            {accountingPeriods?.map((period) => (
              <PeriodCard
                key={period._id}
                period={period}
                onClose={(p) => setClosePeriodModal({ open: true, period: p })}
                onReopen={(p) => setReopenPeriodModal({ open: true, period: p })}
                onDelete={async (id) => {
                  if (window.confirm("Are you sure you want to delete this period?")) {
                    try {
                      await deletePeriod({ period_id: id });
                    } catch (error) {
                      alert(error.message || "Failed to delete period");
                    }
                  }
                }}
                onCompare={(p) => setComparisonModal({ open: true, period: p })}
              />
            ))}
            {(!accountingPeriods || accountingPeriods.length === 0) && (
              <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#333333]">
                <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
                <h4 className="font-medium text-white">No Accounting Periods</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Create your first accounting period to start tracking financial snapshots.
                </p>
                <button
                  onClick={() => setCreatePeriodModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/80 transition-colors"
                >
                  <Plus size={16} />
                  Create First Period
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AssetModal
        isOpen={assetModal.open}
        onClose={() => setAssetModal({ open: false, item: null })}
        asset={assetModal.item}
        branchId={branchId}
        userId={userId}
      />

      <LiabilityModal
        isOpen={liabilityModal.open}
        onClose={() => setLiabilityModal({ open: false, item: null })}
        liability={liabilityModal.item}
        branchId={branchId}
        userId={userId}
      />

      <EquityModal
        isOpen={equityModal.open}
        onClose={() => setEquityModal({ open: false, item: null })}
        equity={equityModal.item}
        branchId={branchId}
        userId={userId}
      />

      <CreatePeriodModal
        isOpen={createPeriodModal}
        onClose={() => setCreatePeriodModal(false)}
        branchId={branchId}
        userId={userId}
      />

      <ClosePeriodModal
        isOpen={closePeriodModal.open}
        onClose={() => setClosePeriodModal({ open: false, period: null })}
        period={closePeriodModal.period}
        branchId={branchId}
        userId={userId}
      />

      <ReopenPeriodModal
        isOpen={reopenPeriodModal.open}
        onClose={() => setReopenPeriodModal({ open: false, period: null })}
        period={reopenPeriodModal.period}
        userId={userId}
      />

      <PeriodComparisonModal
        isOpen={comparisonModal.open}
        onClose={() => setComparisonModal({ open: false, period: null })}
        period={comparisonModal.period}
        branchId={branchId}
      />
    </div>
  );
}
