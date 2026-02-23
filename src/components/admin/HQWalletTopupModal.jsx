/**
 * HQ Wallet Top-Up Modal
 *
 * Secure 3-step wizard for Super Admin to add balance to branch wallets.
 * Step 1: Enter amount + optional reason
 * Step 2: Verify Super Admin password (sends OTP to email)
 * Step 3: Enter OTP code to confirm top-up
 */
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  X,
  Wallet,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";

export default function HQWalletTopupModal({
  isOpen,
  onClose,
  branchId,
  branchName,
  currentBalance,
}) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpTokenId, setOtpTokenId] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const otpRefs = useRef([]);
  const passwordRef = useRef(null);

  const verifyPassword = useMutation(api.services.branchWallet.verifyPasswordForTopup);
  const verifyOtpAndTopup = useMutation(api.services.branchWallet.verifyOtpAndTopup);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Auto-focus password field on step 2
  useEffect(() => {
    if (step === 2 && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [step]);

  // Auto-focus first OTP input on step 3
  useEffect(() => {
    if (step === 3 && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setAmount("");
      setDescription("");
      setPassword("");
      setShowPassword(false);
      setOtpCode(["", "", "", "", "", ""]);
      setOtpTokenId(null);
      setMaskedEmail("");
      setExpiresAt(null);
      setTimeLeft(0);
      setError("");
      setLoading(false);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedAmount = parseInt(amount, 10);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const formatMinSec = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Step 1 → Step 2
  const handleContinue = () => {
    if (!isAmountValid) return;
    setError("");
    setStep(2);
  };

  // Step 2 → Verify password, send OTP, go to Step 3
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await verifyPassword({
        password,
        branch_id: branchId,
        amount: parsedAmount,
        description: description.trim() || undefined,
      });
      setOtpTokenId(result.otpTokenId);
      setMaskedEmail(result.maskedEmail);
      setExpiresAt(result.expiresAt);
      setTimeLeft(Math.floor((result.expiresAt - Date.now()) / 1000));
      setPassword("");
      setStep(3);
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // OTP input handler
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste for OTP
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // Step 3 → Verify OTP and execute top-up
  const handleConfirmTopup = async () => {
    const code = otpCode.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    if (timeLeft <= 0) {
      setError("Code has expired. Please start over.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await verifyOtpAndTopup({
        otpTokenId,
        otp_code: code,
      });
      setSuccess(result);
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-md p-6 animate-in fade-in">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Top-Up Successful</h3>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                +₱{success.amount?.toLocaleString()}
              </p>
              <p className="text-gray-400">{success.branchName}</p>
              <p className="text-sm text-gray-500">
                New balance: ₱{success.newBalance?.toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 bg-[var(--color-primary)] text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            {step > 1 && !loading && (
              <button
                onClick={() => { setStep(step - 1); setError(""); }}
                className="p-1 hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold text-white">Add Wallet Balance</h3>
              <p className="text-xs text-gray-500">{branchName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-4 pt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[var(--color-primary)]" : "bg-[#2A2A2A]"
              }`}
            />
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* STEP 1: Amount */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 p-3 bg-[#0F0F0F] rounded-xl">
                <Wallet className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Current Balance</p>
                  <p className="text-lg font-bold text-green-400">
                    ₱{(currentBalance || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Top-Up Amount (whole pesos)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₱</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    step="1"
                    className="w-full pl-8 pr-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white text-lg font-bold placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-primary)]"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Reason / Notes (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly operating funds"
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <button
                onClick={handleContinue}
                disabled={!isAmountValid}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  isAmountValid
                    ? "bg-[var(--color-primary)] text-black hover:opacity-90"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                Continue
              </button>
            </>
          )}

          {/* STEP 2: Password */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 p-3 bg-[#0F0F0F] rounded-xl">
                <Lock className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Password Required</p>
                  <p className="text-xs text-gray-500">
                    Enter your Super Admin password to continue
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-900/15 border border-blue-900/30 rounded-xl">
                <p className="text-sm text-blue-400">
                  Adding <span className="font-bold">₱{parsedAmount?.toLocaleString()}</span> to {branchName}
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleVerifyPassword}
                disabled={loading || !password.trim()}
                className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  loading || !password.trim()
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-[var(--color-primary)] text-black hover:opacity-90"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Send OTP"
                )}
              </button>
            </>
          )}

          {/* STEP 3: OTP */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-3 p-3 bg-[#0F0F0F] rounded-xl">
                <Mail className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Check Your Email</p>
                  <p className="text-xs text-gray-500">
                    We sent a 6-digit code to {maskedEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2" onPaste={handleOtpPaste}>
                {otpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="text-center">
                {timeLeft > 0 ? (
                  <p className="text-sm text-gray-500">
                    Code expires in{" "}
                    <span className={`font-mono font-bold ${timeLeft < 60 ? "text-red-400" : "text-[var(--color-primary)]"}`}>
                      {formatMinSec(timeLeft)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-red-400">
                    Code expired. Go back to try again.
                  </p>
                )}
              </div>

              <button
                onClick={handleConfirmTopup}
                disabled={loading || otpCode.join("").length !== 6 || timeLeft <= 0}
                className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  loading || otpCode.join("").length !== 6 || timeLeft <= 0
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-[var(--color-primary)] text-black hover:opacity-90"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm Top-Up — ₱${parsedAmount?.toLocaleString()}`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
