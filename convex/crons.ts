import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up old walk-ins daily at midnight
crons.daily(
  "cleanup old walk-ins",
  { hourUTC: 0, minuteUTC: 0 }, // Run at midnight UTC
  internal.services.walkIn.cleanupOldWalkIns
);

// Update customer-branch activity statuses daily
// Recalculates status (active/at_risk/churned) based on days since last visit
// Runs at 4 PM UTC = 12 AM PHT (midnight Philippines time)
crons.daily(
  "update customer branch activity statuses",
  { hourUTC: 16, minuteUTC: 0 },
  internal.services.customerBranchActivity.updateAllStatuses
);

export default crons;
