import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  DollarSign,
  Calendar,
  Receipt,
  RefreshCw,
  Building2,
  Zap,
  Wrench,
  Megaphone,
  Truck,
  Package,
  Shield,
  CreditCard,
  Users,
  HelpCircle,
  Briefcase,
  Plane,
  Scale,
  GraduationCap,
  Warehouse,
  Download,
  FileText,
} from "lucide-react";
import { useAppModal } from "../../context/AppModalContext";

// Category configuration with icons and labels for Super Admin
const EXPENSE_CATEGORIES = {
  // Fixed expenses
  office_rent: { label: "Office Rent", icon: Building2, type: "fixed" },
  utilities: { label: "Utilities", icon: Zap, type: "fixed" },
  insurance: { label: "Insurance", icon: Shield, type: "fixed" },
  salaries: { label: "HQ Salaries", icon: Users, type: "fixed" },
  subscriptions: { label: "Subscriptions", icon: CreditCard, type: "fixed" },
  // Operating expenses
  supplies: { label: "Supplies", icon: Package, type: "operating" },
  travel: { label: "Travel", icon: Plane, type: "operating" },
  marketing: { label: "Marketing", icon: Megaphone, type: "operating" },
  legal_accounting: { label: "Legal & Accounting", icon: Scale, type: "operating" },
  training_costs: { label: "Training Costs", icon: GraduationCap, type: "operating" },
  warehouse_costs: { label: "Warehouse Costs", icon: Warehouse, type: "operating" },
  miscellaneous: { label: "Miscellaneous", icon: HelpCircle, type: "operating" },
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

// ============================================================================
// AddExpenseModal Component
// ============================================================================
const AddExpenseModal = ({ isOpen, onClose, user, editingExpense = null }) => {
  const getInitialFormData = () => ({
    expense_type: "operating",
    category: "supplies",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
    is_recurring: false,
    recurring_day: 1,
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form data when editingExpense changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setFormData({
          expense_type: editingExpense.expense_type,
          category: editingExpense.category,
          description: editingExpense.description,
          amount: editingExpense.amount,
          expense_date: new Date(editingExpense.expense_date).toISOString().split("T")[0],
          notes: editingExpense.notes || "",
          is_recurring: editingExpense.is_recurring || false,
          recurring_day: editingExpense.recurring_day || 1,
        });
      } else {
        setFormData(getInitialFormData());
      }
    }
  }, [editingExpense, isOpen]);

  const addExpense = useMutation(api.services.accounting.addSuperAdminExpense);
  const updateExpense = useMutation(api.services.accounting.updateSuperAdminExpense);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-set expense_type based on category
    if (field === "category" && EXPENSE_CATEGORIES[value]) {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        expense_type: EXPENSE_CATEGORIES[value].type,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    setIsSubmitting(true);
    try {
      const expenseDate = new Date(formData.expense_date).getTime();

      if (editingExpense) {
        await updateExpense({
          id: editingExpense._id,
          expense_type: formData.expense_type,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expense_date: expenseDate,
          notes: formData.notes || undefined,
          is_recurring: formData.is_recurring,
          recurring_day: formData.is_recurring ? formData.recurring_day : undefined,
        });
      } else {
        await addExpense({
          expense_type: formData.expense_type,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expense_date: expenseDate,
          notes: formData.notes || undefined,
          is_recurring: formData.is_recurring,
          recurring_day: formData.is_recurring ? formData.recurring_day : undefined,
          created_by: user._id,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Use portal to render modal at document body level for proper z-index
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-[#1A1A1A] rounded-xl w-full max-w-md border border-[#333333] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#333333]">
          <h2 className="text-lg font-bold text-white">
            {editingExpense ? "Edit Expense" : "Add Expense"}
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
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
            >
              <optgroup label="Fixed Expenses">
                <option value="office_rent">Office Rent</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="salaries">HQ Salaries</option>
                <option value="subscriptions">Subscriptions</option>
              </optgroup>
              <optgroup label="Operating Expenses">
                <option value="supplies">Supplies</option>
                <option value="travel">Travel</option>
                <option value="marketing">Marketing</option>
                <option value="legal_accounting">Legal & Accounting</option>
                <option value="training_costs">Training Costs</option>
                <option value="warehouse_costs">Warehouse Costs</option>
                <option value="miscellaneous">Miscellaneous</option>
              </optgroup>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="e.g., Monthly office rent"
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Amount (PHP)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={formData.expense_date}
              onChange={(e) => handleChange("expense_date", e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none resize-none"
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#333333]">
            <div>
              <label className="text-sm font-medium text-white">Recurring Expense</label>
              <p className="text-xs text-gray-500">This expense repeats monthly</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("is_recurring", !formData.is_recurring)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.is_recurring ? "bg-[#FF8C42]" : "bg-[#333333]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  formData.is_recurring ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {formData.is_recurring && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Day of Month</label>
              <input
                type="number"
                value={formData.recurring_day}
                onChange={(e) => handleChange("recurring_day", parseInt(e.target.value))}
                min="1"
                max="31"
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[#FF8C42] focus:outline-none"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#FF8C42] text-white font-medium rounded-lg hover:bg-[#FF8C42]/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : editingExpense ? "Update Expense" : "Add Expense"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// ExpenseCard Component
// ============================================================================
const ExpenseCard = ({ expense, onEdit, onDelete }) => {
  const category = EXPENSE_CATEGORIES[expense.category] || { label: expense.category, icon: HelpCircle };
  const Icon = category.icon;

  return (
    <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-4 hover:border-[#FF8C42]/30 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${
              expense.expense_type === "fixed" ? "bg-blue-500/10" : "bg-purple-500/10"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${
                expense.expense_type === "fixed" ? "text-blue-400" : "text-purple-400"
              }`}
            />
          </div>
          <div>
            <h3 className="font-medium text-white">{expense.description}</h3>
            <p className="text-sm text-gray-500">{category.label}</p>
            <p className="text-xs text-gray-600 mt-1">
              {new Date(expense.expense_date).toLocaleDateString()}
              {expense.is_recurring && (
                <span className="ml-2 text-[#FF8C42]">
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Recurring
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{formatCurrency(expense.amount)}</p>
          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(expense)}
              className="p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(expense)}
              className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {expense.notes && (
        <p className="text-sm text-gray-500 mt-2 pl-12">{expense.notes}</p>
      )}
    </div>
  );
};

// ============================================================================
// Category Breakdown Card
// ============================================================================
const CategoryBreakdownCard = ({ expenses }) => {
  const breakdown = useMemo(() => {
    const byCategory = {};
    for (const expense of expenses) {
      const cat = expense.category;
      byCategory[cat] = (byCategory[cat] || 0) + expense.amount;
    }
    return Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        label: EXPENSE_CATEGORIES[category]?.label || category,
        amount,
        type: EXPENSE_CATEGORIES[category]?.type || "operating",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const total = breakdown.reduce((sum, b) => sum + b.amount, 0);

  if (breakdown.length === 0) return null;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
      <h3 className="font-medium text-white mb-4">Expense by Category</h3>
      <div className="space-y-3">
        {breakdown.map((item) => {
          const percentage = total > 0 ? (item.amount / total) * 100 : 0;
          return (
            <div key={item.category}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">{item.label}</span>
                <span className="text-white font-medium">{formatCurrency(item.amount)}</span>
              </div>
              <div className="w-full bg-[#333333] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    item.type === "fixed"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                      : "bg-gradient-to-r from-purple-500 to-purple-600"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// Export Functions
// ============================================================================
const exportToCSV = (expenses, summary, period) => {
  const rows = [
    ["SUPER ADMIN EXPENSE REPORT", ""],
    ["Period:", period],
    ["", ""],
    ["SUMMARY", ""],
    ["Fixed Expenses", summary.fixed],
    ["Operating Expenses", summary.operating],
    ["Total Expenses", summary.total],
    ["", ""],
    ["EXPENSE DETAILS", ""],
    ["Date", "Category", "Description", "Type", "Amount"],
    ...expenses.map((e) => [
      new Date(e.expense_date).toLocaleDateString(),
      EXPENSE_CATEGORIES[e.category]?.label || e.category,
      e.description,
      e.expense_type,
      e.amount,
    ]),
  ];

  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `super-admin-expenses-${period}.csv`;
  link.click();
};

// ============================================================================
// Main SuperAdminExpenseManagement Component
// ============================================================================
const SuperAdminExpenseManagement = () => {
  const { user } = useCurrentUser();
  const { showConfirm } = useAppModal();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filter, setFilter] = useState("all"); // all, fixed, operating
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Calculate date range from selected month
  const dateRange = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    return { start, end };
  }, [selectedMonth]);

  const expenses = useQuery(
    api.services.accounting.getSuperAdminExpenseEntries,
    {
      start_date: dateRange.start,
      end_date: dateRange.end,
    }
  );

  const deleteExpense = useMutation(api.services.accounting.deleteSuperAdminExpense);

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  };

  const handleDelete = async (expense) => {
    const confirmed = await showConfirm({ title: 'Delete Expense', message: `Delete "${expense.description}"?`, type: 'warning' });
    if (confirmed) {
      await deleteExpense({ id: expense._id });
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingExpense(null);
  };

  // Filter expenses
  const filteredExpenses = (expenses || []).filter((e) => {
    if (filter === "all") return true;
    return e.expense_type === filter;
  });

  // Calculate summary
  const summary = useMemo(() => {
    const fixed = (expenses || [])
      .filter((e) => e.expense_type === "fixed")
      .reduce((sum, e) => sum + e.amount, 0);
    const operating = (expenses || [])
      .filter((e) => e.expense_type === "operating")
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      fixed,
      operating,
      total: fixed + operating,
    };
  }, [expenses]);

  const isLoading = expenses === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[var(--color-primary)]" />
            Expense Management
          </h2>
          <p className="text-gray-400 text-sm">Track and manage headquarters expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => expenses && exportToCSV(expenses, summary, selectedMonth)}
            disabled={isLoading || !expenses?.length}
            className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-lg text-gray-400 hover:text-white hover:border-[#FF8C42] transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm">Fixed Expenses</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? "..." : formatCurrency(summary.fixed)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Rent, salaries, insurance, etc.</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-gray-400 text-sm">Operating Expenses</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? "..." : formatCurrency(summary.operating)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Travel, marketing, supplies, etc.</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-[#FF8C42]/10">
              <DollarSign className="w-5 h-5 text-[#FF8C42]" />
            </div>
            <span className="text-gray-400 text-sm">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? "..." : formatCurrency(summary.total)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {(expenses || []).length} expense entries
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {[
            { id: "all", label: "All" },
            { id: "fixed", label: "Fixed" },
            { id: "operating", label: "Operating" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.id
                  ? "bg-[#FF8C42] text-white"
                  : "bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#333333]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded-lg text-white text-sm focus:border-[#FF8C42] focus:outline-none"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#333333]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8C42] mx-auto mb-3" />
              <p className="text-gray-400">Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#333333]">
              <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No expenses found for this period</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-[#FF8C42] hover:underline"
              >
                Add your first expense
              </button>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-1">
          <CategoryBreakdownCard expenses={expenses || []} />
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AddExpenseModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        user={user}
        editingExpense={editingExpense}
      />
    </div>
  );
};

export default SuperAdminExpenseManagement;
