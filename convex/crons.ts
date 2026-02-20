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

// Send booking reminder emails ~2 hours before appointment (runs every 15 min)
crons.interval(
  "send booking reminder emails",
  { minutes: 15 },
  internal.services.emailNotifications.sendBookingReminderEmails
);

// Send late notice emails 15 min after appointment time (runs every 5 min)
crons.interval(
  "send late notice emails",
  { minutes: 5 },
  internal.services.emailNotifications.sendLateNoticeEmails
);

// Send no-show emails 1 hour after appointment time (runs every 15 min)
crons.interval(
  "send no-show emails",
  { minutes: 15 },
  internal.services.emailNotifications.sendNoShowEmails
);

// Send low stock alert digest daily at 8 AM PHT (midnight UTC)
crons.daily(
  "send low stock alerts",
  { hourUTC: 0, minuteUTC: 0 },
  internal.services.emailNotifications.sendLowStockAlerts
);

// Send monthly earnings summary on the 1st of each month at 8 AM PHT
crons.monthly(
  "send monthly earnings summary",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.services.emailNotifications.sendMonthlyEarningsSummary
);

// Send weekly payroll summary every Monday at 8 AM PHT
crons.weekly(
  "send weekly payroll summary",
  { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
  internal.services.emailNotifications.sendWeeklyPayrollSummary
);

// Membership card daily maintenance — expiry, grace, inactivity, birthdays
// Runs at 4:30 AM PHT (20:30 UTC)
crons.daily(
  "membership card maintenance",
  { hourUTC: 20, minuteUTC: 30 },
  internal.services.membershipCards.dailyCardMaintenance
);

export default crons;
