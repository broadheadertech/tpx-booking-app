import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StatusBadge } from "../common/StatusBadge";
import Skeleton from "../common/Skeleton";
import { Calendar, Clock, Users, X, Download, Table, LayoutList, CheckCircle, XCircle, LogIn, LogOut, Hourglass, Loader2, Settings, Save, ChevronDown, ChevronUp, DollarSign, Info, AlertCircle } from "lucide-react";

// Philippines timezone offset: UTC+8
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Get start of day in PHT timezone as UTC timestamp
 */
function getStartOfDayPHT(date = new Date()) {
  const phtDate = new Date(date.getTime() + PHT_OFFSET_MS);
  const startOfDayPHT = new Date(
    Date.UTC(
      phtDate.getUTCFullYear(),
      phtDate.getUTCMonth(),
      phtDate.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
  return startOfDayPHT.getTime() - PHT_OFFSET_MS;
}

/**
 * Get end of day in PHT timezone as UTC timestamp
 */
function getEndOfDayPHT(date = new Date()) {
  const phtDate = new Date(date.getTime() + PHT_OFFSET_MS);
  const endOfDayPHT = new Date(
    Date.UTC(
      phtDate.getUTCFullYear(),
      phtDate.getUTCMonth(),
      phtDate.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
  return endOfDayPHT.getTime() - PHT_OFFSET_MS;
}

/**
 * Get start of week (Monday) in PHT
 */
function getStartOfWeekPHT() {
  const now = new Date();
  const phtNow = new Date(now.getTime() + PHT_OFFSET_MS);
  const dayOfWeek = phtNow.getUTCDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
  const monday = new Date(phtNow);
  monday.setUTCDate(phtNow.getUTCDate() - diff);
  return getStartOfDayPHT(new Date(monday.getTime() - PHT_OFFSET_MS));
}

/**
 * Get start of month in PHT
 */
function getStartOfMonthPHT() {
  const now = new Date();
  const phtNow = new Date(now.getTime() + PHT_OFFSET_MS);
  const firstOfMonth = new Date(
    Date.UTC(phtNow.getUTCFullYear(), phtNow.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  return firstOfMonth.getTime() - PHT_OFFSET_MS;
}

/**
 * Get start of year in PHT
 */
function getStartOfYearPHT() {
  const now = new Date();
  const phtNow = new Date(now.getTime() + PHT_OFFSET_MS);
  const firstOfYear = new Date(
    Date.UTC(phtNow.getUTCFullYear(), 0, 1, 0, 0, 0, 0)
  );
  return firstOfYear.getTime() - PHT_OFFSET_MS;
}

/**
 * Format time for display (e.g., "9:00 AM")
 */
function formatTime(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp + PHT_OFFSET_MS);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Format date for display (e.g., "Jan 25, 2026")
 */
function formatDate(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp + PHT_OFFSET_MS);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format date for CSV (e.g., "2026-01-25")
 */
function formatDateForCSV(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp + PHT_OFFSET_MS);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format time for CSV (e.g., "09:00")
 */
function formatTimeForCSV(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp + PHT_OFFSET_MS);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format duration in hours and minutes (e.g., "8h 30m")
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return "0h 0m";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Format duration as decimal hours (e.g., "8.50")
 */
function formatDurationDecimal(ms) {
  if (!ms || ms < 0) return "0.00";
  const hours = ms / (1000 * 60 * 60);
  return hours.toFixed(2);
}

/**
 * Day name lookup: 0=Sunday..6=Saturday
 */
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Convert "HH:MM" to minutes since midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Get the PHT time in minutes since midnight from a UTC timestamp
 */
function timestampToPHTMinutes(timestamp) {
  const phtDate = new Date(timestamp + PHT_OFFSET_MS);
  return phtDate.getUTCHours() * 60 + phtDate.getUTCMinutes();
}

/**
 * Get the weekday name for a UTC timestamp in PHT timezone
 */
function getWeekdayForTimestamp(timestamp) {
  const phtDate = new Date(timestamp + PHT_OFFSET_MS);
  return DAY_NAMES[phtDate.getUTCDay()];
}

/**
 * Calculate Late/Undertime/OT for a single attendance record
 * given the barber's schedule. Returns null if no schedule for that day.
 */
function getRecordInsights(record, schedule) {
  if (!schedule) return null;
  const dayName = getWeekdayForTimestamp(record.clock_in);
  const daySchedule = schedule[dayName];
  if (!daySchedule || !daySchedule.available) return null;

  const schedStart = timeToMinutes(daySchedule.start);
  const schedEnd = timeToMinutes(daySchedule.end);
  const actualIn = timestampToPHTMinutes(record.clock_in);
  const actualOut = record.clock_out ? timestampToPHTMinutes(record.clock_out) : null;

  const lateMin = Math.max(0, actualIn - schedStart);
  const undertimeMin = actualOut !== null ? Math.max(0, schedEnd - actualOut) : 0;
  const overtimeMin = actualOut !== null ? Math.max(0, actualOut - schedEnd) : 0;

  // For active shifts, check if currently in OT
  const isCurrentlyOT = !record.clock_out && timestampToPHTMinutes(Date.now()) > schedEnd;

  return {
    lateMin,
    undertimeMin,
    overtimeMin,
    isCurrentlyOT,
    scheduledStart: daySchedule.start,
    scheduledEnd: daySchedule.end,
  };
}

/**
 * Format minutes as compact string (e.g., "15m", "1h 30m")
 */
function formatMinutesCompact(mins) {
  if (!mins || mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Calculate total hours per barber from attendance records
 */
function calculateHoursByBarber(records) {
  const hoursByBarber = {};

  records.forEach((record) => {
    const barberId = record.barber_id;
    const clockIn = record.clock_in;
    const clockOut = record.clock_out || Date.now();

    const durationMs = clockOut - clockIn;
    const hours = durationMs / (1000 * 60 * 60);

    if (!hoursByBarber[barberId]) {
      hoursByBarber[barberId] = {
        barber_id: barberId,
        barber_name: record.barber_name,
        barber_avatar: record.barber_avatar,
        totalHours: 0,
        shiftCount: 0,
      };
    }

    hoursByBarber[barberId].totalHours += hours;
    hoursByBarber[barberId].shiftCount += 1;
  });

  return Object.values(hoursByBarber);
}

const DATE_FILTERS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

/**
 * Format a Date object to YYYY-MM-DD string for input[type="date"]
 */
function formatDateForInput(date) {
  const phtDate = new Date(date.getTime() + PHT_OFFSET_MS);
  const year = phtDate.getUTCFullYear();
  const month = String(phtDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(phtDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to start of day timestamp in PHT
 */
function parseDateInput(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  return utcDate.getTime() - PHT_OFFSET_MS;
}

/**
 * Export attendance data to CSV
 */
function exportToCSV(attendance, hoursByBarber, filterLabel) {
  // Detailed records CSV
  const recordsHeader = ["Date", "Barber Name", "Clock In", "Clock Out", "Duration (Hours)", "Status"];
  const recordsRows = attendance.map((record) => {
    const clockOut = record.clock_out || Date.now();
    const duration = clockOut - record.clock_in;
    return [
      formatDateForCSV(record.clock_in),
      record.barber_name,
      formatTimeForCSV(record.clock_in),
      record.clock_out ? formatTimeForCSV(record.clock_out) : "Active",
      formatDurationDecimal(duration),
      record.clock_out ? "Completed" : "Active",
    ];
  });

  // Summary CSV
  const summaryHeader = ["Barber Name", "Total Shifts", "Total Hours"];
  const summaryRows = hoursByBarber.map((barber) => [
    barber.barber_name,
    barber.shiftCount,
    barber.totalHours.toFixed(2),
  ]);

  // Build CSV content
  let csvContent = `Attendance Report - ${filterLabel}\n`;
  csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

  // Detailed records
  csvContent += "DETAILED RECORDS\n";
  csvContent += recordsHeader.join(",") + "\n";
  recordsRows.forEach((row) => {
    csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
  });

  csvContent += "\n";

  // Summary
  csvContent += "SUMMARY BY BARBER\n";
  csvContent += summaryHeader.join(",") + "\n";
  summaryRows.forEach((row) => {
    csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
  });

  // Total
  const totalHours = hoursByBarber.reduce((sum, b) => sum + b.totalHours, 0);
  const totalShifts = hoursByBarber.reduce((sum, b) => sum + b.shiftCount, 0);
  csvContent += `\n"TOTAL","${totalShifts}","${totalHours.toFixed(2)}"\n`;

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `attendance_${filterLabel.toLowerCase().replace(/\s/g, "_")}_${formatDateForCSV(Date.now())}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * TimeAttendanceView - Branch Admin view for barber attendance
 *
 * Features:
 * - Current clock status for all barbers
 * - Date range filtering (Today, Yesterday, This Week, This Month, This Year, Custom)
 * - Total hours worked per barber
 * - Table view with sortable columns
 * - CSV export functionality
 * - Branch isolation (NFR6)
 */
export function TimeAttendanceView({ branchId, staffName = "Staff" }) {
  const [activeFilter, setActiveFilter] = useState("today");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  // Custom date states - default to today
  const [customStartDate, setCustomStartDate] = useState(formatDateForInput(new Date()));
  const [customEndDate, setCustomEndDate] = useState(formatDateForInput(new Date()));

  // Shift settings state
  const [otRateEdits, setOtRateEdits] = useState({}); // { barberId: string value }
  const [penaltyRateEdits, setPenaltyRateEdits] = useState({}); // { barberId: string value }
  const [savingShift, setSavingShift] = useState(null);
  const [showShiftSettings, setShowShiftSettings] = useState(false);
  const [expandedBarber, setExpandedBarber] = useState(null);

  // Approval mutations
  const approveAttendance = useMutation(api.services.timeAttendance.approveAttendance);
  const rejectAttendance = useMutation(api.services.timeAttendance.rejectAttendance);
  const updateBarberShiftSettings = useMutation(api.services.barbers.updateBarberShiftSettings);

  // Query pending requests
  const pendingRequests = useQuery(
    api.services.timeAttendance.getPendingRequests,
    branchId ? { branch_id: branchId } : "skip"
  );

  // Handle approve
  const handleApprove = async (recordId) => {
    setApprovingId(recordId);
    try {
      await approveAttendance({ recordId, reviewerName: staffName });
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setApprovingId(null);
    }
  };

  // Handle reject
  const handleReject = async (recordId) => {
    setRejectingId(recordId);
    try {
      await rejectAttendance({ recordId, reviewerName: staffName });
    } catch (err) {
      console.error("Reject failed:", err);
    } finally {
      setRejectingId(null);
    }
  };

  // Calculate date range based on active filter
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (activeFilter) {
      case "yesterday": {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: getStartOfDayPHT(yesterday),
          end: getEndOfDayPHT(yesterday),
        };
      }
      case "week":
        return {
          start: getStartOfWeekPHT(),
          end: getEndOfDayPHT(),
        };
      case "month":
        return {
          start: getStartOfMonthPHT(),
          end: getEndOfDayPHT(),
        };
      case "year":
        return {
          start: getStartOfYearPHT(),
          end: getEndOfDayPHT(),
        };
      case "custom":
        return {
          start: parseDateInput(customStartDate),
          end: getEndOfDayPHT(new Date(parseDateInput(customEndDate))),
        };
      case "today":
      default:
        return {
          start: getStartOfDayPHT(),
          end: getEndOfDayPHT(),
        };
    }
  }, [activeFilter, customStartDate, customEndDate]);

  // Query attendance records for date range - increase limit for longer periods
  const recordLimit = activeFilter === "year" ? 1000 : activeFilter === "month" ? 500 : 100;

  const attendance = useQuery(
    api.services.timeAttendance.getAttendanceByBranch,
    branchId
      ? {
          branch_id: branchId,
          start_date: dateRange.start,
          end_date: dateRange.end,
          limit: recordLimit,
        }
      : "skip"
  );

  // Query current barber status
  const barberStatus = useQuery(
    api.services.timeAttendance.getBarberStatusForBranch,
    branchId ? { branch_id: branchId } : "skip"
  );

  // Map barber_id -> schedule for OT/UT/Late calculation
  const barberScheduleMap = useMemo(() => {
    if (!barberStatus) return {};
    const map = {};
    barberStatus.forEach((b) => {
      if (b.schedule) map[b.barber_id] = b.schedule;
    });
    return map;
  }, [barberStatus]);

  // Calculate hours by barber (with OT/UT/Late totals)
  const hoursByBarber = useMemo(() => {
    if (!attendance) return [];
    const base = calculateHoursByBarber(attendance);
    // Enrich with OT/UT/Late totals
    const insightsByBarber = {};
    attendance.forEach((record) => {
      const schedule = barberScheduleMap[record.barber_id];
      const insights = getRecordInsights(record, schedule);
      if (!insights) return;
      if (!insightsByBarber[record.barber_id]) {
        insightsByBarber[record.barber_id] = { totalLate: 0, totalUT: 0, totalOT: 0, daysLate: 0, daysUT: 0, daysOT: 0 };
      }
      const bi = insightsByBarber[record.barber_id];
      if (insights.lateMin > 0) { bi.totalLate += insights.lateMin; bi.daysLate++; }
      if (insights.undertimeMin > 0) { bi.totalUT += insights.undertimeMin; bi.daysUT++; }
      if (insights.overtimeMin > 0) { bi.totalOT += insights.overtimeMin; bi.daysOT++; }
    });
    return base.map((b) => ({ ...b, insights: insightsByBarber[b.barber_id] || null }));
  }, [attendance, barberScheduleMap]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!attendance || !barberStatus) {
      return { totalBarbers: 0, clockedIn: 0, totalHours: 0, totalShifts: 0 };
    }
    const clockedIn = barberStatus.filter((b) => b.isClockedIn).length;
    const totalHours = hoursByBarber.reduce((sum, b) => sum + b.totalHours, 0);
    const totalShifts = hoursByBarber.reduce((sum, b) => sum + b.shiftCount, 0);
    return {
      totalBarbers: barberStatus.length,
      clockedIn,
      totalHours: totalHours.toFixed(1),
      totalShifts,
    };
  }, [attendance, barberStatus, hoursByBarber]);

  // Get current filter label
  const currentFilterLabel = DATE_FILTERS.find((f) => f.id === activeFilter)?.label || "Today";

  // Handle export
  const handleExport = () => {
    if (attendance && hoursByBarber.length > 0) {
      exportToCSV(attendance, hoursByBarber, currentFilterLabel);
    }
  };

  // Loading state
  if (attendance === undefined || barberStatus === undefined) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // Helper: format time to 12h
  const fmt12 = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayLabels = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-white">Attendance</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1A1A1A] rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-[var(--color-primary)] text-white" : "text-gray-400 hover:text-white"}`}
              aria-label="Table view"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-[var(--color-primary)] text-white" : "text-gray-400 hover:text-white"}`}
              aria-label="Card view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={attendance.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Live Status Strip ── */}
      {barberStatus.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2.5">
            <Users className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live Status</span>
            <span className="ml-auto text-xs text-gray-500">
              {summary.clockedIn}/{summary.totalBarbers} Active
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {barberStatus.map((barber) => {
              const isActive = barber.isClockedIn;
              const isPending = barber.isPending;

              // Live OT/Late detection for clocked-in barbers
              let liveTag = null;
              if (isActive && barber.clockInTime && barber.schedule) {
                const dayName = getWeekdayForTimestamp(barber.clockInTime);
                const ds = barber.schedule[dayName];
                if (ds?.available) {
                  const nowMin = timestampToPHTMinutes(Date.now());
                  const schedEnd = timeToMinutes(ds.end);
                  const schedStart = timeToMinutes(ds.start);
                  const clockInMin = timestampToPHTMinutes(barber.clockInTime);
                  if (nowMin > schedEnd) {
                    liveTag = { label: `OT +${formatMinutesCompact(nowMin - schedEnd)}`, color: "text-green-400" };
                  } else if (clockInMin > schedStart) {
                    liveTag = { label: `Late ${formatMinutesCompact(clockInMin - schedStart)}`, color: "text-red-400" };
                  }
                }
              }

              return (
                <div
                  key={barber.barber_id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                    isActive
                      ? "bg-green-500/5 border-green-500/20"
                      : isPending
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-[#0A0A0A] border-[#2A2A2A]"
                  }`}
                >
                  <div className="relative">
                    {barber.barber_avatar ? (
                      <img src={barber.barber_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                        <span className="text-gray-400 text-xs font-medium">{barber.barber_name?.charAt(0)}</span>
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1A1A1A] ${
                      isActive ? "bg-green-500" : isPending ? "bg-amber-500" : "bg-gray-600"
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-white font-medium block truncate max-w-[80px]">{barber.barber_name?.split(" ")[0]}</span>
                    {isActive && barber.clockInTime ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-green-400">{formatTime(barber.clockInTime)}</span>
                        {liveTag && <span className={`text-[9px] font-semibold ${liveTag.color}`}>{liveTag.label}</span>}
                      </div>
                    ) : isPending ? (
                      <span className="text-[10px] text-amber-400">Pending</span>
                    ) : (
                      <span className="text-[10px] text-gray-500">Offline</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pending Approvals ── */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20">
            <Hourglass className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Pending Approvals</span>
            <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {pendingRequests.length}
            </span>
          </div>
          <div className="divide-y divide-amber-500/10">
            {pendingRequests.map((request) => (
              <div key={request._id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {request.barber_avatar ? (
                    <img src={request.barber_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                      <span className="text-gray-400 text-sm font-medium">{request.barber_name?.charAt(0) || "?"}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-white font-medium text-sm">{request.barber_name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {request.status === "pending_in" ? (
                        <><LogIn className="w-3 h-3 text-amber-400" /><span className="text-xs text-amber-400">Clock In</span></>
                      ) : (
                        <><LogOut className="w-3 h-3 text-amber-400" /><span className="text-xs text-amber-400">Clock Out</span></>
                      )}
                      <span className="text-xs text-gray-500">
                        · {formatTime(request.status === "pending_in" ? request.clock_in : request.clock_out)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(request._id)}
                    disabled={approvingId === request._id || rejectingId === request._id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50"
                  >
                    {approvingId === request._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request._id)}
                    disabled={approvingId === request._id || rejectingId === request._id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50"
                  >
                    {rejectingId === request._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Date Filters ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => {
              setActiveFilter(filter.id);
              setShowCustomPicker(filter.id === "custom");
            }}
            aria-pressed={activeFilter === filter.id}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all min-h-[38px] ${
              activeFilter === filter.id
                ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20"
                : "bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A] hover:text-white"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {showCustomPicker && (
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Select Date Range</h4>
            <button onClick={() => { setShowCustomPicker(false); setActiveFilter("today"); }} className="p-1 rounded-lg hover:bg-[#2A2A2A] text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="start-date" className="block text-xs text-gray-400 mb-1">From</label>
              <input type="date" id="start-date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#2A2A2A] border border-[#3A3A3A] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] min-h-[40px]" />
            </div>
            <div className="flex-1">
              <label htmlFor="end-date" className="block text-xs text-gray-400 mb-1">To</label>
              <input type="date" id="end-date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} min={customStartDate} className="w-full px-3 py-2 rounded-lg bg-[#2A2A2A] border border-[#3A3A3A] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] min-h-[40px]" />
            </div>
          </div>
          {customStartDate > customEndDate && <p className="text-red-400 text-xs mt-2">Start date must be before end date</p>}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1A1A1A] rounded-xl p-3.5 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider">Barbers</p>
          </div>
          <p className="text-2xl font-bold text-white">{summary.totalBarbers}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-3.5 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider">Clocked In</p>
          </div>
          <p className="text-2xl font-bold text-green-500">{summary.clockedIn}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-3.5 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider">Shifts</p>
          </div>
          <p className="text-2xl font-bold text-white">{summary.totalShifts}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-3.5 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider">Hours</p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-primary)]">{summary.totalHours}</p>
        </div>
      </div>

      {/* ── Attendance Records ── */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-base font-medium text-white">{currentFilterLabel}'s Records</h3>
            <span className="text-xs text-gray-500 bg-[#2A2A2A] px-2 py-0.5 rounded-full">{attendance.length}</span>
          </div>
        </div>

        {attendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Calendar className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm">No attendance records for this period</p>
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Date</th>
                  <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Barber</th>
                  <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">In</th>
                  <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Out</th>
                  <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Hours</th>
                  <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Status</th>
                  <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Insights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {attendance.map((record) => {
                  const insights = getRecordInsights(record, barberScheduleMap[record.barber_id]);
                  return (
                  <tr key={record._id} className="hover:bg-[#2A2A2A]/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(record.clock_in)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {record.barber_avatar ? (
                          <img src={record.barber_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                            <span className="text-gray-400 text-[10px] font-medium">{record.barber_name?.charAt(0)}</span>
                          </div>
                        )}
                        <span className="text-xs text-white">{record.barber_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-300 font-mono">{formatTime(record.clock_in)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-300 font-mono">{record.clock_out ? formatTime(record.clock_out) : "—"}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-white">{formatDuration((record.clock_out || Date.now()) - record.clock_in)}</td>
                    <td className="px-4 py-2.5">
                      {record.clock_out ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/10 text-gray-400">Done</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {insights ? (
                        <div className="flex flex-wrap gap-1">
                          {insights.lateMin > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                              Late {formatMinutesCompact(insights.lateMin)}
                            </span>
                          )}
                          {insights.overtimeMin > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                              OT +{formatMinutesCompact(insights.overtimeMin)}
                            </span>
                          )}
                          {insights.undertimeMin > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              UT {formatMinutesCompact(insights.undertimeMin)}
                            </span>
                          )}
                          {insights.isCurrentlyOT && !insights.overtimeMin && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                              <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />OT Live
                            </span>
                          )}
                          {!insights.lateMin && !insights.overtimeMin && !insights.undertimeMin && !insights.isCurrentlyOT && (
                            <span className="text-[9px] text-gray-600">On time</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {attendance.map((record) => {
              const insights = getRecordInsights(record, barberScheduleMap[record.barber_id]);
              return (
              <div key={record._id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {record.barber_avatar ? (
                      <img src={record.barber_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                        <span className="text-gray-400 text-xs font-medium">{record.barber_name?.charAt(0)}</span>
                      </div>
                    )}
                    {!record.clock_out && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#1A1A1A]" />}
                  </div>
                  <div>
                    <span className="text-sm text-white font-medium">{record.barber_name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[11px] text-gray-500">{formatDate(record.clock_in)}</span>
                      <span className="text-[11px] text-gray-600">·</span>
                      <span className="text-[11px] text-gray-400 font-mono">{formatTime(record.clock_in)}</span>
                      <span className="text-[11px] text-gray-600">-</span>
                      <span className="text-[11px] text-gray-400 font-mono">{record.clock_out ? formatTime(record.clock_out) : "active"}</span>
                    </div>
                    {insights && (insights.lateMin > 0 || insights.overtimeMin > 0 || insights.undertimeMin > 0 || insights.isCurrentlyOT) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {insights.lateMin > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            Late {formatMinutesCompact(insights.lateMin)}
                          </span>
                        )}
                        {insights.overtimeMin > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                            OT +{formatMinutesCompact(insights.overtimeMin)}
                          </span>
                        )}
                        {insights.undertimeMin > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            UT {formatMinutesCompact(insights.undertimeMin)}
                          </span>
                        )}
                        {insights.isCurrentlyOT && !insights.overtimeMin && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                            <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />OT Live
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-white">{formatDuration((record.clock_out || Date.now()) - record.clock_in)}</span>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* ── Per-Barber Summary (Footer of Records) ── */}
        {hoursByBarber.length > 0 && (
          <div className="border-t border-[#2A2A2A]">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0A]">
              <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Summary by Barber</span>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {hoursByBarber.map((barber) => (
                <div key={barber.barber_id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {barber.barber_avatar ? (
                        <img src={barber.barber_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                          <span className="text-gray-400 text-[10px] font-medium">{barber.barber_name?.charAt(0)}</span>
                        </div>
                      )}
                      <span className="text-xs text-white">{barber.barber_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 block">Shifts</span>
                        <span className="text-xs text-gray-300">{barber.shiftCount}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 block">Hours</span>
                        <span className="text-xs font-semibold text-[var(--color-primary)]">{barber.totalHours.toFixed(1)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 block">Avg</span>
                        <span className="text-xs text-gray-300">{(barber.totalHours / barber.shiftCount).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  {barber.insights && (barber.insights.totalLate > 0 || barber.insights.totalOT > 0 || barber.insights.totalUT > 0) && (
                    <div className="flex flex-wrap gap-2 mt-1.5 ml-8">
                      {barber.insights.totalLate > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Late: {formatMinutesCompact(barber.insights.totalLate)} ({barber.insights.daysLate}d)
                        </span>
                      )}
                      {barber.insights.totalOT > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          OT: {formatMinutesCompact(barber.insights.totalOT)} ({barber.insights.daysOT}d)
                        </span>
                      )}
                      {barber.insights.totalUT > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          UT: {formatMinutesCompact(barber.insights.totalUT)} ({barber.insights.daysUT}d)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {/* Total row */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A0A0A]">
                <span className="text-xs font-medium text-white">Total</span>
                <div className="flex items-center gap-4">
                  <div className="text-right"><span className="text-[10px] text-gray-500 block">Shifts</span><span className="text-xs font-medium text-white">{summary.totalShifts}</span></div>
                  <div className="text-right"><span className="text-[10px] text-gray-500 block">Hours</span><span className="text-xs font-bold text-[var(--color-primary)]">{summary.totalHours}</span></div>
                  <div className="text-right"><span className="text-[10px] text-gray-500 block">Avg</span><span className="text-xs text-gray-300">{summary.totalShifts > 0 ? (parseFloat(summary.totalHours) / summary.totalShifts).toFixed(1) : "0.0"}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── OT & PENALTY RATES — Pay Configuration Section ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {barberStatus && barberStatus.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <button
            onClick={() => setShowShiftSettings(!showShiftSettings)}
            className="flex items-center justify-between w-full p-4 hover:bg-[#2A2A2A]/20 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-white">OT & Penalty Rates</h3>
                <p className="text-[11px] text-gray-500">Set overtime pay and late/undertime penalty per barber</p>
              </div>
            </div>
            {showShiftSettings ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showShiftSettings && (
            <div className="border-t border-[#2A2A2A]">
              {/* Info Banner */}
              <div className="mx-4 mt-3 mb-2 flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300/80 leading-relaxed">
                  <strong className="text-blue-300">Shift hours</strong> come from each barber's schedule in <strong className="text-blue-300">Barber Management</strong> (Mon-Sun).
                  <strong className="text-green-300"> OT Rate</strong> = earnings per hour of overtime (past shift end).
                  <strong className="text-red-300"> Penalty Rate</strong> = deduction per hour of late arrival or early clock-out (undertime). Both are auto-calculated in payroll.
                </div>
              </div>

              {/* Column Headers */}
              <div className="flex items-center px-4 py-2 border-b border-[#2A2A2A] bg-[#0A0A0A]">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex-1">Barber</span>
                <span className="text-[10px] font-medium text-green-500/70 uppercase tracking-wider w-[100px] text-center">OT (₱/hr)</span>
                <span className="text-[10px] font-medium text-red-500/70 uppercase tracking-wider w-[100px] text-center">Penalty (₱/hr)</span>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[60px] text-center">Action</span>
                <span className="w-[36px]" />
              </div>

              {/* Barber Rows */}
              <div className="divide-y divide-[#2A2A2A]">
                {barberStatus.map((barber) => {
                  const isExpanded = expandedBarber === barber.barber_id;
                  const schedule = barber.schedule;

                  const editOtRate = otRateEdits[barber.barber_id] ?? String(barber.ot_hourly_rate ?? "");
                  const editPenaltyRate = penaltyRateEdits[barber.barber_id] ?? String(barber.penalty_hourly_rate ?? "");
                  const hasOtChange = String(editOtRate) !== String(barber.ot_hourly_rate ?? "");
                  const hasPenaltyChange = String(editPenaltyRate) !== String(barber.penalty_hourly_rate ?? "");
                  const hasAnyChange = hasOtChange || hasPenaltyChange;

                  const workingDays = schedule
                    ? daysOfWeek.filter((d) => schedule[d]?.available).length
                    : 0;

                  return (
                    <div key={barber.barber_id}>
                      <div className="flex items-center px-4 py-3">
                        {/* Barber Info */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {barber.barber_avatar ? (
                            <img src={barber.barber_avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-400 text-xs font-medium">{barber.barber_name?.charAt(0)}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-sm text-white font-medium block truncate">{barber.barber_name}</span>
                            {schedule ? (
                              <span className="text-[10px] text-gray-500">{workingDays} days/wk</span>
                            ) : (
                              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />No schedule set
                              </span>
                            )}
                          </div>
                        </div>

                        {/* OT Rate Input */}
                        <div className="w-[100px] flex justify-center">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">₱</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editOtRate}
                              onChange={(e) =>
                                setOtRateEdits((prev) => ({
                                  ...prev,
                                  [barber.barber_id]: e.target.value,
                                }))
                              }
                              className={`pl-5 pr-1 py-2 text-sm bg-[#0A0A0A] border rounded-lg text-white w-[75px] text-center focus:outline-none transition-colors ${
                                hasOtChange
                                  ? "border-green-500 ring-1 ring-green-500/30"
                                  : "border-[#2A2A2A] focus:border-green-500"
                              }`}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Penalty Rate Input */}
                        <div className="w-[100px] flex justify-center">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">₱</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editPenaltyRate}
                              onChange={(e) =>
                                setPenaltyRateEdits((prev) => ({
                                  ...prev,
                                  [barber.barber_id]: e.target.value,
                                }))
                              }
                              className={`pl-5 pr-1 py-2 text-sm bg-[#0A0A0A] border rounded-lg text-white w-[75px] text-center focus:outline-none transition-colors ${
                                hasPenaltyChange
                                  ? "border-red-500 ring-1 ring-red-500/30"
                                  : "border-[#2A2A2A] focus:border-red-500"
                              }`}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="w-[60px] flex justify-center">
                          {hasAnyChange ? (
                            <button
                              disabled={savingShift === barber.barber_id}
                              onClick={async () => {
                                try {
                                  setSavingShift(barber.barber_id);
                                  await updateBarberShiftSettings({
                                    barber_id: barber.barber_id,
                                    ot_hourly_rate: parseFloat(editOtRate) || 0,
                                    penalty_hourly_rate: parseFloat(editPenaltyRate) || 0,
                                  });
                                  setOtRateEdits((prev) => {
                                    const next = { ...prev };
                                    delete next[barber.barber_id];
                                    return next;
                                  });
                                  setPenaltyRateEdits((prev) => {
                                    const next = { ...prev };
                                    delete next[barber.barber_id];
                                    return next;
                                  });
                                } catch (err) {
                                  console.error("Save rates error:", err);
                                } finally {
                                  setSavingShift(null);
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {savingShift === barber.barber_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Save
                            </button>
                          ) : (barber.ot_hourly_rate || barber.penalty_hourly_rate) ? (
                            <span className="text-[10px] text-green-400/70">Saved</span>
                          ) : (
                            <span className="text-[10px] text-gray-600">—</span>
                          )}
                        </div>

                        {/* Expand Schedule */}
                        <div className="w-[36px] flex justify-center">
                          {schedule ? (
                            <button
                              onClick={() => setExpandedBarber(isExpanded ? null : barber.barber_id)}
                              className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 transition-colors"
                              title="View shift schedule"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          ) : <div className="w-7" />}
                        </div>
                      </div>

                      {/* Expanded Mon-Sun Schedule */}
                      {isExpanded && schedule && (
                        <div className="px-4 pb-3">
                          <div className="ml-[42px] grid grid-cols-7 gap-1.5">
                            {daysOfWeek.map((day) => {
                              const ds = schedule[day];
                              const isAvailable = ds?.available;
                              return (
                                <div
                                  key={day}
                                  className={`text-center rounded-lg py-2 px-1 transition-colors ${
                                    isAvailable
                                      ? "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20"
                                      : "bg-[#0A0A0A] border border-[#1A1A1A]"
                                  }`}
                                >
                                  <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                                    isAvailable ? "text-[var(--color-primary)]" : "text-gray-600"
                                  }`}>
                                    {dayLabels[day]}
                                  </div>
                                  {isAvailable ? (
                                    <>
                                      <div className="text-[10px] text-gray-300 leading-tight">{fmt12(ds.start)}</div>
                                      <div className="text-[8px] text-gray-600 my-0.5">to</div>
                                      <div className="text-[10px] text-gray-300 leading-tight">{fmt12(ds.end)}</div>
                                    </>
                                  ) : (
                                    <div className="text-[10px] text-gray-600 mt-2">Off</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-gray-600 mt-2 ml-[42px]">
                            OT is calculated when a barber clocks out after their scheduled end time for that day.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scrollbar hide style */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default TimeAttendanceView;
