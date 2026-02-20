import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import {
  X,
  CreditCard,
  Wallet,
  Shield,
  Star,
  Zap,
  ChevronRight,
  Check,
  Loader2,
  ArrowUpRight,
} from "lucide-react";

/**
 * CardPurchaseFlow - Modal/drawer for purchasing a Silver membership card,
 * upgrading to Gold/Platinum via top-up shortcut, or renewing an expired card.
 *
 * Props:
 *  - userId: Id<"users">
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - mode: "purchase" | "upgrade" | "renew"
 *  - targetTier?: "Gold" | "Platinum" (for upgrade mode)
 */
function CardPurchaseFlow({ userId, isOpen, onClose, mode = "purchase", targetTier }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("overview"); // overview | payment | confirming | done
  const [error, setError] = useState(null);

  const purchaseCard = useMutation(api.services.membershipCards.purchaseCard);
  const upgradeCard = useMutation(api.services.membershipCards.upgradeCardViaTopup);
  const renewCardMutation = useMutation(api.services.membershipCards.renewCard);

  const options = useQuery(api.services.membershipCards.getCardPurchaseOptions);
  const wallet = useQuery(
    api.services.wallet.getWallet,
    userId ? { userId } : "skip"
  );

  if (!isOpen) return null;

  const walletBalance = wallet
    ? ((wallet.balance || 0) + (wallet.bonus_balance || 0)) / 100
    : 0;

  const tierData = {
    Silver: {
      price: options?.silverPrice || 299,
      multiplier: options?.silverMultiplier || 1.5,
      icon: "🥈",
      color: "from-[#8E8E8E] to-[#C0C0C0]",
      benefits: [
        "1.5x points on all purchases",
        "Birthday freebie (free haircut)",
        "Earn XP toward Gold",
        "Priority booking access",
      ],
    },
    Gold: {
      price: options?.goldTopupThreshold || 2000,
      multiplier: options?.goldMultiplier || 2.0,
      icon: "🥇",
      color: "from-[#B8860B] to-[#FFD700]",
      benefits: [
        "2x points on all purchases",
        "Birthday freebie (free haircut)",
        "Earn XP toward Platinum",
        "Priority booking access",
        "VIP service line",
      ],
    },
    Platinum: {
      price: options?.platinumTopupThreshold || 5000,
      multiplier: options?.platinumMultiplier || 3.0,
      icon: "💎",
      color: "from-[#6B6B6B] to-[#E5E4E2]",
      benefits: [
        "3x points on all purchases",
        "Birthday freebie (free haircut)",
        "Maximum tier — no upgrades needed",
        "Priority booking access",
        "VIP service line",
        "Exclusive events access",
      ],
    },
  };

  const activeTier = mode === "upgrade" ? targetTier : "Silver";
  const tier = tierData[activeTier] || tierData.Silver;
  // For renewal, the price is the Silver card price (renewal fee)
  const renewalPrice = options?.silverPrice || 299;

  const handlePurchase = async () => {
    setStep("confirming");
    setError(null);

    try {
      if (mode === "purchase") {
        await purchaseCard({
          userId,
          paymentMethod: "wallet",
        });
      } else if (mode === "renew") {
        await renewCardMutation({
          userId,
          paymentMethod: "wallet",
        });
      } else {
        await upgradeCard({
          userId,
          targetTier: targetTier,
        });
      }
      setStep("done");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStep("payment");
    }
  };

  // ─── OVERVIEW STEP ───────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-5">
      {/* Tier comparison for purchase mode */}
      {mode === "purchase" ? (
        <div className="space-y-3">
          {["Silver", "Gold", "Platinum"].map((name) => {
            const t = tierData[name];
            const isTarget = name === "Silver";
            return (
              <div
                key={name}
                className={`rounded-2xl p-4 border transition-all ${
                  isTarget
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[#2A2A2A] bg-[#1A1A1A] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <h4 className="text-white font-bold text-sm">{name}</h4>
                      <span className="text-xs text-white/50">
                        {name === "Silver"
                          ? `₱${t.price}`
                          : `₱${t.price} top-up or earn XP`}
                      </span>
                    </div>
                  </div>
                  <span className="text-lg font-black text-[var(--color-primary)]">
                    {t.multiplier}x
                  </span>
                </div>
                {isTarget && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {t.benefits.map((b) => (
                      <span
                        key={b}
                        className="text-[10px] text-white/70 bg-white/10 rounded-full px-2 py-0.5"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Upgrade mode — show target tier */
        <div className={`rounded-2xl p-5 bg-gradient-to-br ${tier.color}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{tier.icon}</span>
            <div>
              <h3 className="text-white font-black text-xl">{activeTier}</h3>
              <span className="text-sm text-white/70">
                {tier.multiplier}x points multiplier
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            {tier.benefits.map((b) => (
              <div key={b} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
                <span className="text-xs text-white/80">{b}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/20">
            <p className="text-sm text-white/70">
              Top up <span className="font-bold text-white">₱{tier.price.toLocaleString()}</span> to
              your wallet and get instant {activeTier} access.
            </p>
          </div>
        </div>
      )}

      {mode === "renew" && (
        <div className="rounded-2xl p-5 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <span className="text-2xl">🔄</span>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Renew Your Card</h4>
              <span className="text-xs text-yellow-400">
                Renewal fee: ₱{renewalPrice.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/60">
            Renewing within grace period keeps your current tier and XP.
            After grace period expires, you'll restart at Silver.
          </p>
        </div>
      )}

      <button
        onClick={() => setStep("payment")}
        className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        {mode === "purchase" ? "Get Silver Card" : mode === "renew" ? "Renew Card" : `Upgrade to ${activeTier}`}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  // ─── PAYMENT STEP ────────────────────────────────────────────────
  const renderPayment = () => {
    const price = mode === "renew" ? renewalPrice : tier.price;
    const canPay = walletBalance >= price;
    const shortfall = price - walletBalance;

    return (
      <div className="space-y-5">
        {/* Order summary */}
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{mode === "renew" ? "🔄" : tier.icon}</span>
              <div>
                <h4 className="text-white font-bold text-sm">
                  {mode === "purchase" ? "Silver Card" : mode === "renew" ? "Card Renewal" : `${activeTier} Upgrade`}
                </h4>
                <span className="text-xs text-white/50">
                  {mode === "purchase" ? "1 year membership" : mode === "renew" ? "Extend 1 year" : "Wallet top-up + tier upgrade"}
                </span>
              </div>
            </div>
            <span className="text-xl font-black text-white">₱{price.toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Wallet balance display */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
          canPay ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            canPay ? "bg-green-500/20" : "bg-yellow-500/20"
          }`}>
            <Wallet className={`w-5 h-5 ${canPay ? "text-green-400" : "text-yellow-400"}`} />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Wallet Balance</p>
            <p className={`text-xs ${canPay ? "text-green-400" : "text-yellow-400"}`}>
              ₱{walletBalance.toLocaleString()}
              {!canPay && ` — need ₱${shortfall.toLocaleString()} more`}
            </p>
          </div>
          {canPay && (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {canPay ? (
          <>
            <div className="text-[10px] text-white/30 text-center">
              Payment will be deducted from your wallet. Non-refundable.
            </div>

            <button
              onClick={handlePurchase}
              className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Shield className="w-4 h-4" />
              Pay ₱{price.toLocaleString()} from Wallet
            </button>
          </>
        ) : (
          <>
            <div className="text-xs text-white/40 text-center">
              Top up at least ₱{shortfall.toLocaleString()} to your wallet, then come back to purchase.
            </div>

            <button
              onClick={() => {
                onClose();
                navigate("/customer/wallet");
              }}
              className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <ArrowUpRight className="w-4 h-4" />
              Top Up Wallet
            </button>
          </>
        )}
      </div>
    );
  };

  // ─── CONFIRMING STEP ─────────────────────────────────────────────
  const renderConfirming = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mb-4" />
      <p className="text-white font-semibold text-sm">Processing...</p>
      <p className="text-white/50 text-xs">Please wait</p>
    </div>
  );

  // ─── DONE STEP ───────────────────────────────────────────────────
  const renderDone = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4`}>
        <span className="text-4xl">{tier.icon}</span>
      </div>
      <h3 className="text-white font-black text-lg mb-1">
        {mode === "purchase" ? "Welcome to the Club!" : mode === "renew" ? "Card Renewed!" : `${activeTier} Unlocked!`}
      </h3>
      <p className="text-white/60 text-sm text-center mb-4">
        {mode === "purchase"
          ? `Your Silver card is active. Enjoy ${tier.multiplier}x points!`
          : mode === "renew"
            ? "Your card is active again. All your benefits are back!"
            : `You're now ${activeTier}! Enjoy ${tier.multiplier}x points on everything.`}
      </p>

      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-sm text-white/70">
          {tier.multiplier}x multiplier active
        </span>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
      >
        Done
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step !== "confirming" ? onClose : undefined}
      />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-md bg-[#0A0A0A] rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#3A3A3A]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-lg font-bold text-white">
            {step === "done"
              ? "Congratulations!"
              : mode === "purchase"
                ? "Membership Card"
                : mode === "renew"
                  ? "Renew Card"
                  : `Upgrade to ${activeTier}`}
          </h2>
          {step !== "confirming" && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center hover:bg-[#2A2A2A] transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-5 pb-6">
          {step === "overview" && renderOverview()}
          {step === "payment" && renderPayment()}
          {step === "confirming" && renderConfirming()}
          {step === "done" && renderDone()}
        </div>
      </div>
    </div>
  );
}

export default CardPurchaseFlow;
