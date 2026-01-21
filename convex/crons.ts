import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up old walk-ins daily at midnight
crons.daily(
  "cleanup old walk-ins",
  { hourUTC: 0, minuteUTC: 0 }, // Run at midnight UTC
  internal.services.walkIn.cleanupOldWalkIns
);

export default crons;
