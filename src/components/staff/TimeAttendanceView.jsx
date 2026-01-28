import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StatusBadge } from "../common/StatusBadge";
import Skeleton from "../common/Skeleton";
import { Calendar, Clock, Users, X, Download, Table, LayoutList } from "lucide-react";

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
export function TimeAttendanceView({ branchId }) {
  const [activeFilter, setActiveFilter] = useState("today");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"
  // Custom date states - default to today
  const [customStartDate, setCustomStartDate] = useState(formatDateForInput(new Date()));
  const [customEndDate, setCustomEndDate] = useState(formatDateForInput(new Date()));

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

  // Calculate hours by barber
  const hoursByBarber = useMemo(() => {
    if (!attendance) return [];
    return calculateHoursByBarber(attendance);
  }, [attendance]);

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

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-white">Attendance</h2>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-[#1A1A1A] rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              aria-label="Table view"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-md transition-all ${
                viewMode === "cards"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              aria-label="Card view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={attendance.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => {
              setActiveFilter(filter.id);
              if (filter.id === "custom") {
                setShowCustomPicker(true);
              } else {
                setShowCustomPicker(false);
              }
            }}
            aria-label={`Filter by ${filter.label}`}
            aria-pressed={activeFilter === filter.id}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[44px] ${
              activeFilter === filter.id
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Select Date Range</h4>
            <button
              onClick={() => {
                setShowCustomPicker(false);
                setActiveFilter("today");
              }}
              aria-label="Close custom date picker"
              className="p-1 rounded-lg hover:bg-[#2A2A2A] text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="start-date" className="block text-xs text-gray-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#2A2A2A] border border-[#3A3A3A] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] min-h-[44px]"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="end-date" className="block text-xs text-gray-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                className="w-full px-3 py-2 rounded-lg bg-[#2A2A2A] border border-[#3A3A3A] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] min-h-[44px]"
              />
            </div>
          </div>
          {customStartDate > customEndDate && (
            <p className="text-red-400 text-xs mt-2">Start date must be before end date</p>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <p className="text-gray-400 text-xs mb-1">Total Barbers</p>
          <p className="text-2xl font-bold text-white">{summary.totalBarbers}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <p className="text-gray-400 text-xs mb-1">Currently Clocked In</p>
          <p className="text-2xl font-bold text-green-500">{summary.clockedIn}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <p className="text-gray-400 text-xs mb-1">Total Shifts</p>
          <p className="text-2xl font-bold text-white">{summary.totalShifts}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <p className="text-gray-400 text-xs mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-[var(--color-primary)]">{summary.totalHours}</p>
        </div>
      </div>

      {/* Current Status Section */}
      <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-medium text-white">Current Status</h3>
        </div>

        {barberStatus.length === 0 ? (
          <p className="text-gray-500 text-sm">No barbers found for this branch.</p>
        ) : (
          <div className="space-y-3">
            {barberStatus.map((barber) => (
              <div
                key={barber.barber_id}
                className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  {barber.barber_avatar ? (
                    <img
                      src={barber.barber_avatar}
                      alt={barber.barber_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                      <span className="text-gray-400 text-sm font-medium">
                        {barber.barber_name?.charAt(0) || "?"}
                      </span>
                    </div>
                  )}
                  <span className="text-white font-medium">{barber.barber_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={barber.isClockedIn} size="sm" />
                  {barber.isClockedIn && barber.clockInTime && (
                    <span className="text-xs text-gray-400">
                      Since {formatTime(barber.clockInTime)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Records - Table View */}
      {viewMode === "table" && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-[#2A2A2A]">
            <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-lg font-medium text-white">
              {currentFilterLabel}'s Records
            </h3>
            <span className="text-sm text-gray-400">({attendance.length} records)</span>
          </div>

          {attendance.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">No attendance records for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0A0A0A]">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                      Barber
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                      Clock In
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                      Clock Out
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                      Duration
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {attendance.map((record) => (
                    <tr key={record._id} className="hover:bg-[#2A2A2A]/50">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatDate(record.clock_in)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {record.barber_avatar ? (
                            <img
                              src={record.barber_avatar}
                              alt={record.barber_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                              <span className="text-gray-400 text-xs font-medium">
                                {record.barber_name?.charAt(0) || "?"}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-white">{record.barber_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatTime(record.clock_in)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {record.clock_out ? formatTime(record.clock_out) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {formatDuration((record.clock_out || Date.now()) - record.clock_in)}
                      </td>
                      <td className="px-4 py-3">
                        {record.clock_out ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                            Active
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
      )}

      {/* Attendance Records - Card View */}
      {viewMode === "cards" && (
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-lg font-medium text-white">
              {currentFilterLabel}'s Records
            </h3>
            <span className="text-sm text-gray-400">({attendance.length} records)</span>
          </div>

          {attendance.length === 0 ? (
            <p className="text-gray-500 text-sm">No attendance records for this period.</p>
          ) : (
            <div className="space-y-3">
              {attendance.map((record) => (
                <div
                  key={record._id}
                  className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    {record.barber_avatar ? (
                      <img
                        src={record.barber_avatar}
                        alt={record.barber_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                        <span className="text-gray-400 text-sm font-medium">
                          {record.barber_name?.charAt(0) || "?"}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-white font-medium">{record.barber_name}</span>
                      <div className="text-xs text-gray-400">
                        {formatDate(record.clock_in)} • {formatTime(record.clock_in)} -{" "}
                        {record.clock_out ? formatTime(record.clock_out) : "(active)"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-white">
                      {formatDuration(
                        (record.clock_out || Date.now()) - record.clock_in
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hours Summary Table */}
      {hoursByBarber.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-[#2A2A2A]">
            <Clock className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-lg font-medium text-white">Summary by Barber</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                    Barber
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                    Shifts
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                    Total Hours
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                    Avg Hours/Shift
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {hoursByBarber.map((barber) => (
                  <tr key={barber.barber_id} className="hover:bg-[#2A2A2A]/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {barber.barber_avatar ? (
                          <img
                            src={barber.barber_avatar}
                            alt={barber.barber_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                            <span className="text-gray-400 text-xs font-medium">
                              {barber.barber_name?.charAt(0) || "?"}
                            </span>
                          </div>
                        )}
                        <span className="text-sm text-white">{barber.barber_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">
                      {barber.shiftCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-[var(--color-primary)]">
                      {barber.totalHours.toFixed(1)} hrs
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">
                      {(barber.totalHours / barber.shiftCount).toFixed(1)} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#0A0A0A]">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-white">Total</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-white">
                    {summary.totalShifts}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-[var(--color-primary)]">
                    {summary.totalHours} hrs
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-300">
                    {summary.totalShifts > 0
                      ? (parseFloat(summary.totalHours) / summary.totalShifts).toFixed(1)
                      : "0.0"}{" "}
                    hrs
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeAttendanceView;
