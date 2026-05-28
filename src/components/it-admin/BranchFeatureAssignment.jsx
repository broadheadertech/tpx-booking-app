import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  Building,
  Package,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
  Search,
  Settings2,
  Tag,
  Calendar,
} from "lucide-react";

const formatPHP = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

/**
 * Inline pricing preview for one term option. Reads the package's
 * term_discounts and shows the resulting monthly + total + savings.
 */
const TermOption = ({ packageId, months, label, isSelected, onSelect }) => {
  const preview = useQuery(
    api.services.subscriptions.previewSubscriptionPricing,
    packageId ? { package_id: packageId, term_months: months } : "skip"
  );
  if (!preview) {
    return (
      <button
        type="button"
        disabled
        className="p-3 rounded-lg border border-[#333] bg-[#252525] text-gray-500 text-left"
      >
        <p className="text-sm">{label}</p>
        <p className="text-xs">Loading…</p>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-3 rounded-lg border text-left transition-colors ${
        isSelected
          ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)]"
          : "bg-[#252525] hover:bg-[#2A2A2A] border-[#333] hover:border-[var(--color-primary)]/40"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-white">{label}</span>
        {preview.discount_percent > 0 && (
          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
            −{preview.discount_percent}%
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-white">
        {formatPHP(preview.discounted_monthly)}
        <span className="text-xs text-gray-500 font-normal">/mo</span>
      </p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        Total {formatPHP(preview.total_term_value)}
        {preview.savings > 0 && (
          <span className="text-emerald-400 ml-1">· save {formatPHP(preview.savings)}</span>
        )}
      </p>
    </button>
  );
};

const FeatureRow = ({ feature, packageValue, overrideValue, onSetOverride, onClearOverride }) => {
  const effective = typeof overrideValue === "boolean" ? overrideValue : !!packageValue;
  const isOverridden = typeof overrideValue === "boolean" && overrideValue !== packageValue;

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-[#252525] rounded">
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-sm text-white truncate">{feature.label}</p>
        <p className="text-xs text-gray-500 truncate">{feature.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
            packageValue
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-gray-500/15 text-gray-400"
          }`}
          title="Package default"
        >
          PKG {packageValue ? "ON" : "OFF"}
        </span>
        {isOverridden && (
          <button
            onClick={onClearOverride}
            className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
            title="Clear override (revert to package default)"
          >
            OVR ✕
          </button>
        )}
        <button
          onClick={() => onSetOverride(!effective)}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
            effective ? "bg-[var(--color-primary)]" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              effective ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

const BranchFeatureAssignment = () => {
  const { user } = useCurrentUser();
  const branches = useQuery(api.services.branches.getAllBranches) || [];
  const packages = useQuery(api.services.subscriptionPackages.listPackages, {});
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  React.useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      const first = branches.find((b) => b.is_active) || branches[0];
      if (first) setSelectedBranchId(first._id);
    }
  }, [branches, selectedBranchId]);

  const effective = useQuery(
    api.services.subscriptions.getEffectiveFeatures,
    selectedBranchId ? { branch_id: selectedBranchId } : "skip"
  );

  const assignPackage = useMutation(api.services.subscriptions.assignPackageToBranch);
  const setOverride = useMutation(api.services.subscriptions.setFeatureOverride);
  const setTermMutation = useMutation(api.services.subscriptions.setSubscriptionTerm);

  // Term commitment state — admin-side billing only
  const [pendingTermMonths, setPendingTermMonths] = useState(12);
  const [customMonths, setCustomMonths] = useState("");
  const [termNotes, setTermNotes] = useState("");
  const [baseOverride, setBaseOverride] = useState("");
  const [termBusy, setTermBusy] = useState(false);

  // Pull the package detail to read its term discount tiers
  const packageDetail = useQuery(
    api.services.subscriptionPackages.getPackageById,
    effective?.package_id ? { package_id: effective.package_id } : "skip"
  );
  // Pull the current subscription so we can show committed term + price
  const branchSubscription = useQuery(
    api.services.subscriptions.getSubscriptionByBranch,
    selectedBranchId ? { branch_id: selectedBranchId } : "skip"
  );

  const filteredBranches = useMemo(() => {
    const term = search.toLowerCase();
    return branches
      .filter((b) => !term || b.name?.toLowerCase().includes(term))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [branches, search]);

  const selectedBranch = branches.find((b) => b._id === selectedBranchId);

  const grouped = useMemo(() => {
    if (!effective?.catalog) return {};
    const out = {};
    for (const f of effective.catalog) {
      if (!out[f.category]) out[f.category] = [];
      out[f.category].push(f);
    }
    return out;
  }, [effective]);

  const handleAssignPackage = async (packageId) => {
    if (!user?._id || !selectedBranchId) return;
    setAssignBusy(true);
    setError("");
    setSuccess("");
    try {
      await assignPackage({
        branch_id: selectedBranchId,
        package_id: packageId,
        assigned_by: user._id,
      });
      setSuccess(`Package assigned.`);
      setTimeout(() => setSuccess(""), 3500);
    } catch (e) {
      setError(e?.message || "Assign failed");
    } finally {
      setAssignBusy(false);
    }
  };

  const handleSetOverride = async (featureKey, value) => {
    if (!user?._id || !selectedBranchId) return;
    setError("");
    try {
      await setOverride({
        branch_id: selectedBranchId,
        feature_key: featureKey,
        value,
        reason: overrideReason.trim() || undefined,
        updated_by: user._id,
      });
    } catch (e) {
      setError(e?.message || "Override failed");
    }
  };

  const handleSetTerm = async () => {
    if (!user?._id || !selectedBranchId) return;
    setTermBusy(true);
    setError("");
    setSuccess("");
    try {
      const r = await setTermMutation({
        branch_id: selectedBranchId,
        term_months: pendingTermMonths,
        set_by: user._id,
        base_monthly_override:
          baseOverride === "" ? undefined : parseFloat(baseOverride),
        term_notes: termNotes.trim() || undefined,
      });
      setSuccess(
        `Term locked: ${pendingTermMonths} months • ${formatPHP(r.discounted_monthly)}/mo${r.discount_percent > 0 ? ` (−${r.discount_percent}%)` : ""} • Total ${formatPHP(r.total_term_value)}`
      );
      setBaseOverride("");
      setTermNotes("");
      setTimeout(() => setSuccess(""), 6000);
    } catch (e) {
      setError(e?.message || "Failed to set term");
    } finally {
      setTermBusy(false);
    }
  };

  const handleClearOverride = async (featureKey) => {
    if (!user?._id || !selectedBranchId) return;
    setError("");
    try {
      await setOverride({
        branch_id: selectedBranchId,
        feature_key: featureKey,
        value: null,
        reason: overrideReason.trim() || undefined,
        updated_by: user._id,
      });
    } catch (e) {
      setError(e?.message || "Clear failed");
    }
  };

  const overrides = useMemo(() => {
    // Reverse-derive from the effective vs package
    if (!effective?.features || !effective.catalog) return {};
    return {}; // Placeholder — handled inline by FeatureRow via package vs effective check
  }, [effective]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[var(--color-primary)]" />
          Branch Features
        </h2>
        <p className="text-gray-400 text-sm">
          Assign a package to a branch, then optionally override individual features.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Branch list */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-3 flex flex-col gap-3 max-h-[600px]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search branches…"
              className="w-full bg-[#252525] border border-[#333] rounded-lg pl-8 pr-3 py-2 text-white text-sm"
            />
          </div>
          <div className="overflow-y-auto -mr-1 pr-1 space-y-1">
            {filteredBranches.map((b) => (
              <button
                key={b._id}
                onClick={() => setSelectedBranchId(b._id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  b._id === selectedBranchId
                    ? "bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40"
                    : "hover:bg-[#252525] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building className="w-3.5 h-3.5 text-[var(--color-primary)] flex-shrink-0" />
                  <p className="text-sm text-white truncate">{b.name}</p>
                </div>
                {!b.is_active && (
                  <p className="text-[10px] text-gray-500 mt-0.5">inactive</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="space-y-4">
          {!selectedBranchId ? (
            <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-8 text-center text-gray-400">
              Pick a branch on the left.
            </div>
          ) : (
            <>
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

              {/* Current package */}
              <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      {selectedBranch?.name}
                    </p>
                    <p className="text-lg font-semibold text-white flex items-center gap-2">
                      <Package className="w-4 h-4 text-[var(--color-primary)]" />
                      {effective?.package_name || (
                        <span className="text-gray-500 text-base font-normal">
                          No package assigned
                        </span>
                      )}
                    </p>
                    {effective?.has_overrides && (
                      <p className="text-xs text-amber-400 mt-1">
                        {effective.override_count} feature override
                        {effective.override_count === 1 ? "" : "s"} on this branch
                      </p>
                    )}
                  </div>
                </div>

                {/* Assign package */}
                <div className="mt-3 pt-3 border-t border-[#333]">
                  <p className="text-xs text-gray-400 mb-2">Change package</p>
                  <div className="flex flex-wrap gap-2">
                    {(packages || [])
                      .filter((p) => p.is_active)
                      .map((p) => {
                        const isCurrent = p._id === effective?.package_id;
                        return (
                          <button
                            key={p._id}
                            onClick={() => handleAssignPackage(p._id)}
                            disabled={assignBusy || isCurrent}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              isCurrent
                                ? "bg-[var(--color-primary)] text-white"
                                : "bg-[#252525] hover:bg-[#2A2A2A] text-gray-300 border border-[#333]"
                            } disabled:opacity-60`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Term commitment + pricing (admin-side billing only) */}
              {effective?.package_id && (
                <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[var(--color-primary)]" />
                    <h4 className="text-white font-medium">Subscription Term</h4>
                    <span className="text-[10px] uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">
                      Admin-side billing
                    </span>
                  </div>

                  {/* Current commitment */}
                  {branchSubscription?.term_months ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">
                          Active term: {branchSubscription.term_months} month
                          {branchSubscription.term_months === 1 ? "" : "s"}
                        </span>
                        {(branchSubscription.applied_discount_percent || 0) > 0 && (
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            −{branchSubscription.applied_discount_percent}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 space-y-0.5">
                        <p>
                          Base {formatPHP(branchSubscription.base_monthly_amount)} → {" "}
                          <span className="text-white font-medium">
                            {formatPHP(branchSubscription.discounted_monthly_amount)}/mo
                          </span>
                        </p>
                        <p>
                          Total {formatPHP(branchSubscription.total_term_value)}
                          {(branchSubscription.term_savings || 0) > 0 && (
                            <span className="text-emerald-400 ml-1">
                              · saved {formatPHP(branchSubscription.term_savings)}
                            </span>
                          )}
                          {branchSubscription.term_end && (
                            <span className="text-gray-500 ml-2">
                              · ends {new Date(branchSubscription.term_end).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                        {branchSubscription.term_notes && (
                          <p className="text-gray-500 italic">"{branchSubscription.term_notes}"</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      No term locked yet. Pick a duration below to compute pricing and commit.
                    </p>
                  )}

                  {/* Term picker */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Pick a term</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[1, 3, 6, 12].map((m) => (
                        <TermOption
                          key={m}
                          packageId={effective.package_id}
                          months={m}
                          label={`${m} month${m === 1 ? "" : "s"}`}
                          isSelected={pendingTermMonths === m}
                          onSelect={() => setPendingTermMonths(m)}
                        />
                      ))}
                    </div>
                    {/* Custom term */}
                    <div className="flex items-end gap-2 mt-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">Or custom term (months)</label>
                        <input
                          type="number"
                          min="1"
                          value={customMonths}
                          onChange={(e) => setCustomMonths(e.target.value)}
                          placeholder="24"
                          className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const m = parseInt(customMonths);
                          if (m > 0) setPendingTermMonths(m);
                        }}
                        disabled={!customMonths}
                        className="px-3 py-2 bg-[#252525] hover:bg-[#2A2A2A] border border-[#333] text-gray-300 rounded-lg text-sm disabled:opacity-50"
                      >
                        Use
                      </button>
                    </div>
                  </div>

                  {/* Tiers reference */}
                  {packageDetail?.term_discounts?.length > 0 && (
                    <div className="bg-[#252525] border border-[#333] rounded-lg p-2 text-xs text-gray-400">
                      <p className="font-medium text-gray-300 mb-1">Package discount tiers:</p>
                      <ul className="space-y-0.5">
                        {packageDetail.term_discounts.map((d, i) => (
                          <li key={i}>
                            {d.min_months}+ months: <span className="text-emerald-400">−{d.discount_percent}%</span>
                            {d.label && <span className="text-gray-500"> · {d.label}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Optional negotiated overrides */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Negotiated base ₱/mo (optional)</label>
                      <input
                        type="number"
                        min="0"
                        value={baseOverride}
                        onChange={(e) => setBaseOverride(e.target.value)}
                        placeholder={packageDetail?.monthly_price?.toString() || ""}
                        className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Term notes (optional)</label>
                      <input
                        type="text"
                        value={termNotes}
                        onChange={(e) => setTermNotes(e.target.value)}
                        placeholder="Franchise renewal Q3"
                        className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSetTerm}
                    disabled={termBusy || pendingTermMonths <= 0}
                    className="w-full px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {termBusy
                      ? "Saving…"
                      : `Commit ${pendingTermMonths}-month term`}
                  </button>
                </div>
              )}

              {/* Override reason — used for the next override action */}
              <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4">
                <label className="block text-xs text-gray-400 mb-1">
                  Override reason (optional, applied to next change)
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. trial bump for VIP franchise"
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              {/* Features list */}
              {effective ? (
                <div className="space-y-3">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div
                      key={category}
                      className="bg-[#1A1A1A] border border-[#333] rounded-xl p-3"
                    >
                      <h4 className="text-sm font-semibold text-gray-300 px-2 mb-1">
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {items.map((f) => {
                          const pkgValue = false; // We don't have the raw package separately client-side — but we can infer.
                          // Instead of inferring, show the *effective* value with the override indicator
                          // computed against the package. To do that we'd need raw package features —
                          // for simplicity, treat the effective value as toggle target and let the
                          // backend mergeFeatures reflect changes after each call.
                          return (
                            <FeatureRow
                              key={f.key}
                              feature={f}
                              packageValue={!!effective.features[f.key]}
                              overrideValue={undefined}
                              onSetOverride={(v) => handleSetOverride(f.key, v)}
                              onClearOverride={() => handleClearOverride(f.key)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Loading features…</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchFeatureAssignment;
