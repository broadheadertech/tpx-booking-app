import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  CreditCard,
  Key,
  Shield,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  Wallet,
} from "lucide-react";

/**
 * PaymentSettings Component
 *
 * Allows branch admins to configure PayMongo payment settings.
 * Story 6.4: Build Payment Settings UI
 *
 * Features:
 * - API key configuration (encrypted on save)
 * - Payment option toggles (Pay Now, Pay Later, Pay at Shop)
 * - RBAC: Only branch_admin and super_admin can access
 *
 * Note: Convenience fee is now configured in Booking Settings
 */

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, disabled = false, label, description }) => (
  <div className={`flex items-center justify-between gap-4 p-4 rounded-lg border ${disabled ? 'bg-[#0A0A0A] border-[#222]' : 'bg-[#1A1A1A] border-[#333]'}`}>
    <div className="flex-1 min-w-0">
      <div className={`font-medium ${disabled ? 'text-gray-500' : 'text-white'}`}>{label}</div>
      {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
        disabled
          ? 'bg-[#222] cursor-not-allowed'
          : enabled
            ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]'
            : 'bg-[#333]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

// Password Input with Toggle Visibility
const PasswordInput = ({ value, onChange, placeholder, disabled = false }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-[#0A0A0A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
};

const PaymentSettings = ({ onRefresh }) => {
  const { user } = useCurrentUser();

  // State for form fields
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [payNowEnabled, setPayNowEnabled] = useState(false);
  const [payLaterEnabled, setPayLaterEnabled] = useState(false);
  const [payAtShopEnabled, setPayAtShopEnabled] = useState(true);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Get branch_id - for super_admin, we need to handle branch selection
  const branchId = user?.branch_id;

  // Query existing config
  const existingConfig = useQuery(
    api.services.paymongo.getPaymentConfig,
    branchId ? { branch_id: branchId } : "skip"
  );

  // Save mutations
  const saveConfig = useMutation(api.services.paymongo.savePaymentConfig);
  const updateSettings = useMutation(api.services.paymongo.updatePaymentSettings);
  const toggleBranchPaymongo = useMutation(api.services.paymongo.toggleBranchPaymongo);

  // Determine PayMongo mode
  const isUsingFallback = !existingConfig || existingConfig.is_fallback;
  const hasOwnConfig = existingConfig?.has_own_config || false;

  // Load existing config into form (both own config and fallback with saved preferences)
  useEffect(() => {
    if (existingConfig) {
      setPayNowEnabled(existingConfig.pay_now_enabled || false);
      setPayLaterEnabled(existingConfig.pay_later_enabled || false);
      setPayAtShopEnabled(existingConfig.pay_at_shop_enabled || false);
    }
  }, [existingConfig]);

  // Handle toggle between own PayMongo and platform fallback
  const handleToggleOwnPaymongo = async (enabled) => {
    if (!branchId || !user?._id) return;
    setIsToggling(true);
    setErrorMessage("");
    setSaveStatus(null);

    try {
      if (!enabled) {
        // Switch to platform PayMongo
        await toggleBranchPaymongo({
          branch_id: branchId,
          enabled: false,
          updated_by: user._id,
        });
        setSaveStatus("success");
        setErrorMessage("");
        setTimeout(() => setSaveStatus(null), 3000);
      } else if (hasOwnConfig) {
        // Re-enable existing own config
        await toggleBranchPaymongo({
          branch_id: branchId,
          enabled: true,
          updated_by: user._id,
        });
        setSaveStatus("success");
        setErrorMessage("");
        setTimeout(() => setSaveStatus(null), 3000);
      }
      // If no own config exists, the API key form will show for them to enter keys
    } catch (error) {
      setErrorMessage(error.message || "Failed to toggle PayMongo mode");
      setSaveStatus("error");
    } finally {
      setIsToggling(false);
    }
  };

  // Check if API keys are configured (branch's own keys, not fallback)
  const hasApiKeysConfigured = !isUsingFallback && existingConfig?.has_public_key && existingConfig?.has_secret_key;

  // Check if user is entering new API keys
  const isEnteringNewKeys = publicKey.length > 0 || secretKey.length > 0 || webhookSecret.length > 0;

  // Validate form
  const validateForm = () => {
    // Must have at least one payment option enabled
    if (!payNowEnabled && !payLaterEnabled && !payAtShopEnabled) {
      setErrorMessage("At least one payment option must be enabled");
      return false;
    }

    // If enabling online payments (Pay Now or Pay Later), must have API keys (own or HQ)
    if ((payNowEnabled || payLaterEnabled) && !isUsingFallback && !hasApiKeysConfigured && !isEnteringNewKeys) {
      setErrorMessage("PayMongo API keys are required for online payments");
      return false;
    }

    // If entering new keys, all three must be provided
    if (isEnteringNewKeys) {
      if (!publicKey || !secretKey || !webhookSecret) {
        setErrorMessage("All API key fields must be filled when updating keys");
        return false;
      }
    }

    return true;
  };

  // Handle save
  const handleSave = async () => {
    setErrorMessage("");
    setSaveStatus(null);

    if (!validateForm()) {
      setSaveStatus("error");
      return;
    }

    if (!branchId || !user?._id) {
      setErrorMessage("Unable to determine branch. Please refresh and try again.");
      setSaveStatus("error");
      return;
    }

    setIsSaving(true);

    try {
      if (isEnteringNewKeys) {
        // User is entering new API keys - save everything
        await saveConfig({
          branch_id: branchId,
          public_key: publicKey,
          secret_key: secretKey,
          webhook_secret: webhookSecret,
          pay_now_enabled: payNowEnabled,
          pay_later_enabled: payLaterEnabled,
          pay_at_shop_enabled: payAtShopEnabled,
          updated_by: user._id,
        });
      } else {
        // Update toggle settings only (works for both own config and HQ fallback)
        await updateSettings({
          branch_id: branchId,
          pay_now_enabled: payNowEnabled,
          pay_later_enabled: payLaterEnabled,
          pay_at_shop_enabled: payAtShopEnabled,
          updated_by: user._id,
        });
      }

      setSaveStatus("success");
      setHasChanges(false);
      // Clear sensitive fields after save
      setPublicKey("");
      setSecretKey("");
      setWebhookSecret("");

      // Auto-hide success message
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Failed to save payment config:", error);
      setErrorMessage(error.message || "Failed to save configuration");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  // RBAC check - only branch_admin and super_admin can access
  if (user?.role !== "branch_admin" && user?.role !== "super_admin") {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-8 text-center">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">
          Only branch administrators can access payment settings.
        </p>
      </div>
    );
  }

  // Check if no branch assigned (for non-super_admin)
  if (!branchId && user?.role !== "super_admin") {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-8 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Branch Assigned</h2>
        <p className="text-gray-400">
          You need to be assigned to a branch to configure payment settings.
        </p>
      </div>
    );
  }

  // Loading state
  if (existingConfig === undefined && branchId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-[var(--color-primary)]" />
            Payment Settings
          </h2>
          <p className="text-gray-400 mt-1">
            Configure PayMongo payment processing for your branch
          </p>
        </div>
        {existingConfig?.is_enabled && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-green-400 text-sm font-medium">
              {isUsingFallback ? 'Platform PayMongo' : 'Own PayMongo'}
            </span>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {saveStatus === "success" && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-400">Payment configuration saved successfully!</span>
        </div>
      )}

      {saveStatus === "error" && errorMessage && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-400">{errorMessage}</span>
        </div>
      )}

      {/* PayMongo Account Toggle */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold text-white">PayMongo Account</h3>
        </div>

        <ToggleSwitch
          enabled={!isUsingFallback}
          onChange={(enabled) => handleToggleOwnPaymongo(enabled)}
          disabled={isToggling || (!hasOwnConfig && isUsingFallback && !isEnteringNewKeys)}
          label="Use Own PayMongo Account"
          description={
            isUsingFallback
              ? "Currently using the platform's PayMongo. Toggle ON to use your own account."
              : "Payments go directly to your PayMongo account."
          }
        />

        {isUsingFallback && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-blue-400 text-xs">
              <p className="font-medium mb-1">Platform PayMongo Active</p>
              <p>Online payments are processed through the platform's PayMongo account. Collected funds are settled to your branch through the settlement queue.</p>
              {!hasOwnConfig && (
                <p className="mt-1">To use your own PayMongo account, enter your API keys below and save.</p>
              )}
              {hasOwnConfig && (
                <p className="mt-1">Your own PayMongo keys are saved. Toggle ON to switch back to your own account.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* API Keys Section - shown when using own PayMongo OR entering new keys to set up */}
      {(!isUsingFallback || !hasOwnConfig) && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-lg font-semibold text-white">PayMongo API Keys</h3>
          </div>

          {hasApiKeysConfigured && !isEnteringNewKeys && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-400 text-sm">API keys are configured. Enter new keys below to update.</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Public Key</label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => { setPublicKey(e.target.value); setHasChanges(true); }}
                placeholder={hasApiKeysConfigured ? "pk_live_••••••••••••" : "pk_live_xxxxxxxxxxxxx"}
                className="w-full bg-[#0A0A0A] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Secret Key</label>
              <PasswordInput
                value={secretKey}
                onChange={(v) => { setSecretKey(v); setHasChanges(true); }}
                placeholder={hasApiKeysConfigured ? "sk_live_••••••••••••" : "sk_live_xxxxxxxxxxxxx"}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Webhook Secret</label>
              <PasswordInput
                value={webhookSecret}
                onChange={(v) => { setWebhookSecret(v); setHasChanges(true); }}
                placeholder={hasApiKeysConfigured ? "whsec_••••••••••••" : "whsec_xxxxxxxxxxxxx"}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-blue-400 text-xs">
                API keys are encrypted before storage. Your secret key is never exposed to the frontend.
                Get your API keys from your <a href="https://dashboard.paymongo.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">PayMongo Dashboard</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Options Section - available for both own PayMongo and HQ fallback */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold text-white">Payment Options</h3>
        </div>

        {isUsingFallback && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <span className="text-blue-400 text-xs">Online payments use the platform's PayMongo account. You can choose which payment options to offer to your customers.</span>
          </div>
        )}

        {!isUsingFallback && !hasApiKeysConfigured && !isEnteringNewKeys && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-400 text-sm">Configure PayMongo API keys to enable online payment options.</span>
          </div>
        )}

        <div className="space-y-3">
          <ToggleSwitch
            enabled={payNowEnabled}
            onChange={(v) => { setPayNowEnabled(v); setHasChanges(true); }}
            disabled={!isUsingFallback && !hasApiKeysConfigured && !isEnteringNewKeys}
            label="Pay Now"
            description="Customer pays full amount online via PayMongo (GCash, Maya, Card)"
          />

          <ToggleSwitch
            enabled={payLaterEnabled}
            onChange={(v) => { setPayLaterEnabled(v); setHasChanges(true); }}
            disabled={!isUsingFallback && !hasApiKeysConfigured && !isEnteringNewKeys}
            label="Pay Later"
            description="Customer pays convenience fee now, balance at the shop"
          />

          <ToggleSwitch
            enabled={payAtShopEnabled}
            onChange={(v) => { setPayAtShopEnabled(v); setHasChanges(true); }}
            label="Pay at Shop"
            description="No online payment - customer pays full amount at the branch"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentSettings;
