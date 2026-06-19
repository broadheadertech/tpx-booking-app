import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  UserCog,
  Building,
  Eye,
  AlertTriangle,
  CheckCircle2,
  History,
  Clock,
} from "lucide-react";

const ImpersonateBranchPanel = () => {
  const navigate = useNavigate();
  const { realUser, isImpersonating, impersonation } = useCurrentUser();
  const branches = useQuery(api.services.branches.getAllBranches) || [];
  const sessions = useQuery(
    api.services.impersonation.listAllImpersonationSessions,
    { limit: 25 }
  );
  const startImpersonation = useMutation(api.services.impersonation.startImpersonation);
  const endImpersonation = useMutation(api.services.impersonation.endImpersonation);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [targetRole, setTargetRole] = useState("branch_admin");

  const roleRedirect = (role) => {
    switch (role) {
      case "super_admin": return "/admin/dashboard";
      case "barber": return "/barber/home";
      default: return "/staff/dashboard"; // branch_admin, staff
    }
  };

  const handleStart = async (role, branchId) => {
    if (!realUser?._id || busy) return;
    setBusy(true);
    setError("");
    try {
      await startImpersonation({
        user_id: realUser._id,
        target_role: role,
        target_branch_id: branchId,
      });
      // Hop to the dashboard for the role being acted as.
      navigate(roleRedirect(role));
    } catch (e) {
      setError(e?.message || "Failed to start");
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (!realUser?._id || busy) return;
    setBusy(true);
    setError("");
    try {
      await endImpersonation({ user_id: realUser._id });
    } catch (e) {
      setError(e?.message || "Failed to stop mirroring");
    } finally {
      setBusy(false);
    }
  };

  const formatDuration = (start, end) => {
    const ms = (end || Date.now()) - start;
    const m = Math.floor(ms / 60000);
    if (m < 1) return `${Math.floor(ms / 1000)}s`;
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[var(--color-primary)]" />
            Login As
          </h2>
          <p className="text-gray-400 text-sm max-w-2xl mt-1">
            Act as a super admin, branch admin, staff, or barber — see exactly
            what they see. Every action is logged with your real identity for
            full transparency.
          </p>
        </div>
      </div>

      {/* Currently impersonating */}
      {isImpersonating && impersonation && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <Eye className="w-6 h-6 text-amber-400 mt-0.5" />
              <div>
                <p className="text-amber-300 font-semibold">
                  Acting as {(impersonation.target_role || 'branch_admin').replace('_', ' ')}
                  {impersonation.target_branch_name ? ` at ${impersonation.target_branch_name}` : ''}
                </p>
                <p className="text-amber-200/70 text-sm mt-1">
                  Started {new Date(impersonation.started_at).toLocaleString()} •{" "}
                  {impersonation.action_count} action
                  {impersonation.action_count === 1 ? "" : "s"} so far
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(roleRedirect(impersonation.target_role || 'branch_admin'))}
                className="px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-lg hover:bg-amber-500/30 transition-colors text-sm font-medium"
              >
                Go to that view
              </button>
              <button
                onClick={handleStop}
                disabled={busy}
                className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {busy ? "Stopping…" : "Stop mirroring"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Role + branch picker */}
      {!isImpersonating && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4 space-y-4">
          <div>
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <UserCog className="w-4 h-4 text-[var(--color-primary)]" />
              Choose a role to act as
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "super_admin", label: "Super Admin" },
                { id: "branch_admin", label: "Branch Admin" },
                { id: "staff", label: "Staff" },
                { id: "barber", label: "Barber" },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTargetRole(r.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    targetRole === r.id
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-[#252525] text-gray-300 border-[#333] hover:border-[var(--color-primary)]/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {targetRole === "super_admin" ? (
            <div>
              <button
                onClick={() => handleStart("super_admin")}
                disabled={busy}
                className="px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Starting…" : "Start acting as Super Admin"}
              </button>
              <p className="text-xs text-gray-500 mt-2">Super admin isn't tied to a branch — no branch needed.</p>
            </div>
          ) : (
            <div>
              <h4 className="text-gray-300 text-sm mb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-[var(--color-primary)]" />
                Pick a branch to act as {targetRole.replace("_", " ")}
              </h4>
              {branches.length === 0 ? (
                <p className="text-gray-500 text-sm">No branches available.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {branches
                    .filter((b) => b.is_active)
                    .map((b) => (
                      <button
                        key={b._id}
                        onClick={() => handleStart(targetRole, b._id)}
                        disabled={busy}
                        className="text-left p-3 bg-[#252525] hover:bg-[#2A2A2A] border border-[#333333] hover:border-[var(--color-primary)]/40 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="w-4 h-4 text-[var(--color-primary)]" />
                          <p className="text-white text-sm font-medium">{b.name}</p>
                        </div>
                        <p className="text-gray-500 text-xs">{b.address || "—"}</p>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transparency disclosure */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          How this stays transparent
        </h3>
        <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
          <li>Every audit log written during mirroring is tagged with your real user ID and role.</li>
          <li>Start and stop events are recorded in System Logs under the "auth" category.</li>
          <li>The amber banner stays visible throughout the session so you never lose track.</li>
          <li>Only one branch can be mirrored at a time — starting a new session ends the previous one.</li>
        </ul>
      </div>

      {/* Recent sessions */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] p-4">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--color-primary)]" />
          Recent mirror sessions
        </h3>
        {!sessions || sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No sessions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333333] text-gray-400">
                  <th className="text-left py-2 px-3 font-medium">When</th>
                  <th className="text-left py-2 px-3 font-medium">By</th>
                  <th className="text-left py-2 px-3 font-medium">Acting as</th>
                  <th className="text-right py-2 px-3 font-medium">Actions</th>
                  <th className="text-right py-2 px-3 font-medium">Duration</th>
                  <th className="text-center py-2 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id} className="border-b border-[#252525] hover:bg-[#252525]">
                    <td className="py-2 px-3 text-gray-300">
                      {new Date(s.started_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-white">
                      {s.impersonator_name}
                      <span className="text-gray-500 text-xs ml-1">({s.impersonator_role})</span>
                    </td>
                    <td className="py-2 px-3 text-white">
                      <span className="capitalize">{(s.target_role || 'branch_admin').replace('_', ' ')}</span>
                      {s.target_branch_name ? <span className="text-gray-500"> · {s.target_branch_name}</span> : ''}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-300">
                      {s.action_count}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(s.started_at, s.ended_at)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {s.is_active ? (
                        <span className="text-amber-400 text-xs font-medium">ACTIVE</span>
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {s.end_reason === "superseded" ? "Superseded" : "Ended"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImpersonateBranchPanel;
