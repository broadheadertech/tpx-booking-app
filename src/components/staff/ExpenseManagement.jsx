import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppModal } from '../../context/AppModalContext';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  DollarSign,
  Calendar,
  FileText,
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
  Wallet,
  Banknote,
} from "lucide-react";

// Category configuration with icons and labels
const EXPENSE_CATEGORIES = {
  // Fixed expenses
  rent: { label: "Rent", icon: Building2, type: "fixed" },
  utilities: { label: "Utilities", icon: Zap, type: "fixed" },
  insurance: { label: "Insurance", icon: Shield, type: "fixed" },
  salaries: { label: "Fixed Salaries", icon: Users, type: "fixed" },
  subscriptions: { label: "Subscriptions", icon: CreditCard, type: "fixed" },
  // Operating expenses
  supplies: { label: "Supplies", icon: Package, type: "operating" },
  maintenance: { label: "Maintenance", icon: Wrench, type: "operating" },
  marketing: { label: "Marketing", icon: Megaphone, type: "operating" },
  equipment: { label: "Equipment", icon: Package, type: "operating" },
  transportation: { label: "Transportation", icon: Truck, type: "operating" },
  miscellaneous: { label: "Miscellaneous", icon: HelpCircle, type: "operating" },
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
    paid_from_asset_id: "",
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
          is_recurring: editingExpense.is_recurring,
          recurring_day: editingExpense.recurring_day || 1,
          paid_from_asset_id: editingExpense.paid_from_asset_id || "",
        });
      } else {
        setFormData(getInitialFormData());
      }
    }
  }, [editingExpense, isOpen]);

  const addExpense = useMutation(api.services.expenses.addExpense);
  const updateExpense = useMutation(api.services.expenses.updateExpense);

  // Get payment assets (cash/bank accounts) for the dropdown
  const paymentAssets = useQuery(
    api.services.expenses.getPaymentAssets,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  );

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
          expense_id: editingExpense._id,
          expense_type: formData.expense_type,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expense_date: expenseDate,
          notes: formData.notes || undefined,
          is_recurring: formData.is_recurring,
          recurring_day: formData.is_recurring ? formData.recurring_day : undefined,
          paid_from_asset_id: formData.paid_from_asset_id || undefined,
        });
      } else {
        await addExpense({
          branch_id: user.branch_id,
          expense_type: formData.expense_type,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expense_date: expenseDate,
          notes: formData.notes || undefined,
          is_recurring: formData.is_recurring,
          recurring_day: formData.is_recurring ? formData.recurring_day : undefined,
          paid_from_asset_id: formData.paid_from_asset_id || undefined,
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
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
            >
              <optgroup label="Fixed Expenses">
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="salaries">Fixed Salaries</option>
                <option value="subscriptions">Subscriptions</option>
              </optgroup>
              <optgroup label="Operating Expenses">
                <option value="supplies">Supplies</option>
                <option value="maintenance">Maintenance</option>
                <option value="marketing">Marketing</option>
                <option value="equipment">Equipment</option>
                <option value="transportation">Transportation</option>
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
              placeholder="e.g., Monthly rent payment"
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Amount (₱)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
              required
            />
          </div>

          {/* Pay From Asset (Double-Entry Accounting) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Pay From Account
              </span>
            </label>
            <select
              value={formData.paid_from_asset_id}
              onChange={(e) => handleChange("paid_from_asset_id", e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
            >
              <option value="">-- No asset deduction (manual) --</option>
              {paymentAssets && paymentAssets.length > 0 ? (
                paymentAssets.map((asset) => (
                  <option key={asset._id} value={asset._id}>
                    {asset.name} (₱{asset.current_value.toLocaleString()})
                  </option>
                ))
              ) : (
                <option disabled>No cash/bank accounts found</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select an account to automatically deduct from your balance sheet
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={formData.expense_date}
              onChange={(e) => handleChange("expense_date", e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
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
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none resize-none"
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
                formData.is_recurring ? "bg-[var(--color-primary)]" : "bg-[#333333]"
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
                className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-3 py-2 text-white focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[var(--color-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
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
const ExpenseCard = ({ expense, onEdit, onDelete, paymentAssets }) => {
  const category = EXPENSE_CATEGORIES[expense.category] || { label: expense.category, icon: HelpCircle };
  const Icon = category.icon;

  // Find the asset name if expense has paid_from_asset_id
  const paidFromAsset = expense.paid_from_asset_id && paymentAssets
    ? paymentAssets.find((a) => a._id === expense.paid_from_asset_id)
    : null;

  return (
    <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-4 hover:border-[var(--color-primary)]/30 transition-colors group">
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
                <span className="ml-2 text-[var(--color-primary)]">
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Recurring
                </span>
              )}
            </p>
            {paidFromAsset && (
              <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                <Banknote className="w-3 h-3" />
                Paid from: {paidFromAsset.name}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">₱{expense.amount.toLocaleString()}</p>
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
// Main ExpenseManagement Component
// ============================================================================
const ExpenseManagement = ({ user, onRefresh }) => {
  const { showConfirm } = useAppModal();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filter, setFilter] = useState("all"); // all, fixed, operating
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Calculate date range from selected month
  const dateRange = React.useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    return { start, end };
  }, [selectedMonth]);

  const expenses = useQuery(
    api.services.expenses.getExpensesByBranch,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: dateRange.start,
          end_date: dateRange.end,
        }
      : "skip"
  );

  const expenseSummary = useQuery(
    api.services.expenses.getExpenseSummary,
    user?.branch_id
      ? {
          branch_id: user.branch_id,
          start_date: dateRange.start,
          end_date: dateRange.end,
        }
      : "skip"
  );

  // Get payment assets for display on expense cards
  const paymentAssets = useQuery(
    api.services.expenses.getPaymentAssets,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  );

  const deleteExpense = useMutation(api.services.expenses.deleteExpense);

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  };

  const handleDelete = async (expense) => {
    const confirmed = await showConfirm({ title: 'Delete Expense', message: `Delete "${expense.description}"?`, type: 'warning' });
    if (confirmed) {
      await deleteExpense({ expense_id: expense._id });
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

  if (!user?.branch_id) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Branch Selected</h2>
        <p className="text-gray-400">Please select a branch to manage expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Expense Management</h2>
          <p className="text-gray-400 text-sm">Track and manage branch expenses</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
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
            ₱{(expenseSummary?.fixed_expenses || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-gray-400 text-sm">Operating Expenses</span>
          </div>
          <p className="text-2xl font-bold text-white">
            ₱{(expenseSummary?.operating_expenses || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-[var(--color-primary)]/10">
              <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <span className="text-gray-400 text-sm">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-white">
            ₱{(expenseSummary?.total_expenses || 0).toLocaleString()}
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
                  ? "bg-[var(--color-primary)] text-white"
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
          className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333333] rounded-lg text-white text-sm focus:border-[var(--color-primary)] focus:outline-none"
        />
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#333333]">
            <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No expenses found for this period</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-[var(--color-primary)] hover:underline"
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
              paymentAssets={paymentAssets}
            />
          ))
        )}
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

export default ExpenseManagement;
