/**
 * Permission Configuration Modal
 * Story 12-3: Branch Admin User Management
 *
 * Allows admins to configure page_access_v2 permissions for staff users.
 * Displays a matrix of pages x actions (view, create, edit, delete, approve).
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  X,
  Shield,
  Save,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/**
 * Page categories for grouping
 */
const PAGE_CATEGORIES = {
  operations: {
    label: "Operations",
    pages: ["overview", "reports", "bookings", "custom_bookings", "calendar", "walkins", "queue", "pos"],
  },
  staff: {
    label: "Staff & Services",
    pages: ["team", "barbers", "users", "services", "customers", "customer_analytics"],
  },
  products: {
    label: "Products & Inventory",
    pages: ["products", "order_products", "vouchers"],
  },
  finance: {
    label: "Finance & Accounting",
    pages: ["finance", "payroll", "cash_advances", "royalty", "accounting", "balance_sheet", "payments", "payment_history", "branch_wallet", "wallet_earnings"],
  },
  hr: {
    label: "HR & Events",
    pages: ["attendance", "events"],
  },
  communications: {
    label: "Communications & Marketing",
    pages: ["marketing", "notifications", "email_marketing", "post_moderation"],
  },
  admin: {
    label: "Admin Settings",
    pages: ["branches", "catalog", "branding", "emails", "settings"],
  },
};

/**
 * Human-readable page names
 */
const PAGE_LABELS = {
  overview: "Overview",
  reports: "Reports",
  bookings: "Bookings",
  custom_bookings: "Custom Bookings",
  calendar: "Calendar",
  walkins: "Walk-ins",
  queue: "Queue",
  pos: "POS",
  barbers: "Barbers",
  users: "Users",
  services: "Services",
  customers: "Customers",
  products: "Products",
  order_products: "Order Products",
  vouchers: "Vouchers",
  payroll: "Payroll",
  cash_advances: "Cash Advances",
  royalty: "Royalty",
  accounting: "P&L",
  balance_sheet: "Balance Sheet",
  payments: "Payments",
  payment_history: "Payment History",
  attendance: "Attendance",
  events: "Events",
  notifications: "Notifications",
  email_marketing: "Email Marketing",
  team: "Team",
  finance: "Finance",
  marketing: "Marketing",
  branch_wallet: "Branch Wallet",
  wallet_earnings: "Wallet Earnings",
  customer_analytics: "Customer Analytics",
  post_moderation: "Post Moderation",
  branches: "Branches",
  catalog: "Product Catalog",
  branding: "Branding",
  emails: "Email Templates",
  settings: "Settings",
};

const ACTIONS = ["view", "create", "edit", "delete", "approve"];
const ACTION_LABELS = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
};

/**
 * Default empty permission object
 */
const getEmptyPermission = () => ({
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false,
});

/**
 * Initialize permissions from existing page_access_v2 or page_access
 */
function initializePermissions(user) {
  const permissions = {};

  // Get all pages from categories
  Object.values(PAGE_CATEGORIES).forEach((category) => {
    category.pages.forEach((pageId) => {
      // Check page_access_v2 first
      if (user?.page_access_v2?.[pageId]) {
        permissions[pageId] = { ...user.page_access_v2[pageId] };
      }
      // Fallback to legacy page_access (convert to view-only)
      else if (user?.page_access?.includes(pageId)) {
        permissions[pageId] = {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
        };
      } else {
        permissions[pageId] = getEmptyPermission();
      }
    });
  });

  return permissions;
}

export default function PermissionConfigModal({ isOpen, onClose, user, onSuccess }) {
  const [permissions, setPermissions] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updatePermissions = useMutation(api.services.rbac.updateUserPermissions);

  // Initialize permissions when user changes
  useEffect(() => {
    if (user) {
      setPermissions(initializePermissions(user));
      // Expand all categories by default
      const expanded = {};
      Object.keys(PAGE_CATEGORIES).forEach((key) => {
        expanded[key] = true;
      });
      setExpandedCategories(expanded);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const toggleCategory = (categoryKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const togglePermission = (pageId, action) => {
    setPermissions((prev) => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [action]: !prev[pageId]?.[action],
      },
    }));
  };

  const toggleAllInCategory = (categoryKey, action, value) => {
    const category = PAGE_CATEGORIES[categoryKey];
    setPermissions((prev) => {
      const updated = { ...prev };
      category.pages.forEach((pageId) => {
        updated[pageId] = {
          ...updated[pageId],
          [action]: value,
        };
      });
      return updated;
    });
  };

  const toggleAllForPage = (pageId, value) => {
    setPermissions((prev) => ({
      ...prev,
      [pageId]: {
        view: value,
        create: value,
        edit: value,
        delete: value,
        approve: value,
      },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      await updatePermissions({
        userId: user._id,
        page_access_v2: permissions,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error updating permissions:", err);
      setError(err.message || "Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryStats = (categoryKey) => {
    const category = PAGE_CATEGORIES[categoryKey];
    let enabled = 0;
    let total = category.pages.length * ACTIONS.length;

    category.pages.forEach((pageId) => {
      ACTIONS.forEach((action) => {
        if (permissions[pageId]?.[action]) enabled++;
      });
    });

    return { enabled, total };
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden transform rounded-2xl bg-[#1A1A1A] shadow-2xl border border-[#2A2A2A]/50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#FF8C42]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Configure Permissions
                </h3>
                <p className="text-sm text-gray-400">
                  {user.username} ({user.email})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Action Headers */}
            <div className="sticky top-0 bg-[#1A1A1A] z-10 pb-2 mb-4">
              <div className="flex items-center gap-2 pl-8">
                <div className="w-40 flex-shrink-0"></div>
                {ACTIONS.map((action) => (
                  <div
                    key={action}
                    className="w-16 text-center text-xs font-medium text-gray-400 uppercase"
                  >
                    {ACTION_LABELS[action]}
                  </div>
                ))}
                <div className="w-16 text-center text-xs font-medium text-gray-400 uppercase">
                  All
                </div>
              </div>
            </div>

            {/* Categories */}
            {Object.entries(PAGE_CATEGORIES).map(([categoryKey, category]) => {
              const stats = getCategoryStats(categoryKey);
              const isExpanded = expandedCategories[categoryKey];

              return (
                <div
                  key={categoryKey}
                  className="mb-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]/50 overflow-hidden"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(categoryKey)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#1A1A1A] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium text-white">
                        {category.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({stats.enabled}/{stats.total} enabled)
                      </span>
                    </div>
                  </button>

                  {/* Pages */}
                  {isExpanded && (
                    <div className="border-t border-[#2A2A2A]/50">
                      {category.pages.map((pageId) => (
                        <div
                          key={pageId}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-[#1A1A1A]/50 border-b border-[#2A2A2A]/30 last:border-b-0"
                        >
                          <div className="w-8"></div>
                          <div className="w-40 flex-shrink-0 text-sm text-gray-300">
                            {PAGE_LABELS[pageId] || pageId}
                          </div>

                          {ACTIONS.map((action) => (
                            <div key={action} className="w-16 flex justify-center">
                              <button
                                onClick={() => togglePermission(pageId, action)}
                                className={`w-6 h-6 rounded-md border transition-colors ${
                                  permissions[pageId]?.[action]
                                    ? "bg-[#FF8C42] border-[#FF8C42] text-white"
                                    : "bg-[#2A2A2A] border-[#3A3A3A] text-gray-500 hover:border-gray-400"
                                }`}
                              >
                                {permissions[pageId]?.[action] && (
                                  <Check className="w-4 h-4 mx-auto" />
                                )}
                              </button>
                            </div>
                          ))}

                          {/* Toggle All for Page */}
                          <div className="w-16 flex justify-center">
                            <button
                              onClick={() => {
                                const allEnabled = ACTIONS.every(
                                  (a) => permissions[pageId]?.[a]
                                );
                                toggleAllForPage(pageId, !allEnabled);
                              }}
                              className="text-xs text-[#FF8C42] hover:text-[#E67E3C] font-medium"
                            >
                              {ACTIONS.every((a) => permissions[pageId]?.[a])
                                ? "None"
                                : "All"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A]/50 bg-[#0A0A0A] flex-shrink-0">
            <p className="text-xs text-gray-500">
              Changes will take effect immediately (no re-login required)
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#FF8C42] to-[#E67E3C] text-white font-semibold rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Permissions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
