import React, { useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Eye, X, Crown } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";

/**
 * Persistent banner shown whenever an admin is mirroring a branch.
 * Mount once near the top of the app tree so it appears on every route.
 */
const ImpersonationBanner = () => {
  const navigate = useNavigate();
  const { realUser, isImpersonating, impersonation } = useCurrentUser();
  const endImpersonation = useMutation(api.services.impersonation.endImpersonation);
  const [busy, setBusy] = useState(false);

  if (!isImpersonating || !impersonation || !realUser?._id) return null;

  const handleStop = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await endImpersonation({ user_id: realUser._id });
      // Send the admin back to their own dashboard.
      const adminHome =
        realUser.role === "it_admin" ? "/it-admin/dashboard" : "/admin/dashboard";
      navigate(adminHome);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-gradient-to-r from-amber-600/90 via-amber-500/90 to-amber-600/90 border-b border-amber-400/50 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold whitespace-nowrap">
            Mirror mode
          </span>
          <span className="text-white/80 text-sm hidden sm:inline">·</span>
          <span className="text-sm truncate">
            <span className="text-white/80 hidden sm:inline">Viewing as </span>
            <strong>{impersonation.target_branch_name}</strong>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-white/80">
          <Crown className="w-3 h-3" />
          <span>
            Real: {realUser.name || realUser.email} ({realUser.role})
          </span>
          <span>· {impersonation.action_count} actions logged</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleStop}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
            title="Exit mirror mode"
          >
            <X className="w-4 h-4" />
            {busy ? "Exiting…" : "Exit mirror"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
