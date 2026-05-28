import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  Package,
  Plus,
  Edit3,
  Archive,
  X,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Layers,
  Tag,
  Trash2,
} from "lucide-react";

const formatPHP = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const PackageModal = ({ pkg, onClose, onSubmit, catalog, busy }) => {
  const [name, setName] = useState(pkg?.name || "");
  const [slug, setSlug] = useState(pkg?.slug || "");
  const [description, setDescription] = useState(pkg?.description || "");
  const [monthlyPrice, setMonthlyPrice] = useState(pkg?.monthly_price ?? "");
  const [annualPrice, setAnnualPrice] = useState(pkg?.annual_price ?? "");
  const [displayOrder, setDisplayOrder] = useState(pkg?.display_order ?? "");
  const [features, setFeatures] = useState(pkg?.features || {});
  const [termDiscounts, setTermDiscounts] = useState(
    pkg?.term_discounts || []
  );
  const [isActive, setIsActive] = useState(
    pkg?.is_active === undefined ? true : pkg.is_active
  );
  const [expanded, setExpanded] = useState({});
  const isEditing = !!pkg;

  const grouped = useMemo(() => {
    const out = {};
    for (const f of catalog) {
      if (!out[f.category]) out[f.category] = [];
      out[f.category].push(f);
    }
    return out;
  }, [catalog]);

  // Auto-slug from name when creating
  React.useEffect(() => {
    if (!isEditing && name) setSlug(slugify(name));
  }, [name, isEditing]);

  const toggleFeature = (key) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedDiscounts = termDiscounts
      .filter((d) => d.min_months > 0 && d.discount_percent >= 0)
      .map((d) => ({
        min_months: Number(d.min_months),
        discount_percent: Number(d.discount_percent),
        label: d.label?.trim() || undefined,
      }));
    onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      features,
      monthly_price: monthlyPrice === "" ? undefined : parseFloat(monthlyPrice),
      annual_price: annualPrice === "" ? undefined : parseFloat(annualPrice),
      display_order: displayOrder === "" ? undefined : parseInt(displayOrder),
      is_active: isActive,
      term_discounts: cleanedDiscounts,
    });
  };

  const addDiscount = () =>
    setTermDiscounts((prev) => [
      ...prev,
      { min_months: 6, discount_percent: 10, label: "" },
    ]);
  const updateDiscount = (i, key, val) =>
    setTermDiscounts((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, [key]: val } : d))
    );
  const removeDiscount = (i) =>
    setTermDiscounts((prev) => prev.filter((_, idx) => idx !== i));

  const enabledCount = Object.values(features).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#333] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-[#333] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--color-primary)]" />
            {isEditing ? "Edit Package" : "Create Package"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Starter"
                required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Slug (URL-safe)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="starter"
                required
                disabled={isEditing}
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
              placeholder="What this package is for…"
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Monthly Price (₱)</label>
              <input
                type="number"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Annual Price (₱)</label>
              <input
                type="number"
                value={annualPrice}
                onChange={(e) => setAnnualPrice(e.target.value)}
                placeholder="0"
                min="0"
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

          {/* Term Discounts — admin-side billing only */}
          <div className="border-t border-[#333] pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--color-primary)]" />
                Term Discounts
              </h4>
              <button
                type="button"
                onClick={addDiscount}
                className="text-xs px-2 py-1 bg-[#252525] hover:bg-[#2A2A2A] text-gray-300 rounded border border-[#333] flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add tier
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Discounts applied when a branch commits to a longer term. Best applicable tier wins. <strong>Billed admin-side only — branches never see these numbers.</strong>
            </p>
            {termDiscounts.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No discount tiers — full monthly price applies for any term.</p>
            ) : (
              <div className="space-y-2">
                {termDiscounts.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#252525] border border-[#333] rounded-lg p-2">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Min Months</label>
                        <input
                          type="number"
                          min="1"
                          value={d.min_months}
                          onChange={(e) => updateDiscount(i, "min_months", e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Discount %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={d.discount_percent}
                          onChange={(e) => updateDiscount(i, "discount_percent", e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Label (optional)</label>
                        <input
                          type="text"
                          value={d.label || ""}
                          onChange={(e) => updateDiscount(i, "label", e.target.value)}
                          placeholder="6-month deal"
                          className="w-full bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-white text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDiscount(i)}
                      className="p-1.5 text-gray-400 hover:text-red-400"
                      title="Remove tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features grouped by category */}
          <div className="border-t border-[#333] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                Features
              </h4>
              <span className="text-xs text-gray-400">
                {enabledCount} of {catalog.length} enabled
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(grouped).map(([category, items]) => (
                <div
                  key={category}
                  className="bg-[#252525] rounded-lg border border-[#333]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))
                    }
                    className="w-full px-3 py-2 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium text-white flex items-center gap-2">
                      {expanded[category] ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      {category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {items.filter((i) => features[i.key]).length}/{items.length}
                    </span>
                  </button>
                  {expanded[category] && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {items.map((f) => (
                        <label
                          key={f.key}
                          className="flex items-start gap-2 cursor-pointer py-1.5 hover:bg-[#2A2A2A] rounded px-2"
                        >
                          <input
                            type="checkbox"
                            checked={!!features[f.key]}
                            onChange={() => toggleFeature(f.key)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-sm text-white">{f.label}</p>
                            <p className="text-xs text-gray-500">{f.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

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
              {busy ? "Saving…" : isEditing ? "Save Changes" : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SubscriptionPackagesManager = () => {
  const { user } = useCurrentUser();
  const packages = useQuery(api.services.subscriptionPackages.listPackages, {
    include_inactive: true,
  });
  // The catalog comes from getEffectiveFeatures, but we don't have a branch
  // here. Use a tiny query that just returns the catalog — getEffectiveFeatures
  // is per-branch. Reuse it: ask for any branch we can find.
  const branches = useQuery(api.services.branches.getAllBranches) || [];
  const probeBranchId = branches[0]?._id;
  const probe = useQuery(
    api.services.subscriptions.getEffectiveFeatures,
    probeBranchId ? { branch_id: probeBranchId } : "skip"
  );
  const catalog = probe?.catalog || [];

  const createPkg = useMutation(api.services.subscriptionPackages.createPackage);
  const updatePkg = useMutation(api.services.subscriptionPackages.updatePackage);
  const archivePkg = useMutation(api.services.subscriptionPackages.archivePackage);

  const [editing, setEditing] = useState(null); // package or "new"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data) => {
    if (!user?._id) return;
    setBusy(true);
    setError("");
    try {
      if (editing && editing !== "new") {
        await updatePkg({ package_id: editing._id, updated_by: user._id, ...data });
      } else {
        await createPkg({ created_by: user._id, ...data });
      }
      setEditing(null);
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async (pkg) => {
    if (!user?._id) return;
    if (!window.confirm(`Archive package "${pkg.name}"? Branches must be reassigned first.`)) return;
    try {
      await archivePkg({ package_id: pkg._id, updated_by: user._id });
    } catch (e) {
      window.alert(e?.message || "Archive failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--color-primary)]" />
            Subscription Packages
          </h2>
          <p className="text-gray-400 text-sm">
            Define feature bundles that you can assign to branches.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          New Package
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {!packages ? (
        <div className="text-gray-500 text-sm">Loading packages…</div>
      ) : packages.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-8 text-center text-gray-400">
          No packages yet. Click "New Package" to create your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {packages.map((p) => {
            const enabled = Object.values(p.features || {}).filter(Boolean).length;
            return (
              <div
                key={p._id}
                className={`p-4 rounded-xl border ${
                  p.is_active
                    ? "bg-[#1A1A1A] border-[#333] hover:border-[var(--color-primary)]/40"
                    : "bg-[#1A1A1A]/50 border-[#222] opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{p.name}</h3>
                    <p className="text-xs text-gray-500">{p.slug}</p>
                  </div>
                  {!p.is_active && (
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-[#252525] px-2 py-0.5 rounded">
                      Archived
                    </span>
                  )}
                </div>

                {p.description && (
                  <p className="text-sm text-gray-400 mb-3">{p.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>
                    {enabled} feature{enabled === 1 ? "" : "s"} enabled
                  </span>
                  <span>
                    {p.monthly_price !== undefined
                      ? `${formatPHP(p.monthly_price)}/mo`
                      : "—"}
                  </span>
                </div>

                {p.term_discounts && p.term_discounts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.term_discounts
                      .slice()
                      .sort((a, b) => a.min_months - b.min_months)
                      .map((d, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          title={d.label || `${d.min_months}mo: ${d.discount_percent}% off`}
                        >
                          {d.min_months}mo −{d.discount_percent}%
                        </span>
                      ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="flex-1 px-3 py-1.5 bg-[#252525] hover:bg-[#2A2A2A] text-white rounded-lg text-sm flex items-center justify-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {p.is_active && (
                    <button
                      onClick={() => handleArchive(p)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm flex items-center gap-1"
                      title="Archive (only if no branches assigned)"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <PackageModal
          pkg={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
          catalog={catalog}
          busy={busy}
        />
      )}
    </div>
  );
};

export default SubscriptionPackagesManager;
