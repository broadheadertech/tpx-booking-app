import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  Crown,
  Plus,
  Edit3,
  Archive,
  X,
  Calendar,
  Scissors,
  Package,
  Trash2,
  Users,
  Check,
  AlertTriangle,
  Search,
  CheckCircle2,
  Ban,
  Eye,
} from "lucide-react";

const formatPHP = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const STATUS_COLORS = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  paused: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/40",
  expired: "bg-red-500/15 text-red-300 border-red-500/40",
};

const TierModal = ({ tier, onClose, onSubmit, busy }) => {
  const [name, setName] = useState(tier?.name || "");
  const [slug, setSlug] = useState(tier?.slug || "");
  const [description, setDescription] = useState(tier?.description || "");
  const [serviceAlloc, setServiceAlloc] = useState(tier?.service_allocations ?? 1);
  const [productAlloc, setProductAlloc] = useState(tier?.product_allocations ?? 0);
  const [serviceMaxValue, setServiceMaxValue] = useState(tier?.service_max_value ?? "");
  const [productMaxValue, setProductMaxValue] = useState(tier?.product_max_value ?? "");
  const [periodType, setPeriodType] = useState(tier?.period_type || "monthly");
  const [price, setPrice] = useState(tier?.price ?? 0);
  const [perks, setPerks] = useState((tier?.perks || []).join("\n"));
  const [isActive, setIsActive] = useState(tier?.is_active ?? true);
  const [displayOrder, setDisplayOrder] = useState(tier?.display_order ?? "");
  const isEditing = !!tier;

  React.useEffect(() => {
    if (!isEditing && name) setSlug(slugify(name));
  }, [name, isEditing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      service_allocations: parseInt(serviceAlloc) || 0,
      product_allocations: parseInt(productAlloc) || 0,
      service_max_value: serviceMaxValue === "" ? undefined : parseFloat(serviceMaxValue),
      product_max_value: productMaxValue === "" ? undefined : parseFloat(productMaxValue),
      period_type: periodType,
      price: parseFloat(price) || 0,
      perks: perks.split("\n").map((s) => s.trim()).filter(Boolean),
      is_active: isActive,
      display_order: displayOrder === "" ? undefined : parseInt(displayOrder),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#333] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-[#333] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-[var(--color-primary)]" />
            {isEditing ? "Edit Tier" : "Create Customer Subscription Tier"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tier Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bronze"
                required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                disabled={isEditing}
                required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What customers get with this tier"
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                Free services per period
              </label>
              <input
                type="number"
                min="0"
                value={serviceAlloc}
                onChange={(e) => setServiceAlloc(e.target.value)}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Package className="w-3 h-3" />
                Free products per period
              </label>
              <input
                type="number"
                min="0"
                value={productAlloc}
                onChange={(e) => setProductAlloc(e.target.value)}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Service max value (₱, optional)
              </label>
              <input
                type="number"
                min="0"
                value={serviceMaxValue}
                onChange={(e) => setServiceMaxValue(e.target.value)}
                placeholder="No cap"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Product max value (₱, optional)
              </label>
              <input
                type="number"
                min="0"
                value={productMaxValue}
                onChange={(e) => setProductMaxValue(e.target.value)}
                placeholder="No cap"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Period</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Price (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Display Order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="1"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Perks (one per line, shown to customer)
            </label>
            <textarea
              value={perks}
              onChange={(e) => setPerks(e.target.value)}
              rows={3}
              placeholder={"Priority booking\nFree birthday treat\n10% off products"}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="text-sm text-gray-300">Active (uncheck to archive)</span>
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {busy ? "Saving…" : isEditing ? "Save" : "Create Tier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssignModal = ({ tiers, customers, onClose, onSubmit, busy }) => {
  const [customerId, setCustomerId] = useState("");
  const [tierId, setTierId] = useState("");
  const [autoActivate, setAutoActivate] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (customers || [])
      .filter(
        (c) =>
          c.role === "customer" &&
          (!term ||
            c.name?.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term))
      )
      .slice(0, 50);
  }, [customers, search]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#333] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-[#333] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-primary)]" />
            Assign Subscription
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Customer</label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full bg-[#252525] border border-[#333] rounded-lg pl-8 pr-3 py-2 text-white text-sm"
              />
            </div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              required
              size={6}
            >
              <option value="">— Select customer —</option>
              {filtered.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name || c.email} {c.email && c.name ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Tier</label>
            <select
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              required
            >
              <option value="">— Select tier —</option>
              {(tiers || [])
                .filter((t) => t.is_active)
                .map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} — {formatPHP(t.price)}/{t.period_type.replace("ly", "")}
                  </option>
                ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoActivate}
              onChange={(e) => setAutoActivate(e.target.checked)}
            />
            <span className="text-sm text-gray-300">
              Activate immediately (skip pending)
            </span>
          </label>

          {autoActivate && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Payment received (₱)
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Payment method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">—</option>
                  <option value="cash">Cash</option>
                  <option value="paymongo">PayMongo</option>
                  <option value="wallet">Wallet</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Comped for VIP customer"
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444]"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSubmit({
                  customer_id: customerId,
                  tier_id: tierId,
                  auto_activate: autoActivate,
                  payment_method: paymentMethod || undefined,
                  last_payment_amount:
                    paymentAmount === "" ? undefined : parseFloat(paymentAmount),
                  notes: notes.trim() || undefined,
                })
              }
              disabled={busy || !customerId || !tierId}
              className="flex-1 px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {busy ? "Assigning…" : "Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomerSubscriptionsManager = () => {
  const { user } = useCurrentUser();
  const [view, setView] = useState("subscriptions"); // 'subscriptions' | 'tiers'
  const [editingTier, setEditingTier] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");

  const tiers = useQuery(api.services.customerSubscriptions.listTiers, {
    include_inactive: true,
  });
  const subs = useQuery(
    api.services.customerSubscriptions.getSubscriptionsByStatus,
    statusFilter === "all" ? {} : { status: statusFilter }
  );
  const customers = useQuery(api.services.auth.getAllUsers);

  const createTier = useMutation(api.services.customerSubscriptions.createTier);
  const updateTier = useMutation(api.services.customerSubscriptions.updateTier);
  const archiveTier = useMutation(api.services.customerSubscriptions.archiveTier);
  const applyForSubscription = useMutation(
    api.services.customerSubscriptions.applyForSubscription
  );
  const activate = useMutation(api.services.customerSubscriptions.activateSubscription);
  const cancel = useMutation(api.services.customerSubscriptions.cancelSubscription);

  const filteredSubs = useMemo(() => {
    const term = search.toLowerCase();
    return (subs || []).filter(
      (s) =>
        !term ||
        s.customer_name?.toLowerCase().includes(term) ||
        s.customer_email?.toLowerCase().includes(term) ||
        s.tier_name?.toLowerCase().includes(term)
    );
  }, [subs, search]);

  const handleTierSubmit = async (data) => {
    if (!user?._id) return;
    setBusy(true);
    setError("");
    try {
      if (editingTier && editingTier !== "new") {
        await updateTier({ tier_id: editingTier._id, updated_by: user._id, ...data });
      } else {
        await createTier({ created_by: user._id, ...data });
      }
      setEditingTier(null);
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveTier = async (tier) => {
    if (!user?._id) return;
    if (!window.confirm(`Archive tier "${tier.name}"?`)) return;
    try {
      await archiveTier({ tier_id: tier._id, updated_by: user._id });
    } catch (e) {
      window.alert(e?.message || "Archive failed");
    }
  };

  const handleAssign = async (data) => {
    if (!user?._id) return;
    setBusy(true);
    setError("");
    try {
      await applyForSubscription({
        ...data,
        applied_by: user._id,
        applied_via: "admin",
      });
      setShowAssign(false);
      setSuccess("Subscription assigned.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e?.message || "Assign failed");
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async (sub) => {
    if (!user?._id) return;
    if (!window.confirm(`Activate ${sub.customer_name}'s subscription?`)) return;
    try {
      await activate({ subscription_id: sub._id, approved_by: user._id });
    } catch (e) {
      window.alert(e?.message || "Activate failed");
    }
  };

  const handleCancel = async (sub) => {
    if (!user?._id) return;
    const reason = window.prompt(
      `Cancel ${sub.customer_name}'s subscription?\nReason (optional):`,
      ""
    );
    if (reason === null) return;
    try {
      await cancel({
        subscription_id: sub._id,
        cancelled_by: user._id,
        reason: reason || undefined,
      });
    } catch (e) {
      window.alert(e?.message || "Cancel failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-[var(--color-primary)]" />
            Customer Subscriptions
          </h2>
          <p className="text-gray-400 text-sm">
            Define tiered membership plans with free haircut + product allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#252525] border border-[#333] rounded-lg p-1">
            <button
              onClick={() => setView("subscriptions")}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                view === "subscriptions"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Subscriptions
            </button>
            <button
              onClick={() => setView("tiers")}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                view === "tiers"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Tiers
            </button>
          </div>
          {view === "subscriptions" ? (
            <button
              onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Assign
            </button>
          ) : (
            <button
              onClick={() => setEditingTier("new")}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              New Tier
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
          <p className="text-emerald-300 text-sm">{success}</p>
        </div>
      )}

      {/* TIERS VIEW */}
      {view === "tiers" &&
        (!tiers ? (
          <div className="text-gray-500 text-sm">Loading tiers…</div>
        ) : tiers.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-8 text-center text-gray-400">
            No tiers yet. Create your first tier to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiers.map((t) => (
              <div
                key={t._id}
                className={`p-4 rounded-xl border ${
                  t.is_active
                    ? "bg-[#1A1A1A] border-[#333] hover:border-[var(--color-primary)]/40"
                    : "bg-[#1A1A1A]/50 border-[#222] opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[var(--color-primary)]" />
                      {t.name}
                    </h3>
                    <p className="text-xs text-gray-500">{t.slug}</p>
                  </div>
                  {!t.is_active && (
                    <span className="text-[10px] uppercase text-gray-500 bg-[#252525] px-2 py-0.5 rounded">
                      Archived
                    </span>
                  )}
                </div>

                {t.description && (
                  <p className="text-sm text-gray-400 mb-2">{t.description}</p>
                )}

                <div className="space-y-1 mb-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Scissors className="w-3 h-3 text-blue-400" /> Services
                    </span>
                    <span className="text-white font-medium">
                      {t.service_allocations}
                      {t.service_max_value
                        ? ` (up to ${formatPHP(t.service_max_value)} ea)`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Package className="w-3 h-3 text-purple-400" /> Products
                    </span>
                    <span className="text-white font-medium">
                      {t.product_allocations}
                      {t.product_max_value
                        ? ` (up to ${formatPHP(t.product_max_value)} ea)`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" /> Period
                    </span>
                    <span className="text-white font-medium capitalize">
                      {t.period_type}
                    </span>
                  </div>
                </div>

                <p className="text-lg font-bold text-white mb-3">
                  {formatPHP(t.price)}
                  <span className="text-xs text-gray-500 font-normal">
                    /{t.period_type === "monthly" ? "mo" : t.period_type === "quarterly" ? "qtr" : "yr"}
                  </span>
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingTier(t)}
                    className="flex-1 px-3 py-1.5 bg-[#252525] hover:bg-[#2A2A2A] text-white rounded-lg text-sm flex items-center justify-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {t.is_active && (
                    <button
                      onClick={() => handleArchiveTier(t)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* SUBSCRIPTIONS VIEW */}
      {view === "subscriptions" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer or tier…"
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg pl-8 pr-3 py-2 text-white text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* List */}
          {!subs ? (
            <div className="text-gray-500 text-sm">Loading subscriptions…</div>
          ) : filteredSubs.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-8 text-center text-gray-400">
              No subscriptions in this view.
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-[#333] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#252525] text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="text-left py-2 px-3">Customer</th>
                      <th className="text-left py-2 px-3">Tier</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-right py-2 px-3">Remaining (Svc / Prod)</th>
                      <th className="text-left py-2 px-3">Period ends</th>
                      <th className="text-center py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((s) => (
                      <tr
                        key={s._id}
                        className="border-t border-[#252525] hover:bg-[#252525]"
                      >
                        <td className="py-2 px-3">
                          <p className="text-white">{s.customer_name}</p>
                          <p className="text-gray-500 text-xs">{s.customer_email}</p>
                        </td>
                        <td className="py-2 px-3 text-white">
                          {s.tier_name}
                          <p className="text-gray-500 text-xs capitalize">
                            {s.tier_period}
                          </p>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                              STATUS_COLORS[s.status] || "border-gray-500"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-white">
                          {s.services_remaining} / {s.products_remaining}
                          <p className="text-gray-500 text-xs">
                            used {s.services_used_this_period} / {s.products_used_this_period}
                          </p>
                        </td>
                        <td className="py-2 px-3 text-gray-400">
                          {s.current_period_end
                            ? new Date(s.current_period_end).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {s.status === "pending" && (
                              <button
                                onClick={() => handleActivate(s)}
                                className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded"
                                title="Activate"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {(s.status === "pending" || s.status === "active" || s.status === "paused") && (
                              <button
                                onClick={() => handleCancel(s)}
                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                                title="Cancel"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {editingTier && (
        <TierModal
          tier={editingTier === "new" ? null : editingTier}
          onClose={() => setEditingTier(null)}
          onSubmit={handleTierSubmit}
          busy={busy}
        />
      )}

      {showAssign && (
        <AssignModal
          tiers={tiers}
          customers={customers}
          onClose={() => setShowAssign(false)}
          onSubmit={handleAssign}
          busy={busy}
        />
      )}
    </div>
  );
};

export default CustomerSubscriptionsManager;
