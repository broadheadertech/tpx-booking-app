/**
 * Settlement AI Insights Service
 *
 * Provides intelligent recommendations for settlement management:
 * - Risk scoring for pending settlements (admin)
 * - Optimal timing suggestions for branches
 * - Pattern analysis and anomaly detection
 * - Processing speed predictions
 *
 * @module convex/services/settlementInsights
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

// ============================================================================
// ADMIN-FACING INSIGHTS
// ============================================================================

/**
 * Get AI risk assessment for all pending settlements.
 * Analyzes each settlement against branch history to generate
 * confidence scores and recommendations.
 */
export const getPendingSettlementInsights = query({
  args: {},
  handler: async (ctx) => {
    // Get all pending settlements
    const pendingSettlements = await ctx.db
      .query("branchSettlements")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    if (pendingSettlements.length === 0) {
      return { insights: [], summary: null };
    }

    // Get all historical settlements for pattern analysis
    const allSettlements = await ctx.db
      .query("branchSettlements")
      .collect();

    // Build branch history maps
    const branchHistory: Record<
      string,
      {
        totalSettlements: number;
        approvedCount: number;
        rejectedCount: number;
        completedCount: number;
        avgAmount: number;
        amounts: number[];
        avgProcessingHours: number;
        payoutMethods: string[];
        lastPayoutMethod: string;
        lastPayoutAccount: string;
      }
    > = {};

    for (const s of allSettlements) {
      const bid = s.branch_id;
      if (!branchHistory[bid]) {
        branchHistory[bid] = {
          totalSettlements: 0,
          approvedCount: 0,
          rejectedCount: 0,
          completedCount: 0,
          avgAmount: 0,
          amounts: [],
          avgProcessingHours: 0,
          payoutMethods: [],
          lastPayoutMethod: "",
          lastPayoutAccount: "",
        };
      }

      const h = branchHistory[bid];
      if (s.status !== "pending") {
        h.totalSettlements++;
        h.amounts.push(s.amount);
      }
      if (s.status === "approved" || s.status === "completed" || s.status === "processing") {
        h.approvedCount++;
      }
      if (s.status === "rejected") h.rejectedCount++;
      if (s.status === "completed") {
        h.completedCount++;
        if (s.completed_at && s.created_at) {
          const hours = (s.completed_at - s.created_at) / (1000 * 60 * 60);
          h.avgProcessingHours =
            h.avgProcessingHours === 0
              ? hours
              : (h.avgProcessingHours + hours) / 2;
        }
      }
      h.payoutMethods.push(s.payout_method);
      h.lastPayoutMethod = s.payout_method;
      h.lastPayoutAccount = s.payout_account_number;
    }

    // Calculate averages
    for (const bid of Object.keys(branchHistory)) {
      const h = branchHistory[bid];
      if (h.amounts.length > 0) {
        h.avgAmount =
          h.amounts.reduce((a, b) => a + b, 0) / h.amounts.length;
      }
    }

    // Score each pending settlement
    const insights = await Promise.all(
      pendingSettlements.map(async (settlement) => {
        const branch = await ctx.db.get(settlement.branch_id);
        const history = branchHistory[settlement.branch_id];
        const scores: { factor: string; score: number; detail: string }[] = [];

        // Factor 1: Branch track record (0-30 points)
        if (history && history.totalSettlements > 0) {
          const approvalRate =
            history.approvedCount / history.totalSettlements;
          const trackScore = Math.round(approvalRate * 30);
          scores.push({
            factor: "Track Record",
            score: trackScore,
            detail: `${Math.round(approvalRate * 100)}% approval rate (${history.approvedCount}/${history.totalSettlements})`,
          });
        } else {
          scores.push({
            factor: "Track Record",
            score: 15,
            detail: "First settlement — no history",
          });
        }

        // Factor 2: Amount consistency (0-25 points)
        if (history && history.amounts.length >= 2) {
          const stdDev = calculateStdDev(history.amounts);
          const mean = history.avgAmount;
          const zScore =
            mean > 0 ? Math.abs(settlement.amount - mean) / (stdDev || 1) : 0;

          if (zScore <= 1) {
            scores.push({
              factor: "Amount",
              score: 25,
              detail: `₱${settlement.amount.toLocaleString()} is within normal range (avg: ₱${Math.round(mean).toLocaleString()})`,
            });
          } else if (zScore <= 2) {
            scores.push({
              factor: "Amount",
              score: 15,
              detail: `₱${settlement.amount.toLocaleString()} is ${zScore > 0 ? "higher" : "lower"} than usual (avg: ₱${Math.round(mean).toLocaleString()})`,
            });
          } else {
            scores.push({
              factor: "Amount",
              score: 5,
              detail: `₱${settlement.amount.toLocaleString()} is significantly ${settlement.amount > mean ? "higher" : "lower"} than avg ₱${Math.round(mean).toLocaleString()}`,
            });
          }
        } else {
          scores.push({
            factor: "Amount",
            score: 20,
            detail: `₱${settlement.amount.toLocaleString()} — insufficient history to compare`,
          });
        }

        // Factor 3: Payout method consistency (0-20 points)
        if (history && history.lastPayoutMethod) {
          if (settlement.payout_method === history.lastPayoutMethod) {
            scores.push({
              factor: "Payout Method",
              score: 20,
              detail: `Same method as previous (${settlement.payout_method})`,
            });
          } else {
            scores.push({
              factor: "Payout Method",
              score: 10,
              detail: `Changed from ${history.lastPayoutMethod} to ${settlement.payout_method}`,
            });
          }
        } else {
          scores.push({
            factor: "Payout Method",
            score: 15,
            detail: `First settlement — ${settlement.payout_method}`,
          });
        }

        // Factor 4: Account consistency (0-15 points)
        if (history && history.lastPayoutAccount) {
          if (settlement.payout_account_number === history.lastPayoutAccount) {
            scores.push({
              factor: "Account",
              score: 15,
              detail: "Same account as previous settlements",
            });
          } else {
            scores.push({
              factor: "Account",
              score: 5,
              detail: "Different account from previous settlements",
            });
          }
        } else {
          scores.push({
            factor: "Account",
            score: 10,
            detail: "First settlement — new account",
          });
        }

        // Factor 5: Earnings verification (0-10 points)
        if (settlement.earnings_count > 0) {
          scores.push({
            factor: "Earnings",
            score: settlement.earnings_count >= 3 ? 10 : 7,
            detail: `${settlement.earnings_count} earning${settlement.earnings_count > 1 ? "s" : ""} linked`,
          });
        } else {
          scores.push({
            factor: "Earnings",
            score: 0,
            detail: "No earnings linked — unusual",
          });
        }

        // Calculate total confidence
        const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
        const recommendation: "approve" | "review" | "flag" =
          totalScore >= 80 ? "approve" : totalScore >= 50 ? "review" : "flag";

        // Estimated processing time
        const estHours =
          history?.avgProcessingHours > 0
            ? Math.round(history.avgProcessingHours)
            : 24;

        return {
          settlement_id: settlement._id,
          branch_id: settlement.branch_id,
          branch_name: branch?.name || "Unknown",
          amount: settlement.amount,
          earnings_count: settlement.earnings_count,
          payout_method: settlement.payout_method,
          created_at: settlement.created_at,
          confidence_score: totalScore,
          recommendation,
          scores,
          est_processing_hours: estHours,
          is_first_settlement: !history || history.totalSettlements === 0,
        };
      })
    );

    // Sort by confidence (lowest first — needs most attention)
    insights.sort((a, b) => a.confidence_score - b.confidence_score);

    // Summary stats
    const summary = {
      total_pending: insights.length,
      total_pending_amount: insights.reduce((sum, i) => sum + i.amount, 0),
      auto_approvable: insights.filter((i) => i.recommendation === "approve").length,
      needs_review: insights.filter((i) => i.recommendation === "review").length,
      flagged: insights.filter((i) => i.recommendation === "flag").length,
    };

    return { insights, summary };
  },
});

// ============================================================================
// BRANCH-FACING INSIGHTS
// ============================================================================

/**
 * Get settlement timing and performance insights for a branch.
 * Helps branches decide when to request settlements.
 */
export const getBranchSettlementInsights = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get branch earnings
    const allEarnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const pendingEarnings = allEarnings.filter((e) => e.status === "pending");
    const recentEarnings = allEarnings.filter(
      (e) => e.created_at >= thirtyDaysAgo
    );

    // Get branch settlements
    const settlements = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedSettlements = settlements.filter(
      (s) => s.status === "completed"
    );
    const recentSettlements = settlements.filter(
      (s) => s.created_at >= thirtyDaysAgo
    );

    // Get settlement config
    const walletConfig = await ctx.db
      .query("walletConfig")
      .first();
    const minAmount = walletConfig?.min_settlement_amount ?? 500;

    // Calculate earnings velocity (pesos per day)
    const pendingTotal = pendingEarnings.reduce(
      (sum, e) => sum + e.net_amount,
      0
    );
    const pendingGross = pendingEarnings.reduce(
      (sum, e) => sum + e.gross_amount,
      0
    );
    const pendingCommission = pendingEarnings.reduce(
      (sum, e) => sum + e.commission_amount,
      0
    );

    let dailyEarningsRate = 0;
    if (recentEarnings.length >= 2) {
      const totalNet = recentEarnings.reduce((sum, e) => sum + e.net_amount, 0);
      const daySpan = Math.max(
        1,
        (now - Math.min(...recentEarnings.map((e) => e.created_at))) /
          (24 * 60 * 60 * 1000)
      );
      dailyEarningsRate = totalNet / daySpan;
    }

    // Average processing time (request → completed)
    let avgProcessingHours = 0;
    if (completedSettlements.length > 0) {
      const totalHours = completedSettlements.reduce((sum, s) => {
        if (s.completed_at && s.created_at) {
          return sum + (s.completed_at - s.created_at) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      avgProcessingHours = Math.round(
        totalHours / completedSettlements.length
      );
    }

    // Days until minimum threshold
    const amountNeeded = Math.max(0, minAmount - pendingTotal);
    const daysToMinimum =
      dailyEarningsRate > 0 && amountNeeded > 0
        ? Math.ceil(amountNeeded / dailyEarningsRate)
        : 0;

    // Approval rate
    const decidedSettlements = settlements.filter(
      (s) => s.status === "completed" || s.status === "rejected"
    );
    const approvalRate =
      decidedSettlements.length > 0
        ? completedSettlements.length / decidedSettlements.length
        : 1;

    // Settlement frequency (avg days between settlements)
    let avgDaysBetween = 0;
    if (completedSettlements.length >= 2) {
      const sorted = completedSettlements
        .map((s) => s.created_at)
        .sort((a, b) => a - b);
      let totalDays = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalDays += (sorted[i] - sorted[i - 1]) / (24 * 60 * 60 * 1000);
      }
      avgDaysBetween = Math.round(totalDays / (sorted.length - 1));
    }

    // Total settled this month
    const thisMonth = new Date();
    const monthStart = new Date(
      thisMonth.getFullYear(),
      thisMonth.getMonth(),
      1
    ).getTime();
    const settledThisMonth = completedSettlements
      .filter((s) => s.completed_at && s.completed_at >= monthStart)
      .reduce((sum, s) => sum + s.amount, 0);

    // Generate recommendation
    let timing_recommendation = "";
    let timing_type: "ready" | "wait" | "soon" | "info" = "info";

    if (pendingTotal >= minAmount) {
      timing_type = "ready";
      timing_recommendation = `You have ₱${pendingTotal.toLocaleString()} ready for settlement (${pendingEarnings.length} transactions).`;
    } else if (daysToMinimum <= 2 && dailyEarningsRate > 0) {
      timing_type = "soon";
      timing_recommendation = `You'll reach the ₱${minAmount.toLocaleString()} minimum in ~${daysToMinimum} day${daysToMinimum > 1 ? "s" : ""} at current rate.`;
    } else if (dailyEarningsRate > 0) {
      timing_type = "wait";
      timing_recommendation = `Need ₱${amountNeeded.toLocaleString()} more to reach minimum. At ₱${Math.round(dailyEarningsRate).toLocaleString()}/day, ~${daysToMinimum} days.`;
    } else {
      timing_type = "info";
      timing_recommendation = pendingTotal > 0
        ? `₱${pendingTotal.toLocaleString()} pending. Earn more to reach the ₱${minAmount.toLocaleString()} minimum.`
        : "No pending earnings yet.";
    }

    // Performance insights
    const performanceNote =
      avgProcessingHours > 0
        ? `Your settlements typically complete in ~${avgProcessingHours}h.`
        : completedSettlements.length === 0
          ? "No completed settlements yet."
          : "";

    return {
      pending: {
        total_net: pendingTotal,
        total_gross: pendingGross,
        total_commission: pendingCommission,
        count: pendingEarnings.length,
      },
      velocity: {
        daily_earnings_rate: Math.round(dailyEarningsRate),
        days_to_minimum: daysToMinimum,
        min_settlement_amount: minAmount,
      },
      history: {
        total_settlements: settlements.length,
        completed_count: completedSettlements.length,
        approval_rate: Math.round(approvalRate * 100),
        avg_processing_hours: avgProcessingHours,
        avg_days_between: avgDaysBetween,
        settled_this_month: settledThisMonth,
        recent_settlement_count: recentSettlements.length,
      },
      recommendation: {
        timing_type,
        message: timing_recommendation,
        performance_note: performanceNote,
      },
    };
  },
});

// ============================================================================
// HELPERS
// ============================================================================

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(
    squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
  );
}
