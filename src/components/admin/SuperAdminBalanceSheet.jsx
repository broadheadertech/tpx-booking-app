import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  CreditCard,
  Calculator,
  Download,
  FileText,
  Landmark,
  Percent,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  X,
  Building,
  Wallet,
  Car,
  Briefcase,
  Receipt,
  RefreshCw,
  Package,
  Monitor,
  Home,
  Clock,
  Info,
  Lock,
  Unlock,
  Calendar,
  CheckCircle,
  AlertCircle,
  History,
} from "lucide-react";

// Category display mappings
const ASSET_CATEGORIES = {
  cash: { label: "Cash on Hand", icon: DollarSign, type: "current" },
  bank_accounts: { label: "Bank Accounts", icon: Landmark, type: "current" },
  accounts_receivable: { label: "Accounts Receivable", icon: Receipt, type: "current" },
  prepaid_expenses: { label: "Prepaid Expenses", icon: Clock, type: "current" },
  equipment: { label: "Equipment", icon: Briefcase, type: "fixed" },
  furniture: { label: "Furniture", icon: Home, type: "fixed" },
  vehicles: { label: "Vehicles", icon: Car, type: "fixed" },
  warehouse_equipment: { label: "Warehouse Equipment", icon: Package, type: "fixed" },
  software: { label: "Software", icon: Monitor, type: "intangible" },
  trademarks: { label: "Trademarks", icon: FileText, type: "intangible" },
  franchise_rights: { label: "Franchise Rights", icon: Building, type: "intangible" },
  deposits: { label: "Deposits", icon: PiggyBank, type: "intangible" },
  other: { label: "Other", icon: FileText, type: "intangible" },
};

const LIABILITY_CATEGORIES = {
  accounts_payable: { label: "Accounts Payable", type: "current" },
  wages_payable: { label: "Wages Payable", type: "current" },
  taxes_payable: { label: "Taxes Payable", type: "current" },
  credit_card: { label: "Credit Card", type: "current" },
  short_term_loan: { label: "Short-term Loan", type: "current" },
  accrued_expenses: { label: "Accrued Expenses", type: "current" },
  bank_loan: { label: "Bank Loan", type: "long_term" },
  equipment_financing: { label: "Equipment Financing", type: "long_term" },
  owner_loan: { label: "Owner Loan", type: "long_term" },
  other: { label: "Other", type: "long_term" },
};

const EQUITY_TYPES = {
  owner_capital: { label: "Owner's Capital", description: "Initial or ongoing investment by owner" },
  retained_earnings: { label: "Retained Earnings", description: "Auto-calculated from P&L" },
  drawings: { label: "Drawings", description: "Owner withdrawals (recorded as negative)" },
  additional_investment: { label: "Additional Investment", description: "Extra capital contributions" },
  other: { label: "Other", description: "Other equity transactions" },
};

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
    neutral: "text-gray-300 bg-gray-500/10",
  };

  const getStatus = (ratioType, val) => {
    if (val === null || val === undefined) return "neutral";
    if (ratioType === "current_ratio") {
      if (val >= 2) return "good";
      if (val >= 1) return "warning";
      return "danger";
    }
    if (ratioType === "debt_to_equity") {
      if (val <= 1) return "good";
      if (val <= 2) return "warning";
      return "danger";
    }
    return "neutral";
  };

  const actualStatus = status || getStatus(title.toLowerCase().replace(/ /g, "_"), value);

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <Calculator size={16} className="text-gray-500" />
      </div>
      <div className={`text-xl font-bold ${statusColors[actualStatus]} rounded px-2 py-1 inline-block`}>
        {value !== null && value !== undefined ? value.toFixed(2) : "N/A"}
      </div>
      <div className="text-xs text-gray-500 mt-2">{description}</div>
    </div>
  );
};

// Asset Item Card with expandable details
const AssetCard = ({ asset, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const categoryInfo = ASSET_CATEGORIES[asset.category] || { label: asset.category, icon: FileText };
  const Icon = categoryInfo.icon;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
            <Icon size={18} />
          </div>
          <div>
            <div className="font-medium text-white">{asset.name}</div>
            <div className="text-xs text-gray-500">{categoryInfo.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="font-semibold text-green-400">{formatCurrency(asset.current_value)}</div>
            <div className="text-xs text-gray-500 capitalize">{asset.asset_type} asset</div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#333333] space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Purchase Value:</span>
            <span className="text-gray-300">{formatCurrency(asset.purchase_value)}</span>
          </div>
          {asset.purchase_date && (
            <div className="flex justify-between">
              <span className="text-gray-500">Purchase Date:</span>
              <span className="text-gray-300">{formatDate(asset.purchase_date)}</span>
            </div>
          )}
          {asset.depreciation_rate > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Depreciation Rate:</span>
              <span className="text-gray-300">{asset.depreciation_rate}%/year</span>
            </div>
          )}
          {asset.notes && (
            <div className="mt-2">
              <span className="text-gray-500">Notes:</span>
              <p className="text-gray-400 mt-1">{asset.notes}</p>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onEdit(asset)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={() => onDelete(asset._id)}
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

// Liability Item Card with expandable details
const LiabilityCard = ({ liability, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const categoryInfo = LIABILITY_CATEGORIES[liability.category] || { label: liability.category };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
            <CreditCard size={18} />
          </div>
          <div>
            <div className="font-medium text-white">{liability.name}</div>
            <div className="text-xs text-gray-500">{categoryInfo.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="font-semibold text-red-400">{formatCurrency(liability.current_balance)}</div>
            <div className="text-xs text-gray-500 capitalize">{liability.liability_type.replace("_", "-")}</div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-[#333333] rounded text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#333333] space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Original Amount:</span>
            <span className="text-gray-300">{formatCurrency(liability.original_amount)}</span>
          </div>
          {liability.interest_rate > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Interest Rate:</span>
              <span className="text-gray-300">{liability.interest_rate}%</span>
            </div>
          )}
          {liability.due_date && (
            <div className="flex justify-between">
              <span className="text-gray-500">Due Date:</span>
              <span className="text-gray-300">{formatDate(liability.due_date)}</span>
            </div>
          )}
          {liability.creditor && (
            <div className="flex justify-between">
              <span className="text-gray-500">Creditor:</span>
              <span className="text-gray-300">{liability.creditor}</span>
            </div>
          )}
          {liability.notes && (
            <div className="mt-2">
              <span className="text-gray-500">Notes:</span>
              <p className="text-gray-400 mt-1">{liability.notes}</p>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onEdit(liability)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={() => onDelete(liability._id)}
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
const EquityCard = ({ entry, onEdit, onDelete, isAutomated }) => {
  const typeInfo = EQUITY_TYPES[entry.equity_type] || { label: entry.equity_type };
  const isNegative = entry.amount < 0;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <PiggyBank size={18} />
          </div>
          <div>
            <div className="font-medium text-white flex items-center gap-2">
              {entry.description}
              {isAutomated && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Auto</span>
              )}
            </div>
            <div className="text-xs text-gray-500">{typeInfo.label}</div>
            {entry.transaction_date && (
              <div className="text-xs text-gray-600 mt-1">{formatDate(entry.transaction_date)}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`font-semibold ${isNegative ? "text-red-400" : "text-purple-400"}`}>
            {formatCurrency(entry.amount)}
          </div>
          {!isAutomated && (
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
          )}
        </div>
      </div>
    </div>
  );
};

// Add/Edit Asset Modal
const AssetModal = ({ isOpen, onClose, asset, userId }) => {
  const getInitialData = () => ({
    asset_type: "current",
    category: "cash",
    name: "",
    purchase_value: "",
    current_value: "",
    purchase_date: new Date().toISOString().split("T")[0],
    depreciation_rate: "",
    notes: "",
  });

  const [formData, setFormData] = useState(getInitialData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        setFormData({
          asset_type: asset.asset_type,
          category: asset.category,
          name: asset.name,
          purchase_value: asset.purchase_value,
          current_value: asset.current_value,
          purchase_date: asset.purchase_date ? new Date(asset.purchase_date).toISOString().split("T")[0] : "",
          depreciation_rate: asset.depreciation_rate || "",
          notes: asset.notes || "",
        });
      } else {
        setFormData(getInitialData());
      }
    }
  }, [asset, isOpen]);

  const addAsset = useMutation(api.services.accounting.addSuperAdminAsset);
  const updateAsset = useMutation(api.services.accounting.updateSuperAdminAsset);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (asset) {
        await updateAsset({
          id: asset._id,
          asset_type: formData.asset_type,
          category: formData.category,
          name: formData.name,
          purchase_value: parseFloat(formData.purchase_value) || 0,
          current_value: parseFloat(formData.current_value) || 0,
          purchase_date: formData.purchase_date ? new Date(formData.purchase_date).getTime() : undefined,
          depreciation_rate: formData.depreciation_rate ? parseFloat(formData.depreciation_rate) : undefined,
          notes: formData.notes || undefined,
        });
      } else {
        await addAsset({
          asset_type: formData.asset_type,
          category: formData.category,
          name: formData.name,
          purchase_value: parseFloat(formData.purchase_value) || 0,
          current_value: parseFloat(formData.current_value) || 0,
          purchase_date: formData.purchase_date ? new Date(formData.purchase_date).getTime() : undefined,
          depreciation_rate: formData.depreciation_rate ? parseFloat(formData.depreciation_rate) : undefined,
          notes: formData.notes || undefined,
          created_by: userId,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving asset:", error);
    } finally {
      setIsSubmitting(false);
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
              placeholder="e.g., Office Equipment"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Purchase Value (PHP)</label>
              <input
                type="number"
                value={formData.purchase_value}
                onChange={(e) => setFormData({ ...formData, purchase_value: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Current Value (PHP)</label>
              <input
                type="number"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
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
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Depreciation (%/yr)</label>
              <input
                type="number"
                value={formData.depreciation_rate}
                onChange={(e) => setFormData({ ...formData, depreciation_rate: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                max="100"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
              rows={2}
              placeholder="Additional notes..."
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : asset ? "Update Asset" : "Add Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Add/Edit Liability Modal
const LiabilityModal = ({ isOpen, onClose, liability, userId }) => {
  const getInitialData = () => ({
    liability_type: "current",
    category: "accounts_payable",
    name: "",
    original_amount: "",
    current_balance: "",
    interest_rate: "",
    due_date: "",
    creditor: "",
    notes: "",
  });

  const [formData, setFormData] = useState(getInitialData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (liability) {
        setFormData({
          liability_type: liability.liability_type,
          category: liability.category,
          name: liability.name,
          original_amount: liability.original_amount,
          current_balance: liability.current_balance,
          interest_rate: liability.interest_rate || "",
          due_date: liability.due_date ? new Date(liability.due_date).toISOString().split("T")[0] : "",
          creditor: liability.creditor || "",
          notes: liability.notes || "",
        });
      } else {
        setFormData(getInitialData());
      }
    }
  }, [liability, isOpen]);

  const addLiability = useMutation(api.services.accounting.addSuperAdminLiability);
  const updateLiability = useMutation(api.services.accounting.updateSuperAdminLiability);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (liability) {
        await updateLiability({
          id: liability._id,
          liability_type: formData.liability_type,
          category: formData.category,
          name: formData.name,
          original_amount: parseFloat(formData.original_amount) || 0,
          current_balance: parseFloat(formData.current_balance) || 0,
          interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : undefined,
          due_date: formData.due_date ? new Date(formData.due_date).getTime() : undefined,
          creditor: formData.creditor || undefined,
          notes: formData.notes || undefined,
        });
      } else {
        await addLiability({
          liability_type: formData.liability_type,
          category: formData.category,
          name: formData.name,
          original_amount: parseFloat(formData.original_amount) || 0,
          current_balance: parseFloat(formData.current_balance) || 0,
          interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : undefined,
          due_date: formData.due_date ? new Date(formData.due_date).getTime() : undefined,
          creditor: formData.creditor || undefined,
          notes: formData.notes || undefined,
          created_by: userId,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving liability:", error);
    } finally {
      setIsSubmitting(false);
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
            <label className="block text-sm font-medium text-gray-400 mb-1">Name/Description</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              placeholder="e.g., Bank Loan - BDO"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Original Amount (PHP)</label>
              <input
                type="number"
                value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Current Balance (PHP)</label>
              <input
                type="number"
                value={formData.current_balance}
                onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
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
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Creditor (Optional)</label>
            <input
              type="text"
              value={formData.creditor}
              onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              placeholder="e.g., BDO, Metrobank"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
              rows={2}
              placeholder="Additional notes..."
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : liability ? "Update Liability" : "Add Liability"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Add/Edit Equity Modal
const EquityModal = ({ isOpen, onClose, entry, userId }) => {
  const getInitialData = () => ({
    equity_type: "owner_capital",
    description: "",
    amount: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [formData, setFormData] = useState(getInitialData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setFormData({
          equity_type: entry.equity_type,
          description: entry.description,
          amount: Math.abs(entry.amount),
          transaction_date: entry.transaction_date ? new Date(entry.transaction_date).toISOString().split("T")[0] : "",
          notes: entry.notes || "",
        });
      } else {
        setFormData(getInitialData());
      }
    }
  }, [entry, isOpen]);

  const addEquity = useMutation(api.services.accounting.addSuperAdminEquity);
  const updateEquity = useMutation(api.services.accounting.updateSuperAdminEquity);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const amount = parseFloat(formData.amount) || 0;
      const finalAmount = formData.equity_type === "drawings" ? -Math.abs(amount) : amount;

      if (entry) {
        await updateEquity({
          id: entry._id,
          equity_type: formData.equity_type,
          description: formData.description,
          amount: finalAmount,
          transaction_date: new Date(formData.transaction_date).getTime(),
          notes: formData.notes || undefined,
        });
      } else {
        await addEquity({
          equity_type: formData.equity_type,
          description: formData.description,
          amount: finalAmount,
          transaction_date: new Date(formData.transaction_date).getTime(),
          notes: formData.notes || undefined,
          created_by: userId,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving equity entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#333333]">
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{entry ? "Edit Equity Entry" : "Add Equity Entry"}</h3>
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
              {Object.entries(EQUITY_TYPES)
                .filter(([key]) => key !== "retained_earnings")
                .map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {EQUITY_TYPES[formData.equity_type]?.description}
            </p>
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
                Amount (PHP)
                {formData.equity_type === "drawings" && (
                  <span className="text-amber-400 ml-1">(will be negative)</span>
                )}
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Transaction Date</label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
              rows={2}
              placeholder="Additional notes..."
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : entry ? "Update Entry" : "Add Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Add/Edit Period Modal
const PeriodModal = ({ isOpen, onClose, userId }) => {
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
    api.services.accounting.getSuggestedPeriodsForSuperAdmin,
    { year: selectedYear }
  );

  const createPeriod = useMutation(api.services.accounting.createSuperAdminAccountingPeriod);

  const handleCreateSuggested = async (suggestion) => {
    try {
      await createPeriod({
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
        period_name: formData.period_name,
        period_type: formData.period_type,
        start_date: formData.start_date,
        end_date: new Date(formData.end_date).setHours(23, 59, 59, 999),
        notes: formData.notes || undefined,
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
                <label className="block text-sm font-medium text-gray-400 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-400 text-sm">
                    New periods are created as "Open". You can close them later to lock financial data and create a snapshot of the balance sheet at that point in time.
                  </p>
                </div>
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

// Export to PDF
const exportToPDF = (data, assets, liabilities) => {
  const printWindow = window.open("", "_blank");

  const assetRows = assets.map(a => `
    <tr>
      <td style="padding-left: 20px;">- ${a.name}</td>
      <td style="color: #666;">${ASSET_CATEGORIES[a.category]?.label || a.category}</td>
      <td class="amount">${formatCurrency(a.current_value)}</td>
    </tr>
  `).join('');

  const liabilityRows = liabilities.map(l => `
    <tr>
      <td style="padding-left: 20px;">- ${l.name}</td>
      <td style="color: #666;">${LIABILITY_CATEGORIES[l.category]?.label || l.category}</td>
      <td class="amount">${formatCurrency(l.current_balance)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Super Admin Balance Sheet</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #FF8C42; border-bottom: 2px solid #FF8C42; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .amount { text-align: right; font-weight: 500; }
        .total { font-weight: bold; background-color: #f5f5f5; }
        .positive { color: green; }
        .negative { color: red; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .date { color: #666; }
        .equation { text-align: center; padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 20px 0; font-size: 18px; }
        .automated { color: #999; font-style: italic; }
        .ratio-good { color: green; }
        .ratio-warning { color: #f59e0b; }
        .ratio-danger { color: red; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Super Admin Balance Sheet</h1>
        <div class="date">As of ${formatDate(data.as_of_date)}</div>
      </div>
      <p><em>Headquarters / Franchisor Financial Position</em></p>

      <div class="equation">
        <strong>Assets</strong> (${formatCurrency(data.total_assets)}) =
        <strong>Liabilities</strong> (${formatCurrency(data.total_liabilities)}) +
        <strong>Equity</strong> (${formatCurrency(data.total_equity)})
      </div>

      <h2>Assets</h2>
      <table>
        <tr><th>Item</th><th>Category</th><th class="amount">Value</th></tr>
        ${data.assets.royalty_cash_received > 0 ? `
          <tr class="automated" style="color: green;">
            <td style="padding-left: 20px;">- Royalty Cash (Sales)</td>
            <td>Automated - ${data.paid_royalty_count} paid royalties</td>
            <td class="amount positive">${formatCurrency(data.assets.royalty_cash_received)}</td>
          </tr>
        ` : ''}
        ${data.assets.product_order_cash_received > 0 ? `
          <tr class="automated" style="color: green;">
            <td style="padding-left: 20px;">- Product Order Cash (Sales)</td>
            <td>Automated - ${data.paid_order_count} paid orders</td>
            <td class="amount positive">${formatCurrency(data.assets.product_order_cash_received)}</td>
          </tr>
        ` : ''}
        ${data.assets.manual_revenue_to_sales_cash > 0 ? `
          <tr class="automated" style="color: green;">
            <td style="padding-left: 20px;">- Manual Revenue to Sales Cash</td>
            <td>Manual revenue received to sales cash pool</td>
            <td class="amount positive">${formatCurrency(data.assets.manual_revenue_to_sales_cash)}</td>
          </tr>
        ` : ''}
        ${data.assets.expenses_from_sales_cash > 0 ? `
          <tr class="automated" style="color: red;">
            <td style="padding-left: 20px;">- Expenses Paid from Sales Cash</td>
            <td>Deducted from sales cash pool</td>
            <td class="amount negative">-${formatCurrency(data.assets.expenses_from_sales_cash)}</td>
          </tr>
        ` : ''}
        ${data.assets.total_sales_cash > 0 ? `
          <tr style="background-color: #f0fff0;">
            <td style="padding-left: 20px; font-weight: bold;">Net Sales Cash</td>
            <td>Total cash available from sales operations</td>
            <td class="amount positive" style="font-weight: bold;">${formatCurrency(data.assets.net_sales_cash || data.assets.total_sales_cash)}</td>
          </tr>
        ` : ''}
        ${data.assets.royalty_receivables > 0 ? `
          <tr class="automated">
            <td style="padding-left: 20px;">- Royalty Receivables</td>
            <td>Automated - ${data.pending_royalty_count} pending</td>
            <td class="amount">${formatCurrency(data.assets.royalty_receivables)}</td>
          </tr>
        ` : ''}
        ${data.assets.order_receivables > 0 ? `
          <tr class="automated">
            <td style="padding-left: 20px;">- Product Order Receivables</td>
            <td>Automated - ${data.pending_order_count} pending</td>
            <td class="amount">${formatCurrency(data.assets.order_receivables)}</td>
          </tr>
        ` : ''}
        ${assetRows}
        <tr class="total"><td colspan="2">Total Assets</td><td class="amount">${formatCurrency(data.total_assets)}</td></tr>
      </table>

      <h2>Liabilities</h2>
      <table>
        <tr><th>Item</th><th>Category</th><th class="amount">Balance</th></tr>
        ${liabilityRows}
        <tr class="total"><td colspan="2">Total Liabilities</td><td class="amount">${formatCurrency(data.total_liabilities)}</td></tr>
      </table>

      <h2>Equity</h2>
      <table>
        <tr><th>Category</th><th class="amount">Amount</th></tr>
        ${Object.entries(data.equity.by_type || {}).map(([type, amount]) => `
          <tr>
            <td>${EQUITY_TYPES[type]?.label || type.replace(/_/g, ' ')}</td>
            <td class="amount ${amount < 0 ? 'negative' : ''}">${formatCurrency(amount)}</td>
          </tr>
        `).join('')}
        <tr class="total"><td>Total Equity</td><td class="amount ${data.total_equity >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.total_equity)}</td></tr>
      </table>

      <h2>Financial Ratios</h2>
      <table>
        <tr><th>Ratio</th><th class="amount">Value</th><th>Interpretation</th></tr>
        <tr>
          <td>Current Ratio</td>
          <td class="amount ${data.ratios.current_ratio >= 2 ? 'ratio-good' : data.ratios.current_ratio >= 1 ? 'ratio-warning' : 'ratio-danger'}">${data.ratios.current_ratio !== null ? data.ratios.current_ratio.toFixed(2) : 'N/A'}</td>
          <td>${data.ratios.current_ratio >= 2 ? 'Strong' : data.ratios.current_ratio >= 1 ? 'Adequate' : 'Weak'} liquidity</td>
        </tr>
        <tr>
          <td>Debt-to-Equity</td>
          <td class="amount ${data.ratios.debt_to_equity <= 1 ? 'ratio-good' : data.ratios.debt_to_equity <= 2 ? 'ratio-warning' : 'ratio-danger'}">${data.ratios.debt_to_equity !== null ? data.ratios.debt_to_equity.toFixed(2) : 'N/A'}</td>
          <td>${data.ratios.debt_to_equity <= 1 ? 'Low' : data.ratios.debt_to_equity <= 2 ? 'Moderate' : 'High'} leverage</td>
        </tr>
        <tr>
          <td>Working Capital</td>
          <td class="amount ${data.ratios.working_capital >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.ratios.working_capital)}</td>
          <td>${data.ratios.working_capital >= 0 ? 'Positive' : 'Negative'} working capital</td>
        </tr>
      </table>

      <p style="margin-top: 40px; color: #999; font-size: 12px;">
        Generated on ${new Date().toLocaleString()} | Assets: ${data.asset_count} | Liabilities: ${data.liability_count} | Equity Entries: ${data.equity_entry_count}
      </p>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
};

// Export to CSV
const exportToCSV = (data, assets, liabilities, filename) => {
  const rows = [
    ["SUPER ADMIN BALANCE SHEET", ""],
    [`As of: ${formatDate(data.as_of_date)}`, ""],
    ["", ""],
    ["ASSETS", ""],
    ["Current Assets", formatCurrency(data.assets.current)],
    ["  - Royalty Cash (Sales - Automated)", formatCurrency(data.assets.royalty_cash_received || 0)],
    ["  - Product Order Cash (Sales - Automated)", formatCurrency(data.assets.product_order_cash_received || 0)],
    ["  - Manual Revenue to Sales Cash", formatCurrency(data.assets.manual_revenue_to_sales_cash || 0)],
    ["  - Gross Sales Cash", formatCurrency(data.assets.total_sales_cash || 0)],
    ["  - Expenses Paid from Sales Cash", formatCurrency(-(data.assets.expenses_from_sales_cash || 0))],
    ["  - Net Sales Cash", formatCurrency(data.assets.net_sales_cash || data.assets.total_sales_cash || 0)],
    ["  - Royalty Receivables (Automated)", formatCurrency(data.assets.royalty_receivables)],
    ["  - Product Order Receivables (Automated)", formatCurrency(data.assets.order_receivables)],
    ["Fixed Assets", formatCurrency(data.assets.fixed)],
    ["Intangible Assets", formatCurrency(data.assets.intangible)],
    ...assets.map(a => [`  - ${a.name}`, formatCurrency(a.current_value)]),
    ["Total Assets", formatCurrency(data.total_assets)],
    ["", ""],
    ["LIABILITIES", ""],
    ["Current Liabilities", formatCurrency(data.liabilities.current)],
    ["Long-term Liabilities", formatCurrency(data.liabilities.long_term)],
    ...liabilities.map(l => [`  - ${l.name}`, formatCurrency(l.current_balance)]),
    ["Total Liabilities", formatCurrency(data.total_liabilities)],
    ["", ""],
    ["EQUITY", ""],
    ...Object.entries(data.equity.by_type || {}).map(([type, amount]) => [
      EQUITY_TYPES[type]?.label || type.replace(/_/g, ' '),
      formatCurrency(amount)
    ]),
    ["Total Equity", formatCurrency(data.total_equity)],
    ["", ""],
    ["FINANCIAL RATIOS", ""],
    ["Current Ratio", data.ratios.current_ratio?.toFixed(2) || "N/A"],
    ["Debt-to-Equity", data.ratios.debt_to_equity?.toFixed(2) || "N/A"],
    ["Working Capital", formatCurrency(data.ratios.working_capital)],
  ];

  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

// Close Period Modal
const ClosePeriodModal = ({ isOpen, onClose, period, userId, closePeriodMutation }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await closePeriodMutation({ period_id: period._id, closed_by: userId });
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
                <h4 className="font-medium text-amber-400">Warning</h4>
                <p className="text-sm text-amber-400/80 mt-1">
                  Closing this period will lock all transactions within the date range.
                  This action can be undone by reopening the period.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#333333]">
            <p className="text-sm text-gray-400">Period to close:</p>
            <p className="text-white font-medium mt-1">{period.period_name}</p>
            <p className="text-sm text-gray-400 mt-2">
              {formatDate(period.start_date)} - {formatDate(period.end_date)}
            </p>
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
              <Lock size={16} />
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
const ReopenPeriodModal = ({ isOpen, onClose, period, userId, reopenPeriodMutation }) => {
  const [reason, setReason] = useState("");
  const [isReopening, setIsReopening] = useState(false);

  const handleReopen = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for reopening");
      return;
    }

    setIsReopening(true);
    try {
      await reopenPeriodMutation({
        period_id: period._id,
        reason: reason.trim(),
        reopened_by: userId,
      });
      setReason("");
      onClose();
    } catch (error) {
      console.error("Error reopening period:", error);
      alert(error.message || "Failed to reopen period");
    } finally {
      setIsReopening(false);
    }
  };

  if (!isOpen || !period) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-md border border-[#333333]">
        <div className="p-4 border-b border-[#333333]">
          <h3 className="text-lg font-semibold text-white">Reopen Accounting Period</h3>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-red-400">Warning</h4>
                <p className="text-sm text-red-400/80 mt-1">
                  Reopening a closed period should only be done for corrections.
                  This action will be logged and audited.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#333333]">
            <p className="text-sm text-gray-400">Period to reopen:</p>
            <p className="text-white font-medium mt-1">{period.period_name}</p>
            <p className="text-sm text-gray-400 mt-2">
              {formatDate(period.start_date)} - {formatDate(period.end_date)}
            </p>
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
              disabled={isReopening}
              className="flex-1 px-4 py-2 border border-[#333333] rounded-lg text-gray-300 hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReopen}
              disabled={isReopening || !reason.trim()}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Unlock size={16} />
              {isReopening ? "Reopening..." : "Reopen Period"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Period Comparison Modal for Super Admin
const PeriodComparisonModal = ({ isOpen, onClose, period }) => {
  const [compareToPeriodId, setCompareToPeriodId] = useState(null);

  const allPeriods = useQuery(
    api.services.accounting.getSuperAdminAccountingPeriods,
    {}
  );

  const comparison = useQuery(
    api.services.accounting.compareSuperAdminPeriods,
    compareToPeriodId && period
      ? { period_id_1: compareToPeriodId, period_id_2: period._id }
      : "skip"
  );

  // Filter to only closed periods and exclude current period
  const closedPeriods = allPeriods?.filter((p) => p.status === "closed" && p._id !== period?._id) || [];

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

  if (!isOpen || !period) return null;

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
              {closedPeriods.map((p) => (
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
                ].map(({ label, key }) => {
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

          {!compareToPeriodId && closedPeriods.length === 0 && (
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

// Main Component
const SuperAdminBalanceSheet = () => {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [assetModal, setAssetModal] = useState({ open: false, asset: null });
  const [liabilityModal, setLiabilityModal] = useState({ open: false, liability: null });
  const [equityModal, setEquityModal] = useState({ open: false, entry: null });
  const [periodModal, setPeriodModal] = useState({ open: false });
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [closePeriodModal, setClosePeriodModal] = useState({ open: false, period: null });
  const [reopenPeriodModal, setReopenPeriodModal] = useState({ open: false, period: null });
  const [comparisonModal, setComparisonModal] = useState({ open: false, period: null });

  // Query consolidated balance sheet data
  const balanceSheet = useQuery(api.services.accounting.getConsolidatedBalanceSheet, {});

  // Query individual entries
  const assets = useQuery(api.services.accounting.getSuperAdminAssets, {}) || [];
  const liabilities = useQuery(api.services.accounting.getSuperAdminLiabilities, {}) || [];
  const equityEntries = useQuery(api.services.accounting.getSuperAdminEquityEntries, {}) || [];

  // Query accounting periods
  const accountingPeriods = useQuery(api.services.accounting.getSuperAdminAccountingPeriods, {}) || [];
  const currentOpenPeriod = useQuery(api.services.accounting.getCurrentOpenSuperAdminPeriod, {});

  // Mutations
  const deactivateAsset = useMutation(api.services.accounting.deactivateSuperAdminAsset);
  const deactivateLiability = useMutation(api.services.accounting.deactivateSuperAdminLiability);
  const deleteEquity = useMutation(api.services.accounting.deleteSuperAdminEquity);

  // Period mutations
  const createPeriod = useMutation(api.services.accounting.createSuperAdminAccountingPeriod);
  const closePeriod = useMutation(api.services.accounting.closeSuperAdminAccountingPeriod);
  const reopenPeriod = useMutation(api.services.accounting.reopenSuperAdminAccountingPeriod);
  const deletePeriod = useMutation(api.services.accounting.deleteSuperAdminAccountingPeriod);
  const markPeriodClosing = useMutation(api.services.accounting.markSuperAdminPeriodClosing);

  const isLoading = balanceSheet === undefined;

  // Handle delete
  const handleDeleteAsset = async (id) => {
    if (!confirm("Are you sure you want to remove this asset?")) return;
    try {
      await deactivateAsset({ id });
    } catch (error) {
      console.error("Error removing asset:", error);
    }
  };

  const handleDeleteLiability = async (id) => {
    if (!confirm("Are you sure you want to remove this liability?")) return;
    try {
      await deactivateLiability({ id });
    } catch (error) {
      console.error("Error removing liability:", error);
    }
  };

  const handleDeleteEquity = async (id) => {
    if (!confirm("Are you sure you want to delete this equity entry?")) return;
    try {
      await deleteEquity({ id });
    } catch (error) {
      console.error("Error deleting equity entry:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-[#333333] rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-[#1A1A1A] rounded-xl border border-[#333333]"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-[var(--color-primary)]" />
            Super Admin Balance Sheet
          </h2>
          <p className="text-gray-400 text-sm">
            As of {formatDate(balanceSheet?.as_of_date || Date.now())} • Headquarters Financial Position
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => balanceSheet && exportToCSV(balanceSheet, assets, liabilities, `balance-sheet-${new Date().toISOString().split('T')[0]}`)}
              className="p-2 bg-[#1A1A1A] border border-[#333333] rounded-lg hover:border-[#FF8C42] transition-colors"
              title="Export to CSV"
            >
              <Download className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => balanceSheet && exportToPDF(balanceSheet, assets, liabilities)}
              className="p-2 bg-[#1A1A1A] border border-[#333333] rounded-lg hover:border-[#FF8C42] transition-colors"
              title="Export to PDF"
            >
              <FileText className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Accounting Equation */}
      <div className="bg-gradient-to-r from-[#1E1E1E] to-[#2A2A2A] rounded-xl border border-[#333333] p-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">Accounting Equation</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-lg sm:text-xl font-bold">
            <span className="text-blue-400">{formatCurrency(balanceSheet?.total_assets || 0)}</span>
            <span className="text-gray-500">=</span>
            <span className="text-red-400">{formatCurrency(balanceSheet?.total_liabilities || 0)}</span>
            <span className="text-gray-500">+</span>
            <span className="text-purple-400">{formatCurrency(balanceSheet?.total_equity || 0)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-gray-500 mt-2">
            <span>Assets</span>
            <span>=</span>
            <span>Liabilities</span>
            <span>+</span>
            <span>Equity</span>
          </div>
          {!balanceSheet?.is_balanced && (
            <p className="text-amber-400 text-xs mt-2">
              ⚠️ Balance sheet is not balanced. Please review entries.
            </p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Assets"
          value={balanceSheet?.total_assets || 0}
          subtitle={`${assets.length} items + receivables`}
          icon={Landmark}
          color="blue"
        />
        <SummaryCard
          title="Total Liabilities"
          value={balanceSheet?.total_liabilities || 0}
          subtitle={`${liabilities.length} items`}
          icon={CreditCard}
          color="red"
        />
        <SummaryCard
          title="Total Equity"
          value={balanceSheet?.total_equity || 0}
          subtitle="Net Worth"
          icon={PiggyBank}
          color="purple"
        />
      </div>

      {/* Financial Ratios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RatioCard
          title="Current Ratio"
          value={balanceSheet?.ratios?.current_ratio}
          description="Current Assets / Current Liabilities (>2 is strong)"
        />
        <RatioCard
          title="Debt-to-Equity"
          value={balanceSheet?.ratios?.debt_to_equity}
          description="Total Liabilities / Equity (<1 is conservative)"
        />
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Working Capital</span>
            <DollarSign size={16} className="text-gray-500" />
          </div>
          <div className={`text-xl font-bold ${(balanceSheet?.ratios?.working_capital || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(balanceSheet?.ratios?.working_capital || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-2">Current Assets - Current Liabilities</div>
        </div>
      </div>

      {/* Automated Sales Cash - From Paid Royalties, Product Orders & Manual Revenue */}
      {(balanceSheet?.assets?.total_sales_cash > 0 || balanceSheet?.assets?.net_sales_cash !== undefined) && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">Automated Sales Cash (Assets)</p>
              <p className="text-gray-400 text-sm mb-3">
                Cash received from paid royalties, product orders, and manual revenue entries received to sales cash.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-green-400 font-bold">{formatCurrency(balanceSheet.assets.royalty_cash_received)}</p>
                    <p className="text-gray-500 text-xs">{balanceSheet.paid_royalty_count} paid royalties</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-green-400 font-bold">{formatCurrency(balanceSheet.assets.product_order_cash_received)}</p>
                    <p className="text-gray-500 text-xs">{balanceSheet.paid_order_count} paid orders</p>
                  </div>
                </div>
                {balanceSheet.assets.manual_revenue_to_sales_cash > 0 && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-green-400 font-bold">{formatCurrency(balanceSheet.assets.manual_revenue_to_sales_cash)}</p>
                      <p className="text-gray-500 text-xs">Manual revenue</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-green-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Royalty Cash</span>
                  <span className="text-green-400 font-medium">{formatCurrency(balanceSheet.assets.royalty_cash_received)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Product Order Cash</span>
                  <span className="text-green-400 font-medium">{formatCurrency(balanceSheet.assets.product_order_cash_received)}</span>
                </div>
                {balanceSheet.assets.manual_revenue_to_sales_cash > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">(+) Manual Revenue</span>
                    <span className="text-green-400 font-medium">{formatCurrency(balanceSheet.assets.manual_revenue_to_sales_cash)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
                  <span className="text-gray-400 text-sm">Gross Sales Cash</span>
                  <span className="text-green-400 font-medium">{formatCurrency(balanceSheet.assets.total_sales_cash)}</span>
                </div>
                {balanceSheet.assets.expenses_from_sales_cash > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 text-sm">(-) Expenses Paid</span>
                    <span className="text-red-400 font-medium">-{formatCurrency(balanceSheet.assets.expenses_from_sales_cash)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
                  <span className="text-white text-sm font-medium">Net Sales Cash</span>
                  <span className="text-green-400 font-bold">{formatCurrency(balanceSheet.assets.net_sales_cash ?? balanceSheet.assets.total_sales_cash)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automated Receivables - Unpaid Royalties & Product Orders */}
      {(balanceSheet?.assets?.royalty_receivables > 0 || balanceSheet?.assets?.order_receivables > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <RefreshCw className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">Automated Receivables (Assets)</p>
              <p className="text-gray-400 text-sm mb-3">
                Amounts still owed from unpaid royalties and pending product orders.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-amber-400 font-bold">{formatCurrency(balanceSheet.assets.royalty_receivables)}</p>
                    <p className="text-gray-500 text-xs">{balanceSheet.pending_royalty_count} unpaid royalties</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-amber-400 font-bold">{formatCurrency(balanceSheet.assets.order_receivables)}</p>
                    <p className="text-gray-500 text-xs">{balanceSheet.pending_order_count} pending orders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-[#333333] overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Scale },
          { id: "assets", label: "Assets", icon: Landmark, count: assets.length },
          { id: "liabilities", label: "Liabilities", icon: CreditCard, count: liabilities.length },
          { id: "equity", label: "Equity", icon: PiggyBank, count: equityEntries.length },
          { id: "periods", label: "Periods", icon: Calendar, count: accountingPeriods.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[#FF8C42] text-[#FF8C42]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-2 py-0.5 bg-[#333333] rounded-full text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Summary */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white flex items-center gap-2">
                <Landmark size={18} className="text-blue-400" />
                Assets Overview
              </h3>
              <span className="text-blue-400 font-bold">{formatCurrency(balanceSheet?.total_assets)}</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Assets</span>
                <span className="text-white">{formatCurrency(balanceSheet?.assets?.current)}</span>
              </div>
              {/* Automated Cash Breakdown */}
              {balanceSheet?.assets?.total_sales_cash > 0 && (
                <>
                  <div className="flex justify-between text-sm pl-3 border-l-2 border-green-500/30">
                    <span className="text-green-400">↳ Royalty Cash</span>
                    <span className="text-green-400">{formatCurrency(balanceSheet?.assets?.royalty_cash_received)}</span>
                  </div>
                  <div className="flex justify-between text-sm pl-3 border-l-2 border-green-500/30">
                    <span className="text-green-400">↳ Product Order Cash</span>
                    <span className="text-green-400">{formatCurrency(balanceSheet?.assets?.product_order_cash_received)}</span>
                  </div>
                  {balanceSheet?.assets?.manual_revenue_to_sales_cash > 0 && (
                    <div className="flex justify-between text-sm pl-3 border-l-2 border-green-500/30">
                      <span className="text-green-400">↳ Manual Revenue</span>
                      <span className="text-green-400">{formatCurrency(balanceSheet?.assets?.manual_revenue_to_sales_cash)}</span>
                    </div>
                  )}
                  {balanceSheet?.assets?.expenses_from_sales_cash > 0 && (
                    <div className="flex justify-between text-sm pl-3 border-l-2 border-red-500/30">
                      <span className="text-red-400">↳ (-) Expenses Paid</span>
                      <span className="text-red-400">-{formatCurrency(balanceSheet?.assets?.expenses_from_sales_cash)}</span>
                    </div>
                  )}
                </>
              )}
              {/* Automated Receivables Breakdown */}
              {(balanceSheet?.assets?.royalty_receivables > 0 || balanceSheet?.assets?.order_receivables > 0) && (
                <>
                  <div className="flex justify-between text-sm pl-3 border-l-2 border-amber-500/30">
                    <span className="text-amber-400">↳ Royalty Receivables</span>
                    <span className="text-amber-400">{formatCurrency(balanceSheet?.assets?.royalty_receivables)}</span>
                  </div>
                  <div className="flex justify-between text-sm pl-3 border-l-2 border-amber-500/30">
                    <span className="text-amber-400">↳ Order Receivables</span>
                    <span className="text-amber-400">{formatCurrency(balanceSheet?.assets?.order_receivables)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fixed Assets</span>
                <span className="text-white">{formatCurrency(balanceSheet?.assets?.fixed)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Intangible Assets</span>
                <span className="text-white">{formatCurrency(balanceSheet?.assets?.intangible)}</span>
              </div>
            </div>
          </div>

          {/* Liability Summary */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white flex items-center gap-2">
                <CreditCard size={18} className="text-red-400" />
                Liabilities Overview
              </h3>
              <span className="text-red-400 font-bold">{formatCurrency(balanceSheet?.total_liabilities)}</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Liabilities</span>
                <span className="text-white">{formatCurrency(balanceSheet?.liabilities?.current)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Long-term Liabilities</span>
                <span className="text-white">{formatCurrency(balanceSheet?.liabilities?.long_term)}</span>
              </div>
            </div>
          </div>

          {/* Equity Summary */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white flex items-center gap-2">
                <PiggyBank size={18} className="text-purple-400" />
                Equity Overview
              </h3>
              <span className="text-purple-400 font-bold">{formatCurrency(balanceSheet?.total_equity)}</span>
            </div>
            <div className="space-y-3">
              {Object.entries(balanceSheet?.equity?.by_type || {}).map(([type, amount]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-gray-400">{EQUITY_TYPES[type]?.label || type}</span>
                  <span className={amount < 0 ? "text-red-400" : "text-white"}>{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "assets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Assets ({assets.length})</h3>
            <button
              onClick={() => setAssetModal({ open: true, asset: null })}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={18} />
              Add Asset
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assets.map((asset) => (
              <AssetCard
                key={asset._id}
                asset={asset}
                onEdit={(a) => setAssetModal({ open: true, asset: a })}
                onDelete={handleDeleteAsset}
              />
            ))}
            {assets.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <Landmark size={48} className="mx-auto mb-4 opacity-50" />
                <p>No assets recorded yet</p>
                <button
                  onClick={() => setAssetModal({ open: true, asset: null })}
                  className="mt-4 text-[#FF8C42] hover:underline"
                >
                  Add your first asset
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "liabilities" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Liabilities ({liabilities.length})</h3>
            <button
              onClick={() => setLiabilityModal({ open: true, liability: null })}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus size={18} />
              Add Liability
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liabilities.map((liability) => (
              <LiabilityCard
                key={liability._id}
                liability={liability}
                onEdit={(l) => setLiabilityModal({ open: true, liability: l })}
                onDelete={handleDeleteLiability}
              />
            ))}
            {liabilities.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                <p>No liabilities recorded yet</p>
                <button
                  onClick={() => setLiabilityModal({ open: true, liability: null })}
                  className="mt-4 text-[#FF8C42] hover:underline"
                >
                  Add your first liability
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "equity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Equity ({equityEntries.length + 1})</h3>
            <button
              onClick={() => setEquityModal({ open: true, entry: null })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus size={18} />
              Add Equity Entry
            </button>
          </div>
          <div className="space-y-3">
            {/* Retained Earnings (automated) */}
            {balanceSheet?.equity?.retained_earnings !== 0 && (
              <EquityCard
                entry={{
                  equity_type: "retained_earnings",
                  description: "Retained Earnings (All-time P&L)",
                  amount: balanceSheet.equity.retained_earnings,
                }}
                isAutomated={true}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            )}
            {/* Manual equity entries */}
            {equityEntries.map((entry) => (
              <EquityCard
                key={entry._id}
                entry={entry}
                isAutomated={false}
                onEdit={(e) => setEquityModal({ open: true, entry: e })}
                onDelete={handleDeleteEquity}
              />
            ))}
            {equityEntries.length === 0 && !balanceSheet?.equity?.retained_earnings && (
              <div className="text-center py-12 text-gray-400">
                <PiggyBank size={48} className="mx-auto mb-4 opacity-50" />
                <p>No equity entries recorded yet</p>
                <button
                  onClick={() => setEquityModal({ open: true, entry: null })}
                  className="mt-4 text-[#FF8C42] hover:underline"
                >
                  Add your first equity entry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "periods" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Accounting Periods ({accountingPeriods.length})</h3>
              <p className="text-gray-400 text-sm">Lock financial periods to prevent changes to historical data</p>
            </div>
            <button
              onClick={() => setPeriodModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A32] transition-colors"
            >
              <Plus size={18} />
              New Period
            </button>
          </div>

          {/* Current Open Period Status */}
          {currentOpenPeriod && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Unlock className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Current Open Period: {currentOpenPeriod.period_name}</p>
                  <p className="text-gray-400 text-sm">
                    {formatDate(currentOpenPeriod.start_date)} - {formatDate(currentOpenPeriod.end_date)}
                  </p>
                  <p className="text-blue-400 text-xs mt-1">
                    You can still make changes to transactions within this period.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Period List */}
          <div className="space-y-3">
            {accountingPeriods.map((period) => {
              const isExpanded = expandedPeriod === period._id;
              return (
                <div
                  key={period._id}
                  className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-all"
                >
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
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        period.status === "open"
                          ? "bg-green-500/20 text-green-400"
                          : period.status === "closing"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {period.status === "open" && <Unlock size={12} />}
                        {period.status === "closing" && <Clock size={12} />}
                        {period.status === "closed" && <Lock size={12} />}
                        {period.status === "open" ? "Open" : period.status === "closing" ? "Closing" : "Closed"}
                      </span>
                      <button
                        onClick={() => setExpandedPeriod(isExpanded ? null : period._id)}
                        className="p-1 hover:bg-[#333333] rounded text-gray-400"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
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
                                <span className="ml-2 font-medium text-green-400">{formatCurrency(period.snapshot.total_revenue || 0)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Expenses:</span>
                                <span className="ml-2 font-medium text-red-400">{formatCurrency(period.snapshot.total_expenses || 0)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Net Income:</span>
                                <span className={`ml-2 font-bold ${(period.snapshot.net_income || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {formatCurrency(period.snapshot.net_income || 0)}
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
                            onClick={() => setClosePeriodModal({ open: true, period })}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/80 transition-colors"
                          >
                            <Lock size={14} />
                            Close Period
                          </button>
                        )}
                        {period.status === "closed" && (
                          <>
                            <button
                              onClick={() => setReopenPeriodModal({ open: true, period })}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                            >
                              <Unlock size={14} />
                              Reopen
                            </button>
                            <button
                              onClick={() => setComparisonModal({ open: true, period })}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                            >
                              <TrendingUp size={14} />
                              Compare
                            </button>
                          </>
                        )}
                        {period.status !== "closed" && (
                          <button
                            onClick={async () => {
                              if (!confirm("Are you sure you want to delete this period?")) return;
                              try {
                                await deletePeriod({ period_id: period._id });
                              } catch (error) {
                                console.error("Error deleting period:", error);
                                alert("Error: " + error.message);
                              }
                            }}
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
            })}
            {accountingPeriods.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>No accounting periods defined yet</p>
                <p className="text-sm mt-2">Create periods to lock historical financial data</p>
                <button
                  onClick={() => setPeriodModal({ open: true })}
                  className="mt-4 text-[#FF8C42] hover:underline"
                >
                  Create your first period
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="text-gray-400">
            <span className="font-medium text-white">{assets.length}</span> assets •{" "}
            <span className="font-medium text-white">{liabilities.length}</span> liabilities •{" "}
            <span className="font-medium text-white">{equityEntries.length}</span> equity entries
          </div>
          <div className="text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AssetModal
        isOpen={assetModal.open}
        onClose={() => setAssetModal({ open: false, asset: null })}
        asset={assetModal.asset}
        userId={user?._id}
      />
      <LiabilityModal
        isOpen={liabilityModal.open}
        onClose={() => setLiabilityModal({ open: false, liability: null })}
        liability={liabilityModal.liability}
        userId={user?._id}
      />
      <EquityModal
        isOpen={equityModal.open}
        onClose={() => setEquityModal({ open: false, entry: null })}
        entry={equityModal.entry}
        userId={user?._id}
      />
      <PeriodModal
        isOpen={periodModal.open}
        onClose={() => setPeriodModal({ open: false })}
        userId={user?._id}
      />
      <ClosePeriodModal
        isOpen={closePeriodModal.open}
        onClose={() => setClosePeriodModal({ open: false, period: null })}
        period={closePeriodModal.period}
        userId={user?._id}
        closePeriodMutation={closePeriod}
      />
      <ReopenPeriodModal
        isOpen={reopenPeriodModal.open}
        onClose={() => setReopenPeriodModal({ open: false, period: null })}
        period={reopenPeriodModal.period}
        userId={user?._id}
        reopenPeriodMutation={reopenPeriod}
      />
      <PeriodComparisonModal
        isOpen={comparisonModal.open}
        onClose={() => setComparisonModal({ open: false, period: null })}
        period={comparisonModal.period}
      />
    </div>
  );
};

export default SuperAdminBalanceSheet;
